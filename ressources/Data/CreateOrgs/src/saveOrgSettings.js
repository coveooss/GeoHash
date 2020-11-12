module.exports = function saveOrgSettings (name, orgSettings) {
  const fs = require('fs');

  fs.writeFile('./orgSetting_'+name+'.json', JSON.stringify(orgSettings), (err) => {
    if (err) {
      console.log("Error while saving the settings file: " + err);
    }
  })
}