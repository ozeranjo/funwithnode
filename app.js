var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	playernames = [];

server.listen(3000);

app.get('/', function(req,res) {
	res.sendfile(__dirname + '/index.html');
});

function Game () {
	// TODO: use a different approach for getting a reference to the object, this seems inelegant
	var self = this;
	var int1 = Math.floor(Math.random() * 30) + 1;
	var int2 = Math.floor(Math.random() * 30) + 1;
	self.question = int1 + "+" + int2;
	self.evaluated = eval (self.question);
}

// Instantiate new game object which holds the two integers, the composed question and the calculated, expected result)
var game = new Game();

io.sockets.on('connection', function(socket) {

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
			io.sockets.emit('playernames', playernames);
			io.sockets.emit('new game', game.question);
			console.log(game);
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

			// Now that this game has been decided, start a new one
			game = new Game();

			// And then send it around to all of the sockets (including the winner)
			io.sockets.emit('new game', game.question);
		}

	});

	socket.on('disconnect', function(data) {

		// Look for the player name that disconnected and remove it from the array, then send it around to the open sockets
		if(!socket.playername)
			return;
		playernames.splice(playernames.indexOf(socket.playername), 1);
		io.sockets.emit('playernames', playernames);
	});

});