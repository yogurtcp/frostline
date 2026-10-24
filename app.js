/* Install/offline support. Updates are checked once, before the game starts. */
(() => {
  const BUILD = '__BUILD_VERSION__';
  window.FROSTLINE_DEV = new URL(location.href).searchParams.has('dev');
  let prompt = null, playing = false;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const status = document.getElementById('app-status'), button = document.getElementById('install-app'), help = document.getElementById('install-help');
  const message = value => { status.textContent = value; };
  const refreshButton = () => { button.hidden = !!standalone() || playing; };
  window.FrostlineApp = {
    build: BUILD, updateState: 'starting',
    playing(value) { playing = value; refreshButton(); },
    ready() { status.hidden = true; refreshButton(); }
  };
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); prompt = event; refreshButton(); });
  window.addEventListener('appinstalled', () => { prompt = null; button.hidden = true; });
  button.addEventListener('click', async () => {
    if (prompt) { const request = prompt; prompt = null; await request.prompt(); await request.userChoice; refreshButton(); return; }
    const text = document.getElementById('install-instructions');
    text.textContent = location.protocol === 'file:'
      ? 'Open the published game in your browser to install it. This downloaded file still works offline.'
      : /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
        ? 'In Safari, tap Share, then Add to Home Screen. Open Frostline from its new icon.'
        : 'Use your browser’s Install app option. Chrome and Edge show an install icon in the address bar or browser menu. On Mac, Safari offers File → Add to Dock. If your browser has no install option, open this page in a supported browser.';
    if(help.showModal)help.showModal();else help.setAttribute('open','');
  });
  document.getElementById('close-install-help').addEventListener('click', () => {if(help.close)help.close();else help.removeAttribute('open');});
  refreshButton();
  const activated = worker => new Promise((resolve, reject) => {
    if (!worker) { resolve(); return; }
    const check = () => {
      if (worker.state === 'activated' || worker.state === 'redundant') {
        worker.removeEventListener('statechange', check);
        worker.state === 'activated' ? resolve() : reject(new Error('Update was not installed'));
      }
    };
    worker.addEventListener('statechange', check); check();
  });
  const workerBuild = worker => new Promise(resolve => {
    if (!worker) { resolve(null); return; }
    const channel = new MessageChannel(), timer = setTimeout(() => resolve(null), 1500);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data.version); };
    worker.postMessage({ type: 'FROSTLINE_VERSION' }, [channel.port2]);
  });
  window.FROSTLINE_BOOT = (async () => {
    if (window.FROSTLINE_DEV || !['http:', 'https:'].includes(location.protocol) || !('serviceWorker' in navigator)) {
      window.FrostlineApp.updateState = 'unsupported'; message('Loading slope…'); return;
    }
    message(navigator.onLine ? 'Checking for updates…' : 'Loading offline slope…');
    try {
      let startup = true;
      const check = async () => {
        const scope = new URL('./', location.href).href;
        let registration = await navigator.serviceWorker.getRegistration(scope);
        if(registration && registration.scope !== scope)registration = null;
        if (navigator.onLine) {
          if (registration) await registration.update();
          else registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
          await activated(registration.installing || registration.waiting || registration.active);
        }
        const version = await workerBuild(registration?.active);
        if (startup && version && version !== BUILD) {
          const key = 'frostline-startup-update';
          if (sessionStorage.getItem(key) !== version) {
            sessionStorage.setItem(key, version);
            window.FrostlineApp.updateState = 'reloading'; message('Opening updated slope…');
            location.reload(); await new Promise(() => {});
          }
        }
        window.FrostlineApp.updateState = version && version !== BUILD ? 'ready-next-start' : navigator.onLine ? 'current' : 'offline';
      };
      let timer;
      // A slow update can finish caching, but must never reload a run that has started.
      await Promise.race([
        check(),
        new Promise((_, reject) => { timer = setTimeout(() => { startup = false; reject(new Error('Update check timed out')); }, 30000); })
      ]).finally(() => { clearTimeout(timer); startup = false; });
    } catch (_) { window.FrostlineApp.updateState = navigator.onLine ? 'pending' : 'offline'; }
    message('Loading slope…');
  })();
})();
