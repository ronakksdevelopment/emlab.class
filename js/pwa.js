/*
 * pwa.js - service worker registration and install prompt handling.
 */
const EMlabPWA = (() => {
  let deferredPrompt = null;

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(err => {
          console.warn('Service worker registration failed:', err);
        });
      });
    }
  }

  function listenForInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      document.getElementById('installBtn').hidden = false;
    });
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      document.getElementById('installBtn').hidden = true;
      EMlabToast.show('EMlab Classes installed. You can now launch it from your home screen.', 'success');
    });
  }

  async function promptInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        EMlabToast.show('Installing EMlab Classes...', 'success');
      }
      deferredPrompt = null;
      document.getElementById('installBtn').hidden = true;
      return;
    }
    showManualInstallHelp();
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function showManualInstallHelp() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isAndroid = /Android/.test(ua);
    const body = document.getElementById('installHelpBody');

    let html = '';
    if (isIOS && isSafari) {
      html = `
        <p>To install EMlab Classes on iPhone or iPad:</p>
        <ol>
          <li>Tap the <strong>Share</strong> icon <i class="fa-solid fa-arrow-up-from-bracket"></i> in Safari's toolbar.</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li>Tap <strong>Add</strong> in the top right corner.</li>
        </ol>`;
    } else if (isAndroid) {
      html = `
        <p>To install EMlab Classes on Android:</p>
        <ol>
          <li>Tap the <strong>menu</strong> icon <i class="fa-solid fa-ellipsis-vertical"></i> in your browser.</li>
          <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
          <li>Confirm by tapping <strong>Install</strong>.</li>
        </ol>`;
    } else {
      html = `
        <p>To install EMlab Classes on desktop:</p>
        <ol>
          <li>Look for an <strong>install icon</strong> <i class="fa-solid fa-download"></i> in your browser's address bar.</li>
          <li>Click it and select <strong>Install</strong>.</li>
          <li>If you do not see it, open your browser menu and look for <strong>Install EMlab Classes</strong> or <strong>Add to Desktop</strong>.</li>
        </ol>`;
    }
    body.innerHTML = html;
    EMlabApp.openModal('installHelpModal');
  }

  return { registerServiceWorker, listenForInstallPrompt, promptInstall, isStandalone };
})();
