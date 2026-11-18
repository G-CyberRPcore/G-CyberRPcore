// G-CyberRPcore - Loading Screen Client Script
// Manages CEF lifecycle, focus control, and handoff to the game world

mp.cef.setUrl('./ui/index.html');

let isLoadingActive = true;

// On load, give mouse and input focus to the loading screen UI
mp.cef.setFocus(true, true);

// Listen for loading finished from CEF (Player clicked 'Jack In' or finished load)
mp.events.onCef('g-cyber:loading:finish', () => {
  isLoadingActive = false;
  
  // Release CEF focus back to the game
  mp.cef.setFocus(false, false);
  
  // Inform server that this player has fully jacked in
  mp.events.emitServer('g-cyber:loading:playerReady');
  
  console.log('[g-cyber-loading] Neural handshake complete. Player jacked in.');
});

// Command to test or re-open loading screen
mp.commands.add('loading', () => {
  isLoadingActive = true;
  mp.cef.setFocus(true, true);
  mp.events.emitCef('g-cyber:loading:reopen');
});

// Emergency command to force close loading screen if needed
mp.commands.add('closeloading', () => {
  isLoadingActive = false;
  mp.cef.setFocus(false, false);
  mp.events.emitCef('g-cyber:loading:close');
});

// Server trigger to open loading screen
mp.events.onServer('g-cyber:loading:open', () => {
  isLoadingActive = true;
  mp.cef.setFocus(true, true);
  mp.events.emitCef('g-cyber:loading:reopen');
});

console.log('[g-cyber-loading] Client module initialized.');
