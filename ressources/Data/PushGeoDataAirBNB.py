#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Push the data the Coveo Platform, using the Push SDK
# Ref: https://github.com/coveo-labs/SDK-Push-Python

# Requirements:
#    - Add IPE to your Push source (IPE\GeoHashIPE.py)
#    - Add Facet fields (including the flag UseCacheForNestedQueries)
#      - geohash2, geohash3, geohash4, geohash5, geohash6, geohash7, geohash8
#    - Add mappings to the fields: lat, lon, adres, pc (zipcode), wpl (city), gem (state), prov (province), bouwjaar (build in year), kamers (rooms), opp (area)

from coveopush import CoveoPush
from coveopush import Document
from coveopush import CoveoPermissions
from coveopush import CoveoConstants
from random import randint
import os
import csv
import json
import html
import zlib
import time
import base64
import urllib.request
from random import seed
from random import randint

noratings = True
sourceId = 'YOUR-SOURCE-ID'
orgId = 'YOUR-ORG-ID'
apiKey = 'YOUR-KEY'
BASE_URL= 'https://travel.coveodemo.com/Locations/'
# for the availability
goldMember = ''
silverMember = ''
platinumMember = ''
publicMember = ''
# for the neighboorhoods
neigboorhoods = {}
currentExport=list()

def addAvailability(avail):
    document_id = 'https://availability?id='+avail['id']
    mydoc = Document(document_id)
    # Set the fileextension
    mydoc.FileExtension = ".html"
    mydoc.AddMetadata('myavailstatus',avail['id'])
    mydoc.AddMetadata('myhouseids',avail['myhouseids'])
    mydoc.AddMetadata('objecttype','Availability')

    return mydoc


def addRating(rate):
    document_id = 'https://rating?id='+rate['id']
    mydoc = Document(document_id)
    # Set the fileextension
    mydoc.FileExtension = ".html"
    mydoc.AddMetadata('myratingid',rate['id'])
    mydoc.AddMetadata('myhouseid',rate['house_id'])
    mydoc.AddMetadata('myratingtype',rate['type'])
    mydoc.AddMetadata('myratingage',rate['age'])
    mydoc.AddMetadata('myrating',rate['rate'])
    mydoc.AddMetadata('objecttype','Rating')

    return mydoc

def addNeighboorhood(neighboorhood):
    document_id = 'https://neighboorhood?id='+neighboorhood['id']
    mydoc = Document(document_id)
    # Set the fileextension
    mydoc.FileExtension = ".html"
    mydoc.Title = neighboorhood['name']
    mydoc.AddMetadata('myneighbourhood',neighboorhood['name'])
    mydoc.AddMetadata('mydescr',neighboorhood['mydescr'])
    mydoc.AddMetadata('mycountry',neighboorhood['mycountry'])
    mydoc.AddMetadata('mycity',neighboorhood['mycity'])
    mydoc.AddMetadata('mylat',neighboorhood['mylat'])
    mydoc.AddMetadata('mylon',neighboorhood['mylon'])
    mydoc.AddMetadata('objecttype','Neighboorhood')
    mydoc.SetContentAndZLibCompress(neighboorhood['mydescr'])

    return mydoc

