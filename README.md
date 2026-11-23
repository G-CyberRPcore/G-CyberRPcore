<div align="center">

  <img src="./assets/logo-banner.jpg" alt="G-CyberRPcore Banner" width="580" />

  # G-CyberRPcore
  ### The Definitive Modular Roleplay Framework for Cyberpunk 2077 (CyberMP)

  *Pioneering the Next Generation of Multiplayer Roleplay in Night City — Inspired by QBCore & txAdmin.*

  [![Platform: CyberMP](https://img.shields.io/badge/Platform-CyberMP%20v4.0.5%2B-00F0FF?style=for-the-badge&logo=gamepad)](https://cyber.mp)
  [![Language: JavaScript](https://img.shields.io/badge/Language-JavaScript%20ES6%2B-FCEE0A?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  [![Database: MySQL & SQLite](https://img.shields.io/badge/Database-MySQL%20%7C%20SQLite-00FF75?style=for-the-badge&logo=mysql)](https://github.com/G-CyberRPcore)
  [![Admin Panel: G--CyberAdmin](https://img.shields.io/badge/Web%20Panel-G--CyberAdmin%20:2078-FF003C?style=for-the-badge)](http://localhost:2078)
  [![License: MIT](https://img.shields.io/badge/License-MIT-white?style=for-the-badge)](https://opensource.org/licenses/MIT)

</div>

---

## ⚡ Overview & Vision

**G-CyberRPcore** is an enterprise-grade, community-driven roleplay framework engineered from the ground up specifically for **CyberMP** on REDengine (*Cyberpunk 2077*). 

Inspired by the modular decoupled architecture of FiveM's **QBCore** and the comprehensive server administration capabilities of **txAdmin**, G-CyberRPcore provides an extensible, production-ready foundation for Night City roleplay servers.

---

## 🌐 Modular Ecosystem & Repositories

G-CyberRPcore follows a decoupled, plug-and-play architecture where game systems exist as standalone, independent GitHub repositories under the **[G-CyberRPcore](https://github.com/G-CyberRPcore)** organization. Each resource contains its own `config.js` for isolated customization:

| Resource | Description | Repository |
| :--- | :--- | :--- |
| **`G-CyberRPcore`** | **Master Core Framework**: Central engine, unified DB abstraction layer, player entity classes, session manager, and the `G-CyberAdmin` web panel. | [G-CyberRPcore/G-CyberRPcore](https://github.com/G-CyberRPcore/G-CyberRPcore) |
| **`gcyber-loading`** | **Neural Loading Screen**: Immersive loading interface featuring live Web Audio API equalizer, canvas cyber-grid, server telemetry badges, and OST audio controls. | [G-CyberRPcore/gcyber-loading](https://github.com/G-CyberRPcore/gcyber-loading) |
| **`gcyber-hud`** | **Cyberpunk HUD & Metabolism**: High-tech circular SVG dials (Health, Armor, Hunger, Thirst, Stress), dynamic spatial voice waveform, and vehicle speedometer. | [G-CyberRPcore/gcyber-hud](https://github.com/G-CyberRPcore/gcyber-hud) |
| **`gcyber-multicharacter`** | **3D Multicharacter & Studio**: 4-slot playable identity selector, in-game identity termination modal, and native REDengine 3D Character Creator launcher. | [G-CyberRPcore/gcyber-multicharacter](https://github.com/G-CyberRPcore/gcyber-multicharacter) |
| **`chat`** | **Proximity Spatial Chat**: 3D spatial local speech, roleplay action commands (`/me`, `/do`, `/ooc`, `/shout`), and system broadcast notifications. | Included in CyberMP |

---

## 💾 Unified Database Abstraction Layer (DAL)

The framework features an asynchronous, driver-agnostic database layer configured via `config.js`:

* **Multi-Database Support**:
  * **MySQL / MariaDB**: Production connection pool with auto-reconnect (`mysql2/promise`). Active by default on port `3307` (or `3306`).
  * **SQLite Zero-Config Fallback**: Automatic, zero-setup failover using Node.js's built-in `node:sqlite` (`database/gcyberrp.sqlite`). If MySQL becomes unreachable, the server automatically switches to SQLite without crashing.
* **Auto-Schema Migrations**:
  The framework verifies and auto-generates all relational tables on boot:
  * `players`: Citizen ID, Steam/License, cash, bank, crypto, job, gang, metadata, inventory, clothing, position.
  * `player_vehicles`: Plate, citizen ID, model, vehicle data, garage, fuel, engine damage.
  * `player_items`: Citizen ID, inventory slot, item ID, amount, info metadata.
  * `bans`: Administrative ban records with license, IP, reason, and expiration timestamps.
  * `housing`: Instanced player apartment properties.
* **Auto-FlatFile Migrator**:
  Automatically migrates legacy flat-file JSON records (`database/players.json`) into relational SQL tables on initial startup.
* **Embedded V8 Runtime Safety**:
  Fully configured with `disableEval: true` for 100% compatibility with REDengine's embedded Node.js (`libnode.dll`) where code generation from strings is disallowed.

---

## 🖥️ G-CyberAdmin Web & Remote Management Panel (Port 2078)

Built directly into the core framework, **G-CyberAdmin** provides a high-performance, web-based server management suite accessible via browser (`http://127.0.0.1:2078`) or inside REDengine's CEF browser:

* **Live Stream Terminal**: Real-time console log streaming via Server-Sent Events (SSE) with interactive command execution (`heal`, `revive`, `kick`, `tp`, `say`, `status`).
* **Citizen Manager**: Live table of all connected citizens with ping, health, accounts, and one-click administrative actions (`[Heal]`, `[Revive]`, `[TP Home]`, `[Kick]`).
* **Resource Manager**: Live inspection of all installed server resources and runtime statuses.
* **Database Explorer**: Direct browser view of registered citizens, bank accounts, and character slots stored in the database.
* **NetWatch Aesthetic**: Cyberpunk dark carbon interface styled with neon cyan (`#00f0ff`), neon yellow (`#fcee0a`), and neon red (`#ff003c`).

---

## 🎮 Core Gameplay Mechanics & Commands

| Command / Key | Permission | Description |
| :--- | :--- | :--- |
| **`F10`** | Admin | Toggles in-game Admin Suite CEF Overlay. |
| **`/noclip`** | Admin | Toggles smooth 3D fly mode with multi-key descent (`Q`, `Ctrl`, `C`, `X`, `Z`), sprint boost (`Shift`), and out-of-bounds GodMode kill-zone immunity. |
| **`/tpm`** | Admin | Teleports instantly to the custom waypoint pinned on the Night City map (`gamemappinsMappinSystem`). |
| **`/heal [id]`** | Admin | Fully restores health to 100% and synchronizes client HUD. |
| **`/revive [id]`** | Admin | Respawns dead or downed puppets at current coordinates with full health. |
| **`/car [model]`** | Admin | Spawns an authorized vehicle model directly in front of the admin. |
| **`/dv`** | Admin | Deletes the vehicle the player is currently occupying or facing. |
| **`/char`** | Citizen | Re-opens the 4-slot Multicharacter selection screen. |
| **`/hudmenu`** | Citizen | Opens the HUD customization and widget toggling menu. |
| **`/cinematic`** | Citizen | Toggles widescreen cinematic letterbox black bars. |
| **`B`** | Citizen | Fastens or unfastens vehicle seatbelt. |

---

## ⚙️ Configuration (`config.js`)

Central configuration is managed via `config.js`:

```javascript
const Config = {};

// Database Configuration
Config.Database = {
  driver: 'mysql', // 'mysql' | 'sqlite'
  mysql: {
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '',
    database: 'gcyberrp',
    connectionLimit: 10,
    disableEval: true
  },
  sqlite: {
    filePath: path.join(process.cwd(), 'database', 'gcyberrp.sqlite')
  },
  autoMigrate: true,
  autoImportJson: true
};

// G-CyberAdmin Management Server
Config.AdminPanel = {
  enabled: true,
  host: '0.0.0.0',
  port: 2078,
  secretKey: 'cybermp2077'
};

// Default Spawns
Config.Spawns = {
  default: [-1392.6, 1271.5, 123.0], // Megabuilding H10
  hospital: [-1408.2, 1285.4, 123.0]
};
```

---

## 🚀 Quick Start for Server Owners

1. **Clone the Master Core and Resources**:
   Place resources inside your dedicated server's `resources/` directory:
   ```text
   D:\cybermpserver\resources\
   ├── G-CyberRPcore\
   ├── chat\
   ├── gcyber-loading\
   ├── gcyber-hud\
   └── gcyber-multicharacter\
   ```

2. **Configure `server.toml`**:
   Add all modular resources to the `resources` array in your `server.toml`:
   ```toml
   resources = [
     "G-CyberRPcore",
     "chat",
     "gcyber-loading",
     "gcyber-hud",
     "gcyber-multicharacter"
   ]
   ```

3. **Database Setup**:
   Ensure MySQL is running (default `127.0.0.1:3307` or configure in `config.js`). If MySQL is offline, the framework will automatically fall back to SQLite zero-config mode.

4. **Launch Server**:
   ```cmd
   .\start-server.bat
   ```
   * Game server binds to `0.0.0.0:2077` (UDP/TCP).
   * Web management panel starts on `http://127.0.0.1:2078`.

---

## 📖 Developer Documentation

For complete developer API references, function signatures, callback patterns, and event bus structures, see [**docs/API.md**](./docs/API.md).

---

## 🛡️ License

This project is licensed under the **MIT License** — open-source, permissive, and built for the CyberMP and Cyberpunk 2077 community.
