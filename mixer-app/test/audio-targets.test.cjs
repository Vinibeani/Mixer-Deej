const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isApplication, matches, merge } = require('../ui/audio-targets.js');

test('keeps protected application fallbacks visible without mixing in system controls', () => {
  assert.equal(isApplication('@process:LeagueClientUxRender'), true);
  assert.equal(isApplication('@master'), false);
  assert.equal(isApplication('@system'), false);
  assert.equal(isApplication('@device:output'), false);
});

test('matches Windows paths and process fallbacks without confusing client and game', () => {
  const client = { target: 'C:\\Riot Games\\League of Legends\\LeagueClientUxRender.exe', processName: 'LeagueClientUxRender' };
  const game = { target: 'C:\\Riot Games\\League of Legends\\Game\\League of Legends.exe', processName: 'League of Legends' };
  assert.equal(matches(client.target.toUpperCase(), client), true);
  assert.equal(matches('@process:leagueclientuxrender', client), true);
  assert.equal(matches('@process:LeagueClientUxRender', game), false);
  assert.equal(matches(client.target, game), false);
});

test('fresh sessions override catalog names and deduplicate case-insensitive paths', () => {
  const stale = { target: 'C:\\Games\\Client.exe', name: 'Old shortcut' };
  const fresh = { target: 'c:\\games\\client.exe', name: 'Client with audio' };
  const game = { target: 'C:\\Games\\Game.exe', name: 'Game with audio' };
  assert.deepEqual(merge([stale], [fresh, game, { target: '@master' }]), [fresh, game]);
});
