// G-CyberRPcore - G-CyberAdmin Web & Remote Management Server
// Autonomous HTTP & Real-Time Console Server running on Port 2078 (txAdmin Alternative)

const http = require('http');
const fs = require('fs');
const path = require('path');

let Config;
try {
  Config = require('../config');
} catch {
  Config = {
    AdminPanel: {
      enabled: true,
      host: '0.0.0.0',
      port: 2078,
      secretKey: 'cybermp2077',
      logBufferSize: 250
    }
  };
}

class AdminServer {
  constructor() {
    this.core = null;
    this.server = null;
    this.sseClients = new Set();
    this.logBuffer = [];
    this.maxBufferSize = (Config.AdminPanel && Config.AdminPanel.logBufferSize) || 250;
    this.htmlContent = null;
    this.isHooked = false;
  }

  start(coreInstance) {
    if (this.server) return;
    this.core = coreInstance;

    const port = (Config.AdminPanel && Config.AdminPanel.port) || 2078;
    const host = (Config.AdminPanel && Config.AdminPanel.host) || '0.0.0.0';

    this.hookConsole();
    this.loadHtmlTemplate();

    this.server = http.createServer((req, res) => this.handleRequest(req, res));

    this.server.listen(port, host, () => {
      console.log(`[G-CyberAdmin] Management Web Panel active on http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`);
    });

    this.server.on('error', (err) => {
      console.error('[G-CyberAdmin] Server error:', err.message);
    });
  }

  loadHtmlTemplate() {
    const htmlPath = path.join(__dirname, 'admin_panel', 'index.html');
    try {
      if (fs.existsSync(htmlPath)) {
        this.htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      }
    } catch (err) {
      console.error('[G-CyberAdmin] Error reading admin panel HTML:', err.message);
    }
  }

  hookConsole() {
    if (this.isHooked) return;
    this.isHooked = true;

    const self = this;
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = function (...args) {
      origLog.apply(console, args);
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      self.broadcastLog(msg, 'info');
    };

    console.warn = function (...args) {
      origWarn.apply(console, args);
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      self.broadcastLog(msg, 'warn');
    };

    console.error = function (...args) {
      origError.apply(console, args);
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      self.broadcastLog(msg, 'error');
    };
  }

  broadcastLog(text, level = 'info') {
    const payload = {
      timestamp: Date.now(),
      level: level,
      text: text
    };

    this.logBuffer.push(payload);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    const dataStr = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(dataStr);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  async handleRequest(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. Static Web Dashboard
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (!this.htmlContent) this.loadHtmlTemplate();
      res.end(this.htmlContent || '<h1>G-CyberAdmin UI Loading...</h1>');
      return;
    }

    // 2. Server-Sent Events (SSE) Console Stream
    if (pathname === '/api/console/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write('\n');

      // Send recent buffered history
      for (const item of this.logBuffer) {
        res.write(`data: ${JSON.stringify(item)}\n\n`);
      }

      this.sseClients.add(res);
      req.on('close', () => {
        this.sseClients.delete(res);
      });
      return;
    }

    // 3. API: Status
    if (pathname === '/api/status' && req.method === 'GET') {
      const stats = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        playerCount: this.core && this.core.Functions ? this.core.Functions.GetPlayers().length : 0,
        database: this.core && this.core.Database ? this.core.Database.GetStats() : { driver: 'unknown', connected: false }
      };
      this.sendJson(res, stats);
      return;
    }

    // 4. API: Online Players
    if (pathname === '/api/players' && req.method === 'GET') {
      const playerList = [];
      if (this.core && this.core.Functions) {
        const corePlayers = this.core.Functions.GetPlayers();
        for (const p of corePlayers) {
          playerList.push({
            id: p.id,
            name: p.mp ? p.mp.nickname : p.PlayerData.name,
            citizenid: p.PlayerData.citizenid,
            charinfo: p.PlayerData.charinfo,
            money: p.PlayerData.money,
            job: p.PlayerData.job,
            gang: p.PlayerData.gang,
            metadata: p.PlayerData.metadata,
            position: p.mp ? p.mp.position : null,
            health: p.mp ? p.mp.health : 100,
            ping: p.mp ? p.mp.ping : 0
          });
        }
      }
      this.sendJson(res, playerList);
      return;
    }

    // 5. API: Resources
    if (pathname === '/api/resources' && req.method === 'GET') {
      const resources = this.scanResources();
      this.sendJson(res, resources);
      return;
    }

    // 6. API: Database Records
    if (pathname === '/api/database/players' && req.method === 'GET') {
      if (this.core && this.core.Database) {
        try {
          const rows = await this.core.Database.Fetch('SELECT citizenid, name, owner_key, license, slot, money, job, last_updated FROM players ORDER BY last_updated DESC LIMIT 100');
          this.sendJson(res, rows);
          return;
        } catch (err) {
          this.sendJson(res, { error: err.message }, 500);
          return;
        }
      }
      this.sendJson(res, []);
      return;
    }

