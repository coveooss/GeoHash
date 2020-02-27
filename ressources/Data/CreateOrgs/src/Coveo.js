/* eslint-disable */
const CoveoError = require('./CoveoError');

module.exports = {
    push(settings, data) {
        /**
         * Settings:
         * {
         *  orgId: 'alexelasticgcp5nshxita',
         *  sourceId: '',
         *  apiKey: '',
         *  env: 'prod'
         * }
         */
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');
            let url = utils.setAppropriateEnv('https://push.cloud.coveo.com' + '/v1/organizations/' + settings.orgId + '/sources/' + settings.sourceId + '/documents?documentId=' + data.uri, settings.env);

            let options = {
                url: url,
                method: 'PUT',
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": "Bearer " + settings.apiKey
                }
            };

            callApi(options, data).then(response => {
                if (response.response.statusCode != 202) {
                    reject(response.response.statusCode + ' - ' + response.body);
                }
                resolve(response);
            }).catch((err) => {
                reject(err);
            })
        });
    },
    delete(settings, data) {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');
            let url = utils.setAppropriateEnv('https://push.cloud.coveo.com/v1/organizations/' + settings.orgId + '/sources/' + settings.sourceId + '/documents?documentId=' + data.uri, settings.env);

            let options = {
                url: url,
                method: 'DELETE',
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": "Bearer " + settings.apiKey
                }
            };

            callApi(options, data).then(response => {
                if (response.response.statusCode != 202) {
                    reject(response.response.statusCode + ' - ' + response.body);
                } else {
                    resolve(response);
                }
            }).catch((err) => {
                reject(err);
            })
        });
    },
    search(settings, data) {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');
            let url = utils.setAppropriateEnv('https://platform.cloud.coveo.com/rest/search/v2/?organizationId=' + settings.orgId, settings.env);

            let options = {
                url: url,
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": "Bearer " + settings.apiKey
                }
            }

            callApi(options, data).then(results => {
                if (results.response.statusCode != 200) {
                    reject(results.response.statusCode + ' - ' + results.body);
                } else {
                    resolve(JSON.parse(results.body));
                }
            }).catch((err) => {
                reject(err);
            })
        })
    },
    pushBatch(settings, data) {
        const callApi = require('./callApi');
        const utils = require('./utils');

        const formattedData = [];
        data.forEach(item => {
            item['documentId'] = item.uri;
            if (!item.compressedBinaryData) {
                if (!item.data) {
                    if (item.body) {
                        item['data'] = item.body;
                    } else {
                        item['data'] = '';
                    }
                }
            }
            formattedData.push(item);
        });
        const amazonReadyData = {
            "addOrUpdate": formattedData,
            "delete": []
        }

        return new Promise(function (resolve, reject) {
            let url = utils.setAppropriateEnv('https://push.cloud.coveo.com/v1/organizations/' + settings.orgId + '/files', settings.env);

            let amazonOptions = {
                url: url,
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": "Bearer " + settings.apiKey
                }
            }

            callApi(amazonOptions).then(amazonResponse => {
                let amazonUploadUrl = JSON.parse(amazonResponse.body).uploadUri;
                let amazonUploadHeaders = JSON.parse(amazonResponse.body).requiredHeaders;
                amazonUploadHeaders['Content-Length'] = JSON.stringify(amazonReadyData).length;
                let pushUploadOptions = {
                    url: amazonUploadUrl,
                    method: 'PUT',
                    headers: amazonUploadHeaders
                }
                callApi(pushUploadOptions, amazonReadyData).then(res => {
                    let finalPushUrl = utils.setAppropriateEnv("https://push.cloud.coveo.com/v1/organizations/" + settings.orgId + "/sources/" + settings.sourceId + "/documents/batch?fileId=" + JSON.parse(amazonResponse.body).fileId, settings.env);

                    let finalPushOptions = {
                        url: finalPushUrl,
                        method: 'PUT',
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                            "Authorization": "Bearer " + settings.apiKey
                        }
                    }
                    callApi(finalPushOptions).then(pushResponse => {
                        resolve(pushResponse);
                    }).catch((err) => {
                        reject("An error occurred while pushing the data to Coveo Cloud: " + err)
                    })
                }).catch((err) => {
                    reject("An error occurred while pushing the data to Amazon S3: " + err)
                })
            }).catch((err) => {
                reject("An error occurred while creating a file container in Coveo Cloud: " + err);
            })
        });
    },
    pushFields(settings, data) {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');
            let url = utils.setAppropriateEnv("https://platform.cloud.coveo.com/rest/organizations/" + settings.orgId + "/indexes/fields/batch/create", settings.env);

            const options = {
                url: url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + settings.apiKey
                }
            }
            callApi(options, data).then(response => {
                if (response.response.statusCode == 204) {
                    resolve(response);
                } else {
                    let parsedBody = JSON.parse(response.body);
                    if (parsedBody.errorCode && parsedBody.message) {
                        reject(parsedBody.errorCode + ' (' + response.response.statusCode + '): ' + parsedBody.message);
                    } else {
                        reject(response.response.statusCode + ' ' + response.body);
                    }
                }
            })
        })
    },
    createPushSource(settings, name = '') {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');

            if (name == '') {
                name = 'Push'
            }

            const data = {
                "sourceType": "PUSH",
                "name": name,
                "sourceVisibility": "SHARED",
                "pushEnabled": true
            }

            let url = utils.setAppropriateEnv('https://platform.cloud.coveo.com/rest/organizations/' + settings.orgId + '/sources', settings.env);

            const options = {
                url: url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + settings.apiKey
                }
            }

            callApi(options, data).then(response => {
                if (response.response.statusCode == 201) {
                    resolve(response);
                } else {
                    let parsedBody = JSON.parse(response.body);
                    if (parsedBody.errorCode && parsedBody.message) {
                        reject(new CoveoError(parsedBody.errorCode + ' (' + response.response.statusCode + '): ' + parsedBody.message, '[Create Push Source]'));
                    } else {
                        reject(new CoveoError(response.response.statusCode + ' ' + response.body, '[Create Push Source]'));
                    }
                }
            }).catch((err) => {
                reject(new CoveoError(err, '[Create Push Source]'));
            })
        })
    },
    createOrganization(settings, name = 'coveo', template = '') {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');

            let url = utils.setAppropriateEnv('https://platform.cloud.coveo.com/rest/organizations?name=' + encodeURIComponent(name), settings.env);

            if (template != '') {
                url = url + '&organizationTemplate=' + template;
            }

            let options = {
                url: url,
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + settings.apiKey
                }
            }
            callApi(options, '').then(response => {
                if (response.response.statusCode == 201) {
                    resolve(response);
                } else {
                    let parsedBody = JSON.parse(response.body);
                    if (parsedBody.errorCode && parsedBody.message) {
                        reject(parsedBody.errorCode + ' (' + response.response.statusCode + '): ' + parsedBody.message);
                    } else {
                        reject(response.response.statusCode + ' ' + response.body);
                    }
                }
            }).catch((err) => {
                reject(new CoveoError(err, '[Org Creation]'));
            })
        })
    },
    createSearchPage(settings, name, title, html) {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');

            const url = utils.setAppropriateEnv('https://platform.cloud.coveo.com/rest/organizations/' + settings.orgId + '/pages/', settings.env);

            const options = {
                url: url,
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + settings.apiKey
                }
            };

            const page = {
                name,
                title: title || name
            };

            callApi(options, page).then(response => {
                if (response.response.statusCode != 201) {
                    reject(response.response.statusCode + ' - ' + response.body)
                } else {

                    // Init search page
                    const options = {
                        url: utils.setAppropriateEnv(`https://search.cloud.coveo.com/pages/${settings.orgId}/${name}?repo=All`, settings.env),
                        method: 'PUT',
                        headers: {
                            'Authorization': 'Bearer ' + settings.apiKey,
                        }
                    };
                    callApi(options, page).then(response => {

                        // Update Search page using file 'search-page.html', didn't work if not initialized first.
                        const options = {
                            url: utils.setAppropriateEnv(`https://search.cloud.coveo.com/pages/${settings.orgId}/${name}`, settings.env),
                            method: 'POST',
                            headers: {
                                'Authorization': 'Bearer ' + settings.apiKey,
                                'Content-Type': 'text/html; charset=UTF-8',
                            }
                        }
                        callApi(options, html)
                            .then(resolve)
                            .catch((err) => {
                                reject('[Search Page Update] ' + err);
                            });
                    }).catch((err) => {
                        reject('[Search Page Init] ' + err);
                    });
                }
            }).catch((err) => {
                reject('[Search Page Creation] ' + err);
            });
        });
    },
    createQueryPipeline(settings, name, pipelineInformation) {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');
            if (!pipelineInformation) {
                pipelineInformation = {
                    name: name
                };
            }

            let url = utils.setAppropriateEnv('https://platform.cloud.coveo.com/rest/search/v1/admin/pipelines?organizationId=' + settings.orgId, settings.env);
            let options = {
                url: url,
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + settings.apiKey
                }
            };

            callApi(options, pipelineInformation).then(response => {
                if (response.response.statusCode != 200) {
                    reject(response.response.statusCode + " - " + response.body);
                } else {
                    resolve(response);
                }
            }).catch((err) => {
                reject(new CoveoError(err, '[Query Pipeline Creation]'));
            });
        });
    },
    createExtension(settings, code, name = 'extension', model) {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');

            if (!model) {
                model = {
                    content: code,
                    name: name
                }
            }
            let url = utils.setAppropriateEnv('https://platform.cloud.coveo.com/rest/organizations/' + settings.orgId + '/extensions', settings.env);
            let options = {
                url: url,
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + settings.apiKey,
                    'Content-Type': 'application/json'
                }
            }

            callApi(options, model).then(response => {
                if (response.response.statusCode != 201) {
                    reject(new CoveoError(response.response.statusCode + ' - ' + response.body, '[IPE]'));
                } else {
                    resolve(response);
                }
            }).catch((err) => {
                reject(new CoveoError(err, '[IPE]'));
            })
        })
    },
    addExtensionToSource(settings, extensionId, isPreConversion, extension) {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');

            let url = utils.setAppropriateEnv('https://platform.cloud.coveo.com/rest/organizations/' + settings.orgId + '/sources/' + settings.extSourceId + '/extensions', settings.env);
            let options = {
                url: url,
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + settings.apiKey,
                    'Content-Type': 'application/json'
                }
            }

            if (!extension) {
                extension = {
                    "common": {
                        [isPreConversion ? "preConversionExtensions" : "postConversionExtensions"]: [{
                            "actionOnError": "REJECT_DOCUMENT",
                            "extensionId": extensionId
                        }]
                    }
                }
            }

            callApi(options, extension).then(response => {
                if (response.response.statusCode != 201 && response.response.statusCode != 204) {
                    reject(response.response.statusCode + ' - ' + response.body);
                } else {
                    resolve(response);
                }
            }).catch((err) => {
                reject(err);
            })
        })
    },
    addSource(settings, sourceType, name, urls, fullSchema) {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');
            let sourceSchema = require('./sourceschema');

            if (typeof urls == "string" && !Array.isArray(urls)) {
                urls = urls.split();
            }

            url = utils.setAppropriateEnv("https://platform.cloud.coveo.com/rest/organizations/" + settings.orgId + "/sources", settings.env);

            let options = {
                url: url,
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + settings.apiKey,
                    'Content-Type': 'application/json'
                }
            }

            if (!fullSchema) {
                fullSchema = sourceSchema;
                fullSchema.sourceType = sourceType;
                fullSchema.name = name;
                fullSchema.urls = urls;
            }

            callApi(options, fullSchema).then(response => {
                if (response.response.statusCode != 201) {
                    reject(new CoveoError(response.response.statusCode + ' - ' + response.body, '[Web Source]'));
                } else {
                    resolve(response);
                }
            }).catch((err) => {
                reject(new CoveoError(err, '[Web Source]'));
            })
        })
    },
    setElasticsearchIndex(settings, elasticsearchSchema) {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');

            let getIndexOptions = {
                url: utils.setAppropriateEnv("https://platform.cloud.coveo.com/rest/organizations/" + settings.orgId + "/indexes", settings.env),
                method: "GET",
                headers: {
                    'Authorization': 'Bearer ' + settings.apiKey
                }
            }

            callApi(getIndexOptions, "").then(getIndexResponse => {
                if (getIndexResponse.response.statusCode != 200) {
                    reject('[Get Index Id] ' + getIndexResponse.response.statusCode + " - " + getIndexResponse.body);
                } else {
                    const indexId = JSON.parse(getIndexResponse.body)[0].id;

                    let indexCreateOptions = {
                        url: utils.setAppropriateEnv("https://platform.cloud.coveo.com/rest/organizations/" + settings.orgId + "/indexes/" + indexId + "/configuration", settings.env),
                        method: "PUT",
                        headers: {
                            "Authorization": "Bearer " + settings.apiKey,
                            "Content-type": "application/json"
                        }
                    }

                    callApi(indexCreateOptions, elasticsearchSchema).then(elasticsearchResponse => {
                        if (elasticsearchResponse.response.statusCode != 200) {
                            reject('[Set Index Id] ' + elasticsearchResponse.response.statusCode + " - " + elasticsearchResponse.body);
                        } else {
                            resolve(elasticsearchResponse)
                        }
                    }).catch((err) => {
                        console.log("Error setting the index: " + err)
                    })
                }
            }).catch((err) => {
                reject("Error fetching the index: " + err);
            })
        })
    },
    createApiKey(settings, apiKey, apiKeySchema) {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');

            let options = {
                url: utils.setAppropriateEnv("https://platform.cloud.coveo.com/rest/organizations/" + settings.orgId + "/apikeys", settings.env),
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Authorization": "Bearer " + apiKey,
                    "Content-type": "application/json"
                }
            };

            callApi(options, apiKeySchema).then(response => {
                if (response.response.statusCode != 201) {
                    reject(new CoveoError(response.response.statusCode + ' - ' + response.body, 'createApiKey'));
                } else {
                    resolve(response);
                }
            }).catch((err) => {
                reject(new CoveoError(err, '[API Key Creation]'));
            });
        });
    },
    inviteMemberAsAdmin(settings, member, sendEmail = false) {
        return new Promise(function (resolve, reject) {
            const callApi = require('./callApi');
            const utils = require('./utils');

            const getGroupIdOptions = {
                url: utils.setAppropriateEnv("https://platform.cloud.coveo.com/rest/organizations/" + settings.orgId + "/groups", settings.env),
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": "Bearer " + settings.apiKey,
                    "Content-type": "application/json"
                }
            }

            callApi(getGroupIdOptions).then(groupsResponse => {
                const adminGroupId = JSON.parse(groupsResponse.body).find(function (group) {
                    return group.displayName == "Administrators";
                }).id;

                const inviteMemberAsAdminOptions = {
                    url: utils.setAppropriateEnv(`https://platform.cloud.coveo.com/rest/organizations/${settings.orgId}/groups/${adminGroupId}/invites?sendEmail=${sendEmail}`, settings.env),
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Authorization": "Bearer " + settings.apiKey,
                        "Content-type": "application/json"
                    }
                }

                const inviteMemberAsAdminData = {
                    displayName: "",
                    email: member,
                    username: null
                }

                callApi(inviteMemberAsAdminOptions, inviteMemberAsAdminData)
                    .then(resolve)
                    .catch((err) => {
                        reject(new CoveoError(err, '[Invite] ' + member));
                    })
            }).catch((err) => {
                reject(new CoveoError(err, '[Invite] ' + member));
            })
        })
    },
    addQueryPipelineStatement(settings, pipelineId, statement, cb) {
        const request = require('request');
        const utils = require('./utils');

        const options = {
            url: utils.setAppropriateEnv(`https://platform.cloud.coveo.com/rest/search/v1/admin/pipelines/${pipelineId}/statements`, settings.env),
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + settings.apiKey
            },
            body: statement,
            json: true
        }

        request(options, (err, response, body) => {
            if (typeof cb !== "function") {
                console.error('Callback is not a function');
                return;
            }
            cb(err, response, body);
        })
    }
};
