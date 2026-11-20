// G-CyberRPcore - PlayerData Class & Functions
// Fully featured citizen object & persistent PlayerData structure

const SharedItems = require('../shared/items');
const SharedJobs = require('../shared/jobs');
const SharedGangs = require('../shared/gangs');

class Player {
  constructor(mpPlayer, rawData = {}) {
    this.mp = mpPlayer;
    this.id = mpPlayer.id;

    // Structured PlayerData
    this.PlayerData = {
      citizenid: rawData.citizenid || `NC-${Math.floor(100000 + Math.random() * 900000)}`,
      steam: rawData.steam || '',
      license: rawData.license || '',
      name: mpPlayer.nickname || 'Unknown Citizen',

      charinfo: rawData.charinfo || {
        firstname: 'Valerie',
        lastname: 'Street',
        birthdate: '2054-10-12',
        gender: 'female',
        nationality: 'Night City',
        backstory: 'Former street nomad trying to survive the neon concrete jungle.'
      },

      money: rawData.money || {
        cash: 5000,
        bank: 25000,
        crypto: 150
      },

      job: rawData.job || {
        name: 'civilian',
        label: 'Civilian Citizen',
        payment: 750,
        onDuty: true,
        isBoss: false,
        grade: { name: 'Unemployed', level: 0 }
      },

      gang: rawData.gang || {
        name: 'none',
        label: 'No Affiliation',
        isBoss: false,
        grade: { name: 'Civilian', level: 0 }
      },

      metadata: rawData.metadata || {
        hunger: 100,
        thirst: 100,
        armor: 100,
        stress: 0,
        isDead: false,
        isDowned: false,
        isCuffed: false,
        voiceRange: 'normal', // whisper, normal, shout
        licenses: {
          driver: true,
          weapon: false,
          cyberware: true
        }
      },

      inventory: rawData.inventory || [
        { slot: 1, name: 'maxdoc_mk1', amount: 2, info: {}, weight: 0.3 },
        { slot: 2, name: 'synth_burger', amount: 3, info: {}, weight: 0.3 },
        { slot: 3, name: 'water_bottle', amount: 3, info: {}, weight: 0.5 },
        { slot: 4, name: 'weapon_unity', amount: 1, info: { serial: 'NC-99102' }, weight: 2.2 },
        { slot: 5, name: 'ammo_handgun', amount: 2, info: {}, weight: 0.6 }
      ]
    };

    // Fast-access functions
    this.Functions = {
      // Money handling
      AddMoney: (type, amount, reason = '') => this.AddMoney(type, amount, reason),
      RemoveMoney: (type, amount, reason = '') => this.RemoveMoney(type, amount, reason),
      GetMoney: (type) => this.PlayerData.money[type] || 0,

      // Job & Gang handling
      SetJob: (jobName, gradeLevel = 0) => this.SetJob(jobName, gradeLevel),
      SetGang: (gangName, gradeLevel = 0) => this.SetGang(gangName, gradeLevel),
      SetJobDuty: (onDuty) => this.SetJobDuty(onDuty),

      // Metadata handling
      SetMetaData: (key, val) => this.SetMetaData(key, val),
      GetMetaData: (key) => this.PlayerData.metadata[key],

      // Inventory handling
      AddItem: (item, amount = 1, slot = null, info = {}) => this.AddItem(item, amount, slot, info),
      RemoveItem: (item, amount = 1, slot = null) => this.RemoveItem(item, amount, slot),
      GetItemByName: (item) => this.GetItemByName(item),
      GetItemBySlot: (slot) => this.GetItemBySlot(slot),
      GetTotalWeight: () => this.GetTotalWeight(),

      // Sync, Notify & Save
      UpdateHUD: () => this.SyncHUD(),
      SyncHUD: () => this.SyncHUD(),
      Notify: (title, message, type = 'info') => this.Notify(title, message, type),
      SyncInventory: () => this.SyncInventory(),
      Save: () => this.Save()
    };
  }

  // --- MONEY METHODS ---
  AddMoney(type, amount, reason = '') {
    amount = Math.abs(parseInt(amount, 10));
    if (isNaN(amount) || amount <= 0) return false;
    if (!this.PlayerData.money[type] && this.PlayerData.money[type] !== 0) return false;

    this.PlayerData.money[type] += amount;
    this.SyncHUD();
    this.Notify('Transaction', `Received $E ${amount.toLocaleString()} (${type}). Reason: ${reason || 'Deposit'}`, 'success');
    return true;
  }

  RemoveMoney(type, amount, reason = '') {
    amount = Math.abs(parseInt(amount, 10));
    if (isNaN(amount) || amount <= 0) return false;
    if ((this.PlayerData.money[type] || 0) < amount) {
      this.Notify('Bank Alert', `Insufficient ${type} funds ($E ${amount.toLocaleString()}).`, 'error');
      return false;
    }

    this.PlayerData.money[type] -= amount;
    this.SyncHUD();
    this.Notify('Transaction', `Paid $E ${amount.toLocaleString()} (${type}). Reason: ${reason || 'Purchase'}`, 'info');
    return true;
  }

  // --- JOB METHODS ---
  SetJob(jobName, gradeLevel = 0) {
    const jobData = SharedJobs[jobName.toLowerCase()];
    if (!jobData) return false;

    gradeLevel = parseInt(gradeLevel, 10) || 0;
    const grade = jobData.grades[gradeLevel] || jobData.grades[0];

    this.PlayerData.job = {
      name: jobName.toLowerCase(),
      label: jobData.label,
      payment: grade.payment,
      onDuty: jobData.defaultDuty,
      isBoss: grade.isBoss || false,
      grade: {
        name: grade.name,
        level: gradeLevel
      }
    };

    this.SyncHUD();
    this.Notify('Career Dispatch', `New Employment: ${jobData.label} (${grade.name})`, 'success');
    return true;
  }

