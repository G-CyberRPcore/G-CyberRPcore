// G-CyberRPcore - Master Server Entry Point
// The Definitive Roleplay Framework for Cyberpunk 2077 (CyberMP)

const G_CyberCore = require('./core/index');
global.G_CyberCore = G_CyberCore;

const G_CyberInventory = require('./core/inventory');
G_CyberInventory.Mount();

console.log('[G-CyberRPcore] Server runtime initialized. Framework active.');

// In-Memory Admin Registry & Active Characters Cache
const ADMIN_PLAYERS = new Set([0, 1]); // Player ID 0 (Host) & 1 are default admins

// Default Spawn: Megabuilding H10 Atrium Hallway (Watson, Little China - open walkway, elevators, shops)
const DEFAULT_SPAWN = [-1382.0, 1272.0, 123.0];
const STREET_SPAWN = [-1375.0, 1245.0, 24.5];

// Helper: Get Player Identification Key (License / IP / Nickname)
function getPlayerKey(player) {
  if (!player) return 'unknown';
  return player.nickname || `player_${player.id}`;
}

// Helper: Check Admin Status
function isPlayerAdmin(player) {
  if (!player) return false;
  if (ADMIN_PLAYERS.has(player.id)) return true;
  if (player.getMeta && (player.getMeta('permission') === 'admin' || player.getMeta('permission') === 'god')) return true;
  return false;
}

// =====================================================================
// 1. Multicharacter & Identity Handlers
// =====================================================================

// Client requests character slots
mp.events.onClient('g-cyber:server:requestCharacters', (player) => {
  try {
    const pKey = getPlayerKey(player);
    console.log(`[Multicharacter] Player ${pKey} (ID: ${player.id}) requested character list.`);

    const userChars = G_CyberCore.Database.GetCharactersForPlayer(pKey, player.id);
    console.log(`[Multicharacter] Returning ${userChars.length} characters to player ${pKey}.`);

    player.emit('g-cyber:client:receiveCharacters', JSON.stringify(userChars));
  } catch (err) {
    console.error('[Multicharacter] Error fetching characters:', err);
    player.emit('g-cyber:client:receiveCharacters', JSON.stringify([]));
  }
});

// Client creates new character
mp.events.onClient('g-cyber:server:createCharacter', (player, characterJson) => {
  try {
    const data = (typeof characterJson === 'string') ? JSON.parse(characterJson) : (characterJson || {});
    const pKey = getPlayerKey(player);
    const citizenid = `NC-${Math.floor(100000 + Math.random() * 900000)}`;

    const newChar = {
      citizenid: citizenid,
      ownerKey: pKey,
      slot: data.slot || 1,
      charinfo: data.charinfo || {
        firstname: 'Valerie',
        lastname: 'Street',
        birthdate: '2054-10-12',
        gender: 'female',
        lifepath: 'streetkid'
      },
      clothing: data.clothing || {},
      money: {
        cash: 5000,
        bank: 25000,
        crypto: 100
      },
      job: {
        name: 'civilian',
        label: 'Civilian Citizen',
        payment: 750,
        onDuty: true,
        grade: { name: 'Unemployed', level: 0 }
      },
      gang: {
        name: 'none',
        label: 'No Gang Affiliation'
      },
      metadata: {
        health: 100,
        armor: 100,
        hunger: 100,
        thirst: 100,
        stress: 0
      },
      inventory: [
        { name: 'maxdoc_mk1', label: 'MaxDoc Mk.1 Inhaler', amount: 3, weight: 0.2 },
        { name: 'phone', label: 'Personal Agent Phone', amount: 1, weight: 0.1 },
        { name: 'id_card', label: 'Night City Citizen ID', amount: 1, weight: 0.05 }
      ],
      created: Date.now()
    };

    // Save to Database
    G_CyberCore.Database.SavePlayer(citizenid, newChar);

    // Register active player in G_CyberCore
    const corePlayer = G_CyberCore.CreatePlayer(player, newChar);

    // Teleport to Hallway / Atrium Spawn
    const spawnPos = (newChar.position && Array.isArray(newChar.position) && newChar.position.length >= 3)
      ? newChar.position
      : DEFAULT_SPAWN;
    player.position = spawnPos;

    // Notify client that character was loaded
    player.emit('g-cyber:client:characterLoaded', JSON.stringify(newChar));
    if (corePlayer) {
      if (corePlayer.Functions && typeof corePlayer.Functions.SyncHUD === 'function') {
        corePlayer.Functions.SyncHUD();
      } else if (typeof corePlayer.SyncHUD === 'function') {
        corePlayer.SyncHUD();
      }
      if (corePlayer.Functions && typeof corePlayer.Functions.Notify === 'function') {
        corePlayer.Functions.Notify('Welcome to Night City', `Identity ${newChar.charinfo.firstname} ${newChar.charinfo.lastname} initialized.`, 'success');
      } else if (typeof corePlayer.Notify === 'function') {
        corePlayer.Notify('Welcome to Night City', `Identity ${newChar.charinfo.firstname} ${newChar.charinfo.lastname} initialized.`, 'success');
      }
    }

    console.log(`[Multicharacter] New Citizen registered: ${newChar.charinfo.firstname} ${newChar.charinfo.lastname} (${citizenid})`);
  } catch (err) {
    console.error('[Multicharacter] Error creating character:', err.message || err);
    if (err.stack) console.error(err.stack);
  }
});

