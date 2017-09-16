'use strict';

import './index.html';
import './main.css';
import $ from 'jquery';
import 'jquery-ui-bundle';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

import imageDie1 from './img/die1.png';
import imageDie2 from './img/die2.png';
import imageDie3 from './img/die3.png';
import imageDie4 from './img/die4.png';
import imageDie5 from './img/die5.png';
import imageDie6 from './img/die6.png';

import imageUsedDie1 from './img/die1_disabled.png';
import imageUsedDie2 from './img/die2_disabled.png';
import imageUsedDie3 from './img/die3_disabled.png';
import imageUsedDie4 from './img/die4_disabled.png';
import imageUsedDie5 from './img/die5_disabled.png';
import imageUsedDie6 from './img/die6_disabled.png';

import imageWhiteChecker from './img/white_checker.png';
import imageBlackChecker from './img/black_checker.png';

var USERNAME = 'Dabisa';
var PASSWORD = 'password';
var host = 'evening-ravine-20207.herokuapp.com';
var stompClient;

var dieImages = [imageDie1, imageDie2, imageDie3, imageDie4, imageDie5, imageDie6];
var usedDieImages = [imageUsedDie1, imageUsedDie2, imageUsedDie3, imageUsedDie4, imageUsedDie5, imageUsedDie6];

var actions = [];

function basicAuthorization(username, password) {
	return 'Basic ' + btoa(username + ':' + password);
}


function getDieImage(die, used) {
	if (die >= 1 && die <= 6) {
		return 'url(' + (used ? usedDieImages[die-1] : dieImages[die-1]) + ')';
	} else {
		return 'none';
	}
}

function getCheckerImage(color) {
	switch (color) {
	case 'W': return 'url(' + imageWhiteChecker + ')';
	case 'B': return 'url(' + imageBlackChecker + ')';
	default: return 'none';
	}
}

function showDice(dice) {
	function showDie(id, die, moves) {
		var dieImage = getDieImage(die, moves < 1);
		$('#die' + id).css('background-image', dieImage);
	}
	var n = dice ? dice.length : 0;
	switch (n) {
	case 2:
		showDie(3, 0, 0);
		showDie(1, dice[0].die, dice[0].moves);
		showDie(2, dice[1].die, dice[1].moves);
		showDie(4, 0, 0);
		break;
	case 1:
		showDie(3, dice[0].die, dice[0].moves - 3);
		showDie(1, dice[0].die, dice[0].moves - 2);
		showDie(2, dice[0].die, dice[0].moves - 1);
		showDie(4, dice[0].die, dice[0].moves);
		break;
	default:
		showDie(3, 0, 0);
		showDie(1, 0, 0);
		showDie(2, 0, 0);
		showDie(4, 0, 0);
		break;
	}
}

function doAction(url, data) {
	fetch(url, {
		method: 'POST',
		redirect: 'follow',
		credentials: 'include',
		headers: { 'Authorization': basicAuthorization(USERNAME, PASSWORD), 'Content-type': 'application/json' },
		body: JSON.stringify(data)
	}).then(function (response) {
		return response.json();
	}).then(function (json) {
		drawBoard(json);
	});
}

