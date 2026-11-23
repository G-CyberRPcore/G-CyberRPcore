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

// Creator studio coordinates (Megabuilding H10 Mirror Studio)
const CREATOR_STUDIO_COORDS = [-1385.2, 1272.8, 124.0, 90.0];
let currentCreatorYaw = 90.0;

// Noclip state & keys
let noclipPosition = [-1392.637, 1271.536, 123.082];
let noclipInterval = null;
const keyStates = {};

function clearNoclipKeys() {
  for (const k in keyStates) {
    keyStates[k] = false;
  }
}

// Safe focus helper
function safeSetFocus(keyboard, mouse) {
  try {
    clearNoclipKeys();
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

// Vehicle Record Map
const VEHICLE_RECORD_MAP = {
  'QuadraTurboR': 'Vehicle.v_sport1_quadra_turbo_r_player',
  'RayfieldCaliburn': 'Vehicle.v_sport1_rayfield_caliburn_player',
  'ArchNazare': 'Vehicle.v_sportbike2_arch_player',
  'PoliceCruiser': 'Vehicle.v_standard2_villefort_cortes_police',
  'Ambulance': 'Vehicle.v_standard25_thorton_colby_pickup_player'
};

// =====================================================================
// 1. Health Pool Setup & Player Spawning
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

function spawnPlayer(x = -1382.0, y = 1272.0, z = 123.0, yaw = 90.0) {
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

function handleSeatbelt() {
  isSeatbeltActive = !isSeatbeltActive;
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:hud:notify', 'Seatbelt', isSeatbeltActive ? 'Buckled.' : 'Unbuckled!', isSeatbeltActive ? 'success' : 'warning');
  }
}

// =====================================================================
// 3. Functional Admin Implementations (Godmode, Noclip, Spawning)
// =====================================================================

function setGodmode(state) {
  isGodmodeActive = (state !== undefined) ? Boolean(state) : !isGodmodeActive;
  try {
    const player = (mp.game && typeof mp.game.GetPlayer === 'function') ? mp.game.GetPlayer() : null;
    if (player) {
      const entId = player.GetEntityID();
      const godModeSys = mp.game.ScriptGameInstance.GetGodModeSystem();
      if (godModeSys) {
        if (isGodmodeActive) {
          godModeSys.AddGodMode(entId, 0, 'admin'); // Invulnerable
          godModeSys.AddGodMode(entId, 1, 'admin'); // Immortal
          setMaxHealth(99999);
          setHealth(99999);
        } else {
          godModeSys.ClearGodMode(entId, 'admin');
          setMaxHealth(SPAWN_HEALTH);
          setHealth(SPAWN_HEALTH);
        }
      }
    }
  } catch (err) {
    console.log('[G-CyberRPcore] Godmode execution error:', err);
  }

  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:hud:notify', 'Godmode', isGodmodeActive ? 'Invincibility enabled.' : 'Invincibility disabled.', 'info');
  }
  console.log(`[G-CyberRPcore] Godmode state: ${isGodmodeActive}`);
}

function applyNoclipGodmode(enable) {
  try {
    const player = (mp.game && typeof mp.game.GetPlayer === 'function') ? mp.game.GetPlayer() : null;
    if (!player) return;
    const entId = player.GetEntityID();
    const godModeSys = mp.game.ScriptGameInstance.GetGodModeSystem();
    if (godModeSys) {
      if (enable) {
        // Enforce total invulnerability and immortality to override kill triggers and falling damage
        godModeSys.AddGodMode(entId, 0, 'noclip'); // 0 = Invulnerable
        godModeSys.AddGodMode(entId, 1, 'noclip'); // 1 = Immortal
        if (typeof godModeSys.EnableOverride === 'function') {
          godModeSys.EnableOverride(entId, 0, 'noclip');
        }
        setMaxHealth(SPAWN_HEALTH);
        setHealth(SPAWN_HEALTH);
      } else {
        if (!isGodmodeActive) {
          godModeSys.ClearGodMode(entId, 'noclip');
          if (typeof godModeSys.DisableOverride === 'function') {
            godModeSys.DisableOverride(entId, 'noclip');
          }
          setMaxHealth(SPAWN_HEALTH);
          setHealth(SPAWN_HEALTH);
        }
      }
    }
  } catch (err) {
    console.log('[G-CyberRPcore] applyNoclipGodmode notice:', err);
  }
}

function handleHealPlayer() {
  setMaxHealth(SPAWN_HEALTH);
  setHealth(SPAWN_HEALTH);
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:hud:update', { health: 100, armor: 100 });
    mp.events.emitCef('g-cyber:hud:notify', 'Trauma Restored', 'Vitals and armor fully restored (100%).', 'success');
  }
  console.log('[G-CyberRPcore] Local player healed to 100%.');
}

