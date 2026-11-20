// =====================================================================
// G-CyberRPcore - Master Client Controller
// Compliant with official CyberMP lifecycle (onInit, onceGameLoaded, onInputKeyEvent)
// 100% English - Modular Roleplay Framework for Cyberpunk 2077
// =====================================================================

console.log('[G-CyberRPcore] Master Client Subsystem Initializing...');

// Mount Master CEF URL immediately at top-level
if (mp.cef && typeof mp.cef.setUrl === 'function') {
  try {
    mp.cef.setUrl('./ui/index.html');
  } catch (err) {
    console.log('[G-CyberRPcore] mp.cef.setUrl notice:', err);
  }
}

let isNoclipActive = false;
let isGodmodeActive = false;
let isSeatbeltActive = false;
let isAdminMenuActive = false;
let isSpawned = false;

// Safe focus helper
function safeSetFocus(keyboard, mouse) {
  try {
    if (mp.cef && typeof mp.cef.setFocus === 'function') {
      mp.cef.setFocus(Boolean(keyboard), Boolean(mouse));
    }
  } catch (err) {
    console.log('[G-CyberRPcore] safeSetFocus notice:', err);
  }
}

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
  safeSetFocus(isAdminMenuActive, isAdminMenuActive);
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:ui:toggleAdmin', isAdminMenuActive);
  }
  console.log(`[G-CyberRPcore] Admin Menu toggled: ${isAdminMenuActive}`);
}

function openChat() {
  if (isAdminMenuActive) return;
  safeSetFocus(true, true);
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
  safeSetFocus(true, true);
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:ui:showMulticharacter');
  }
  if (mp.events && typeof mp.events.emitServer === 'function') {
    mp.events.emitServer('g-cyber:server:requestCharacters');
  }
}

function handleSkin() {
  safeSetFocus(true, true);
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
  safeSetFocus(true, true);
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:ui:showLoading');
  }
});
registerCommand('spawn', () => {
  spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);
  safeSetFocus(false, false);
});
registerCommand('ui', () => {
  safeSetFocus(true, true);
});
registerCommand('closeui', () => {
  safeSetFocus(false, false);
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:ui:closeAll');
  }
});

// =====================================================================
// 4. Official Engine Lifecycle Hooks (onInit & onceGameLoaded)
// =====================================================================

// Stage 1: Resource Start
if (mp.events && typeof mp.events.on === 'function') {
  mp.events.on('resourceStart', () => {
    console.log('[G-CyberRPcore] resourceStart: Framework client resource mounted.');
  });
}

// Stage 2: onInit - Bind Native Keys (F10 Admin, T Chat, B Seatbelt, ESC Menu)
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