def add_document(house):
    global goldMember
    global silverMember
    global platinumMember
    global publicMember
    global neigboorhoods
    global push
    global noratings
    global BASE_URL
    global currentExport
    # Use username as unique identifier
    # id,listing_url,scrape_id,last_scraped,name,summary,space,description,experiences_offered,neighborhood_overview,notes,transit,access,interaction,house_rules,thumbnail_url,medium_url,picture_url,xl_picture_url,host_id,host_url,host_name,host_since,host_location,host_about,host_response_time,host_response_rate,host_acceptance_rate,host_is_superhost,host_thumbnail_url,host_picture_url,host_neighbourhood,host_listings_count,host_total_listings_count,host_verifications,host_has_profile_pic,host_identity_verified,street,neighbourhood,neighbourhood_cleansed,neighbourhood_group_cleansed,city,state,zipcode,market,smart_location,country_code,country,latitude,longitude,is_location_exact,property_type,room_type,accommodates,bathrooms,bedrooms,beds,bed_type,amenities,square_feet,price,weekly_price,monthly_price,security_deposit,cleaning_fee,guests_included,extra_people,minimum_nights,maximum_nights,minimum_minimum_nights,maximum_minimum_nights,minimum_maximum_nights,maximum_maximum_nights,minimum_nights_avg_ntm,maximum_nights_avg_ntm,calendar_updated,has_availability,availability_30,availability_60,availability_90,availability_365,calendar_last_scraped,number_of_reviews,number_of_reviews_ltm,first_review,last_review,review_scores_rating,review_scores_accuracy,review_scores_cleanliness,review_scores_checkin,review_scores_communication,review_scores_location,review_scores_value,requires_license,license,jurisdiction_names,instant_bookable,is_business_travel_ready,cancellation_policy,require_guest_profile_picture,require_guest_phone_verification,calculated_host_listings_count,calculated_host_listings_count_entire_homes,calculated_host_listings_count_private_rooms,calculated_host_listings_count_shared_rooms,reviews_per_month

    meta = dict()
    body = ""
    document_id = ""

    # We have a normal movie
    document_id = house['listing_url']
    mydoc = Document(document_id)
    # Set the fileextension
    mydoc.FileExtension = ".html"

    #print (house)

    imageurl = house['picture_url'].replace('aki_policy=large','aki_policy=medium')

    """ if not os.path.exists("images\\"+house['id']+".jpg"):
      try:
        print ("Get Image "+str(house['id']))
        urllib.request.urlretrieve(imageurl, "images\\"+house['id']+".jpg")
        time.sleep(0.1)
      except:
        return ""
    imageurl="images\\"+house['id']+".jpg" """
    # Build up the quickview/preview (HTML)
    content = "<html><head><meta charset='UTF-16'><meta http-equiv='Content-Type' content='text/html; charset=UTF-16'>"
