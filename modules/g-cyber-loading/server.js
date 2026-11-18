// G-CyberRPcore - Loading Screen Server Script
// Manages loading screen lifecycle, telemetry, and player synchronization

console.log('==================================================');
console.log(' [G-CyberRPcore] >> Loading Screen Module Activated');
console.log(' [G-CyberRPcore] >> Audio Track: G-CyberRPcore-Loading.mp3');
console.log('==================================================');

// Event triggered when a player finishes the loading screen and jacks in
mp.events.on('g-cyber:loading:playerReady', (player) => {
  const charName = (player && player.name) ? player.name : 'Unknown Netrunner';
  console.log(`[Loading Screen] Player ${charName} (ID: ${player ? player.id : '?'}) successfully synchronized and jacked in!`);
  
  // Forward to global G-CyberCore if loaded
  if (global.G_CyberCore && global.G_CyberCore.Functions) {
    const corePlayer = global.G_CyberCore.Functions.GetPlayer(player.id);
    if (corePlayer) {
      corePlayer.Functions.Notify('Welcome to Night City', 'Neural link synchronized.', 'success');
    }
  }
});

// Admin command to force re-open loading screen for testing
if (mp.commands) {
  mp.commands.add('testloading', (player) => {
    if (player) {
      mp.events.emitClient(player, 'g-cyber:loading:open');
      console.log(`[Loading Screen] Forced reload for player ${player.name}`);
    }
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    name: 'g-cyber-loading',
    version: '1.0.0'
  };
}
