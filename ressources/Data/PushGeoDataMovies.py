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
import base64

sourceId = 'geohashdemopgjz3v7b-wpunbkzftbwyby6wbjbw6u2a7a'
orgId = 'geohashdemopgjz3v7b'
apiKey = 'xx01076794-74e0-489f-97d6-700655fdde93'


def checkEmpty(item):
    if item:
        return True
    else:
        return False


def getnextmovie(path, allfiles):
  global filecounter
  if filecounter >= len(allfiles)-1:
    filecounter = 0
  else:
    filecounter = filecounter +1
  while (allfiles[filecounter].endswith('_review.json')):
    filecounter = filecounter + 1
    if filecounter >= len(allfiles):
      filecounter = 0
  if (allfiles[filecounter].endswith('.json')):
            with open(path+"/"+allfiles[filecounter]) as data_file:
                # print (filename  + str(len(currentjson)))
                # movie = json.load(data_file)
                # if currentjson:
                    # currentjson=currentjson+","+add_document(movie)
                # else:
                    # currentjson=add_document(movie)
                # if (len(currentjson)>(150*1024*1024)):
                    # New batch request
                    # batchPush(currentjson)
                    # currentjson=""
                try:
                    movie = json.load(data_file)
                    return movie
                except Exception as ex:
                    print("Error"+str(ex))
                    return ""
                # input ('Geef door')


