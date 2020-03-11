import random
import datetime
import decimal
# Now lets add the random Availability
# We could get this also from the database, but this is a demo so we create it 
#----------------------------------------------------------
#Initialize, 3 months back, 3 years further
#----------------------------------------------------------
#Field to store the availability in
log("AddAvail")
alldatesfield="mydateavail"
alldates=""
Date=datetime.datetime.now()
currenthours=random.randint(0,40)

dateBegin=Date+datetime.timedelta(days=-50)
dateEnd=Date+datetime.timedelta(days=3*365)
dateBeginP=Date+datetime.timedelta(days=10+currenthours)
dateEndP=Date+datetime.timedelta(days=10+currenthours+15)
dateBeginP2=Date+datetime.timedelta(days=60+currenthours)
dateEndP2=Date+datetime.timedelta(days=90+currenthours)
currenthours=random.randint(1,6)
#print dateBegin
#print dateEnd
#Put all dates by day into a string
tot=(dateEnd-dateBegin).days

#print 'Total nr of days:'+str(tot)
for i in range( 0,tot):
  thisdate2=dateBegin+datetime.timedelta(days=i)
  #currenthours=random.randint(0,8)
  hours=0
  if (thisdate2.month % currenthours)==0:
    hours=8

    #if ((thisdate2-dateBeginP).days>0 and (thisdate2-dateEndP).days<0):
    #   hours=8
    #if ((thisdate2-dateBeginP2).days>0 and (thisdate2-dateEndP2).days<0):
    #    hours=8
    if (hours>3):
      alldates=alldates+";"+str(thisdate2.year)+str(thisdate2.month).zfill(2)+str(thisdate2.day).zfill(2)

      #print (alldates)
document.add_meta_data({alldatesfield:alldates})