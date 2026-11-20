// G-CyberRPcore - Main Export Singleton
// The definitive framework core for Cyberpunk 2077 (CyberMP)

const Player = require('./player');
const db = require('./database');
const commands = require('./commands');
const callbacks = require('./callbacks');

const SharedItems = require('../shared/items');
const SharedJobs = require('../shared/jobs');
const SharedGangs = require('../shared/gangs');
const SharedVehicles = require('../shared/vehicles');

class G_CyberCoreEngine {
  constructor() {
    this.onlinePlayers = new Map(); // id -> Player instance
    this.activeVehicles = new Map(); // vehId -> { plate, ownerCitizenId, modelKey }

    this.Shared = {
      Items: SharedItems,
      Jobs: SharedJobs,
      Gangs: SharedGangs,
      Vehicles: SharedVehicles
    };

    this.Commands = commands;

    this.Functions = {
      // Player management
      GetPlayer: (idOrPlayer) => this.GetPlayer(idOrPlayer),
      GetPlayerByCitizenId: (citizenid) => this.GetPlayerByCitizenId(citizenid),
      GetPlayers: () => Array.from(this.onlinePlayers.values()),
      
      // Async Callbacks
      CreateCallback: (name, handler) => callbacks.CreateCallback(name, handler),

      // Vehicle management
      CreateVehicle: (modelKey, pos, yaw = 0.0, ownerCitizenId = null) => this.CreateVehicle(modelKey, pos, yaw, ownerCitizenId),
      GetVehicle: (vehId) => mp.vehicles.at(vehId),
      DeleteVehicle: (vehId) => this.DeleteVehicle(vehId),

      // Math & Proximity
      GetDistance: (pos1, pos2) => Math.hypot(pos1[0] - pos2[0], pos1[1] - pos2[1], pos1[2] - pos2[2]),
      
      // Notifications
      Notify: (player, title, message, type = 'info') => {
        if (player) player.emit('g-cyber:client:notify', title, message, type);
      }
    };

    this.init();
  }

  init() {
    console.log('================================================================');
    console.log('   _____           _____ yberRPcore   v1.0.0 (Night City)');
    console.log('  / ____|         / ____|');
    console.log(' | |  __  ______ | |     _   _  ___  _ __  _ __   ___  _ __  ___ ');
    console.log(' | | |_ ||______|| |    | | | |/ _ \\| \'__|| \'_ \\ / _ \\| \'__|/ _ \\');
    console.log(' | |__| |        | |____| |_| |  __/| |   | |_) | (_) | |  |  __/');
    console.log('  \\_____|         \\_____|\\__, |\\___||_|   | .__/ \\___/|_|   \\___|');
    console.log('                          __/ |           | |                    ');
    console.log('                         |___/            |_|                    ');
    console.log('  The Definitive Modular Roleplay Framework for Cyberpunk 2077   ');
    console.log('================================================================');

    this.registerLifecycleEvents();
    this.registerCoreCommands();
  }

  registerLifecycleEvents() {
    // Player Connects
    mp.events.on('playerConnected', (playerId) => {
      const mpPlayer = mp.players.at(playerId);
      if (!mpPlayer) return;

      mpPlayer.dimension = 0;
      mpPlayer.streamingRadius = 300;

      // Look up existing character or create new
      let rawData = db.GetPlayerByName(mpPlayer.nickname);
      const playerObj = new Player(mpPlayer, rawData || {});
      this.onlinePlayers.set(mpPlayer.id, playerObj);

      // Save initial record
      playerObj.Functions.Save();

      console.log(`[G-CyberRPcore] Loaded Citizen #${playerObj.PlayerData.citizenid} (${mpPlayer.nickname} | ID: ${mpPlayer.id})`);
    });

    // Player Spawns into world
    mp.events.on('playerSpawn', (playerId) => {
      const playerObj = this.onlinePlayers.get(playerId);
      if (playerObj) {
        playerObj.SyncHUD();
        playerObj.SyncInventory();
        playerObj.Notify('Welcome to Night City', `Identity: ${playerObj.PlayerData.charinfo.firstname} ${playerObj.PlayerData.charinfo.lastname} (${playerObj.PlayerData.citizenid})`, 'success');
      }
    });

    // Player Flatlines / Dies
    mp.events.on('playerDeath', (playerId, data) => {
      const playerObj = this.onlinePlayers.get(playerId);
      if (playerObj) {
        playerObj.SetMetaData('isDowned', true);
        playerObj.Notify('CRITICAL INJURY', 'You have been flatlined! Emergency Trauma beacon broadcasting...', 'error');

        // Alert all online Trauma Team medics
        this.GetPlayers().forEach(p => {
          if (p.PlayerData.job.name === 'ambulance' && p.PlayerData.job.onDuty) {
            p.Notify('TRAUMA DISPATCH', `Critical Citizen Flatline! Coords: [${Math.round(playerObj.mp.position[0])}, ${Math.round(playerObj.mp.position[1])}]`, 'error');
          }
        });
      }
    });

    // Player Drops / Disconnects
    mp.events.on('playerDisconnected', (playerId, reason) => {
      const playerObj = this.onlinePlayers.get(playerId);
      if (playerObj) {
        playerObj.Functions.Save();
        this.onlinePlayers.delete(playerId);
        console.log(`[G-CyberRPcore] Saved & dropped Citizen #${playerObj.PlayerData.citizenid} (${reason})`);
      }
    });

    // Handle Client Callback Requests
    mp.events.onClient('g-cyber:server:triggerCallback', (player, name, requestId, ...args) => {
      callbacks.HandleClientRequest(player, name, requestId, ...args);
    });
  }

