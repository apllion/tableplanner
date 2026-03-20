/**
 * Table Planer - Google Apps Script Backend
 *
 * Deploy as Web App:
 *   Execute as: Me
 *   Access: Anyone
 *
 * Script Properties (Settings > Script Properties):
 *   DISCORD_WEBHOOK_URL - (optional) Discord webhook URL for notifications
 *   PASSPHRASE_ANSWER   - (optional) passphrase new players must provide to register
 */

// -- Helpers --

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function sheetToArray(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var val = row[i];
      // Convert Date objects (time cells) to HH:MM strings
      if (val instanceof Date) {
        var hh = String(val.getHours()).padStart(2, '0');
        var mm = String(val.getMinutes()).padStart(2, '0');
        val = hh + ':' + mm;
      }
      obj[h] = val;
    });
    return obj;
  });
}

function findRowIndex(sheet, colIndex, value) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) return i + 1; // 1-based
  }
  return -1;
}

function appendRow(sheet, headers, obj) {
  var row = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

function uuid() {
  return Utilities.getUuid();
}

function now() {
  return new Date().toISOString();
}

function sendDiscord(message) {
  try {
    var url = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL');
    if (!url) return;
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ content: message }),
    });
  } catch (e) {
    Logger.log('Discord error: ' + e.message);
  }
}

// -- Sheets config --

var PLAYER_HEADERS = ['playerId', 'displayName', 'joinedAt', 'lastSeen', 'status'];
var GAME_HEADERS   = ['gameId', 'name', 'hostId', 'minPlayers', 'maxPlayers', 'maxSeats', 'status', 'createdAt', 'startedAt', 'note', 'scheduledDay', 'scheduledTime', 'table', 'endTime', 'endDay'];
var SEAT_HEADERS   = ['seatId', 'gameId', 'playerId', 'playerName', 'joinedAt', 'note', 'status'];

// -- Request handler --

