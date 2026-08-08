/**
 * 棕熊營系統 - 闖關進度資料庫（Google Apps Script + Spreadsheet）
 *
 * 部署：部署 → 新增部署作業 → 類型選「網頁應用程式」
 * 執行身分：我
 * 存取權限：任何人
 * 部署後把網址貼到 Next.js 的 GAS_WEB_APP_URL
 */

var EVENT_ID = 'event-brown-bear-2026-main';
var EVENT_NAME = '棕熊營闖關活動';

/** 正式關卡（非雨備） */
var STATIONS = [
  { id: 'station-1', order: 1, name: '龍門營地跳塔', shortName: '跳塔', requiresTreasureCode: false },
  { id: 'station-2', order: 2, name: '血跡尋寶', shortName: '血跡尋寶', requiresTreasureCode: false },
  { id: 'station-3', order: 3, name: '創意鑰匙圈手作', shortName: '鑰匙圈', requiresTreasureCode: false },
  { id: 'station-4', order: 4, name: '神力布袋球積分賽', shortName: '布袋球', requiresTreasureCode: false },
  { id: 'station-5', order: 5, name: '植物書籤', shortName: '植物書籤', requiresTreasureCode: false },
  { id: 'station-6', order: 6, name: '蒙眼漫步', shortName: '蒙眼漫步', requiresTreasureCode: false },
  { id: 'station-7', order: 7, name: '捲捲棒棒糖', shortName: '棒棒糖', requiresTreasureCode: false },
  { id: 'station-8', order: 8, name: '快問快答', shortName: '快問快答', requiresTreasureCode: false }
];

var EMBLEMS = ['黑', '灰', '藍', '紅', '棕', '黃'];

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    ensureSpreadsheet_();
    var params = (e && e.parameter) || {};
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        body = {};
      }
    }

    var action = body.action || params.action || '';
    var teamId = body.teamId || params.teamId;
    var stationId = body.stationId || params.stationId;
    var status = body.status || params.status;
    var code = body.code || params.code || '';
    var treasureCode = body.treasureCode || params.treasureCode || '';

    if (action === 'bootstrap') {
      return json_(listBootstrap_());
    }
    if (action === 'team') {
      var progress = getTeamProgress_(teamId);
      if (!progress) return json_({ error: '找不到小隊' }, 404);
      return json_(progress);
    }
    if (action === 'lock') {
      return json_(lockStation_(stationId));
    }
    if (action === 'checkIn') {
      return json_(checkInTeam_(teamId, stationId));
    }
    if (action === 'treasure') {
      return json_(verifyTreasureCode_(stationId, code));
    }
    if (action === 'complete') {
      return json_(recordAttempt_(teamId, stationId, status, treasureCode));
    }
    if (action === 'undo') {
      return json_(undoAttempt_(teamId, stationId));
    }
    if (action === 'reset') {
      return json_(resetDb_());
    }

    return json_({
      ok: true,
      service: 'Brown Bear Camp System',
      hint: 'Use action=bootstrap|team|lock|checkIn|treasure|complete|undo|reset'
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) }, 500);
  }
}

function json_(obj, status) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getTeams_() {
  return EMBLEMS.map(function (emblem, index) {
    var n = index + 1;
    return {
      id: 'team-' + (n < 10 ? '0' + n : String(n)),
      name: emblem + '小隊',
      eventId: EVENT_ID,
      emblem: emblem
    };
  });
}

function getStations_() {
  return STATIONS.map(function (s) {
    return Object.assign({ eventId: EVENT_ID }, s);
  });
}

function getGameMasters_() {
  return STATIONS.map(function (s) {
    return {
      id: 'gm-' + s.order,
      name: '第' + s.order + '關關主',
      stationId: s.id
    };
  });
}

function ensureSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  if (id) {
    try {
      SpreadsheetApp.openById(id);
      return id;
    } catch (e) {
      // recreate below
    }
  }

  var ss = SpreadsheetApp.create('棕熊營闖關進度資料庫（正式）');
  props.setProperty('SHEET_ID', ss.getId());

  var attempts = ss.getActiveSheet();
  attempts.setName('Attempts');
  attempts.getRange(1, 1, 1, 6).setValues([['id', 'eventId', 'teamId', 'stationId', 'status', 'createdAt']]);

  var meta = ss.insertSheet('Meta');
  meta.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  meta.appendRow(['eventId', EVENT_ID]);
  meta.appendRow(['eventName', EVENT_NAME]);
  meta.appendRow(['createdAt', new Date().toISOString()]);

  return ss.getId();
}

function getSs_() {
  var id = ensureSpreadsheet_();
  return SpreadsheetApp.openById(id);
}

function getAttemptsSheet_() {
  var ss = getSs_();
  var sheet = ss.getSheetByName('Attempts');
  if (!sheet) {
    sheet = ss.insertSheet('Attempts');
    sheet.getRange(1, 1, 1, 6).setValues([['id', 'eventId', 'teamId', 'stationId', 'status', 'createdAt']]);
  }
  return sheet;
}

function readAttempts_() {
  var sheet = getAttemptsSheet_();
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r[0]) continue;
    rows.push({
      id: String(r[0]),
      eventId: String(r[1]),
      teamId: String(r[2]),
      stationId: String(r[3]),
      status: String(r[4]),
      createdAt: String(r[5])
    });
  }
  return rows;
}

function normalizeStatus_(status) {
  if (status === 'pass' || status === 'success' || status === '通過') return 'pass';
  if (status === 'fail' || status === 'failed' || status === '不通過') return 'fail';
  return null;
}

function getStationState_(attempts, eventId, teamId, stationId) {
  var related = attempts
    .filter(function (a) {
      return a.eventId === eventId && a.teamId === teamId && a.stationId === stationId;
    })
    .sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

  if (!related.length) return 'pending';
  var latest = normalizeStatus_(related[0].status);
  return latest || 'pending';
}

function listBootstrap_() {
  return {
    event: { id: EVENT_ID, name: EVENT_NAME },
    teams: getTeams_(),
    stations: getStations_(),
    gameMasters: getGameMasters_()
  };
}

function getTeamProgress_(teamId) {
  var team = getTeams_().filter(function (t) { return t.id === teamId; })[0];
  if (!team) return null;

  var attempts = readAttempts_();
  var stations = getStations_();
  var progress = stations.map(function (station) {
    return {
      stationId: station.id,
      order: station.order,
      name: station.name,
      shortName: station.shortName,
      state: getStationState_(attempts, team.eventId, team.id, station.id)
    };
  });

  var passCount = progress.filter(function (p) { return p.state === 'pass'; }).length;
  var judgedCount = progress.filter(function (p) { return p.state !== 'pending'; }).length;

  return {
    event: { id: EVENT_ID, name: EVENT_NAME },
    team: team,
    progress: progress,
    judgedCount: judgedCount,
    passCount: passCount,
    totalStations: stations.length
  };
}

function lockStation_(stationId) {
  var station = getStations_().filter(function (s) { return s.id === stationId; })[0];
  if (!station) return { ok: false, reason: '找不到關卡' };
  var gm = getGameMasters_().filter(function (g) { return g.stationId === stationId; })[0];
  return {
    ok: true,
    station: station,
    gameMaster: gm,
    event: { id: EVENT_ID, name: EVENT_NAME }
  };
}

function resolveTeam_(query) {
  var q = String(query || '').trim();
  if (!q) return null;
  var list = getTeams_();
  var byId = list.filter(function (t) { return t.id === q; })[0];
  if (byId) return byId;
  var byEmblem = list.filter(function (t) { return t.emblem === q; })[0];
  if (byEmblem) return byEmblem;
  var byName = list.filter(function (t) {
    return t.name === q || t.name === q + '小隊';
  })[0];
  return byName || null;
}

