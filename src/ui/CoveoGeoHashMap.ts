import {
  Component,
  IComponentBindings,
  BreadcrumbEvents,
  QueryEvents,
  IBuildingQueryEventArgs,
  Initialization,
  InitializationEvents,
  IQuerySuccessEventArgs,
  IQueryResult,
  ComponentOptions,
  Template,
  TemplateCache,
  TimeSpan,
  QueryBuilder
} from "coveo-search-ui";

export interface ICoveoGeoHashMapOptions {
  template: Template;
  latField: string;
  lonField: string;
}

const minHashPrecision = 7;

/**
 * Interface used to combine Google Map Markers, Google Info Window
 * and the corresponding Coveo Results
 */
interface IResultMarker {
  id: string;
  result: IQueryResult;
  marker: google.maps.Marker;
  rect: google.maps.Rectangle;
  infoWindow?: google.maps.InfoWindow;
  isOpen: boolean;
}

/**
 * The Coveo GeoHash Map component Class, extending the Coveo Framework Component
 */
export class CoveoGeoHashMap extends Component {
  static ID = "GeoHashMap";

  /**
   * This section will fetch the data-template-id value of the CoveoGeoHashMap component and
   * will load any Underscore template script available in the SearchInterface node matching with the DOM ID.
   */
  static options: ICoveoGeoHashMapOptions = {
    template: ComponentOptions.buildTemplateOption({
      defaultFunction: () => TemplateCache.getDefaultTemplate("Default")
    }),
    latField: ComponentOptions.buildStringOption(),
    lonField: ComponentOptions.buildStringOption()
  };

  /**
   * The CoveoGeoHashMap object stores the Google Map object, so all the map functionalities are accessible.
   * All the results are also store in-memory using the Interface defined at the beggining of this file.
   */
  private googleMap: google.maps.Map;
  private clusterMap: MarkerClusterer;
  private precision: number;
  private idleListener;
  private zoomListener;
  private dragListener;
  private recordIdle: boolean;
  private allBounds: google.maps.LatLngBounds;
  private currentQuery: string;
  private currentMapQuery: string;
  private updateBounds: boolean;
  private addMapQuery: boolean;
  private resultMarkers: { [key: string]: IResultMarker };

  constructor(
    public element: HTMLElement,
    public options: ICoveoGeoHashMapOptions,
    public bindings: IComponentBindings
  ) {
    super(element, CoveoGeoHashMap.ID, bindings);
    this.options = ComponentOptions.initComponentOptions(
      element,
      CoveoGeoHashMap,
      options
    );
    this.resultMarkers = {};
    this.currentQuery = '';
    this.bind.onRootElement(
      QueryEvents.doneBuildingQuery,
      (args: IBuildingQueryEventArgs) => this.onDoneBuildingQuery(args)
    );
    this.bind.onRootElement(
      QueryEvents.querySuccess,
      (args: IQuerySuccessEventArgs) => this.onQuerySuccess(args)
    );
    this.bind.onRootElement(BreadcrumbEvents.clearBreadcrumb, () => this.handleClearBreadcrumb());
    this.bind.onRootElement(InitializationEvents.afterInitialization, () =>
      this.initMap()
    );
  }

