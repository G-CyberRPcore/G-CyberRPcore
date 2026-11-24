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

// Helper: Resolve item definition (Curated + full 1,778 punkmp.wiki catalog)
function getDef(idOrRecord) {
  if (!idOrRecord) return null;
  if (typeof SharedItems.Resolve === 'function') {
    const found = SharedItems.Resolve(idOrRecord);
    if (found) return found;
  }
  return SharedItems[idOrRecord] || null;
}

// Helper: Calculate total weight
function calculateWeight(items) {
  let total = 0;
  if (!Array.isArray(items)) return 0;
  for (const item of items) {
    if (!item) continue;
    const def = getDef(item.id || item.name);
    const unitWeight = def ? (def.weight || 0.25) : 0.25;
    total += unitWeight * (item.amount || 1);
  }
  return parseFloat(total.toFixed(2));
}

// Helper: Count total amount of an item across all inventory slots
function countItemAmount(slots, itemId) {
  if (!Array.isArray(slots) || !itemId) return 0;
  let total = 0;
  for (const s of slots) {
    if (s && (s.id === itemId || s.name === itemId)) {
      total += (s.amount || 1);
    }
  }
  return total;
}

// Helper: Deduct a specific amount of an item across slots
async function deductItemAmount(citizenId, slots, itemId, amountToDeduct) {
  let remaining = amountToDeduct;
  for (let i = 0; i < slots.length && remaining > 0; i++) {
    const s = slots[i];
    if (!s || (s.id !== itemId && s.name !== itemId)) continue;
    if (s.amount > remaining) {
      s.amount -= remaining;
      remaining = 0;
      await savePlayerSlot(citizenId, i, s);
    } else {
      remaining -= s.amount;
      slots[i] = null;
      await savePlayerSlot(citizenId, i, null);
    }
  }
  return amountToDeduct - remaining;
}

// Helper: Find nearby active GroundDrop within radius
function findNearbyGroundDrop(pos, radius = 3.5) {
  if (!pos || !Array.isArray(pos)) return null;
  for (const [dropId, dropMeta] of GroundDrops.entries()) {
    const container = ActiveContainers.get(dropId);
    if (!container || !container.items.some(x => x !== null)) {
      GroundDrops.delete(dropId);
      ActiveContainers.delete(dropId);
      continue;
    }
    const dPos = dropMeta.position || [0, 0, 0];
    const dist = Math.hypot((pos[0] || 0) - (dPos[0] || 0), (pos[1] || 0) - (dPos[1] || 0), (pos[2] || 0) - (dPos[2] || 0));
    if (dist <= radius) {
      return { id: dropId, container };
    }
  }
  return null;
}

const IconDataCache = new Map();

function resolveIconsDir() {
  const candidates = [
    path.resolve(__dirname, '../../gcyber-inventory/ui/assets/items'),
    path.join(process.cwd(), 'resources', 'gcyber-inventory', 'ui', 'assets', 'items'),
    path.resolve(__dirname, '../ui/assets/items')
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function getIconDataUri(imagePath) {
  if (!imagePath) return null;
  const fileName = path.basename(String(imagePath).split('?')[0]);
  if (!fileName) return null;
  if (IconDataCache.has(fileName)) return IconDataCache.get(fileName);

  const dir = resolveIconsDir();
  if (!dir) return null;
  const fullPath = path.join(dir, fileName);
  if (!fs.existsSync(fullPath)) return null;

  try {
    const ext = path.extname(fileName).toLowerCase();
    const mime = ext === '.svg' ? 'image/svg+xml' : (ext === '.png' ? 'image/png' : 'image/webp');
    const b64 = fs.readFileSync(fullPath).toString('base64');
    const uri = `data:${mime};base64,${b64}`;
    IconDataCache.set(fileName, uri);
    return uri;
  } catch (e) {
    return null;
  }
}

function dispatchActiveIcons(player, playerSlots, containerSlots) {
  if (!player || typeof player.emit !== 'function') return;
  if (!player._sentInvIcons) player._sentInvIcons = new Set();

  const pending = [];
  const collect = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const s of arr) {
      if (!s) continue;
      const def = getDef(s.id || s.name);
      if (!def || !def.image) continue;
      const fileName = path.basename(String(def.image).split('?')[0]);
      if (!fileName || player._sentInvIcons.has(fileName)) continue;
      const uri = getIconDataUri(def.image);
      if (uri) {
        player._sentInvIcons.add(fileName);
        pending.push([fileName, uri]);
      }
    }
  };

  collect(playerSlots);
  collect(containerSlots);

  pending.forEach(([fileName, uri], idx) => {
    const sendFn = () => {
      try {
        if (player && typeof player.emit === 'function') {
          player.emit('gcyber:inventory:clientIcon', fileName, uri);
        }
      } catch (e) {}
    };
    if (idx === 0) sendFn();
    else setTimeout(sendFn, idx * 12);
  });
}