def add_document(movie, mcountry, mcity, mregion, mlat, mlon, counter):

    # Use username as unique identifier
    meta = dict()
    body = ""
    document_id = ""

    # We have a normal movie
    document_id = 'https://www.themoviedb.org/movie/' + str(movie['id'])+'/'+str(counter)
    mydoc = Document(document_id)
    # Set the fileextension
    mydoc.FileExtension = ".html"
    # alt titles
    alttitles = ""
    for alttitle in movie['alternative_titles']['titles']:
        alttitles = alttitles+alttitle['title']+"<BR>"

    # countries
    countries = ""
    firstcountry = ""
    first = True
    for country in movie['production_countries']:
        countries = countries+country['name']+";"
        if first:
            firstcountry = country['iso_3166_1']
            first = False
    # keywords
    keywords = ""
    for keyword in movie['keywords']['keywords']:
        keywords = keywords+keyword['name']+" - "
    # genre
    genres = ""
    for genre in movie['genres']:
        genres = genres+genre['name'].title()+";"
    # cast
    allpeople = ""
    casts = ""
    castsfull = ""
    for cast in movie['credits']['cast']:
        character = cast['character']
        character = character.lower().replace(' and ', ' & ')
        character = character.title()
        casts = casts+character+";"
        # if character:
          # casts=casts+cast['name']+" as "+cast['character']+";"
        # else:
          # casts=casts+cast['name']+";"
        if allpeople.find(cast['name']) == -1:
            allpeople = allpeople+cast['name']+';'
        if (cast['profile_path']):
            castsfull = castsfull+"<li class='cast'><img class='castimg' src='https://image.tmdb.org/t/p/w66_and_h66_bestv2" + \
                cast['profile_path']+"'><div class='info'><b>"+ \
                    cast['name']+"</b><br>"+character+"<br></div></li>"
        else:
            castsfull = castsfull+"<li class='cast'><div class='noimage'></div><div class='info'><b>" + \
                cast['name']+"</b><br>"+character+"<br></div></li>"
    if castsfull:
        castsfull = "<ol class='castlist'>"+castsfull+"</ol>"
    # crews
    crews = ""
    crewsfull = ""
    for crew in movie['credits']['crew']:
        if allpeople.find(crew['name']) == -1:
            allpeople = allpeople+crew['name']+';'
        crews = crews+crew['name']+" as "+crew['job']+";"
        if (crew['profile_path']):
            crewsfull = crewsfull+"<li class='cast'><img class='castimg' src='https://image.tmdb.org/t/p/w66_and_h66_bestv2" + \
                crew['profile_path']+"'><div class='info'><b>"+ \
                    crew['name']+"</b><br>"+crew['job']+"<br></div></li>"
        else:
            crewsfull = crewsfull+"<li class='cast'><div class='noimage'></div><div class='info'><b>" + \
                crew['name']+"</b><br>"+crew['job']+"<br></div></li>"
    if crewsfull:
        crewsfull = "<ol class='castlist'>"+crewsfull+"</ol>"
    # spoken
    spoken = ""
    for spoke in movie['spoken_languages']:
        spoken = spoken+spoke['name']+";"

    # add to completions
    try:
        year = int(movie["release_date"].split('-')[0])
    except:
        year = 0
    
    relatedartist = ""
    relatedsongs = ""
    if movie['popularity'] == 1e-06:
        movie['popularity'] = 0

    # Build up the quickview/preview (HTML)
    content = "<html><head><meta charset='UTF-16'><meta http-equiv='Content-Type' content='text/html; charset=UTF-16'>"
    content = content + "</head>"
    # content = content+ "<title>"+movie['title']+"    ("+movie["release_date"].split('-')[0]+")</title>"
    content = content + "<title>"+movie['title']+" ("+mcity+")</title>"
    content = content + "<body>"
    content = content + "<style>body {    -ms-overflow-style: -ms-autohiding-scrollbar;    background-color: #f4f4f4;    color: #000;    font-family: 'Source Sans Pro', Arial, sans-serif;    font-size: 1em;    -webkit-font-smoothing: antialiased;    -moz-osx-font-smoothing: grayscale;}"
    content = content + \
        " .header { width: 100%;  position: relative;  z-index: 1;box-sizing:box}"
    content = content + \
        " .imageblock { display: inline-flex; background-image: radial-gradient(circle at 20% 50%, rgba(11.76%, 15.29%, 17.25%, 0.98) 0%, rgba(11.76%, 15.29%, 17.25%, 0.88) 100%);}"
    if movie['backdrop_path']:
        content = content + " .header:before {        content: '';        position: absolute;        left: 0;        right: 0;     height:100%;   width: 100%;        z-index: -1;        display: block;        filter: opacity(100) grayscale(100%) contrast(130%);        background-size: cover;        background-repeat: no-repeat;        background-position: 50% 50%;        background-image: url('https://image.tmdb.org/t/p/w1400_and_h450_bestv2"+movie[
            'backdrop_path']+"');        will-change: opacity;        transition: filter 1s;      }"
        meta["mybackdrop"] = movie['backdrop_path']
    content = content + \
        " .image { padding-left:20px;padding-bottom:20px;padding-top:40px;display: block;  width: 300px; height: 450px; position: relative;   z-index: 2;}"
    content = content + \
        " .imageimg {-webkit-box-shadow: 0px 0px 5px 2px rgba(255,255,255,1);-moz-box-shadow: 0px 0px 5px 2px rgba(255,255,255,1);box-shadow: 0px 0px 5px 2px rgba(255,255,255,1); display: block;    width: 300px;    height: 450px;       border-radius: 4px;}"
    content = content + \
        " .side {padding-top:40px;padding-bottom:40px;margin-left: 15px; color: #ffffff; }"
    content = content + " .noimage {width: 66px;    height: 66px;    line-height: 66px;    font-size: 33px;    display: inline-block;    font-family: 'Arial';    text-align: center;    background-color: #dbdbdb;    color: #b5b5b5;    box-sizing: border-box;    font-size: 1em;    border-radius: 4px;    border: 1px solid #d7d7d7;}"
    content = content + " .noimage:before { content: \"X\";}"
    content = content + \
        " .castlist {    list-style-type: none;    list-style-position: outside;      margin: 0;    display: flex;    flex-wrap: wrap;    justify-content: flex-start;}"
    content = content + \
        " .castimg {  box-sizing: border-box; line-height: 66px;    font-size: 33px; display:inline-block; width: 66px;    height: 66px;    border-radius: 4px;-webkit-box-shadow: 2px 2px 3px 1px rgba(128,119,128,1);-moz-box-shadow: 2px 2px 3px 1px rgba(128,119,128,1);box-shadow: 2px 2px 3px 1px rgba(128,119,128,1);}"
    content = content + " .cast {  width: 25%;padding-bottom:10px; }"
    content = content + \
        " div.info {     display: block;  width:60%;  align-items: center;  padding-top:5px;  padding-left: 14px;    padding-right: 20px;    }"
    content = content + \
        " div.title h2 {margin: 0;   padding: 0;    font-size: 2.4em;    line-height: 1.1em;    font-weight: 700;    display: inline-block;}"
    content = content + \
        " .year {  padding-left:10px; opacity: 0.6;  font-size: 1.7em;   font-weight: 400;}"
    content = content + " div.title { width: 100%; margin-bottom: 30px;}"
    content = content + " div.header_info {  width: 100%;}"
    content = content + \
        " h3 {  font-weight: 600; line-height: 1.3em; font-size: 1.3em;  margin-bottom: 8px;}"
    content = content + \
        " p.over { font-size: 1em;  line-height: 1.4em;-webkit-margin-before: 0.2em !important;}"
    content = content + " </style>"
    content = content + "<div class='header'>"
    content = content + "<div class='imageblock'><div class='image'>"
    if (movie['poster_path']):
        content = content + " <img class='imageimg' src='https://image.tmdb.org/t/p/w300_and_h450_bestv2" + \
            movie['poster_path']+"'>"
    content = content + "</div><div class='side'><div class='title'><h2 style='display:inline-block'>" + \
        movie["title"]+"</h2><span class='year'>("+movie["release_date"].split('-')[
                                                  0]+")</span></div>"
    content = content + "<div class='header_info'><h3>Overview</h3></div>"
    content = content + "<div><p class='over'>" + \
        movie["overview"]+"</p></div>"
    content = content + "<div class='header_info'><h3>Other titles</h3></div>"
    content = content + "<div><p class='over'>" + \
        movie["original_title"]+"</p></div>"
    if (movie["tagline"]):
        content = content + "<div class='header_info'><h3>Tagline</h3></div>"
        content = content + "<div><p class='over'>" + \
            movie["tagline"]+"</p></div>"
    content = content + "</div></div></div>"  # Sidepanel#Imageblock
    content = content + "<div class='header_info'><h3>Cast</h3></div>"
    content = content + "<div>"+castsfull+"</div>"
    content = content + " <div class='header_info'><h3>Featured Crew</h3></div>"
    content = content + "<div>"+crewsfull+"</div>"
    if 'relatedartist' in movie:
        if (movie["relatedartist"]):
            relatedartist = movie["relatedartist"]
            relatedsongs = movie["relatedsongs"]
            content = content + "<div class='header_info'><h3>Soundtrack</h3></div>"
            content = content + "<div><p class='over'>Artists: " + \
                html.unescape(movie["relatedartist"]).replace(";", " - ")
            content = content + "<br>Songs: " + \
                html.unescape(movie["relatedsongs"]).replace(
                    ";", " - ")+"</p></div>"

    content = content + "<div class='header_info'><h3>Other info</h3></div>"
    content = content + "<div><p class='over'>Status: "+movie["status"]
    content = content + "<br>Release date: "+movie["release_date"]
    content = content + "<br>Budget: "+'${:0,.2f}'.format(movie["budget"])
    content = content + "<br>Revenue: " + \
        '${:0,.2f}'.format(movie["revenue"])
    content = content + "<br>Profit: " + \
        '${:0,.2f}'.format(movie["revenue"]-movie["budget"])
    content = content + "<br>Popularity: "+str(int(movie["popularity"]))
    content = content + "<br>Spoken languages: " + \
        spoken[:-1].replace(";", ' - ')
    content = content + "<br>Genres: "+genres[:-1].replace(";", ' - ')
    content = content + "<br>Keywords: " + \
        html.unescape(keywords[:-1]).replace(";", " - ")+"</p></div>"

    if 'mysentimentvalue' in movie:
        content = content + \
            "<div class='header_info'><h3>Sentiment (by MeaningCloud) on Reviews</h3></div>"
        content = content + "<div><p class='over'>Sentiment: " + \
            movie["mysentimentvalue"]
        content = content + "<br>Agreement: "+movie["mysentimentagree"]
        content = content + "<br>Subjectivity: "+movie["mysentimentsubj"]
        content = content + "<br>Irony: " + \
            movie["mysentimentirony"]+"</p></div>"
        # content = content + "<br>Based upon:<br><p style='font-size:30%;'>"+movie["allreviews"]+"</p>"

    content = content + "</body></html>"

    # Geocode

    body = ""
    # For reviews
    containsattachment = ""
    if (movie["allreviews"]):
        containsattachment = True
    mydoc.SetContentAndZLibCompress(content)
    meta["connectortype"] = "Push"
    meta["mytype"] = "Movie"
    meta["myimage"] = movie["poster_path"]
    meta["mycountry"] = mcountry
    meta["mycity"] = mcity
    meta["myrevenue"] = movie["revenue"]
    meta["containsattachment"] = containsattachment
    meta["mygenre"] = html.unescape(genres)
    meta["myvotecount"] = movie["vote_count"]
    meta["language"] = "English"
    meta["mystatus"] = movie["status"]
    meta["myrelatedartist"] = html.unescape(relatedartist)
    meta["myrelatedsongs"] = html.unescape(relatedsongs)
    meta["myspokenlang"] = html.unescape(spoken)
    meta["mypeople"] = html.unescape(allpeople)
    meta["mycast"] = html.unescape(casts)
    meta["mycrews"] = crews
    if "imdb_id" in movie:
        meta["myimdb"] = movie["imdb_id"]
    meta["myreviews"] = movie["allreviews"]
    meta["mypopularity"] = int(movie["popularity"])
    meta["myvoteaverage"] = movie["vote_average"]
    meta["mybudget"] = movie["budget"]
    myprofitvalue = 0
    myprofit = movie["revenue"]-movie["budget"]
    # this could mess up the ranking big time
    myprofitvalue = myprofit/1000000
    if (myprofitvalue > 1000):
        myprofitvalue = 1000
    meta["myprofit"] = myprofit
    meta["myprofitvalue"] = myprofitvalue
    meta["title"] = movie["title"]+' ('+mcity+')'
    # meta["topparentid"]= movie['id']
    mydoc.ClickableUri = 'https://www.themoviedb.org/movie/' + str(movie['id'])
    meta["myid"] = movie['id']
    meta["myvid"] = str(movie['id'])
    meta["myids"] = str(movie['id'])
    mydoc.Date = movie['release_date']

    # sentiment
    if 'mysentimentvalue' in movie:
        meta["mysentimentvalue"] = movie["mysentimentvalue"]
        meta["mysentimentagree"] = movie["mysentimentagree"]
        meta["mysentimentsubj"] = movie["mysentimentsubj"]
        meta["mysentimentirony"] = movie["mysentimentirony"]
        sentval = 0
        addval = 0
        if (movie['mysentimentvalue'] == "Strong Positive"):
            sentval = 2
            addval = -1
        if (movie["mysentimentvalue"] == "Positive"):
            sentval = 1
            addval = -1
        if (movie["mysentimentvalue"] == "Neutral"):
            sentval = 0
            addval = 0
        if (movie["mysentimentvalue"] == "Negative"):
            sentval = -1
            addval = 1
        if (movie["mysentimentvalue"] == "Strong Negative"):
            sentval = -2
            addval = 1
        if (movie['mysentimentagree'] == "Disagreement"):
            sentval = sentval+addval
        if (movie['mysentimentagree'] == "Agreement"):
            sentval = sentval-addval
        if (movie['mysentimentsubj'] == "Subjective"):
            sentval = sentval+addval
        if (movie['mysentimentsubj'] == "Objective"):
            sentval = sentval-addval
        if (movie['mysentimentirony'] == "Ironic"):
            sentval = sentval-addval
        if (movie['mysentimentirony'] == "Non-Ironic"):
            sentval = sentval+addval
        meta["mysentimentnumber"] = sentval

    if (lat != -999):
        meta["mylon"] = mlon
        meta["mylat"] = mlat
    for key in meta:
      mydoc.AddMetadata(key, meta[key])
    return mydoc


