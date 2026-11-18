/* =====================================================================
   G-CyberRPcore - Night City Loading Screen Logic
   Interactive Tabs, Web Audio API Equalizer, Canvas Cyber-Grid & Handshake
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const bgAudio = document.getElementById('bg-audio');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('play-icon');
  const btnMute = document.getElementById('btn-mute');
  const muteIcon = document.getElementById('mute-icon');
  const volumeSlider = document.getElementById('volume-slider');
  const volPercent = document.getElementById('vol-percent');
  const visualizerBars = document.querySelectorAll('#visualizer .bar');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const progressFill = document.getElementById('progress-fill');
  const statusPercent = document.getElementById('status-percent');
  const statusPhase = document.getElementById('status-phase');
  const statusText = document.getElementById('status-text');
  const tickerContent = document.getElementById('ticker-content');
  const ctaContainer = document.getElementById('cta-container');
  const btnJackIn = document.getElementById('btn-jack-in');
  const loadingWrapper = document.getElementById('loadingWrapper');
  const telePing = document.getElementById('tele-ping');

  let isAudioMuted = false;
  let isJackedIn = false;
  let audioContext = null;
  let analyser = null;
  let dataArray = null;

  // =====================================================================
  // 1. Audio System & Real-Time Equalizer Visualizer
  // =====================================================================
  bgAudio.volume = volumeSlider.value / 100;

  function initWebAudio() {
    if (audioContext) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;

      const source = audioContext.createMediaElementSource(bgAudio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      dataArray = new Uint8Array(analyser.frequencyBinCount);
      renderVisualizer();
    } catch (e) {
      console.warn('Web Audio API not fully available in CEF, falling back to CSS animation:', e);
      simulateVisualizer();
    }
  }

  function renderVisualizer() {
    if (!analyser || bgAudio.paused) {
      requestAnimationFrame(renderVisualizer);
      return;
    }

    analyser.getByteFrequencyData(dataArray);
    const step = Math.floor(dataArray.length / visualizerBars.length);

    visualizerBars.forEach((bar, index) => {
      const value = dataArray[index * step] || 0;
      const height = Math.max(4, Math.floor((value / 255) * 22));
      bar.style.height = `${height}px`;
      if (height > 16) {
        bar.style.backgroundColor = 'var(--neon-yellow)';
      } else {
        bar.style.backgroundColor = 'var(--neon-cyan)';
      }
    });

    requestAnimationFrame(renderVisualizer);
  }

  function simulateVisualizer() {
    setInterval(() => {
      if (bgAudio.paused) return;
      visualizerBars.forEach(bar => {
        const height = Math.floor(Math.random() * 18) + 4;
        bar.style.height = `${height}px`;
      });
    }, 100);
  }

  // Attempt Autoplay
  function tryPlayAudio() {
    initWebAudio();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    bgAudio.play().then(() => {
      playIcon.textContent = '⏸';
    }).catch(err => {
      console.log('Autoplay waiting for user gesture:', err);
      playIcon.textContent = '▶';
    });
  }

  tryPlayAudio();
  window.addEventListener('click', () => {
    if (bgAudio.paused && !isJackedIn) {
      tryPlayAudio();
    }
  }, { once: true });

  // Play / Pause Toggle
  btnPlayPause.addEventListener('click', () => {
    initWebAudio();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }

    if (bgAudio.paused) {
      bgAudio.play();
      playIcon.textContent = '⏸';
    } else {
      bgAudio.pause();
      playIcon.textContent = '▶';
    }
  });

  // Mute Toggle
  btnMute.addEventListener('click', () => {
    isAudioMuted = !isAudioMuted;
    bgAudio.muted = isAudioMuted;
    muteIcon.textContent = isAudioMuted ? '🔇' : '🔊';
  });

  // Volume Slider
  volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    bgAudio.volume = val / 100;
    volPercent.textContent = `${val}%`;
    if (val === '0') {
      muteIcon.textContent = '🔇';
    } else if (!isAudioMuted) {
      muteIcon.textContent = '🔊';
    }
  });

  // Keyboard Shortcuts (Space for Play/Pause, M for Mute, Enter for Jack In)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      btnPlayPause.click();
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      btnMute.click();
    } else if (e.code === 'Enter') {
      if (ctaContainer.classList.contains('ready') && !isJackedIn) {
        jackIn();
      }
    }
  });

  // =====================================================================
  // 2. Interactive Tabs (qb-loading style)
  // =====================================================================
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      // Update button active state
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update panel active state
      tabPanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  // =====================================================================
  // 3. Cyberpunk 3D Perspective Grid Canvas
  // =====================================================================
  const canvas = document.getElementById('cyber-canvas');
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const particles = [];
  for (let i = 0; i < 45; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speedY: -(Math.random() * 0.8 + 0.3),
      opacity: Math.random() * 0.7 + 0.2,
      color: Math.random() > 0.5 ? '#00f0ff' : '#fcee0a'
    });
  }

  let gridOffset = 0;
  function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dynamic Horizon Grid
    const horizon = canvas.height * 0.7;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;

    // Perspective lines
    const fovX = canvas.width * 0.5;
    for (let x = -canvas.width; x <= canvas.width * 2; x += 120) {
      ctx.beginPath();
      ctx.moveTo(fovX, horizon);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Horizontal moving grid lines
    gridOffset = (gridOffset + 0.4) % 30;
    for (let y = horizon; y <= canvas.height; y += Math.pow((y - horizon) / 25, 1.8) + 4) {
      const lineY = y + gridOffset;
      if (lineY > horizon && lineY <= canvas.height) {
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(canvas.width, lineY);
        ctx.stroke();
      }
    }

    // Floating Data Embers
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      p.y += p.speedY;
      if (p.y < 0) {
        p.y = canvas.height;
        p.x = Math.random() * canvas.width;
      }
    });

    ctx.globalAlpha = 1.0;
    requestAnimationFrame(drawCanvas);
  }
  drawCanvas();

  // Subtle Ping Jitter for realism
  setInterval(() => {
    const ping = Math.floor(Math.random() * 6) + 11;
    telePing.textContent = `${ping} MS`;
  }, 2500);

  // =====================================================================
  // 4. Loading Progress Sequence & Telemetry Phases
  // =====================================================================
  const loadingPhases = [
    { p: 12, phase: '[SYS_BOOT]', text: 'ESTABLISHING SECURE NEURAL HANDSHAKE WITH SERVER...', ticker: 'SOCKET BIND // 127.0.0.1:2077 // TCP/UDP PROTOCOL OK' },
    { p: 28, phase: '[V8_ENV]', text: 'COMPILING G-CYBERRPCORE CLIENT SUBSYSTEMS & MEMORY MATRICES...', ticker: 'REGISTERING PLAYERDATA SINGLETON // CALLBACK ENGINE READY' },
    { p: 48, phase: '[ASSETS]', text: 'LOADING REDENGINE SHADERS, WEAPONS & CYBERWARE PACKETS...', ticker: 'MOUNTING ARCHIVES // 150+ NIGHT CITY WEAPONS, ITEMS & VEHICLES' },
    { p: 68, phase: '[AUDIO_BUS]', text: 'CALIBRATING 3D SPATIAL VOIP CHANNELS & PROXIMITY RADIO GRID...', ticker: 'VOIP LINK ENGAGED // 15M LOCAL CHAT + FREQUENCY CHANNELS' },
    { p: 85, phase: '[DATA_SYNC]', text: 'RETRIEVING CITIZEN PROFILE, INVENTORY SLOTS & FACTION STATUS...', ticker: 'BIOMETRICS AUTHENTICATED // CITIZEN ID ALLOCATED' },
    { p: 100, phase: '[READY]', text: 'NEURAL LINK SYNCHRONIZED. WELCOME TO NIGHT CITY, CHOOM.', ticker: 'SYSTEM READY // PRESS [ENTER] OR CLICK BELOW TO JACK IN' }
  ];

  let currentPercent = 0;
  let phaseIndex = 0;

  function updateLoadingUI(pct, phaseStr, textStr, tickerStr) {
    currentPercent = Math.min(100, pct);
    progressFill.style.width = `${currentPercent}%`;
    statusPercent.textContent = `${currentPercent}%`;

    if (phaseStr) statusPhase.textContent = phaseStr;
    if (textStr) statusText.textContent = textStr;
    if (tickerStr) tickerContent.textContent = tickerStr;

    if (currentPercent >= 100) {
      ctaContainer.classList.add('ready');
    }
  }

  // Auto-progress simulation
  const progressInterval = setInterval(() => {
    if (currentPercent < 100) {
      currentPercent += 2;
      const targetPhase = loadingPhases.find(item => currentPercent <= item.p) || loadingPhases[loadingPhases.length - 1];
      updateLoadingUI(currentPercent, targetPhase.phase, targetPhase.text, targetPhase.ticker);
    } else {
      clearInterval(progressInterval);
    }
  }, 120);

  // =====================================================================
  // 5. Jack In Action (Fade out and transition to game)
  // =====================================================================
  function playJackInChime() {
    try {
      if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtx();
      }
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + 0.35);
    } catch (e) {}
  }

  function jackIn() {
    if (isJackedIn) return;
    isJackedIn = true;

    playJackInChime();

    // Smoothly fade out music
    const fadeAudio = setInterval(() => {
      if (bgAudio.volume > 0.05) {
        bgAudio.volume = Math.max(0, bgAudio.volume - 0.05);
      } else {
        bgAudio.pause();
        clearInterval(fadeAudio);
      }
    }, 40);

    // Fade out loading screen UI
    loadingWrapper.classList.add('fade-out');

    // Notify CyberMP client script
    setTimeout(() => {
      if (window.mp && mp.events) {
        mp.events.emit('g-cyber:loading:finish');
      }
    }, 700);
  }

  btnJackIn.addEventListener('click', jackIn);

  // =====================================================================
  // 6. External CyberMP Events Support
  // =====================================================================
  if (window.mp && mp.events) {
    mp.events.on('g-cyber:loading:reopen', () => {
      isJackedIn = false;
      loadingWrapper.classList.remove('fade-out');
      ctaContainer.classList.add('ready');
      updateLoadingUI(100, '[CONNECTED]', 'RECONNECTED TO NIGHT CITY NEURAL LINK', 'ONLINE');
      tryPlayAudio();
    });

    mp.events.on('g-cyber:loading:close', () => {
      jackIn();
    });

    mp.events.on('g-cyber:loading:setProgress', (pct, status) => {
      updateLoadingUI(pct, '[SERVER_PULSE]', status, status);
    });
  }
});
