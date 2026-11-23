// G-CyberRPcore - Central Configuration File
// Inspired by QBCore & txAdmin configuration architecture

const path = require('path');

const Config = {};

// =====================================================================
// 1. General Framework Settings
// =====================================================================
Config.Server = {
  name: 'G-CyberRP Night City',
  version: '1.0.0',
  debug: true,
  locale: 'en', // 'en' or 'ar'
  saveIntervalMs: 120000 // Autosave players to DB every 2 minutes
};

// =====================================================================
// 2. Database Abstraction Layer (DAL) Configuration
// =====================================================================
// Supported drivers: 'mysql' (Local/Remote MySQL/MariaDB) or 'sqlite' (Zero-config embedded)
Config.Database = {
  driver: 'mysql', // Active driver: 'mysql' | 'sqlite'
  
  // MySQL / MariaDB connection parameters (Local server active on port 3307)
  mysql: {
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '',
    database: 'gcyberrp',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: 10000,
    disableEval: true // Required for embedded V8 / libnode environments
  },

  // SQLite parameters (Fallback / Zero-config mode)
  sqlite: {
    filePath: path.join(process.cwd(), 'database', 'gcyberrp.sqlite')
  },

  // Auto-schema creation on server boot
  autoMigrate: true,

  // Automatically import data from flat-file (database/players.json) if SQL table is empty
  autoImportJson: true
};

// =====================================================================
// 3. G-CyberAdmin Web & Remote Management Panel (txAdmin Alternative)
// =====================================================================
Config.AdminPanel = {
  enabled: true,
  host: '0.0.0.0',
  port: 2078,
  secretKey: 'cybermp2077', // Admin API / Session Secret
  title: 'G-CyberAdmin - Night City Grid Management',
  theme: 'cyberpunk-neon', // Dark cyber carbon with neon cyan & yellow accents
  logBufferSize: 250 // Max recent console log lines kept in memory for SSE stream
};

// =====================================================================
// 4. Default Economy & Player Identity
// =====================================================================
Config.Economy = {
  startingMoney: {
    cash: 5000,
    bank: 25000,
    crypto: 100
  },
  paycheckIntervalMs: 600000 // 10 minutes
};

// =====================================================================
// 5. World Spawns & Dimensions
// =====================================================================
Config.Spawns = {
  // Megabuilding H10 Atrium Hallway (Watson, Little China - open walkway, elevators, shops)
  default: [-1382.0, 1272.0, 123.0],
  // Trauma Team Medical Center / Hospital Respawn
  hospital: [-1408.2, 1285.4, 123.0]
};

// =====================================================================
// 6. Administrative Permissions
// =====================================================================
Config.Permissions = {
  defaultAdmins: [0, 1] // Player IDs granted full administrative rights by default
};

module.exports = Config;