  private initMap() {
    this.updateBounds = true;
    this.addMapQuery = false;
    this.currentQuery = "";
    this.currentMapQuery = "";
    this.recordIdle = false;
    this.googleMap = new google.maps.Map(this.element, {
      center: { lat: 52.1284, lng: 5.123 },
      zoom: 2,
      mapTypeControl: false,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.BOTTOM_CENTER
      },
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_CENTER
      },
      scaleControl: false,
      streetViewControl: false,
      streetViewControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM
      },
      fullscreenControl: false
    });
    this.precision = 2;
    //this.getPersistentMarkers();
  }

  private computeArea(bounds) {
    if (!bounds) {
      return 0;
    }
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    var southWest = new google.maps.LatLng(sw.lat(), sw.lng());
    var northEast = new google.maps.LatLng(ne.lat(), ne.lng());
    var southEast = new google.maps.LatLng(sw.lat(), ne.lng());
    var northWest = new google.maps.LatLng(ne.lat(), sw.lng());
    return (
      google.maps.geometry.spherical.computeArea([
        northEast,
        northWest,
        southWest,
        southEast
      ]) / 1000000
    );
  }

  private calcPrecision(current) {
    //Use the zoom
    var curzoom = current.googleMap.getZoom();
    //var ZOOMLEVELS = { 3: 7, 4 : 10, 5 : 12, 6 : 15, 7 : 17, 8 : 17 };
    var ZOOMLEVELS = [
      [5, 3],
      [7, 4],
      [9, 5],
      [10, 6],
      [12, 6],
      [15, 7],
      [17, 8],
      [20, 8]
    ];
    var precision = 2;
    for (var i = 0; i < ZOOMLEVELS.length; i++) {
      var level = ZOOMLEVELS[i];
      if (curzoom >= level[0]) precision = level[1];
    }

    current.precision = precision;
    //Precision needed for the GeoHash, this will be done based upon the zoom level of the map
    //Use the Area of the boudingbox
    /*var area = current.computeArea(current.googleMap.getBounds());
    if (area==0) { current.precision = 2; return 2;}
    var precision = 2;
    
   if (area < 8090000 ) precision = 3;
   if (area < 2302312 ) precision = 3;
    if (area < 214218 ) precision = 4;
    if (area < 10000 ) precision = 5;
    if (area < 2500 ) precision = 6;
    if (area < 10 ) precision = 7;
    if (area < 2 ) precision = 8;
    document.getElementById("myprecision").innerHTML = String(area)+"/"+String(current.googleMap.getZoom()) + "/" + String(precision);
    */
    document.getElementById("myprecision").innerHTML =
      String(curzoom) + "/" + String(precision);
    current.precision = precision;
    return precision;
  }

  private handleClearBreadcrumb() {
    google.maps.event.removeListener(this.idleListener);
    this.addMapQuery = false;
  }

  private onDoneBuildingQuery(args: IBuildingQueryEventArgs) {
    //When the query is build, we will check if the query has changed.
    //If the query is changed, then we will remove the map filter.
    
    //Remove the zoomchanged/dragend listener, because we do not want to react on changes on the map while executing the query
    google.maps.event.removeListener(this.idleListener);

    const queryBuilder = args.queryBuilder;
    var latfield = this.options.latField;
    var lonfield = this.options.lonField;
    this.allBounds = new google.maps.LatLngBounds();

    //Only update bounds when the entered query is different than the previous one
    if (args.queryBuilder.expression.build() == this.currentQuery) {
      //There is nothing to do
    } else {
      //We need to reset a previous set mapQuery so that the filter of the mylat is removed
      this.currentMapQuery = '';
      this.recordIdle = false;
      this.currentQuery = args.queryBuilder.expression.build();
    }
    if (this.currentMapQuery=='' || this.recordIdle==false){
      this.updateBounds = true;
    } else 
    {
      this.updateBounds = false;
    }
    //We want to add a distance boost so that results nearby the center are being boosted
    if (this.precision >= minHashPrecision) {
      var boostQuery =
        "$qrf(expression:'-dist(@" +
        this.options.latField +
        ", @" +
        this.options.lonField +
        ", " +
        this.googleMap.getCenter().lat() +
        ", " +
        this.googleMap.getCenter().lng() +
        ")',normalizeWeight: 'true',modifier:100)";
      args.queryBuilder.advancedExpression.add(boostQuery);
    }

    //If the currentMapQuery is there, we need to add it to the advanced expression
    if (this.currentMapQuery!='' || this.recordIdle) {
      console.log("Current mapQuery: "+this.currentMapQuery);
      console.log("Current recordIdle: "+this.recordIdle);
      var bounds2 = this.googleMap.getBounds();
      if (bounds2 != undefined) {
        if (!isNaN(bounds2.getNorthEast().lat())) {
          var ne = bounds2.getNorthEast(); // LatLng of the north-east corner
          var sw = bounds2.getSouthWest(); // LatLng of the south-west corder
          var query = "";
          //|------------------|
          //|           NE 53,6|  //lat,lon
          //|                  |
          //|SW 52,4           |
          if (ne.lat() > sw.lat()) {
            //ne=67>sw=-5
            query =
              "@" +
              latfield +
              "<=" +
              ne.lat() +
              " AND @" +
              latfield +
              ">=" +
              sw.lat();
          } else {
            query =
              "@" +
              latfield +
              ">=" +
              ne.lat() +
              " AND @" +
              latfield +
              "<=" +
              sw.lat();
          }
          if (ne.lng() > sw.lng()) {
            //ne=67>sw=-5  -70 -142
            query =
              query +
              " @" +
              lonfield +
              "<=" +
              ne.lng() +
              " AND @" +
              lonfield +
              ">=" +
              sw.lng();
          } else {
            query =
              query +
              " @" +
              lonfield +
              ">=" +
              ne.lng() +
              " AND @" +
              lonfield +
              "<=" +
              sw.lng();
            //172 -64
            //-64 172
          }
          //document.getElementById("myquery").innerHTML = query;
          document.getElementById("myquery").innerHTML = "";
          queryBuilder.advancedExpression.add(query);
          this.currentMapQuery = query;
          this.recordIdle = false;
        }
      }
    }
    //}
  }

  private removeListeners(reference: any) {
    google.maps.event.removeListener(reference.zoomListener);
    google.maps.event.removeListener(reference.dragListener);
  }

  private addListeners(reference: any) {
    reference.zoomListener = reference.googleMap.addListener(
      "zoom_changed",
      function(ev) {
        console.log("MAP: Zoom changed");
        reference.recordIdle = true;
      });
    reference.dragListener = reference.googleMap.addListener(
        "dragend",
        function(ev) {
          console.log("MAP: Drag End");
          reference.recordIdle = true;
        });
    reference.addIdleListener(true, reference);
    }

  private addIdleListener(slow: boolean, reference: any) {
    //Adds the google map idle listener (which fires when map is completely reloaded)
    //when the map is idle, we want to re-execute the query
    this.addMapQuery = true;
    if (slow) {
      setTimeout(function() {
        console.log("Adding Idle listener");
        reference.idleListener = reference.googleMap.addListener(
          "idle",
          function(ev) {
            setTimeout(function() {
              if (reference.recordIdle) {
                console.log("Map is idle, re execute query");
                reference.searchInterface.queryController.executeQuery();
              }
            }, 500);
          }
        );
      }, 500);
    } else {
      reference.idleListener = reference.googleMap.addListener("idle", function(
        ev
      ) {
        setTimeout(function() {
          if (reference.recordIdle) {
            reference.searchInterface.queryController.executeQuery();
          }
        }, 500);
      });
    }
  }

  private onQuerySuccess(args: IQuerySuccessEventArgs) {
    //When the query is executed, we want to fetch the GeoHashes
    //Since the already executed advancedExpressions contains all the proper logic.
    //if (args.queryBuilder.tab === "default") {
      var thequery =
        args.results.basicExpression != undefined
          ? args.results.basicExpression
          : " @uri ";
      thequery += " ";
      thequery +=
        args.results.constantExpression != undefined
          ? args.results.constantExpression
          : " ";
      thequery += " ";
      thequery +=
        args.results.advancedExpression != undefined
          ? args.results.advancedExpression
          : " ";
      this.closeAllInfoWindows();
      this.clearResultMarkers();
      this.removeListeners(this);
      var precision = this.calcPrecision(this);
      //When updating bounds we do not know the exact precision
      if (this.updateBounds) {
        if (precision >= 7) precision = 6; //else precision = precision + 1;
        this.precision = precision;
      }
      if (precision > 1) {
        var fieldname = "@geohash" + String(precision);
        if (precision > 8) {
          //If precision is to high, we need to get the individual results.
          fieldname = "";
          let current = this;
          var allmarkers = [];

          document.getElementById("myquery").innerHTML +=
            this.updateBounds +
            "/Zoom: " +
            String(this.googleMap.getZoom()) +
            ", ";
          var myquery = ""; //args.queryBuilder.computeCompleteExpression();
          myquery = thequery;
          t0 = performance.now();
          Coveo.SearchEndpoint.endpoints.default
            .search({ q: myquery, numberOfResults: 500 })
            .done(function(response) {
              var t1 = performance.now();
              var values = response;

              document.getElementById("myquery").innerHTML +=
                ", Nr of Single Values: " +
                String(values.results.length) +
                " in: " +
                Math.round((t1 - t0) / 1000) +
                " secs";
              values.results.forEach(result => {
                result.searchInterface = current.searchInterface;
                result.index = 101;

                const resultMarker = current.plotItem(result);
                current.plotItemAsRelevant(resultMarker);
                const myMark = current.getResultMarker(result);
                allmarkers.push(myMark.marker);
              });
              current.clusterMap = new MarkerClusterer(
                current.googleMap,
                allmarkers,
                {
                  imagePath:
                    "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
                  minimumClusterSize: 1
                }
              );
              //current.clusterMap.updateClusters();
              if (current.updateBounds) {
                console.log(current.allBounds);
                current.googleMap.fitBounds(current.allBounds);
              }
              current.addListeners(current);
            });
          
          //current.addIdleListener(true, current);
        } else {
          var allmarkers = [];

          //First execute the listFieldValues with the proper geoHash field
          document.getElementById("myquery").innerHTML +=
            this.updateBounds +
            "/Zoom: " +
            String(this.googleMap.getZoom()) +
            ", Field: " +
            fieldname;
          var myRequest = {
            field: fieldname,
            sortCriteria: "occurrences",
            maximumNumberOfValues: 15000,
            queryOverride: thequery //args.queryBuilder.computeCompleteExpression()
          };
          let current = this;
          var t0 = performance.now();
          var max = 0;
          Coveo.SearchEndpoint.endpoints.default
            .listFieldValues(myRequest)
            .done(function(response) {
              var t1 = performance.now();
              var values = response;
              var singles = [];
              for (var i = 0; i < values.length; i++) {
                if (i == 0) max = values[i].numberOfResults;
                values[i].value;
                values[i].lookupValue;
                values[i].numberOfResults;
              }
              //Check if we have limited results, if so we will not plot geohashes, only the individual results
              var onlyFullQuery = false;
              var allCount = 0;

              values.forEach(result => {
                allCount += result.numberOfResults;
              });
              document.getElementById("myquery").innerHTML +=
                ", All count: " +
                String(allCount) +
                ", Nr of Values: " +
                String(values.length) +
                " in: " +
                Math.round((t1 - t0) / 1000) +
                " secs";
              if (allCount < 300) {
                onlyFullQuery = true;
                document.getElementById("myquery").innerHTML +=
                  ", Less results (" + allCount + "), full only ";
              }
              if (!onlyFullQuery) {
                //Plot the GeoHash squares
                values.forEach(result => {
                  if (precision <= minHashPrecision) {
                    const resultMarker = current.plotGroupItem(result, max);
                    current.plotItemAsRelevant(resultMarker);
                    const myMark = current.getResultGroupMarker(result, max);
                    myMark.marker["total"] = result.numberOfResults;
                    myMark.marker["rectbounds"] = myMark.rect;
                    allmarkers.push(myMark.marker);
                  } else {
                    if (result.numberOfResults > 1) {
                      //const resultMarker = current.plotGroupItem(result, max);
                      //We always want to use clusters, so no GroupFrame
                      singles.push(result.value);
                    } else {
                      //Single values we need to capture so we can execute them later
                      singles.push(result.value);
                    }
                  }
                });
              }

              //Execute another query with the single values or the fullquery
              if (singles.length > 0 || onlyFullQuery) {
                var myquery = thequery; //args.queryBuilder.computeCompleteExpression();
                var nrofresults = singles.length + 1;
                if (!onlyFullQuery) {
                  myquery +=
                    " AND " + fieldname + "==(" + singles.join(",") + ")";
                } else nrofresults = 500;
                t0 = performance.now();
                Coveo.SearchEndpoint.endpoints.default
                  .search({
                    q: "@uri",
                    aq: myquery,
                    numberOfResults: nrofresults
                  })
                  .done(function(response) {
                    var t1 = performance.now();
                    var values = response;

                    document.getElementById("myquery").innerHTML +=
                      ", Nr of Single Values: " +
                      String(values.results.length) +
                      " in: " +
                      Math.round((t1 - t0) / 1000) +
                      " secs";
                    values.results.forEach(result => {
                      result.searchInterface = current.searchInterface;
                      result.index = 101;
                      const resultMarker = current.plotItem(result);
                      current.plotItemAsRelevant(resultMarker);
                      const myMark = current.getResultMarker(result);
                      allmarkers.push(myMark.marker);
                    });
                    current.clusterMap = new MarkerClusterer(
                      current.googleMap,
                      allmarkers,
                      {
                        imagePath:
                          "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
                        minimumClusterSize: 2
                      }
                    );
                    //current.clusterMap.updateClusters();
                    if (current.updateBounds) {
                      console.log(current.allBounds);
                      current.googleMap.fitBounds(current.allBounds);
                    }
                    current.addListeners(current);
                  });
              } else {
                current.clusterMap = new MarkerClusterer(
                  current.googleMap,
                  allmarkers,
                  {
                    imagePath:
                      "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
                    minimumClusterSize: 1
                  }
                );
                if (current.updateBounds) {
                  console.log(current.allBounds);
                  current.googleMap.fitBounds(current.allBounds);
                }
                current.addListeners(current);
                //current.clusterMap.updateClusters();
              }
              
              //current.addIdleListener(true, current);
            });
        }
      }
    //}
  }

  private plotItem(result: IQueryResult): IResultMarker {
    const resultMarker = this.getResultMarker(result);
    resultMarker.result = result;
    return resultMarker;
  }

  private plotGroupItem(result: any, max: number): IResultMarker {
    const resultMarker = this.getResultGroupMarker(result, max);
    if (resultMarker == undefined) return undefined;
    resultMarker.result = result;

    var scaleNr = 12 - this.precision / 2;
    if (resultMarker.marker != null && this.precision >= minHashPrecision) {
      //We want to plot an icon (transparent), we only want to show the label
      resultMarker.marker.setIcon({
        url: "empty.png",
        scale: 1,
        fillColor: "#0A1CEE",
        fillOpacity: 1,
        strokeWeight: 0.4
      });
      resultMarker.marker.setOpacity(1);
      resultMarker.marker.setZIndex(100);
    }
    return resultMarker;
  }

  private plotItemAsRelevant(resultMarker: IResultMarker) {
    this.setMarkerAsRelevant(resultMarker.marker);
  }

  /**
   * Here we use two different types of marker, the red one (Background Markers) are the less relevant markers used with a smaller opacity
   * As for the relevant items we use blue markers with a full opacity, this way it is easy to differenciate the type of results.
   */
  private setMarkerAsRelevant(marker: google.maps.Marker) {
    //marker.setIcon('pin5.png');
    marker.setIcon("mypin2.png");
    marker.setOpacity(1);
    marker.setZIndex(100);
  }

  private setMarkerAsBackground(marker: google.maps.Marker) {
    marker.setIcon(null);
    marker.setOpacity(0.2);
    marker.setZIndex(50);
  }

  private getResultMarker(result: IQueryResult): IResultMarker {
    const key = result.raw.sysrowid;
    if (!this.resultMarkers[key]) {
      // If the query returns an item that didn't already have a marker it will create it.
      this.resultMarkers[key] = this.createResultMarker(result);
    }
    return this.resultMarkers[key];
  }

  private getResultGroupMarker(result: any, max: number): IResultMarker {
    const key = result.value;
    if (!this.resultMarkers[key]) {
      // If the query returns an item that didn't already have a marker it will create it.
      var mark = this.createResultGroupMarker(result, max);
      if (mark != undefined) this.resultMarkers[key] = mark;
    }
    return this.resultMarkers[key];
  }

  private createResultMarker(result: IQueryResult): IResultMarker {
    const marker = this.createMarker(result);
    const rect = null;
    // This creates the marker with all the information to fill the result template that open in the map, in Google map this is called InfoWindow.
    const resultMarker: IResultMarker = {
      marker,
      result,
      rect,
      isOpen: false,
      id: result.raw.urihash
    };
    this.attachInfoWindowOnClick(resultMarker);
    return resultMarker;
  }

  private refine_interval(interval, cd, mask) {
    if (cd & mask) interval[0] = (interval[0] + interval[1]) / 2;
    else interval[1] = (interval[0] + interval[1]) / 2;
  }

  private hashBounds(geohash: string): any {
    var evenBit = true;
    var BITS = [16, 8, 4, 2, 1];
    var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    var latMin = -90,
      latMax = 90;
    var lonMin = -180,
      lonMax = 180;

    for (var i = 0; i < geohash.length; i++) {
      var chr = geohash.charAt(i);
      var idx = BASE32.indexOf(chr);
      if (idx == -1) {
        console.log("Invalid geohash: " + geohash);
        return undefined;
      } //throw new Error('Invalid geohash');

      for (var n = 4; n >= 0; n--) {
        var bitN = (idx >> n) & 1;
        if (evenBit) {
          // longitude
          var lonMid = (lonMin + lonMax) / 2;
          if (bitN == 1) {
            lonMin = lonMid;
          } else {
            lonMax = lonMid;
          }
        } else {
          // latitude
          var latMid = (latMin + latMax) / 2;
          if (bitN == 1) {
            latMin = latMid;
          } else {
            latMax = latMid;
          }
        }
        evenBit = !evenBit;
      }
    }

    var bounds = {
      sw: { lat: latMin, lon: lonMin },
      ne: { lat: latMax, lon: lonMax }
    };

    return bounds;
  }

  private decodeGeoHash(geohash: String): any {
    var is_even = true;
    var BITS = [16, 8, 4, 2, 1];
    var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    var lat = [];
    var lon = [];
    lat[0] = -90.0;
    lat[1] = 90.0;
    lon[0] = -180.0;
    lon[1] = 180.0;

    for (var i = 0; i < geohash.length; i++) {
      var c = geohash[i];
      var cd = BASE32.indexOf(c);
      for (var j = 0; j < 5; j++) {
        var mask = BITS[j];
        if (is_even) {
          this.refine_interval(lon, cd, mask);
        } else {
          this.refine_interval(lat, cd, mask);
        }
        is_even = !is_even;
      }
    }
    lat[2] = (lat[0] + lat[1]) / 2;
    lon[2] = (lon[0] + lon[1]) / 2;

    return { latitude: lat, longitude: lon };
  }

  private createResultGroupMarker(result: any, max: number): IResultMarker {
    var marker = null;
    var rect = this.createGroupHash(result, max);
    //wimif (rect == undefined) return undefined;
    marker = this.createGroupMarker(result);
    //const rect=null;
    // This creates the marker with all the information to fill the result template that open in the map, in Google map this is called InfoWindow.
    const resultMarker: IResultMarker = {
      marker,
      result,
      rect,
      isOpen: false,
      id: result.value
    };
    if (result.numberOfResults == 1) {
      this.attachGroupInfoWindowOnClick(resultMarker);
    }
    // Add a click to the rectangle so it will zoom into the area
    //this.attachGroupInfoWindowOnClick(resultMarker);
    return resultMarker;
  }

  private createMarker(result: IQueryResult): google.maps.Marker {
    const marker = new google.maps.Marker({
      position: {
        lat: result.raw[this.options.latField],
        lng: result.raw[this.options.lonField]
      },
      zIndex: 100
    });
    marker.setMap(this.googleMap);
    this.allBounds.extend(marker.getPosition());

    return marker;
  }

  private createGroupMarker(result: any): google.maps.Marker {
    var mylat = 0;
    var mylon = 0;
    var hash = result.value;

    //Add a marker (only for the label)
    var res = this.decodeGeoHash(hash);
    const marker = new google.maps.Marker({
      position: {
        lat: res.latitude[2],
        lng: res.longitude[2]
      },
      zIndex: 100
    });

    marker.setMap(this.googleMap);
    this.allBounds.extend(marker.getPosition());

    return marker;

    /*
    var mylat = 0;
    var mylon = 0;
    var hash = result.value;
    var fontsize = (this.precision / 2) + 10 + 'px';
    //Decode hash to lat lon
    if (this.precision >= minHashPrecision) {
      //Add a marker (only for the label)
      var res = this.decodeGeoHash(hash);
      const marker = new google.maps.Marker({
        position: {
          lat: res.latitude[2],
          lng: res.longitude[2]
        },
        zIndex: 100
      });

      marker.setLabel({
        color: '#000', fontSize: fontsize, fontWeight: '600',
        text: String(result.numberOfResults)
      });

      marker.setMap(this.googleMap);
      this.allBounds.extend(marker.getPosition());

      return marker;
    }
    else return null;*/
  }

  private createGroupHash(result: any, max: number): google.maps.Rectangle {
    var mylat = 0;
    var mylon = 0;
    var hash = result.value;
    var percentage = result.numberOfResults / max + 0.1;
    //Decode hash to lat lon
    var res = this.hashBounds(hash);
    if (res != undefined) {
      const rect = new google.maps.Rectangle({
        strokeColor: "blue",
        strokeOpacity: 0.2,
        strokeWeight: 1,
        clickable: true,
        fillColor: "#FF0000",
        fillOpacity: percentage,
        map: this.googleMap,
        bounds: {
          north: res.ne.lat,
          south: res.sw.lat,
          east: res.ne.lon,
          west: res.sw.lon
        },
        zIndex: 50
      });
      this.allBounds.extend(rect.getBounds().getNorthEast());
      this.allBounds.extend(rect.getBounds().getSouthWest());
      rect.setMap(null);
      return rect;
    } else return undefined;
  }

  private attachInfoWindowOnClick(resultMarker: IResultMarker) {
    const { marker } = resultMarker;
    marker.addListener("click", () => {
      const { result, isOpen } = resultMarker;
      let { infoWindow } = resultMarker;
      if (!infoWindow) {
        infoWindow = new google.maps.InfoWindow({
          maxWidth: 600,
          disableAutoPan: true
        });
        resultMarker.infoWindow = infoWindow;
      }
      // To remove confusion we decided to close the previous opened window when clicking on a different result.
      if (!isOpen) {
        this.instantiateTemplate(result).then(element => {
          this.closeAllInfoWindows();
          const { lat, lng } = marker.getPosition().toJSON();
          //Remove listener, we do not want to update the map when repositioning
          google.maps.event.removeListener(this.idleListener);

          this.centerMapOnPoint(lat, lng);
          infoWindow.setContent(element);
          infoWindow.setZIndex(9999);
          infoWindow.open(this.googleMap, marker);
          //Add idle listener
          this.addIdleListener(true, this);
          resultMarker.isOpen = true;
          this.sendClickEvent(resultMarker);
        });
      } else {
        resultMarker.isOpen = false;
        infoWindow.close();
      }
    });
  }

  private attachGroupInfoWindowOnClick(resultMarker: IResultMarker) {
    //We want to zoom in onto the rectangle
    const { rect } = resultMarker;
    if (rect !== undefined) {
      rect.addListener("click", () => {
        if (resultMarker.rect !== undefined) {
          this.googleMap.fitBounds(resultMarker.rect.getBounds());
        } else {
          this.googleMap.setZoom(17);
          this.googleMap.panTo(resultMarker.marker.getPosition());
        }
      });
    }
  }

  private async instantiateTemplate(
    result: IQueryResult
  ): Promise<HTMLElement> {
    const element = await this.options.template.instantiateToElement(result);
    Component.bindResultToElement(element as HTMLElement, result);
    await Initialization.automaticallyCreateComponentsInsideResult(
      element as HTMLElement,
      result
    ).initResult;
    return element as HTMLElement;
  }

  private closeAllInfoWindows() {
    Object.keys(this.resultMarkers)
      .map(key => this.resultMarkers[key])
      .filter(marker => !!marker.infoWindow)
      .forEach(marker => {
        marker.isOpen = false;
        marker.infoWindow.close();
      });
  }

  private clearResultMarkers() {
    if (this.clusterMap) {
      this.clusterMap.clearMarkers();
      this.clusterMap.setMap(null);
      this.clusterMap = null;
    }
    Object.keys(this.resultMarkers)
      .map(key => this.resultMarkers[key])
      .forEach(marker => {
        if (marker.marker) {
          marker.marker.setMap(null);
        }
        if (marker.rect != null) {
          marker.rect.setMap(null);
        }
      });
    this.resultMarkers = {};
  }

  /**
   * This is a custom analytic call that was created to keep track of click events that happen on the map.
   * Analytics allows you to train your machine learning model,
   * they are easy to implement on a result list but we also wanted to keep track of what as clicked on them map
   */
  private sendClickEvent(resultMarker: IResultMarker) {
    const customEventCause = { name: "Click", type: "document" };
    const { marker, result } = resultMarker;
    const isRelevant = marker.getOpacity() != 1;
    const metadata = {
      relevantMarker: true,
      zip: result.raw.myzip,
      city: result.raw.dyaddress1city
    };
    this.usageAnalytics.logClickEvent(
      customEventCause,
      metadata,
      result,
      this.element
    );
  }

  private centerMapOnPoint(lat, lng) {
    const scale = Math.pow(2, this.googleMap.getZoom());
    const latLng = new google.maps.LatLng(lat, lng);
    const mapCenter = this.googleMap.getProjection().fromLatLngToPoint(latLng);
    const pixelOffset = new google.maps.Point(
      0 / scale || 0,
      -200 / scale || 0
    );
    const worldCoordinateNewCenter = new google.maps.Point(
      mapCenter.x - pixelOffset.x,
      mapCenter.y + pixelOffset.y
    );
    const newCenter = this.googleMap
      .getProjection()
      .fromPointToLatLng(worldCoordinateNewCenter);
    this.googleMap.setCenter(newCenter);
  }

  public focusOnMarker(markerId: string) {
    Object.keys(this.resultMarkers)
      .filter(key => this.resultMarkers[key].id == markerId)
      .forEach(key => {
        const { marker } = this.resultMarkers[key];
        const { lat, lng } = marker.getPosition().toJSON();
        //Remove listener, we do not want to update the map when repositioning
        google.maps.event.removeListener(this.idleListener);
        this.centerMapOnPoint(lat, lng);
        google.maps.event.trigger(marker, "click");
        marker.setAnimation(google.maps.Animation.DROP);
        //Add idle listener
        //this.addIdleListener(true, this);
      });
    window.scroll({ top: 0, left: 0, behavior: "smooth" });
  }
}

Initialization.registerAutoCreateComponent(CoveoGeoHashMap);
