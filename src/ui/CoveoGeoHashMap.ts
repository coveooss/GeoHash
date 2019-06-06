import {
  Component,
  IComponentBindings,
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
} from 'coveo-search-ui';

export interface ICoveoGeoHashMapOptions {
  template: Template;
}

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
  static ID = 'GeoHashMap';

  /**
   * This section will fetch the data-template-id value of the CoveoGeoHashMap component and
   * will load any Underscore template script available in the SearchInterface node matching with the DOM ID.
   */
  static options: ICoveoGeoHashMapOptions = {
    template: ComponentOptions.buildTemplateOption({
      defaultFunction: () => TemplateCache.getDefaultTemplate('Default')
    })
  };

  /**
   * The CoveoGeoHashMap object stores the Google Map object, so all the map functionalities are accessible.
   * All the results are also store in-memory using the Interface defined at the beggining of this file.
   */
  private googleMap: google.maps.Map;
  private clusterMap: MarkerClusterer;
  private precision: number;
  private idleListener;
  private allBounds: google.maps.LatLngBounds;
  private currentQuery: string;
  private updateBounds: boolean;
  private resultMarkers: { [key: string]: IResultMarker };

  constructor(public element: HTMLElement, public options: ICoveoGeoHashMapOptions, public bindings: IComponentBindings) {
    super(element, CoveoGeoHashMap.ID, bindings);
    this.options = ComponentOptions.initComponentOptions(element, CoveoGeoHashMap, options);
    this.resultMarkers = {};
    this.bind.onRootElement(QueryEvents.doneBuildingQuery, (args: IBuildingQueryEventArgs) => this.onDoneBuildingQuery(args));
    this.bind.onRootElement(QueryEvents.querySuccess, (args: IQuerySuccessEventArgs) => this.onQuerySuccess(args));
    this.bind.onRootElement(InitializationEvents.afterInitialization, () => this.initMap());
  }

  private initMap() {
    this.updateBounds = true;
    this.currentQuery = "";
    this.googleMap = new google.maps.Map(this.element, {
      center: { lat: 52.1284, lng: 5.123 },
      zoom: 7,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.BOTTOM_CENTER
      },
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.LEFT_CENTER
      },
      scaleControl: true,
      streetViewControl: true,
      streetViewControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM
      },
      fullscreenControl: true
    });
    this.precision = 1;
    //this.getPersistentMarkers();
  }


  private calcPrecision() {
    //Precision needed for the GeoHash, this will be done based upon the zoom level of the map
    var precision = 1;
    var zoom = this.googleMap.getZoom();
    if (zoom >= 6) precision = 3;
    if (zoom >= 7) precision = 4;
    if (zoom >= 8) precision = 4;
    if (zoom >= 9) precision = 5;
    if (zoom >= 10) precision = 5;
    if (zoom >= 11) precision = 5;
    if (zoom >= 12) precision = 6;
    if (zoom >= 13) precision = 6;
    if (zoom >= 14) precision = 7;
    if (zoom >= 15) precision = 7;
    if (zoom >= 16) precision = 7;
    if (zoom >= 17) precision = 8;
    if (zoom >= 18) precision = 8;
    if (zoom >= 19) precision = 8;
    if (zoom >= 20) precision = 9;
    document.getElementById("myprecision").innerHTML = String(this.googleMap.getZoom()) + "/" + String(precision);
    this.precision = precision;
    return precision;
  }

  private onDoneBuildingQuery(args: IBuildingQueryEventArgs) {
    //When the query is build, we need to check if the basic query changed, if so, we need to update the bounds
    //if not, we will add the current bounds of the map to the advanced query
    const queryBuilder = args.queryBuilder;
    var latfield = "mylat2";
    var lonfield = "mylon2";
    google.maps.event.removeListener(this.idleListener);
    this.allBounds = new google.maps.LatLngBounds();

    this.updateBounds = true;
    //Only update bounds when the entered query is different than the previous one
    if (args.queryBuilder.expression.build() == this.currentQuery) {
      this.updateBounds = false;
    }
    if (this.currentQuery == "") this.updateBounds = false;
    this.currentQuery = args.queryBuilder.expression.build();
    if (!this.updateBounds) {
      var bounds2 = this.googleMap.getBounds();
      if (bounds2 != undefined) {
        if (!isNaN(bounds2.getNorthEast().lat())) {
          var ne = bounds2.getNorthEast(); // LatLng of the north-east corner
          var sw = bounds2.getSouthWest(); // LatLng of the south-west corder
          var query = '';
          //|------------------|
          //|           NE 53,6|  //lat,lon
          //|                  |
          //|SW 52,4           |
          if (ne.lat() > sw.lat()) //ne=67>sw=-5
          {
            query = '@' + latfield + '<=' + ne.lat() + ' AND @' + latfield + '>=' + sw.lat();
          } else {
            query = '@' + latfield + '>=' + ne.lat() + ' AND @' + latfield + '<=' + sw.lat();
          }
          if (ne.lng() > sw.lng()) //ne=67>sw=-5  -70 -142
          {
            query = query + ' @' + lonfield + '<=' + ne.lng() + ' AND @' + lonfield + '>=' + sw.lng();
          } else {
            query = query + ' @' + lonfield + '>=' + ne.lng() + ' AND @' + lonfield + '<=' + sw.lng();
            //172 -64
            //-64 172
          }
          queryBuilder.advancedExpression.add(query);
        }
      }
    }

  }

  private addIdleListener(slow: boolean, reference: any) {
    //Adds the google map idle listener (which fires when map is completely reloaded)
    //when the map is idle, we want to re-execute the query
    if (slow) {
      setTimeout(function () {
        reference.idleListener = reference.googleMap.addListener('idle', function (ev) {
          setTimeout(function () {
            reference.searchInterface.queryController.executeQuery();
          }, 1000);
        });
      }, 1000);

    }
    else {
      reference.idleListener = reference.googleMap.addListener('idle', function (ev) {
        setTimeout(function () {
          reference.searchInterface.queryController.executeQuery();
        }, 1000);
      });
    }
  }

  private onQuerySuccess(args: IQuerySuccessEventArgs) {
    //When the query is executed, we want to fetch the GeoHashes

    this.closeAllInfoWindows();
    this.clearResultMarkers();
    var precision = this.calcPrecision();
    //When updating bounds we do not know the exact precision
    if (this.updateBounds) {
      if (precision >= 7) precision = 6; else precision = precision + 1;
      this.precision = precision;
    }
    if (precision > 1) {
      var fieldname = "@geohash" + String(precision);
      if (precision > 8) {
        //If precision is to high, we need to get the individual results.
        fieldname = "";
        let current = this;
        document.getElementById("myquery").innerHTML = this.updateBounds + "/Zoom: " + String(this.googleMap.getZoom()) + ", ";
        var myquery = args.queryBuilder.computeCompleteExpression();
        t0 = performance.now();
        Coveo.SearchEndpoint.endpoints.default.search({ q: myquery, numberOfResults: 500 }).done(function (response) {
          var t1 = performance.now();
          var values = response;

          document.getElementById("myquery").innerHTML += ", Nr of Single Values: " + String(values.results.length) + " in: " + Math.round((t1 - t0) / 1000) + " secs";
          values.results.forEach(result => {
            result.searchInterface = current.searchInterface;
            result.index = 101;

            const resultMarker = current.plotItem(result);
            current.plotItemAsRelevant(resultMarker);
          });
        });
        if (current.updateBounds) {
          current.googleMap.fitBounds(current.allBounds);
        }
        current.addIdleListener(true, current);
      }
      else {
        //First execute the listFieldValues with the proper geoHash field
        document.getElementById("myquery").innerHTML = this.updateBounds + "/Zoom: " + String(this.googleMap.getZoom()) + ", Field: " + fieldname;
        var myRequest = {
          field: fieldname,
          sortCriteria: "occurrences",
          maximumNumberOfValues: 15000,
          queryOverride: args.queryBuilder.computeCompleteExpression()
        };
        let current = this;
        var t0 = performance.now();
        var max = 0;
        Coveo.SearchEndpoint.endpoints.default.listFieldValues(myRequest).done(function (response) {
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
          document.getElementById("myquery").innerHTML += ", Nr of Values: " + String(values.length) + " in: " + Math.round((t1 - t0) / 1000) + " secs";
          values.forEach(result => {
            allCount += result.numberOfResults;
          });
          if (allCount < 300) {
            onlyFullQuery = true;
            document.getElementById("myquery").innerHTML += ", Less results (" + allCount + "), execute full only ";
          }
          if (!onlyFullQuery) {
            //Plot the GeoHash squares
            values.forEach(result => {
              if (result.numberOfResults > 1) {
                const resultMarker = current.plotGroupItem(result, max);
              }
              else {
                //Single values we need to capture so we can execute them later
                singles.push(result.value);
              }
            });
          }

          //Execute another query with the single values or the fullquery
          if (singles.length > 0 || onlyFullQuery) {
            var myquery = args.queryBuilder.computeCompleteExpression();
            var nrofresults = singles.length + 1;
            if (!onlyFullQuery) {
              myquery += " AND " + fieldname + "==(" + singles.join(",") + ")";
            }
            else nrofresults = 500;
            t0 = performance.now();
            Coveo.SearchEndpoint.endpoints.default.search({ q: '@uri', aq: myquery, numberOfResults: nrofresults }).done(function (response) {
              var t1 = performance.now();
              var values = response;

              document.getElementById("myquery").innerHTML += ", Nr of Single Values: " + String(values.results.length) + " in: " + Math.round((t1 - t0) / 1000) + " secs";
              values.results.forEach(result => {
                result.searchInterface = current.searchInterface;
                result.index = 101;
                const resultMarker = current.plotItem(result);
                current.plotItemAsRelevant(resultMarker);
              });
            });
          }
          if (current.updateBounds) {
            current.googleMap.fitBounds(current.allBounds);
          }
          current.addIdleListener(true, current);
        });
      }
    }
  }

  private plotItem(result: IQueryResult): IResultMarker {
    const resultMarker = this.getResultMarker(result);
    resultMarker.result = result;
    return resultMarker;
  }

  private plotGroupItem(result: any, max: number): IResultMarker {
    const resultMarker = this.getResultGroupMarker(result, max);
    resultMarker.result = result;

    var scaleNr = 12 - (this.precision / 2);
    if (resultMarker.marker != null && this.precision >= 6) {
      //We want to plot an icon (transparent), we only want to show the label
      resultMarker.marker.setIcon({
        url: 'empty.png',
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
    marker.setIcon('pin5.png');
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
      this.resultMarkers[key] = this.createResultGroupMarker(result, max);
    }
    return this.resultMarkers[key];
  }

  private createResultMarker(result: IQueryResult): IResultMarker {
    const marker = this.createMarker(result);
    const rect = null;
    // This creates the marker with all the information to fill the result template that open in the map, in Google map this is called InfoWindow.
    const resultMarker: IResultMarker = {
      marker, result, rect, isOpen: false, id: result.raw.urihash
    };
    this.attachInfoWindowOnClick(resultMarker);
    return resultMarker;
  }

  private refine_interval(interval, cd, mask) {
    if (cd & mask)
      interval[0] = (interval[0] + interval[1]) / 2;
    else
      interval[1] = (interval[0] + interval[1]) / 2;
  }

  private hashBounds(geohash: string): any {
    var evenBit = true;
    var BITS = [16, 8, 4, 2, 1];
    var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    var latMin = -90, latMax = 90;
    var lonMin = -180, lonMax = 180;

    for (var i = 0; i < geohash.length; i++) {
      var chr = geohash.charAt(i);
      var idx = BASE32.indexOf(chr);
      if (idx == -1) throw new Error('Invalid geohash');

      for (var n = 4; n >= 0; n--) {
        var bitN = idx >> n & 1;
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
      ne: { lat: latMax, lon: lonMax },
    };

    return bounds;
  }

  private decodeGeoHash(geohash: String): any {
    var is_even = true;
    var BITS = [16, 8, 4, 2, 1];
    var BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    var lat = []; var lon = [];
    lat[0] = -90.0; lat[1] = 90.0;
    lon[0] = -180.0; lon[1] = 180.0;

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
    marker = this.createGroupMarker(result);
    // This creates the marker with all the information to fill the result template that open in the map, in Google map this is called InfoWindow.
    const resultMarker: IResultMarker = {
      marker, result, rect, isOpen: false, id: result.value,
    };
    // Add a click to the rectangle so it will zoom into the area
    this.attachGroupInfoWindowOnClick(resultMarker);
    return resultMarker;
  }

  private createMarker(result: IQueryResult): google.maps.Marker {
    const marker = new google.maps.Marker({
      position: {
        lat: result.raw.mylat2,
        lng: result.raw.mylon2
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
    var fontsize = (this.precision / 2) + 10 + 'px';
    //Decode hash to lat lon
    if (this.precision >= 6) {
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
    else return null;
  }


  private createGroupHash(result: any, max: number): google.maps.Rectangle {
    var mylat = 0;
    var mylon = 0;
    var hash = result.value;
    var percentage = (result.numberOfResults / max) + 0.1;
    //Decode hash to lat lon
    var res = this.hashBounds(hash);
    const rect = new google.maps.Rectangle({
      strokeColor: 'blue',
      strokeOpacity: 0.2,
      strokeWeight: 1,
      clickable: true,
      fillColor: '#FF0000',
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

    return rect;
  }

  private attachInfoWindowOnClick(resultMarker: IResultMarker) {
    const { marker } = resultMarker;
    marker.addListener('click', () => {
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
    rect.addListener('click', () => {
      this.googleMap.fitBounds(resultMarker.rect.getBounds());
    });
  }


  private instantiateTemplate(result: IQueryResult): Promise<HTMLElement> {
    return this.options.template.instantiateToElement(result).then(element => {
      Component.bindResultToElement(element, result);
      return Initialization.automaticallyCreateComponentsInsideResult(element, result)
        .initResult.then(() => element);
    });
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
    const customEventCause = { name: 'Click', type: 'document' };
    const { marker, result } = resultMarker;
    const isRelevant = marker.getOpacity() != 1;
    const metadata = {
      relevantMarker: true,
      zip: result.raw.myzip,
      city: result.raw.dyaddress1city
    };
    this.usageAnalytics.logClickEvent(customEventCause, metadata, result, this.element);
  }

  private centerMapOnPoint(lat, lng) {
    const scale = Math.pow(2, this.googleMap.getZoom());
    const latLng = new google.maps.LatLng(lat, lng);
    const mapCenter = this.googleMap.getProjection().fromLatLngToPoint(latLng);
    const pixelOffset = new google.maps.Point((0 / scale) || 0, (-200 / scale) || 0);
    const worldCoordinateNewCenter = new google.maps.Point(
      mapCenter.x - pixelOffset.x,
      mapCenter.y + pixelOffset.y
    );
    const newCenter = this.googleMap.getProjection().fromPointToLatLng(worldCoordinateNewCenter);
    this.googleMap.setCenter(newCenter);
  }

  public focusOnMarker(markerId: string) {
    Object.keys(this.resultMarkers)
      .filter(key => this.resultMarkers[key].id == markerId)
      .forEach((key) => {
        const { marker } = this.resultMarkers[key];
        const { lat, lng } = marker.getPosition().toJSON();
        //Remove listener, we do not want to update the map when repositioning
        google.maps.event.removeListener(this.idleListener);
        this.centerMapOnPoint(lat, lng);
        google.maps.event.trigger(marker, 'click');
        marker.setAnimation(google.maps.Animation.DROP);
        //Add idle listener
        //this.addIdleListener(true, this);
      });
    window.scroll({ top: 0, left: 0, behavior: 'smooth' });
  }

}

Initialization.registerAutoCreateComponent(CoveoGeoHashMap);
