//Keymetrics Stuff
var pmx = require('pmx');
require('pmx').init();

var express = require('express'),
    exphbs  = require('express-handlebars'),
    mongoose = require('mongoose'),
    path = require('path'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    mongoSession = require('connect-mongo')(session),
    passport = require('passport'),
    TwitchStrategy = require('passport-twitch').Strategy,
    server = express(),
    http = require('http').createServer(server),
    io = require('socket.io')(http, {'force new connection': true});

var dentonBot = require("./bot/dentonBot.js");
//Connect to twitch irc chat server
dentonBot.connect();
//Dentonbot should always join his own channel for demo purposes
dentonBot.join('#dentonbot');

//Import config file
var config = require('./config/config.json');
var port = config.port;

//Increase max listeners to 1000
require('events').EventEmitter.prototype._maxListeners = 1000;

//Connect to mongodb and define the UserSchema and IrcChanSchema
//IrcChanSchema is used to track the channels denton is currently connected to
//This allows for auto reconnect on server restart
mongoose.connect(config.mongo.url, function(err) {
    if (!err) {
        var Schema = mongoose.Schema;
        var userSchema = new Schema({
            username: {
                type: String,
                required: true,
                trim: true
            },
            twitch: {
                type: Object,
                required: true,
                trim: true
            }
        });

        var ircChanSchema = new Schema({
            channel:{
                name: {
                    type: String,
                    required: true,
                    unique: true
                },
                connected: {
                    type: Boolean,
                    required: true
                }
            }
        });

        var Channel = mongoose.model('channels', ircChanSchema);

        var User = mongoose.model('users', userSchema);

        function ensureAuthenticated(req, res, next) {
            if (req.isAuthenticated()) {
                return next();
            }
            return res.redirect("/");
        }


        passport.serializeUser(function (user, done) {
            User.findOne({
                username: user._json.display_name
            }, function (err, result) {
                if (result) {
                    result.twitch = user._json;
                    result.save();
                } else {
                    user.username = user._json.display_name;
                    user.twitch = user._json;

                    new User(user).save(function (err) {
                    });
                }
            });
            done(null, user);
        });

        passport.deserializeUser(function (obj, done) {
            User.findOne({
                username: obj._json.display_name
            }, function (err, result) {
                if (result) {
                    obj.active = result.active;
                }
                done(null, obj);
            });
        });

        passport.use(new TwitchStrategy({
                clientID: config.twitch.clientId,
                clientSecret: config.twitch.clientSecret,
                callbackURL: config.twitch.callbackURL,
                scope: config.twitch.scopes
            },
            function (accessToken, refreshToken, profile, done) {
                process.nextTick(function () {
                    return done(null, profile);
                });
            }
        ));
        server.set('views', path.join(__dirname, 'views'));
        server.engine('handlebars', exphbs({defaultLayout: 'main'}));
        server.set('view engine', 'handlebars');

        server.use(bodyParser.json());
        server.use(bodyParser.urlencoded({extended: true}));
        server.use(cookieParser());
        server.use(express.static(path.join(__dirname, 'public')));
        server.use(express.Router());

        var sessiondb = session({
            store: new mongoSession({
                url: config.mongo.url,
                maxAge: 300000
            }),
            resave: true,
            saveUninitialized: true,
            secret: config.security.sessionSecret,
            auto_reconnect: true,
            cookie: {
                httpOnly: false
            }
        });
        server.use(sessiondb);
        server.use(passport.initialize());
        server.use(passport.session());

        server.get('/', function(req, res) {
            res.render('home', { user: req.user });
        });

        server.get('/login', function(req, res){
            res.render('login', { user: req.user });
        });

        server.get('/auth/twitch',
            passport.authenticate('twitch', { scope: config.twitch.scopes.split(',') }),
            function(req, res){
                // The request will be redirected to Twitch.tv for authentication, so this
                // function will not be called.
            });

        server.get('/auth/twitch/callback',
            passport.authenticate('twitch', { failureRedirect: '/' }),
            function(req, res) {
                res.redirect('/');
            });

        server.get('/logout', function(req, res){
            req.logout();
            res.redirect('/');
        });

        server.use(pmx.expressErrorHandler());

        //DentonBot auto reconnect to all previously connected Channels (2 Channels per second)
        dentonBot.on('connected', function(){
            Channel.find({}, function(err, channel){
                if (err) throw err;
                for (var i = 0; i < channel.length; i++){
                    (function(i){
                        if(channel[i].channel.connected === true) {
                            setTimeout(function () {
                                dentonBot.join(channel[i].channel.name);
                            }, 500 * i);
                        }
                    })(i);
                }
            });
        });


        http.listen(port, function () {
            console.log('Server listening at port %d', port);
        });

        //Socket.io
        /*io.use(function(socket, next){
         sessiondb(socket.request, socket.request.res, next);
         });*/

        io.use(function(socket, next){
            // Wrap the express middleware
            sessiondb(socket.request, {}, next);
        });

        io.on('connection', function(socket){

            //connect dentonbot to users channel
            socket.on('start', function(){
                var user = socket.request.session.passport.user.username;
                var ircChannel = '#' + user;
                dentonBot.join(ircChannel);
                socket.emit('connected');
                //store channel in db for channel list
                Channel.findOneAndUpdate(
                    {'channel.name': ircChannel},
                    {'channel.connected': true},
                    function(err, numberAffected, raw){
                        if (err) throw err;
                        else {
                            socket.emit('Connected');
                        }
                    });
                });
            //disconnect dentonbot from users channel
            socket.on('stop', function(){
                var user = socket.request.session.passport.user.username;
                var ircChannel = '#' + user;
                dentonBot.part(ircChannel);
                //Update connected to false
                Channel.findOneAndUpdate(
                    {'channel.name': ircChannel},
                    {'channel.connected': false},
                    function(err, numberAffected, raw){
                        if (err) throw err;
                        else {
                            socket.emit('notConnected');
                        }
                    });
            });
            //On request from client, send channel connection status
            socket.on('status', function(){
                var user = socket.request.session.passport.user.username;
                var ircChannel = '#' + user;
                Channel.findOne(
                    {'channel.name': ircChannel},
                    function(err, doc){
                        if (err) throw err;
                        else if (doc === null){
                            Channel.create({channel:{name: ircChannel, connected: false}});
                        }
                        else if (doc.channel.connected === true){
                            socket.emit('connected');
                        }
                        else{
                            socket.emit('notConnected');
                        }
                    });
            });
        });
    }
});
