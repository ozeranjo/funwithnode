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
}

io.sockets.on('connection', function(socket) {

	socket.on('new player', function(data, callback) {
		// TODO: should probably extend with binary search instead
		if (playernames.indexOf(data) != -1) {
			callback(false);
		}
		else {
			callback(true);
			socket.playername = data;
			playernames.push(socket.playername);
			io.sockets.emit('playernames', playernames);
		}
	});


	socket.on('send answer', function(data) {
		io.sockets.emit('new answer received', {answer: data, playername: socket.playername});
		// Use to transmit to everyone but the original sender / initiator
		// socket.broadcast.emit('new answer received', data);
	});

	socket.on('disconnect', function(data) {
		if(!socket.playername)
			return;
		playernames.splice(playernames.indexOf(socket.playername), 1);
		io.sockets.emit('playernames', playernames);
	});

});