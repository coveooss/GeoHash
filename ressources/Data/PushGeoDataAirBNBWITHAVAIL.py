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

sourceId = 'geohashdemopgjz3v7b-xim6ba3g4ute5oooqzpv7z2k5i'
orgId = 'geohashdemopgjz3v7b'
apiKey = 'xxcf195af3-6989-49e3-a6bc-603b7f1b36a5'

# for the availability
goldMember = ''
silverMember = ''
platinumMember = ''
publicMember = ''
# for the neighboorhoods
neigboorhoods = {}

def addAvailability(avail):
    document_id = 'https://availability?id='+avail['id']
    mydoc = Document(document_id)
    # Set the fileextension
    mydoc.FileExtension = ".html"
    mydoc.AddMetadata('myavailstatus',avail['id'])
    mydoc.AddMetadata('myhouseids',avail['myhouseids'])
    mydoc.AddMetadata('objecttype','Availability')

    return mydoc


def addNeighboorhood(neighboorhood):
    document_id = 'https://neighboorhood?id='+neighboorhood['id']
    mydoc = Document(document_id)
    # Set the fileextension
    mydoc.FileExtension = ".html"
    mydoc.Title = neighboorhood['name']
    mydoc.AddMetadata('mydescr',neighboorhood['mydescr'])
    mydoc.AddMetadata('mycountry',neighboorhood['mycountry'])
    mydoc.AddMetadata('mycity',neighboorhood['mycity'])
    mydoc.AddMetadata('mylat',neighboorhood['mylat'])
    mydoc.AddMetadata('mylon',neighboorhood['mylon'])
    mydoc.AddMetadata('objecttype','Neighboorhood')

    return mydoc

def add_document(house):
    global goldMember
    global silverMember 
    global platinumMember 
    global publicMember 
    global neigboorhoods
    global push
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
    content = content + "</head>"
    # content = content+ "<title>"+movie['title']+"    ("+movie["release_date"].split('-')[0]+")</title>"
    content = content + "<title>"+house['name']+"</title>"
    content = content + "<body>"
    
    content = content + "<div class='header'>"
    content = content + "<div class='imageblock'><div class='image'>"
    if (house['picture_url']):
        content = content + " <img class='imageimg' src='"+house['picture_url']+"' onerror=\"javascript:this.src='images/emptyHouse.jpg'\">"
    content = content + "</div><div class='side'><div class='title'>" + house["name"]+"</div>"
    content = content + "<div class='host'>"+house["host_name"]+"</div>"
    content = content + "<div class='city'>"+house["city"]+"</div>"
    content = content + "<div class='state'>"+house["state"]+"</div>"
    content = content + "<div class='country'>"+house["country"]+"</div>"
    content = content + "<div class='header_info'>Summary</div>"
    content = content + "<div class='info'>"+  house["summary"]+"</div>"
    content = content + "<div class='header_info'>Full Description</div>"
    content = content + "<div class='info'>"+  house["description"]+"</div>"
    content = content + "<div class='header_info'>Space</div>"
    content = content + "<div class='info'>"+  house["space"]+"</div>"
    content = content + "<div class='header_info'>Neighborhood</div>"
    content = content + "<div class='info'>"+  house["neighborhood_overview"]+"</div>"
    content = content + "<div class='header_info'>Amenities</div>"
    amenities = house['amenities'].replace('"','').replace('{','').replace('}','').split(',')
    content = content + "<div class='amenities'>"+  '<br>'.join(amenities)+"</div>"
    
    content = content + "</body></html>"

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
       publicMember = publicMember+";"+house['id']
       goldMember = goldMember+";"+house['id']
       silverMember = silverMember+";"+house['id']
       platinumMember = platinumMember+";"+house['id']
    if (price>130 and price<180):
       silverMember = silverMember+";"+house['id']
       goldMember = goldMember+";"+house['id']
       platinumMember = platinumMember+";"+house['id']
    if (price>=180 and price<250):
       goldMember = goldMember+";"+house['id']
       platinumMember = platinumMember+";"+house['id']
    if (price>=250):
       platinumMember = platinumMember+";"+house['id']

    meta["myproptype"] = house['property_type'] #new
    meta["myroomtype"] = house['room_type'] #new
    meta["mynopersons"] = house['accommodates'] #new
    meta["mybathrooms"] = house['bathrooms'] #new
    meta["mybedrooms"] = house['bedrooms'] #new
    meta["mybeds"] = house['beds'] #new
    
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
    meta["objecttype"] = "House" #new
    meta["language"] = "English"
    
    meta["title"] = house["name"]
    # meta["topparentid"]= movie['id']
    mydoc.ClickableUri = house['listing_url']
    
    mydoc.Date = house['last_scraped']

    meta["mylon"] = house['longitude']
    meta["mylat"] = house['latitude']
    for key in meta:
      mydoc.AddMetadata(key, meta[key])
    return mydoc


def parseFile(filename):
  global push
  with open(filename,encoding='utf8') as csv_file:
    #C:\Users\wnijmeijer\Downloads\listings (1).csv
      csv_reader = csv.DictReader(csv_file, delimiter=',')
      line_count = 0
      for row in csv_reader:
        #print (row)
        if (line_count>0):
          mydoc = add_document(row)
          
          if (not mydoc==""):
            push.Add(mydoc)
            # We also need to add the Availability records

            print (str(line_count)+" from: "+filename)
        line_count += 1
  return


push = CoveoPush.Push(sourceId, orgId, apiKey)
push.SetSizeMaxRequest(50*1024*1024)
push.Start(True, True)

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
print("Done, continue with availability")

mydoc = addAvailability({"id":"public","myhouseids":publicMember.split(';')})
push.Add(mydoc)
mydoc = addAvailability({"id":"silver","myhouseids":silverMember.split(';')})
push.Add(mydoc)
mydoc = addAvailability({"id":"gold","myhouseids":goldMember.split(';')})
push.Add(mydoc)
mydoc = addAvailability({"id":"platinum","myhouseids":platinumMember.split(';')})
push.Add(mydoc)

print("Done")
push.End(True, True)

