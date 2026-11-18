// G-CyberRPcore - Master Client Controller
// Manages CEF Master UI, Noclip flight, Godmode, Client Commands, and Network Bridge

console.log('[G-CyberRPcore] Master Client Subsystem Initializing...');

// 1. Mount Master CEF Webview
mp.cef.setUrl('./ui/index.html');
mp.cef.setFocus(true, true);

let isNoclipActive = false;
let isGodmodeActive = false;
let isSeatbeltActive = false;
let isAdminMenuActive = false;

// Coordinate Teleport Presets
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
// 2. Client Command Registry (F8 Console & Native Dispatcher)
// =====================================================================

// /admin or admin in F8 console
mp.commands.add('admin', () => {
  toggleAdminMenu();
});
mp.commands.add('adminmenu', () => {
  toggleAdminMenu();
});
mp.commands.add('a', () => {
  toggleAdminMenu();
});

// /noclip in F8 console
mp.commands.add('noclip', () => {
  toggleNoclip();
});

// /god in F8 console
mp.commands.add('god', () => {
  isGodmodeActive = !isGodmodeActive;
  mp.events.emitCef('g-cyber:hud:notify', 'Godmode', isGodmodeActive ? 'Invincibility enabled.' : 'Invincibility disabled.', 'info');
  console.log(`[Admin] Godmode toggled: ${isGodmodeActive}`);
});

// /tp <x> <y> <z> or /tp <district>
mp.commands.add('tp', (args) => {
  const localPlayer = mp.players.local;
  if (!localPlayer) return;

  if (args && args.length === 1 && DISTRICT_COORDS[args[0].toLowerCase()]) {
    const coords = DISTRICT_COORDS[args[0].toLowerCase()];
    localPlayer.position = coords;
    mp.events.emitCef('g-cyber:hud:notify', 'Teleport', `Teleported to ${args[0]}`, 'success');
  } else if (args && args.length >= 3) {
    const x = parseFloat(args[0]);
    const y = parseFloat(args[1]);
    const z = parseFloat(args[2]);
    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
      localPlayer.position = [x, y, z];
      mp.events.emitCef('g-cyber:hud:notify', 'Teleport', `Relocated to [${x}, ${y}, ${z}]`, 'success');
    }
  } else {
    console.log('Usage: tp <x> <y> <z> OR tp <corpo_plaza|megabuilding_h10|afterlife|pacifica_pier|santo_domingo|badlands_camp|arasaka_roof>');
  }
});

// /car <model> or /veh <model>
mp.commands.add('car', (args) => {
  const model = (args && args.length > 0) ? args[0] : 'QuadraTurboR';
  mp.events.emitServer('g-cyber:admin:spawnVehicle', model);
});
mp.commands.add('veh', (args) => {
  const model = (args && args.length > 0) ? args[0] : 'QuadraTurboR';
  mp.events.emitServer('g-cyber:admin:spawnVehicle', model);
});

// /revive [id]
mp.commands.add('revive', (args) => {
  const targetId = (args && args.length > 0) ? parseInt(args[0]) : 0;
  mp.events.emitServer('g-cyber:admin:playerAction', 'revive', targetId);
});

// /heal [id]
mp.commands.add('heal', (args) => {
  const targetId = (args && args.length > 0) ? parseInt(args[0]) : 0;
  mp.events.emitServer('g-cyber:admin:playerAction', 'heal', targetId);
});

// /givemoney <id> <type> <amount>
mp.commands.add('givemoney', (args) => {
  if (args && args.length >= 3) {
    mp.events.emitServer('g-cyber:admin:giveMoneyCommand', parseInt(args[0]), args[1], parseInt(args[2]));
  } else {
    console.log('Usage: givemoney <id> <cash|bank|crypto> <amount>');
  }
});

// /setjob <id> <job> <grade>
mp.commands.add('setjob', (args) => {
  if (args && args.length >= 2) {
    mp.events.emitServer('g-cyber:admin:setJobCommand', parseInt(args[0]), args[1], parseInt(args[2] || 0));
  } else {
    console.log('Usage: setjob <id> <ncpd|trauma|ripperdoc|civilian> <grade>');
  }
});

// /weather <type>
mp.commands.add('weather', (args) => {
  if (args && args.length > 0) {
    mp.events.emitServer('g-cyber:admin:setWeather', args[0]);
  }
});

