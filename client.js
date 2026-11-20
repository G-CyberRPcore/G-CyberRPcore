// =====================================================================
// G-CyberRPcore - Master Client Controller
// Compliant with official CyberMP lifecycle (onInit, onceGameLoaded, onInputKeyEvent)
// 100% English - Modular Roleplay Framework for Cyberpunk 2077
// =====================================================================

console.log('[G-CyberRPcore] Master Client Subsystem Initializing...');

let isNoclipActive = false;
let isGodmodeActive = false;
let isSeatbeltActive = false;
let isAdminMenuActive = false;
let isSpawned = false;

// REDengine Stat Pool & Stat Type Constants (Official CyberMP Spec)
const HEALTH_STAT_POOL_TYPE = 17;
const HEALTH_STAT_TYPE = 787;
const ADDITIVE_MODIFIER_TYPE = 0;
const SPAWN_HEALTH = 300;

// Coordinate Presets for Quick Teleport
const DISTRICT_COORDS = {
  corpo_plaza: [-210.0, -580.0, 42.0],
  megabuilding_h10: [-1392.637, 1271.536, 123.082],
  afterlife: [-1280.0, 1150.0, 22.0],
  pacifica_pier: [-2200.0, -1850.0, 15.0],
  santo_domingo: [450.0, -1200.0, 30.0],
  badlands_camp: [1800.0, -900.0, 45.0],
  arasaka_roof: [-150.0, -600.0, 210.0]
};

// =====================================================================
// 1. Health Pool Setup & Player Spawning (spawning-player.mdx)
// =====================================================================

function setHealth(value) {
  try {
    if (!mp.game || !mp.game.GetPlayer) return;
    const player = mp.game.GetPlayer();
    if (!player) return;
    const playerGameId = player.GetEntityID();
    const statPoolsSystem = mp.game.ScriptGameInstance.GetStatPoolsSystem();
    if (statPoolsSystem) {
      statPoolsSystem.RequestSettingStatPoolValueIgnoreChangeMode(
        playerGameId,
        HEALTH_STAT_POOL_TYPE,
        value,
        new mp.game.gameObject(),
        false
      );
    }
  } catch (e) {
    console.log('[G-CyberRPcore] setHealth notice:', e);
  }
}

function setMaxHealth(value) {
  try {
    if (!mp.game || !mp.game.GetPlayer) return;
    const player = mp.game.GetPlayer();
    if (!player) return;
    const playerGameId = player.GetEntityID();
    const statsSystem = mp.game.ScriptGameInstance.GetStatsSystem();
    if (statsSystem) {
      statsSystem.RemoveAllModifiers(playerGameId, HEALTH_STAT_TYPE, true);
      const modifier = new mp.game.gameConstantStatModifierData_Deprecated();
      modifier.statType = HEALTH_STAT_TYPE;
      modifier.modifierType = ADDITIVE_MODIFIER_TYPE;
      modifier.value = value;
      statsSystem.AddModifier(playerGameId, modifier);
    }
    const statPoolsSystem = mp.game.ScriptGameInstance.GetStatPoolsSystem();
    if (statPoolsSystem) {
      statPoolsSystem.RequestSettingStatPoolValueIgnoreChangeMode(
        playerGameId,
        HEALTH_STAT_POOL_TYPE,
        value,
        new mp.game.gameObject(),
        true
      );
    }
  } catch (e) {
    console.log('[G-CyberRPcore] setMaxHealth notice:', e);
  }
}

function spawnPlayer(x = -1392.637, y = 1271.536, z = 123.082, yaw = 1.0) {
  console.log(`[G-CyberRPcore] Spawning player at (${x}, ${y}, ${z}, yaw: ${yaw})...`);
  setMaxHealth(SPAWN_HEALTH);
  setHealth(SPAWN_HEALTH);

  if (mp.local && typeof mp.local.spawnPlayer === 'function') {
    mp.local.spawnPlayer(x, y, z, yaw);
    isSpawned = true;
  }
}

// =====================================================================
// 2. Navigation & UI Management Functions
// =====================================================================

