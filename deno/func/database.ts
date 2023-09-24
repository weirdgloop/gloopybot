import { SQLite } from '../deps.ts';

export const setupBotDatabase = (db: SQLite.DB) => {
    db.query('CREATE TABLE IF NOT EXISTS guilds (id TEXT PRIMARY KEY, mainWiki TEXT)');
	db.query('CREATE TABLE IF NOT EXISTS overrides (guildID TEXT, channelID TEXT, wiki TEXT, PRIMARY KEY (guildID, channelID))');
	db.query('CREATE TABLE IF NOT EXISTS userOverride (userid TEXT PRIMARY KEY, wiki TEXT)');
    db.query('CREATE TABLE IF NOT EXISTS dms (id TEXT PRIMARY KEY, wiki TEXT)');
}

export const migrateData = (db: SQLite.DB) => {
    db.execute(`
        PRAGMA foreign_keys=off;
        BEGIN TRANSACTION;

        ALTER TABLE guilds RENAME TO old_guilds;
        ALTER TABLE overrides RENAME TO old_overrides;
        ALTER TABLE userOverride RENAME TO old_userOverride;
        ALTER TABLE dms RENAME TO old_dms;

        CREATE TABLE guilds (id TEXT PRIMARY KEY, mainWiki TEXT);
        CREATE TABLE overrides (guildID TEXT, channelID TEXT, wiki TEXT, PRIMARY KEY (guildID,channelID));
        CREATE TABLE userOverride (userid TEXT PRIMARY KEY, wiki TEXT);
        CREATE TABLE dms (id TEXT PRIMARY KEY, wiki TEXT);

        INSERT INTO guilds SELECT * FROM old_guilds;
        INSERT INTO overrides SELECT * FROM old_overrides;
        INSERT INTO userOverride SELECT * FROM old_userOverride;
        INSERT INTO dms SELECT * FROM old_dms;

        COMMIT;
        PRAGMA foreign_keys=on;
    `);
}

export const setGuildWiki = (guildID: string, wikiKey: string, db: SQLite.DB) => {
    db.query('INSERT INTO guilds(id,mainWiki) VALUES (?,?) ON CONFLICT (id) DO UPDATE SET mainWiki=excluded.mainWiki', [guildID, wikiKey]);
}

export const getGuildWiki = (guildID: string, db: SQLite.DB) => {
    return db.query<[string]>('SELECT mainWiki FROM guilds WHERE id=?', [guildID])?.[0]?.[0] || undefined;
}

export const setDMWiki = (channelID: string, wikiKey: string, db: SQLite.DB) => {
    db.query('INSERT INTO dms(id,wiki) VALUES (?,?) ON CONFLICT (id) DO UPDATE SET wiki=excluded.wiki', [channelID, wikiKey]);
}

export const getDMWiki = (channelID: string, db: SQLite.DB) => {
    return db.query<[string]>('SELECT wiki FROM dms WHERE id=?', [channelID])?.[0]?.[0] || undefined;
}

export const setChannelOverride = (guildID: string, channelID: string, wikiKey: string, db: SQLite.DB) => {
    db.query('INSERT INTO overrides(guildID,channelID,wiki) VALUES (?,?,?) ON CONFLICT (guildID,channelID) DO UPDATE SET wiki=excluded.wiki', [guildID, channelID, wikiKey]);
}

export const getChannelOverride = (guildID: string, channelID: string, db: SQLite.DB) => {
    return db.query<[string, string]>('SELECT wiki FROM overrides WHERE guildID=? AND channelID=?', [guildID, channelID])?.[0]?.[0] || undefined;
}

export const getGuildChannelOverrides = (guildID: string, db: SQLite.DB) => {
    return db.query<[string, string]>('SELECT channelID,wiki FROM overrides WHERE guildID=?', [guildID]);
}

export const deleteChannelOverride = (guildID: string, channelID: string, db: SQLite.DB) => {
    db.query('DELETE FROM overrides WHERE guildID=? AND channelID=?', [guildID, channelID]);
}

export const setUserOverride = (userID: string, wikiKey: string, db: SQLite.DB) => {
    db.query('INSERT INTO userOverride(userid,wiki) VALUES (?,?) ON CONFLICT (userid) DO UPDATE SET wiki=excluded.wiki', [userID, wikiKey]);
}

export const getUserOverride = (userID: string, db: SQLite.DB) => {
    return db.query<[string]>('SELECT wiki FROM userOverride WHERE userid=?', [userID])?.[0]?.[0] || undefined;
}

export const deleteUserOverride = (userID: string, db: SQLite.DB) => {
    db.query('DELETE FROM userOverride WHERE userid=?', [userID]);
}