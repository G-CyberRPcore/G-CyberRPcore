// G-CyberRPcore - Persistent Database Layer
// Supports JSON flat-file storage and SQLite engine integration

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(process.cwd(), 'database');
const PLAYERS_FILE = path.join(DB_DIR, 'players.json');
const VEHICLES_FILE = path.join(DB_DIR, 'vehicles.json');
const HOUSING_FILE = path.join(DB_DIR, 'housing.json');

class DatabaseEngine {
  constructor() {
    this.players = new Map();
    this.vehicles = new Map();
    this.housing = new Map();
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    this.load(PLAYERS_FILE, this.players);
    this.load(VEHICLES_FILE, this.vehicles);
    this.load(HOUSING_FILE, this.housing);
    console.log(`[G-CyberRPcore DB] Ready. Indexed ${this.players.size} players, ${this.vehicles.size} vehicles.`);
  }

  load(filePath, mapTarget) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        for (const [k, v] of Object.entries(data)) {
          mapTarget.set(k, v);
        }
      }
    } catch (err) {
      console.error(`[G-CyberRPcore DB] Error loading ${filePath}:`, err);
    }
  }

  persist(filePath, mapTarget) {
    try {
      const obj = Object.fromEntries(mapTarget);
      fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[G-CyberRPcore DB] Error writing ${filePath}:`, err);
    }
  }

  // --- PLAYERS API ---
  SavePlayer(citizenid, data) {
    if (!citizenid) return;
    this.players.set(citizenid, data);
    this.persist(PLAYERS_FILE, this.players);
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

  // --- VEHICLES API ---
  SaveVehicle(plate, data) {
    if (!plate) return;
    this.vehicles.set(plate, data);
    this.persist(VEHICLES_FILE, this.vehicles);
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
    this.persist(HOUSING_FILE, this.housing);
  }

  GetHousing(houseId) {
    return this.housing.get(String(houseId)) || null;
  }
}

const db = new DatabaseEngine();
module.exports = db;