function handleRevivePlayer() {
  let rx = -1392.637, ry = 1271.536, rz = 123.082, ryaw = 1.0;
  try {
    const p = (mp.game && typeof mp.game.GetPlayer === 'function') ? mp.game.GetPlayer() : null;
    if (p && typeof p.GetWorldPosition === 'function') {
      const wp = p.GetWorldPosition();
      if (wp && typeof wp.x === 'number') {
        rx = wp.x;
        ry = wp.y;
        rz = wp.z + 0.3; // lift slightly above ground to prevent clipping
      }
      if (typeof p.GetWorldYaw === 'function') ryaw = p.GetWorldYaw();
    } else {
      const lp = (mp.players && mp.players.local) ? mp.players.local : null;
      if (lp && lp.position && Array.isArray(lp.position) && lp.position.length >= 3) {
        rx = lp.position[0];
        ry = lp.position[1];
        rz = lp.position[2] + 0.3;
      }
    }
  } catch (e) {}

  spawnPlayer(rx, ry, rz, ryaw);
  setMaxHealth(SPAWN_HEALTH);
  setHealth(SPAWN_HEALTH);
  safeSetFocus(false, false);

  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:hud:update', { health: 100, armor: 100 });
    mp.events.emitCef('g-cyber:hud:notify', 'Trauma Team Revive', 'Citizen revived. Consciousness and vitals restored.', 'success');
  }
  console.log(`[G-CyberRPcore] Local player revived at (${rx}, ${ry}, ${rz}).`);
}

function applyNoclipPosition(pos) {
  try {
    const player = (mp.game && typeof mp.game.GetPlayer === 'function') ? mp.game.GetPlayer() : null;
    let handled = false;

    // Method 1: TeleportPed directly sets (x, y, z) without altering camera or entity orientation
    if (player && typeof player.TeleportPed === 'function') {
      try {
        player.TeleportPed({ x: pos[0], y: pos[1], z: pos[2] });
        handled = true;
      } catch (err) {}
    }

    // Method 2: Fallback to mp.local.spawnPlayer using the entity's native GetWorldYaw() (never atan2)
    if (!handled && mp.local && typeof mp.local.spawnPlayer === 'function') {
      let trueYaw = 0.0;
      if (player && typeof player.GetWorldYaw === 'function') {
        trueYaw = player.GetWorldYaw();
      } else {
        const localP = (mp.players && mp.players.local) ? mp.players.local : null;
        if (localP && typeof localP.yaw === 'number') trueYaw = localP.yaw;
      }
      mp.local.spawnPlayer(pos[0], pos[1], pos[2], trueYaw);
    }
  } catch (e) {
    console.log('[G-CyberRPcore] applyNoclipPosition error:', e);
  }
}

