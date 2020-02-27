//**********************************************************************
// Create Orgs for GeoHash demo
//**********************************************************************

// Global Vars
//   Api Key (With Admin rights)
var apiKeyToUse = '***';
//   Environment
var envToUse = 'DEV';

const fs = require('fs');

const Coveo = require('./src/Coveo');
const saveOrgSettings = require('./src/saveOrgSettings');

const fieldsToPush = require('./config/fields');
const sourcesToCreate = require('./config/source');
const apiKeyToCreate = require('./config/apikey');
const searchApiKeyToCreate = require('./config/searchApikey');

let orgSettings = [];

async function createOrg(name) {
  try {
    debug('\nCreating org #', name);
    debug('Org Name: ', `\x1b[31m${name}\x1b[0m`);
    let settings={
      env: envToUse,
      apiKey: apiKeyToUse
    };

    const createOrgResponse = await Coveo.createOrganization(settings, name);
    let currentOrgId = JSON.parse(createOrgResponse.body).id;

    // \x1b[33m and \x1b[0m are escape codes "to change text color to yellow" and "Reset" respectively.
    // See https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color for more details.
    const orgDebugLabel = `\x1b[33m${currentOrgId}\x1b[0m`;

    debug('Created org', orgDebugLabel);

    let currentOrgSettings = {
      orgId: currentOrgId,
      apiKey: "",
      apiKeyForServer: "",
      apiKeyForAttackers: "",
      sourceId: "",
      env: settings.env
    };

    orgSettings.push(currentOrgSettings);

    debug('Creating API Key for Server', orgDebugLabel);
    const apiKeyResponse = await Coveo.createApiKey(currentOrgSettings, settings.apiKey, apiKeyToCreate);
    debug('Created API Key for Server', orgDebugLabel);
    currentOrgSettings.apiKey = apiKeyToUse;
    debug('Pushing Fields', orgDebugLabel);
    await Coveo.pushFields(currentOrgSettings, fieldsToPush);
    debug('Pushed Fields', orgDebugLabel);

    saveOrgSettings(name, currentOrgSettings);

  } catch (e) {
    console.log(e, e && e.name, e && e.detail);
  }
}

function debug() {
  if (true) { // use false to remove debug mode
    console.log.apply(console, arguments);
  }
}

createOrg('GeoHashDemo');