// Client selects existing character
mp.events.onClient('g-cyber:server:selectCharacter', (player, citizenid) => {
  try {
    const charData = G_CyberCore.Database.GetPlayerByCitizenId(citizenid);
    if (!charData) {
      player.emit('g-cyber:client:notify', 'Error', 'Character identity record not found.', 'error');
      return;
    }

    // Register in memory
    const corePlayer = G_CyberCore.CreatePlayer(player, charData);

    // Teleport player to saved position or open atrium spawn
    const spawnPos = (charData.position && Array.isArray(charData.position) && charData.position.length >= 3)
      ? charData.position
      : DEFAULT_SPAWN;
    player.position = spawnPos;

    // Notify client
    player.emit('g-cyber:client:characterLoaded', JSON.stringify(charData));
    if (corePlayer) {
      if (corePlayer.Functions && typeof corePlayer.Functions.SyncHUD === 'function') {
        corePlayer.Functions.SyncHUD();
      } else if (typeof corePlayer.SyncHUD === 'function') {
        corePlayer.SyncHUD();
      }
      if (corePlayer.Functions && typeof corePlayer.Functions.Notify === 'function') {
        corePlayer.Functions.Notify('Identity Loaded', `Welcome back to Night City, ${charData.charinfo.firstname}.`, 'success');
      } else if (typeof corePlayer.Notify === 'function') {
        corePlayer.Notify('Identity Loaded', `Welcome back to Night City, ${charData.charinfo.firstname}.`, 'success');
      }
    }

    console.log(`[Multicharacter] Player ${player.nickname} selected ${charData.charinfo.firstname} (${citizenid})`);
  } catch (err) {
    console.error('[Multicharacter] Error selecting character:', err.message || err);
    if (err.stack) console.error(err.stack);
  }
});

// Client deletes character
mp.events.onClient('g-cyber:server:deleteCharacter', (player, citizenid) => {
  try {
    G_CyberCore.Database.DeletePlayer(citizenid);
    console.log(`[Multicharacter] Citizen ${citizenid} deleted from database.`);

    const pKey = getPlayerKey(player);
    const userChars = G_CyberCore.Database.GetCharactersForPlayer(pKey, player.id);
    player.emit('g-cyber:client:receiveCharacters', JSON.stringify(userChars));
  } catch (err) {
    console.error('[Multicharacter] Error deleting character:', err);
  }
});

// =====================================================================
// 2. Admin Management System
// =====================================================================

// Request Admin Data (List of players)
mp.events.onClient('g-cyber:server:requestAdminData', (player) => {
  if (!isPlayerAdmin(player)) {
    player.emit('g-cyber:client:notify', 'Access Denied', 'Admin privileges required.', 'error');
    return;
  }

  const list = [];
  mp.players.toArray().forEach(p => {
    const coreP = G_CyberCore.Functions.GetPlayer(p.id);
    const pName = coreP ? `${coreP.PlayerData.charinfo.firstname} ${coreP.PlayerData.charinfo.lastname}` : (p.nickname || `Player #${p.id}`);
    const jobLabel = coreP ? coreP.PlayerData.job.label : 'Civilian';
    list.push({
      id: p.id,
      name: pName,
      job: jobLabel,
      ping: 12,
      health: p.health || 100
    });
  });

  player.emit('g-cyber:client:receiveAdminData', JSON.stringify(list));
});

