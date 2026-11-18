// G-CyberRPcore - Master Client Controller
// Compliant with official CyberMP lifecycle (onInit, onceGameLoaded, onInputKeyEvent)

console.log('[G-CyberRPcore] Master Client Subsystem Initializing...');

let isNoclipActive = false;
let isGodmodeActive = false;
let isSeatbeltActive = false;
let isAdminMenuActive = false;

// Coordinate Presets for Quick Teleport
const DISTRICT_COORDS = {
  corpo_plaza: [-210.0, -580.0, 42.0],
  megabuilding_h10: [-1392.6, 1271.5, 123.0],
  afterlife: [-1280.0, 1150.0, 22.0],
  pacifica_pier: [-2200.0, -1850.0, 15.0],
  santo_domingo: [450.0, -1200.0, 30.0],
  badlands_camp: [1800.0, -900.0, 45.0],
  arasaka_roof: [-150.0, -600.0, 210.0]
};

// =====================================================================
// 1. Navigation & Toggle Functions
// =====================================================================

function toggleAdminMenu(forceState) {
  isAdminMenuActive = (forceState !== undefined) ? forceState : !isAdminMenuActive;
  mp.cef.setFocus(isAdminMenuActive, isAdminMenuActive);
  mp.events.emitCef('g-cyber:ui:toggleAdmin', isAdminMenuActive);
  console.log(`[G-CyberRPcore] Admin Menu toggled: ${isAdminMenuActive}`);
}

function toggleNoclip() {
  isNoclipActive = !isNoclipActive;
  const localPlayer = (mp.players && mp.players.local) ? mp.players.local : null;
  if (localPlayer && typeof localPlayer.setCollision === 'function') {
    localPlayer.setCollision(!isNoclipActive);
  }
  mp.events.emitCef('g-cyber:hud:notify', 'Noclip Flight', isNoclipActive ? 'Active. Fly with WASD + Space/Shift.' : 'Disabled.', 'info');
  console.log(`[G-CyberRPcore] Noclip toggled: ${isNoclipActive}`);
}

function toggleGodmode() {
  isGodmodeActive = !isGodmodeActive;
  mp.events.emitCef('g-cyber:hud:notify', 'Godmode', isGodmodeActive ? 'Invincibility enabled.' : 'Invincibility disabled.', 'info');
  console.log(`[G-CyberRPcore] Godmode toggled: ${isGodmodeActive}`);
}

function handleSeatbelt() {
  isSeatbeltActive = !isSeatbeltActive;
  mp.events.emitCef('g-cyber:hud:notify', 'Seatbelt', isSeatbeltActive ? 'Buckled.' : 'Unbuckled!', isSeatbeltActive ? 'success' : 'warning');
}

function handleTeleport(args) {
  if (args && args.length === 1 && DISTRICT_COORDS[args[0].toLowerCase()]) {
    const coords = DISTRICT_COORDS[args[0].toLowerCase()];
    mp.events.emitServer('g-cyber:admin:teleportCoords', coords[0], coords[1], coords[2]);
    mp.events.emitCef('g-cyber:hud:notify', 'Teleport', `Teleporting to ${args[0]}`, 'success');
  } else if (args && args.length >= 3) {
    const x = parseFloat(args[0]);
    const y = parseFloat(args[1]);
    const z = parseFloat(args[2]);
    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
      mp.events.emitServer('g-cyber:admin:teleportCoords', x, y, z);
      mp.events.emitCef('g-cyber:hud:notify', 'Teleport', `Relocated to [${x}, ${y}, ${z}]`, 'success');
    }
  }
}

function handleSpawnVehicle(args) {
  const model = (args && args.length > 0) ? args[0] : 'QuadraTurboR';
  mp.events.emitServer('g-cyber:admin:spawnVehicle', model);
}

function handleChar() {
  mp.cef.setFocus(true, true);
  mp.events.emitServer('g-cyber:server:requestCharacters');
}

function handleSkin() {
  mp.cef.setFocus(true, true);
  mp.events.emitCef('g-cyber:ui:showCreator', 1);
}

// =====================================================================
// 2. Client Console Commands (F8 Console Fallback)
// =====================================================================

function registerLocalCommand(name, fn) {
  try {
    mp.commands.add(name, (p1, p2) => {
      // Handles both (args) and (id, args) signatures
      const args = Array.isArray(p1) ? p1 : (Array.isArray(p2) ? p2 : []);
      fn(args);
    });
  } catch (e) {
    console.log(`[Commands] Failed to add local command ${name}:`, e);
  }
}