// Helper: Build slim definition map for active items (keeping curated + visible catalog items)
function buildActiveDefinitions(playerSlots, containerSlots) {
  const defs = Object.assign({}, SharedItems.Curated || {});
  const scan = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const s of arr) {
      if (!s) continue;
      const key = s.id || s.name;
      const def = getDef(key);
      if (def) defs[key] = def;
    }
  };
  scan(playerSlots);
  scan(containerSlots);
  return defs;
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
// Unified Server Item Add / Remove Helpers
// =====================================================================

async function addItem(playerOrCitizenId, itemKeyOrRecord, amount = 1, preferredSlot = null, info = {}) {
  const mpPlayer = (typeof playerOrCitizenId === 'object' && playerOrCitizenId) ? playerOrCitizenId : null;
  const citizenId = (typeof playerOrCitizenId === 'string') ? playerOrCitizenId : getCitizenId(mpPlayer);
  const def = getDef(itemKeyOrRecord);
  if (!def) {
    if (mpPlayer && mpPlayer.emit) {
      mpPlayer.emit('g-cyber:client:notify', 'Inventory Error', `Unknown item: ${itemKeyOrRecord}`, 'error');
    }
    return false;
  }

  amount = Math.max(1, parseInt(amount, 10) || 1);
  const slots = await loadPlayerInventory(citizenId);
  const curWeight = calculateWeight(slots);
  const addWeight = (def.weight || 0.25) * amount;

  if (curWeight + addWeight > InvConfig.player.maxWeight) {
    if (mpPlayer && mpPlayer.emit) {
      mpPlayer.emit('g-cyber:hud:notify', 'Inventory Full', 'Carrying capacity exceeded!', 'error');
    }
    return false;
  }

  let left = amount;
  if (def.stackable && preferredSlot === null) {
    const maxStack = def.maxStack || 50;
    for (let i = 0; i < slots.length && left > 0; i++) {
      const s = slots[i];
      if (s && s.id === def.id && s.amount < maxStack) {
        const space = maxStack - s.amount;
        const addNow = Math.min(space, left);
        s.amount += addNow;
        left -= addNow;
        await savePlayerSlot(citizenId, i, s);
      }
    }
  }

  while (left > 0) {
    let targetSlot = preferredSlot;
    if (targetSlot === null || slots[targetSlot]) {
      targetSlot = -1;
      for (let i = 0; i < InvConfig.player.maxSlots; i++) {
        if (!slots[i]) {
          targetSlot = i;
          break;
        }
      }
    }
    if (targetSlot === -1) break;

    const maxStack = def.stackable ? (def.maxStack || 50) : 1;
    const stackAmt = Math.min(maxStack, left);
    slots[targetSlot] = {
      slot: targetSlot,
      id: def.id,
      amount: stackAmt,
      info: { ...info }
    };
    left -= stackAmt;
    await savePlayerSlot(citizenId, targetSlot, slots[targetSlot]);
    preferredSlot = null;
  }

  if (mpPlayer && mpPlayer.emit) {
    mpPlayer.emit('g-cyber:hud:notify', 'Item Received', `+${amount - left}x ${def.label}`, 'success');
    mpPlayer.emit('gcyber:inventory:clientUpdate', JSON.stringify({
      player: {
        weight: calculateWeight(slots),
        items: slots
      },
      itemDefinitions: buildActiveDefinitions(slots, null)
    }));
    dispatchActiveIcons(mpPlayer, slots, null);
  }

  return left === 0;
}