// Admin action on target player
mp.events.onClient('g-cyber:server:adminPlayerAction', (player, action, targetId) => {
  if (!isPlayerAdmin(player)) return;

  const target = mp.players.at(targetId);
  if (!target) {
    player.emit('g-cyber:client:notify', 'Player Offline', 'Target player could not be located.', 'warning');
    return;
  }

  const targetCore = G_CyberCore.Functions.GetPlayer(targetId);

  switch (action) {
    case 'teleport':
      player.position = target.position;
      player.emit('g-cyber:client:notify', 'Teleport', `Teleported to player #${targetId}`, 'success');
      break;

    case 'bring':
      target.position = player.position;
      player.emit('g-cyber:client:notify', 'Bring', `Brought player #${targetId} to your location`, 'success');
      target.emit('g-cyber:client:notify', 'Admin Notice', 'You were summoned by an Admin.', 'info');
      break;

    case 'freeze':
      target.emit('g-cyber:client:notify', 'Admin Notice', 'Your movement status was toggled by an Admin.', 'warning');
      break;

    case 'revive':
      target.health = 100;
      if (targetCore) {
        if (targetCore.Functions && typeof targetCore.Functions.SetMetaData === 'function') {
          targetCore.Functions.SetMetaData('health', 100);
          targetCore.Functions.SetMetaData('armor', 100);
        }
        if (targetCore.Functions && typeof targetCore.Functions.SyncHUD === 'function') {
          targetCore.Functions.SyncHUD();
        } else if (typeof targetCore.SyncHUD === 'function') {
          targetCore.SyncHUD();
        }
      }
      target.emit('g-cyber:client:revive');
      player.emit('g-cyber:client:notify', 'Revived', `Player #${targetId} was revived successfully.`, 'success');
      target.emit('g-cyber:client:notify', 'Trauma Team Revive', 'You were revived by Trauma Admin.', 'success');
      break;

    case 'heal':
      target.health = 100;
      if (targetCore) {
        if (targetCore.Functions && typeof targetCore.Functions.SetMetaData === 'function') {
          targetCore.Functions.SetMetaData('health', 100);
          targetCore.Functions.SetMetaData('armor', 100);
        }
        if (targetCore.Functions && typeof targetCore.Functions.SyncHUD === 'function') {
          targetCore.Functions.SyncHUD();
        } else if (typeof targetCore.SyncHUD === 'function') {
          targetCore.SyncHUD();
        }
      }
      target.emit('g-cyber:client:heal');
      player.emit('g-cyber:client:notify', 'Healed', `Player #${targetId} health restored to 100%`, 'success');
      target.emit('g-cyber:client:notify', 'Healed', 'Your vitals were restored by Trauma Admin.', 'success');
      break;

    case 'givemoney':
      if (targetCore && targetCore.Functions && typeof targetCore.Functions.AddMoney === 'function') {
        targetCore.Functions.AddMoney('cash', 10000, 'Admin Grant');
        player.emit('g-cyber:client:notify', 'Money Sent', `Granted $10,000 cash to player #${targetId}`, 'success');
      }
      break;

    case 'setjob':
      if (targetCore && targetCore.Functions && typeof targetCore.Functions.SetJob === 'function') {
        targetCore.Functions.SetJob('ncpd', 2);
        player.emit('g-cyber:client:notify', 'Job Updated', `Set player #${targetId} to NCPD Sergeant`, 'success');
      }
      break;

    case 'kick':
      target.kick();
      player.emit('g-cyber:client:notify', 'Kicked', `Player #${targetId} has been disconnected.`, 'info');
      break;
  }
});