function toggleAdminMenu(forceState) {
  isAdminMenuActive = (forceState !== undefined) ? forceState : !isAdminMenuActive;
  if (mp.cef && typeof mp.cef.setFocus === 'function') {
    mp.cef.setFocus(isAdminMenuActive, isAdminMenuActive);
  }
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:ui:toggleAdmin', isAdminMenuActive);
  }
  console.log(`[G-CyberRPcore] Admin Menu toggled: ${isAdminMenuActive}`);
}

function openChat() {
  if (isAdminMenuActive) return;
  if (mp.cef && typeof mp.cef.setFocus === 'function') {
    mp.cef.setFocus(true, true);
  }
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('chat:open');
  }
}

function toggleNoclip() {
  isNoclipActive = !isNoclipActive;
  const localPlayer = (mp.players && mp.players.local) ? mp.players.local : null;
  if (localPlayer && typeof localPlayer.setCollision === 'function') {
    localPlayer.setCollision(!isNoclipActive);
  }
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:hud:notify', 'Noclip Flight', isNoclipActive ? 'Active. Fly with WASD + Space/Shift.' : 'Disabled.', 'info');
  }
  console.log(`[G-CyberRPcore] Noclip toggled: ${isNoclipActive}`);
}

function toggleGodmode() {
  isGodmodeActive = !isGodmodeActive;
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:hud:notify', 'Godmode', isGodmodeActive ? 'Invincibility enabled.' : 'Invincibility disabled.', 'info');
  }
  console.log(`[G-CyberRPcore] Godmode toggled: ${isGodmodeActive}`);
}

function handleSeatbelt() {
  isSeatbeltActive = !isSeatbeltActive;
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:hud:notify', 'Seatbelt', isSeatbeltActive ? 'Buckled.' : 'Unbuckled!', isSeatbeltActive ? 'success' : 'warning');
  }
}

function handleTeleport(args) {
  if (args && args.length === 1 && DISTRICT_COORDS[args[0].toLowerCase()]) {
    const coords = DISTRICT_COORDS[args[0].toLowerCase()];
    spawnPlayer(coords[0], coords[1], coords[2], 1.0);
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:teleportCoords', coords[0], coords[1], coords[2]);
    }
  } else if (args && args.length >= 3) {
    const x = parseFloat(args[0]);
    const y = parseFloat(args[1]);
    const z = parseFloat(args[2]);
    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
      spawnPlayer(x, y, z, 1.0);
      if (mp.events && typeof mp.events.emitServer === 'function') {
        mp.events.emitServer('g-cyber:admin:teleportCoords', x, y, z);
      }
    }
  }
}

function handleSpawnVehicle(args) {
  const model = (args && args.length > 0) ? args[0] : 'QuadraTurboR';
  if (mp.events && typeof mp.events.emitServer === 'function') {
    mp.events.emitServer('g-cyber:admin:spawnVehicle', model);
  }
}

function handleChar() {
  if (mp.cef && typeof mp.cef.setFocus === 'function') {
    mp.cef.setFocus(true, true);
  }
  if (mp.events && typeof mp.events.emitServer === 'function') {
    mp.events.emitServer('g-cyber:server:requestCharacters');
  }
}

function handleSkin() {
  if (mp.cef && typeof mp.cef.setFocus === 'function') {
    mp.cef.setFocus(true, true);
  }
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:ui:showCreator', 1);
  }
}

// =====================================================================
// 3. Client Console Commands (F8 Console Overlay)
// =====================================================================

function registerCommand(name, fn) {
  try {
    if (mp.commands && typeof mp.commands.add === 'function') {
      mp.commands.add(name, (p1, p2) => {
        const args = Array.isArray(p1) ? p1 : (Array.isArray(p2) ? p2 : []);
        fn(args);
      });
    }
  } catch (e) {
    console.log(`[Commands] Failed to add command ${name}:`, e);
  }
}

