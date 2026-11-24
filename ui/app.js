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
  const fullscreenBackdrop = document.getElementById('fullscreen-backdrop');

  // Request CEF input focus immediately so mouse cursor and keyboard work
  if (window.mp && mp.events) {
    mp.events.emit('domReady', 'master-ui');
    mp.events.emit('g-cyber:ui:setFocus', true);
  }

  // Layers Array
  const allViews = [viewLoading, viewMultichar, viewCreator, viewHud, viewAdmin];

  function showView(targetView) {
    allViews.forEach(v => {
      if (v) v.classList.remove('active');
    });
    if (targetView) {
      targetView.classList.add('active');
    }
    if (fullscreenBackdrop) {
      if (targetView === viewLoading || targetView === viewMultichar) {
        fullscreenBackdrop.classList.add('active');
      } else {
        fullscreenBackdrop.classList.remove('active');
      }
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

  const btnSkipLoading = document.getElementById('btn-skip-loading');
  const btnQuickEnter = document.getElementById('btn-quick-enter');
  const btnMulticharSkip = document.getElementById('btn-multichar-skip');

  function skipLoadingAndPlay() {
    if (bgAudio) {
      bgAudio.pause();
    }
    showView(viewHud);
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:loading:close');
      mp.events.emit('g-cyber:ui:setFocus', false);
    }
    showToast('Night City Connected', 'Welcome to Night City citizen. Neural connection established.', 'success');
  }

  if (btnSkipLoading) btnSkipLoading.addEventListener('click', skipLoadingAndPlay);
  if (btnQuickEnter) btnQuickEnter.addEventListener('click', skipLoadingAndPlay);
  if (btnMulticharSkip) btnMulticharSkip.addEventListener('click', skipLoadingAndPlay);

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

    // Transition immediately to multicharacter view
    showView(viewMultichar);

    // Notify client script
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:loading:finish');
      mp.events.emit('g-cyber:ui:setFocus', true);
    }

    // Check if player has characters or open multicharacter
    fetchCharactersAndRender();
  }

  btnJackIn.addEventListener('click', jackInAction);

  // =====================================================================
  // 4. Multicharacter System
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
          showDeleteConfirmModal(char);
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
      mp.events.emit('g-cyber:ui:setFocus', false);
    }
    showToast('Neural Connection Established', `Welcome back, ${char.charinfo.firstname}. Spawning into Night City...`, 'success');
    showView(viewHud);
    updateHUDFromCharacter(char);
  }

  // In-Game Identity Deletion Modal Handlers
  let pendingDeleteCitizen = null;

  function showDeleteConfirmModal(char) {
    pendingDeleteCitizen = char;
    const modal = document.getElementById('modal-delete-confirm');
    if (modal) {
      const nameEl = document.getElementById('modal-delete-char-name');
      const idEl = document.getElementById('modal-delete-char-id');
      if (nameEl) nameEl.textContent = `${char.charinfo.firstname} ${char.charinfo.lastname}`;
      if (idEl) idEl.textContent = char.citizenid;
      modal.style.display = 'flex';
    }
  }

  function hideDeleteConfirmModal() {
    pendingDeleteCitizen = null;
    const modal = document.getElementById('modal-delete-confirm');
    if (modal) modal.style.display = 'none';
  }

  const btnModalCancelDelete = document.getElementById('btn-modal-cancel-delete');
  if (btnModalCancelDelete) {
    btnModalCancelDelete.addEventListener('click', hideDeleteConfirmModal);
  }

  const btnModalConfirmDelete = document.getElementById('btn-modal-confirm-delete');
  if (btnModalConfirmDelete) {
    btnModalConfirmDelete.addEventListener('click', () => {
      if (pendingDeleteCitizen) {
        const citizenid = pendingDeleteCitizen.citizenid;
        if (window.mp && mp.events) {
          mp.events.emit('g-cyber:characters:delete', citizenid);
        }
        showToast('Identity Purged', `Citizen record ${citizenid} erased from Night City.`, 'error');
        hideDeleteConfirmModal();
        setTimeout(fetchCharactersAndRender, 400);
      }
    });
  }

  // =====================================================================
  // 5. Character & Clothing Creator
  // =====================================================================
  let targetCreationSlot = 1;
  let selectedLifePath = 'streetkid';

  // Floating Sidebar Toggle
  const btnToggleCreatorSidebar = document.getElementById('btn-toggle-creator-sidebar');
  const creatorFormPanel = document.getElementById('creator-form-panel');
  let isCreatorSidebarCollapsed = false;

  function toggleCreatorSidebar(forceState) {
    if (!creatorFormPanel || !btnToggleCreatorSidebar) return;
    isCreatorSidebarCollapsed = (forceState !== undefined) ? Boolean(forceState) : !isCreatorSidebarCollapsed;
    creatorFormPanel.classList.toggle('collapsed', isCreatorSidebarCollapsed);
    btnToggleCreatorSidebar.classList.toggle('panel-hidden', isCreatorSidebarCollapsed);

    const icon = btnToggleCreatorSidebar.querySelector('.toggle-icon');
    const label = btnToggleCreatorSidebar.querySelector('.toggle-label');

    if (isCreatorSidebarCollapsed) {
      if (icon) icon.textContent = '▶';
      if (label) label.textContent = 'SHOW SERVER PANEL';
      showToast('Panel Minimized', 'Server panel collapsed. Enjoy full-screen 3D customization!', 'info');
      if (window.mp && mp.events) mp.events.emit('g-cyber:creator:focusNative', true);
    } else {
      if (icon) icon.textContent = '◀';
      if (label) label.textContent = 'HIDE SERVER PANEL';
      if (window.mp && mp.events) mp.events.emit('g-cyber:creator:focusNative', false);
    }
  }

  if (btnToggleCreatorSidebar) {
    btnToggleCreatorSidebar.addEventListener('click', () => toggleCreatorSidebar());
  }

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
    toggleCreatorSidebar(false);
    setCreatorStep(0);
  }

  creatorNavBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      // If navigating directly to Genetics/Appearance (step 1) from identity, validate name and launch native creator
      if (idx === 1 && currentStepIdx === 0) {
        const firstName = (document.getElementById('char-firstname').value || '').trim();
        const lastName = (document.getElementById('char-lastname').value || '').trim();
        if (!firstName || !lastName) {
          showToast('Incomplete Identity', 'Please enter a valid First and Last Name before customizing appearance.', 'warning');
          return;
        }
        if (window.mp && mp.events) {
          mp.events.emit('g-cyber:creator:openNativeCreator', 'MenuScenario_CharacterCustomization');
        }
        showToast('3D Character Studio', 'Cyberpunk 2077 Character Creator opened! Use the top toggle button to show/hide this panel anytime.', 'success');
      }
      setCreatorStep(idx);
    });
  });

  btnCreatorNext.addEventListener('click', () => {
    // When finishing Step 0 (Identity), validate name & automatically open MenuScenario_CharacterCustomization
    if (currentStepIdx === 0) {
      const firstName = (document.getElementById('char-firstname').value || '').trim();
      const lastName = (document.getElementById('char-lastname').value || '').trim();
      if (!firstName || !lastName) {
        showToast('Incomplete Identity', 'Please enter a valid First and Last Name before proceeding.', 'warning');
        return;
      }
      // Move to Genetics / Appearance
      setCreatorStep(1);
      // Automatically trigger Cyberpunk 2077 original character creator scenario!
      if (window.mp && mp.events) {
        mp.events.emit('g-cyber:creator:openNativeCreator', 'MenuScenario_CharacterCustomization');
      }
      showToast('3D Character Studio', 'Cyberpunk 2077 Character Creator opened! Use the top button to toggle server panel.', 'success');
      return;
    }

    if (currentStepIdx < stepIds.length - 1) {
      setCreatorStep(currentStepIdx + 1);
    }
  });

  btnCancelCreation.addEventListener('click', () => {
    toggleCreatorSidebar(false);
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
    emitCreatorPreview();
  });
  document.getElementById('skin-face').addEventListener('input', (e) => {
    document.getElementById('skin-face-val').textContent = e.target.value;
    updateCreatorPreview();
    emitCreatorPreview();
  });

  // Live Inputs & Clothing Change Listeners
  ['char-firstname', 'char-lastname', 'char-gender', 'skin-model', 'skin-eyes', 'skin-hair', 'skin-haircolor', 'skin-cyberware', 'skin-tattoos', 'clothing-head', 'clothing-mask', 'clothing-jacket', 'clothing-pants'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        updateCreatorPreview();
        emitCreatorPreview();
      });
      el.addEventListener('input', () => {
        updateCreatorPreview();
      });
    }
  });

  // Native Original Character Creator Button
  const btnOpenOriginalCreator = document.getElementById('btn-open-original-creator');
  if (btnOpenOriginalCreator) {
    btnOpenOriginalCreator.addEventListener('click', () => {
      if (window.mp && mp.events) {
        mp.events.emit('g-cyber:creator:openNativeCreator', 'MenuScenario_CharacterCustomization');
      }
      showToast('3D Character Customizer', 'Launching Cyberpunk 2077 original character creator...', 'success');
    });
  }

  // Native Mirror Button
  const btnOpenNativeMirror = document.getElementById('btn-open-native-mirror');
  if (btnOpenNativeMirror) {
    btnOpenNativeMirror.addEventListener('click', () => {
      if (window.mp && mp.events) {
        mp.events.emit('g-cyber:creator:openNativeMirror');
      }
      showToast('Native Mirror Studio', 'Connecting to REDengine biometric mirror...', 'info');
    });
  }

  // 3D Character Rotation Controls
  let currentYaw = 90.0;
  const btnRotLeft = document.getElementById('btn-rotate-left');
  const btnRotRight = document.getElementById('btn-rotate-right');
  const btnRotFront = document.getElementById('btn-rotate-front');

  if (btnRotLeft) {
    btnRotLeft.addEventListener('click', () => {
      currentYaw = (currentYaw + 30) % 360;
      if (window.mp && mp.events) mp.events.emit('g-cyber:creator:rotateCharacter', currentYaw);
    });
  }
  if (btnRotRight) {
    btnRotRight.addEventListener('click', () => {
      currentYaw = (currentYaw - 30 + 360) % 360;
      if (window.mp && mp.events) mp.events.emit('g-cyber:creator:rotateCharacter', currentYaw);
    });
  }
  if (btnRotFront) {
    btnRotFront.addEventListener('click', () => {
      currentYaw = 90.0;
      if (window.mp && mp.events) mp.events.emit('g-cyber:creator:rotateCharacter', currentYaw);
    });
  }

  // Preset Outfits
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = btn.getAttribute('data-preset');
      if (preset === 'streetwear') {
        document.getElementById('clothing-jacket').value = 'samurai_leather';
        document.getElementById('clothing-pants').value = 'reinforced_jeans';
        document.getElementById('clothing-head').value = 'tactical_cap';
        document.getElementById('clothing-mask').value = 'none';
      } else if (preset === 'corpo') {
        document.getElementById('clothing-jacket').value = 'corpo_trench';
        document.getElementById('clothing-pants').value = 'corpo_slacks';
        document.getElementById('clothing-head').value = 'tech_aviator';
        document.getElementById('clothing-mask').value = 'none';
      } else if (preset === 'nomad') {
        document.getElementById('clothing-jacket').value = 'nomad_denim';
        document.getElementById('clothing-pants').value = 'reinforced_jeans';
        document.getElementById('clothing-head').value = 'none';
        document.getElementById('clothing-mask').value = 'none';
      } else if (preset === 'netrunner') {
        document.getElementById('clothing-jacket').value = 'tactical_vest';
        document.getElementById('clothing-pants').value = 'tactical_cargo';
        document.getElementById('clothing-head').value = 'neural_visor';
        document.getElementById('clothing-mask').value = 'oni_respirator';
      }
      updateCreatorPreview();
      emitCreatorPreview();
    });
  });

  function emitCreatorPreview() {
    const previewData = {
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
    };
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:creator:previewChange', JSON.stringify(previewData));
    }
  }

  function updateCreatorPreview() {
    const fn = document.getElementById('char-firstname').value || 'Valerie';
    const ln = document.getElementById('char-lastname').value || 'Street';
    const model = document.getElementById('skin-model').value;
    const tone = document.getElementById('skin-tone').value;
    const eyes = document.getElementById('skin-eyes').options[document.getElementById('skin-eyes').selectedIndex].text;

    const elPrevName = document.getElementById('prev-name');
    if (elPrevName) elPrevName.textContent = `${fn} ${ln}`;
    const elPrevLp = document.getElementById('prev-lifepath');
    if (elPrevLp) elPrevLp.textContent = selectedLifePath.toUpperCase();
    const elPrevGen = document.getElementById('prev-genetics');
    if (elPrevGen) elPrevGen.textContent = `${model === 'female_v' ? 'Female V' : 'Male V'} // Tone #${tone}`;
    const elPrevEyes = document.getElementById('prev-eyes');
    if (elPrevEyes) elPrevEyes.textContent = eyes;

    // Viewport floating indicators
    const elPillName = document.getElementById('prev-name-pill');
    if (elPillName) elPillName.textContent = `${fn} ${ln}`;
    const elPillLp = document.getElementById('prev-lifepath-pill');
    if (elPillLp) elPillLp.textContent = selectedLifePath.toUpperCase();
    const elPillModel = document.getElementById('prev-model-pill');
    if (elPillModel) elPillModel.textContent = model === 'female_v' ? 'Female V' : 'Male V';
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
      mp.events.emit('g-cyber:ui:setFocus', false);
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
  let isAdminOpen = false;
  let isInventoryOpen = false;
  let lastEscapeHandledAt = 0;

  function isTypingInField(e) {
    const tag = e && e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function closeChat(silentClient) {
    isChatOpen = false;
    if (chatInputWrapper) chatInputWrapper.classList.remove('active');
    if (chatInput) chatInput.blur();
    if (!silentClient && window.mp && mp.events) {
      mp.events.emit('chat:focus', false);
      mp.events.emit('chatClose');
    }
  }

  function openChat() {
    if (isAdminOpen || isInventoryOpen) return;
    isChatOpen = true;
    chatInputWrapper.classList.add('active');
    chatInput.value = '';
    chatInput.focus();
    if (window.mp && mp.events) {
      mp.events.emit('chat:focus', true);
    }
  }

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = chatInput.value.trim();
      if (text.length > 0 && window.mp && mp.events) {
        mp.events.emit('chat:submit', text);
        mp.events.emit('chatSubmit', text);
      }
      closeChat();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      lastEscapeHandledAt = Date.now();
      closeChat();
      if (window.mp && mp.events) {
        mp.events.emit('g-cyber:ui:escapeHandled');
      }
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
  // 8. Admin Control Panel (F10 / /admin)
  // =====================================================================
  let selectedAdminPlayerId = null;

  function toggleAdminMenu(forceState, fromClient) {
    const nextState = (typeof forceState === 'boolean') ? forceState : !isAdminOpen;
    if (isAdminOpen === nextState && viewAdmin.classList.contains('active') === nextState) {
      return;
    }
    isAdminOpen = nextState;
    if (isAdminOpen) {
      // Mutual exclusion: close inventory & chat cleanly before showing admin panel
      if (isInventoryOpen) {
        closeInventory(true);
      }
      if (isChatOpen) {
        closeChat(true);
      }
      viewAdmin.classList.add('active');
      if (window.mp && mp.events) {
        if (!fromClient) mp.events.emit('admin:focus', true);
        mp.events.emit('g-cyber:admin:requestData');
      } else {
        // Standalone preview
        renderAdminPlayersList([
          { id: 0, name: 'V (Server Host)', ping: 12, job: 'Civilian', health: 100 }
        ]);
      }
    } else {
      viewAdmin.classList.remove('active');
      if (!fromClient && window.mp && mp.events) {
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
    showToast('Noclip Flight', e.target.checked ? 'Noclip active (Immortal). WASD: Fly | Space: Up | Q / Ctrl / C: Down | Shift: Fast.' : 'Noclip disabled.', 'info');
  });

  document.getElementById('btn-self-heal').addEventListener('click', () => {
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:admin:selfAction', 'heal');
    }
    setDialPercentage('ring-health-fill', 'health-val', 100);
    setDialPercentage('ring-armor-fill', 'armor-val', 100);
    showToast('Self Restored', 'Health and cyberware armor maxed (100%).', 'success');
  });

  document.getElementById('btn-self-revive')?.addEventListener('click', () => {
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:admin:selfAction', 'revive');
    }
    setDialPercentage('ring-health-fill', 'health-val', 100);
    setDialPercentage('ring-armor-fill', 'armor-val', 100);
    showToast('Self Revived', 'Trauma Team resurrected player puppet.', 'success');
  });

  document.getElementById('btn-self-stress').addEventListener('click', () => {
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:admin:selfAction', 'stress');
    }
    setDialPercentage('ring-stress-fill', 'stress-val', 0);
    showToast('Mind Calmed', 'Cyberpsychosis indicators reset to 0.', 'success');
  });

  document.getElementById('btn-self-tpm')?.addEventListener('click', () => {
    if (window.mp && mp.events) {
      mp.events.emit('g-cyber:admin:teleportToMarker');
    }
    showToast('Waypoint Teleport', 'Requesting jump to map waypoint...', 'info');
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

  // =====================================================================
  // 8B. Neural Inventory Matrix Controller (Tab / I / /inv)
  // =====================================================================
  const viewInventory = document.getElementById('view-inventory');
  const btnCloseInv = document.getElementById('btn-close-inv');
  const invClockEl = document.getElementById('inv-clock');

  const invPlayerNameEl = document.getElementById('player-name');
  const invPlayerIdEl = document.getElementById('player-id');
  const invPlayerWeightTxt = document.getElementById('player-weight-txt');
  const invPlayerWeightFill = document.getElementById('player-weight-fill');
  const invPlayerHotbarGrid = document.getElementById('player-hotbar-grid');
  const invPlayerSlotsGrid = document.getElementById('player-slots-grid');

  const invContainerNameEl = document.getElementById('container-name');
  const invContainerIdEl = document.getElementById('container-id');
  const invContainerWeightTxt = document.getElementById('container-weight-txt');
  const invContainerWeightFill = document.getElementById('container-weight-fill');
  const invContainerSlotsGrid = document.getElementById('container-slots-grid');
  const invContainerStandby = document.getElementById('container-standby');

  const invItemModal = document.getElementById('item-modal');
  const invModalCloseBtn = document.getElementById('modal-close-btn');
  const invModalTitle = document.getElementById('modal-title');
  const invModalCategory = document.getElementById('modal-category');
  const invModalDesc = document.getElementById('modal-desc');
  const invModalWeight = document.getElementById('modal-weight');
  const invModalCount = document.getElementById('modal-count');
  const invModalIcon = document.getElementById('modal-icon');
  const invSplitWrap = document.getElementById('split-wrap');
  const invSplitSlider = document.getElementById('split-slider');
  const invSplitValTxt = document.getElementById('split-val-txt');
  const invBtnModalUse = document.getElementById('btn-modal-use');
  const invBtnModalTransfer = document.getElementById('btn-modal-transfer');
  const invBtnModalSplit = document.getElementById('btn-modal-split');
  const invBtnModalDrop = document.getElementById('btn-modal-drop');
  const invBtnHolster = document.getElementById('btn-inv-holster');
  const invFilterTabs = document.getElementById('inv-filter-tabs');
  const invSearchInput = document.getElementById('inv-search-input');

  let invPlayerData = null;
  let invContainerData = null;
  let invItemDefinitions = Object.assign({}, window.GCYBER_ITEM_CATALOG || {});
  let invSelectedSlotData = null;
  let invAudioCtx = null;
  let invFilterCat = 'all';
  let invSearchQuery = '';
  let invEquippedItemId = null;

  const INV_CATEGORY_GROUPS = {
    all: null,
    weapon: new Set(['weapon', 'grenade', 'mod']),
    ammo: new Set(['ammo']),
    medicine: new Set(['medicine', 'booster']),
    food: new Set(['food', 'drink', 'alcohol']),
    gear: new Set(['clothing', 'cyberware', 'identity', 'tool', 'currency', 'misc'])
  };

  function formatItemWeight(weightNum) {
    const val = Number(weightNum) || 0;
    if (val > 0 && val < 0.1) return val.toFixed(2);
    return val.toFixed(1);
  }

  const invIconDataCache = Object.create(null);

  function resolveItemIconFile(def) {
    if (!def || !def.image) return '';
    return String(def.image).split('/').pop().split('?')[0];
  }

  function resolveItemIconSrc(def) {
    const fileName = resolveItemIconFile(def);
    if (!fileName) return '';
    if (invIconDataCache[fileName]) return invIconDataCache[fileName];
    return `http://127.0.0.1:2078/inv-items/${encodeURIComponent(fileName)}`;
  }

  function createItemArtElement(def) {
    const fileName = resolveItemIconFile(def);
    const src = resolveItemIconSrc(def);
    if (src) {
      const img = document.createElement('img');
      img.className = 'slot-img';
      img.dataset.iconFile = fileName;
      img.src = src;
      img.alt = (def && def.label) || 'Item';
      img.draggable = false;
      img.onerror = () => {
        const cached = invIconDataCache[fileName];
        if (cached && img.src !== cached) {
          img.src = cached;
          return;
        }
        const fallback = document.createElement('span');
        fallback.className = 'slot-icon';
        if (fileName) fallback.dataset.iconPending = fileName;
        fallback.textContent = (def && def.icon) ? def.icon : '📦';
        if (img.parentNode) img.parentNode.replaceChild(fallback, img);
      };
      return img;
    }
    const span = document.createElement('span');
    span.className = 'slot-icon';
    span.textContent = (def && def.icon) ? def.icon : '📦';
    return span;
  }

  function doesItemMatchFilter(def, item) {
    if (!item || !item.id) return true;
    const allowedCats = INV_CATEGORY_GROUPS[invFilterCat];
    const cat = ((def && def.category) || 'misc').toLowerCase();
    if (allowedCats && !allowedCats.has(cat)) return false;
    if (invSearchQuery && invSearchQuery.length > 0) {
      const haystack = `${(def && def.label) || ''} ${item.id} ${cat}`.toLowerCase();
      if (!haystack.includes(invSearchQuery)) return false;
    }
    return true;
  }

  function findTransferTargetSlot(targetItems, item, def) {
    if (!Array.isArray(targetItems)) return -1;
    if (def && def.stackable) {
      const maxStack = def.maxStack || 100;
      for (let i = 0; i < targetItems.length; i++) {
        const existing = targetItems[i];
        if (existing && existing.id === item.id && (existing.amount || 1) < maxStack) {
          return i;
        }
      }
    }
    for (let i = 0; i < targetItems.length; i++) {
      if (!targetItems[i]) return i;
    }
    return -1;
  }

  function transferItemAcrossContainers(fromType, fromSlot, item, def, amount) {
    if (!invPlayerData || !invContainerData || !invContainerData.items) return false;
    const toType = fromType === 'player' ? 'container' : 'player';
    const targetItems = toType === 'container' ? invContainerData.items : invPlayerData.items;
    const toSlot = findTransferTargetSlot(targetItems, item, def);
    if (toSlot === -1) return false;

    playCyberSound('drop');
    if (window.mp && mp.events) {
      mp.events.emit('gcyber:inventory:cefMoveItem', JSON.stringify({
        fromType,
        fromSlot,
        toType,
        toSlot,
        containerId: invContainerData.id,
        amount: amount || null
      }));
    }
    return true;
  }

  // Custom Pointer Drag State (works reliably in CyberMP OSR CEF)
  let pointerDragState = null; // { fromType, fromSlot, item, def, startX, startY, active, wasDragged, ghostEl, lastHoverEl }
  let lastDragEndedAt = 0;

  setInterval(() => {
    if (invClockEl) {
      const now = new Date();
      invClockEl.textContent = now.toTimeString().substring(0, 5);
    }
  }, 1000);

  function playCyberSound(type) {
    try {
      if (!invAudioCtx) {
        invAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (invAudioCtx.state === 'suspended') {
        invAudioCtx.resume();
      }
      const osc = invAudioCtx.createOscillator();
      const gain = invAudioCtx.createGain();
      osc.connect(gain);
      gain.connect(invAudioCtx.destination);

      const now = invAudioCtx.currentTime;
      if (type === 'click') {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'drop') {
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'use') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {}
  }

  function cleanupPointerDrag() {
    if (!pointerDragState) return;
    if (pointerDragState.ghostEl && pointerDragState.ghostEl.parentNode) {
      pointerDragState.ghostEl.parentNode.removeChild(pointerDragState.ghostEl);
    }
    if (pointerDragState.lastHoverEl) {
      pointerDragState.lastHoverEl.classList.remove('drag-over');
    }
    if (pointerDragState.sourceEl) {
      pointerDragState.sourceEl.style.opacity = '1';
    }
    pointerDragState = null;
  }

  function closeInvItemModal() {
    invSelectedSlotData = null;
    if (invItemModal) invItemModal.classList.add('hidden');
  }

  function closeInventory(silentClient) {
    cleanupPointerDrag();
    closeInvItemModal();
    if (isInventoryOpen) playCyberSound('click');
    isInventoryOpen = false;
    if (viewInventory) {
      viewInventory.classList.add('hidden');
      viewInventory.classList.remove('active');
    }
    if (!silentClient && window.mp && mp.events) {
      mp.events.emit('gcyber:inventory:cefCloseWindow');
    }
  }

  if (btnCloseInv) {
    btnCloseInv.addEventListener('click', () => closeInventory(false));
  }

  // Click backdrop outside modal card to close modal cleanly
  if (invItemModal) {
    invItemModal.addEventListener('click', (e) => {
      if (e.target === invItemModal) {
        closeInvItemModal();
      }
    });
  }

  if (invModalCloseBtn) {
    invModalCloseBtn.addEventListener('click', () => closeInvItemModal());
  }

  if (invSplitSlider && invSplitValTxt) {
    invSplitSlider.addEventListener('input', () => {
      invSplitValTxt.textContent = invSplitSlider.value;
    });
  }

  if (invBtnModalUse) {
    invBtnModalUse.addEventListener('click', () => {
      if (!invSelectedSlotData) return;
      playCyberSound('use');
      if (window.mp && mp.events) {
        mp.events.emit('gcyber:inventory:cefUseItem', invSelectedSlotData.slotIdx);
      }
      closeInvItemModal();
    });
  }

  if (invBtnModalDrop) {
    invBtnModalDrop.addEventListener('click', () => {
      if (!invSelectedSlotData) return;
      playCyberSound('drop');
      const amount = (invSplitWrap && invSplitWrap.classList.contains('hidden'))
        ? invSelectedSlotData.item.amount
        : parseInt(invSplitSlider.value, 10);
      if (window.mp && mp.events) {
        mp.events.emit('gcyber:inventory:cefDropItem', JSON.stringify({
          slot: invSelectedSlotData.slotIdx,
          amount: amount
        }));
      }
      closeInvItemModal();
    });
  }

  if (invBtnModalSplit) {
    invBtnModalSplit.addEventListener('click', () => {
      if (!invSelectedSlotData || !invPlayerData) return;
      playCyberSound('click');
      const splitCount = parseInt(invSplitSlider.value, 10);
      const sourceArr = (invSelectedSlotData.type === 'container' && invContainerData)
        ? invContainerData.items
        : invPlayerData.items;
      let emptySlot = -1;
      for (let i = 0; i < sourceArr.length; i++) {
        if (!sourceArr[i]) {
          emptySlot = i;
          break;
        }
      }
      if (emptySlot !== -1 && window.mp && mp.events) {
        mp.events.emit('gcyber:inventory:cefMoveItem', JSON.stringify({
          fromType: invSelectedSlotData.type,
          fromSlot: invSelectedSlotData.slotIdx,
          toType: invSelectedSlotData.type,
          toSlot: emptySlot,
          containerId: invContainerData ? invContainerData.id : null,
          amount: splitCount
        }));
      }
      closeInvItemModal();
    });
  }

  if (invBtnModalTransfer) {
    invBtnModalTransfer.addEventListener('click', () => {
      if (!invSelectedSlotData || !invContainerData || !invContainerData.items) return;
      const transferCount = (invSplitWrap && !invSplitWrap.classList.contains('hidden'))
        ? parseInt(invSplitSlider.value, 10)
        : null;
      transferItemAcrossContainers(
        invSelectedSlotData.type,
        invSelectedSlotData.slotIdx,
        invSelectedSlotData.item,
        invSelectedSlotData.def,
        transferCount
      );
      closeInvItemModal();
    });
  }

  if (invBtnHolster) {
    invBtnHolster.addEventListener('click', () => {
      playCyberSound('click');
      if (window.mp && mp.events) {
        mp.events.emit('gcyber:inventory:cefHolster');
      }
    });
  }

  if (invFilterTabs) {
    invFilterTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.inv-filter-btn');
      if (!btn) return;
      playCyberSound('click');
      invFilterCat = btn.dataset.cat || 'all';
      const buttons = invFilterTabs.querySelectorAll('.inv-filter-btn');
      buttons.forEach((b) => b.classList.toggle('active', b === btn));
      renderInventoryUI();
    });
  }

  if (invSearchInput) {
    invSearchInput.addEventListener('input', () => {
      invSearchQuery = (invSearchInput.value || '').trim().toLowerCase();
      renderInventoryUI();
    });
  }

  window.addEventListener('mousemove', (e) => {
    if (!pointerDragState) return;
    const dx = e.clientX - pointerDragState.startX;
    const dy = e.clientY - pointerDragState.startY;

    if (!pointerDragState.active && Math.hypot(dx, dy) > 7) {
      pointerDragState.active = true;
      pointerDragState.wasDragged = true;
      playCyberSound('click');
      if (pointerDragState.sourceEl) pointerDragState.sourceEl.style.opacity = '0.45';

      const ghost = document.createElement('div');
      ghost.className = 'inv-drag-ghost';
      ghost.appendChild(createItemArtElement(pointerDragState.def));
      const ghostName = document.createElement('span');
      ghostName.className = 'slot-name';
      ghostName.textContent = pointerDragState.def.label || pointerDragState.item.id;
      ghost.appendChild(ghostName);
      document.body.appendChild(ghost);
      pointerDragState.ghostEl = ghost;
    }

    if (pointerDragState.active && pointerDragState.ghostEl) {
      pointerDragState.ghostEl.style.left = `${e.clientX}px`;
      pointerDragState.ghostEl.style.top = `${e.clientY}px`;

      const elem = document.elementFromPoint(e.clientX, e.clientY);
      const targetSlotEl = elem ? elem.closest('.inv-slot') : null;
      if (pointerDragState.lastHoverEl && pointerDragState.lastHoverEl !== targetSlotEl) {
        pointerDragState.lastHoverEl.classList.remove('drag-over');
      }
      if (targetSlotEl) {
        targetSlotEl.classList.add('drag-over');
      }
      pointerDragState.lastHoverEl = targetSlotEl;
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (!pointerDragState) return;
    const drag = pointerDragState;
    const wasDragged = drag.active;
    cleanupPointerDrag();

    if (wasDragged) {
      lastDragEndedAt = Date.now();
      const elem = document.elementFromPoint(e.clientX, e.clientY);
      const targetSlotEl = elem ? elem.closest('.inv-slot') : null;
      if (targetSlotEl) {
        const toType = targetSlotEl.dataset.type;
        const toSlot = parseInt(targetSlotEl.dataset.slot, 10);
        if (toType && !isNaN(toSlot) && (toType !== drag.fromType || toSlot !== drag.fromSlot)) {
          playCyberSound('drop');
          if (window.mp && mp.events) {
            mp.events.emit('gcyber:inventory:cefMoveItem', JSON.stringify({
              fromType: drag.fromType,
              fromSlot: drag.fromSlot,
              toType: toType,
              toSlot: toSlot,
              containerId: invContainerData ? invContainerData.id : null,
              amount: null
            }));
          }
        }
      }
    }
  });

  window.addEventListener('blur', cleanupPointerDrag);

  function createInvSlotElement(slotIdx, item, type, isHotbar) {
    const slotEl = document.createElement('div');
    slotEl.className = 'inv-slot' + (isHotbar ? ' hotbar-slot' : '');
    slotEl.dataset.slot = slotIdx;
    slotEl.dataset.type = type;

    const numEl = document.createElement('span');
    numEl.className = 'slot-num';
    numEl.textContent = isHotbar ? `[${slotIdx + 1}]` : `#${slotIdx + 1}`;
    slotEl.appendChild(numEl);

    if (item && item.id) {
      const def = invItemDefinitions[item.id]
        || (window.GCYBER_ITEM_CATALOG && window.GCYBER_ITEM_CATALOG[item.id])
        || {
          label: item.id,
          category: 'misc',
          weight: 0.5,
          icon: '📦'
        };

      slotEl.dataset.itemId = item.id;

      if (type === 'player' && invEquippedItemId && invEquippedItemId === item.id) {
        slotEl.classList.add('slot-equipped');
        const armedBadge = document.createElement('span');
        armedBadge.className = 'slot-equipped-badge';
        armedBadge.textContent = 'ARMED';
        slotEl.appendChild(armedBadge);
      }

      if (!doesItemMatchFilter(def, item)) {
        slotEl.classList.add('slot-dimmed');
      }

      const contentEl = document.createElement('div');
      contentEl.className = 'slot-content';
      contentEl.appendChild(createItemArtElement(def));

      const nameEl = document.createElement('span');
      nameEl.className = 'slot-name';
      nameEl.textContent = def.label || item.id;
      contentEl.appendChild(nameEl);

      slotEl.appendChild(contentEl);

      const bottomEl = document.createElement('div');
      bottomEl.className = 'slot-bottom';

      const weightEl = document.createElement('span');
      const unitWeight = (def.weight !== undefined && def.weight !== null) ? def.weight : 0.5;
      const totalWeight = formatItemWeight(unitWeight * (item.amount || 1));
      weightEl.textContent = `${totalWeight}kg`;
      bottomEl.appendChild(weightEl);

      if (item.amount && item.amount > 1) {
        const amountEl = document.createElement('span');
        amountEl.className = 'slot-amount';
        amountEl.textContent = `x${item.amount}`;
        bottomEl.appendChild(amountEl);
      }

      slotEl.appendChild(bottomEl);

      slotEl.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        pointerDragState = {
          fromType: type,
          fromSlot: slotIdx,
          item: item,
          def: def,
          startX: e.clientX,
          startY: e.clientY,
          active: false,
          wasDragged: false,
          sourceEl: slotEl,
          ghostEl: null,
          lastHoverEl: null
        };
      });

      slotEl.addEventListener('click', (e) => {
        if (Date.now() - lastDragEndedAt < 150) return;
        if (e.shiftKey && invContainerData && invContainerData.items) {
          transferItemAcrossContainers(type, slotIdx, item, def, null);
          return;
        }
        openInvItemModal(item, def, slotIdx, type);
      });

      // Right-click on player pockets quick-uses usable items
      slotEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (type === 'player' && def.usable) {
          playCyberSound('use');
          if (window.mp && mp.events) {
            mp.events.emit('gcyber:inventory:cefUseItem', slotIdx);
          }
        } else {
          openInvItemModal(item, def, slotIdx, type);
        }
      });
    }

    return slotEl;
  }

  function renderInventoryUI() {
    if (!invPlayerData) return;

    if (invPlayerNameEl) invPlayerNameEl.textContent = invPlayerData.name || 'CITIZEN POCKETS';
    if (invPlayerIdEl) invPlayerIdEl.textContent = `ID: ${invPlayerData.citizenid || 'NC-0000'}`;

    const pWeight = invPlayerData.weight || 0;
    const pMaxWeight = invPlayerData.maxWeight || 120.0;
    if (invPlayerWeightTxt) invPlayerWeightTxt.textContent = `${pWeight.toFixed(1)} / ${pMaxWeight.toFixed(1)} KG`;
    const pPct = Math.min(100, Math.round((pWeight / pMaxWeight) * 100));
    if (invPlayerWeightFill) invPlayerWeightFill.style.width = `${pPct}%`;

    if (invPlayerHotbarGrid) {
      invPlayerHotbarGrid.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const item = invPlayerData.items[i];
        invPlayerHotbarGrid.appendChild(createInvSlotElement(i, item, 'player', true));
      }
    }

    if (invPlayerSlotsGrid) {
      invPlayerSlotsGrid.innerHTML = '';
      const maxSlots = invPlayerData.maxSlots || 35;
      for (let i = 5; i < maxSlots; i++) {
        const item = invPlayerData.items[i];
        invPlayerSlotsGrid.appendChild(createInvSlotElement(i, item, 'player', false));
      }
    }

    if (invContainerData && invContainerData.items) {
      if (invContainerStandby) invContainerStandby.classList.add('hidden');
      if (invContainerNameEl) invContainerNameEl.textContent = invContainerData.label || 'LOCAL STORAGE';
      if (invContainerIdEl) invContainerIdEl.textContent = invContainerData.id || 'ACTIVE';

      const cWeight = invContainerData.weight || 0;
      const cMaxWeight = invContainerData.maxWeight || 150.0;
      if (invContainerWeightTxt) invContainerWeightTxt.textContent = `${cWeight.toFixed(1)} / ${cMaxWeight.toFixed(1)} KG`;
      const cPct = Math.min(100, Math.round((cWeight / cMaxWeight) * 100));
      if (invContainerWeightFill) invContainerWeightFill.style.width = `${cPct}%`;

      if (invContainerSlotsGrid) {
        invContainerSlotsGrid.innerHTML = '';
        const cMaxSlots = invContainerData.maxSlots || 30;
        for (let i = 0; i < cMaxSlots; i++) {
          const item = invContainerData.items[i];
          invContainerSlotsGrid.appendChild(createInvSlotElement(i, item, 'container', false));
        }
      }
    } else {
      if (invContainerStandby) invContainerStandby.classList.remove('hidden');
      if (invContainerSlotsGrid) invContainerSlotsGrid.innerHTML = '';
      if (invContainerNameEl) invContainerNameEl.textContent = 'LOCAL STORAGE';
      if (invContainerIdEl) invContainerIdEl.textContent = 'STANDBY';
      if (invContainerWeightTxt) invContainerWeightTxt.textContent = '0.0 / 0.0 KG';
      if (invContainerWeightFill) invContainerWeightFill.style.width = '0%';
    }
  }

  function openInvItemModal(item, def, slotIdx, type) {
    invSelectedSlotData = { item, def, slotIdx, type };
    playCyberSound('click');

    const unitWeight = (def.weight !== undefined && def.weight !== null) ? def.weight : 0.5;
    if (invModalTitle) invModalTitle.textContent = def.label || item.id;
    if (invModalCategory) invModalCategory.textContent = (def.category || 'EQUIPMENT').toUpperCase();
    if (invModalDesc) invModalDesc.textContent = def.description || 'Standard manufactured item in Night City.';
    if (invModalWeight) invModalWeight.textContent = `${formatItemWeight(unitWeight)} KG`;
    if (invModalCount) invModalCount.textContent = `x${item.amount || 1}`;
    if (invModalIcon) {
      invModalIcon.innerHTML = '';
      invModalIcon.appendChild(createItemArtElement(def));
    }

    if (invBtnModalUse) {
      if (def.usable && type === 'player') {
        const cat = (def.category || def.type || '').toLowerCase();
        if (cat === 'weapon') invBtnModalUse.textContent = 'EQUIP / DRAW';
        else if (cat === 'ammo') invBtnModalUse.textContent = 'RELOAD';
        else if (cat === 'clothing' || cat === 'cyberware') invBtnModalUse.textContent = 'EQUIP';
        else invBtnModalUse.textContent = 'USE';
        invBtnModalUse.classList.remove('hidden');
      } else {
        invBtnModalUse.classList.add('hidden');
      }
    }

    if (invBtnModalTransfer) {
      if (invContainerData && invContainerData.items) {
        invBtnModalTransfer.classList.remove('hidden');
        invBtnModalTransfer.textContent = (type === 'player') ? 'TO STORAGE' : 'TO POCKETS';
      } else {
        invBtnModalTransfer.classList.add('hidden');
      }
    }

    if (invBtnModalDrop) {
      invBtnModalDrop.classList.toggle('hidden', type !== 'player');
    }

    if (item.amount && item.amount > 1 && def.stackable) {
      if (invSplitWrap) invSplitWrap.classList.remove('hidden');
      if (invSplitSlider) {
        invSplitSlider.min = 1;
        invSplitSlider.max = item.amount - 1;
        invSplitSlider.value = Math.floor(item.amount / 2);
      }
      if (invSplitValTxt && invSplitSlider) invSplitValTxt.textContent = invSplitSlider.value;
      if (invBtnModalSplit) invBtnModalSplit.classList.remove('hidden');
    } else {
      if (invSplitWrap) invSplitWrap.classList.add('hidden');
      if (invBtnModalSplit) invBtnModalSplit.classList.add('hidden');
    }

    if (invItemModal) invItemModal.classList.remove('hidden');
  }

  function handleEscapePress(fromClient) {
    const now = Date.now();
    if (now - lastEscapeHandledAt < 150) return;
    lastEscapeHandledAt = now;

    if (viewLoading && viewLoading.classList.contains('active')) {
      skipLoadingAndPlay();
    } else if (viewMultichar && viewMultichar.classList.contains('active')) {
      const deleteModal = document.getElementById('modal-delete-confirm');
      if (deleteModal && deleteModal.style.display === 'flex') {
        hideDeleteConfirmModal();
      } else {
        skipLoadingAndPlay();
      }
    } else if (isInventoryOpen) {
      if (invItemModal && !invItemModal.classList.contains('hidden')) {
        closeInvItemModal();
      } else {
        closeInventory(false);
      }
    } else if (isAdminOpen) {
      toggleAdminMenu(false, false);
    } else if (isChatOpen) {
      closeChat(false);
    }

    if (!fromClient && window.mp && mp.events) {
      mp.events.emit('g-cyber:ui:escapeHandled');
    }
  }

  // Unified Global Keybinds
  window.addEventListener('keydown', (e) => {
    if (viewLoading && viewLoading.classList.contains('active')) {
      if (e.key === 'Enter' || e.code === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        jackInAction();
        return;
      } else if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        handleEscapePress(false);
        return;
      }
    } else if (viewMultichar && viewMultichar.classList.contains('active')) {
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        handleEscapePress(false);
        return;
      }
    }

    if (e.key === 'Escape' || e.code === 'Escape') {
      e.preventDefault();
      handleEscapePress(false);
    } else if (e.key === 'F10' || e.key === 'Insert') {
      e.preventDefault();
      toggleAdminMenu();
    } else if ((e.key === 'Tab' || e.key === 'i' || e.key === 'I') && isInventoryOpen && !isTypingInField(e)) {
      e.preventDefault();
      closeInventory(false);
    } else if ((e.key === 't' || e.key === 'T') && !isTypingInField(e)) {
      const inCreator = viewCreator && viewCreator.classList.contains('active');
      const inLoading = viewLoading && viewLoading.classList.contains('active');
      const inMultichar = viewMultichar && viewMultichar.classList.contains('active');
      if (!isChatOpen && !isAdminOpen && !isInventoryOpen && !inCreator && !inLoading && !inMultichar) {
        e.preventDefault();
        openChat();
      }
    }
  });

  // =====================================================================
  // 9. CyberMP Native Event Receivers
  // =====================================================================
  if (window.mp && mp.events) {
    mp.events.on('g-cyber:ui:showLoading', () => showView(viewLoading));
    mp.events.on('g-cyber:ui:characterSpawned', (charJson) => {
      try {
        const char = (typeof charJson === 'string') ? JSON.parse(charJson) : charJson;
        showView(viewHud);
        updateHUDFromCharacter(char);
      } catch (e) {
        showView(viewHud);
      }
    });
    mp.events.on('g-cyber:ui:handleEscape', () => {
      handleEscapePress(true);
    });
    mp.events.on('g-cyber:ui:closeAll', () => {
      closeInventory(true);
      toggleAdminMenu(false, true);
      closeChat(true);
      if (bgAudio) bgAudio.pause();
      showView(viewHud);
    });
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
    mp.events.on('g-cyber:ui:toggleAdmin', (forceState) => toggleAdminMenu(forceState, true));

    mp.events.on('g-cyber:hud:sync', (rawData) => {
      try {
        const data = (typeof rawData === 'string') ? JSON.parse(rawData) : rawData;
        if (!data) return;
        if (data.cash !== undefined) document.getElementById('hud-cash').textContent = `$${Number(data.cash).toLocaleString()}`;
        if (data.bank !== undefined) document.getElementById('hud-bank').textContent = `$${Number(data.bank).toLocaleString()}`;
        if (data.crypto !== undefined) document.getElementById('hud-crypto').textContent = `${data.crypto} ⟠`;
        if (data.health !== undefined) setDialPercentage('ring-health-fill', 'health-val', data.health);
        if (data.armor !== undefined) setDialPercentage('ring-armor-fill', 'armor-val', data.armor);
        if (data.hunger !== undefined) setDialPercentage('ring-hunger-fill', 'hunger-val', data.hunger);
        if (data.thirst !== undefined) setDialPercentage('ring-thirst-fill', 'thirst-val', data.thirst);
        if (data.stress !== undefined) setDialPercentage('ring-stress-fill', 'stress-val', data.stress);
        if (data.job && data.job.label) document.getElementById('hud-job').textContent = data.job.label.toUpperCase();
        if (data.location) document.getElementById('hud-location').textContent = data.location.toUpperCase();
      } catch (e) {}
    });

    mp.events.on('g-cyber:hud:vehicle', (rawVehData) => {
      try {
        const vehData = (typeof rawVehData === 'string') ? JSON.parse(rawVehData) : rawVehData;
        const vehHud = document.getElementById('vehicle-hud');
        if (!vehData || !vehHud) return;
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
      } catch (e) {}
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

    mp.events.on('gcyber:inventory:cefOpen', (jsonStr) => {
      try {
        const payload = (typeof jsonStr === 'string') ? JSON.parse(jsonStr) : jsonStr;
        invPlayerData = payload.player;
        invContainerData = payload.container;
        invItemDefinitions = Object.assign({}, window.GCYBER_ITEM_CATALOG || {}, payload.itemDefinitions || {});
        if (invBtnHolster) {
          invBtnHolster.classList.toggle('hidden', !invEquippedItemId);
        }

        // Always dismiss stale popup modal when opening/refreshing inventory view
        closeInvItemModal();
        renderInventoryUI();
        isInventoryOpen = true;
        if (viewInventory) {
          viewInventory.classList.remove('hidden');
          viewInventory.classList.add('active');
        }
        playCyberSound('use');
      } catch (e) {
        console.error('[G-CyberRPcore] cefOpen parse error:', e);
      }
    });

    mp.events.on('gcyber:inventory:cefUpdate', (jsonStr) => {
      try {
        const payload = (typeof jsonStr === 'string') ? JSON.parse(jsonStr) : jsonStr;
        if (payload.itemDefinitions && Object.keys(payload.itemDefinitions).length > 0) {
          Object.assign(invItemDefinitions, payload.itemDefinitions);
        }
        if (payload.player && invPlayerData) {
          invPlayerData.weight = payload.player.weight;
          invPlayerData.items = payload.player.items;
        }
        if (payload.container === null) {
          invContainerData = null;
        } else if (payload.container && invContainerData) {
          invContainerData.weight = payload.container.weight;
          invContainerData.items = payload.container.items;
        }
        renderInventoryUI();
      } catch (e) {
        console.error('[G-CyberRPcore] cefUpdate error:', e);
      }
    });

    mp.events.on('gcyber:inventory:cefEquipped', (itemId) => {
      invEquippedItemId = itemId || null;
      if (invBtnHolster) {
        invBtnHolster.classList.toggle('hidden', !invEquippedItemId);
      }
      if (isInventoryOpen) renderInventoryUI();
    });

    mp.events.on('gcyber:inventory:cefIcon', (fileName, dataUri) => {
      if (!fileName || !dataUri) return;
      invIconDataCache[fileName] = dataUri;

      document.querySelectorAll('img[data-icon-file]').forEach((img) => {
        if (img.dataset.iconFile === fileName && img.src !== dataUri) {
          img.src = dataUri;
        }
      });

      document.querySelectorAll('span[data-icon-pending]').forEach((span) => {
        if (span.dataset.iconPending !== fileName) return;
        const img = document.createElement('img');
        img.className = 'slot-img';
        img.dataset.iconFile = fileName;
        img.src = dataUri;
        img.alt = fileName;
        img.draggable = false;
        if (span.parentNode) span.parentNode.replaceChild(img, span);
      });
    });

    mp.events.on('gcyber:inventory:cefClose', () => {
      closeInventory(true);
    });

    mp.events.on('chat:open', () => openChat());
    mp.events.on('chat:addMessage', (text, type) => appendChatMessage(text, type));
  }
});
