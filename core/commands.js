// G-CyberRPcore - Central Command Registration & Permission System
// Native Command Registration & Permission Engine

class CommandManager {
  constructor() {
    this.commands = new Map();
  }

  Add(name, help = '', argsDef = [], permission = 'user', callback) {
    name = name.toLowerCase();

    this.commands.set(name, {
      name,
      help,
      argsDef,
      permission,
      callback
    });

    // Hook into CyberMP platform commands API
    mp.commands.add(name, (player, args) => {
      this.Execute(player, name, args || []);
    });
  }

  Execute(player, name, args) {
    const cmd = this.commands.get(name.toLowerCase());
    if (!cmd) return;

    // Check permission if invoked by an active in-game player
    if (player) {
      const playerPerm = player.getMeta('permission') || 'user';
      if (!this.HasPermission(playerPerm, cmd.permission)) {
        player.emit('g-cyber:client:notify', 'Permission Denied', 'You do not have access to this command.', 'error');
        return;
      }
    }

    try {
      cmd.callback(player, args);
    } catch (err) {
      console.error(`[G-CyberRPcore Commands] Error executing /${name}:`, err);
    }
  }

  HasPermission(userPerm, requiredPerm) {
    const hierarchy = { user: 1, mod: 2, admin: 3, god: 4 };
    const userRank = hierarchy[userPerm] || 1;
    const reqRank = hierarchy[requiredPerm] || 1;
    return userRank >= reqRank;
  }
}

const commands = new CommandManager();
module.exports = commands;