  registerCoreCommands() {
    // /givemoney <id> <cash|bank> <amount> (admin)
    this.Commands.Add('givemoney', 'Grant money to citizen', ['id', 'type', 'amount'], 'admin', (player, args) => {
      const targetId = parseInt(args[0], 10);
      const type = (args[1] || 'cash').toLowerCase();
      const amount = parseInt(args[2], 10);

      const target = this.GetPlayer(targetId);
      if (!target) {
        this.Functions.Notify(player, 'Error', 'Citizen not found.', 'error');
        return;
      }

      target.Functions.AddMoney(type, amount, 'Admin Grant');
      this.Functions.Notify(player, 'Success', `Granted $E ${amount.toLocaleString()} (${type}) to ${target.PlayerData.name}.`, 'success');
    });

    // /setjob <id> <job> <grade> (admin)
    this.Commands.Add('setjob', 'Set citizen job', ['id', 'job', 'grade'], 'admin', (player, args) => {
      const targetId = parseInt(args[0], 10);
      const jobName = args[1];
      const grade = parseInt(args[2] || '0', 10);

      const target = this.GetPlayer(targetId);
      if (!target) {
        this.Functions.Notify(player, 'Error', 'Citizen not found.', 'error');
        return;
      }

      target.Functions.SetJob(jobName, grade);
      this.Functions.Notify(player, 'Success', `Set ${target.PlayerData.name}'s job to ${jobName} (Grade ${grade}).`, 'success');
    });

    // /giveitem <id> <item> <amount> (admin)
    this.Commands.Add('giveitem', 'Spawn item for citizen', ['id', 'item', 'amount'], 'admin', (player, args) => {
      const targetId = parseInt(args[0], 10);
      const item = args[1];
      const amount = parseInt(args[2] || '1', 10);

      const target = this.GetPlayer(targetId);
      if (!target) {
        this.Functions.Notify(player, 'Error', 'Citizen not found.', 'error');
        return;
      }

      target.Functions.AddItem(item, amount);
      this.Functions.Notify(player, 'Success', `Spawned ${amount}x ${item} for ${target.PlayerData.name}.`, 'success');
    });
  }

  // --- ENTITY HELPERS ---
  GetPlayer(idOrPlayer) {
    if (typeof idOrPlayer === 'number') {
      return this.onlinePlayers.get(idOrPlayer) || null;
    }
    if (idOrPlayer && idOrPlayer.id !== undefined) {
      return this.onlinePlayers.get(idOrPlayer.id) || null;
    }
    return null;
  }

  GetPlayerByCitizenId(citizenid) {
    for (const p of this.onlinePlayers.values()) {
      if (p.PlayerData.citizenid === citizenid) return p;
    }
    return null;
  }

  CreateVehicle(modelKey, pos, yaw = 0.0, ownerCitizenId = null) {
    const vehData = this.Shared.Vehicles[modelKey];
    if (!vehData) {
      console.error(`[G-CyberRPcore] Unknown vehicle model: ${modelKey}`);
      return null;
    }

    try {
      const modelHash = mp.hashes.tweakdbid(vehData.model);
      const appearanceHash = mp.hashes.cname(vehData.skin);

      const veh = mp.vehicles.create({
        model: modelHash,
        appearance: appearanceHash,
        position: pos,
        yaw: yaw,
        health: 1000,
        dimension: 0
      });

      const plate = `NC-${Math.floor(1000 + Math.random() * 9000)}`;
      veh.setMeta('plate', plate);
      veh.setMeta('ownerCitizenId', ownerCitizenId);
      veh.setMeta('isLocked', false);

      this.activeVehicles.set(veh.id, {
        plate,
        ownerCitizenId,
        modelKey
      });

      return veh;
    } catch (err) {
      console.error('[G-CyberRPcore] Failed to spawn vehicle:', err);
      return null;
    }
  }

  DeleteVehicle(vehId) {
    if (mp.vehicles.exists(vehId)) {
      mp.vehicles.destroy(vehId);
      this.activeVehicles.delete(vehId);
    }
  }
}

// Global Singleton
const G_CyberCore = new G_CyberCoreEngine();
global.G_CyberCore = G_CyberCore;
module.exports = G_CyberCore;