async function removeItem(playerOrCitizenId, itemKeyOrRecord, amount = 1, slotIdx = null) {
  const mpPlayer = (typeof playerOrCitizenId === 'object' && playerOrCitizenId) ? playerOrCitizenId : null;
  const citizenId = (typeof playerOrCitizenId === 'string') ? playerOrCitizenId : getCitizenId(mpPlayer);
  const def = getDef(itemKeyOrRecord);
  const itemId = def ? def.id : itemKeyOrRecord;
  amount = Math.max(1, parseInt(amount, 10) || 1);

  const slots = await loadPlayerInventory(citizenId);
  let removed = 0;

  if (slotIdx !== null && slots[slotIdx] && (slots[slotIdx].id === itemId || slots[slotIdx].name === itemId)) {
    const s = slots[slotIdx];
    if (s.amount > amount) {
      s.amount -= amount;
      removed = amount;
      await savePlayerSlot(citizenId, slotIdx, s);
    } else {
      removed = s.amount;
      slots[slotIdx] = null;
      await savePlayerSlot(citizenId, slotIdx, null);
    }
  } else {
    removed = await deductItemAmount(citizenId, slots, itemId, amount);
  }

  if (removed > 0 && mpPlayer && mpPlayer.emit) {
    mpPlayer.emit('gcyber:inventory:clientUpdate', JSON.stringify({
      player: {
        weight: calculateWeight(slots),
        items: slots
      }
    }));
  }
  return removed > 0;
}

// =====================================================================
// Network Event Handlers (Mount to mp.events)
// =====================================================================