function drawBoard(json) {
	function enableButton(isEnabled, buttonName, action) {
		$('#' + buttonName).css('display', isEnabled ? 'inline-block' : 'none');
		if (isEnabled) {
			$('#' + buttonName).click(action);
		} else {
			$('#' + buttonName).off('click');
		}
	}

	function roll(url) { doAction(url, { 'action': 'roll' }); }
	function move(url, source, destination) { doAction(url, { 'action': 'move', 'source': source, 'destination': destination }); }
	function endTurn(url) { doAction(url, { 'action': 'pickUpDice' }); }
	function doubleStake(url) { doAction(url, { 'action': 'offerDouble' }); }
	function acceptStake(url) { doAction(url, { 'action': 'acceptDouble' }); }
	function rejectStake(url) { doAction(url, { 'action': 'rejectDouble' }); }

	function showCheckers(actionUrl, points, whiteBar, whiteHome, blackBar, blackHome, moves) {
		function drawPoint(pointValue, pointName, movablePoints) {
			var color = pointValue.substring(0, 1),
				count = Number(pointValue.substring(1)),
				movable = actionUrl && $.inArray(pointName, movablePoints) >= 0,
				targets = moves.reduce(function (targets, move) {
					return (move.source === pointName && $.inArray(move.destination, targets) < 0) ? targets.concat([move.destination]) : targets;
				}, []),
				checker_img = getCheckerImage(color),
				checkerText = $('#point' + pointName + ' > .socket-count-5 > .checker > .number'),
				checkerBg = $('#point' + pointName + ' > .socket-count-5 > .checkerBg'),
				checkerBgText = $('#point' + pointName + ' > .socket-count-5 > .checkerBg > .number'),
				socket;
				
			checkerText.text((count > 5) ? count.toString() : '');
			checkerBg.css({ 'background-image': (count > 5) ? checker_img : 'none' });
			checkerBgText.text((count > 6) ? (count - 1).toString() : '');
			
			for (socket = 1; socket <= 5; socket += 1) {
				var isTopChecker = (socket === count || (socket === 5 && count > 5)),
					checker = $('#point' + pointName + ' > .socket-count-' + socket + ' > .checker');
				
				checker.css({
					'background-image': (count >= socket) ? checker_img : 'none',
					'animation-name': (movable && isTopChecker) ? 'blink' : 'none'
				});
				
				if (movable && isTopChecker) {
					checker.draggable({
						disabled: false,
						start: function (event, ui) {
							ui.helper.data({
								'dropped': false,
								'left': $(this).css('left'),
								'top': $(this).css('top')
							});
							$('.checker').css('animation-name', 'none');

							targets.forEach(function (target) {
								$('#point' + target).css('border', 'solid');
								$('#point' + target).droppable({
									disabled: false,
									drop: function (event, ui) {
										ui.helper.data('dropped', true);

										targets.forEach(function (target) {
											$('#point' + target).css('border', 'none');
											$('#point' + target).droppable({disabled: true});
										});
										ui.draggable.css({
											'left': ui.helper.data('left'),
											'top': ui.helper.data('top')
										});
										$('.checker').draggable({disabled: true});
										move(actionUrl, pointName, target);
									}
								});
							});
							checkerText.text('');
						},
						stop: function (event, ui) {
							checkerText.text((count > 5) ? count.toString() : '');

							if (!ui.helper.data('dropped')) {
								targets.forEach(function (target) {
									$('#point' + target).css('border', 'none');
									$('#point' + target).droppable({disabled: true});
								});
								$(this).css({
									'left': ui.helper.data('left'),
									'top': ui.helper.data('top')
								});
								$('.checker').draggable({disabled: true});
								showCheckers(actionUrl, points, whiteBar, whiteHome, blackBar, blackHome, moves);
							}
						}
					});
				}
			}
		}
		var movablePoints = (!moves) ? undefined : moves.reduce(function (sources, move) {
			return ($.inArray(move.source, sources) < 0) ? sources.concat([move.source]) : sources;
		}, []);
		points.forEach(function (pointValue, index) {
			var pointName = ('00' + (index + 1)).slice(-2);
			drawPoint(pointValue, pointName, movablePoints);
		});

		drawPoint(whiteBar, 'WB', movablePoints);
		drawPoint(whiteHome, 'WH', movablePoints);
		drawPoint(blackBar, 'BB', movablePoints);
		drawPoint(blackHome, 'BH', movablePoints);
	}
	
	var actionUrl = json._links ? (json._links.action ? json._links.action.href : undefined) : undefined,
		status = json.status.toLowerCase(),
		canRoll = actionUrl && (status === 'initial' || status === 'rolling'),
		canDouble = actionUrl && (status === 'rolling' && (json.cubeOwner === json.currentPlayer || json.cubeOwner === 'None')),
		canAccept = actionUrl && (status === 'doublestake'),
		canReject = actionUrl && (status === 'doublestake'),
		canEndTurn = actionUrl && (status === 'nomoves'),
		isEndOfGame = status === 'end' || status === 'resigned';
	
	showDice(json.dice);
	showCheckers(actionUrl, json.points, json.whiteBar, json.whiteHome, json.blackBar, json.blackHome, json.availableMoves);
	
	enableButton(canRoll, 'roll-button', function () { roll(actionUrl); });
	enableButton(canDouble, 'double-button', function () { doubleStake(actionUrl); });
	enableButton(canAccept, 'accept-button', function () { acceptStake(actionUrl); });
	enableButton(canReject, 'reject-button', function () { rejectStake(actionUrl); });
	enableButton(canEndTurn, 'end-turn-button', function () { endTurn(actionUrl); });
	
	$('#game-over-message').css('display', isEndOfGame ? 'inline-block' : 'none');
	$('#board').css('display', 'inline-block');
}