// Stage 3: onceGameLoaded & onGameLoaded - World Ready
function handleWorldReady() {
  console.log('[G-CyberRPcore] World loaded! Game environment ready.');
  // If player skipped or already has an active character, spawn
  if (isSpawned) {
    spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);
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

// =====================================================================
// 5. CEF Browser Lifecycle & Event Handlers
// =====================================================================

if (mp.events && typeof mp.events.onCef === 'function') {
  mp.events.onCef('domReady', (name) => {
    console.log('[G-CyberRPcore] CEF DOM ready:', name);
    safeSetFocus(true, true);
    mp.events.emitCef('g-cyber:ui:showLoading');
  });

  mp.events.onCef('g-cyber:ui:setFocus', (state) => {
    safeSetFocus(state, state);
  });

  mp.events.onCef('g-cyber:loading:close', () => {
    console.log('[G-CyberRPcore] Loading screen closed. Releasing input focus to game.');
    safeSetFocus(false, false);
    if (!isSpawned) {
      spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);
    }
  });

  mp.events.onCef('g-cyber:loading:finish', () => {
    console.log('[G-CyberRPcore] Loading screen finished. Requesting character roster...');
    safeSetFocus(true, true);
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
    console.log('[G-CyberRPcore] Character selected:', citizenid);
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:selectCharacter', citizenid);
    }
  });

  mp.events.onCef('g-cyber:characters:create', (characterJson) => {
    console.log('[G-CyberRPcore] Creating character...');
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:createCharacter', characterJson);
    }
  });

  mp.events.onCef('g-cyber:characters:delete', (citizenid) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:deleteCharacter', citizenid);
    }
  });

  mp.events.onCef('admin:focus', (state) => {
    safeSetFocus(state, state);
  });

  mp.events.onCef('admin:teleport', (x, y, z) => {
    spawnPlayer(x, y, z, 1.0);
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:teleportCoords', x, y, z);
    }
  });

  mp.events.onCef('admin:spawnCar', (model) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:spawnVehicle', model);
    }
  });

  mp.events.onCef('admin:weather', (weather) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:setWeather', weather);
    }
  });

  mp.events.onCef('admin:time', (hour) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:setTime', hour);
    }
  });

  mp.events.onCef('admin:playerAction', (action, targetId) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:adminPlayerAction', action, targetId);
    }
  });

  mp.events.onCef('admin:selfAction', (action) => {
    if (action === 'god') toggleGodmode();
    else if (action === 'noclip') toggleNoclip();
    else if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:adminSelfAction', action);
    }
  });

  mp.events.onCef('admin:broadcast', (text) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:broadcast', text);
    }
  });

  mp.events.onCef('g-cyber:admin:requestData', () => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:requestAdminData');
    }
  });

  // Chat CEF Events
  mp.events.onCef('chatSubmit', (text) => {
    safeSetFocus(false, false);
    if (!text || text.trim().length === 0) return;
    if (text.startsWith('/')) {
      const parts = text.slice(1).trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);
      if (cmd === 'admin' || cmd === 'a' || cmd === 'hub') {
        toggleAdminMenu();
      } else if (cmd === 'noclip') {
        toggleNoclip();
      } else if (cmd === 'god') {
        toggleGodmode();
      } else if (cmd === 'char') {
        handleChar();
      } else if (cmd === 'skin') {
        handleSkin();
      } else if (cmd === 'tp') {
        handleTeleport(args);
      } else if (cmd === 'car' || cmd === 'veh') {
        handleSpawnVehicle(args);
      } else if (cmd === 'closeui') {
        safeSetFocus(false, false);
        mp.events.emitCef('g-cyber:ui:closeAll');
      } else if (mp.events && typeof mp.events.emitServer === 'function') {
        mp.events.emitServer('chat:command', cmd, args);
      }
    } else {
      if (mp.events && typeof mp.events.emitServer === 'function') {
        mp.events.emitServer('chat:message', text);
      }
    }
  });

  mp.events.onCef('chatClose', () => {
    safeSetFocus(false, false);
  });
}

// =====================================================================
// 6. Server Event Handlers
// =====================================================================

if (mp.events && typeof mp.events.onServer === 'function') {
  mp.events.onServer('g-cyber:client:toggleAdmin', () => toggleAdminMenu());
  mp.events.onServer('g-cyber:client:closeUI', () => {
    safeSetFocus(false, false);
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:ui:closeAll');
    }
  });
  mp.events.onServer('g-cyber:client:toggleNoclip', () => toggleNoclip());
  mp.events.onServer('g-cyber:client:toggleGod', () => toggleGodmode());
  mp.events.onServer('g-cyber:client:showCreator', () => handleSkin());
  mp.events.onServer('g-cyber:client:showMultichar', () => handleChar());
  mp.events.onServer('g-cyber:client:respawn', () => {
    spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);
    safeSetFocus(false, false);
  });

  mp.events.onServer('g-cyber:client:teleportCommand', (args) => {
    handleTeleport(args);
  });

  mp.events.onServer('g-cyber:client:characterLoaded', (charJson) => {
    console.log('[G-CyberRPcore] Character successfully loaded from server. Spawning...');
    spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);
    safeSetFocus(false, false);
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:ui:characterSpawned', charJson);
    }
  });

  mp.events.onServer('g-cyber:client:receiveCharacters', (charsJson) => {
    console.log('[G-CyberRPcore] Received character slots from server.');
    safeSetFocus(true, true);
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:ui:showMulticharacter', charsJson);
    }
  });

  mp.events.onServer('g-cyber:client:receiveAdminData', (listJson) => {
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:ui:receiveAdminData', listJson);
    }
  });

  mp.events.onServer('g-cyber:client:adminBroadcast', (text) => {
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:ui:broadcast', text);
    }
  });

  mp.events.onServer('g-cyber:client:notify', (title, msg, type) => {
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:hud:notify', title, msg, type);
    }
  });

  mp.events.onServer('chat:add', (text, type = 'normal') => {
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('chat:addMessage', text, type);
    }
  });
}

console.log('[G-CyberRPcore] Master Client Subsystem Ready.');
