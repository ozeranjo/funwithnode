var express = require('express')
    , configurations = module.exports
    , http = require('http')
    , app = express()
    , redis = require("redis")
	, redisPort = 6379
	, redisLocalHost = "127.0.0.1"
	, redisRemoteHost = process.env.redisHost
	, redisPw = process.env.redisPassword
    , nconf = require('nconf')
	, server = http.createServer(app).listen(3000)
    , io = require('socket.io').listen(server)
    , winston = require('winston')
	, playernames = []
	, playerscores = {}
    , points = {}
    , games_array = []
    , names_array = []
    , game;

// Check to see if our environment vars are set -- if so, use them and auth. If not, go with redisLocalHosthost and no auth

if(redisRemoteHost) {
	redisClient = redis.createClient(redisPort, redisRemoteHost);
}
else {
	redisClient = redis.createClient(redisPort, redisLocalHost);
}

if(redisPw) {
	redisClient.auth(redisPw, function() {
		console.log("Authenticated to Iris Couch");
	});
}

// Logging
var logger = new (winston.Logger)({ transports: [ new (winston.transports.Console)({colorize:true}) ] })

// load the settings
require('./settings')(app, configurations, express, logger)

// merge nconf overrides with the configuration file.
nconf.argv().env().file({ file: 'local.json' })

// Routes
require('./routes')(app)

logger.info('listening on', nconf.get('port'))

//app.listen(process.env.PORT || nconf.get('port'))

// On init for first connection, send around the player list, points, last 5 games and highest scoring player
io.sockets.emit('players', playernames);
io.sockets.emit('score update', points);
io.sockets.emit('last 5 games', getLast5Games());
io.sockets.emit('player high score', getPlayerHighScore());

function Game () {
	var self = this;
	var int1 = Math.floor(Math.random() * 30) + 1;
	var int2 = Math.floor(Math.random() * 30) + 1;
	self.question = int1 + "+" + int2;
	self.evaluated = eval (self.question);
}

function getPoints() {
	var scores = (function() { 
		
		// Need a dummy score array to push the discovered values to
		var scores = [];
	
		// Iterate through all elements of the scores array
		for (var key in playerscores) {
			if (playerscores.hasOwnProperty(key)) {

				// Take the name and score and add it to the array we'll be returning
				scores.push({
					name: key,
					score: playerscores[key]
				});
			};
		};
		
		// Return the scores array to the outer function
		return scores;

	})();

	// Get this score update back to the caller
	return scores;
};

function getLast5Games() {

	// Retrieve the last five games from redis and store it into an array that we'll return to the caller
	redisClient.zrevrange("games", 0, 4, function (err, games) {

		var game_count = 0;
		games_array = [];
		for (var game in games) {
			games_array.push(games[game_count]);
			game_count++;
		}
	});

	return games_array;

};

function getPlayerHighScore() {

	// Retrieve the highest scoring player recorded in redis across all played games
	redisClient.zrevrange("highscores", 0, 0, function (err, names) {
		names_array = [];
		for(var name in names) {
			names_array.push(names[0]);
		}
	});

	return names_array;

};

io.sockets.on('connection', function(socket) {

	// On connect, send around the player list, points, last 5 games and highest scoring player
	io.sockets.emit('players', playernames);
	io.sockets.emit('score update', points);
	io.sockets.emit('last 5 games', getLast5Games());
	io.sockets.emit('player high score', getPlayerHighScore());

	socket.on('new player', function(data, callback) {
		// TODO: should probably extend with binary search instead
		
		// Check for player name in array		
		if (playernames.indexOf(data) != -1) {
			callback(false);
		}

		// If not found, handle new player, send list of players and game data
		else {
			callback(true);
			socket.playername = data;
			playernames.push(socket.playername);
			io.sockets.emit('players', playernames);
			io.sockets.emit('score update', points);
	
			// Only start the game if there is more than 1 player...
			if(playernames.length > 1) {
				
				// Instantiate new game object which holds the two integers, the composed question and the calculated, expected result
				game = new Game();

				var ts = new Date().getTime();

				// Store this game into redis (timestamp, question)
				redisClient.zadd("games", ts, ts + "|" + game.question);
				
				// New game is starting so refresh data for all connected sockets
				io.sockets.emit('last 5 games', getLast5Games());
				io.sockets.emit('player high score', getPlayerHighScore());
				io.sockets.emit('new game', game.question);
			}
		}
	});

	socket.on('send answer', function(data) {

		// Use this to fire off the answer submitted to all players inclusive of player name
		io.sockets.emit('new answer received', {answer: data, playername: socket.playername});
		
		// Use to transmit to everyone but the original sender / initiator
		// socket.broadcast.emit('new answer received', data);

		// Game logic
		if(data == game.evaluated) {

			// Let all connected sockets know that there is a winner
			io.sockets.emit('game over', "winner");

			// Then let the losing sockets know the bad news
			socket.broadcast.emit('game over', "loser");

			// Assign points to winner and ensure that any new player has a score of 0
			if(!playerscores[socket.playername]) {
				playerscores[socket.playername] = 0;
			}

			playerscores[socket.playername]++;

			// Increment the winning player in redis by 1
			redisClient.zincrby("highscores", 1, socket.playername);

			//  Retrieve all scores and send the score update to all players
			points = getPoints();
			io.sockets.emit('score update', points);

			// Now that this game has been decided, start a new one
			game = new Game();

			var ts = new Date().getTime();

			// Store this game into redis (timestamp, question)
			redisClient.zadd("games", ts, ts + "|" + game.question);

			// New game is starting so refresh data for all connected sockets
			io.sockets.emit('last 5 games', getLast5Games());
			io.sockets.emit('player high score', getPlayerHighScore());
			io.sockets.emit('new game', game.question);
		}

	});

	socket.on('disconnect', function(data) {

		// Look for the player name that disconnected and remove it from the array, then send it around to the open sockets
		if(!socket.playername)
			return;
		playernames.splice(playernames.indexOf(socket.playername), 1);
		io.sockets.emit('players', playernames);
		io.sockets.emit('score update', points);

		// Note: the score for the disconnecting player name will not be removed though it will be purged when the server restarts
		// TODO: use persistent Mongo or Redis storage
	});

});