function clearBoard() {
	$('#board').css('display', 'none');
}


function createGame(host, opponent) {
	fetch('https://' + host + '/requests/', {
		method: 'POST',
		redirect: 'follow',
		credentials: 'include',
		headers: { 'Authorization': basicAuthorization(USERNAME, PASSWORD), 'Content-type': 'application/json' },
		body: JSON.stringify({'opponent': opponent})
	}).then(function (response) {
		if (response.ok) {
			return response.json();
		} else {
			throw new Error('game request failed');
		}
	}).then(function (json) {
		if (json.accepted) {
			updateGame(json._links.game.href);
		} else {
			clearBoard();
		}
	});
}

function confirmGame(url) {
	fetch(url, {
		method: 'POST',
		redirect: 'follow',
		credentials: 'include',
		headers: { 'Authorization': basicAuthorization(USERNAME, PASSWORD) }
	}).then(function (response) {
		if (response.ok) {
			return response.json();
		} else {
			throw new Error('game confirmation failed');
		}
	}).then(function (json) {
		drawBoard(json);
	});
}

function updateGame(url) {
	return new Promise(function (resolve, reject) {
		fetch(url, {
			credentials: 'include',
			headers: { 'Authorization': basicAuthorization(USERNAME, PASSWORD) }
		}).then(function (response) {
			if (response.ok) {
				return response.json();
			} else {
				reject('game retrieval failed');
				//throw new Error('game retrieval failed');
			}
		}).then(function (json) {
			drawBoard(json);
			resolve();
		});
	});
}

function getChecker(point) {
	var i, checker;
	for (i = 5; i > 0; i -= 1) {
		checker = $('#point' + point + ' > .socket-count-' + i + ' > .checker');
		if (checker && checker.css('background-image') !== 'none') {
			return checker;
		}
	}
	return null;
}

function getNumber(point) {
	return $('#point' + point + ' > .socket-count-5 > .checker > .number');
}

function getFreeSpot(point, img) {
	var i, checker;
	for (i = 1; i <= 5; i += 1) {
		checker = $('#point' + point + ' > .socket-count-' + i + ' > .checker');
		if (checker && checker.css('background-image') !== img) {
			return checker;
		}
	}
	return $('#point' + point + ' > .socket-count-5 > .checker');
}

function getBoardOffset(elemA) {
	var elemB = $('#board'),
		BPos = elemB.offset(),
		APos = elemA.offset();

	return {
		top: APos.top - BPos.top,
		left: APos.left - BPos.left
	};
}

