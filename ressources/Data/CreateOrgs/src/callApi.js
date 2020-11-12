module.exports = function callApi(settings, data) {
  /**
   * settings = {
   * url: "http(s)://stuff/path",
   * method: all methods,
   * headers: headers{}
   * }
   *
   * data = {
   * "uri": "--a valid uri--",
   * ... metadata as needed ...
   * }
   */
  return new Promise(function (resolve, reject) {
    let h = null;
    let port = 0;
    if (settings.url.startsWith('https://')) {
      h = require('https');
      port = 443;
    } else if (settings.url.startsWith('http://')) {
      h = require('http');
      port = 8080;
    } else {
      console.error('The given URL is invalid')
    }

    let shortUrl = '';
    let shortUrlWithPath = '';
    let path = '';
    if (port == 443) {
      shortUrlWithPath = settings.url.substring(8);
      shortUrl = shortUrlWithPath.substring(0, shortUrlWithPath.indexOf('/'));
    } else if (port == 8080) {
      shortUrlWithPath = settings.url.substring(7);
      shortUrl = shortUrlWithPath.substring(0, shortUrlWithPath.indexOf('/'));
    }
    if (shortUrlWithPath.indexOf('/') > -1) {
      path = shortUrlWithPath.substring(shortUrlWithPath.indexOf('/'));
    }
    const options = {
      host: shortUrl,
      port: port,
      path: path,
      method: settings.method,
      headers: settings.headers
    }

    const req = h.request(options, (res) => {
      let d = '';
      res.on('data', (chunk) => {
        if (chunk) {
          d += chunk
        }
      });
      res.on('end', () => {
        if (d === 'null') {
          d = null;
        }
        const returnedResponse = {
          response: res,
          body: d
        }
        resolve(returnedResponse);
      })
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      const dataToSend = (typeof data === "string" ? data : JSON.stringify(data));
      req.write(dataToSend);
    }
    req.end();
  })
}
