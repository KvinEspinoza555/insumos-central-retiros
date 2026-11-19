/* Insumos Central Retiros · asistente de instalación PWA v2.4 */
(() => {
  'use strict';

  const DISMISS_KEY = 'icr_install_dismissed_at';
  const REMIND_AFTER = 7 * 24 * 60 * 60 * 1000;
  let deferredInstallPrompt = null;
  let widget = null;
  let guide = null;
  let lastFocused = null;

  function isInstalled() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches) ||
      navigator.standalone === true;
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  }

  function recentDismissal() {
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY));
      return at > 0 && Date.now() - at < REMIND_AFTER;
    } catch (_) { return false; }
  }

  function rememberDismissal() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (_) { /* Private mode */ }
  }

  function compact() {
    if (widget) widget.classList.add('icr-install-compact');
  }

  function dismiss() {
    rememberDismissal();
    compact();
  }

  function removeUI() {
    deferredInstallPrompt = null;
    if (widget) { widget.remove(); widget = null; }
    closeGuide();
  }

  function instructions() {
    const ua = navigator.userAgent || '';
    if (isIOS()) {
      return {
        subtitle: 'En iPhone o iPad se agrega desde el navegador; no se descarga de App Store.',
        steps: [
          'Abre Insumos Central Retiros en Safari.',
          'Toca el botón Compartir (cuadrado con flecha hacia arriba). Si no aparece, abre primero el menú de la página.',
          'Busca «Agregar a inicio» o «Añadir a pantalla de inicio».',
          'Activa «Abrir como app web» si aparece y confirma «Agregar».'
        ]
      };
    }
    if (/Android/i.test(ua)) {
      return {
        subtitle: 'Puedes instalar la aplicación desde Chrome u otro navegador compatible.',
        steps: [
          'Abre esta página en Chrome.',
          'Toca el menú de tres puntos (⋮).',
          'Selecciona «Instalar aplicación» o «Agregar a pantalla principal».',
          'Confirma la instalación y busca el icono en tu teléfono.'
        ]
      };
    }
    if (/Macintosh|Mac OS X/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) {
      return {
        subtitle: 'Safari en Mac permite guardar este sitio como una aplicación.',
        steps: [
          'Abre esta página en Safari.',
          'En la barra de menús, elige «Archivo» → «Agregar al Dock».',
          'Confirma el nombre «Insumos Central Retiros».',
          'Abre la aplicación desde el Dock o Launchpad.'
        ]
      };
    }
    return {
      subtitle: 'Usa Chrome o Edge para instalar Insumos Central Retiros en tu computador.',
      steps: [
        'Abre esta página en Chrome o Microsoft Edge.',
        'Busca el icono «Instalar» en la barra de direcciones; también puede estar dentro del menú del navegador.',
        'Selecciona «Instalar Insumos Central Retiros» o «Instalar esta página como aplicación».',
        'Confirma. Se abrirá como una app independiente del navegador.'
      ]
    };
  }

  function closeGuide() {
    if (!guide) return;
    guide.remove();
    guide = null;
    if (lastFocused && typeof lastFocused.focus === 'function' && lastFocused.isConnected) {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  function showGuide() {
    if (guide) return;
    lastFocused = document.activeElement;
    const info = instructions();
    guide = document.createElement('div');
    guide.className = 'icr-install-guide-overlay';
    guide.innerHTML = `
      <section class="icr-install-guide" role="dialog" aria-modal="true" aria-labelledby="icr-install-guide-title">
        <div class="icr-install-guide-top">
          <img alt="" src="./icon-192.png" width="48" height="48" />
          <button type="button" class="icr-install-close" aria-label="Cerrar instrucciones" data-icr-install="close">×</button>
        </div>
        <h2 id="icr-install-guide-title">Instalar Insumos Central Retiros</h2>
        <p>${info.subtitle}</p>
        <ol>${info.steps.map(step => `<li>${step}</li>`).join('')}</ol>
        <p class="icr-install-guide-note">No necesitas crear otra cuenta. Inicia sesión con tu mismo ID y PIN.</p>
        <button type="button" class="icr-install-main icr-install-done" data-icr-install="close">Entendido</button>
      </section>`;
    guide.addEventListener('click', (event) => {
      if (event.target === guide || event.target.closest('[data-icr-install="close"]')) closeGuide();
    });
    document.body.append(guide);
    guide.querySelector('.icr-install-close')?.focus();
  }

  async function startInstall() {
    if (isInstalled()) { removeUI(); return; }
    const prompt = deferredInstallPrompt;
    if (!prompt) { showGuide(); compact(); return; }
    deferredInstallPrompt = null; // BeforeInstallPromptEvent can be used once.
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result && result.outcome === 'accepted') {
        removeUI();
      } else {
        compact();
      }
    } catch (_) {
      showGuide();
      compact();
    }
  }

  function renderWidget() {
    if (widget || isInstalled()) return;
    widget = document.createElement('aside');
    widget.id = 'icr-install-widget';
    widget.className = 'icr-install-widget' + (recentDismissal() ? ' icr-install-compact' : '');
    widget.setAttribute('aria-label', 'Instalar Insumos Central Retiros');
    widget.innerHTML = `
      <div class="icr-install-card">
        <img src="./icon-192.png" width="49" height="49" alt="" />
        <div class="icr-install-copy">
          <strong>Instala Insumos Central Retiros</strong>
          <span>Ábrela como una app desde tu celular o PC.</span>
          <div class="icr-install-actions">
            <button type="button" class="icr-install-main" data-icr-install="start">Instalar app</button>
            <button type="button" class="icr-install-later" data-icr-install="dismiss">Ahora no</button>
          </div>
        </div>
        <button type="button" class="icr-install-close" aria-label="Ocultar invitación a instalar" data-icr-install="dismiss">×</button>
      </div>
      <button type="button" class="icr-install-pill" data-icr-install="start" aria-label="Instalar Insumos Central Retiros">
        <span aria-hidden="true">↓</span> Instalar app
      </button>`;
    widget.addEventListener('click', (event) => {
      const action = event.target.closest('[data-icr-install]')?.dataset.icrInstall;
      if (action === 'dismiss') dismiss();
      if (action === 'start') startInstall();
    });
    document.body.append(widget);
  }

  // Only Chromium-like browsers dispatch this event. Safari/iOS uses the guide instead.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    renderWidget();
  });
  window.addEventListener('appinstalled', removeUI);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && guide) closeGuide();
  });
  if (window.matchMedia) {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    if (typeof displayMode.addEventListener === 'function') {
      displayMode.addEventListener('change', () => {
        if (isInstalled()) removeUI();
        else renderWidget();
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderWidget, { once: true });
  } else {
    renderWidget();
  }
})();
