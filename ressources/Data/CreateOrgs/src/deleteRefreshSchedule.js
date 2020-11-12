module.exports = function deleteRefreshSchedule(settings, sourceId) {
  return new Promise (function (resolve, reject) {
    const callApi = require('./callApi');
    const utils = require('./utils');
    let getScheduleUrl = utils.setAppropriateEnv('https://platform.cloud.coveo.com/rest/organizations/' + settings.orgId + '/sources/' + sourceId + '/schedules', settings.env);
    let getScheduleOptions = {
      url: getScheduleUrl,
      method: "GET",
      headers: {
        "Authorization": "Bearer " + settings.apiKey,
        "Content-type": "application/json"
      }
    }
    callApi(getScheduleOptions, '').then(getScheduleResponse => {
      if (getScheduleResponse.response.statusCode != 200) {
        reject('[get schedule] ' + getScheduleResponse.response.statusCode + ' - ' + getScheduleResponse.body);
      } else {
        let scheduleId = JSON.parse(getScheduleResponse.body)[0].id;

        setScheduleUrl = utils.setAppropriateEnv('https://platform.cloud.coveo.com/rest/organizations/' + settings.orgId + '/sources/' + sourceId + '/schedules/' + scheduleId, settings.env)
        setScheduleOptions = {
          url: setScheduleUrl,
          method: "PUT",
          headers: {
            "Authorization": "Bearer " + settings.apiKey,
            "Content-type": "application/json"
          }
        }
    
        setScheduleBody = JSON.parse(getScheduleResponse.body);
        setScheduleBody[0].enabled = false;

        callApi(setScheduleOptions, setScheduleBody[0]).then(setScheduleResponse => {
          if (setScheduleResponse.response.statusCode != 201) {
            reject('[delete schedule] ' + setScheduleResponse.response.statusCode + ' - ' + setScheduleResponse.body)
          } else {
            resolve(setScheduleResponse);
          }
        }).catch((err) => {console.log('[Deactivate Refresh Schedule] ' + err)})
      }
    }).catch((err) => {
      reject('[Get Schedule Error] ' + err);
    })
  })
}