#    content = "<link href=\"https://fonts.googleapis.com/css?family=Montserrat:400,600&display=swap\" rel=\"stylesheet\">"
    content = content + "<style>"
    content = content + " body > div:nth-child(2) { display: none }"
    content = content + " [id^=CoveoHighlight] {background-color: white !important;}"
    content = content + " .side .title {"
    content = content + "    color: #000 !important; font-size: 16pt !important;padding-bottom: 15px;"
    content = content + "  }"
    content = content + "  .side .host {"
    content = content + "    display:inline-block;"
    content = content + "    color: gray;padding-bottom: 15px;"
    content = content + "  }"
    content = content + "  .side .city, .side .state, .side .country {"
    content = content + "    display: inline-block;"
    content = content + "    padding-left: 10px;"
    content = content + "    color: gray;"
    content = content + "  }"
    content = content + "  .side .header_info {"
    content = content + "    font-size: 12pt;"
    #content = content + "    font-weight: bold;"
    content = content + "  }"
    content = content + "  .side .info {"
    content = content + "    font-size: 10pt;padding-bottom: 15px;"
    content = content + "  }"
    content = content + "  .side .infos {"
    content = content + "    color: gray;padding-bottom: 15px;display:inline-block;padding-right: 10px;"
    content = content + "  }"
    content = content + "  .myimage img, .image img{"
    content = content + "    box-shadow: 1px 3px 5px 0px gray;"
    content = content + "   width: 100%;"
    content = content + "  }"
    content = content + "    .myimage img {"
    content = content + "      border-radius: 2px;"
    content = content + "     max-height:250px;"
    content = content + "  }"
    content = content + "  .image img {"
    content = content + "    border-radius: 4px;"
    content = content + "    max-height:350px;max-width: 350px;"
    content = content + "}"
    content = content + "  .image {"
    content = content + "   float: left;"
    content = content + "   padding: 5px;"
    content = content + "   padding-right: 15px;"
    content = content + "  }"
    content = content + " .amenities { font-size: 11pt; column-count: 3;max-width: 50%;}"
    content = content + " .inf_title { display:inline-block;padding-right: 5px; font-size: 0.8em;  font-style: italic;}"
    content = content + " .inf_value { display:inline-block;}"
    content = content + " body {font-family: 'Verdana', sans-serif !important;}"
    content = content + " ul {list-style: none;font-size:11pt}"
    content = content + " li {padding-right: 5px}"
    content = content + " .host {padding-right: 5px}"
    content = content + " .city {padding-right: 5px}"
    content = content + " .state {padding-right: 5px}"
    content = content + " .country {padding-right: 5px}"
    #content = content + " .host::before {content: 'By'; padding-right: 5px; font-size: 0.8em;  font-style: italic;}"
    #content = content + " .city::before {content: 'In'; padding-right: 5px; font-size: 0.8em;  font-style: italic;}"
    #content = content + " .state::before {content: 'State'; padding-right: 5px; font-size: 0.8em;  font-style: italic;}"
    #content = content + " .country::before {content: 'Country'; padding-right: 5px; font-size: 0.8em;  font-style: italic;}"
    content = content + "</style>"
    content = content + "</head>"
    # The below is NOT allowed
    # content = content + "<script>"
    # content = content + "  function removeHigh() {"
    # content = content + "    console.log('removeHigh called');"
    # content = content + "    var high=document.querySelectorAll('[id^=\"CoveoHighlight\"]');"
    # content = content + "    high.forEach(k => { k.style.backgroundColor =\"white\"; } );"
    # content = content + " }"
    # content = content + "document.addEventListener('DOMContentLoaded', function () {"
    # content = content + " removeHigh();"
    # content = content + " document.querySelector('body > div:nth-child(2)').style.display=\"none\";"
    # content = content + "});"
    # content = content + "</script>"
    # content = content+ "<title>"+movie['title']+"    ("+movie["release_date"].split('-')[0]+")</title>"
    content = content + "<title>"+house['name']+"</title>"
    content = content + "<body>"


    content = content + "<div class='header'>"
    content = content + "<div class='imageblock'><div class='image'>"
    if (house['picture_url']):
        content = content + " <img class='imageimg' src='"+house['picture_url']+"' onerror=\"javascript:this.src='images/emptyHouse.jpg'\">"

    content = content + "</div><div class='side' style='padding-left: 370px;'><div class='title'>" + house["name"]+"</div>"
    #content = content + "<ul>"
    #content = content + "<li>By<span class='host'>"+house["host_name"]+"<span></li>"
    #content = content + "<li>In<span class='city'>"+house["city"]+"<span></li>"
    #content = content + "<li>State<span class='state'>"+house["state"]+"<span></li>"
    #content = content + "<li>Country<span class='country'>"+house["country"]+"<span></li>"
    #content = content + "</ul>"
    content = content + "<div class='header_info'>Overview</div>"
    #content = content + "<div class='infos'><div class='inf_title'>Property type</div><div class='inf_value'>"+house["property_type"]+"</div></div>"
    #content = content + "<div class='infos'><div class='inf_title'>Room type</div><div class='inf_value'>"+house["room_type"]+"</div></div>"
    #content = content + "<div class='infos'><div class='inf_title'>Bed type</div><div class='inf_value'>"+house["bed_type"]+"</div></div>"

    #content = content + "<div class='header_info'>Summary</div>"
    content = content + "<div class='info'>"+  house["summary"]+"</div>"
    if house["description"]:
      content = content + "<div class='header_info'>Full Description</div>"
      content = content + "<div class='info'>"+  house["description"]+"</div>"
    if house["space"]:
      content = content + "<div class='header_info'>Space</div>"
      content = content + "<div class='info'>"+  house["space"]+"</div>"
    if house["neighborhood_overview"]:
      content = content + "<div class='header_info'>Neighborhood</div>"
      content = content + "<div class='info'>"+  house["neighborhood_overview"]+"</div>"
    #content = content + "<div class='header_info'>Amenities</div>"
    amenities = house['amenities'].replace('"','').replace('{','').replace('}','').split(',')
    #content = content + "<div class='amenities'>"+  '<br>'.join(amenities)+"</div>"
    content = content + "</body></html>"
    #put content also in fields for Sitecore dumps
    #meta["sitecorePage"] = content
    meta["sitecoreDescription"]= house["description"]
    meta["sitecoreSpace"] = house["space"]
    meta["sitecoreNeighbourhood"] = house["neighborhood_overview"]
    # Geocode

    body = ""
    mydoc.SetContentAndZLibCompress(content)
    meta["connectortype"] = "Push"
    meta["mytype"] = "Houses"
    meta["myhouseid"] = house['id']
    meta["myimage"] = imageurl
    meta["mycountry"] = house['country']
    meta["mycity"] = house['city']
    meta["myprice"] = house["price"].replace('$','') #new
    price = float(meta["myprice"].replace(",",''))
    if (price<=130):
       members = "Public;Gold;Silver;Platinum"
    if (price>130 and price<180):
      members = "Gold;Silver;Platinum"
    if (price>=180 and price<250):
      members = "Silver;Platinum"
    if (price>=250):
      members = "Platinum"
    if not noratings:
      #add ratings
      addme = randint(1,5)
      rating = randint(1, 5)
      if (addme>2):
        myrate = addRating({'id':house['id']+'A', 'house_id':house['id'], 'type':'Business','age':'25-40','rate':rating})
        push.Add(myrate)
      rating = randint(1, 5)
      myrate = addRating({'id':house['id']+'B', 'house_id':house['id'], 'type':'Business','age':'40-50','rate':rating})
      push.Add(myrate)
      if (price>180):
        rating = randint(1, 5)
        myrate = addRating({'id':house['id']+'C', 'house_id':house['id'], 'type':'Business','age':'50+','rate':rating})
        push.Add(myrate)
        rating = randint(1, 5)
        myrate = addRating({'id':house['id']+'D', 'house_id':house['id'], 'type':'Family','age':'25-35','rate':rating})
        push.Add(myrate)
        if (addme>2):
          rating = randint(1, 5)
          myrate = addRating({'id':house['id']+'E', 'house_id':house['id'], 'type':'Family','age':'35-50','rate':rating})
          push.Add(myrate)

      if (price<=180):
        rating = randint(1, 5)
        myrate = addRating({'id':house['id']+'F', 'house_id':house['id'], 'type':'Individual','age':'20-30','rate':rating})
        push.Add(myrate)
        if (addme>2):
          rating = randint(1, 5)
          myrate = addRating({'id':house['id']+'G', 'house_id':house['id'], 'type':'Individual','age':'30-40','rate':rating})
          push.Add(myrate)
        rating = randint(1, 5)
        myrate = addRating({'id':house['id']+'I', 'house_id':house['id'], 'type':'Individual','age':'40-50','rate':rating})
        push.Add(myrate)

    meta["mymemberships"] = members
    meta["myproptype"] = house['property_type'] #new
    meta["myroomtype"] = house['room_type'] #new
    meta["mynopersons"] = house['accommodates'] #new
    meta["mybathrooms"] = house['bathrooms'] #new
    meta["mybedrooms"] = house['bedrooms'] #new
    meta["mybeds"] = house['beds'] #new
    meta["mybathroomsf"] = house['bathrooms'] #new
    meta["mybedroomsf"] = house['bedrooms'] #new
    meta["mybedsf"] = house['beds'] #new

    meta["mybedtype"] = house['bed_type'] #new
    meta["myneighbourhood"] = house['neighbourhood_cleansed'] #new
    # check if we already have the neighboorhood
    if (house['neighbourhood_cleansed']+house['city'] not in neigboorhoods):
      if (len(house['neighborhood_overview'])>400):
        neigboorhoods[house['neighbourhood_cleansed']+house['city']]="WeHaveIt"
        print ("Adding neighboorhood: "+house['neighbourhood_cleansed']+house['city'])
        #Add to index
        myneigh=addNeighboorhood({'id':house['neighbourhood_cleansed']+house['city'],'mydescr':house['neighborhood_overview'], 'name':house['neighbourhood_cleansed'], 'mycity': house['city'],'mycountry': house['country'],'mylat':house['latitude'], 'mylon':house['longitude']})
        push.Add(myneigh)
    meta["myamenities"] = ';'.join(amenities) #new
    meta["myvotecount"] = house['review_scores_rating']
    meta["myhost"] = house['host_name'] #new
    meta["myhostid"] = house['host_id'] #new
    meta["objecttype"] = "House" #new
    meta["language"] = "English"
    #meta["sitecoreurl"] = BASE_URL+house['country']+"/"+house['city']+"/"+house['id']
    meta["sitecoreurl"] = (BASE_URL+house['country']+"/"+house['id']).lower()
    meta["myroomprop"] = house['property_type']+";"+house['property_type']+"|"+house['room_type']

    meta["title"] = house["name"]
    # meta["topparentid"]= movie['id']
    mydoc.ClickableUri = meta["sitecoreurl"]#house['listing_url']
    mydoc.Date = house['last_scraped']

    meta["mylon"] = house['longitude']
    meta["mylat"] = house['latitude']
    #Dump meta inside new JSON for import in Sitecore

    for key in meta:
      if ('sitecore' not in key):
        mydoc.AddMetadata(key, meta[key])
    return mydoc