  SetJobDuty(onDuty) {
    this.PlayerData.job.onDuty = Boolean(onDuty);
    this.SyncHUD();
    this.Notify('Duty Status', `You are now ${this.PlayerData.job.onDuty ? 'ON DUTY' : 'OFF DUTY'}.`, 'info');
  }

  // --- GANG METHODS ---
  SetGang(gangName, gradeLevel = 0) {
    const gangData = SharedGangs[gangName.toLowerCase()] || SharedGangs.none;
    gradeLevel = parseInt(gradeLevel, 10) || 0;
    const grade = gangData.grades[gradeLevel] || gangData.grades[0];

    this.PlayerData.gang = {
      name: gangName.toLowerCase(),
      label: gangData.label,
      isBoss: grade.isBoss || false,
      grade: {
        name: grade.name,
        level: gradeLevel
      }
    };
    this.SyncHUD();
    return true;
  }

  // --- METADATA METHODS ---
  SetMetaData(key, val) {
    this.PlayerData.metadata[key] = val;
    this.SyncHUD();
  }

  // --- INVENTORY METHODS ---
  AddItem(itemName, amount = 1, slot = null, info = {}) {
    const itemDef = SharedItems[itemName];
    if (!itemDef) {
      console.warn(`[G-CyberRPcore] Unknown item definition: ${itemName}`);
      return false;
    }

    amount = parseInt(amount, 10) || 1;
    const maxWeight = 120.0; // standard max inventory capacity in kg
    const itemWeight = (itemDef.weight || 0.1) * amount;

    if (this.GetTotalWeight() + itemWeight > maxWeight) {
      this.Notify('Inventory', 'Your backpack is at maximum weight capacity!', 'error');
      return false;
    }

    // Try stacking on existing slot if not unique
    if (!itemDef.unique) {
      const existing = this.PlayerData.inventory.find(i => i.name === itemName);
      if (existing) {
        existing.amount += amount;
        this.SyncInventory();
        this.Notify('Item Received', `+${amount}x ${itemDef.label}`, 'success');
        return true;
      }
    }

    // Find first empty slot (1 - 30)
    if (!slot) {
      for (let s = 1; s <= 30; s++) {
        if (!this.PlayerData.inventory.some(i => i.slot === s)) {
          slot = s;
          break;
        }
      }
    }

    if (!slot) {
      this.Notify('Inventory', 'No empty inventory slots available.', 'error');
      return false;
    }

    this.PlayerData.inventory.push({
      slot,
      name: itemName,
      amount,
      info,
      weight: itemDef.weight || 0.1
    });

    this.SyncInventory();
    this.Notify('Item Received', `+${amount}x ${itemDef.label}`, 'success');
    return true;
  }

  RemoveItem(itemName, amount = 1, slot = null) {
    amount = parseInt(amount, 10) || 1;
    let target = null;

    if (slot) {
      target = this.PlayerData.inventory.find(i => i.slot === slot && i.name === itemName);
    } else {
      target = this.PlayerData.inventory.find(i => i.name === itemName);
    }

    if (!target || target.amount < amount) {
      this.Notify('Inventory', `You do not have enough ${itemName}.`, 'error');
      return false;
    }

    target.amount -= amount;
    if (target.amount <= 0) {
      this.PlayerData.inventory = this.PlayerData.inventory.filter(i => i !== target);
    }

    this.SyncInventory();
    const itemDef = SharedItems[itemName];
    this.Notify('Item Removed', `-${amount}x ${itemDef ? itemDef.label : itemName}`, 'info');
    return true;
  }

  GetItemByName(itemName) {
    return this.PlayerData.inventory.find(i => i.name === itemName) || null;
  }

  GetItemBySlot(slot) {
    return this.PlayerData.inventory.find(i => i.slot === slot) || null;
  }

  GetTotalWeight() {
    let weight = 0;
    for (const item of this.PlayerData.inventory) {
      weight += (item.weight || 0.1) * (item.amount || 1);
    }
    return Math.round(weight * 100) / 100;
  }

  // --- CLIENT COMM & NOTIFICATION ---
  SyncHUD() {
    if (!this.mp) return;
    this.mp.emit('g-cyber:client:syncHUD', {
      citizenid: this.PlayerData.citizenid,
      name: `${this.PlayerData.charinfo.firstname} ${this.PlayerData.charinfo.lastname}`,
      cash: this.PlayerData.money.cash,
      bank: this.PlayerData.money.bank,
      crypto: this.PlayerData.money.crypto,
      job: this.PlayerData.job,
      gang: this.PlayerData.gang,
      hunger: this.PlayerData.metadata.hunger,
      thirst: this.PlayerData.metadata.thirst,
      armor: this.PlayerData.metadata.armor,
      stress: this.PlayerData.metadata.stress,
      voiceRange: this.PlayerData.metadata.voiceRange,
      health: this.mp.health || 100
    });
  }

  SyncInventory() {
    if (!this.mp) return;
    this.mp.emit('g-cyber:client:syncInventory', {
      items: this.PlayerData.inventory,
      totalWeight: this.GetTotalWeight(),
      maxWeight: 120.0
    });
  }

  Notify(title, message, type = 'info') {
    if (!this.mp) return;
    this.mp.emit('g-cyber:client:notify', title, message, type);
  }

  Save() {
    // Database save hook
    const db = require('./database');
    db.SavePlayer(this.PlayerData.citizenid, this.PlayerData);
  }
}

module.exports = Player;
