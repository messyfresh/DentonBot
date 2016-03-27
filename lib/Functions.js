//Collection of useful function
var request = require('request');
function checkJson(json, next){
    //Try to parse json, catch and return errors
    try{
        var parsedJson = JSON.parse(json);
        //Check that json is not empty
        if(Object.keys(parsedJson).length > 0){
            next(parsedJson);
        } else {
            console.log("Empty Json");
        }
    }
    catch(err){
        //Log all errors
        console.error(err);
    }
}

function getPlayerInfo(queryUser){
    return new Promise(function(resolve, reject){
        request({
            url: 'http://localhost:5000/api/getplayer/' + queryUser
        }, function (error, response, body){
            try {
                var jsonBody = JSON.parse(body);
                if(jsonBody.length !== 0){
                    resolve(jsonBody);
                }
            }
            catch (err) {
                reject(Error(err));
            }
        })
    })
}

function getQueueStats(queryUser, gameModeId){
    return new Promise(function(resolve, reject){
        request({
            url: 'http://localhost:5000/api/getqueuestats/' + queryUser + "/" + gameModeId
        }, function (error, response, body){
            try {
                var jsonBody = JSON.parse(body);
                if(jsonBody.length !== 0){
                    resolve(jsonBody);
                }
            }
            catch (err) {
                reject(Error(err));
            }
        })
    })
}

//Exports
module.exports.checkJson = checkJson;
module.exports.getPlayerInfo = getPlayerInfo;
module.exports.getQueueStats = getQueueStats;