def parseFile(filename):
  global push
  global nopush
  global currentExport
  currentExport = list()
  with open(filename,encoding='utf8') as csv_file:
    #C:\Users\wnijmeijer\Downloads\listings (1).csv
      csv_reader = csv.DictReader(csv_file, delimiter=',')
      line_count = 0
      for row in csv_reader:
        #print (row)
        if (line_count>0):
          mydoc = add_document(row)

          if (not mydoc==""):
            if not nopush:
              push.Add(mydoc)
            # We also need to add the Availability records

            print (str(line_count)+" from: "+filename)
        line_count += 1
  #Save the export file
  filename = "output/"+filename+"_ForSiteCore.json"
  os.makedirs(os.path.dirname(filename), exist_ok=True)
  filerev = open(filename,"wb" )
  filerev.write(json.dumps(currentExport, ensure_ascii=False).encode('utf-8'))
  filerev.close()

  return


#push = CoveoPush.Push(sourceId, orgId, apiKey, CoveoPush.Constants.PushApiEndpoint.DEV_PUSH_API_URL)
push = CoveoPush.Push(sourceId, orgId, apiKey)
push.SetSizeMaxRequest(50*1024*1024)
nopush = False
if not nopush:
  push.Start(True, True)
seed(1)
noratings = True

parseFile('RefData\\Amsterdam.csv')
parseFile('RefData\\Montreal.csv')
parseFile('RefData\\Paris.csv')
parseFile('RefData\\Quebec.csv')
parseFile('RefData\\Sydney.csv')
parseFile('RefData\\Barcelona.csv')
parseFile('RefData\\SF.csv')
parseFile('RefData\\NY.csv')
parseFile('RefData\\CPH.csv')
parseFile('RefData\\Chicago.csv')
parseFile('RefData\\Prague.csv')
parseFile('RefData\\Denver.csv')
parseFile('RefData\\Seattle.csv')
parseFile('RefData\\Vancouver.csv')
parseFile('RefData\\FL.csv')
parseFile('RefData\\Austin.csv')
parseFile('RefData\\London.csv')
print("Done, continue with availability")

# mydoc = addAvailability({"id":"public","myhouseids":publicMember.split(';')})
# push.Add(mydoc)
# mydoc = addAvailability({"id":"silver","myhouseids":silverMember.split(';')})
# push.Add(mydoc)
# mydoc = addAvailability({"id":"gold","myhouseids":goldMember.split(';')})
# push.Add(mydoc)
# mydoc = addAvailability({"id":"platinum","myhouseids":platinumMember.split(';')})
# push.Add(mydoc)

print("Done")
if not nopush:
  push.End(True, not noratings)

