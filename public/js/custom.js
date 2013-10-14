	jQuery(function($){
		var socket = io.connect();
		var $playerForm = $('#playerNameForm');
		var $playerError = $('#nameError');
		var $playerName = $('#playername');
		var $players = $('#players');
		var $playerCount = $('#playerCount');
		var $playerScores = $('#playerScores');
		var $question = $('#question');
		var $answerForm = $('#answerform');
		var $answer = $('#answer');
		var $answerReceived = $('#answer_received');
		var $gameOutcome = $('#gameResult');
		var $gameWinner = $('#winner');
		var $gamePoints = $('#gamePoints');
		var $pointTotal = $('#points');
		var $topPlayer = $('.highScorePlayerName-text');

		$answerForm.submit(function(e) {
			e.preventDefault();
			socket.emit('send answer', $answer.val());
			$answer.val('');
		});

		$playerForm.submit(function(e) {
			e.preventDefault();
			if( document.getElementById('playername').value === '' ){
     			alert('Please enter a player name.');
     			return;
    		}

			socket.emit('new player', $playerName.val(), function(data) {
				if(data) {
					$('#playerNameEntry').hide();
					$('#questionContainer').show();
					$('#players').show();
					$('#playerScores').show();
				}
				else {
					$('#nameError').show();
					$playerError.html('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><strong>Error</strong>: that player name is already in use, try again.');
				}
			});
			$playerName.val('');
		});

		socket.on('new game', function(game) {
			$question.html('<br/><p>' + game + '</p>');
		});

		socket.on('last 5 games', function(game) {
			$('.input-group .input-group-btn').empty();
			$(game).each(function(key,val) {
				val = val.slice(val.lastIndexOf("|")+1,val.length);
					$('.input-group .input-group-btn').each(function() {
						$(this).append('<button class="btn btn-primary" type="button">' + val + '</button>');
					});
			});
		});

		socket.on('score update', function(data) {
			var html;
			
			// Check each score retrieved to see if it matches any of our current players
			$(data).each(function(key, score) {
				$('.countdown_section .countdown_amount').each(function() {
					text = $(this).text();
					
					// Do a check in case the game has already started and the pts are showing
					if(text.indexOf(" (") != -1 ) {
						text = text.substr(0,text.indexOf(" ("));
					}
					
					// console.log("What is in score: " + score.name.valueOf());
					// console.log("What is in text: " + text.valueOf());
					// If they are exactly the same, replace the string with the current point total
					if(text.valueOf() == score.name.valueOf()) {
						if(score.score == 1)
							$(this).html('<span class="countdown_amount">' + score.name + ' (' + score.score + ' point)</span></span>');
						else
							$(this).html('<span class="countdown_amount">' + score.name + ' (' + score.score + ' points)</span></span>');
					}
				});
			});
		});

		socket.on('game over', function(data) {
			$('#gameResult').show();
			$gameWinner.html("<br/><p>You are the " + data + "!</p>");
		});

		socket.on('players', function(data) {
			var playercount = 0;
			if(data.length > 0) {
				playercount = data.length;
			}
			
			// Set up the player list and show the count
			var html_list = '';
			var html = '<p><strong>Player List</strong> (' + playercount +' connected)</p>';
			for (i=0; i < data.length; i++)
			{
				html_list += '<span class="countdown_section"><span class="countdown_amount">' + data[i] + '</span></span>';
			}
			$playerCount.html(html);
			$playerScores.html(html_list);
		});

		socket.on('player high score', function(data) {
			$topPlayer.html('<br/>Highest all-time scoring player: <span class="tblue">' + data + '</span>');
		});

		socket.on('new answer received', function(data) {
			// Not implemented
		});

	});