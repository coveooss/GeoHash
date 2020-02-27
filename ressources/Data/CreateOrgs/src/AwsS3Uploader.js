const crypto = require('crypto');
const request = require('request');

module.exports = class AwsS3Uploader {
  constructor(options) {
    this.awsAccessId = options.awsAccessId;
    this.awsSecretKey = options.awsSecretKey;
  }

  amzDate() {
    const d = new Date();
    return d.toISOString().replace(/-|:/g, '').replace(/\.\d*/g, '');
  }

  hmacSha256(key, text, encoding) {
    return crypto.createHmac('sha256', key).update(text, 'utf8').digest(encoding);
  }

  sha256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  awsSignV4(text, shortDate) {
    const signingKey = this.hmacSha256(this.hmacSha256(this.hmacSha256(this.hmacSha256('AWS4' + this.awsSecretKey, shortDate), 'us-east-1'), 's3'), 'aws4_request');
    const signature = this.hmacSha256(signingKey, text, 'hex');
    return signature;
  }

  putOwnership(s3bucket, orgId) {
    if (!(this.awsAccessId && this.awsSecretKey)) {
      console.log('Missing AWS credentials in "secrets/settings.json"... No coveo-ownership-x.txt file will be added.');
      return;
    }
    const contentSha256 = this.sha256('');
    const isodate = this.amzDate();
    const canonicalRequest = `PUT
/${s3bucket}/coveo-ownership-${orgId}.txt

host:s3.amazonaws.com
x-amz-content-sha256:${contentSha256}
x-amz-date:${isodate}

host;x-amz-content-sha256;x-amz-date
${contentSha256}`;

    const shortDate = isodate.split('T')[0];

    const stringToSign = `AWS4-HMAC-SHA256
${isodate}
${shortDate}/us-east-1/s3/aws4_request
${this.sha256(canonicalRequest)}`;

    const signature = this.awsSignV4(stringToSign, shortDate);
    const Authorization = `AWS4-HMAC-SHA256 Credential=${this.awsAccessId}/${shortDate}/us-east-1/s3/aws4_request,SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=${signature}`;

    request.put(`https://s3.amazonaws.com/${s3bucket}/coveo-ownership-${orgId}.txt`, {
      headers: {
        Authorization,
        'x-amz-date': isodate,
        'x-amz-content-sha256': contentSha256,
      }
    }, (error, response, body) => {
      if ((response && response.statusCode) !== 200) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
      }
    });

  }
};
