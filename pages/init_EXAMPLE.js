document.addEventListener('DOMContentLoaded', function () {
  Coveo.SearchEndpoint.configureCloudV2Endpoint('ORG_ID', 'API_KEY', 'https://platform.cloud.coveo.com/rest/search');
});

var loadJS = function(url){

  var scriptTag = document.createElement('script');
  scriptTag.src = url;

  document.getElementsByTagName("head")[0].appendChild(scriptTag);
};

loadJS('https://maps.googleapis.com/maps/api/js?libraries=geometry&key=GOOGLE_API_KEY');