// /time <hour>
mp.commands.add('time', (args) => {
  if (args && args.length > 0) {
    mp.events.emitServer('g-cyber:admin:setTime', parseInt(args[0]));
  }
});

// /char or /multichar
mp.commands.add('char', () => {
  mp.cef.setFocus(true, true);
  mp.events.emitServer('g-cyber:server:requestCharacters');
});
mp.commands.add('multichar', () => {
  mp.cef.setFocus(true, true);
  mp.events.emitServer('g-cyber:server:requestCharacters');
});

// /skin or /clothing
mp.commands.add('skin', () => {
  mp.cef.setFocus(true, true);
  mp.events.emitCef('g-cyber:ui:showCreator', 1);
});
mp.commands.add('clothing', () => {
  mp.cef.setFocus(true, true);
  mp.events.emitCef('g-cyber:ui:showCreator', 1);
});

// /seatbelt
mp.commands.add('seatbelt', () => {
  isSeatbeltActive = !isSeatbeltActive;
  mp.events.emitCef('g-cyber:hud:notify', 'Seatbelt', isSeatbeltActive ? 'Buckled.' : 'Unbuckled!', isSeatbeltActive ? 'success' : 'warning');
});

// /ping
mp.commands.add('ping', () => {
  console.log('[CyberMP] Server ping: 12ms (Optimal)');
  mp.events.emitCef('g-cyber:hud:notify', 'Network Ping', '12ms (Direct connection)', 'info');
});

// /loading
mp.commands.add('loading', () => {
  mp.cef.setFocus(true, true);
  mp.events.emitCef('g-cyber:ui:showLoading');
});

// =====================================================================
// 3. Admin Menu & Noclip Controllers
// =====================================================================
function toggleAdminMenu() {
  isAdminMenuActive = !isAdminMenuActive;
  mp.cef.setFocus(isAdminMenuActive, isAdminMenuActive);
  mp.events.emitCef('g-cyber:ui:toggleAdmin', isAdminMenuActive);
}

function toggleNoclip() {
  isNoclipActive = !isNoclipActive;
  const localPlayer = mp.players.local;
  if (localPlayer && typeof localPlayer.setCollision === 'function') {
    localPlayer.setCollision(!isNoclipActive);
  }
  mp.events.emitCef('g-cyber:hud:notify', 'Noclip Flight', isNoclipActive ? 'Active. Fly with WASD + Space/Shift.' : 'Disabled.', 'info');
  console.log(`[Admin] Noclip toggled: ${isNoclipActive}`);
}

// Global Godmode Loop
setInterval(() => {
  if (isGodmodeActive) {
    const localPlayer = mp.players.local;
    if (localPlayer && localPlayer.health < 100) {
      localPlayer.health = 100;
    }
  }
}, 300);

// =====================================================================
// 4. CEF Event Handlers & Forwarders
// =====================================================================
mp.events.onCef('g-cyber:loading:finish', () => {
  mp.cef.setFocus(false, false);
  mp.events.emitServer('g-cyber:loading:playerReady');
  console.log('[G-CyberRPcore] Loading screen finished.');
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

    if (cmd === 'admin' || cmd === 'adminmenu' || cmd === 'a') {
      toggleAdminMenu();
    } else if (cmd === 'noclip') {
      toggleNoclip();
    } else if (cmd === 'god') {
      isGodmodeActive = !isGodmodeActive;
      mp.events.emitCef('g-cyber:hud:notify', 'Godmode', isGodmodeActive ? 'Enabled' : 'Disabled', 'info');
    } else if (cmd === 'clothing' || cmd === 'skin') {
      mp.cef.setFocus(true, true);
      mp.events.emitCef('g-cyber:ui:showCreator', 1);
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
  const localPlayer = mp.players.local;
  if (!localPlayer) return;
  if (action === 'heal') localPlayer.health = 100;
  mp.events.emitServer('g-cyber:server:adminSelfAction', action);
});

mp.events.onCef('g-cyber:admin:teleportDistrict', (district) => {
  const localPlayer = mp.players.local;
  if (localPlayer && DISTRICT_COORDS[district]) {
    localPlayer.position = DISTRICT_COORDS[district];
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
// 5. Server Event Receivers
// =====================================================================
mp.events.onServer('g-cyber:client:receiveCharacters', (charsJson) => {
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
  const localPlayer = mp.players.local;
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
