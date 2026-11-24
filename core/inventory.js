// =====================================================================
// G-CyberRPcore - Advanced Neural Inventory Matrix Server Controller
// Multi-Container, Drag & Drop, Persistence & REDengine Weapon Bridge
// =====================================================================

const fs = require('fs');
const path = require('path');
const SharedItems = require('../shared/items');

console.log('[G-CyberRPcore] Mounting Advanced Neural Inventory Matrix Server Engine...');

// Default Inventory Capacities
const InvConfig = {
  player: { maxSlots: 35, maxWeight: 120.0 },
  trunk: { maxSlots: 30, maxWeight: 150.0 },
  glovebox: { maxSlots: 5, maxWeight: 15.0 },
  stash: { maxSlots: 50, maxWeight: 300.0 },
  drop: { maxSlots: 10, maxWeight: 50.0 }
};

// In-Memory Player Cache, Secondary Containers & Ground Drops
const PlayerInventories = new Map();
const ActiveContainers = new Map();
const GroundDrops = new Map();
let dropCounter = 1000;

const INV_FALLBACK_FILE = path.join(process.cwd(), 'database', 'inventories.json');

function loadFallbackMap() {
  try {
    if (fs.existsSync(INV_FALLBACK_FILE)) {
      const raw = fs.readFileSync(INV_FALLBACK_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      for (const [cid, arr] of Object.entries(parsed)) {
        if (Array.isArray(arr)) PlayerInventories.set(cid, arr);
      }
    }
  } catch (e) {}
}

function saveFallbackMap() {
  try {
    const dir = path.dirname(INV_FALLBACK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(INV_FALLBACK_FILE, JSON.stringify(Object.fromEntries(PlayerInventories), null, 2), 'utf-8');
  } catch (e) {}
}

loadFallbackMap();

// Helper: Calculate total weight
function calculateWeight(items) {
  let total = 0;
  if (!Array.isArray(items)) return 0;
  for (const item of items) {
    if (!item) continue;
    const def = SharedItems[item.id] || SharedItems[item.name];
    const unitWeight = def ? (def.weight || 0.5) : 0.5;
    total += unitWeight * (item.amount || 1);
  }
  return parseFloat(total.toFixed(2));
}

// Helper: Get or create secondary container
function getOrCreateContainer(containerId, maxSlots = 30, maxWeight = 150.0) {
  if (ActiveContainers.has(containerId)) {
    return ActiveContainers.get(containerId);
  }

  const container = {
    id: containerId,
    maxSlots: maxSlots,
    maxWeight: maxWeight,
    items: new Array(maxSlots).fill(null)
  };
  ActiveContainers.set(containerId, container);
  return container;
}

// Helper: Resolve citizenid from player
function getCitizenId(player) {
  if (!player) return 'NC-664517';
  if (player.citizenid) return player.citizenid;
  if (player.PlayerData && player.PlayerData.citizenid) return player.PlayerData.citizenid;
  if (global.G_CyberCore && typeof global.G_CyberCore.GetPlayer === 'function') {
    const cp = global.G_CyberCore.GetPlayer(player.id);
    if (cp && cp.PlayerData && cp.PlayerData.citizenid) return cp.PlayerData.citizenid;
  }
  if (player.nickname) return 'NC-' + player.nickname;
  if (player.name) return 'NC-' + player.name;
  return 'NC-664517';
}

// =====================================================================
// Database Persistence Layer
// =====================================================================

async function loadPlayerInventory(citizenId) {
  const maxSlots = InvConfig.player.maxSlots;

  // Use SQL when DB engine is actively connected and cache is not yet loaded from SQL
  const dbReady = Boolean(global.G_CyberCore && global.G_CyberCore.DB && global.G_CyberCore.DB.connected);
  if (!dbReady && PlayerInventories.has(citizenId)) {
    return PlayerInventories.get(citizenId);
  }

  const slots = new Array(maxSlots).fill(null);

  const populateStarterGear = async () => {
    const starterItems = [
      { slot: 0, id: 'id_card', amount: 1, info: { citizenid: citizenId } },
      { slot: 1, id: 'cyber_phone', amount: 1, info: {} },
      { slot: 2, id: 'maxdoc_mk1', amount: 3, info: {} },
      { slot: 3, id: 'water_bottle', amount: 2, info: {} },
      { slot: 4, id: 'synth_burger', amount: 2, info: {} },
      { slot: 5, id: 'money', amount: 500, info: {} },
      { slot: 6, id: 'weapon_unity', amount: 1, info: { serial: `NC-${Math.floor(100000 + Math.random() * 900000)}` } },
      { slot: 7, id: 'ammo_handgun', amount: 50, info: {} }
    ];

    for (const st of starterItems) {
      slots[st.slot] = st;
      if (dbReady) {
        await global.G_CyberCore.DB.Execute(
          'INSERT INTO player_items (citizenid, slot, item_name, amount, info) VALUES (?, ?, ?, ?, ?)',
          [citizenId, st.slot, st.id, st.amount, JSON.stringify(st.info)]
        );
      }
    }
    PlayerInventories.set(citizenId, slots);
    saveFallbackMap();
  };

  if (!dbReady) {
    await populateStarterGear();
    return slots;
  }

  try {
    const rows = await global.G_CyberCore.DB.Fetch(
      'SELECT slot, item_name, amount, info FROM player_items WHERE citizenid = ? ORDER BY slot ASC',
      [citizenId]
    );

    if (rows && rows.length > 0) {
      for (const row of rows) {
        const slotIdx = parseInt(row.slot, 10);
        if (slotIdx >= 0 && slotIdx < maxSlots) {
          let meta = {};
          try {
            meta = (typeof row.info === 'string') ? JSON.parse(row.info) : (row.info || {});
          } catch (e) {
            meta = {};
          }

          slots[slotIdx] = {
            slot: slotIdx,
            id: row.item_name || row.item_id,
            amount: parseInt(row.amount || row.count, 10) || 1,
            info: meta
          };
        }
      }
      PlayerInventories.set(citizenId, slots);
      saveFallbackMap();
    } else {
      await populateStarterGear();
    }
  } catch (err) {
    console.error(`[Inventory DB] Error loading items for ${citizenId}:`, err.message || err);
    if (PlayerInventories.has(citizenId)) {
      return PlayerInventories.get(citizenId);
    }
    await populateStarterGear();
  }

  return slots;
}

async function savePlayerSlot(citizenId, slotIdx, itemData) {
  // Always persist in-memory & JSON fallback immediately
  if (!PlayerInventories.has(citizenId)) {
    PlayerInventories.set(citizenId, new Array(InvConfig.player.maxSlots).fill(null));
  }
  const cachedSlots = PlayerInventories.get(citizenId);
  if (slotIdx >= 0 && slotIdx < cachedSlots.length) {
    cachedSlots[slotIdx] = itemData || null;
    saveFallbackMap();
  }

  if (!global.G_CyberCore || !global.G_CyberCore.DB || !global.G_CyberCore.DB.connected) return;

  try {
    if (!itemData) {
      await global.G_CyberCore.DB.Execute(
        'DELETE FROM player_items WHERE citizenid = ? AND slot = ?',
        [citizenId, slotIdx]
      );
    } else {
      const metaStr = JSON.stringify(itemData.info || {});
      const itemId = itemData.id || itemData.name;
      const count = itemData.amount || 1;

      const existing = await global.G_CyberCore.DB.FetchOne(
        'SELECT id FROM player_items WHERE citizenid = ? AND slot = ?',
        [citizenId, slotIdx]
      );

      if (existing) {
        await global.G_CyberCore.DB.Execute(
          'UPDATE player_items SET item_name = ?, amount = ?, info = ? WHERE citizenid = ? AND slot = ?',
          [itemId, count, metaStr, citizenId, slotIdx]
        );
      } else {
        await global.G_CyberCore.DB.Execute(
          'INSERT INTO player_items (citizenid, slot, item_name, amount, info) VALUES (?, ?, ?, ?, ?)',
          [citizenId, slotIdx, itemId, count, metaStr]
        );
      }
    }
  } catch (err) {
    console.error(`[Inventory DB] Error saving slot ${slotIdx} for ${citizenId}:`, err.message || err);
  }
}

// =====================================================================
// Network Event Handlers (Mount to mp.events)
// =====================================================================

function mountInventoryEvents() {
  if (typeof mp === 'undefined' || !mp.events) return;

  // 1. Open Inventory Request
  mp.events.onClient('gcyber:inventory:serverOpen', async (player, containerReqJson) => {
    const citizenId = getCitizenId(player);
    if (!citizenId) return;

    let containerReq = null;
    try {
      containerReq = containerReqJson ? JSON.parse(containerReqJson) : null;
    } catch (e) {
      containerReq = null;
    }

    const playerSlots = await loadPlayerInventory(citizenId);
    const playerWeight = calculateWeight(playerSlots);

    let containerData = null;
    if (containerReq && containerReq.type) {
      const type = containerReq.type; // 'trunk', 'glovebox', 'stash', 'drop'
      const id = containerReq.id || 'default';
      const fullId = `${type}:${id}`;

      let maxSlots = 30;
      let maxWeight = 150.0;
      if (type === 'trunk') {
        maxSlots = InvConfig.trunk.maxSlots;
        maxWeight = InvConfig.trunk.maxWeight;
      } else if (type === 'glovebox') {
        maxSlots = InvConfig.glovebox.maxSlots;
        maxWeight = InvConfig.glovebox.maxWeight;
      } else if (type === 'stash') {
        maxSlots = InvConfig.stash.maxSlots;
        maxWeight = InvConfig.stash.maxWeight;
      } else if (type === 'drop') {
        maxSlots = InvConfig.drop.maxSlots;
        maxWeight = InvConfig.drop.maxWeight;
      }

      const container = getOrCreateContainer(fullId, maxSlots, maxWeight);
      containerData = {
        type: type,
        id: fullId,
        label: containerReq.label || `${type.toUpperCase()} #${id}`,
        maxSlots: container.maxSlots,
        maxWeight: container.maxWeight,
        weight: calculateWeight(container.items),
        items: container.items
      };
    }

    player.emit('gcyber:inventory:clientOpen', JSON.stringify({
      player: {
        citizenid: citizenId,
        name: player.nickname || (player.PlayerData && player.PlayerData.charinfo ? `${player.PlayerData.charinfo.firstname} ${player.PlayerData.charinfo.lastname}` : 'Citizen'),
        maxSlots: InvConfig.player.maxSlots,
        maxWeight: InvConfig.player.maxWeight,
        weight: playerWeight,
        items: playerSlots
      },
      container: containerData,
      itemDefinitions: SharedItems
    }));
  });

  // 2. Drag & Drop Move Item (Between Slots / Containers)
  mp.events.onClient('gcyber:inventory:serverMoveItem', async (player, dataJson) => {
    const citizenId = getCitizenId(player);
    if (!citizenId) return;

    let data = null;
    try {
      data = JSON.parse(dataJson);
    } catch (e) {
      return;
    }

    const { fromType, fromSlot, toType, toSlot, containerId, amount } = data;
    const playerSlots = await loadPlayerInventory(citizenId);
    let container = containerId ? ActiveContainers.get(containerId) : null;

    let sourceItem = null;
    if (fromType === 'player') {
      sourceItem = playerSlots[fromSlot];
    } else if (fromType === 'container' && container) {
      sourceItem = container.items[fromSlot];
    }

    if (!sourceItem) return;

    let targetItem = null;
    if (toType === 'player') {
      targetItem = playerSlots[toSlot];
    } else if (toType === 'container' && container) {
      targetItem = container.items[toSlot];
    }

    const moveCount = (amount && amount > 0 && amount < sourceItem.amount) ? amount : sourceItem.amount;

    // A. Move to Empty Slot
    if (!targetItem) {
      if (moveCount === sourceItem.amount) {
        // Full move
        if (fromType === 'player') playerSlots[fromSlot] = null;
        if (fromType === 'container' && container) container.items[fromSlot] = null;

        const newItem = { ...sourceItem, slot: toSlot };
        if (toType === 'player') playerSlots[toSlot] = newItem;
        if (toType === 'container' && container) container.items[toSlot] = newItem;
      } else {
        // Split stack
        sourceItem.amount -= moveCount;
        const newItem = { ...sourceItem, slot: toSlot, amount: moveCount };
        if (toType === 'player') playerSlots[toSlot] = newItem;
        if (toType === 'container' && container) container.items[toSlot] = newItem;
      }
    } else if (targetItem.id === sourceItem.id && SharedItems[sourceItem.id] && SharedItems[sourceItem.id].stackable) {
      // B. Merge Stackable Items
      const maxStack = SharedItems[sourceItem.id].maxStack || 100;
      const space = maxStack - targetItem.amount;
      const toMerge = Math.min(space, moveCount);

      targetItem.amount += toMerge;
      sourceItem.amount -= toMerge;

      if (sourceItem.amount <= 0) {
        if (fromType === 'player') playerSlots[fromSlot] = null;
        if (fromType === 'container' && container) container.items[fromSlot] = null;
      }
    } else {
      // C. Swap Slots
      if (fromType === toType) {
        if (fromType === 'player') {
          playerSlots[fromSlot] = { ...targetItem, slot: fromSlot };
          playerSlots[toSlot] = { ...sourceItem, slot: toSlot };
        } else if (container) {
          container.items[fromSlot] = { ...targetItem, slot: fromSlot };
          container.items[toSlot] = { ...sourceItem, slot: toSlot };
        }
      }
    }

    // Persist changes to database
    if (fromType === 'player') {
      await savePlayerSlot(citizenId, fromSlot, playerSlots[fromSlot]);
    }
    if (toType === 'player') {
      await savePlayerSlot(citizenId, toSlot, playerSlots[toSlot]);
    }

    // Acknowledge update to client
    player.emit('gcyber:inventory:clientUpdate', JSON.stringify({
      player: {
        weight: calculateWeight(playerSlots),
        items: playerSlots
      },
      container: container ? {
        id: container.id,
        weight: calculateWeight(container.items),
        items: container.items
      } : null
    }));
  });

  // 3. Use Item Action
  mp.events.onClient('gcyber:inventory:serverUseItem', async (player, slotIdx) => {
    const citizenId = getCitizenId(player);
    if (!citizenId) return;

    const playerSlots = await loadPlayerInventory(citizenId);
    const item = playerSlots[slotIdx];
    if (!item) return;

    const def = SharedItems[item.id] || SharedItems[item.name];
    if (!def || !def.usable) {
      player.emit('g-cyber:hud:notify', 'Inventory', 'This item cannot be used directly.', 'error');
      return;
    }

    console.log(`[Inventory] ${player.nickname || citizenId} used ${def.label} (${def.id || def.name})`);

    // Handle Consumable Medicine
    if (def.category === 'medicine' || def.type === 'medical') {
      const heal = (def.consumeEffect && def.consumeEffect.health) || def.healAmount || 30;
      player.health = Math.min(100, (player.health || 100) + heal);
      player.emit('g-cyber:hud:notify', 'Medical', `Used ${def.label}. Restored ${heal}% vitality.`, 'success');
      player.emit('g-cyber:hud:sync', { health: player.health });
    }

    // Handle Food
    if (def.category === 'food' || def.type === 'food') {
      const hunger = (def.consumeEffect && def.consumeEffect.hunger) || 30;
      player.emit('g-cyber:hud:notify', 'Nutrition', `Consumed ${def.label}.`, 'success');
      player.emit('g-cyber:hud:sync', { hunger: 100 });
    }

    // Handle Drink
    if (def.category === 'drink' || def.type === 'drink') {
      const thirst = (def.consumeEffect && def.consumeEffect.thirst) || 35;
      player.emit('g-cyber:hud:notify', 'Hydration', `Drank ${def.label}.`, 'success');
      player.emit('g-cyber:hud:sync', { thirst: 100 });
    }

    // Handle Weapon Equip
    if (def.category === 'weapon' || def.type === 'weapon') {
      player.emit('gcyber:inventory:clientEquipWeapon', def.nativeId, def.id || def.name);
      player.emit('g-cyber:hud:notify', 'Armory', `Equipped ${def.label}.`, 'success');
      return; // Weapons are not consumed
    }

    // Handle Cyberware
    if (def.category === 'cyberware') {
      player.emit('g-cyber:hud:notify', 'Cyberware', `Neural link active: ${def.label}.`, 'success');
      return;
    }

    // Consume Stackable Item
    if (item.amount > 1) {
      item.amount--;
      await savePlayerSlot(citizenId, slotIdx, item);
    } else {
      playerSlots[slotIdx] = null;
      await savePlayerSlot(citizenId, slotIdx, null);
    }

    player.emit('gcyber:inventory:clientUpdate', JSON.stringify({
      player: {
        weight: calculateWeight(playerSlots),
        items: playerSlots
      }
    }));
  });

  // 4. Ground Drop Handler
  mp.events.onClient('gcyber:inventory:serverDropItem', async (player, dataJson) => {
    const citizenId = getCitizenId(player);
    if (!citizenId) return;

    let data = null;
    try {
      data = JSON.parse(dataJson);
    } catch (e) {
      return;
    }

    const { slot, amount } = data;
    const playerSlots = await loadPlayerInventory(citizenId);
    const item = playerSlots[slot];
    if (!item) return;

    const dropAmount = (amount && amount > 0 && amount < item.amount) ? amount : item.amount;
    const dropId = `drop:${++dropCounter}`;
    const pPos = player.position || [0, 0, 0];

    const container = getOrCreateContainer(dropId, InvConfig.drop.maxSlots, InvConfig.drop.maxWeight);
    container.items[0] = { ...item, slot: 0, amount: dropAmount };

    if (dropAmount === item.amount) {
      playerSlots[slot] = null;
      await savePlayerSlot(citizenId, slot, null);
    } else {
      item.amount -= dropAmount;
      await savePlayerSlot(citizenId, slot, item);
    }

    GroundDrops.set(dropId, {
      id: dropId,
      position: pPos,
      createdAt: Date.now()
    });

    player.emit('g-cyber:hud:notify', 'Drop', 'Dropped items onto the ground.', 'info');
    player.emit('gcyber:inventory:clientUpdate', JSON.stringify({
      player: {
        weight: calculateWeight(playerSlots),
        items: playerSlots
      }
    }));
  });

  console.log('[G-CyberRPcore] Neural Inventory Matrix server handlers active.');
}

// Global API
const InventoryModule = {
  GetPlayerInventory: loadPlayerInventory,
  SavePlayerSlot: savePlayerSlot,
  GetContainer: getOrCreateContainer,
  SharedItems: SharedItems,
  Mount: mountInventoryEvents
};

global.G_CyberInventory = InventoryModule;
module.exports = InventoryModule;
