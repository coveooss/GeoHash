aws s3 cp bin   s3://labs.coveodemo.com/geohash/ --recursive
aws cloudfront create-invalidation --distribution-id E255DU5L8IK1UZ --paths "/" "/*"