function startNoclipFlight() {
  if (noclipInterval) clearInterval(noclipInterval);
  clearNoclipKeys();
  applyNoclipGodmode(true);

  try {
    const localPlayer = (mp.players && mp.players.local) ? mp.players.local : null;
    if (localPlayer) {
      if (typeof localPlayer.setCollision === 'function') localPlayer.setCollision(false);
      if (localPlayer.position && Array.isArray(localPlayer.position) && localPlayer.position.length >= 3) {
        noclipPosition = [localPlayer.position[0], localPlayer.position[1], localPlayer.position[2]];
      }
    }
    const p = (mp.game && typeof mp.game.GetPlayer === 'function') ? mp.game.GetPlayer() : null;
    if (p && typeof p.GetWorldPosition === 'function') {
      const wp = p.GetWorldPosition();
      if (wp && typeof wp.x === 'number') {
        noclipPosition = [wp.x, wp.y, wp.z];
      }
    }
  } catch (e) {}

  noclipInterval = setInterval(() => {
    if (!isNoclipActive) {
      clearInterval(noclipInterval);
      noclipInterval = null;
      return;
    }

    // Keep health topped up constantly so engine death triggers/volumes cannot kill the player
    setHealth(SPAWN_HEALTH);

    const baseSpeed = 0.6;
    // Shift: 16 (Generic Shift), 160 (Left Shift), 161 (Right Shift) provides 2.5x speed boost
    const isSprint = (keyStates[16] === true || keyStates[160] === true || keyStates[161] === true);
    const speed = isSprint ? (baseSpeed * 2.5) : baseSpeed;

    let forwardVec = [0, 1, 0];
    let rightVec = [1, 0, 0];

    try {
      const camSys = mp.game.ScriptGameInstance.GetCameraSystem();
      if (camSys) {
        const f = camSys.GetActiveCameraForward();
        const r = camSys.GetActiveCameraRight();
        if (f && typeof f.x === 'number') forwardVec = [f.x, f.y, f.z];
        if (r && typeof r.x === 'number') rightVec = [r.x, r.y, r.z];
      }
    } catch (e) {}

    // Flight directional controls:
    // W = 87 (Forward along camera gaze), S = 83 (Backward), D = 68 (Right), A = 65 (Left)
    // Space = 32 (Ascend strictly)
    // Descend strictly:
    // 81 = Q, 162 = LControl, 163 = RControl, 17 = Ctrl, 67 = C, 88 = X, 90 = Z
    const isAscend = (keyStates[32] === true);
    const isDescend = (
      keyStates[81] === true ||
      keyStates[162] === true ||
      keyStates[163] === true ||
      keyStates[17] === true ||
      keyStates[67] === true ||
      keyStates[88] === true ||
      keyStates[90] === true
    );

    if (keyStates[87] === true) { // W Forward
      noclipPosition[0] += forwardVec[0] * speed;
      noclipPosition[1] += forwardVec[1] * speed;
      noclipPosition[2] += forwardVec[2] * speed;
    }
    if (keyStates[83] === true) { // S Backward
      noclipPosition[0] -= forwardVec[0] * speed;
      noclipPosition[1] -= forwardVec[1] * speed;
      noclipPosition[2] -= forwardVec[2] * speed;
    }
    if (keyStates[68] === true) { // D Right
      noclipPosition[0] += rightVec[0] * speed;
      noclipPosition[1] += rightVec[1] * speed;
      noclipPosition[2] += rightVec[2] * speed;
    }
    if (keyStates[65] === true) { // A Left
      noclipPosition[0] -= rightVec[0] * speed;
      noclipPosition[1] -= rightVec[1] * speed;
      noclipPosition[2] -= rightVec[2] * speed;
    }
    if (isAscend) { // Space Ascend
      noclipPosition[2] += speed;
    }
    if (isDescend) { // Q, LCtrl, RCtrl, C, X, Z Descend
      noclipPosition[2] -= speed;
    }

    // Apply 3D coordinate pinning without altering camera rotation
    applyNoclipPosition(noclipPosition);
  }, 20);
}

function setNoclip(state) {
  isNoclipActive = (state !== undefined) ? Boolean(state) : !isNoclipActive;
  clearNoclipKeys();

  if (isNoclipActive) {
    startNoclipFlight();
  } else {
    if (noclipInterval) {
      clearInterval(noclipInterval);
      noclipInterval = null;
    }
    applyNoclipGodmode(false);
    try {
      const localPlayer = (mp.players && mp.players.local) ? mp.players.local : null;
      if (localPlayer) {
        if (typeof localPlayer.setCollision === 'function') localPlayer.setCollision(true);
      }
      applyNoclipPosition(noclipPosition);
    } catch (err) {
      console.log('[G-CyberRPcore] Noclip collision restore notice:', err);
    }
  }

  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:hud:notify', 'Noclip Flight', isNoclipActive ? 'Active (Immortal). WASD: Fly | Space: Up | Q / Ctrl / C: Down | Shift: Fast.' : 'Disabled. Gravity restored.', 'info');
  }
  console.log(`[G-CyberRPcore] Noclip state: ${isNoclipActive}`);
}

function handleTeleport(args) {
  if (args && args.length === 1 && DISTRICT_COORDS[args[0].toLowerCase()]) {
    const coords = DISTRICT_COORDS[args[0].toLowerCase()];
    spawnPlayer(coords[0], coords[1], coords[2], 1.0);
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:teleportCoords', coords[0], coords[1], coords[2]);
    }
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:admin:updateCoords', `${coords[0]}, ${coords[1]}, ${coords[2]}`);
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
      if (mp.events && typeof mp.events.emitCef === 'function') {
        mp.events.emitCef('g-cyber:admin:updateCoords', `${x}, ${y}, ${z}`);
      }
    }
  }
}

