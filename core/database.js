// G-CyberRPcore - Unified Database Abstraction Layer (DAL)
// Supports MySQL / MariaDB (Connection Pool) & SQLite (node:sqlite) with Flat-File Snapshot Backup

const fs = require('fs');
const path = require('path');

let Config;
try {
  Config = require('../config');
} catch (e) {
  Config = {
    Database: {
      driver: 'mysql',
      mysql: {
        host: '127.0.0.1',
        port: 3307,
        user: 'root',
        password: '',
        database: 'gcyberrp',
        connectionLimit: 10
      },
      sqlite: {
        filePath: path.join(process.cwd(), 'database', 'gcyberrp.sqlite')
      },
      autoMigrate: true,
      autoImportJson: true
    }
  };
}

// Locate databases directory (support running from D:\cybermpserver or D:\G-CyberRPcore)
function resolveDbFile(filename) {
  const candidateDirs = [
    path.join(process.cwd(), 'database'),
    path.join('D:\\cybermpserver', 'database'),
    path.join(__dirname, '..', 'database'),
    path.join(__dirname, '..', '..', '..', 'database')
  ];

  for (const dir of candidateDirs) {
    const full = path.join(dir, filename);
    if (fs.existsSync(full)) return full;
  }
  return path.join(process.cwd(), 'database', filename);
}

const DB_DIR = fs.existsSync(path.join('D:\\cybermpserver', 'database'))
  ? path.join('D:\\cybermpserver', 'database')
  : path.join(process.cwd(), 'database');

const PLAYERS_FILE = resolveDbFile('players.json');
const VEHICLES_FILE = resolveDbFile('vehicles.json');
const HOUSING_FILE = resolveDbFile('housing.json');