    // 7. API: Execute Console Command
    if (pathname === '/api/console/execute' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const cmd = (data.command || '').trim();
          const result = await this.executeAdminCommand(cmd);
          this.sendJson(res, result);
        } catch (err) {
          this.sendJson(res, { success: false, output: err.message }, 400);
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  sendJson(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  scanResources() {
    const candidateDirs = [
      path.join(process.cwd(), 'resources'),
      path.join('D:\\cybermpserver', 'resources'),
      path.join(__dirname, '..', '..')
    ];

    let resDir = null;
    for (const d of candidateDirs) {
      if (fs.existsSync(d)) {
        resDir = d;
        break;
      }
    }

    if (!resDir) return [];

    const list = [];
    try {
      const items = fs.readdirSync(resDir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith('.')) {
          const isCore = item.name.toLowerCase().includes('core');
          list.push({
            name: item.name,
            isCore: isCore,
            path: path.join(resDir, item.name),
            status: 'running'
          });
        }
      }
    } catch (err) {
      console.error('[G-CyberAdmin] Error scanning resources:', err.message);
    }
    return list;
  }

  async executeAdminCommand(cmd) {
    if (!cmd) return { success: false, output: 'Empty command' };

    const parts = cmd.split(' ');
    const action = parts[0].toLowerCase();
    const args = parts.slice(1);

    console.log(`[G-CyberAdmin WEB CMD] Executing: "${cmd}"`);

    // --- HEAL ALL ---
    if (action === 'healall') {
      let count = 0;
      if (typeof mp !== 'undefined' && mp.players) {
        mp.players.forEach(p => {
          p.emit('g-cyber:client:heal');
          count++;
        });
      }
      return { success: true, output: `Issued heal signal to all ${count} online citizens.` };
    }

    // --- REVIVE ALL ---
    if (action === 'reviveall') {
      let count = 0;
      if (typeof mp !== 'undefined' && mp.players) {
        mp.players.forEach(p => {
          p.emit('g-cyber:client:revive');
          count++;
        });
      }
      return { success: true, output: `Issued revive signal to all ${count} online citizens.` };
    }

    // --- HEAL SINGLE ---
    if (action === 'heal') {
      const targetId = parseInt(args[0], 10);
      if (isNaN(targetId)) return { success: false, output: 'Usage: heal <playerId>' };
      if (typeof mp !== 'undefined' && mp.players) {
        const target = mp.players.at(targetId);
        if (target) {
          target.emit('g-cyber:client:heal');
          return { success: true, output: `Healed player #${targetId} (${target.nickname}).` };
        }
      }
      return { success: false, output: `Player #${targetId} not found.` };
    }

    // --- REVIVE SINGLE ---
    if (action === 'revive') {
      const targetId = parseInt(args[0], 10);
      if (isNaN(targetId)) return { success: false, output: 'Usage: revive <playerId>' };
      if (typeof mp !== 'undefined' && mp.players) {
        const target = mp.players.at(targetId);
        if (target) {
          target.emit('g-cyber:client:revive');
          return { success: true, output: `Revived player #${targetId} (${target.nickname}).` };
        }
      }
      return { success: false, output: `Player #${targetId} not found.` };
    }

    // --- TELEPORT ---
    if (action === 'tp') {
      const targetId = parseInt(args[0], 10);
      const x = parseFloat(args[1]);
      const y = parseFloat(args[2]);
      const z = parseFloat(args[3]);
      if (isNaN(targetId) || isNaN(x) || isNaN(y) || isNaN(z)) {
        return { success: false, output: 'Usage: tp <playerId> <x> <y> <z>' };
      }
      if (typeof mp !== 'undefined' && mp.players) {
        const target = mp.players.at(targetId);
        if (target) {
          target.position = [x, y, z];
          return { success: true, output: `Teleported player #${targetId} to [${x}, ${y}, ${z}].` };
        }
      }
      return { success: false, output: `Player #${targetId} not found.` };
    }

    // --- KICK ---
    if (action === 'kick') {
      const targetId = parseInt(args[0], 10);
      const reason = args.slice(1).join(' ') || 'Kicked by G-CyberAdmin';
      if (isNaN(targetId)) return { success: false, output: 'Usage: kick <playerId> [reason]' };
      if (typeof mp !== 'undefined' && mp.players) {
        const target = mp.players.at(targetId);
        if (target) {
          target.kick(reason);
          return { success: true, output: `Kicked player #${targetId}. Reason: ${reason}` };
        }
      }
      return { success: false, output: `Player #${targetId} not found.` };
    }

    // --- BROADCAST (SAY) ---
    if (action === 'say') {
      const msg = args.join(' ');
      if (!msg) return { success: false, output: 'Usage: say <message>' };
      if (typeof mp !== 'undefined' && mp.players) {
        mp.players.forEach(p => {
          p.emit('g-cyber:client:notify', 'SERVER ANNOUNCEMENT', msg, 'info');
        });
      }
      return { success: true, output: `Broadcasted: "${msg}"` };
    }

    // --- STATUS ---
    if (action === 'status') {
      const pCount = this.core && this.core.Functions ? this.core.Functions.GetPlayers().length : 0;
      const dbStats = this.core && this.core.Database ? this.core.Database.GetStats() : {};
      return {
        success: true,
        output: `Server Online. Citizens: ${pCount} | DB: ${dbStats.driver || 'none'} (${dbStats.connected ? 'OK' : 'DISCONNECTED'}) | Uptime: ${Math.round(process.uptime())}s`
      };
    }

    return { success: true, output: `Command "${cmd}" received.` };
  }
}

const adminServerInstance = new AdminServer();
module.exports = adminServerInstance;
