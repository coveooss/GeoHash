#!/usr/bin/env python
# -*- coding: utf-8 -*-

#Push the data the Coveo Platform, using the Push SDK
#Ref: https://github.com/coveo-labs/SDK-Push-Python

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

sourceId = 'XXXXX'
orgId = 'XXXX'
apiKey = 'XXXXX'


def checkEmpty(item):
   if item:
     return True
   else:
     return False

def add_document(adres, pc, wpl, gem, prov,opp, bouwjaar, lon, lat, kamers, prijs, counter):
    # Create new push document
    mydoc = Document('https://myreference&id='+str(counter))
    # Build up the quickview/preview (HTML)

    # Set the fileextension
    mydoc.FileExtension = ".html"
    # Set metadata
    if checkEmpty(lat):
      mydoc.AddMetadata("lat", lat)
    if checkEmpty(lon):
      mydoc.AddMetadata("lon", lon)
    if checkEmpty(adres):
      mydoc.AddMetadata("adres", adres)
    if checkEmpty(pc):
      mydoc.AddMetadata("pc", pc)
    if checkEmpty(wpl):
      mydoc.AddMetadata("wpl", wpl)
    if checkEmpty(gem):
      mydoc.AddMetadata("gem", gem)
    if checkEmpty(prov):
      mydoc.AddMetadata("prov", prov)
    if checkEmpty(opp):
      mydoc.AddMetadata("opp", opp)
    if checkEmpty(bouwjaar):
      mydoc.AddMetadata("bouwjaar", bouwjaar)
    if checkEmpty(kamers):
      mydoc.AddMetadata("kamers", kamers)
    if checkEmpty(prijs):
      mydoc.AddMetadata("prijs", prijs)
    mydoc.Title = adres + " in "+wpl

    return mydoc

push = CoveoPush.Push(sourceId, orgId, apiKey)
push.SetSizeMaxRequest(50*1024*1024)
push.Start(True, False)

startWith = 1
counter = 1
with open('..\\Data\\bag-adressen-full-laatst.csv\\bagadres-full.csv',encoding='utf8') as f:
    myline = f.readline()
    line = myline.split(';')
    print (line)
    while myline:
      if counter<startWith:
        counter = counter +1
        myline = f.readline()
        print (str(counter)+":SKIPPING:"+(myline))
      else:
        #openbareruimte;huisnummer;huisletter;huisnummertoevoeging;postcode;woonplaats;gemeente;provincie;nummeraanduiding;verblijfsobjectgebruiksdoel;oppervlakteverblijfsobject;verblijfsobjectstatus;object_id;object_type;nevenadres;pandid;pandstatus;pandbouwjaar;x;  y ;lon;lat
        # 0                  1        2             3                   4      5          6       7          8                       9                          10                       11                12         13           14      15        16          17     18  19  20  21
        #De Ruijterkade;105;;1;1011AB;Amsterdam;Amsterdam;Noord-Holland;0363200000081086;kantoorfunctie;1;Verblijfsobject in gebruik;0363010000964973;VBO;f;0363100012181960;Pand in gebruik;1884;122177;487877;4.90516680992096;52.3777796784077                    
        adres = line[0]+" "+line[1]+" "+line[2]+" "+line[3]
        pc = line[4]
        wpl = line[5]
        gem = line[6]
        prov = line[7]
        opp = line[10]
        bouwjaar = line[17]
        lon = line[20]
        lat = line[21]
        kamers = randint(1, 5)
        prijs = randint(150000, 3500000)
        #print (str(counter)+": "+adres+" - "+str(kamers)+" - "+str(prijs))
        mydoc = add_document(adres, pc, wpl, gem, prov,opp, bouwjaar, lon, lat, kamers, prijs, counter)
        push.Add(mydoc)
        counter = counter +1
        myline = f.readline()
        line = myline.split(';')
        print (str(counter)+":"+(myline))
        #if (counter>15):
        #  break

push.End(True, False)


