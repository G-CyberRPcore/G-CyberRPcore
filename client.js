// G-CyberRPcore - Client Entry Point
// Bridges REDengine native game events with G-CyberRPcore CEF interfaces

console.log('[G-CyberRPcore] Client subsystem initializing...');

// Active callback requests map: requestId -> resolve function
const activeCallbacks = new Map();
let callbackIdCounter = 0;

// Client Callback Invocation API: G_CyberCore.Functions.TriggerCallback(name, cb, ...args)
const G_CyberCoreClient = {
  Functions: {
    TriggerCallback: (name, cb, ...args) => {
      callbackIdCounter++;
      const reqId = callbackIdCounter;
      activeCallbacks.set(reqId, cb);
      mp.events.emitServer('g-cyber:server:triggerCallback', name, reqId, ...args);
    },
    Notify: (title, message, type = 'info') => {
      mp.events.emitCef('g-cyber:hud:notify', title, message, type);
    }
  }
};

global.G_CyberCore = G_CyberCoreClient;

// Receive Callback Response from Server
mp.events.onServer('g-cyber:client:callbackResponse', (requestId, response) => {
  const cb = activeCallbacks.get(requestId);
  if (cb) {
    cb(response);
    activeCallbacks.delete(requestId);
  }
});

// Receive HUD Sync
mp.events.onServer('g-cyber:client:syncHUD', (data) => {
  mp.events.emitCef('g-cyber:hud:sync', data);
});

// Receive Inventory Sync
mp.events.onServer('g-cyber:client:syncInventory', (data) => {
  mp.events.emitCef('g-cyber:inventory:sync', data);
});

// Receive Generic Notifications
mp.events.onServer('g-cyber:client:notify', (title, message, type) => {
  mp.events.emitCef('g-cyber:hud:notify', title, message, type);
});

// Toggle HUD Cursor Focus
mp.commands.add('hud', () => {
  const inFocus = mp.cef.isInFocus();
  mp.cef.setFocus(!inFocus, !inFocus);
});

// Toggle Inventory UI
mp.commands.add('inv', () => {
  const inFocus = mp.cef.isInFocus();
  mp.cef.setFocus(!inFocus, !inFocus);
  mp.events.emitCef('g-cyber:inventory:toggle');
});

console.log('[G-CyberRPcore] Client subsystem ready.');