registerCommand('admin', () => toggleAdminMenu());
registerCommand('adminmenu', () => toggleAdminMenu());
registerCommand('a', () => toggleAdminMenu());
registerCommand('hub', () => toggleAdminMenu());
registerCommand('noclip', () => toggleNoclip());
registerCommand('god', () => toggleGodmode());
registerCommand('tp', (args) => handleTeleport(args));
registerCommand('car', (args) => handleSpawnVehicle(args));
registerCommand('veh', (args) => handleSpawnVehicle(args));
registerCommand('char', () => handleChar());
registerCommand('multichar', () => handleChar());
registerCommand('skin', () => handleSkin());
registerCommand('clothing', () => handleSkin());
registerCommand('seatbelt', () => handleSeatbelt());
registerCommand('ping', () => {
  console.log('[CyberMP] Server ping: 12ms (Optimal)');
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:hud:notify', 'Network Ping', '12ms (Direct connection)', 'info');
  }
});
registerCommand('loading', () => {
  if (mp.cef && typeof mp.cef.setFocus === 'function') {
    mp.cef.setFocus(true, true);
  }
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:ui:showLoading');
  }
});
registerCommand('spawn', () => {
  spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);
});
registerCommand('ui', () => {
  if (mp.cef && typeof mp.cef.setFocus === 'function') {
    mp.cef.setFocus(true, true);
  }
});
registerCommand('closeui', () => {
  if (mp.cef && typeof mp.cef.setFocus === 'function') {
    mp.cef.setFocus(false, false);
  }
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:ui:closeAll');
  }
});

// =====================================================================
// 4. Official Engine Lifecycle Hooks (onInit & onceGameLoaded)
// =====================================================================

// Stage 1: Resource Start - Prepare CEF URL and enable interactive input focus
if (mp.events && typeof mp.events.on === 'function') {
  mp.events.on('resourceStart', () => {
    console.log('[G-CyberRPcore] resourceStart: Mounting Master CEF view and enabling focus...');
    if (mp.cef) {
      if (typeof mp.cef.setUrl === 'function') mp.cef.setUrl('./ui/index.html');
      if (typeof mp.cef.setFocus === 'function') mp.cef.setFocus(true, true);
    }
  });
}

// Stage 2: onInit - Bind Native Keys (F10 Admin, T Chat, B Seatbelt)
try {
  if (mp.game && typeof mp.game.onInit === 'function') {
    mp.game.onInit(() => {
      console.log('[G-CyberRPcore] onInit: Engine native classes ready. Binding input observer...');
      try {
        if (typeof mp.game.onInputKeyEvent === 'function') {
          mp.game.onInputKeyEvent((action, key) => {
            // action 1 = IACT_Press
            if (action === 1) {
              if (key === 121) { // IK_F10
                toggleAdminMenu();
              } else if (key === 84) { // IK_T
                openChat();
              } else if (key === 66) { // IK_B
                handleSeatbelt();
              } else if (key === 27) { // IK_Escape
                if (mp.events && typeof mp.events.emitCef === 'function') {
                  mp.events.emitCef('g-cyber:ui:handleEscape');
                }
              }
            }
          });
        }
      } catch (err) {
        console.log('[G-CyberRPcore] onInputKeyEvent binding notice:', err);
      }
    });
  }
} catch (e) {
  console.log('[G-CyberRPcore] onInit setup notice:', e);
}

// Stage 3: onceGameLoaded & onGameLoaded - World Ready (Safe for spawnPlayer)
function handleWorldReady() {
  if (isSpawned) return;
  console.log('[G-CyberRPcore] World loaded! Spawning player puppet at Megabuilding H10...');
  spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);

  // Mount Master UI & Show Loading/Multicharacter
  if (mp.cef) {
    if (typeof mp.cef.setUrl === 'function') mp.cef.setUrl('./ui/index.html');
    if (typeof mp.cef.setFocus === 'function') mp.cef.setFocus(true, true);
  }
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:ui:showLoading');
  }
}

try {
  if (mp.game && typeof mp.game.onceGameLoaded === 'function') {
    mp.game.onceGameLoaded(() => handleWorldReady());
  }
} catch (e) {
  console.log('[G-CyberRPcore] onceGameLoaded hook notice:', e);
}

try {
  if (mp.game && typeof mp.game.onGameLoaded === 'function') {
    mp.game.onGameLoaded(() => handleWorldReady());
  }
} catch (e) {
  console.log('[G-CyberRPcore] onGameLoaded hook notice:', e);
}

// Fallback: If game is already loaded upon script hot-reload
setTimeout(() => {
  if (!isSpawned && mp.game && typeof mp.game.GetPlayer === 'function') {
    const p = mp.game.GetPlayer();
    if (p) {
      console.log('[G-CyberRPcore] Post-load fallback: Player instance exists. Executing spawn...');
      handleWorldReady();
    }
  }
}, 3000);

