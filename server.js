// G-CyberRPcore - Server Entry Point
// The Definitive Roleplay Framework for Cyberpunk 2077 (CyberMP)

const G_CyberCore = require('./core/index');

console.log('[G-CyberRPcore] Server runtime initialized. Framework active.');

// Paycheck Routine (Every 15 minutes)
setInterval(() => {
  G_CyberCore.Functions.GetPlayers().forEach(player => {
    const job = player.PlayerData.job;
    if (job && job.payment > 0) {
      if (!job.offDutyPay && !job.onDuty) return;

      player.Functions.AddMoney('bank', job.payment, `Salary: ${job.label}`);
    }
  });
  console.log('[G-CyberRPcore Economy] Periodic salaries deposited.');
}, 15 * 60 * 1000);

// Export for other modular resources
module.exports = G_CyberCore;