function mountInventoryEvents() {
  if (typeof mp === 'undefined' || !mp.events) return;

  mp.events.onClient('gcyber:inventory:serverResetIcons', (player) => {
    if (player) player._sentInvIcons = new Set();
  });

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
    } else {
      // Auto-link nearby Ground Drop bag if player is standing next to dropped items
      const nearDrop = findNearbyGroundDrop(player.position, 3.5);
      if (nearDrop) {
        containerData = {
          type: 'drop',
          id: nearDrop.id,
          label: `GROUND DROP [${nearDrop.id.replace('drop:', '#')}]`,
          maxSlots: nearDrop.container.maxSlots,
          maxWeight: nearDrop.container.maxWeight,
          weight: calculateWeight(nearDrop.container.items),
          items: nearDrop.container.items
        };
      }
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
      itemDefinitions: buildActiveDefinitions(playerSlots, containerData ? containerData.items : null)
    }));
    dispatchActiveIcons(player, playerSlots, containerData ? containerData.items : null);
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

    const sourceDef = getDef(sourceItem.id || sourceItem.name);
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
        if (fromType === 'player') playerSlots[fromSlot] = null;
        if (fromType === 'container' && container) container.items[fromSlot] = null;

        const newItem = { ...sourceItem, slot: toSlot };
        if (toType === 'player') playerSlots[toSlot] = newItem;
        if (toType === 'container' && container) container.items[toSlot] = newItem;
      } else {
        sourceItem.amount -= moveCount;
        const newItem = { ...sourceItem, slot: toSlot, amount: moveCount };
        if (toType === 'player') playerSlots[toSlot] = newItem;
        if (toType === 'container' && container) container.items[toSlot] = newItem;
      }
    } else if (targetItem.id === sourceItem.id && sourceDef && sourceDef.stackable) {
      // B. Merge Stackable Items
      const maxStack = sourceDef.maxStack || 100;
      const space = maxStack - targetItem.amount;
      const toMerge = Math.min(space, moveCount);

      targetItem.amount += toMerge;
      sourceItem.amount -= toMerge;

      if (sourceItem.amount <= 0) {
        if (fromType === 'player') playerSlots[fromSlot] = null;
        if (fromType === 'container' && container) container.items[fromSlot] = null;
      }
    } else {
      // C. Swap Slots (even across player <-> container)
      if (fromType === 'player') playerSlots[fromSlot] = { ...targetItem, slot: fromSlot };
      if (fromType === 'container' && container) container.items[fromSlot] = { ...targetItem, slot: fromSlot };

      if (toType === 'player') playerSlots[toSlot] = { ...sourceItem, slot: toSlot };
      if (toType === 'container' && container) container.items[toSlot] = { ...sourceItem, slot: toSlot };
    }

    // Persist player slot changes
    if (fromType === 'player') await savePlayerSlot(citizenId, fromSlot, playerSlots[fromSlot]);
    if (toType === 'player') await savePlayerSlot(citizenId, toSlot, playerSlots[toSlot]);

    // Cleanup empty ground drop container
    if (container && container.id && container.id.startsWith('drop:') && !container.items.some(x => x !== null)) {
      GroundDrops.delete(container.id);
      ActiveContainers.delete(container.id);
      container = null;
    }

    player.emit('gcyber:inventory:clientUpdate', JSON.stringify({
      player: {
        weight: calculateWeight(playerSlots),
        items: playerSlots
      },
      container: container ? {
        id: container.id,
        weight: calculateWeight(container.items),
        items: container.items
      } : null,
      itemDefinitions: buildActiveDefinitions(playerSlots, container ? container.items : null)
    }));
    dispatchActiveIcons(player, playerSlots, container ? container.items : null);
  });

  // 3. Use Item Action (Weapons, Ammo, Meds, Food, Drinks, Grenades, Mods, Clothing, Tools)
  mp.events.onClient('gcyber:inventory:serverUseItem', async (player, slotIdx) => {
    const citizenId = getCitizenId(player);
    if (!citizenId) return;

    slotIdx = parseInt(slotIdx, 10);
    const playerSlots = await loadPlayerInventory(citizenId);
    const item = playerSlots[slotIdx];
    if (!item) return;

    const def = getDef(item.id || item.name);
    if (!def || !def.usable) {
      player.emit('g-cyber:hud:notify', 'Inventory', 'This item cannot be used directly.', 'error');
      return;
    }

    const corePlayer = (global.G_CyberCore && typeof global.G_CyberCore.GetPlayer === 'function')
      ? global.G_CyberCore.GetPlayer(player.id)
      : null;

    console.log(`[Inventory] ${player.nickname || citizenId} used ${def.label} (${def.id})`);

    // A. WEAPONS -> Auto-sync matching ammo & force-equip + draw into hand
    if (def.category === 'weapon' || def.type === 'weapon') {
      let ammoNativeId = null;
      let ammoAmount = 0;
      if (def.ammoType) {
        const ammoDef = getDef(def.ammoType);
        ammoNativeId = ammoDef ? ammoDef.nativeId : null;
        ammoAmount = countItemAmount(playerSlots, def.ammoType);
      }
      player.emit('gcyber:inventory:clientEquipWeapon', JSON.stringify({
        nativeId: def.nativeId,
        itemId: def.id,
        label: def.label,
        ammoId: def.ammoType || null,
        ammoNativeId: ammoNativeId,
        ammoAmount: ammoAmount,
        slotIdx: slotIdx
      }));
      return; // Weapons remain in inventory
    }

    // B. AMMUNITION -> Load rounds directly into REDengine reserve & trigger reload
    if (def.category === 'ammo' || def.type === 'ammo') {
      const roundsPerUse = def.roundsPerUse || 15;
      const toLoad = Math.min(item.amount, roundsPerUse);
      const deducted = await deductItemAmount(citizenId, playerSlots, def.id, toLoad);
      const remainingTotal = countItemAmount(playerSlots, def.id);

      player.emit('gcyber:inventory:clientLoadAmmo', JSON.stringify({
        ammoNativeId: def.nativeId,
        ammoId: def.id,
        amount: deducted,
        remaining: remainingTotal,
        label: def.label
      }));
      player.emit('g-cyber:hud:notify', 'Ammunition Loaded', `Chambered +${deducted} ${def.label} (${remainingTotal} left in pockets).`, 'success');
      player.emit('gcyber:inventory:clientUpdate', JSON.stringify({
        player: {
          weight: calculateWeight(playerSlots),
          items: playerSlots
        }
      }));
      return;
    }

    // C. GRENADES -> Equip directly into Gadget slot for [G] throw
    if (def.category === 'grenade' || def.type === 'grenade') {
      player.emit('gcyber:inventory:clientEquipGadget', JSON.stringify({
        nativeId: def.nativeId,
        label: def.label,
        amount: item.amount
      }));
      return;
    }

    // D. WEAPON MODS / SCOPES / SILENCERS -> Attach onto held weapon
    if (def.category === 'mod' || def.type === 'mod') {
      player.emit('gcyber:inventory:clientInstallMod', JSON.stringify({
        nativeId: def.nativeId,
        label: def.label,
        slotIdx: slotIdx
      }));
      return; // Consumed via serverConsumeSlot once installation succeeds
    }

    // E. CLOTHING -> Equip apparel visually
    if (def.category === 'clothing' || def.type === 'clothing') {
      player.emit('gcyber:inventory:clientEquipClothing', JSON.stringify({
        nativeId: def.nativeId,
        label: def.label
      }));
      return;
    }

    // F. CYBERWARE -> Equip cyberware directly
    if (def.category === 'cyberware' || def.type === 'cyberware') {
      player.emit('gcyber:inventory:clientEquipCyberware', JSON.stringify({
        nativeId: def.nativeId,
        label: def.label
      }));
      return;
    }

    // G. RP IDENTITY & TOOLS
    if (def.id === 'id_card' || def.id === 'drive_license') {
      const charInfo = corePlayer && corePlayer.PlayerData && corePlayer.PlayerData.charinfo
        ? corePlayer.PlayerData.charinfo
        : { firstname: player.nickname || 'Night City', lastname: 'Citizen', birthdate: '2054-01-01', lifepath: 'streetkid' };
      const title = def.id === 'id_card' ? 'CITIZEN ID' : 'DRIVER PERMIT';
      const msg = `[${title}] ${charInfo.firstname} ${charInfo.lastname} | ID: ${citizenId} | DOB: ${charInfo.birthdate}`;
      const pPos = player.position || [0, 0, 0];
      mp.players.toArray().forEach((target) => {
        if (!target.position) return;
        const dist = Math.hypot(pPos[0] - target.position[0], pPos[1] - target.position[1], pPos[2] - target.position[2]);
        if (dist <= 6.0) {
          target.emit('chat:add', msg, 'system');
        }
      });
      player.emit('g-cyber:hud:notify', title, `${charInfo.firstname} ${charInfo.lastname} (${citizenId}) shown nearby.`, 'info');
      return;
    }

    if (def.id === 'cyber_phone') {
      player.emit('g-cyber:hud:notify', 'NetWatch Holo-Phone', 'Agent online. Press [T] -> /tweet <msg> or /911 <emergency>.', 'info');
      return;
    }

    if (def.id === 'cyber_lockpick') {
      player.emit('gcyber:inventory:clientLockpick', JSON.stringify({ slotIdx }));
      return; // Consumed via serverConsumeSlot on lock bypass
    }

    if (def.id === 'repair_kit') {
      let targetVeh = player.vehicle || (player.lastAdminVehicleId && mp.vehicles && mp.vehicles.exists(player.lastAdminVehicleId) ? mp.vehicles.at(player.lastAdminVehicleId) : null);
      if (!targetVeh && mp.vehicles && player.position) {
        for (const v of mp.vehicles.toArray()) {
          if (!v.position) continue;
          const dist = Math.hypot(player.position[0] - v.position[0], player.position[1] - v.position[1]);
          if (dist <= 5.0) { targetVeh = v; break; }
        }
      }
      if (!targetVeh) {
        player.emit('g-cyber:hud:notify', 'Repair Kit', 'Stand close to a damaged vehicle to use this kit.', 'warning');
        return;
      }
      targetVeh.health = 1000;
      if (typeof targetVeh.repair === 'function') targetVeh.repair();
      player.emit('g-cyber:hud:notify', 'Vehicle Repaired', 'Vehicle engine & chassis restored using Repair Kit.', 'success');
    }

    // H. REAL CONSUMABLES (Medicine / Food / Drink / Alcohol / Booster)
    const meta = (corePlayer && corePlayer.PlayerData && corePlayer.PlayerData.metadata)
      ? corePlayer.PlayerData.metadata
      : { health: player.health || 100, hunger: 100, thirst: 100, stress: 0, armor: 100 };

    const eff = def.consumeEffect || {};
    let curHealth = (typeof meta.health === 'number') ? meta.health : (player.health || 100);
    let curHunger = (typeof meta.hunger === 'number') ? meta.hunger : 100;
    let curThirst = (typeof meta.thirst === 'number') ? meta.thirst : 100;
    let curStress = (typeof meta.stress === 'number') ? meta.stress : 0;

    if (def.category === 'medicine' || def.type === 'medical' || def.type === 'booster') {
      const healAmt = eff.health || def.healAmount || 35;
      curHealth = Math.min(100, curHealth + healAmt);
      curStress = Math.max(0, Math.min(100, curStress + (eff.stress || -5)));
      curThirst = Math.max(0, Math.min(100, curThirst + (eff.thirst || 0)));
      player.health = curHealth;
      player.emit('g-cyber:hud:notify', 'Medical', `Used ${def.label}. Vitality: ${Math.round(curHealth)}%.`, 'success');
    } else if (def.category === 'food' || def.type === 'food') {
      curHealth = Math.min(100, curHealth + (eff.health || 5));
      curHunger = Math.min(100, curHunger + (eff.hunger || 35));
      curThirst = Math.max(0, Math.min(100, curThirst + (eff.thirst || 0)));
      curStress = Math.max(0, Math.min(100, curStress + (eff.stress || -5)));
      player.emit('g-cyber:hud:notify', 'Nutrition', `Ate ${def.label}. Hunger: ${Math.round(curHunger)}%.`, 'success');
    } else if (def.category === 'drink' || def.type === 'drink' || def.category === 'alcohol' || def.type === 'alcohol') {
      curHealth = Math.min(100, curHealth + (eff.health || 0));
      curThirst = Math.min(100, curThirst + (eff.thirst || 35));
      curStress = Math.max(0, Math.min(100, curStress + (eff.stress || -10)));
      player.emit('g-cyber:hud:notify', 'Hydration', `Drank ${def.label}. Hydration: ${Math.round(curThirst)}%.`, 'success');
    }

    meta.health = curHealth;
    meta.hunger = curHunger;
    meta.thirst = curThirst;
    meta.stress = curStress;

    player.emit('gcyber:inventory:clientConsumeEffect', JSON.stringify({
      health: curHealth,
      hunger: curHunger,
      thirst: curThirst,
      stress: curStress,
      category: def.category,
      label: def.label
    }));

    // Consume 1 unit of stackable item
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

  // 4. Consume Fired Ammunition Delta (Real bullet sync from client engine)
  mp.events.onClient('gcyber:inventory:serverConsumeAmmo', async (player, ammoNativeId, spent) => {
    const citizenId = getCitizenId(player);
    if (!citizenId || !ammoNativeId) return;
    const spentNum = parseInt(spent, 10);
    if (isNaN(spentNum) || spentNum <= 0) return;

    const def = getDef(ammoNativeId);
    if (!def) return;

    const playerSlots = await loadPlayerInventory(citizenId);
    const deducted = await deductItemAmount(citizenId, playerSlots, def.id, spentNum);
    if (deducted > 0) {
      player.emit('gcyber:inventory:clientUpdate', JSON.stringify({
        player: {
          weight: calculateWeight(playerSlots),
          items: playerSlots
        }
      }));
    }
  });

  // 5. Consume Specific Slot on Client Success (Mods, Lockpicks)
  mp.events.onClient('gcyber:inventory:serverConsumeSlot', async (player, slotIdx, amount = 1) => {
    const citizenId = getCitizenId(player);
    if (!citizenId) return;
    await removeItem(player, null, amount, parseInt(slotIdx, 10));
  });

  // 6. Ground Drop Handler
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
    const pPos = player.position || [0, 0, 0];

    // Stack onto an existing drop bag nearby if available
    const existingDrop = findNearbyGroundDrop(pPos, 2.5);
    let container = existingDrop ? existingDrop.container : null;
    let dropSlot = -1;

    if (container) {
      dropSlot = container.items.findIndex(x => x === null);
    }
    if (!container || dropSlot === -1) {
      const dropId = `drop:${++dropCounter}`;
      container = getOrCreateContainer(dropId, InvConfig.drop.maxSlots, InvConfig.drop.maxWeight);
      dropSlot = 0;
      GroundDrops.set(dropId, {
        id: dropId,
        position: [...pPos],
        createdAt: Date.now()
      });
    }

    container.items[dropSlot] = { ...item, slot: dropSlot, amount: dropAmount };

    if (dropAmount === item.amount) {
      playerSlots[slot] = null;
      await savePlayerSlot(citizenId, slot, null);
    } else {
      item.amount -= dropAmount;
      await savePlayerSlot(citizenId, slot, item);
    }

    player.emit('g-cyber:hud:notify', 'Drop', 'Dropped items onto the ground (Press Tab nearby to pick up).', 'info');
    player.emit('gcyber:inventory:clientUpdate', JSON.stringify({
      player: {
        weight: calculateWeight(playerSlots),
        items: playerSlots
      },
      container: {
        id: container.id,
        weight: calculateWeight(container.items),
        items: container.items
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
  AddItem: addItem,
  RemoveItem: removeItem,
  GetItemDef: getDef,
  SharedItems: SharedItems,
  Mount: mountInventoryEvents
};

global.G_CyberInventory = InventoryModule;
module.exports = InventoryModule;
