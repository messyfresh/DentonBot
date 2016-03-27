/**
 * Created by Scott on 4/22/2015.
 */
var tmi = require('tmi.js'),
    request = require('request');

//Import config and function file
var config = require('../config/config.json');
var dLib = require('../lib/Functions.js');
var dConst = require('../lib/Constants.js');

//Setup Twitch Bot and connect to Twitch IRC Server
var twitchUser = config.dentonBot.userName,
    twitchPass = config.dentonBot.oauth;

//TMI connection Options
var dentonBotOptions = {
    options:{
        debug:true
    },
    connection:{
        random: 'chat',
        reconnect: true
    },
    identity:{
        username: twitchUser,
        password: twitchPass
    }
};

var dentonBot = new tmi.client(dentonBotOptions);

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
String.prototype.sanitize = function() {
    return this.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
};

dentonBot.on('chat', function(channel, user, message, self){
    try{
        var msgArray = message.split(" ");
        //Check if the chat command matches one of Denton's Commands
        if(dConst.dentonCmds.indexOf(msgArray[0]) > -1){
            if(msgArray[1]){
                var queryUser = msgArray[1].replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
                var capUser = queryUser.capitalizeFirstLetter();
            }
        }
    } catch (err){
        console.log(err);
        if(err.message === "Cannot read property 'replace' of undefined"){
            dentonBot.say(channel, "Denton not know who you want to lookup. Add username after command i.e. " + msgArray[0] + " remedeez");
            return;
        } else {
            console.log(err);
            dentonBot.say(channel, dConst.errorMsg);
            return;
        }
    }

    switch(msgArray[0]){
        case '!div':
            dLib.getPlayerInfo(queryUser)
              .then(function(jsonBody){
                  if (jsonBody.length === 0) {
                      dentonBot.say(channel, 'No Results found for ' + capUser);
                  }
                  var totalPlayed = jsonBody[0].RankedConquest.Wins + jsonBody[0].RankedConquest.Losses;
                  var winPercent = Math.round(jsonBody[0].RankedConquest.Wins / totalPlayed * 100);
                  if (totalPlayed === 0) {
                      dentonBot.say(channel, capUser + " has not played any Season 3 Conquest Ranked games.");
                  } else {
                      var currDiv = dConst.leagueDivision[jsonBody[0].RankedConquest.Tier];
                      if (currDiv == undefined) {
                          dentonBot.say(channel, capUser + " is in Qualifiers with a win rate of " + winPercent +
                            "%")
                      } else {
                          dentonBot.say(channel, capUser + "'s Conquest Division is " + currDiv + " with a win" +
                            " rate of " + winPercent + "%");
                      }
                  }
              })
              .catch(function(err){
                  console.error(err);
                  dentonBot.say(channel, dConst.errorMsg);
              });
            break;

        case '!duel':
            dLib.getPlayerInfo(queryUser)
              .then(function(jsonBody){
                  if (jsonBody.length === 0) {
                      dentonBot.say(channel, 'No Results found for ' + capUser);
                  }
                  var jtotalPlayed = jsonBody[0].RankedDuel.Wins - jsonBody[0].RankedDuel.Losses;
                  var jwinPercent = Math.round(jsonBody[0].RankedDuel.Wins / jtotalPlayed * 100);
                  if (jtotalPlayed == 0) {
                      dentonBot.say(channel, capUser + " has not played any Joust Ranked 1v1 games.");
                  } else {
                      var currDiv = dConst.leagueDivision[jsonBody[0].RankedDuel.Tier];
                      if (currDiv == undefined) {
                          dentonBot.say(channel, capUser + " is in Qualifiers with a win rate of " + jwinPercent +
                            "%");
                      } else {
                          dentonBot.say(channel, capUser + "'s Joust 1v1 Division is " + currDiv + " with a win" +
                            " rate of " + jwinPercent + "%");
                      }
                  }
              })
              .catch(function(err){
                  console.error(err);
                  dentonBot.say(channel, dConst.errorMsg);
              });
            break;

        case '!jdiv':
        case '!jelo':
          dentonBot.say(channel, 'Denton still fixing this for Season 3.');
            break;

        case '!arena':
            dLib.getQueueStats(queryUser, 435)
              .then(function(jsonBody){
                  if (jsonBody.length == 0) {
                      dentonBot.say(channel, 'No Results found for ' + msgArray[1]);
                  } else {
                      var arenaPlayed = 0, arenaWins = 0;
                      for (var i = 0; i < jsonBody.length; i++) {
                          var arenaPlayed = arenaPlayed + jsonBody[i].Wins + jsonBody[i].Losses;
                          var arenaWins = arenaWins + jsonBody[i].Wins;
                      }
                      var winrate = Math.round(arenaWins / arenaPlayed * 100);
                      dentonBot.say(channel, msgArray[1] + " has played " + arenaPlayed + " Arena games with a win rate of " +
                        winrate + "%");
                  }
              })
              .catch(function(err){
                  console.error(err);
                  dentonBot.say(channel, dConst.errorMsg);
              });
            break;

        case '!masteries':
            dLib.getPlayerInfo(queryUser)
              .then(function(jsonBody){
                  if (jsonBody.length == 0) {
                      dentonBot.say(channel, 'No Results found for ' + capUser);
                  } else {
                      var masteryLevel = jsonBody[0].MasteryLevel;
                      if (masteryLevel == 0) {
                          dentonBot.say(channel, capUser + " has not mastered any gods.");
                      }
                      else {
                          dentonBot.say(channel, capUser + " has mastered " + masteryLevel + " gods.");
                      }
                  }
              })
              .catch(function(err){
                  console.error(err);
                  dentonBot.say(channel, dConst.errorMsg);
              });
            break;

        case '!conquest':
            dLib.getQueueStats(queryUser, 426)
              .then(function(jsonBody){
                  if (jsonBody.length == 0) {
                      dentonBot.say(channel, 'No Results found for ' + capUser);
                  } else {
                      var conquestPlayed = 0, conquestWins = 0;
                      for (var i = 0; i < jsonBody.length; i++){
                          var conquestPlayed = conquestPlayed + jsonBody[i].Wins + jsonBody[i].Losses;
                          var conquestWins = conquestWins + jsonBody[i].Wins;
                      }
                      var winrate = Math.round(conquestWins / conquestPlayed * 100);
                      dentonBot.say(channel, capUser + " has played " + conquestPlayed + " Conquest games with a win rate of " +
                        winrate + "%" );
                  }
              })
              .catch(function(err){
                  console.error(err);
                  dentonBot.say(channel, dConst.errorMsg);
              });
            break;

        case '!assault':
            dLib.getQueueStats(queryUser, 445)
              .then(function(jsonBody){
                  if (jsonBody.length == 0) {
                      dentonBot.say(channel, 'No Results found for ' + msgArray[1]);
                  } else {
                      var assaultPlayed = 0, assaultWins = 0;
                      for (var i = 0; i < jsonBody.length; i++) {
                          var assaultPlayed = assaultPlayed + jsonBody[i].Wins + jsonBody[i].Losses;
                          var assaultWins = assaultWins + jsonBody[i].Wins;
                      }
                      var winrate = Math.round(assaultWins / assaultPlayed * 100);
                      dentonBot.say(channel, msgArray[1] + " has played " + assaultPlayed + " Assault games with a win rate of " +
                        winrate + "%");
                  }
              })
              .catch(function(err){
                  console.error(err);
                  dentonBot.say(channel, dConst.errorMsg);
              });
            break;

        case '!siege':
            dLib.getQueueStats(queryUser, 459)
              .then(function(jsonBody){
                  if (jsonBody.length == 0) {
                      dentonBot.say(channel, 'No Results found for ' + msgArray[1]);
                  } else {
                      var siegePlayed = 0, siegeWins = 0;
                      for (var i = 0; i < jsonBody.length; i++) {
                          var siegePlayed = siegePlayed + jsonBody[i].Wins + jsonBody[i].Losses;
                          var siegeWins = siegeWins + jsonBody[i].Wins;
                      }
                      var winrate = Math.round(siegeWins / siegePlayed * 100);
                      dentonBot.say(channel, msgArray[1] + " has played " + siegePlayed + " Siege games with a win rate of " +
                        winrate + "%");
                  }
              })
              .catch(function(err){
                  console.error(err);
                  dentonBot.say(channel, dConst.errorMsg);
              });
            break;

        case '!joust':
            dLib.getQueueStats(queryUser, 448)
              .then(function(jsonBody){
                  if (jsonBody.length == 0) {
                      dentonBot.say(channel, 'No Results found for ' + msgArray[1]);
                  } else {
                      var joustPlayed = 0, joustWins = 0;
                      for (var i = 0; i < jsonBody.length; i++) {
                          var joustPlayed = joustPlayed + jsonBody[i].Wins + jsonBody[i].Losses;
                          var joustWins = joustWins + jsonBody[i].Wins;
                      }
                      var winrate = Math.round(joustWins / joustPlayed * 100);
                      dentonBot.say(channel, msgArray[1] + " has played " + joustPlayed + " Joust games with a win rate of " +
                        winrate + "%");
                  }
              })
              .catch(function(err){
                  console.error(err);
                  dentonBot.say(channel, dConst.errorMsg);
              });
            break;

        case '!clash':
            dLib.getQueueStats(queryUser, 466)
              .then(function(jsonBody){
                  if (jsonBody.length == 0) {
                      dentonBot.say(channel, 'No Results found for ' + msgArray[1]);
                  } else {
                      var clashPlayed = 0, clashWins = 0;
                      for (var i = 0; i < jsonBody.length; i++) {
                          var clashPlayed = clashPlayed + jsonBody[i].Wins + jsonBody[i].Losses;
                          var clashWins = clashWins + jsonBody[i].Wins;
                      }
                      var winrate = Math.round(clashWins / clashPlayed * 100);
                      dentonBot.say(channel, msgArray[1] + " has played " + clashPlayed + " Clash games with a win rate of " +
                        winrate + "%");
                  }
              })
              .catch(function(err){
                  console.error(err);
                  dentonBot.say(channel, dConst.errorMsg);
              });
            break;

        case '!diamonds':
            request({
                url: 'http://localhost:5000/api/getgodranks/' + msgArray[1]
            }, function (error, response, body){
                try {
                    var jsonBody = JSON.parse(body);
                }
                catch (err) {
                    dentonBot.say(channel, dConst.errorMsg);
                }
                if (jsonBody === null) {

                } else {
                    if (jsonBody.length == 0) {
                        dentonBot.say(channel, 'No Results found for ' + msgArray[1]);
                    } else {
                        var diamonds = 0;
                        for (var i = 0; i < jsonBody.length; i++) {
                            if (jsonBody[i].Rank == 10) {
                                diamonds++;
                            }
                        }
                        dentonBot.say(channel, msgArray[1] + " has " + diamonds + " gods at Mastery Rank X.");
                    }
                }
            });
            break;

        case '!dentonbot':
            dentonBot.say(channel, 'DentonBot commands are: !div, !duel, !jdiv, !masteries, !diamonds, !conquest, !arena ' +
              '!siege, !assault, !joust, !clash');
            break;
    }

});



module.exports = dentonBot;