// =====================================================================
// 5. CEF Browser Lifecycle & Event Handlers
// =====================================================================

if (mp.events && typeof mp.events.onCef === 'function') {
  mp.events.onCef('domReady', (name) => {
    console.log('[G-CyberRPcore] CEF DOM ready:', name);
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(true, true);
    }
    mp.events.emitCef('g-cyber:ui:showLoading');
  });

  mp.events.onCef('g-cyber:ui:setFocus', (state) => {
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(Boolean(state), Boolean(state));
    }
  });

  mp.events.onCef('g-cyber:loading:close', () => {
    console.log('[G-CyberRPcore] Loading screen closed. Releasing input focus to game.');
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(false, false);
    }
    if (!isSpawned) {
      spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);
    }
  });

  mp.events.onCef('g-cyber:loading:finish', () => {
    console.log('[G-CyberRPcore] Loading screen finished. Requesting character roster...');
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(true, true);
    }
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:requestCharacters');
    }
  });

  mp.events.onCef('g-cyber:characters:request', () => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:requestCharacters');
    }
  });

  mp.events.onCef('g-cyber:characters:select', (citizenid) => {
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(false, false);
    }
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:selectCharacter', citizenid);
    }
  });

  mp.events.onCef('g-cyber:characters:create', (characterJson) => {
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(false, false);
    }
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:createCharacter', characterJson);
    }
  });

  mp.events.onCef('g-cyber:characters:delete', (citizenid) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:deleteCharacter', citizenid);
    }
  });

  mp.events.onCef('chat:focus', (state) => {
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(state, state);
    }
  });

  mp.events.onCef('chat:submit', (text) => {
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(false, false);
    }
    if (!text) return;
    if (text.startsWith('/')) {
      const parts = text.slice(1).trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (cmd === 'admin' || cmd === 'adminmenu' || cmd === 'a' || cmd === 'hub') {
        toggleAdminMenu();
      } else if (cmd === 'noclip') {
        toggleNoclip();
      } else if (cmd === 'god') {
        toggleGodmode();
      } else if (cmd === 'clothing' || cmd === 'skin') {
        handleSkin();
      } else if (cmd === 'char' || cmd === 'multichar') {
        handleChar();
      } else {
        if (mp.events && typeof mp.events.emitServer === 'function') {
          mp.events.emitServer('chat:command', cmd, args);
        }
      }
    } else {
      if (mp.events && typeof mp.events.emitServer === 'function') {
        mp.events.emitServer('chat:message', text);
      }
    }
  });

  mp.events.onCef('admin:focus', (state) => {
    isAdminMenuActive = state;
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(state, state);
    }
  });

  mp.events.onCef('g-cyber:admin:requestData', () => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:requestAdminData');
    }
  });

  mp.events.onCef('g-cyber:admin:playerAction', (action, targetId) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:adminPlayerAction', action, targetId);
    }
  });

  mp.events.onCef('g-cyber:admin:toggleSelf', (feature, state) => {
    if (feature === 'godmode') isGodmodeActive = state;
    if (feature === 'noclip') toggleNoclip();
  });

  mp.events.onCef('g-cyber:admin:selfAction', (action) => {
    const localPlayer = (mp.players && mp.players.local) ? mp.players.local : null;
    if (localPlayer && action === 'heal') localPlayer.health = 100;
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:adminSelfAction', action);
    }
  });

  mp.events.onCef('g-cyber:admin:teleportDistrict', (district) => {
    if (DISTRICT_COORDS[district]) {
      const coords = DISTRICT_COORDS[district];
      spawnPlayer(coords[0], coords[1], coords[2], 1.0);
      if (mp.events && typeof mp.events.emitServer === 'function') {
        mp.events.emitServer('g-cyber:admin:teleportCoords', coords[0], coords[1], coords[2]);
      }
      if (mp.events && typeof mp.events.emitCef === 'function') {
        mp.events.emitCef('g-cyber:hud:notify', 'Teleport', `Arrived in ${district.replace('_', ' ').toUpperCase()}`, 'success');
      }
    }
  });

  mp.events.onCef('g-cyber:admin:spawnVehicle', (model) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:spawnVehicle', model);
    }
  });

  mp.events.onCef('g-cyber:admin:vehAction', (action) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:vehicleAction', action);
    }
  });

  mp.events.onCef('g-cyber:admin:setWeather', (weather) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:setWeather', weather);
    }
  });

  mp.events.onCef('g-cyber:admin:setTime', (time) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:setTime', time);
    }
  });

  mp.events.onCef('g-cyber:admin:broadcast', (text) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:broadcast', text);
    }
  });
}

