var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	playernames = [];
	playerscores = {};
    points = {};


server.listen(3000);

app.get('/', function(req,res) {
	res.sendfile(__dirname + '/index.html');
});

function Game () {
	var self = this;
	var int1 = Math.floor(Math.random() * 30) + 1;
	var int2 = Math.floor(Math.random() * 30) + 1;
	self.question = int1 + "+" + int2;
	self.evaluated = eval (self.question);
}

// Instantiate new game object which holds the two integers, the composed question and the calculated, expected result
var game = new Game();

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

io.sockets.on('connection', function(socket) {
io.sockets.emit('players', { data: playernames });

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
	
			// Only start the game if there is more than 1 player...
			if(playernames.length > 1) {
				io.sockets.emit('new game', game.question);
				console.log(game);
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

			//  Retrieve all scores and send the score update to all players
			points = getPoints();
			io.sockets.emit('score update', points);

			// Now that this game has been decided, start a new one
			game = new Game();

			// And then send the new game's question around to all of the sockets (including the winner)
			io.sockets.emit('new game', game.question);
		}

	});

	socket.on('disconnect', function(data) {

		// Look for the player name that disconnected and remove it from the array, then send it around to the open sockets
		if(!socket.playername)
			return;
		playernames.splice(playernames.indexOf(socket.playername), 1);
		io.sockets.emit('players', playernames);

		// Note: the score for the disconnecting player name will not be removed though it will be purged when the server restarts
		// TODO: use persistent Mongo or Redis storage
	});

});