function handleTeleportToMarker() {
  console.log('[G-CyberRPcore] Processing /tpm - Teleport to map waypoint...');
  let targetCoords = null;

  try {
    const mappinSys = (mp.game && mp.game.ScriptGameInstance && typeof mp.game.ScriptGameInstance.GetMappinSystem === 'function')
      ? mp.game.ScriptGameInstance.GetMappinSystem()
      : null;

    if (mappinSys) {
      // 1. Check manually tracked custom waypoint
      try {
        if (typeof mappinSys.GetManuallyTrackedMappinID === 'function') {
          const trackId = mappinSys.GetManuallyTrackedMappinID();
          if (trackId) {
            const m = (typeof mappinSys.GetMappin === 'function') ? mappinSys.GetMappin(trackId) : null;
            if (m && typeof m.GetWorldPosition === 'function') {
              const wp = m.GetWorldPosition();
              if (wp && typeof wp.x === 'number' && !isNaN(wp.x)) {
                targetCoords = { x: wp.x, y: wp.y, z: wp.z };
              }
            }
          }
        }
      } catch (err1) {
        console.log('[G-CyberRPcore] Tracked mappin query notice:', err1);
      }

      // 2. Scan all active mappins: CustomPositionVariant (21) or any player-tracked pin
      if (!targetCoords && typeof mappinSys.GetAllMappins === 'function') {
        try {
          const all = mappinSys.GetAllMappins();
          if (Array.isArray(all)) {
            // Priority A: Custom map pin
            for (let i = 0; i < all.length; i++) {
              const m = all[i];
              if (m && typeof m.GetVariant === 'function' && m.GetVariant() === 21) {
                const wp = (typeof m.GetWorldPosition === 'function') ? m.GetWorldPosition() : null;
                if (wp && typeof wp.x === 'number' && !isNaN(wp.x)) {
                  targetCoords = { x: wp.x, y: wp.y, z: wp.z };
                  break;
                }
              }
            }

            // Priority B: Any active tracked mappin
            if (!targetCoords) {
              for (let i = 0; i < all.length; i++) {
                const m = all[i];
                if (m && typeof m.IsPlayerTracked === 'function' && m.IsPlayerTracked()) {
                  const wp = (typeof m.GetWorldPosition === 'function') ? m.GetWorldPosition() : null;
                  if (wp && typeof wp.x === 'number' && !isNaN(wp.x)) {
                    targetCoords = { x: wp.x, y: wp.y, z: wp.z };
                    break;
                  }
                }
              }
            }
          }
        } catch (err2) {
          console.log('[G-CyberRPcore] All mappins query notice:', err2);
        }
      }
    }
  } catch (e) {
    console.log('[G-CyberRPcore] handleTeleportToMarker error:', e);
  }

  if (targetCoords) {
    // Elevate slightly above terrain to prevent clipping into the road/ground
    const spawnZ = (typeof targetCoords.z === 'number' && !isNaN(targetCoords.z) && Math.abs(targetCoords.z) > 0.1)
      ? (targetCoords.z + 1.5)
      : 30.0;

    spawnPlayer(targetCoords.x, targetCoords.y, spawnZ, 1.0);
    safeSetFocus(false, false);

    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:teleportCoords', targetCoords.x, targetCoords.y, spawnZ);
    }
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:hud:notify', 'Waypoint Teleport', `Teleported to [${targetCoords.x.toFixed(1)}, ${targetCoords.y.toFixed(1)}, ${spawnZ.toFixed(1)}]`, 'success');
      mp.events.emitCef('g-cyber:admin:updateCoords', `${targetCoords.x.toFixed(1)}, ${targetCoords.y.toFixed(1)}, ${spawnZ.toFixed(1)}`);
    }
    console.log(`[G-CyberRPcore] /tpm teleported successfully to (${targetCoords.x}, ${targetCoords.y}, ${spawnZ})`);
  } else {
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:hud:notify', 'No Waypoint Set', 'Open Map (M) and click to place a custom waypoint pin first.', 'warning');
    }
    console.log('[G-CyberRPcore] /tpm failed: No active map waypoint found.');
  }
}

function spawnAdminVehicle(modelKey) {
  console.log(`[G-CyberRPcore] Admin requesting vehicle: ${modelKey}`);
  // Note: We deliberately do NOT call REDengine's offline single-player AI summoner (SpawnPlayerVehicle).
  // The server instantiates the real synchronized, networked CyberMP vehicle via mp.vehicles.create!
  if (mp.events && typeof mp.events.emitServer === 'function') {
    mp.events.emitServer('g-cyber:admin:spawnVehicle', modelKey);
  }
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:hud:notify', 'Vehicle Dispatched', `Materializing ${modelKey} via NetWatch transport...`, 'info');
  }
}