// Admin Self Actions
mp.events.onClient('g-cyber:server:adminSelfAction', (player, action) => {
  if (!isPlayerAdmin(player)) return;
  const coreP = G_CyberCore.Functions.GetPlayer(player.id);

  if (action === 'heal' || action === 'revive') {
    player.health = 100;
    if (coreP) {
      if (coreP.Functions && typeof coreP.Functions.SetMetaData === 'function') {
        coreP.Functions.SetMetaData('health', 100);
        coreP.Functions.SetMetaData('armor', 100);
      }
      if (coreP.Functions && typeof coreP.Functions.SyncHUD === 'function') {
        coreP.Functions.SyncHUD();
      } else if (typeof coreP.SyncHUD === 'function') {
        coreP.SyncHUD();
      }
    }
    if (action === 'revive') {
      player.emit('g-cyber:client:revive');
    } else {
      player.emit('g-cyber:client:heal');
    }
  } else if (action === 'stress') {
    if (coreP) {
      if (coreP.Functions && typeof coreP.Functions.SetMetaData === 'function') {
        coreP.Functions.SetMetaData('stress', 0);
      }
      if (coreP.Functions && typeof coreP.Functions.SyncHUD === 'function') {
        coreP.Functions.SyncHUD();
      } else if (typeof coreP.SyncHUD === 'function') {
        coreP.SyncHUD();
      }
    }
  }
});

// Helper: Resolve Vehicle Model Identifier to SharedVehicles key
function resolveVehicleModelKey(input) {
  if (!input) return 'quadra_turbo_r';
  const clean = input.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const ALIAS_MAP = {
    'quadraturbor': 'quadra_turbo_r',
    'quadra': 'quadra_turbo_r',
    'turbo': 'quadra_turbo_r',
    'rayfieldcaliburn': 'rayfield_caliburn',
    'caliburn': 'rayfield_caliburn',
    'archnazare': 'arch_nazare',
    'arch': 'arch_nazare',
    'nazare': 'arch_nazare',
    'policecruiser': 'ncpd_cruiser',
    'police': 'ncpd_cruiser',
    'cop': 'ncpd_cruiser',
    'ncpd': 'ncpd_cruiser',
    'ambulance': 'trauma_ambulance',
    'trauma': 'trauma_ambulance',
    'delamain': 'delamain_cab',
    'delamaincab': 'delamain_cab',
    'porsche': 'porsche_911',
    'porsche911': 'porsche_911',
    'shion': 'mizutani_shion',
    'mizutani': 'mizutani_shion',
    'hella': 'archer_hella',
    'cortes': 'villefort_cortes',
    'maimai': 'makigai_maimai',
    'mackinaw': 'thorton_mackinaw',
    'thrax': 'chevillon_thrax',
    'kusanagi': 'yaiba_kusanagi',
    'apollo': 'brennan_apollo'
  };

  if (ALIAS_MAP[clean]) return ALIAS_MAP[clean];
  if (G_CyberCore.Shared && G_CyberCore.Shared.Vehicles) {
    if (G_CyberCore.Shared.Vehicles[input]) return input;
    if (G_CyberCore.Shared.Vehicles[clean]) return clean;
    for (const [k, v] of Object.entries(G_CyberCore.Shared.Vehicles)) {
      if (k.toLowerCase() === clean || k.toLowerCase().replace(/_/g, '') === clean || (v.model && v.model.toLowerCase().includes(clean))) {
        return k;
      }
    }
  }
  return 'quadra_turbo_r';
}

// Vehicle Actions (Repair, Flip, Delete)
mp.events.onClient('g-cyber:admin:vehAction', (player, action) => {
  if (!isPlayerAdmin(player)) return;
  console.log(`[Admin] Player ${player.id} executed vehicle action: ${action}`);

  let targetVeh = player.vehicle;
  if (!targetVeh && player.lastAdminVehicleId && mp.vehicles && mp.vehicles.exists(player.lastAdminVehicleId)) {
    targetVeh = mp.vehicles.at(player.lastAdminVehicleId);
  }

  if (action === 'repair') {
    if (targetVeh) {
      targetVeh.health = 1000;
      if (typeof targetVeh.repair === 'function') targetVeh.repair();
    }
    player.health = 100;
    player.emit('g-cyber:client:notify', 'Vehicle Repaired', 'Vehicle body and engine restored to 100%.', 'success');
  } else if (action === 'flip') {
    if (targetVeh && targetVeh.position) {
      targetVeh.position = [targetVeh.position[0], targetVeh.position[1], targetVeh.position[2] + 0.6];
      targetVeh.rotation = [0, 0, targetVeh.yaw || 0];
    }
    player.emit('g-cyber:client:notify', 'Vehicle Flipped', 'Vehicle re-oriented upright.', 'info');
  } else if (action === 'delete') {
    if (targetVeh) {
      G_CyberCore.Functions.DeleteVehicle(targetVeh.id);
      player.lastAdminVehicleId = null;
    }
    player.emit('g-cyber:client:notify', 'Vehicle Despawned', 'Active vehicle despawned.', 'warning');
  }
});

