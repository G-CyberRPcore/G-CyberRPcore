// G-CyberRPcore - Server-Client Async Callbacks System
// Modeled directly on QBCore.Functions.CreateCallback / TriggerCallback

class CallbackManager {
  constructor() {
    this.serverCallbacks = new Map();
  }

  // Register a server-side callback that returns data to the client
  CreateCallback(name, handler) {
    this.serverCallbacks.set(name, handler);
  }

  // Handle incoming request from client
  async HandleClientRequest(player, name, requestId, ...args) {
    const handler = this.serverCallbacks.get(name);
    if (!handler) {
      console.warn(`[G-CyberRPcore Callbacks] Unhandled callback request: ${name}`);
      player.emit('g-cyber:client:callbackResponse', requestId, null);
      return;
    }

    try {
      const response = await new Promise((resolve) => {
        handler(player, resolve, ...args);
      });
      player.emit('g-cyber:client:callbackResponse', requestId, response);
    } catch (err) {
      console.error(`[G-CyberRPcore Callbacks] Error in callback '${name}':`, err);
      player.emit('g-cyber:client:callbackResponse', requestId, null);
    }
  }
}

const callbacks = new CallbackManager();
module.exports = callbacks;