push = CoveoPush.Push(sourceId, orgId, apiKey)
push.SetSizeMaxRequest(50*1024*1024)
push.Start(True, True)

startWith = 1
counter = 1
filecounter = 1
path=u"D:\MovieDemo\outputGeo"
allfiles = os.listdir(path)
fail =1
with open('worldcitiespop.txt',encoding='cp1252') as f:
    myline = f.readline()
    # skip first
    myline = f.readline()
    line = myline.split(',')
    print(line)
    while myline:
        if counter < startWith:
            counter = counter + 1
            myline = f.readline()
            print(str(counter)+":SKIPPING:"+(myline))
        else:
            # Country,City,AccentCity,Region,Population,Latitude,Longitude
            #   0      1     2          3      4              5   6
            try:
              if (len(line)>=6):
                country = line[0]
                city = line[2]
                region = line[3]
                lat = line[5]
                lon = line[6]
                # 5 movies per location
                # Not anymore, simply 1
                # for i in range(5):
                movie = getnextmovie(path, allfiles)
                if (movie!=""):
                  mydoc = add_document(movie, country, city, region, lat, lon, counter)
                  lat = str(float(lat) + 0.0000260)
                  lon = str(float(lon)  -0.0002560)


                  push.Add(mydoc)
                      #counter = counter + 1
              else:
                fail = fail + 1
            except:
              print ("Erorr")
              fail = fail + 1
              myline = "a"
            try:
              myline = f.readline()
            except:
              print ("Erorr")
              fail = fail + 1
              myline = "a"
            line = myline.split(',')
            counter = counter + 1
            print(str(counter)+"/"+str(fail)+"=>")
            print (line)
            #if (counter > 135):
            #    break

push.End(True, True)