// Vehicle Spawning
mp.events.onClient('g-cyber:admin:spawnVehicle', (player, rawModelKey) => {
  if (!isPlayerAdmin(player)) return;
  const targetKey = resolveVehicleModelKey(rawModelKey);
  const vehData = (G_CyberCore.Shared && G_CyberCore.Shared.Vehicles) ? G_CyberCore.Shared.Vehicles[targetKey] : null;

  // Cleanup previously spawned admin vehicle to prevent duplicate clutter
  if (player.lastAdminVehicleId && mp.vehicles && mp.vehicles.exists(player.lastAdminVehicleId)) {
    try {
      G_CyberCore.Functions.DeleteVehicle(player.lastAdminVehicleId);
    } catch(e) {}
  }

  const pPos = (player.position && Array.isArray(player.position)) ? player.position : [DEFAULT_SPAWN[0], DEFAULT_SPAWN[1], DEFAULT_SPAWN[2]];
  const yaw = player.yaw || 0.0;
  const rad = (yaw * Math.PI) / 180.0;
  // Place 4.5 meters in front of the player
  const spawnPos = [
    pPos[0] - Math.sin(rad) * 4.5,
    pPos[1] + Math.cos(rad) * 4.5,
    pPos[2] + 0.35
  ];

  console.log(`[Admin] Spawning networked vehicle ${targetKey} for player ${player.id} at [${spawnPos}]`);
  const veh = G_CyberCore.Functions.CreateVehicle(targetKey, spawnPos, yaw, player.PlayerData ? player.PlayerData.citizenid : null);
  if (veh) {
    player.lastAdminVehicleId = veh.id;
    const vehName = vehData ? vehData.name : targetKey;
    player.emit('g-cyber:client:notify', 'Vehicle Materialized', `${vehName} dispatched in front of you.`, 'success');
  } else {
    console.error(`[Admin] Failed to spawn vehicle: ${rawModelKey}`);
    player.emit('g-cyber:client:notify', 'Spawn Error', `Could not instantiate vehicle ${rawModelKey}.`, 'error');
  }
});

// Weather & Time
mp.events.onClient('g-cyber:admin:setWeather', (player, weather) => {
  if (!isPlayerAdmin(player)) return;
  console.log(`[Admin] Weather updated to: ${weather}`);
  mp.players.toArray().forEach(p => {
    p.emit('g-cyber:client:notify', 'Weather Alert', `Atmospheric condition: ${weather.toUpperCase()}`, 'info');
  });
});

mp.events.onClient('g-cyber:admin:setTime', (player, hour) => {
  if (!isPlayerAdmin(player)) return;
  console.log(`[Admin] World time shifted to: ${hour}:00`);
});

// Server Hologram Announcement
mp.events.onClient('g-cyber:admin:broadcast', (player, text) => {
  if (!isPlayerAdmin(player)) return;
  mp.players.toArray().forEach(p => {
    p.emit('g-cyber:client:adminBroadcast', text);
  });
});

// Teleport to coordinates
mp.events.onClient('g-cyber:admin:teleportCoords', (player, x, y, z) => {
  if (player && typeof player.position !== 'undefined') {
    player.position = [parseFloat(x), parseFloat(y), parseFloat(z)];
    player.emit('g-cyber:client:notify', 'Teleport', `Teleported to [${x}, ${y}, ${z}]`, 'success');
  }
});

// Teleport to map marker / waypoint (Admin Only)
mp.events.onClient('g-cyber:server:requestTpm', (player) => {
  if (!player) return;
  if (!isPlayerAdmin(player)) {
    player.emit('g-cyber:client:notify', 'Access Denied', 'Command /tpm is restricted to Admins only.', 'error');
    return;
  }
  player.emit('g-cyber:client:teleportToMarker');
});

