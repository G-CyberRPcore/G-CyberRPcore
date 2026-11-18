# 📘 G-CyberRPcore - Developer API Reference

The `G_CyberCore` object is the central singleton providing universal access to player data, server callbacks, entity spawning, and configuration.

---

## 👤 Player Management

### `G_CyberCore.Functions.GetPlayer(idOrPlayer)`
Returns the `Player` instance associated with a server ID or CyberMP player instance.

```javascript
const player = G_CyberCore.Functions.GetPlayer(playerId);
if (player) {
  console.log(`Citizen: ${player.PlayerData.name} (${player.PlayerData.citizenid})`);
}
```

### `G_CyberCore.Functions.GetPlayerByCitizenId(citizenid)`
Look up an online player by their unique Night City Citizen ID (e.g., `NC-941824`).

---

## 💰 Money & Economy

### `player.Functions.AddMoney(type, amount, reason)`
* **`type`**: `'cash'` | `'bank'` | `'crypto'`
* **`amount`**: `number`
* **`reason`**: `string` (Optional description for audit logging)

```javascript
player.Functions.AddMoney('bank', 2500, 'NCPD Salary Paycheck');
```

### `player.Functions.RemoveMoney(type, amount, reason)`
Returns `true` if funds were successfully deducted, or `false` if the player has insufficient funds.

```javascript
const success = player.Functions.RemoveMoney('cash', 450, 'Ripperdoc Medicine');
```

---

## 💼 Jobs & Careers

### `player.Functions.SetJob(jobName, gradeLevel)`
Assigns a citizen to a job with an associated rank:

```javascript
// Assign to NCPD with Grade 2 (Senior Officer)
player.Functions.SetJob('police', 2);
```

### `player.Functions.SetJobDuty(onDuty)`
Toggles duty status (`true` / `false`). Controls whether law enforcement receives 911 dispatches or earns salary.

---

## 🎒 Inventory & Items

### `player.Functions.AddItem(itemName, amount, slot, info)`
Adds an item to the player's inventory while verifying weight limits (maximum 120 kg).

```javascript
player.Functions.AddItem('maxdoc_mk1', 2);
player.Functions.AddItem('weapon_unity', 1, null, { serial: 'AR-7701' });
```

### `player.Functions.RemoveItem(itemName, amount, slot)`
Removes an item from the player inventory.

---

## 🔄 Server Callbacks

Async Request/Response pattern eliminating event boilerplate.

### Server Side:
```javascript
G_CyberCore.Functions.CreateCallback('g-cyber:server:getOwnedVehicles', (player, resolve) => {
  const citizenid = player.PlayerData.citizenid;
  const vehicles = db.GetPlayerVehicles(citizenid);
  resolve(vehicles);
});
```

### Client Side:
```javascript
G_CyberCore.Functions.TriggerCallback('g-cyber:server:getOwnedVehicles', (vehicles) => {
  console.log('Owned Vehicles:', vehicles);
});
```

---

## 🚗 Entity & Vehicle Creation

### `G_CyberCore.Functions.CreateVehicle(modelKey, pos, yaw, ownerCitizenId)`
Spawns a synchronized vehicle using REDengine TweakDBID hashes:

```javascript
const car = G_CyberCore.Functions.CreateVehicle('quadra_turbo_r', player.position, player.yaw, player.PlayerData.citizenid);
```