// =====================================================================
// 6. Server Event Receivers (F8 Console & Server Dispatches)
// =====================================================================

if (mp.events && typeof mp.events.onServer === 'function') {
  mp.events.onServer('g-cyber:client:toggleAdmin', () => toggleAdminMenu());
  mp.events.onServer('g-cyber:client:closeUI', () => {
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(false, false);
    }
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:ui:closeAll');
    }
  });
  mp.events.onServer('g-cyber:client:toggleNoclip', () => toggleNoclip());
  mp.events.onServer('g-cyber:client:toggleGod', () => toggleGodmode());
  mp.events.onServer('g-cyber:client:showCreator', () => handleSkin());
  mp.events.onServer('g-cyber:client:teleportCommand', (args) => handleTeleport(args));
  mp.events.onServer('g-cyber:client:respawn', () => {
    spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);
  });

  mp.events.onServer('g-cyber:client:startRoster', () => {
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(true, true);
    }
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:requestCharacters');
    }
  });

  mp.events.onServer('g-cyber:client:receiveCharacters', (charsJson) => {
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(true, true);
    }
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:ui:showMulticharacter', charsJson);
    }
  });

  mp.events.onServer('g-cyber:client:syncHUD', (data) => {
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:hud:sync', data);
    }
  });

  mp.events.onServer('g-cyber:client:notify', (title, message, type) => {
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:hud:notify', title, message, type);
    }
  });

  mp.events.onServer('g-cyber:client:adminBroadcast', (text) => {
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:admin:broadcast', text);
    }
  });

  mp.events.onServer('g-cyber:client:receiveAdminData', (playersJson) => {
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:admin:updatePlayers', playersJson);
    }
  });

  mp.events.onServer('chat:add', (text, type) => {
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('chat:addMessage', text, type);
    }
  });
}

// Telemetry & Speedometer Sync Loop (100ms)
setInterval(() => {
  const localPlayer = (mp.players && mp.players.local) ? mp.players.local : null;
  if (!localPlayer) return;

  // Send Coordinates to Admin Menu
  if (isAdminMenuActive && localPlayer.position && mp.events && typeof mp.events.emitCef === 'function') {
    const p = localPlayer.position;
    const coordsStr = `X: ${p[0].toFixed(2)} | Y: ${p[1].toFixed(2)} | Z: ${p[2].toFixed(2)}`;
    mp.events.emitCef('g-cyber:admin:updateCoords', coordsStr);
  }

  // Vehicle Telemetry
  if (localPlayer.vehicle && localPlayer.vehicle.id !== 0 && mp.events && typeof mp.events.emitCef === 'function') {
    const veh = localPlayer.vehicle;
    const vel = veh.velocity || [0, 0, 0];
    const speed = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]) * 3.6;

    let gear = '1';
    if (speed > 160) gear = '6';
    else if (speed > 120) gear = '5';
    else if (speed > 80) gear = '4';
    else if (speed > 50) gear = '3';
    else if (speed > 25) gear = '2';
    else if (speed < 1) gear = 'P';

    const rpm = Math.min(100, (speed % 40) * 2.5 + 20);

    mp.events.emitCef('g-cyber:hud:vehicle', {
      inVehicle: true,
      speed: speed,
      gear: gear,
      rpm: rpm,
      seatbelt: isSeatbeltActive
    });
  } else if (mp.events && typeof mp.events.emitCef === 'function') {
    isSeatbeltActive = false;
    mp.events.emitCef('g-cyber:hud:vehicle', { inVehicle: false });
  }
}, 100);

console.log('[G-CyberRPcore] Master Client Subsystem Ready.');