// Player Lifecycle Hooks
mp.events.on('playerConnecting', (tempId, name) => {
  console.log(`[Connect] Incoming connection from ${name} (TempID: ${tempId})`);
});

mp.events.on('playerConnected', (playerId, tempId) => {
  const player = mp.players.at(playerId);
  if (!player) return;
  console.log(`[G-CyberRPcore] Citizen ${player.nickname || 'Unknown'} (ID #${playerId}) connected.`);
  if (mp.events && typeof mp.events.emitClient === 'function') {
    mp.events.emitClient(playerId, 'chat:add', '[G-CyberRPcore] Welcome to Night City. Press F10 for Admin Menu, or type /admin in console.', 'system');
  }
});

mp.events.on('playerSpawn', (playerId) => {
  const player = mp.players.at(playerId);
  console.log(`[G-CyberRPcore] Citizen #${playerId} spawned in world.`);
});

// Lua bridge for admin menu toggle
mp.events.onClient('g-cyber:admin:toggleAdminMenu', (player) => {
  if (player) {
    if (typeof player.emit === 'function') player.emit('g-cyber:client:toggleAdmin');
    if (mp.events && typeof mp.events.emitClient === 'function') {
      mp.events.emitClient(player.id, 'g-cyber:client:toggleAdmin');
    }
  }
});

// =====================================================================
// PROXIMITY ROLEPLAY CHAT & EMERGENCY DISPATCH HANDLERS
// =====================================================================

function sendProximityMessage(player, text, maxDistance = 15, msgType = 'normal') {
  if (!player || !player.position) return;
  const pPos = player.position;
  const pDim = player.dimension || 0;

  mp.players.toArray().forEach((target) => {
    if ((target.dimension || 0) !== pDim) return;
    const tPos = target.position;
    if (!tPos) return;
    const distance = Math.hypot(pPos[0] - tPos[0], pPos[1] - tPos[1], pPos[2] - tPos[2]);
    if (distance <= maxDistance) {
      target.emit('chat:add', text, msgType);
    }
  });
}

// Proximity local chat (regular speech)
mp.events.onClient('chat:message', (player, text) => {
  if (!text || text.trim().length === 0) return;
  const cleanText = text.trim();
  const format = `[Local] ${player.nickname}: ${cleanText}`;
  sendProximityMessage(player, format, 15, 'normal');
});