function doGet(e) {
  var result;
  try {
    result = handleAction(e.parameter);
  } catch (err) {
    result = { ok: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAction(params) {
  var action = params.action;

  switch (action) {
    case 'poll':           return actionPoll();
    case 'registerPlayer': return actionRegisterPlayer(params);
    case 'heartbeat':      return actionHeartbeat(params);
    case 'createGame':     return actionCreateGame(params);
    case 'editGame':       return actionEditGame(params);
    case 'joinGame':       return actionJoinGame(params);
    case 'leaveGame':      return actionLeaveGame(params);
    case 'startGame':      return actionStartGame(params);
    case 'finishGame':     return actionFinishGame(params);
    case 'deleteGame':     return actionDeleteGame(params);
    case 'reserveSeat':    return actionReserveSeat(params);
    case 'unreserveSeat':  return actionUnreserveSeat(params);
    default:
      return { ok: false, error: 'Unknown action: ' + action };
  }
}

// -- Actions --

function actionPoll() {
  var players = sheetToArray(getSheet('Players'));
  // Update statuses based on lastSeen
  var threshold = Date.now() - 5 * 60 * 1000;
  players.forEach(function(p) {
    p.status = (new Date(p.lastSeen).getTime() > threshold) ? 'active' : 'away';
  });

  return {
    ok: true,
    data: {
      players: players,
      games: sheetToArray(getSheet('Games')),
      seats: sheetToArray(getSheet('Seats')),
    }
  };
}

function actionRegisterPlayer(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('Players');
    var rowIdx = findRowIndex(sheet, 0, p.playerId);
    var ts = now();
    if (rowIdx > 0) {
      if (p.displayName && String(p.displayName).trim().length >= 2) {
        sheet.getRange(rowIdx, 2).setValue(p.displayName);
      }
      sheet.getRange(rowIdx, 4).setValue(ts);
      sheet.getRange(rowIdx, 5).setValue('active');
      var existingName = sheet.getRange(rowIdx, 2).getValue();
      return { ok: true, displayName: existingName };
    } else {
      if (!p.displayName || String(p.displayName).trim().length < 2) {
        return { ok: false, error: 'Player not found' };
      }
      var answer = PropertiesService.getScriptProperties().getProperty('PASSPHRASE_ANSWER');
      if (answer && (!p.passphrase || String(p.passphrase).trim().toLowerCase() !== answer.trim().toLowerCase())) {
        return { ok: false, error: 'Invalid passphrase' };
      }
      appendRow(sheet, PLAYER_HEADERS, {
        playerId: p.playerId,
        displayName: p.displayName,
        joinedAt: ts,
        lastSeen: ts,
        status: 'active',
      });
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function actionHeartbeat(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('Players');
    var rowIdx = findRowIndex(sheet, 0, p.playerId);
    if (rowIdx > 0) {
      sheet.getRange(rowIdx, 4).setValue(now());
      sheet.getRange(rowIdx, 5).setValue('active');
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function actionCreateGame(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var playerSheet = getSheet('Players');
    var playerRow = findRowIndex(playerSheet, 0, p.playerId);
    if (playerRow < 0) return { ok: false, error: 'Player not found' };
    var playerData = playerSheet.getDataRange().getValues();
    var playerName = playerData[playerRow - 1][1];

    var gameId = uuid();
    var ts = now();
    var maxSeats = Number(p.maxSeats);

    appendRow(getSheet('Games'), GAME_HEADERS, {
      gameId: gameId,
      name: p.name,
      hostId: p.playerId,
      minPlayers: p.minPlayers ? Number(p.minPlayers) : '',
      maxPlayers: p.maxPlayers ? Number(p.maxPlayers) : '',
      maxSeats: maxSeats,
      status: 'waiting',
      createdAt: ts,
      startedAt: '',
      note: p.note || '',
      scheduledDay: p.scheduledDay ? Number(p.scheduledDay) : '',
      scheduledTime: p.scheduledTime || '',
      table: p.table || '',
      endTime: p.endTime || '',
      endDay: p.endDay ? Number(p.endDay) : '',
    });

    appendRow(getSheet('Seats'), SEAT_HEADERS, {
      seatId: uuid(),
      gameId: gameId,
      playerId: p.playerId,
      playerName: playerName,
      joinedAt: ts,
      note: '',
      status: 'joined',
    });

    sendDiscord('**' + playerName + '** is looking for players for **' + p.name + '** (1/' + maxSeats + ' seats)');

    return { ok: true, gameId: gameId };
  } finally {
    lock.releaseLock();
  }
}

function actionEditGame(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('Games');
    var rowIdx = findRowIndex(sheet, 0, p.gameId);
    if (rowIdx < 0) return { ok: false, error: 'Game not found' };
    var data = sheet.getDataRange().getValues();
    // hostId is column index 2 (0-based)
    if (data[rowIdx - 1][2] !== p.playerId) return { ok: false, error: 'Not the host' };

    var headers = GAME_HEADERS;
    var row = data[rowIdx - 1];
    var fields = { name: p.name, minPlayers: p.minPlayers, maxPlayers: p.maxPlayers, maxSeats: p.maxSeats, note: p.note, scheduledDay: p.scheduledDay, scheduledTime: p.scheduledTime, table: p.table, endTime: p.endTime, endDay: p.endDay };
    for (var key in fields) {
      if (fields[key] !== undefined) {
        var colIdx = headers.indexOf(key);
        if (colIdx >= 0) {
          var val = fields[key];
          if (key === 'maxSeats' || key === 'minPlayers' || key === 'maxPlayers' || key === 'scheduledDay') {
            val = val ? Number(val) : '';
          }
          sheet.getRange(rowIdx, colIdx + 1).setValue(val || '');
        }
      }
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function actionJoinGame(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var gameSheet = getSheet('Games');
    var gameRow = findRowIndex(gameSheet, 0, p.gameId);
    if (gameRow < 0) return { ok: false, error: 'Game not found' };
    var gameData = gameSheet.getDataRange().getValues();
    var gameInfo = gameData[gameRow - 1];
    // status is column index 6 (0-based)
    if (gameInfo[6] !== 'waiting') return { ok: false, error: 'Game is not waiting for players' };

    var maxSeats = Number(gameInfo[5]);
    var gameName = gameInfo[1];

    var seatSheet = getSheet('Seats');
    var allSeats = sheetToArray(seatSheet);
    var gameSeats = allSeats.filter(function(s) { return s.gameId === p.gameId; });

    if (gameSeats.some(function(s) { return s.playerId === p.playerId; })) {
      return { ok: false, error: 'Already seated' };
    }
    if (gameSeats.length >= maxSeats) {
      return { ok: false, error: 'Game is full' };
    }

    var playerSheet = getSheet('Players');
    var playerRow = findRowIndex(playerSheet, 0, p.playerId);
    if (playerRow < 0) return { ok: false, error: 'Player not found' };
    var playerName = playerSheet.getDataRange().getValues()[playerRow - 1][1];

    appendRow(seatSheet, SEAT_HEADERS, {
      seatId: uuid(),
      gameId: p.gameId,
      playerId: p.playerId,
      playerName: playerName,
      joinedAt: now(),
      note: '',
      status: 'joined',
    });

    var newCount = gameSeats.length + 1;
    sendDiscord('**' + playerName + '** joined **' + gameName + '** (' + newCount + '/' + maxSeats + ' seats)');

    if (newCount >= maxSeats) {
      sendDiscord('**' + gameName + '** is full! Waiting for host to start.');
    }

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function actionLeaveGame(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var seatSheet = getSheet('Seats');
    var data = seatSheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][1] === p.gameId && data[i][2] === p.playerId) {
        seatSheet.deleteRow(i + 1);
        break;
      }
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function actionStartGame(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('Games');
    var rowIdx = findRowIndex(sheet, 0, p.gameId);
    if (rowIdx < 0) return { ok: false, error: 'Game not found' };
    var data = sheet.getDataRange().getValues();
    // hostId is column index 2, status is column index 6
    if (data[rowIdx - 1][2] !== p.playerId) return { ok: false, error: 'Not the host' };
    if (data[rowIdx - 1][6] !== 'waiting') return { ok: false, error: 'Game is not waiting' };

    var gameName = data[rowIdx - 1][1];
    sheet.getRange(rowIdx, 7).setValue('playing');
    sheet.getRange(rowIdx, 9).setValue(now());

    var seats = sheetToArray(getSheet('Seats')).filter(function(s) { return s.gameId === p.gameId; });
    var names = seats.map(function(s) { return s.playerName; }).join(', ');
    sendDiscord('**' + gameName + '** has started with ' + names);

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function actionFinishGame(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet('Games');
    var rowIdx = findRowIndex(sheet, 0, p.gameId);
    if (rowIdx < 0) return { ok: false, error: 'Game not found' };
    var data = sheet.getDataRange().getValues();
    if (data[rowIdx - 1][2] !== p.playerId) return { ok: false, error: 'Not the host' };
    if (data[rowIdx - 1][6] !== 'playing') return { ok: false, error: 'Game is not playing' };

    var gameName = data[rowIdx - 1][1];
    sheet.getRange(rowIdx, 7).setValue('finished');

    var seats = sheetToArray(getSheet('Seats')).filter(function(s) { return s.gameId === p.gameId; });
    var names = seats.map(function(s) { return s.playerName; }).join(', ');
    sendDiscord('**' + gameName + '** finished! ' + names + ' are now free');

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function actionDeleteGame(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var gameSheet = getSheet('Games');
    var rowIdx = findRowIndex(gameSheet, 0, p.gameId);
    if (rowIdx < 0) return { ok: false, error: 'Game not found' };
    var data = gameSheet.getDataRange().getValues();
    if (data[rowIdx - 1][2] !== p.playerId) return { ok: false, error: 'Not the host' };

    gameSheet.deleteRow(rowIdx);

    // Delete all seats for this game
    var seatSheet = getSheet('Seats');
    var seatData = seatSheet.getDataRange().getValues();
    for (var i = seatData.length - 1; i >= 1; i--) {
      if (seatData[i][1] === p.gameId) {
        seatSheet.deleteRow(i + 1);
      }
    }

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function actionReserveSeat(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var gameSheet = getSheet('Games');
    var gameRow = findRowIndex(gameSheet, 0, p.gameId);
    if (gameRow < 0) return { ok: false, error: 'Game not found' };
    var gameData = gameSheet.getDataRange().getValues();

    var maxSeats = Number(gameData[gameRow - 1][5]);

    var playerSheet = getSheet('Players');
    var playerRow = findRowIndex(playerSheet, 0, p.playerId);
    if (playerRow < 0) return { ok: false, error: 'Player not found' };
    var reservedBy = playerSheet.getDataRange().getValues()[playerRow - 1][1];

    var seatSheet = getSheet('Seats');
    var allSeats = sheetToArray(seatSheet);
    var gameSeats = allSeats.filter(function(s) { return s.gameId === p.gameId; });
    if (gameSeats.length >= maxSeats) return { ok: false, error: 'Game is full' };

    appendRow(seatSheet, SEAT_HEADERS, {
      seatId: uuid(),
      gameId: p.gameId,
      playerId: '',
      playerName: p.playerName || 'Reserved',
      joinedAt: now(),
      note: 'reserved by ' + reservedBy,
      status: 'reserved',
    });

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function actionUnreserveSeat(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var seatSheet = getSheet('Seats');
    var seatRow = findRowIndex(seatSheet, 0, p.seatId);
    if (seatRow < 0) return { ok: false, error: 'Seat not found' };

    seatSheet.deleteRow(seatRow);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
