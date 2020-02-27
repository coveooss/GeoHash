countries=[]
countries.append({'city':'London','mylat':51.514125,'mylon':-.093689})
countries.append({'city':'Montreal','mylat':45.5,'mylon':-73.583333})
countries.append({'city':'Amsterdam','mylat':52.35,'mylon':4.916667})
countries.append({'city':'Paris','mylat':48.866667,'mylon':2.333333})
countries.append({'city':'Quebec','mylat':46.8,'mylon':-71.25})
countries.append({'city':'Sydney','mylat':-33.861481,'mylon':151.205475})
countries.append({'city':'Barcelona','mylat':41.398371,'mylon':2.1741})
countries.append({'city':'San Francisco','mylat':37.7750000,'mylon':-122.4183333})
countries.append({'city':'New York','mylat':40.7141667,'mylon':-74.0063889})
countries.append({'city':'Copenhagen','mylat':55.666667,'mylon':12.583333})
countries.append({'city':'Chicago','mylat':41.8500000,'mylon':-87.6500000})
countries.append({'city':'Prague','mylat':50.083333,'mylon':14.466667})
countries.append({'city':'Denver','mylat':39.7391667,'mylon':-104.9841667})
countries.append({'city':'Seattle','mylat':47.6063889,'mylon':-122.3308333})
countries.append({'city':'Vancouver','mylat':49.25,'mylon':-123.133333})
countries.append({'city':'Austin','mylat':30.2669444,'mylon':-97.7427778})
countries.append({'city':'Fort Lauderdale','mylat':26.1219444,'mylon':-80.1436111})

def getLat(countries, city):
  for row in countries:
    #print row
    if row['city'].upper()==city.upper():
        print ('Found City '+city)
        return row['mylat'],row['mylon']

result=getLat(countries,'London')
if (result):
  print (result)
else:
  print ("Not found")