// Chat commands dispatcher
mp.events.onClient('chat:command', (player, cmdName, args = []) => {
  const cmd = (cmdName || '').toLowerCase();

  switch (cmd) {
    case 'exit':
    case 'outside':
    case 'leave': {
      player.position = DEFAULT_SPAWN;
      player.emit('g-cyber:client:notify', 'Wayfinding', 'Exited room to Megabuilding H10 Atrium walkway.', 'success');
      player.emit('chat:add', '[System] Teleported outside to open Megabuilding H10 Atrium.', 'system');
      break;
    }

    case 'street': {
      player.position = STREET_SPAWN;
      player.emit('g-cyber:client:notify', 'Wayfinding', 'Teleported to Little China street level.', 'success');
      player.emit('chat:add', '[System] Teleported to Little China street plaza.', 'system');
      break;
    }

    case 'apartment': {
      const pPos = player.position || [0, 0, 0];
      const distToInside = Math.hypot(pPos[0] - (-1392.6), pPos[1] - 1271.5);
      if (distToInside < 8.0) {
        player.position = DEFAULT_SPAWN;
        player.emit('chat:add', '[Apartment] Exited to Megabuilding H10 hallway.', 'system');
      } else {
        player.position = [-1392.6, 1271.5, 123.0];
        player.emit('chat:add', '[Apartment] Entered V\'s Megabuilding H10 apartment.', 'system');
      }
      break;
    }

    case 'me': {
      if (!args || args.length === 0) {
        player.emit('chat:add', 'Usage: /me <action>', 'system');
        return;
      }
      sendProximityMessage(player, `* ${player.nickname} ${args.join(' ')}`, 15, 'me');
      break;
    }

    case 'do': {
      if (!args || args.length === 0) {
        player.emit('chat:add', 'Usage: /do <description>', 'system');
        return;
      }
      sendProximityMessage(player, `* ${args.join(' ')} (( ${player.nickname} ))`, 15, 'do');
      break;
    }

    case 'b':
    case 'ooc': {
      if (!args || args.length === 0) {
        player.emit('chat:add', 'Usage: /ooc <message>', 'system');
        return;
      }
      sendProximityMessage(player, `(( [OOC] ${player.nickname}: ${args.join(' ')} ))`, 15, 'ooc');
      break;
    }

    case 's':
    case 'shout': {
      if (!args || args.length === 0) {
        player.emit('chat:add', 'Usage: /shout <message>', 'system');
        return;
      }
      sendProximityMessage(player, `[Shout] ${player.nickname}: ${args.join(' ')}!`, 35, 'shout');
      break;
    }

    case 'w':
    case 'whisper': {
      if (!args || args.length === 0) {
        player.emit('chat:add', 'Usage: /whisper <message>', 'system');
        return;
      }
      sendProximityMessage(player, `[Whisper] ${player.nickname}: ${args.join(' ')}`, 3.5, 'whisper');
      break;
    }

    case 'tweet': {
      if (!args || args.length === 0) {
        player.emit('chat:add', 'Usage: /tweet <message>', 'system');
        return;
      }
      const tweetText = `[NightNet] @${player.nickname}: ${args.join(' ')}`;
      mp.players.toArray().forEach((p) => {
        p.emit('chat:add', tweetText, 'tweet');
      });
      break;
    }

    case 'dispatch':
    case '911': {
      if (!args || args.length === 0) {
        player.emit('chat:add', 'Usage: /dispatch <emergency report>', 'system');
        return;
      }
      const pPos = player.position || [0, 0, 0];
      const alert = `[EMERGENCY 911] Call from ${player.nickname} (Pos: [${Math.round(pPos[0])}, ${Math.round(pPos[1])}]): ${args.join(' ')}`;
      mp.players.toArray().forEach((p) => {
        p.emit('chat:add', alert, 'dispatch');
      });
      player.emit('chat:add', '[911] Your emergency transmission was routed to Night City First Responders.', 'system');
      break;
    }

    case 'help': {
      player.emit('chat:add', '=== Night City RP Commands ===', 'system');
      player.emit('chat:add', '/me <action> • /do <state> • /ooc <msg> • /shout <msg>', 'system');
      player.emit('chat:add', '/exit or /outside - Teleport to open atrium if trapped in a room', 'system');
      player.emit('chat:add', '/street - Teleport to street level', 'system');
      player.emit('chat:add', '/apartment - Toggle apartment entrance/exit', 'system');
      player.emit('chat:add', '/tweet <msg> • /dispatch <msg> • /admin (or F10)', 'system');
      break;
    }

    default: {
      player.emit('chat:add', `Unknown command: /${cmd}. Type /help for available commands.`, 'system');
      break;
    }
  }
});

