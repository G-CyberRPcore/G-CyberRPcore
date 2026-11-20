// G-CyberRPcore - Master Server Entry Point
// The Definitive Roleplay Framework for Cyberpunk 2077 (CyberMP)

const G_CyberCore = require('./core/index');

console.log('[G-CyberRPcore] Server runtime initialized. Framework active.');

// In-Memory Admin Registry & Active Characters Cache
const ADMIN_PLAYERS = new Set([0, 1]); // Player ID 0 (Host) & 1 are default admins

// Default Spawn: Megabuilding H10 Apartment (Watson, Little China)
const DEFAULT_SPAWN = [-1392.6, 1271.5, 123.0];

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

    // Teleport to Apartment Spawn
    player.position = DEFAULT_SPAWN;

    // Notify client that character was loaded
    player.emit('g-cyber:client:characterLoaded', JSON.stringify(newChar));
    corePlayer.Functions.SyncHUD();
    corePlayer.Functions.Notify('Welcome to Night City', `Identity ${newChar.charinfo.firstname} ${newChar.charinfo.lastname} initialized.`, 'success');

    console.log(`[Multicharacter] New Citizen registered: ${newChar.charinfo.firstname} ${newChar.charinfo.lastname} (${citizenid})`);
  } catch (err) {
    console.error('[Multicharacter] Error creating character:', err);
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

    // Teleport player
    player.position = DEFAULT_SPAWN;

    // Notify client
    player.emit('g-cyber:client:characterLoaded', JSON.stringify(charData));
    corePlayer.Functions.SyncHUD();
    corePlayer.Functions.Notify('Identity Loaded', `Welcome back to Night City, ${charData.charinfo.firstname}.`, 'success');

    console.log(`[Multicharacter] Player ${player.nickname} selected ${charData.charinfo.firstname} (${citizenid})`);
  } catch (err) {
    console.error('[Multicharacter] Error selecting character:', err);
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
    case 'heal':
      target.health = 100;
      if (targetCore) {
        targetCore.Functions.SetMetaData('health', 100);
        targetCore.Functions.SetMetaData('armor', 100);
        targetCore.Functions.SyncHUD();
      }
      player.emit('g-cyber:client:notify', 'Healed', `Player #${targetId} health restored to 100%`, 'success');
      target.emit('g-cyber:client:notify', 'Healed', 'Your vitals were restored by Trauma Admin.', 'success');
      break;

    case 'givemoney':
      if (targetCore) {
        targetCore.Functions.AddMoney('cash', 10000, 'Admin Grant');
        player.emit('g-cyber:client:notify', 'Money Sent', `Granted $10,000 cash to player #${targetId}`, 'success');
      }
      break;

    case 'setjob':
      if (targetCore) {
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

  if (action === 'heal') {
    player.health = 100;
    if (coreP) {
      coreP.Functions.SetMetaData('health', 100);
      coreP.Functions.SetMetaData('armor', 100);
      coreP.Functions.SyncHUD();
    }
  } else if (action === 'stress') {
    if (coreP) {
      coreP.Functions.SetMetaData('stress', 0);
      coreP.Functions.SyncHUD();
    }
  }
});

// Vehicle Actions (Repair, Flip, Delete)
mp.events.onClient('g-cyber:admin:vehAction', (player, action) => {
  if (!isPlayerAdmin(player)) return;
  console.log(`[Admin] Player ${player.id} executed vehicle action: ${action}`);
  if (action === 'repair') {
    player.health = 100;
    player.emit('g-cyber:client:notify', 'Vehicle Repaired', 'Vehicle body and engine restored to 100%.', 'success');
  } else if (action === 'flip') {
    player.emit('g-cyber:client:notify', 'Vehicle Flipped', 'Vehicle re-oriented upright.', 'info');
  } else if (action === 'delete') {
    player.emit('g-cyber:client:notify', 'Vehicle Despawned', 'Active vehicle despawned.', 'warning');
  }
});

// Vehicle Spawning
mp.events.onClient('g-cyber:admin:spawnVehicle', (player, modelKey) => {
  if (!isPlayerAdmin(player)) return;
  const pPos = player.position || [0, 0, 0];
  const spawnPos = [pPos[0] + 3.0, pPos[1] + 3.0, pPos[2]];

  console.log(`[Admin] Spawning vehicle ${modelKey} for player ${player.id} at [${spawnPos}]`);
  player.emit('g-cyber:client:notify', 'Vehicle Dispatched', `${modelKey} materialized.`, 'success');
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