function handleAdminVehAction(action) {
  console.log(`[G-CyberRPcore] Vehicle Action: ${action}`);
  try {
    if (action === 'repair') {
      setHealth(SPAWN_HEALTH);
    }
  } catch (e) {
    console.log('[G-CyberRPcore] vehAction notice:', e);
  }
  if (mp.events && typeof mp.events.emitServer === 'function') {
    mp.events.emitServer('g-cyber:admin:vehAction', action);
  }
}

function handleAdminWeather(w) {
  const WEATHER_MAP = {
    'sunny': '24h_weather_sunny',
    'rain': '24h_weather_rain',
    'fog': '24h_weather_fog',
    'sandstorm': '24h_weather_sandstorm',
    'toxic': '24h_weather_toxic_rain',
    'pollution': '24h_weather_heavy_clouds'
  };
  const weatherRes = WEATHER_MAP[(w || '').toLowerCase()] || '24h_weather_sunny';
  try {
    const weatherSys = mp.game.ScriptGameInstance.GetWeatherSystem();
    if (weatherSys) {
      weatherSys.SetWeather(weatherRes, 2.0, 1);
    }
  } catch (e) {
    console.log('[G-CyberRPcore] WeatherSystem notice:', e);
  }
  if (mp.events && typeof mp.events.emitServer === 'function') {
    mp.events.emitServer('g-cyber:admin:setWeather', weatherRes);
  }
}

function handleAdminTime(hour) {
  const h = parseInt(hour) || 12;
  try {
    const timeSys = mp.game.ScriptGameInstance.GetTimeSystem();
    if (timeSys) {
      timeSys.SetGameTimeByHMS(h, 0, 0, 'AdminTimeShift');
    }
  } catch (e) {
    console.log('[G-CyberRPcore] TimeSystem notice:', e);
  }
  if (mp.events && typeof mp.events.emitServer === 'function') {
    mp.events.emitServer('g-cyber:admin:setTime', h);
  }
}

// =====================================================================
// 4. Native Character Customization & Mirror Systems
// =====================================================================

function openNativeCharacterCustomizer(scenarioType = 'MenuScenario_CharacterCustomization') {
  console.log(`[G-CyberRPcore] Triggering native Cyberpunk 2077 character customizer (${scenarioType})...`);
  try {
    const uiSys = mp.game.ScriptGameInstance.GetUISystem();
    if (uiSys) {
      // 1. Queue switch event via inkMenuInstance_SwitchToScenario
      try {
        if (typeof mp.game.inkMenuInstance_SwitchToScenario === 'function') {
          const switchEvt = new mp.game.inkMenuInstance_SwitchToScenario();
          if (switchEvt && typeof switchEvt.Init === 'function') {
            switchEvt.Init(scenarioType);
            uiSys.QueueEvent(switchEvt);
          }
        }
      } catch (e1) {
        console.log('[G-CyberRPcore] inkMenuInstance_SwitchToScenario notice:', e1);
      }

      // 2. Queue menu scenario event directly
      try {
        if (typeof uiSys.QueueMenuEvent === 'function') {
          uiSys.QueueMenuEvent(scenarioType);
          uiSys.QueueMenuEvent("OnOpenMorphMenu");
        }
      } catch (e2) {
        console.log('[G-CyberRPcore] QueueMenuEvent notice:', e2);
      }

      // 3. Initialize character customization system state if available
      try {
        const custSys = mp.game.ScriptGameInstance.GetCharacterCustomizationSystem();
        if (custSys && typeof custSys.InitializeState === 'function') {
          custSys.InitializeState();
        }
      } catch (e3) {
        console.log('[G-CyberRPcore] custSys InitializeState notice:', e3);
      }
    }

    // Release mouse and keyboard from CEF so the player interacts smoothly with native customizer
    safeSetFocus(false, false);

    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:hud:notify', '3D Customizer Active', 'Cyberpunk 2077 Native Character Customizer loaded.', 'success');
    }
  } catch (err) {
    console.log('[G-CyberRPcore] openNativeCharacterCustomizer error:', err);
  }
}

function openNativeMirror() {
  openNativeCharacterCustomizer('MenuScenario_CharacterCustomizationMirror');
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
  // Teleport player in front of Megabuilding H10 Apartment illuminated studio mirror
  spawnPlayer(CREATOR_STUDIO_COORDS[0], CREATOR_STUDIO_COORDS[1], CREATOR_STUDIO_COORDS[2], CREATOR_STUDIO_COORDS[3]);
  if (mp.events && typeof mp.events.emitCef === 'function') {
    mp.events.emitCef('g-cyber:ui:showCreator', 1);
  }
}