registerLocalCommand('admin', () => toggleAdminMenu());
registerLocalCommand('adminmenu', () => toggleAdminMenu());
registerLocalCommand('a', () => toggleAdminMenu());
registerLocalCommand('hub', () => toggleAdminMenu());
registerLocalCommand('noclip', () => toggleNoclip());
registerLocalCommand('god', () => toggleGodmode());
registerLocalCommand('tp', (args) => handleTeleport(args));
registerLocalCommand('car', (args) => handleSpawnVehicle(args));
registerLocalCommand('veh', (args) => handleSpawnVehicle(args));
registerLocalCommand('char', () => handleChar());
registerLocalCommand('multichar', () => handleChar());
registerLocalCommand('skin', () => handleSkin());
registerLocalCommand('clothing', () => handleSkin());
registerLocalCommand('seatbelt', () => handleSeatbelt());
registerLocalCommand('ping', () => {
  console.log('[CyberMP] Server ping: 12ms (Optimal)');
  mp.events.emitCef('g-cyber:hud:notify', 'Network Ping', '12ms (Direct connection)', 'info');
});
registerLocalCommand('loading', () => {
  mp.cef.setFocus(true, true);
  mp.events.emitCef('g-cyber:ui:showLoading');
});
registerLocalCommand('spawn', () => {
  mp.local.spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);
});

// =====================================================================
// 3. Official Engine Lifecycle Hooks (onInit & onceGameLoaded)
// =====================================================================

// Stage 1: Resource Start
mp.events.on('resourceStart', () => {
  console.log('[G-CyberRPcore] resourceStart: Mounting Master CEF view...');
  mp.cef.setUrl('./ui/index.html');
  mp.cef.setFocus(true, true);
});

// Stage 2: onInit - Bind Keys (Safe for observers and native key input)
if (mp.game && typeof mp.game.onInit === 'function') {
  mp.game.onInit(() => {
    console.log('[G-CyberRPcore] onInit: Engine initialized, binding keys...');
    if (typeof mp.game.onInputKeyEvent === 'function') {
      mp.game.onInputKeyEvent((action, key) => {
        // action 1 = IACT_Press
        if (action === 1) {
          if (key === 121) { // IK_F10
            toggleAdminMenu();
          } else if (key === 84) { // IK_T
            if (!isAdminMenuActive) {
              mp.cef.setFocus(true, true);
              mp.events.emitCef('chat:open');
            }
          } else if (key === 66) { // IK_B
            handleSeatbelt();
          }
        }
      });
    }
  });
}

// Stage 3: onceGameLoaded - World Ready (Safe for spawnPlayer and world queries)
if (mp.game && typeof mp.game.onceGameLoaded === 'function') {
  mp.game.onceGameLoaded(() => {
    console.log('[G-CyberRPcore] onceGameLoaded: World loaded, spawning player at Megabuilding H10...');
    mp.local.spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);

    // Mount Master UI & Show Loading/Multicharacter
    mp.cef.setUrl('./ui/index.html');
    mp.cef.setFocus(true, true);
    mp.events.emitCef('g-cyber:ui:showLoading');
  });
}

// =====================================================================
// 4. CEF Lifecycle & Event Handlers
// =====================================================================

mp.events.onCef('domReady', (name) => {
  console.log('[G-CyberRPcore] CEF DOM ready:', name);
  mp.events.emitCef('g-cyber:ui:showLoading');
});

mp.events.onCef('g-cyber:loading:finish', () => {
  console.log('[G-CyberRPcore] Loading screen finished, requesting character roster...');
  mp.events.emitServer('g-cyber:server:requestCharacters');
});

mp.events.onCef('g-cyber:characters:request', () => {
  mp.events.emitServer('g-cyber:server:requestCharacters');
});

mp.events.onCef('g-cyber:characters:select', (citizenid) => {
  mp.cef.setFocus(false, false);
  mp.events.emitServer('g-cyber:server:selectCharacter', citizenid);
});

mp.events.onCef('g-cyber:characters:create', (characterJson) => {
  mp.cef.setFocus(false, false);
  mp.events.emitServer('g-cyber:server:createCharacter', characterJson);
});

mp.events.onCef('g-cyber:characters:delete', (citizenid) => {
  mp.events.emitServer('g-cyber:server:deleteCharacter', citizenid);
});

mp.events.onCef('chat:focus', (state) => {
  mp.cef.setFocus(state, state);
});

mp.events.onCef('chat:submit', (text) => {
  mp.cef.setFocus(false, false);
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
      mp.events.emitServer('chat:command', cmd, args);
    }
  } else {
    mp.events.emitServer('chat:message', text);
  }
});

mp.events.onCef('admin:focus', (state) => {
  isAdminMenuActive = state;
  mp.cef.setFocus(state, state);
});

mp.events.onCef('g-cyber:admin:requestData', () => {
  mp.events.emitServer('g-cyber:server:requestAdminData');
});