// =====================================================================
// SERVER COMMANDS (F8 Console & Server Terminal Registry)
// =====================================================================
if (mp.commands) {
  // Command: admin / adminmenu / a / hub
  mp.commands.add('admin', (player, args) => {
    if (player) {
      if (typeof player.emit === 'function') player.emit('g-cyber:client:toggleAdmin');
      if (mp.events && typeof mp.events.emitClient === 'function') {
        mp.events.emitClient(player.id, 'g-cyber:client:toggleAdmin');
      }
    } else {
      console.log('[Admin] Admin command is for in-game players.');
    }
  });
  mp.commands.add('adminmenu', (player, args) => {
    if (player) {
      if (typeof player.emit === 'function') player.emit('g-cyber:client:toggleAdmin');
      if (mp.events && typeof mp.events.emitClient === 'function') {
        mp.events.emitClient(player.id, 'g-cyber:client:toggleAdmin');
      }
    }
  });
  mp.commands.add('a', (player, args) => {
    if (player) {
      if (typeof player.emit === 'function') player.emit('g-cyber:client:toggleAdmin');
      if (mp.events && typeof mp.events.emitClient === 'function') {
        mp.events.emitClient(player.id, 'g-cyber:client:toggleAdmin');
      }
    }
  });
  mp.commands.add('hub', (player, args) => {
    if (player) {
      if (typeof player.emit === 'function') player.emit('g-cyber:client:toggleAdmin');
      if (mp.events && typeof mp.events.emitClient === 'function') {
        mp.events.emitClient(player.id, 'g-cyber:client:toggleAdmin');
      }
    }
  });

  // Command: noclip
  mp.commands.add('noclip', (player, args) => {
    if (player) player.emit('g-cyber:client:toggleNoclip');
  });

  // Command: god
  mp.commands.add('god', (player, args) => {
    if (player) player.emit('g-cyber:client:toggleGod');
  });

  // Command: tp <district> or <x> <y> <z>
  mp.commands.add('tp', (player, args) => {
    if (player && args && args.length > 0) {
      player.emit('g-cyber:client:teleportCommand', args);
    }
  });

  // Command: tpm (Teleport to Map Waypoint - Admin Only)
  mp.commands.add('tpm', (player) => {
    if (!player) return;
    if (!isPlayerAdmin(player)) {
      player.emit('g-cyber:client:notify', 'Access Denied', 'Command /tpm is restricted to Admins only.', 'error');
      return;
    }
    player.emit('g-cyber:client:teleportToMarker');
  });

  // Command: car / veh <model>
  mp.commands.add('car', (player, args) => {
    if (player) {
      const model = (args && args.length > 0) ? args[0] : 'QuadraTurboR';
      mp.events.emit('g-cyber:admin:spawnVehicle', player, model);
    }
  });
  mp.commands.add('veh', (player, args) => {
    if (player) {
      const model = (args && args.length > 0) ? args[0] : 'QuadraTurboR';
      mp.events.emit('g-cyber:admin:spawnVehicle', player, model);
    }
  });

  // Command: char / multichar
  mp.commands.add('char', (player, args) => {
    if (player) player.emit('g-cyber:client:showMultichar');
  });
  mp.commands.add('multichar', (player, args) => {
    if (player) player.emit('g-cyber:client:showMultichar');
  });

  // Command: skin / clothing / mirror
  mp.commands.add('skin', (player, args) => {
    if (player) player.emit('g-cyber:client:showCreator');
  });
  mp.commands.add('clothing', (player, args) => {
    if (player) player.emit('g-cyber:client:showCreator');
  });
  mp.commands.add('mirror', (player, args) => {
    if (player) player.emit('g-cyber:client:showCreator');
  });

  // Command: revive
  mp.commands.add('revive', (player, args) => {
    if (player) {
      const targetId = (args && args.length > 0) ? parseInt(args[0]) : player.id;
      mp.events.emit('g-cyber:server:adminPlayerAction', player, 'revive', targetId);
    }
  });

  // Command: heal
  mp.commands.add('heal', (player, args) => {
    if (player) {
      const targetId = (args && args.length > 0) ? parseInt(args[0]) : player.id;
      mp.events.emit('g-cyber:server:adminPlayerAction', player, 'heal', targetId);
    }
  });

  // Command: spawn (re-spawns at default position)
  mp.commands.add('spawn', (player, args) => {
    if (player) player.emit('g-cyber:client:respawn');
  });

  // Command: closeui (Releases CEF focus and enters gameplay)
  mp.commands.add('closeui', (player, args) => {
    if (player) {
      if (typeof player.emit === 'function') player.emit('g-cyber:client:closeUI');
      if (mp.events && typeof mp.events.emitClient === 'function') {
        mp.events.emitClient(player.id, 'g-cyber:client:closeUI');
      }
    }
  });

  // Command: ping
  mp.commands.add('ping', (player, args) => {
    if (player) {
      player.emit('chat:add', `Latency: ${player.ping || 0}ms. Server active.`, 'system');
    } else {
      console.log('[Server] G-CyberRPcore is running.');
    }
  });

  // Command: setadmin <id> on server console
  mp.commands.add('setadmin', (player, args) => {
    if (args && args.length > 0) {
      const targetId = parseInt(args[0]);
      ADMIN_PLAYERS.add(targetId);
      const target = mp.players.at(targetId);
      if (target) {
        target.setMeta('permission', 'admin');
        target.emit('g-cyber:client:notify', 'Admin Granted', 'You are now an authorized Server Administrator.', 'success');
      }
      console.log(`[Admin] Player #${targetId} granted Admin permission.`);
    }
  });
}