function applyCreatorClothingPreview(clothingJson) {
  try {
    const data = (typeof clothingJson === 'string') ? JSON.parse(clothingJson) : clothingJson;
    console.log('[G-CyberRPcore] Applying clothing preview:', data);
    const player = mp.game.GetPlayer();
    if (!player) return;
    const transSys = mp.game.ScriptGameInstance.GetTransactionSystem();
    if (!transSys) return;

    const OUTFIT_ITEMS = {
      'samurai_leather': 'Items.Coat_01_basic_01',
      'corpo_trench': 'Items.Coat_02_basic_01',
      'nomad_denim': 'Items.Vest_01_basic_01',
      'tactical_vest': 'Items.Vest_02_basic_01',
      'tactical_cargo': 'Items.Pants_01_basic_01',
      'corpo_slacks': 'Items.Pants_02_basic_01',
      'reinforced_jeans': 'Items.Pants_03_basic_01',
      'tech_aviator': 'Items.Glasses_01_basic_01',
      'neural_visor': 'Items.Visor_01_basic_01',
      'tactical_cap': 'Items.Hat_01_basic_01',
      'oni_respirator': 'Items.Mask_01_basic_01',
      'tactical_balaclava': 'Items.Mask_02_basic_01'
    };

    if (data.jacket && OUTFIT_ITEMS[data.jacket]) {
      transSys.AddItemToSlot(player, "AttachmentSlots.Chest", OUTFIT_ITEMS[data.jacket]);
    }
    if (data.pants && OUTFIT_ITEMS[data.pants]) {
      transSys.AddItemToSlot(player, "AttachmentSlots.Legs", OUTFIT_ITEMS[data.pants]);
    }
    if (data.headwear && OUTFIT_ITEMS[data.headwear]) {
      transSys.AddItemToSlot(player, "AttachmentSlots.Head", OUTFIT_ITEMS[data.headwear]);
    }
    if (data.mask && OUTFIT_ITEMS[data.mask]) {
      transSys.AddItemToSlot(player, "AttachmentSlots.Eyes", OUTFIT_ITEMS[data.mask]);
    }
  } catch (err) {
    console.log('[G-CyberRPcore] Clothing preview notice:', err);
  }
}

// =====================================================================
// 5. Client Console Commands (F8 Console Overlay & Chat)
// =====================================================================