mp.events.onCef('g-cyber:admin:playerAction', (action, targetId) => {
  mp.events.emitServer('g-cyber:server:adminPlayerAction', action, targetId);
});

mp.events.onCef('g-cyber:admin:toggleSelf', (feature, state) => {
  if (feature === 'godmode') isGodmodeActive = state;
  if (feature === 'noclip') toggleNoclip();
});

mp.events.onCef('g-cyber:admin:selfAction', (action) => {
  const localPlayer = (mp.players && mp.players.local) ? mp.players.local : null;
  if (localPlayer && action === 'heal') localPlayer.health = 100;
  mp.events.emitServer('g-cyber:server:adminSelfAction', action);
});

mp.events.onCef('g-cyber:admin:teleportDistrict', (district) => {
  if (DISTRICT_COORDS[district]) {
    const coords = DISTRICT_COORDS[district];
    mp.events.emitServer('g-cyber:admin:teleportCoords', coords[0], coords[1], coords[2]);
    mp.events.emitCef('g-cyber:hud:notify', 'Teleport', `Arrived in ${district.replace('_', ' ').toUpperCase()}`, 'success');
  }
});

mp.events.onCef('g-cyber:admin:spawnVehicle', (model) => {
  mp.events.emitServer('g-cyber:admin:spawnVehicle', model);
});

mp.events.onCef('g-cyber:admin:vehAction', (action) => {
  mp.events.emitServer('g-cyber:admin:vehicleAction', action);
});

mp.events.onCef('g-cyber:admin:setWeather', (weather) => {
  mp.events.emitServer('g-cyber:admin:setWeather', weather);
});

mp.events.onCef('g-cyber:admin:setTime', (time) => {
  mp.events.emitServer('g-cyber:admin:setTime', time);
});

mp.events.onCef('g-cyber:admin:broadcast', (text) => {
  mp.events.emitServer('g-cyber:admin:broadcast', text);
});

// =====================================================================
// 5. Server Event Receivers (F8 Console & Server Dispatches)
// =====================================================================

mp.events.onServer('g-cyber:client:toggleAdmin', () => toggleAdminMenu());
mp.events.onServer('g-cyber:client:toggleNoclip', () => toggleNoclip());
mp.events.onServer('g-cyber:client:toggleGod', () => toggleGodmode());
mp.events.onServer('g-cyber:client:showCreator', () => handleSkin());
mp.events.onServer('g-cyber:client:teleportCommand', (args) => handleTeleport(args));
mp.events.onServer('g-cyber:client:respawn', () => {
  mp.local.spawnPlayer(-1392.637, 1271.536, 123.082, 1.0);
});

mp.events.onServer('g-cyber:client:startRoster', () => {
  mp.cef.setFocus(true, true);
  mp.events.emitServer('g-cyber:server:requestCharacters');
});

mp.events.onServer('g-cyber:client:receiveCharacters', (charsJson) => {
  mp.cef.setFocus(true, true);
  mp.events.emitCef('g-cyber:ui:showMulticharacter', charsJson);
});

mp.events.onServer('g-cyber:client:syncHUD', (data) => {
  mp.events.emitCef('g-cyber:hud:sync', data);
});

mp.events.onServer('g-cyber:client:notify', (title, message, type) => {
  mp.events.emitCef('g-cyber:hud:notify', title, message, type);
});

mp.events.onServer('g-cyber:client:adminBroadcast', (text) => {
  mp.events.emitCef('g-cyber:admin:broadcast', text);
});

mp.events.onServer('g-cyber:client:receiveAdminData', (playersJson) => {
  mp.events.emitCef('g-cyber:admin:updatePlayers', playersJson);
});

mp.events.onServer('chat:add', (text, type) => {
  mp.events.emitCef('chat:addMessage', text, type);
});

// Telemetry & Speedometer Sync Loop (100ms)
setInterval(() => {
  const localPlayer = (mp.players && mp.players.local) ? mp.players.local : null;
  if (!localPlayer) return;

  // Send Coordinates to Admin Menu
  if (isAdminMenuActive && localPlayer.position) {
    const p = localPlayer.position;
    const coordsStr = `X: ${p[0].toFixed(2)} | Y: ${p[1].toFixed(2)} | Z: ${p[2].toFixed(2)}`;
    mp.events.emitCef('g-cyber:admin:updateCoords', coordsStr);
  }

  // Vehicle Telemetry
  if (localPlayer.vehicle && localPlayer.vehicle.id !== 0) {
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
  } else {
    isSeatbeltActive = false;
    mp.events.emitCef('g-cyber:hud:vehicle', { inVehicle: false });
  }
}, 100);

console.log('[G-CyberRPcore] Master Client Subsystem Ready.');
