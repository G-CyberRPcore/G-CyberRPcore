// G-CyberRPcore - Loading Screen Server Script
// Manages loading screen lifecycle, telemetry, and player synchronization

console.log('==================================================');
console.log(' [G-CyberRPcore] >> Loading Screen Module Activated');
console.log(' [G-CyberRPcore] >> Audio Track: G-CyberRPcore-Loading.mp3');
console.log('==================================================');

function onPlayerReady(player) {
  const charName = (player && (player.name || player.nickname)) ? (player.name || player.nickname) : 'Unknown Netrunner';
  console.log(`[Loading Screen] Player ${charName} (ID: ${player ? player.id : '?'}) successfully synchronized and jacked in!`);
  
  // Forward to global G-CyberCore if loaded
  if (global.G_CyberCore && global.G_CyberCore.Functions && player) {
    const corePlayer = global.G_CyberCore.Functions.GetPlayer(player.id);
    if (corePlayer) {
      corePlayer.Functions.Notify('Welcome to Night City', 'Neural link synchronized.', 'success');
    }
  }
}

if (mp.events) {
  if (typeof mp.events.onClient === 'function') {
    mp.events.onClient('g-cyber:loading:playerReady', onPlayerReady);
  }
  if (typeof mp.events.on === 'function') {
    mp.events.on('g-cyber:loading:playerReady', onPlayerReady);
  }
}

// Admin command to force re-open loading screen for testing
if (mp.commands) {
  mp.commands.add('testloading', (player) => {
    if (player && typeof player.emit === 'function') {
      player.emit('g-cyber:loading:open');
      console.log(`[Loading Screen] Forced reload for player ${player.nickname || player.name}`);
    }
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    name: 'g-cyber-loading',
    version: '1.0.0'
  };
}