function tryParse(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

class DatabaseEngine {
  constructor() {
    this.driver = Config.Database.driver || 'mysql';
    this.mysqlPool = null;
    this.sqliteDb = null;
    this.connected = false;

    // In-memory cache for ultra-fast, synchronous lookups
    this.players = new Map();
    this.vehicles = new Map();
    this.housing = new Map();

    // Ensure database directory exists
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    // Load local JSON cache immediately so system is never empty
    this.loadFlatFiles();

    // Asynchronously initialize connection, migrations and SQL syncing
    this.initDatabase().catch(err => {
      console.error('[G-CyberRPcore DB] Unexpected init error:', err);
    });
  }

  loadFlatFiles() {
    this.loadLocalMap(PLAYERS_FILE, this.players);
    this.loadLocalMap(VEHICLES_FILE, this.vehicles);
    this.loadLocalMap(HOUSING_FILE, this.housing);
  }

  loadLocalMap(filePath, targetMap) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        for (const [k, v] of Object.entries(data)) {
          targetMap.set(k, v);
        }
      }
    } catch (err) {
      console.error(`[G-CyberRPcore DB] Error reading local file ${filePath}:`, err.message);
    }
  }

  persistFlatFiles() {
    try {
      fs.writeFileSync(PLAYERS_FILE, JSON.stringify(Object.fromEntries(this.players), null, 2), 'utf-8');
      fs.writeFileSync(VEHICLES_FILE, JSON.stringify(Object.fromEntries(this.vehicles), null, 2), 'utf-8');
      fs.writeFileSync(HOUSING_FILE, JSON.stringify(Object.fromEntries(this.housing), null, 2), 'utf-8');
    } catch (err) {
      console.error('[G-CyberRPcore DB] Error persisting backup flat files:', err.message);
    }
  }

  async initDatabase() {
    if (this.driver === 'mysql') {
      const ok = await this.initMySQL();
      if (!ok) {
        console.warn('[G-CyberRPcore DB] Switching to SQLite fallback engine...');
        this.driver = 'sqlite';
        await this.initSQLite();
      }
    } else if (this.driver === 'sqlite') {
      await this.initSQLite();
    }

    if (this.connected) {
      if (Config.Database.autoMigrate) {
        await this.runMigrations();
      }
      await this.syncFromSQL();
      if (Config.Database.autoImportJson) {
        await this.autoImportFlatJson();
      }
    }

    console.log(`[G-CyberRPcore DB] Engine operational. Driver: [${this.driver.toUpperCase()}]. Active cache: ${this.players.size} citizens, ${this.vehicles.size} vehicles.`);
  }

  async initMySQL() {
    try {
      const mysql = require('mysql2/promise');
      const cfg = Config.Database.mysql;
      this.mysqlPool = mysql.createPool({
        host: cfg.host || '127.0.0.1',
        port: cfg.port || 3307,
        user: cfg.user || 'root',
        password: cfg.password || '',
        database: cfg.database || 'gcyberrp',
        connectionLimit: cfg.connectionLimit || 10,
        waitForConnections: true,
        queueLimit: 0
      });

      // Test connectivity
      const conn = await this.mysqlPool.getConnection();
      conn.release();
      this.connected = true;
      console.log(`[G-CyberRPcore DB] Connected to MySQL on ${cfg.host}:${cfg.port} (database: ${cfg.database}).`);
      return true;
    } catch (err) {
      console.error('[G-CyberRPcore DB] MySQL Connection failed:', err.message);
      this.mysqlPool = null;
      this.connected = false;
      return false;
    }
  }

  async initSQLite() {
    try {
      const sqlitePath = Config.Database.sqlite.filePath;
      const dir = path.dirname(sqlitePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const { DatabaseSync } = require('node:sqlite');
      this.sqliteDb = new DatabaseSync(sqlitePath);
      this.connected = true;
      console.log(`[G-CyberRPcore DB] Connected to SQLite database: ${sqlitePath}`);
      return true;
    } catch (err) {
      console.error('[G-CyberRPcore DB] SQLite init error:', err.message);
      this.connected = false;
      return false;
    }
  }

  // =====================================================================
  // Schema Migrations
  // =====================================================================
  async runMigrations() {
    try {
      if (this.driver === 'mysql') {
        await this.Execute(`
          CREATE TABLE IF NOT EXISTS players (
            citizenid VARCHAR(50) PRIMARY KEY,
            owner_key VARCHAR(100) DEFAULT '',
            license VARCHAR(100) DEFAULT '',
            steam VARCHAR(100) DEFAULT '',
            name VARCHAR(100) DEFAULT '',
            slot INT DEFAULT 1,
            charinfo LONGTEXT,
            money LONGTEXT,
            job LONGTEXT,
            gang LONGTEXT,
            metadata LONGTEXT,
            inventory LONGTEXT,
            clothing LONGTEXT,
            position LONGTEXT,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await this.Execute(`
          CREATE TABLE IF NOT EXISTS player_vehicles (
            plate VARCHAR(20) PRIMARY KEY,
            citizenid VARCHAR(50) NOT NULL,
            model VARCHAR(100) NOT NULL,
            vehicle_data LONGTEXT,
            garage VARCHAR(100) DEFAULT 'apartment',
            state INT DEFAULT 1,
            fuel INT DEFAULT 100,
            engine_damage FLOAT DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_citizenid (citizenid)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await this.Execute(`
          CREATE TABLE IF NOT EXISTS player_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            citizenid VARCHAR(50) NOT NULL,
            slot INT NOT NULL,
            item_name VARCHAR(100) NOT NULL,
            amount INT DEFAULT 1,
            info LONGTEXT,
            INDEX idx_cit_slot (citizenid, slot)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await this.Execute(`
          CREATE TABLE IF NOT EXISTS bans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) DEFAULT '',
            license VARCHAR(100) DEFAULT '',
            ip VARCHAR(50) DEFAULT '',
            reason TEXT,
            banned_by VARCHAR(100) DEFAULT 'System',
            expire_timestamp BIGINT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await this.Execute(`
          CREATE TABLE IF NOT EXISTS housing (
            house_id VARCHAR(50) PRIMARY KEY,
            owner_citizenid VARCHAR(50) DEFAULT NULL,
            tier VARCHAR(50) DEFAULT 'apartment',
            data LONGTEXT,
            INDEX idx_owner (owner_citizenid)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

      } else if (this.driver === 'sqlite') {
        this.sqliteDb.exec(`
          CREATE TABLE IF NOT EXISTS players (
            citizenid TEXT PRIMARY KEY,
            owner_key TEXT DEFAULT '',
            license TEXT DEFAULT '',
            steam TEXT DEFAULT '',
            name TEXT DEFAULT '',
            slot INTEGER DEFAULT 1,
            charinfo TEXT,
            money TEXT,
            job TEXT,
            gang TEXT,
            metadata TEXT,
            inventory TEXT,
            clothing TEXT,
            position TEXT,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS player_vehicles (
            plate TEXT PRIMARY KEY,
            citizenid TEXT NOT NULL,
            model TEXT NOT NULL,
            vehicle_data TEXT,
            garage TEXT DEFAULT 'apartment',
            state INTEGER DEFAULT 1,
            fuel INTEGER DEFAULT 100,
            engine_damage REAL DEFAULT 0.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS player_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            citizenid TEXT NOT NULL,
            slot INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            amount INTEGER DEFAULT 1,
            info TEXT
          );

          CREATE TABLE IF NOT EXISTS bans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT DEFAULT '',
            license TEXT DEFAULT '',
            ip TEXT DEFAULT '',
            reason TEXT,
            banned_by TEXT DEFAULT 'System',
            expire_timestamp INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS housing (
            house_id TEXT PRIMARY KEY,
            owner_citizenid TEXT DEFAULT NULL,
            tier TEXT DEFAULT 'apartment',
            data TEXT
          );
        `);
      }
      console.log('[G-CyberRPcore DB] Schema migrations checked and verified.');
    } catch (err) {
      console.error('[G-CyberRPcore DB] Migration error:', err.message);
    }
  }

  // =====================================================================
  // SQL Execution & Query Abstractions
  // =====================================================================
  async Execute(query, params = []) {
    if (!this.connected) return null;
    try {
      if (this.driver === 'mysql' && this.mysqlPool) {
        const [result] = await this.mysqlPool.execute(query, params);
        return result;
      } else if (this.driver === 'sqlite' && this.sqliteDb) {
        const stmt = this.sqliteDb.prepare(query);
        return stmt.run(...params);
      }
    } catch (err) {
      console.error('[G-CyberRPcore DB] Execute error:', err.message, '| Query:', query);
      return null;
    }
  }

  async Fetch(query, params = []) {
    if (!this.connected) return [];
    try {
      if (this.driver === 'mysql' && this.mysqlPool) {
        const [rows] = await this.mysqlPool.query(query, params);
        return rows || [];
      } else if (this.driver === 'sqlite' && this.sqliteDb) {
        const stmt = this.sqliteDb.prepare(query);
        return stmt.all(...params) || [];
      }
    } catch (err) {
      console.error('[G-CyberRPcore DB] Fetch error:', err.message, '| Query:', query);
      return [];
    }
  }

  async FetchOne(query, params = []) {
    const rows = await this.Fetch(query, params);
    return (rows && rows.length > 0) ? rows[0] : null;
  }

  // =====================================================================
  // Synchronization & Flat-File Migration
  // =====================================================================
  async syncFromSQL() {
    try {
      const rows = await this.Fetch('SELECT * FROM players');
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const char = {
            citizenid: row.citizenid,
            ownerKey: row.owner_key || '',
            license: row.license || '',
            steam: row.steam || '',
            name: row.name || '',
            slot: Number(row.slot) || 1,
            charinfo: tryParse(row.charinfo, {}),
            money: tryParse(row.money, { cash: 5000, bank: 25000, crypto: 100 }),
            job: tryParse(row.job, { name: 'civilian', label: 'Civilian' }),
            gang: tryParse(row.gang, { name: 'none', label: 'No Gang' }),
            metadata: tryParse(row.metadata, {}),
            inventory: tryParse(row.inventory, []),
            clothing: tryParse(row.clothing, {}),
            position: tryParse(row.position, [-1392.6, 1271.5, 123.0])
          };
          this.players.set(row.citizenid, char);
        }
        console.log(`[G-CyberRPcore DB] Synchronized ${rows.length} characters from SQL to cache.`);
      }
    } catch (err) {
      console.error('[G-CyberRPcore DB] syncFromSQL error:', err.message);
    }
  }

  async autoImportFlatJson() {
    try {
      // Check if DB table has records
      const countRes = await this.FetchOne('SELECT COUNT(*) as count FROM players');
      const count = countRes ? (countRes.count || countRes['COUNT(*)'] || 0) : 0;
      if (Number(count) > 0) return; // DB already has records

      // Look for players.json
      let sourceFile = null;
      if (fs.existsSync(PLAYERS_FILE)) {
        sourceFile = PLAYERS_FILE;
      } else {
        const altFile = path.join(process.cwd(), '..', '..', 'database', 'players.json');
        if (fs.existsSync(altFile)) sourceFile = altFile;
      }

      if (!sourceFile) return;

      const raw = fs.readFileSync(sourceFile, 'utf-8');
      const data = JSON.parse(raw);
      let importedCount = 0;

      for (const [cid, char] of Object.entries(data)) {
        if (!char) continue;
        await this.upsertPlayerSQL(cid, char);
        this.players.set(cid, char);
        importedCount++;
      }

      if (importedCount > 0) {
        console.log(`[G-CyberRPcore DB] Auto-migrated ${importedCount} player profiles from ${sourceFile} into SQL table.`);
      }
    } catch (err) {
      console.error('[G-CyberRPcore DB] Error during autoImportFlatJson:', err.message);
    }
  }

  async upsertPlayerSQL(citizenid, p) {
    if (!this.connected || !citizenid) return;
    const cid = p.citizenid || citizenid;
    const owner = p.ownerKey || p.steam || p.name || '';
    const license = p.license || '';
    const steam = p.steam || '';
    const name = p.name || (p.charinfo ? `${p.charinfo.firstname || ''} ${p.charinfo.lastname || ''}`.trim() : '');
    const slot = Number(p.slot) || 1;
    const charinfo = JSON.stringify(p.charinfo || {});
    const money = JSON.stringify(p.money || {});
    const job = JSON.stringify(p.job || {});
    const gang = JSON.stringify(p.gang || {});
    const metadata = JSON.stringify(p.metadata || {});
    const inventory = JSON.stringify(p.inventory || []);
    const clothing = JSON.stringify(p.clothing || {});
    const position = JSON.stringify(p.position || []);

    try {
      if (this.driver === 'mysql') {
        const sql = `
          INSERT INTO players (citizenid, owner_key, license, steam, name, slot, charinfo, money, job, gang, metadata, inventory, clothing, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            owner_key = VALUES(owner_key),
            license = VALUES(license),
            steam = VALUES(steam),
            name = VALUES(name),
            slot = VALUES(slot),
            charinfo = VALUES(charinfo),
            money = VALUES(money),
            job = VALUES(job),
            gang = VALUES(gang),
            metadata = VALUES(metadata),
            inventory = VALUES(inventory),
            clothing = VALUES(clothing),
            position = VALUES(position);
        `;
        await this.Execute(sql, [cid, owner, license, steam, name, slot, charinfo, money, job, gang, metadata, inventory, clothing, position]);
      } else if (this.driver === 'sqlite') {
        const sql = `
          INSERT INTO players (citizenid, owner_key, license, steam, name, slot, charinfo, money, job, gang, metadata, inventory, clothing, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(citizenid) DO UPDATE SET
            owner_key = excluded.owner_key,
            license = excluded.license,
            steam = excluded.steam,
            name = excluded.name,
            slot = excluded.slot,
            charinfo = excluded.charinfo,
            money = excluded.money,
            job = excluded.job,
            gang = excluded.gang,
            metadata = excluded.metadata,
            inventory = excluded.inventory,
            clothing = excluded.clothing,
            position = excluded.position;
        `;
        await this.Execute(sql, [cid, owner, license, steam, name, slot, charinfo, money, job, gang, metadata, inventory, clothing, position]);
      }
    } catch (err) {
      console.error(`[G-CyberRPcore DB] Error upserting player ${cid}:`, err.message);
    }
  }

  // =====================================================================
  // High-Level Synchronous API (Full Backward Compatibility)
  // =====================================================================
  SavePlayer(citizenid, data) {
    if (!citizenid) return;
    this.players.set(citizenid, data);
    this.persistFlatFiles();
    this.upsertPlayerSQL(citizenid, data).catch(err => {
      console.error(`[G-CyberRPcore DB] Background save failed for ${citizenid}:`, err.message);
    });
  }

  GetPlayerByCitizenId(citizenid) {
    return this.players.get(citizenid) || null;
  }

  GetPlayerByName(name) {
    for (const p of this.players.values()) {
      if (p.name === name) return p;
    }
    return null;
  }

  GetCharactersForPlayer(playerKey, playerId) {
    const list = [];
    for (const [cid, data] of this.players.entries()) {
      if (!data) continue;
      if (data.ownerKey === playerKey || data.name === playerKey || (playerId !== undefined && data.id === playerId)) {
        list.push(data);
      }
    }
    return list;
  }

  DeletePlayer(citizenid) {
    if (this.players.has(citizenid)) {
      this.players.delete(citizenid);
      this.persistFlatFiles();
      this.Execute('DELETE FROM players WHERE citizenid = ?', [citizenid]).catch(err => {
        console.error(`[G-CyberRPcore DB] DeletePlayer SQL failed for ${citizenid}:`, err.message);
      });
      return true;
    }
    return false;
  }

  // --- VEHICLES API ---
  SaveVehicle(plate, data) {
    if (!plate) return;
    this.vehicles.set(plate, data);
    this.persistFlatFiles();

    if (this.connected) {
      const cid = data.citizenid || '';
      const model = data.model || '';
      const vdata = JSON.stringify(data.vehicle_data || data);
      const garage = data.garage || 'apartment';
      const state = (data.state !== undefined) ? Number(data.state) : 1;
      const fuel = (data.fuel !== undefined) ? Number(data.fuel) : 100;
      const engine = (data.engine_damage !== undefined) ? Number(data.engine_damage) : 0.0;

      if (this.driver === 'mysql') {
        const sql = `
          INSERT INTO player_vehicles (plate, citizenid, model, vehicle_data, garage, state, fuel, engine_damage)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            citizenid = VALUES(citizenid),
            model = VALUES(model),
            vehicle_data = VALUES(vehicle_data),
            garage = VALUES(garage),
            state = VALUES(state),
            fuel = VALUES(fuel),
            engine_damage = VALUES(engine_damage);
        `;
        this.Execute(sql, [plate, cid, model, vdata, garage, state, fuel, engine]).catch(() => {});
      } else if (this.driver === 'sqlite') {
        const sql = `
          INSERT INTO player_vehicles (plate, citizenid, model, vehicle_data, garage, state, fuel, engine_damage)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(plate) DO UPDATE SET
            citizenid = excluded.citizenid,
            model = excluded.model,
            vehicle_data = excluded.vehicle_data,
            garage = excluded.garage,
            state = excluded.state,
            fuel = excluded.fuel,
            engine_damage = excluded.engine_damage;
        `;
        this.Execute(sql, [plate, cid, model, vdata, garage, state, fuel, engine]).catch(() => {});
      }
    }
  }

  GetPlayerVehicles(citizenid) {
    const list = [];
    for (const v of this.vehicles.values()) {
      if (v.citizenid === citizenid) list.push(v);
    }
    return list;
  }

  // --- HOUSING API ---
  SaveHousing(houseId, data) {
    if (!houseId) return;
    this.housing.set(String(houseId), data);
    this.persistFlatFiles();
  }

  GetHousing(houseId) {
    return this.housing.get(String(houseId)) || null;
  }

  GetStats() {
    return {
      driver: this.driver,
      connected: this.connected,
      playersCount: this.players.size,
      vehiclesCount: this.vehicles.size,
      housingCount: this.housing.size
    };
  }
}

const db = new DatabaseEngine();
module.exports = db;
