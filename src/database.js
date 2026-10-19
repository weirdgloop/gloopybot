'use strict';

const path = require('node:path');
const Database = require('better-sqlite3');

const projectRoot = path.resolve(__dirname, '..');
const configuredPath = process.env.DATABASE_PATH?.trim();
const databasePath = configuredPath
  ? path.resolve(projectRoot, configuredPath)
  : path.join(projectRoot, 'deno', 'data.db');

const db = new Database(databasePath);

// These are the Deno implementation's existing tables. IF NOT EXISTS leaves
// deployed tables and their data untouched; this rewrite does not migrate them.
db.exec(`
  CREATE TABLE IF NOT EXISTS guilds (id TEXT PRIMARY KEY, mainWiki TEXT);
  CREATE TABLE IF NOT EXISTS overrides (guildID TEXT, channelID TEXT, wiki TEXT, PRIMARY KEY (guildID, channelID));
  CREATE TABLE IF NOT EXISTS userOverride (userid TEXT PRIMARY KEY, wiki TEXT);
  CREATE TABLE IF NOT EXISTS dms (id TEXT PRIMARY KEY, wiki TEXT);
`);

const statements = {
  getUserOverride: db.prepare('SELECT wiki FROM userOverride WHERE userid = ?'),
  getDMWiki: db.prepare('SELECT wiki FROM dms WHERE id = ?'),
  getChannelOverride: db.prepare('SELECT wiki FROM overrides WHERE guildID = ? AND channelID = ?'),
  getGuildChannelOverrides: db.prepare('SELECT channelID, wiki FROM overrides WHERE guildID = ? ORDER BY channelID'),
  getGuildWiki: db.prepare('SELECT mainWiki AS wiki FROM guilds WHERE id = ?'),
  setGuildWiki: db.prepare('INSERT INTO guilds (id, mainWiki) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET mainWiki = excluded.mainWiki'),
  clearGuildWiki: db.prepare('INSERT INTO guilds (id, mainWiki) VALUES (?, NULL) ON CONFLICT (id) DO UPDATE SET mainWiki = NULL'),
  setDMWiki: db.prepare('INSERT INTO dms (id, wiki) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET wiki = excluded.wiki'),
  clearDMWiki: db.prepare('DELETE FROM dms WHERE id = ?'),
  setChannelOverride: db.prepare('INSERT INTO overrides (guildID, channelID, wiki) VALUES (?, ?, ?) ON CONFLICT (guildID, channelID) DO UPDATE SET wiki = excluded.wiki'),
  deleteChannelOverride: db.prepare('DELETE FROM overrides WHERE guildID = ? AND channelID = ?'),
  setUserOverride: db.prepare('INSERT INTO userOverride (userid, wiki) VALUES (?, ?) ON CONFLICT (userid) DO UPDATE SET wiki = excluded.wiki'),
  deleteUserOverride: db.prepare('DELETE FROM userOverride WHERE userid = ?')
};

/** Choose the effective wiki in precedence order: user, channel, then server (or DM setting). */
function getDefaultWiki({ userId, guildId, channelId }) {
  const userOverride = statements.getUserOverride.get(userId)?.wiki;
  if (userOverride) return userOverride;

  if (!guildId) {
    return statements.getDMWiki.get(channelId)?.wiki;
  }

  return statements.getChannelOverride.get(guildId, channelId)?.wiki
    || statements.getGuildWiki.get(guildId)?.wiki;
}

/** Read the server-level default wiki, if one has been configured. */
function getGuildWiki(guildId) {
  return statements.getGuildWiki.get(guildId)?.wiki;
}

module.exports = {
  db,
  databasePath,
  getDefaultWiki,
  getGuildWiki,
  getDMWiki: (channelId) => statements.getDMWiki.get(channelId)?.wiki,
  getGuildChannelOverrides: (guildId) => statements.getGuildChannelOverrides.all(guildId),
  setGuildWiki: (guildId, wikiKey) => statements.setGuildWiki.run(guildId, wikiKey),
  clearGuildWiki: (guildId) => statements.clearGuildWiki.run(guildId),
  setDMWiki: (channelId, wikiKey) => statements.setDMWiki.run(channelId, wikiKey),
  clearDMWiki: (channelId) => statements.clearDMWiki.run(channelId),
  setChannelOverride: (guildId, channelId, wikiKey) => statements.setChannelOverride.run(guildId, channelId, wikiKey),
  deleteChannelOverride: (guildId, channelId) => statements.deleteChannelOverride.run(guildId, channelId),
  setUserOverride: (userId, wikiKey) => statements.setUserOverride.run(userId, wikiKey),
  deleteUserOverride: (userId) => statements.deleteUserOverride.run(userId)
};
