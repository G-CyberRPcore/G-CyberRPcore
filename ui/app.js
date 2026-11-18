/* =====================================================================
   G-CyberRPcore Master Application Logic (CEF & Browser)
   Unified Controller: Loading Screen, Multicharacter, Creator, HUD, Chat & Admin
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Master Layers
  const viewLoading = document.getElementById('view-loading');
  const viewMultichar = document.getElementById('view-multicharacter');
  const viewCreator = document.getElementById('view-creator');
  const viewHud = document.getElementById('view-hud');
  const viewAdmin = document.getElementById('view-admin');

  // Layers Array
  const allViews = [viewLoading, viewMultichar, viewCreator, viewHud, viewAdmin];

  function showView(targetView) {
    allViews.forEach(v => {
      if (v) v.classList.remove('active');
    });
    if (targetView) {
      targetView.classList.add('active');
    }
  }

  // Toast System
  const toastContainer = document.getElementById('toast-container');
  function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  // Server Announcement Banner
  const announcementBanner = document.getElementById('server-announcement-banner');
  const announcementText = document.getElementById('announcement-text');
  function broadcastBanner(text) {
    announcementText.textContent = text;
    announcementBanner.style.display = 'flex';
    setTimeout(() => {
      announcementBanner.style.display = 'none';
    }, 8000);
  }

  // =====================================================================
  // 1. Audio System & Real-Time Equalizer Visualizer
  // =====================================================================
  const bgAudio = document.getElementById('bg-audio');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('play-icon');
  const btnMute = document.getElementById('btn-mute');
  const muteIcon = document.getElementById('mute-icon');
  const volumeSlider = document.getElementById('volume-slider');
  const volPercent = document.getElementById('vol-percent');
  const visualizerBars = document.querySelectorAll('#visualizer .bar');

  let audioContext = null;
  let analyser = null;
  let dataArray = null;

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
      const val = dataArray[index * step] || 0;
      const h = Math.max(4, Math.floor((val / 255) * 22));
      bar.style.height = `${h}px`;
      bar.style.backgroundColor = h > 16 ? 'var(--neon-yellow)' : 'var(--neon-cyan)';
    });
    requestAnimationFrame(renderVisualizer);
  }

  function simulateVisualizer() {
    setInterval(() => {
      if (bgAudio.paused) return;
      visualizerBars.forEach(bar => {
        bar.style.height = `${Math.floor(Math.random() * 18) + 4}px`;
      });
    }, 100);
  }

  function tryPlayAudio() {
    initWebAudio();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    bgAudio.play().then(() => {
      playIcon.textContent = '⏸';
    }).catch(() => {
      playIcon.textContent = '▶';
    });
  }

  tryPlayAudio();
  window.addEventListener('click', () => {
    if (bgAudio.paused) tryPlayAudio();
  }, { once: true });

  btnPlayPause.addEventListener('click', () => {
    initWebAudio();
    if (bgAudio.paused) {
      bgAudio.play();
      playIcon.textContent = '⏸';
    } else {
      bgAudio.pause();
      playIcon.textContent = '▶';
    }
  });

  btnMute.addEventListener('click', () => {
    bgAudio.muted = !bgAudio.muted;
    muteIcon.textContent = bgAudio.muted ? '🔇' : '🔊';
  });

  volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    bgAudio.volume = val / 100;
    volPercent.textContent = `${val}%`;
    muteIcon.textContent = val === '0' ? '🔇' : '🔊';
  });

  // =====================================================================
  // 2. Cyber-Grid Background Canvas
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
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speedY: -(Math.random() * 0.7 + 0.3),
      opacity: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.5 ? '#00f0ff' : '#fcee0a'
    });
  }

  let gridOffset = 0;
  function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const horizon = canvas.height * 0.68;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;

    const fovX = canvas.width * 0.5;
    for (let x = -canvas.width; x <= canvas.width * 2; x += 130) {
      ctx.beginPath();
      ctx.moveTo(fovX, horizon);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

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

  // =====================================================================
  // 3. Loading Screen Tabs & Progress
  // =====================================================================
  const loadingTabBtns = document.querySelectorAll('#view-loading .tab-btn');
  const loadingTabPanels = document.querySelectorAll('#view-loading .tab-panel');
  loadingTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      loadingTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadingTabPanels.forEach(p => {
        p.classList.toggle('active', p.id === target);
      });
    });
  });

  const progressFill = document.getElementById('progress-fill');
  const statusPercent = document.getElementById('status-percent');
  const statusPhase = document.getElementById('status-phase');
  const statusText = document.getElementById('status-text');
  const ctaContainer = document.getElementById('cta-container');
  const btnJackIn = document.getElementById('btn-jack-in');

  let loadPct = 0;
  const loadTimer = setInterval(() => {
    if (loadPct < 100) {
      loadPct += 2;
      progressFill.style.width = `${loadPct}%`;
      statusPercent.textContent = `${loadPct}%`;
      if (loadPct === 30) {
        statusPhase.textContent = '[V8_ENV]';
        statusText.textContent = 'ALLOCATING CITIZEN DATABASE & PLAYERDATA MATRICES...';
      } else if (loadPct === 60) {
        statusPhase.textContent = '[REDENGINE]';
        statusText.textContent = 'MOUNTING WEAPONS, VEHICLES & CYBERWARE ARCHIVES...';
      } else if (loadPct === 85) {
        statusPhase.textContent = '[SPATIAL]';
        statusText.textContent = 'CONNECTING 3D PROXIMITY VOIP & RADIO FREQUENCIES...';
      } else if (loadPct >= 100) {
        statusPhase.textContent = '[READY]';
        statusText.textContent = 'NEURAL LINK SYNCHRONIZED. READY TO JACK IN!';
        ctaContainer.classList.add('ready');
      }
    } else {
      clearInterval(loadTimer);
    }
  }, 100);

  function jackInAction() {
    // Fade out audio
    const fade = setInterval(() => {
      if (bgAudio.volume > 0.05) {
        bgAudio.volume = Math.max(0, bgAudio.volume - 0.05);
      } else {
        bgAudio.pause();
        clearInterval(fade);
      }
    }, 40);

    // Notify client script
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:loading:finish');
    }

    // Check if player has characters or open multicharacter
    fetchCharactersAndRender();
  }

  btnJackIn.addEventListener('click', jackInAction);

  // =====================================================================
  // 4. Multicharacter System (qb-multicharacter)
  // =====================================================================
  const charactersGrid = document.getElementById('characters-slots-grid');
  let currentCharactersList = [];

  function fetchCharactersAndRender() {
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:characters:request');
    } else {
      // Standalone browser preview: fallback mock data
      renderMulticharacterSlots([
        {
          id: 1,
          citizenid: 'NC-481924',
          charinfo: {
            firstname: 'Valerie',
            lastname: 'Street',
            lifepath: 'streetkid',
            birthdate: '2054-10-12',
            gender: 'female'
          },
          job: { label: 'Civilian', grade: { name: 'Citizen' } },
          gang: { label: 'Valentinos' },
          money: { cash: 5000, bank: 25000 }
        }
      ]);
    }
  }

  function renderMulticharacterSlots(characters = []) {
    currentCharactersList = characters;
    charactersGrid.innerHTML = '';
    showView(viewMultichar);

    const maxSlots = 4;
    for (let slot = 1; slot <= maxSlots; slot++) {
      const char = characters.find(c => c.slot === slot) || characters[slot - 1];

      const card = document.createElement('div');
      if (char) {
        card.className = 'char-card';
        card.innerHTML = `
          <div>
            <div class="char-avatar-box">👤</div>
            <div class="char-name">${char.charinfo.firstname} ${char.charinfo.lastname}</div>
            <div class="char-cid">ID: ${char.citizenid} // [${(char.charinfo.lifepath || 'Streetkid').toUpperCase()}]</div>
            <div class="char-info-list">
              <div class="char-info-row">
                <span class="char-info-label">JOB:</span>
                <span class="char-info-val text-yellow">${char.job ? char.job.label : 'Civilian'}</span>
              </div>
              <div class="char-info-row">
                <span class="char-info-label">CASH:</span>
                <span class="char-info-val text-green">$${char.money ? char.money.cash.toLocaleString() : '0'}</span>
              </div>
              <div class="char-info-row">
                <span class="char-info-label">BANK:</span>
                <span class="char-info-val text-cyan">$${char.money ? char.money.bank.toLocaleString() : '0'}</span>
              </div>
              <div class="char-info-row">
                <span class="char-info-label">DOB:</span>
                <span class="char-info-val">${char.charinfo.birthdate || '2054'}</span>
              </div>
            </div>
          </div>
          <div class="char-actions">
            <button class="char-play-btn" data-char-id="${char.citizenid}">ENTER NIGHT CITY // SPAWN</button>
            <button class="char-delete-btn" data-char-id="${char.citizenid}">DELETE IDENTITY // PURGE</button>
          </div>
        `;

        card.querySelector('.char-play-btn').addEventListener('click', () => {
          selectAndSpawnCharacter(char);
        });

        card.querySelector('.char-delete-btn').addEventListener('click', () => {
          if (confirm(`Are you sure you want to permanently delete citizen ${char.charinfo.firstname} ${char.charinfo.lastname}?`)) {
            if (window.mp && mp.events) {
              mp.events.emit('g-cyber:characters:delete', char.citizenid);
            }
            showToast('Identity Purged', 'Character data erased from Night City records.', 'error');
            setTimeout(fetchCharactersAndRender, 400);
          }
        });
      } else {
        card.className = 'char-card empty-card';
        card.innerHTML = `
          <div class="empty-icon">+</div>
          <div class="empty-title">SLOT ${slot} // NEW CITIZEN</div>
          <p style="font-size: 11px; color: var(--text-dim); margin-top: 6px;">Click to establish a new citizen identity and customize appearance.</p>
        `;
        card.addEventListener('click', () => {
          openCharacterCreator(slot);
        });
      }

      charactersGrid.appendChild(card);
    }
  }

  function selectAndSpawnCharacter(char) {
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:characters:select', char.citizenid);
    }
    showToast('Neural Connection Established', `Welcome back, ${char.charinfo.firstname}. Spawning into Night City...`, 'success');
    showView(viewHud);
    updateHUDFromCharacter(char);
  }

  // =====================================================================
  // 5. Character & Clothing Creator (qb-clothing)
  // =====================================================================
  let targetCreationSlot = 1;
  let selectedLifePath = 'streetkid';

  function openCharacterCreator(slotNum) {
    targetCreationSlot = slotNum;
    showView(viewCreator);
    resetCreatorSteps();
    updateCreatorPreview();
  }

  const creatorNavBtns = document.querySelectorAll('.creator-nav-btn');
  const creatorSteps = document.querySelectorAll('.creator-step');
  const btnCancelCreation = document.getElementById('btn-cancel-creation');
  const btnCreatorNext = document.getElementById('btn-creator-next');
  const btnSaveCharacter = document.getElementById('btn-save-character');

  let currentStepIdx = 0;
  const stepIds = ['step-identity', 'step-genetics', 'step-cyberware', 'step-clothing'];

  function setCreatorStep(idx) {
    currentStepIdx = idx;
    creatorNavBtns.forEach((b, i) => b.classList.toggle('active', i === idx));
    creatorSteps.forEach((s, i) => s.classList.toggle('active', i === idx));

    if (idx === stepIds.length - 1) {
      btnCreatorNext.style.display = 'none';
      btnSaveCharacter.style.display = 'inline-block';
    } else {
      btnCreatorNext.style.display = 'inline-block';
      btnSaveCharacter.style.display = 'none';
    }
    updateCreatorPreview();
  }

  function resetCreatorSteps() {
    setCreatorStep(0);
  }

  creatorNavBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => setCreatorStep(idx));
  });

  btnCreatorNext.addEventListener('click', () => {
    if (currentStepIdx < stepIds.length - 1) {
      setCreatorStep(currentStepIdx + 1);
    }
  });

  btnCancelCreation.addEventListener('click', () => {
    showView(viewMultichar);
  });

  // Life Path Cards
  const lifepathCards = document.querySelectorAll('.lifepath-card');
  lifepathCards.forEach(card => {
    card.addEventListener('click', () => {
      lifepathCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedLifePath = card.getAttribute('data-lifepath');
      updateCreatorPreview();
    });
  });

  // Live Range Sliders
  document.getElementById('skin-tone').addEventListener('input', (e) => {
    document.getElementById('skin-tone-val').textContent = e.target.value;
    updateCreatorPreview();
  });
  document.getElementById('skin-face').addEventListener('input', (e) => {
    document.getElementById('skin-face-val').textContent = e.target.value;
    updateCreatorPreview();
  });

  // Live Inputs
  ['char-firstname', 'char-lastname', 'char-gender', 'skin-model', 'skin-eyes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateCreatorPreview);
    if (el) el.addEventListener('input', updateCreatorPreview);
  });

  function updateCreatorPreview() {
    const fn = document.getElementById('char-firstname').value || 'Valerie';
    const ln = document.getElementById('char-lastname').value || 'Street';
    const model = document.getElementById('skin-model').value;
    const tone = document.getElementById('skin-tone').value;
    const eyes = document.getElementById('skin-eyes').options[document.getElementById('skin-eyes').selectedIndex].text;

    document.getElementById('prev-name').textContent = `${fn} ${ln}`;
    document.getElementById('prev-lifepath').textContent = selectedLifePath.toUpperCase();
    document.getElementById('prev-genetics').textContent = `${model === 'female_v' ? 'Female V' : 'Male V'} // Tone #${tone}`;
    document.getElementById('prev-eyes').textContent = eyes;
  }

  // Save New Character Button
  btnSaveCharacter.addEventListener('click', () => {
    const newCitizenData = {
      slot: targetCreationSlot,
      charinfo: {
        firstname: document.getElementById('char-firstname').value.trim() || 'Valerie',
        lastname: document.getElementById('char-lastname').value.trim() || 'Street',
        birthdate: document.getElementById('char-birthdate').value || '2054-10-12',
        gender: document.getElementById('char-gender').value,
        lifepath: selectedLifePath,
        backstory: document.getElementById('char-backstory').value
      },
      clothing: {
        model: document.getElementById('skin-model').value,
        skinTone: document.getElementById('skin-tone').value,
        face: document.getElementById('skin-face').value,
        eyes: document.getElementById('skin-eyes').value,
        hair: document.getElementById('skin-hair').value,
        hairColor: document.getElementById('skin-haircolor').value,
        cyberware: document.getElementById('skin-cyberware').value,
        tattoos: document.getElementById('skin-tattoos').value,
        headwear: document.getElementById('clothing-head').value,
        mask: document.getElementById('clothing-mask').value,
        jacket: document.getElementById('clothing-jacket').value,
        pants: document.getElementById('clothing-pants').value
      }
    };

    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:characters:create', JSON.stringify(newCitizenData));
    }

    showToast('Identity Initialized!', `Welcome to Night City, ${newCitizenData.charinfo.firstname}. Spawning...`, 'success');
    showView(viewHud);
    updateHUDFromCharacter(newCitizenData);
  });

  // =====================================================================
  // 6. In-Game HUD Updater
  // =====================================================================
  function updateHUDFromCharacter(char) {
    if (!char) return;
    document.getElementById('hud-charname').textContent = `${char.charinfo.firstname} ${char.charinfo.lastname}`;
    document.getElementById('hud-citizenid').textContent = char.citizenid || 'NC-NEW';
    document.getElementById('hud-job').textContent = char.job ? char.job.label.toUpperCase() : 'CIVILIAN';
    if (char.money) {
      document.getElementById('hud-cash').textContent = `$${char.money.cash.toLocaleString()}`;
      document.getElementById('hud-bank').textContent = `$${char.money.bank.toLocaleString()}`;
    }
  }

  function setDialPercentage(fillId, valId, percent) {
    const fill = document.getElementById(fillId);
    const valEl = document.getElementById(valId);
    if (!fill || !valEl) return;
    const maxOffset = 150.79;
    const offset = maxOffset - (percent / 100) * maxOffset;
    fill.style.strokeDashoffset = offset;
    valEl.textContent = `${Math.round(percent)}%`;
  }

  // Simulated Voice Pulse Animation
  setInterval(() => {
    const waveEl = document.getElementById('voice-wave');
    if (waveEl) {
      waveEl.textContent = waveEl.textContent === '~~~' ? '~' : waveEl.textContent + '~';
    }
  }, 400);

  // =====================================================================
  // 7. Proximity Chat (T key)
  // =====================================================================
  const chatMessages = document.getElementById('chat-messages');
  const chatInputWrapper = document.getElementById('chat-input-wrapper');
  const chatInput = document.getElementById('chat-input');
  let isChatOpen = false;

  function openChat() {
    isChatOpen = true;
    chatInputWrapper.classList.add('active');
    chatInput.value = '';
    chatInput.focus();
    if (window.mp && mp.events) {
      mp.events.emit('chat:focus', true);
    }
  }

  function closeChat() {
    isChatOpen = false;
    chatInputWrapper.classList.remove('active');
    chatInput.blur();
    if (window.mp && mp.events) {
      mp.events.emit('chat:focus', false);
    }
  }

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = chatInput.value.trim();
      if (text.length > 0 && window.mp && mp.events) {
        mp.events.emit('chat:submit', text);
      }
      closeChat();
    } else if (e.key === 'Escape') {
      closeChat();
    }
  });

  function appendChatMessage(text, type = 'normal') {
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    while (chatMessages.children.length > 30) {
      chatMessages.removeChild(chatMessages.firstChild);
    }
  }

  // =====================================================================
  // 8. Admin Control Panel (qb-adminmenu - F10 / /admin)
  // =====================================================================
  let isAdminOpen = false;
  let selectedAdminPlayerId = null;

  function toggleAdminMenu(forceState) {
    isAdminOpen = (typeof forceState === 'boolean') ? forceState : !isAdminOpen;
    if (isAdminOpen) {
      viewAdmin.classList.add('active');
      if (window.mp && mp.events) {
        mp.events.emit('admin:focus', true);
        mp.events.emit('g-cyber:admin:requestData');
      } else {
        // Standalone preview
        renderAdminPlayersList([
          { id: 0, name: 'V (Server Host)', ping: 12, job: 'Civilian', health: 100 }
        ]);
      }
    } else {
      viewAdmin.classList.remove('active');
      if (window.mp && mp.events) {
        mp.events.emit('admin:focus', false);
      }
    }
  }

  document.getElementById('btn-close-admin').addEventListener('click', () => {
    toggleAdminMenu(false);
  });

  // Admin Navigation
  const adminNavBtns = document.querySelectorAll('.admin-nav-btn');
  const adminPanels = document.querySelectorAll('.admin-panel');
  adminNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-admin-tab');
      adminNavBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      adminPanels.forEach(p => p.classList.toggle('active', p.id === target));
    });
  });

  // Admin Players List
  const adminPlayersList = document.getElementById('admin-players-list');
  const adminSelectedActions = document.getElementById('admin-selected-player-actions');
  const adminSelectedTitle = document.getElementById('admin-selected-title');

  function renderAdminPlayersList(players = []) {
    adminPlayersList.innerHTML = '';
    document.getElementById('admin-player-count').textContent = `PLAYERS: ${players.length}`;

    players.forEach(p => {
      const item = document.createElement('div');
      item.className = 'admin-player-card';
      item.innerHTML = `
        <div>
          <strong>#${p.id} ${p.name}</strong>
          <div style="font-size: 11px; color: var(--text-dim);">${p.job || 'Civilian'} | Ping: ${p.ping || 14}ms</div>
        </div>
        <span class="badge text-cyan">SELECT</span>
      `;
      item.addEventListener('click', () => {
        document.querySelectorAll('.admin-player-card').forEach(c => c.classList.remove('selected'));
        item.classList.add('selected');
        selectedAdminPlayerId = p.id;
        adminSelectedTitle.textContent = `ACTIONS FOR PLAYER: #${p.id} ${p.name}`;
        adminSelectedActions.style.display = 'block';
      });
      adminPlayersList.appendChild(item);
    });
  }

  // Admin Player Action Buttons
  function triggerAdminAction(action) {
    if (selectedAdminPlayerId === null) return;
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:admin:playerAction', action, selectedAdminPlayerId);
    }
    showToast('Admin Action Executed', `Executed ${action} on player #${selectedAdminPlayerId}`, 'success');
  }

  document.getElementById('btn-adm-tp').addEventListener('click', () => triggerAdminAction('teleport'));
  document.getElementById('btn-adm-bring').addEventListener('click', () => triggerAdminAction('bring'));
  document.getElementById('btn-adm-freeze').addEventListener('click', () => triggerAdminAction('freeze'));
  document.getElementById('btn-adm-revive').addEventListener('click', () => triggerAdminAction('revive'));
  document.getElementById('btn-adm-heal').addEventListener('click', () => triggerAdminAction('heal'));
  document.getElementById('btn-adm-givemoney').addEventListener('click', () => triggerAdminAction('givemoney'));
  document.getElementById('btn-adm-setjob').addEventListener('click', () => triggerAdminAction('setjob'));
  document.getElementById('btn-adm-kick').addEventListener('click', () => triggerAdminAction('kick'));

  // Admin Self Toggles (Godmode, Noclip, etc.)
  document.getElementById('chk-godmode').addEventListener('change', (e) => {
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:admin:toggleSelf', 'godmode', e.target.checked);
    }
    showToast('Godmode', e.target.checked ? 'Invincibility enabled.' : 'Invincibility disabled.', 'info');
  });

  document.getElementById('chk-noclip').addEventListener('change', (e) => {
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:admin:toggleSelf', 'noclip', e.target.checked);
    }
    showToast('Noclip Flight', e.target.checked ? 'Noclip active. Use WASD + Space/Shift to fly.' : 'Noclip disabled.', 'info');
  });

  document.getElementById('btn-self-heal').addEventListener('click', () => {
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:admin:selfAction', 'heal');
    }
    setDialPercentage('ring-health-fill', 'health-val', 100);
    setDialPercentage('ring-armor-fill', 'armor-val', 100);
    showToast('Self Restored', 'Health and cyberware armor maxed.', 'success');
  });

  document.getElementById('btn-self-stress').addEventListener('click', () => {
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:admin:selfAction', 'stress');
    }
    setDialPercentage('ring-stress-fill', 'stress-val', 0);
    showToast('Mind Calmed', 'Cyberpsychosis indicators reset to 0.', 'success');
  });

  // Quick District Teleports
  document.querySelectorAll('.adm-tp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const loc = btn.getAttribute('data-tp');
      if (window.mp && mp.events) {
        mp.events.emit('g-cyber:admin:teleportDistrict', loc);
      }
      showToast('Teleporting', `Neural relocation to ${btn.textContent.trim()}...`, 'info');
    });
  });

  // Vehicle Spawner
  document.querySelectorAll('.veh-spawn-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const model = btn.getAttribute('data-spawn');
      if (window.mp && mp.events) {
        mp.events.emit('g-cyber:admin:spawnVehicle', model);
      }
      showToast('Vehicle Requested', `Spawning ${model}...`, 'success');
    });
  });

  document.getElementById('btn-veh-repair').addEventListener('click', () => {
    if (window.mp && mp.events) mp.events.emit('g-cyber:admin:vehAction', 'repair');
    showToast('Vehicle Repaired', 'Chassis and engine restored to 100%.', 'success');
  });
  document.getElementById('btn-veh-flip').addEventListener('click', () => {
    if (window.mp && mp.events) mp.events.emit('g-cyber:admin:vehAction', 'flip');
    showToast('Vehicle Flipped', 'Vehicle re-oriented upright.', 'info');
  });
  document.getElementById('btn-veh-delete').addEventListener('click', () => {
    if (window.mp && mp.events) mp.events.emit('g-cyber:admin:vehAction', 'delete');
    showToast('Vehicle Removed', 'Entity despawned.', 'warning');
  });

  // Weather & Time
  document.querySelectorAll('.weather-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const w = btn.getAttribute('data-weather');
      if (window.mp && mp.events) mp.events.emit('g-cyber:admin:setWeather', w);
      showToast('Weather Synchronized', `Atmosphere shifted to ${w}.`, 'info');
    });
  });

  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = parseInt(btn.getAttribute('data-time'));
      if (window.mp && mp.events) mp.events.emit('g-cyber:admin:setTime', t);
      showToast('Clock Shifted', `Server time adjusted to ${t}:00.`, 'info');
    });
  });

  // Server Announcement
  document.getElementById('btn-adm-send-announce').addEventListener('click', () => {
    const text = document.getElementById('admin-announce-input').value.trim();
    if (text.length > 0) {
      if (window.mp && mp.events) {
        mp.events.emit('g-cyber:admin:broadcast', text);
      }
      broadcastBanner(text);
      document.getElementById('admin-announce-input').value = '';
    }
  });

  // Dev Tools: Copy Coordinates
  document.getElementById('btn-copy-coords').addEventListener('click', () => {
    const text = document.getElementById('admin-coords-display').textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
      showToast('Coordinates Copied', 'Vector4 copied to clipboard!', 'success');
    });
  });

  // Global Keybinds
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F10' || e.key === 'Insert') {
      e.preventDefault();
      toggleAdminMenu();
    } else if (e.key === 't' || e.key === 'T') {
      if (!isChatOpen && !isAdminOpen && !viewCreator.classList.contains('active')) {
        e.preventDefault();
        openChat();
      }
    } else if (e.key === 'Escape') {
      if (isAdminOpen) {
        toggleAdminMenu(false);
      } else if (isChatOpen) {
        closeChat();
      }
    }
  });

  // =====================================================================
  // 9. CyberMP Native Event Receivers
  // =====================================================================
  if (window.mp && mp.events) {
    mp.events.on('g-cyber:ui:showLoading', () => showView(viewLoading));
    mp.events.on('g-cyber:ui:showMulticharacter', (charsJson) => {
      try {
        const chars = JSON.parse(charsJson);
        renderMulticharacterSlots(chars);
      } catch (e) {
        renderMulticharacterSlots([]);
      }
    });
    mp.events.on('g-cyber:ui:showCreator', (slot) => openCharacterCreator(slot || 1));
    mp.events.on('g-cyber:ui:showHUD', () => showView(viewHud));
    mp.events.on('g-cyber:ui:toggleAdmin', (forceState) => toggleAdminMenu(forceState));

    mp.events.on('g-cyber:hud:sync', (data) => {
      if (data.cash !== undefined) document.getElementById('hud-cash').textContent = `$${data.cash.toLocaleString()}`;
      if (data.bank !== undefined) document.getElementById('hud-bank').textContent = `$${data.bank.toLocaleString()}`;
      if (data.crypto !== undefined) document.getElementById('hud-crypto').textContent = `${data.crypto} ⟠`;
      if (data.health !== undefined) setDialPercentage('ring-health-fill', 'health-val', data.health);
      if (data.armor !== undefined) setDialPercentage('ring-armor-fill', 'armor-val', data.armor);
      if (data.hunger !== undefined) setDialPercentage('ring-hunger-fill', 'hunger-val', data.hunger);
      if (data.thirst !== undefined) setDialPercentage('ring-thirst-fill', 'thirst-val', data.thirst);
      if (data.stress !== undefined) setDialPercentage('ring-stress-fill', 'stress-val', data.stress);
      if (data.job) document.getElementById('hud-job').textContent = data.job.label.toUpperCase();
      if (data.location) document.getElementById('hud-location').textContent = data.location.toUpperCase();
    });

    mp.events.on('g-cyber:hud:vehicle', (vehData) => {
      const vehHud = document.getElementById('vehicle-hud');
      if (vehData.inVehicle) {
        vehHud.style.display = 'flex';
        document.getElementById('veh-speed').textContent = Math.round(vehData.speed || 0);
        document.getElementById('veh-gear').textContent = vehData.gear || '1';
        document.getElementById('veh-rpm-fill').style.width = `${Math.min(100, vehData.rpm || 20)}%`;
        document.getElementById('veh-seatbelt').textContent = vehData.seatbelt ? 'SEATBELT [BUCKLED]' : 'SEATBELT [B]';
        document.getElementById('veh-seatbelt').style.color = vehData.seatbelt ? 'var(--neon-green)' : 'var(--neon-pink)';
      } else {
        vehHud.style.display = 'none';
      }
    });

    mp.events.on('g-cyber:hud:notify', (title, message, type) => showToast(title, message, type));
    mp.events.on('g-cyber:admin:broadcast', (text) => broadcastBanner(text));
    mp.events.on('g-cyber:admin:updatePlayers', (playersJson) => {
      try {
        renderAdminPlayersList(JSON.parse(playersJson));
      } catch (e) {}
    });
    mp.events.on('g-cyber:admin:updateCoords', (coordsStr) => {
      document.getElementById('admin-coords-display').textContent = coordsStr;
    });

    mp.events.on('chat:open', () => openChat());
    mp.events.on('chat:addMessage', (text, type) => appendChatMessage(text, type));
  }
});
