// G-CyberRPcore - Server Entry Point
// The Definitive Roleplay Framework for Cyberpunk 2077 (CyberMP)

const G_CyberCore = require('./core/index');

console.log('[G-CyberRPcore] Server runtime initialized. Framework active.');

// Paycheck Routine (Every 15 minutes)
setInterval(() => {
  if (global.G_CyberCore) {
    global.G_CyberCore.Functions.GetPlayers().forEach(player => {
      const job = player.PlayerData.job;
      if (job && job.payment > 0) {
        if (!job.offDutyPay && !job.onDuty) return;

        player.Functions.AddMoney('bank', job.payment, `Salary: ${job.label}`);
      }
    });
  }
}, 15 * 60 * 1000);

if (typeof module !== 'undefined') {
  module.exports = G_CyberCore;
}
