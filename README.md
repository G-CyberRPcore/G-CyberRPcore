<div align="center">

  <img src="./assets/logo.svg" alt="G-CyberRPcore Logo" width="320" />

  # G-CyberRPcore

  **The Definitive, Modular Roleplay Framework for Cyberpunk 2077 (CyberMP)**
  
  *Pioneering the Next Generation of Multiplayer Roleplay in Night City — Inspired by QBCore.*

  [![Platform: CyberMP](https://img.shields.io/badge/Platform-CyberMP%20v4.0%2B-00F0FF?style=for-the-badge&logo=gamepad)](https://cyber.mp)
  [![Language: JavaScript](https://img.shields.io/badge/Language-JavaScript%20ES6%2B-FCEE0A?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  [![Architecture: QBCore](https://img.shields.io/badge/Architecture-QBCore%20Standard-FF003C?style=for-the-badge)](https://github.com/G-CyberRPcore)
  [![License: MIT](https://img.shields.io/badge/License-MIT-white?style=for-the-badge)](https://opensource.org/licenses/MIT)

</div>

---

## ⚡ What is G-CyberRPcore?

**G-CyberRPcore** is an ambitious, community-driven roleplay framework engineered from the ground up specifically for the newly released **CyberMP** multiplayer mod for *Cyberpunk 2077*.

Drawing heavy inspiration from **QBCore** (the industry-standard FiveM framework), G-CyberRPcore provides a comprehensive, production-ready, and extensible foundation for server developers.

---

## 💎 Features

* **Unified `PlayerData` Structure:** Every connected citizen possesses persistent identity data (`citizenid`, `charinfo`, `money`, `job`, `gang`, `metadata`, and `inventory`).
* **Universal Callback Engine:** Native support for asynchronous Request/Response handling (`CreateCallback` / `TriggerCallback`) across Server, Client, and CEF.
* **150+ Cyberpunk Items:** Giant pre-configured item library (`Shared.Items`) containing medical stims, weapons, ammo, cyberware operating systems (Sandevistan, Cyberdecks), tools, and consumables.
* **Multi-Tier Careers & Factions:** Fully structured legal careers (`Shared.Jobs`) such as NCPD, Trauma Team, Ripperdocs, and Delamain Taxi with grades, salaries, and on-duty toggles.
* **Night City Gangs & Syndicates:** Built-in gang system (`Shared.Gangs`) covering the Valentinos, Maelstrom, Tyger Claws, The Mox, 6th Street, and Aldecaldos.
* **80+ Vehicle Catalog:** Pre-indexed vehicle library with TweakDB IDs, CName appearance skins, trunk weight limits, and showroom pricing.
* **Virtual Dimensions Housing:** Zero-collision instanced apartments utilizing CyberMP's native dimensions (`player.dimension`).
* **Zero Boilerplate:** Extend the framework with your own modules using clean exports.

---

## 🏗️ Architecture

```mermaid
flowchart LR
    G_CyberCore["⚡ G_CyberCore (Singleton)"]
    
    subgraph CoreComponents["Core Engine"]
        Player["👤 PlayerData & Functions"]
        DB["💾 Persistent DB"]
        Callbacks["🔄 Async Callbacks"]
        Commands["⌨️ Permission Commands"]
    end

    subgraph Registries["Shared Registries"]
        Items["📦 150+ Items"]
        Jobs["💼 Multi-Tier Jobs"]
        Gangs["💀 Gang Syndicates"]
        Vehicles["🚗 80+ Vehicles"]
    end

    G_CyberCore --> CoreComponents
    G_CyberCore --> Registries
```

---

## 🚀 Quick Start for Server Owners

1. Place `G-CyberRPcore` inside your server's `resources` directory:
   ```text
   resources/
   └── G-CyberRPcore/
   ```
2. Enable it in your `server.toml`:
   ```toml
   resources = [
     "G-CyberRPcore"
   ]
   ```
3. Run your CyberMP Server:
   ```powershell
   .\cybermp-server.exe -run
   ```

---

## 📖 Developer Documentation

For complete function signatures, player methods, callback usage, and event structures, see [**docs/API.md**](./docs/API.md).

---

## 🛡️ License

This project is licensed under the **MIT License** — open-source, permissive, and built for the community.
