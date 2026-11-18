// G-CyberRPcore - Master Server Entry Point
// The Definitive Roleplay Framework for Cyberpunk 2077 (CyberMP)

const G_CyberCore = require('./core/index');

console.log('[G-CyberRPcore] Server runtime initialized. Framework active.');

// In-Memory Admin Registry & Active Characters Cache
const ADMIN_PLAYERS = new Set([0, 1]); // Player ID 0 (Host) & 1 are default admins
const playerCharactersMap = new Map(); // playerIdentifier -> array of character objects

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
// 1. Multicharacter & Identity Handlers (qb-multicharacter)
// =====================================================================

// Client requests character slots
mp.events.onClient('g-cyber:server:requestCharacters', (player) => {
  const pKey = getPlayerKey(player);
  console.log(`[Multicharacter] Player ${pKey} (ID: ${player.id}) requested character list.`);

  // Load from persistent database
  const allStored = G_CyberCore.Database.players || {};
  const userChars = [];

  for (const cid in allStored) {
    const data = allStored[cid];
    if (data.ownerKey === pKey || data.id === player.id) {
      userChars.push(data);
    }
  }

  // If none exists, provide clean state
  player.emit('g-cyber:client:receiveCharacters', JSON.stringify(userChars));
});

// Client creates new character
mp.events.onClient('g-cyber:server:createCharacter', (player, characterJson) => {
  try {
    const data = JSON.parse(characterJson);
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
        cash: 1500,
        bank: 10000,
        crypto: 50
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
    G_CyberCore.Database.players[citizenid] = newChar;
    G_CyberCore.Database.Save();

    // Register active player in G_CyberCore
    const corePlayer = G_CyberCore.Player.CreatePlayer(player, newChar);
    G_CyberCore.Players[player.id] = corePlayer;

    // Teleport to Apartment Spawn
    player.position = DEFAULT_SPAWN;

    // Sync HUD with new character
    corePlayer.Functions.SyncHUD();
    corePlayer.Functions.Notify('Welcome to Night City', `Identity ${newChar.charinfo.firstname} initialized.`, 'success');

    console.log(`[Multicharacter] New Citizen registered: ${newChar.charinfo.firstname} ${newChar.charinfo.lastname} (${citizenid})`);
  } catch (err) {
    console.error('[Multicharacter] Error creating character:', err);
  }
});

// Client selects existing character
mp.events.onClient('g-cyber:server:selectCharacter', (player, citizenid) => {
  const charData = G_CyberCore.Database.players[citizenid];
  if (!charData) {
    player.emit('g-cyber:client:notify', 'Error', 'Character identity record not found.', 'error');
    return;
  }

  // Register in memory
  const corePlayer = G_CyberCore.Player.CreatePlayer(player, charData);
  G_CyberCore.Players[player.id] = corePlayer;

  // Teleport player
  player.position = DEFAULT_SPAWN;

  // Sync HUD
  corePlayer.Functions.SyncHUD();
  corePlayer.Functions.Notify('Identity Loaded', `Welcome back to Night City, ${charData.charinfo.firstname}.`, 'success');

  console.log(`[Multicharacter] Player ${player.nickname} selected ${charData.charinfo.firstname} (${citizenid})`);
});

// Client deletes character
mp.events.onClient('g-cyber:server:deleteCharacter', (player, citizenid) => {
  if (G_CyberCore.Database.players[citizenid]) {
    delete G_CyberCore.Database.players[citizenid];
    G_CyberCore.Database.Save();
    console.log(`[Multicharacter] Citizen ${citizenid} deleted from database.`);
  }
});

// =====================================================================
// 2. Admin Management System (qb-adminmenu)
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
});

mp.events.on('playerSpawn', (playerId) => {
  const player = mp.players.at(playerId);
  if (!player) return;
  console.log(`[G-CyberRPcore] Citizen #${playerId} spawned in world.`);
  player.emit('g-cyber:client:startRoster');
});