function checkInTeam_(teamId, stationId) {
  var team = resolveTeam_(teamId);
  var station = getStations_().filter(function (s) { return s.id === stationId; })[0];
  if (!team) return { ok: false, reason: '找不到小隊' };
  if (!station) return { ok: false, reason: '找不到關卡' };

  var state = getStationState_(readAttempts_(), team.eventId, team.id, station.id);
  if (state !== 'pending') {
    return {
      ok: true,
      canJudge: false,
      reason: '已完成，不重複計算',
      team: team,
      station: station,
      state: state,
      requiresTreasureCode: !!station.requiresTreasureCode
    };
  }

  return {
    ok: true,
    canJudge: true,
    team: team,
    station: station,
    state: state,
    requiresTreasureCode: !!station.requiresTreasureCode
  };
}

function verifyTreasureCode_(stationId, code) {
  var station = getStations_().filter(function (s) { return s.id === stationId; })[0];
  if (!station) return { ok: false, reason: '找不到關卡' };
  if (!station.requiresTreasureCode) return { ok: true };
  if (String(code).trim().toUpperCase() !== String(station.treasureCode || '').toUpperCase()) {
    return { ok: false, reason: '寶物 Code 不正確' };
  }
  return { ok: true };
}

function recordAttempt_(teamId, stationId, status, treasureCode) {
  var team = getTeams_().filter(function (t) { return t.id === teamId; })[0];
  var station = getStations_().filter(function (s) { return s.id === stationId; })[0];
  if (!team || !station) return { ok: false, reason: '小隊或關卡不存在' };

  var normalized = normalizeStatus_(status);
  if (!normalized) return { ok: false, reason: '狀態無效' };

  var current = getStationState_(readAttempts_(), team.eventId, team.id, station.id);
  if (current !== 'pending') return { ok: false, reason: '已完成，不重複計算' };

  if (station.requiresTreasureCode && normalized === 'pass') {
    var verified = verifyTreasureCode_(station.id, treasureCode || '');
    if (!verified.ok) return { ok: false, reason: verified.reason || '寶物 Code 驗證失敗' };
  }

  var attempt = {
    id: Utilities.getUuid(),
    eventId: team.eventId,
    teamId: team.id,
    stationId: station.id,
    status: normalized,
    createdAt: new Date().toISOString()
  };

  getAttemptsSheet_().appendRow([
    attempt.id,
    attempt.eventId,
    attempt.teamId,
    attempt.stationId,
    attempt.status,
    attempt.createdAt
  ]);

  return { ok: true, attempt: attempt };
}

function undoAttempt_(teamId, stationId) {
  var team = getTeams_().filter(function (t) { return t.id === teamId; })[0];
  var station = getStations_().filter(function (s) { return s.id === stationId; })[0];
  if (!team || !station) return { ok: false, reason: '小隊或關卡不存在' };

  var sheet = getAttemptsSheet_();
  var values = sheet.getDataRange().getValues();
  var removed = 0;
  // 由下往上刪，避免列號位移
  for (var i = values.length - 1; i >= 1; i--) {
    var r = values[i];
    if (
      String(r[1]) === team.eventId &&
      String(r[2]) === team.id &&
      String(r[3]) === station.id
    ) {
      sheet.deleteRow(i + 1);
      removed++;
    }
  }

  return {
    ok: true,
    removed: removed,
    team: team,
    station: station,
    state: 'pending'
  };
}

function resetDb_() {
  var sheet = getAttemptsSheet_();
  var last = sheet.getLastRow();
  if (last > 1) {
    sheet.getRange(2, 1, last, 6).clearContent();
  }
  return { ok: true, teams: getTeams_().length, stations: getStations_().length };
}

/** 手動執行：建立／確認試算表 */
function setupDatabase() {
  var id = ensureSpreadsheet_();
  Logger.log('Spreadsheet ID: ' + id);
  Logger.log('URL: https://docs.google.com/spreadsheets/d/' + id);
}