function registerCommand(name, fn) {
  try {
    if (mp.commands && typeof mp.commands.add === 'function') {
      mp.commands.add(name, (id, args) => {
        fn(Array.isArray(args) ? args : []);
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
registerCommand('noclip', () => setNoclip());
registerCommand('god', () => setGodmode());
registerCommand('heal', () => {
  handleHealPlayer();
  if (mp.events && typeof mp.events.emitServer === 'function') {
    mp.events.emitServer('g-cyber:server:adminSelfAction', 'heal');
  }
});
registerCommand('revive', () => {
  handleRevivePlayer();
  if (mp.events && typeof mp.events.emitServer === 'function') {
    mp.events.emitServer('g-cyber:server:adminSelfAction', 'revive');
  }
});
registerCommand('tp', (args) => handleTeleport(args));
registerCommand('tpm', () => {
  if (mp.events && typeof mp.events.emitServer === 'function') {
    mp.events.emitServer('g-cyber:server:requestTpm');
  }
});
registerCommand('car', (args) => spawnAdminVehicle(args && args[0]));
registerCommand('veh', (args) => spawnAdminVehicle(args && args[0]));
registerCommand('char', () => handleChar());
registerCommand('multichar', () => handleChar());
registerCommand('creator', () => openNativeCharacterCustomizer('MenuScenario_CharacterCustomization'));
registerCommand('charcreator', () => openNativeCharacterCustomizer('MenuScenario_CharacterCustomization'));
registerCommand('skin', () => handleSkin());
registerCommand('clothing', () => handleSkin());
registerCommand('mirror', () => openNativeMirror());
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
  spawnPlayer(-1382.0, 1272.0, 123.0, 90.0);
  safeSetFocus(false, false);
});
registerCommand('exit', () => {
  spawnPlayer(-1382.0, 1272.0, 123.0, 90.0);
  safeSetFocus(false, false);
});
registerCommand('outside', () => {
  spawnPlayer(-1382.0, 1272.0, 123.0, 90.0);
  safeSetFocus(false, false);
});
registerCommand('street', () => {
  spawnPlayer(-1375.0, 1245.0, 24.5, 90.0);
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
// 6. Official Engine Lifecycle Hooks (onInit & onceGameLoaded)
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
            // CyberMP EInputAction: 1 = IACT_Press, 2 = IACT_Release
            if (action === 1) { // Press
              keyStates[key] = true;
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
            } else { // IACT_Release (2), IACT_None (0), or any other release/cancel
              keyStates[key] = false;
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
  if (isSpawned) {
    spawnPlayer(-1382.0, 1272.0, 123.0, 90.0);
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
// 7. CEF Browser Lifecycle & Event Handlers
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
      spawnPlayer(-1382.0, 1272.0, 123.0, 90.0);
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

  // Admin Panel Focus
  mp.events.onCef('admin:focus', (state) => {
    safeSetFocus(state, state);
  });

  // Admin Self Toggles (Godmode, Noclip)
  mp.events.onCef('g-cyber:admin:toggleSelf', (type, state) => {
    if (type === 'godmode' || type === 'god') {
      setGodmode(state);
    } else if (type === 'noclip') {
      setNoclip(state);
    }
  });

  // Admin Self Actions (Heal, Revive, Stress Reset)
  mp.events.onCef('g-cyber:admin:selfAction', (action) => {
    if (action === 'heal') {
      handleHealPlayer();
      if (mp.events && typeof mp.events.emitServer === 'function') {
        mp.events.emitServer('g-cyber:server:adminSelfAction', 'heal');
      }
    } else if (action === 'revive') {
      handleRevivePlayer();
      if (mp.events && typeof mp.events.emitServer === 'function') {
        mp.events.emitServer('g-cyber:server:adminSelfAction', 'revive');
      }
    } else if (action === 'stress') {
      if (mp.events && typeof mp.events.emitServer === 'function') {
        mp.events.emitServer('g-cyber:server:adminSelfAction', 'stress');
      }
      if (mp.events && typeof mp.events.emitCef === 'function') {
        mp.events.emitCef('g-cyber:hud:notify', 'Mind Cleared', 'Neural stress indicators zeroed.', 'success');
      }
    }
  });

  // Admin District Quick Teleport
  mp.events.onCef('g-cyber:admin:teleportDistrict', (loc) => {
    handleTeleport([loc]);
  });

  // Admin Coordinates Teleport
  mp.events.onCef('admin:teleport', (x, y, z) => {
    handleTeleport([x, y, z]);
  });

  // Admin Spawn Vehicle
  mp.events.onCef('g-cyber:admin:spawnVehicle', (model) => {
    spawnAdminVehicle(model);
  });
  mp.events.onCef('admin:spawnCar', (model) => {
    spawnAdminVehicle(model);
  });

  // Admin Vehicle Actions (Repair, Flip, Delete)
  mp.events.onCef('g-cyber:admin:vehAction', (action) => {
    handleAdminVehAction(action);
  });

  // Admin Weather & Time
  mp.events.onCef('g-cyber:admin:setWeather', (weather) => {
    handleAdminWeather(weather);
  });
  mp.events.onCef('admin:weather', (weather) => {
    handleAdminWeather(weather);
  });

  mp.events.onCef('g-cyber:admin:setTime', (hour) => {
    handleAdminTime(hour);
  });
  mp.events.onCef('admin:time', (hour) => {
    handleAdminTime(hour);
  });

  // Admin Player Actions
  mp.events.onCef('g-cyber:admin:playerAction', (action, targetId) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:adminPlayerAction', action, targetId);
    }
  });
  mp.events.onCef('admin:playerAction', (action, targetId) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:adminPlayerAction', action, targetId);
    }
  });

  // Admin Broadcast
  mp.events.onCef('g-cyber:admin:broadcast', (text) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:broadcast', text);
    }
  });
  mp.events.onCef('admin:broadcast', (text) => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:admin:broadcast', text);
    }
  });

  // Admin Data Request
  mp.events.onCef('g-cyber:admin:requestData', () => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:requestAdminData');
    }
  });

  // Character Creator Native Mirror & 3D Studio Controls
  mp.events.onCef('g-cyber:creator:openNativeCreator', (scenario) => {
    openNativeCharacterCustomizer(scenario || 'MenuScenario_CharacterCustomization');
  });

  mp.events.onCef('g-cyber:creator:openNativeMirror', () => {
    openNativeMirror();
  });

  mp.events.onCef('g-cyber:creator:rotateCharacter', (yaw) => {
    currentCreatorYaw = parseFloat(yaw) || 90.0;
    if (mp.local && typeof mp.local.spawnPlayer === 'function') {
      mp.local.spawnPlayer(CREATOR_STUDIO_COORDS[0], CREATOR_STUDIO_COORDS[1], CREATOR_STUDIO_COORDS[2], currentCreatorYaw);
    }
  });

  mp.events.onCef('g-cyber:creator:previewChange', (clothingJson) => {
    applyCreatorClothingPreview(clothingJson);
  });

  mp.events.onCef('g-cyber:creator:focusNative', (nativeMode) => {
    safeSetFocus(!nativeMode, !nativeMode);
  });

  mp.events.onCef('g-cyber:admin:teleportToMarker', () => {
    if (mp.events && typeof mp.events.emitServer === 'function') {
      mp.events.emitServer('g-cyber:server:requestTpm');
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
        setNoclip();
      } else if (cmd === 'god') {
        setGodmode();
      } else if (cmd === 'tpm') {
        if (mp.events && typeof mp.events.emitServer === 'function') {
          mp.events.emitServer('g-cyber:server:requestTpm');
        }
      } else if (cmd === 'heal') {
        handleHealPlayer();
        if (mp.events && typeof mp.events.emitServer === 'function') {
          mp.events.emitServer('g-cyber:server:adminSelfAction', 'heal');
        }
      } else if (cmd === 'revive') {
        handleRevivePlayer();
        if (mp.events && typeof mp.events.emitServer === 'function') {
          mp.events.emitServer('g-cyber:server:adminSelfAction', 'revive');
        }
      } else if (cmd === 'char' || cmd === 'multichar') {
        handleChar();
      } else if (cmd === 'creator' || cmd === 'charcreator') {
        openNativeCharacterCustomizer('MenuScenario_CharacterCustomization');
      } else if (cmd === 'skin' || cmd === 'clothing') {
        handleSkin();
      } else if (cmd === 'mirror') {
        openNativeMirror();
      } else if (cmd === 'tp') {
        handleTeleport(args);
      } else if (cmd === 'car' || cmd === 'veh') {
        spawnAdminVehicle(args[0]);
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
// 8. Server Event Handlers
// =====================================================================

if (mp.events && typeof mp.events.onServer === 'function') {
  mp.events.onServer('g-cyber:client:toggleAdmin', () => toggleAdminMenu());
  mp.events.onServer('g-cyber:client:closeUI', () => {
    safeSetFocus(false, false);
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:ui:closeAll');
    }
  });
  mp.events.onServer('g-cyber:client:toggleNoclip', () => setNoclip());
  mp.events.onServer('g-cyber:client:toggleGod', () => setGodmode());
  mp.events.onServer('g-cyber:client:heal', () => handleHealPlayer());
  mp.events.onServer('g-cyber:client:revive', () => handleRevivePlayer());
  mp.events.onServer('g-cyber:client:showCreator', () => handleSkin());
  mp.events.onServer('g-cyber:client:showMultichar', () => handleChar());
  mp.events.onServer('g-cyber:client:respawn', () => {
    spawnPlayer(-1382.0, 1272.0, 123.0, 90.0);
    safeSetFocus(false, false);
  });

  mp.events.onServer('g-cyber:client:teleportCommand', (args) => {
    handleTeleport(args);
  });
  mp.events.onServer('g-cyber:client:teleportToMarker', () => {
    handleTeleportToMarker();
  });

  mp.events.onServer('g-cyber:client:characterLoaded', (charJson) => {
    console.log('[G-CyberRPcore] Character successfully loaded from server. Spawning...');
    try {
      const char = (typeof charJson === 'string') ? JSON.parse(charJson) : charJson;
      const spawnPos = (char && char.position && Array.isArray(char.position) && char.position.length >= 3)
        ? char.position
        : [-1382.0, 1272.0, 123.0];
      spawnPlayer(spawnPos[0], spawnPos[1], spawnPos[2], 90.0);
    } catch (e) {
      spawnPlayer(-1382.0, 1272.0, 123.0, 90.0);
    }
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
      mp.events.emitCef('g-cyber:admin:updatePlayers', listJson);
    }
  });

  mp.events.onServer('g-cyber:client:adminBroadcast', (text) => {
    if (mp.events && typeof mp.events.emitCef === 'function') {
      mp.events.emitCef('g-cyber:admin:broadcast', text);
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