function transferChecker(source, destination, img) {
	return new Promise(function (resolve, reject) {
		var pos = getBoardOffset(source),
			endPos = getBoardOffset(destination),
			freeChecker = $('#free-checker'),
			dx = (endPos.left - pos.left) * 0.01,
			dy = (endPos.top - pos.top) * 0.01,
			id;
		
		freeChecker.css('display', 'inline-block');
		freeChecker.css('background-image', img);
		freeChecker.css('top', pos.top);
		freeChecker.css('left', pos.left);
		freeChecker.css('width', source.width());
		freeChecker.css('height', source.height());

		id = setInterval(function () {
			if (Math.abs(pos.left - endPos.left) < 1 && Math.abs(pos.top - endPos.top) < 1) {
				clearInterval(id);
				destination.css('background-image', img);
				freeChecker.css('display', 'none');
				resolve();
			} else {
				pos.left += dx;
				pos.top += dy;
				freeChecker.css('top', pos.top);
				freeChecker.css('left', pos.left);
			}
		}, 1);
	});
}

function doMove(s, d, isHit, dice, currentPlayer) {
	showDice(dice);

	var source = getChecker(s),
		img = source.css('background-image'),
		destination = getFreeSpot(d, img),
		sourceNumber = getNumber(s),
		sourceCheckerCount = Number(sourceNumber.text()),
		destinationNumber = getNumber(d),
		destinationCount = Number(destinationNumber.text());
	
	if (sourceCheckerCount > 5) {
		if (sourceCheckerCount === 6) {
			sourceNumber.text('');
		} else {
			sourceNumber.text((sourceCheckerCount - 1).toString());
		}
	} else {
		source.css('background-image', 'none');
	}
	
	if (destination.css('background-image') !== 'none') {
		if (destinationCount >= 5) {
			destinationCount = destinationCount + 1;
		} else {
			destinationCount = 5;
		}
	}
	
	if (isHit) {
		return transferChecker(source, destination, img).then(function () {
			if (destinationCount > 5) {
				destinationNumber.text(destinationCount);
			}
			var opponent_img = getCheckerImage(currentPlayer === 'White' ? 'B' : 'W'), 
				bar = (currentPlayer === 'White') ? getFreeSpot('BB', opponent_img) : getFreeSpot('WB', opponent_img);
			return transferChecker(destination, bar, opponent_img);
			// todo add count for checkers on the bar !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		});
	} else {
		return transferChecker(source, destination, img).then(function () {
			if (destinationCount > 5) {
				destinationNumber.text(destinationCount);
			}
		});
	}
}

function addAction(action) {
	actions.push(action);
}

function executeAllActions() {
	if (actions.length > 0) {
		executeAction(actions[0]).then(function () {
			actions.shift();
			executeAllActions();
		});
	}
}

function executeAction(data) {
	return new Promise(function (resolve, reject) {
		if (data.action === 'move') {
			doMove(data.source, data.destination, data.hit, data.state.dice, data.state.currentPlayer).then(function () {
				if (data.last) {
					updateGame(data.uri).then(function () {
						resolve();
					});
				} else {
					resolve();
				}
			});
		} else {
			if (data.last) {
				updateGame(data.uri).then(function () {
					resolve();
				});
			} else {
				drawBoard(data.state);
				setTimeout(function () {
					resolve();
				}, 1000);
			}
		}
	});
}

function connect(host) {
	var socket = new SockJS('https://' + host + '/messages');
	stompClient = Stomp.over(socket);
	stompClient.connect({'login': USERNAME, 'passcode': PASSWORD}, function () {
		stompClient.subscribe('/user/offer', function (message) {
			if (window.confirm('Accept game?')) {
				confirmGame(message.body);
			}
			// todo reject game if not confirmed
		});
		stompClient.subscribe('/user/acceptGame', function (message) {
			updateGame(message.body);
		});
		stompClient.subscribe('/user/action', function (message) {
			var json = JSON.parse(message.body);
			addAction(json);
			if (actions.length === 1) {
				executeAllActions();
			}
		});
	});
	
	//stompClient.send('app/requestGame', player);
	//stompClient.disconnect();
}

$(document).ready(function () {
	connect(host);
	$('#new-game').click(function () { createGame(host, 'Floyd'); });
});
