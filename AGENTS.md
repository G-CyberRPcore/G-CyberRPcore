# G-CyberRPcore - Agent Memory & Architectural Guide

> **Important**: This document serves as the persistent architectural reference and project memory for the AI Agent across all sessions. It documents the implemented systems, master framework structure, native CyberMP conventions, and roadmap for **`G-CyberRPcore`**.

---

## 🎯 1. Vision & Master Architecture

- **Project Name:** **`G-CyberRPcore`**
- **Goal:** Develop the definitive, modular, enterprise-grade Roleplay Framework for **Cyberpunk 2077** running on the **CyberMP** multiplayer platform.
- **Reference Standard:** Faithfully models the architectural patterns, paradigms, and functionality of **QBCore** (FiveM's leading framework), adapted natively for REDengine and Night City.
- **Official GitHub Organization:** [https://github.com/G-CyberRPcore](https://github.com/G-CyberRPcore)
  - Organization Profile: [`G-CyberRPcore/.github`](https://github.com/G-CyberRPcore/.github)
  - Core Framework Repository: [`G-CyberRPcore/G-CyberRPcore`](https://github.com/G-CyberRPcore/G-CyberRPcore)

---

## 📁 2. Workspace & Environment Layout

| Path | Purpose |
| :--- | :--- |
| `D:\cybermpserver` | Dedicated CyberMP runtime server (Port 2077 TCP/UDP, version v4.0.4-beta.1). |
| `D:\G-CyberRPcore` | Primary Git source repository for the framework connected to GitHub. |
| `E:\ProgramData\cybermp` | CyberMP Client Launcher installation. |
| `E:\SteamLibrary\steamapps\common\Cyberpunk 2077` | Cyberpunk 2077 game directory. |
| `D:\G-CyberRPcore\assets\logo.svg` & `logo.jpg` | Official 3D visual logo and brand assets for G-CyberRPcore. |

---

## 🏛️ 3. Core Architectural Subsystems

The framework operates under a unified global singleton: `global.G_CyberCore`.

### A. Core Engine (`core/`):
1. **`core/index.js`**: Primary entry point and singleton controller tying players, events, and persistent storage together.
2. **`core/player.js`**: Comprehensive `PlayerData` structure:
   - `citizenid`: Unique citizen identifier (e.g. `NC-481924`).
   - `charinfo`: First and last name, birthdate, gender, backstory.
   - `money`: Wallets for `cash`, `bank`, and `crypto`.
   - `job`: Career, grade, salary, on-duty state (`onDuty`).
   - `gang`: Affiliation (Valentinos, Maelstrom, Tyger Claws, The Mox) and gang rank.
   - `metadata`: `hunger`, `thirst`, `armor`, `stress`, and `cyberpsychosis` load.
   - `inventory`: Weight-based inventory array (120 kg max capacity).
   - Functions: `AddMoney`, `RemoveMoney`, `SetJob`, `SetJobDuty`, `AddItem`, `RemoveItem`, `SetMetaData`, `SyncHUD`.
3. **`core/callbacks.js`**: Asynchronous server-client RPC engine (`CreateCallback` / `TriggerCallback`).
4. **`core/commands.js`**: Permission-based command router (`admin`, `mod`, `user`).

### B. Master Unified CEF Layer (`ui/`):
CyberMP maintains a single active CEF browser instance. All visual layers are composed into a unified Single Page Application (SPA):
1. **`#view-loading`**:
   - Web Audio API equalizer visualizer connected to the official soundtrack `G-CyberRPcore-Loading.mp3`.
   - 5 interactive tabs: Overview, Directives (Server Rules), Neural Keybinds, System Changelog, Network & Community.
   - Status ticker, progress bar, and "JACK IN // ENTER NIGHT CITY" action trigger.
2. **`#view-multicharacter`**:
   - 4-slot citizen roster grid with live metadata (Name, CitizenID, Job, Bank, Cash, Life Path badge).
   - Identity selection and delete confirmation dialogs.
3. **`#view-creator`**:
   - 4-stage wizard: Identity & Life Path, Facial Structure & Genetics, Cyberware Implants, Apparel & Outfits.
   - Real-time holographic character card preview.
4. **`#view-hud`**:
   - Hexagonal status dials: Health, Armor, Stamina, Cyberware Strain.
   - Cash and bank balance displays, career badge, proximity voice indicator.
   - Realistic vehicle telemetry HUD: Speedometer, dynamic RPM, gear indicator, functional seatbelt.
5. **`#view-chat`**:
   - Spatial proximity chat (15-meter radius).
   - Roleplay commands: `/me`, `/do`, `/ooc`, `/shout`, `/whisper`, `/tweet`, `/dispatch`.
6. **`#view-admin`**:
   - Player management: Teleport to, Bring, Freeze, Revive, Heal, Give Money, Set Job, Kick.
   - Self privileges: Godmode invincibility, Noclip free-flight, Invisibility, Infinite Stamina.
   - Quick district teleports: Corpo Plaza, Megabuilding H10, Afterlife, Pacifica Pier, Santo Domingo, Badlands Camp, Arasaka Tower Roof.
   - Vehicle spawner and utilities: Quadra Turbo-R, Rayfield Caliburn, Arch Nazaré, NCPD Cruiser, Trauma Team Ambulance.
   - Environment controls: Weather and time manipulation, holographic announcements.
   - Developer tools: Real-time Vector4 coordinates with one-click clipboard copy.

---

## ⚡ 4. Native CyberMP Engine Protocols & Conventions

- **CEF URL Configuration:**
  Configured in `resource.toml` as `cef_url = "./ui/index.html"` and mounted via `mp.cef.setUrl('./ui/index.html')`.
- **Engine Key Handling:**
  In CyberMP, native key detection uses:
  ```javascript
  mp.game.onInputKeyEvent((action, key) => {
    // action: 1 = IACT_Press
    // key: 121 = IK_F10 (Admin Menu)
    // key: 84  = IK_T   (Chat Input)
    // key: 66  = IK_B   (Seatbelt Toggle)
  });
  ```
- **Client Commands Callback Signature:**
  `mp.commands.add(commandName, (id: number, args: string[]) => void)`
  *(The first parameter is always the caller ID; arguments array is the second parameter).*
- **Process & Port Rules:**
  Port 2077 must remain unblocked. Before starting the server, verify no background instances hold the port to prevent `EADDRINUSE`.
- **Language Mandate:**
  All scripts, UI HTML, CSS, JavaScript, and user-facing notices MUST remain 100% in English. Localization systems will hook in dynamically based on client settings.
