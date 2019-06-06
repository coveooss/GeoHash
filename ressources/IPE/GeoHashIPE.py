log('V1')
__base32 = '0123456789bcdefghjkmnpqrstuvwxyz'
__decodemap = { }
for i in range(len(__base32)):
    __decodemap[__base32[i]] = i
del i

def encode(latitude, longitude, precision=12):
    """
    Encode a position given in float arguments latitude, longitude to
    a geohash which will have the character count precision.
    """
    lat_interval, lon_interval = (-90.0, 90.0), (-180.0, 180.0)
    geohash = []
    bits = [ 16, 8, 4, 2, 1 ]
    bit = 0
    ch = 0
    even = True
    while len(geohash) < precision:
        if even:
            mid = (lon_interval[0] + lon_interval[1]) / 2
            if longitude > mid:
                ch |= bits[bit]
                lon_interval = (mid, lon_interval[1])
            else:
                lon_interval = (lon_interval[0], mid)
        else:
            mid = (lat_interval[0] + lat_interval[1]) / 2
            if latitude > mid:
                ch |= bits[bit]
                lat_interval = (mid, lat_interval[1])
            else:
                lat_interval = (lat_interval[0], mid)
        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash += __base32[ch]
            bit = 0
            ch = 0
    return ''.join(geohash)

#lat = 52.3777796784077
#lon = 4.90516680992096
# Get Lat/Lon
lat = float(strip(document.get_meta_data_value('mylat2')[0]))
lon = float(strip(document.get_meta_data_value('mylon2')[0]))

# Calculate Hashes
hash2 = encode(lat, lon, precision=2)
hash3 = encode(lat, lon, precision=3)
hash4 = encode(lat, lon, precision=4)
hash5 = encode(lat, lon, precision=5)
hash6 = encode(lat, lon, precision=6)
hash7 = encode(lat, lon, precision=7)
hash8 = encode(lat, lon, precision=8)

# Add Meta
document.add_meta_data({'geohash2':hash2})
document.add_meta_data({'geohash3':hash3})
document.add_meta_data({'geohash4':hash4})
document.add_meta_data({'geohash5':hash5})
document.add_meta_data({'geohash6':hash6})
document.add_meta_data({'geohash7':hash7})
document.add_meta_data({'geohash8':hash8})