// =====================================================================
// SERVER COMMANDS (F8 Console & Server Terminal Registry)
// =====================================================================
if (mp.commands) {
  // Command: admin / adminmenu / a / hub
  mp.commands.add('admin', (player, args) => {
    if (player) {
      player.emit('g-cyber:client:toggleAdmin');
    } else {
      console.log('[Admin] Admin command is for in-game players.');
    }
  });
  mp.commands.add('adminmenu', (player, args) => {
    if (player) player.emit('g-cyber:client:toggleAdmin');
  });
  mp.commands.add('a', (player, args) => {
    if (player) player.emit('g-cyber:client:toggleAdmin');
  });
  mp.commands.add('hub', (player, args) => {
    if (player) player.emit('g-cyber:client:toggleAdmin');
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
    if (player) player.emit('g-cyber:client:startRoster');
  });
  mp.commands.add('multichar', (player, args) => {
    if (player) player.emit('g-cyber:client:startRoster');
  });

  // Command: skin / clothing
  mp.commands.add('skin', (player, args) => {
    if (player) player.emit('g-cyber:client:showCreator');
  });
  mp.commands.add('clothing', (player, args) => {
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

// =====================================================================
// 3. Proximity RP Chat Engine
// =====================================================================
function sendProximityChat(player, text, maxDist = 15, msgType = 'normal') {
  if (!player) return;
  const pPos = player.position || [0, 0, 0];

  mp.players.toArray().forEach(target => {
    const tPos = target.position || [0, 0, 0];
    const dist = Math.hypot(pPos[0] - tPos[0], pPos[1] - tPos[1], pPos[2] - tPos[2]);
    if (dist <= maxDist) {
      target.emit('chat:add', text, msgType);
    }
  });
}

mp.events.onClient('chat:message', (player, text) => {
  if (!text || text.trim().length === 0) return;
  const coreP = G_CyberCore.Functions.GetPlayer(player.id);
  const name = coreP ? `${coreP.PlayerData.charinfo.firstname} ${coreP.PlayerData.charinfo.lastname}` : (player.nickname || `Citizen #${player.id}`);
  sendProximityChat(player, `[Local] ${name}: ${text.trim()}`, 15, 'normal');
});

mp.events.onClient('chat:command', (player, cmd, args) => {
  const coreP = G_CyberCore.Functions.GetPlayer(player.id);
  const name = coreP ? `${coreP.PlayerData.charinfo.firstname} ${coreP.PlayerData.charinfo.lastname}` : (player.nickname || `Citizen #${player.id}`);

  switch (cmd) {
    case 'me':
      if (args && args.length > 0) {
        sendProximityChat(player, `* ${name} ${args.join(' ')}`, 15, 'me');
      }
      break;

    case 'do':
      if (args && args.length > 0) {
        sendProximityChat(player, `* ${args.join(' ')} (( ${name} ))`, 15, 'do');
      }
      break;

    case 'ooc':
    case 'b':
      if (args && args.length > 0) {
        sendProximityChat(player, `(( [OOC] ${player.nickname || name}: ${args.join(' ')} ))`, 15, 'ooc');
      }
      break;

    case 'shout':
    case 's':
      if (args && args.length > 0) {
        sendProximityChat(player, `[Shout] ${name}: ${args.join(' ')}!`, 35, 'shout');
      }
      break;

    case 'whisper':
    case 'w':
      if (args && args.length > 0) {
        sendProximityChat(player, `[Whisper] ${name}: ${args.join(' ')}`, 4, 'whisper');
      }
      break;

    case 'tweet':
      if (args && args.length > 0) {
        const tweetText = `[NightNet] @${name}: ${args.join(' ')}`;
        mp.players.toArray().forEach(p => p.emit('chat:add', tweetText, 'tweet'));
      }
      break;

    case 'dispatch':
    case '911':
      if (args && args.length > 0) {
        const alert = `[EMERGENCY 911] Call from ${name}: ${args.join(' ')}`;
        mp.players.toArray().forEach(p => p.emit('chat:add', alert, 'dispatch'));
        player.emit('chat:add', '[911] Emergency transmission broadcasted to NCPD / Trauma Team.', 'system');
      }
      break;

    default:
      // Try executing via G_CyberCore commands system
      if (G_CyberCore.Commands) {
        G_CyberCore.Commands.Execute(player, cmd, args);
      }
      break;
  }
});

// Paycheck Routine (Every 15 minutes)
setInterval(() => {
  if (global.G_CyberCore) {
    global.G_CyberCore.Functions.GetPlayers().forEach(player => {
      const job = player.PlayerData.job;
      if (job && job.payment > 0 && job.onDuty) {
        player.Functions.AddMoney('bank', job.payment, `Salary: ${job.label}`);
      }
    });
  }
}, 15 * 60 * 1000);

if (typeof module !== 'undefined') {
  module.exports = G_CyberCore;
}
