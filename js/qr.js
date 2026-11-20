/*
 * qr.js - QR code generation (via qrcode.js CDN library) and
 * scanning (via jsQR CDN library), with camera and image upload support.
 */
const EMlabQR = (() => {
  let scannerStream = null;
  let scannerRAF = null;
  let onScanSuccess = null;

  function isReady() {
    return typeof QRCode !== 'undefined' && typeof jsQR !== 'undefined';
  }

  function renderInto(containerEl, text) {
    containerEl.innerHTML = '';
    if (typeof QRCode === 'undefined') {
      containerEl.innerHTML = '<p class="muted">QR code library failed to load. Use the class code instead.</p>';
      return;
    }
    // eslint-disable-next-line no-undef
    new QRCode(containerEl, {
      text,
      width: 180,
      height: 180,
      colorDark: '#06285A',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  async function startCameraScan(videoEl, canvasEl, onSuccess, onError) {
    onScanSuccess = onSuccess;
    if (typeof jsQR === 'undefined') {
      onError && onError('QR scanning library failed to load.');
      return;
    }
    try {
      scannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      videoEl.srcObject = scannerStream;
      await videoEl.play();
      tick(videoEl, canvasEl);
    } catch (e) {
      onError && onError(e.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access to scan.'
        : 'Could not access camera on this device.');
    }
  }

  function tick(videoEl, canvasEl) {
    if (!scannerStream) return;
    if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
      const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (code && code.data) {
        stopCameraScan(videoEl);
        onScanSuccess && onScanSuccess(code.data);
        return;
      }
    }
    scannerRAF = requestAnimationFrame(() => tick(videoEl, canvasEl));
  }

  function stopCameraScan(videoEl) {
    if (scannerRAF) cancelAnimationFrame(scannerRAF);
    scannerRAF = null;
    if (scannerStream) {
      scannerStream.getTracks().forEach(t => t.stop());
      scannerStream = null;
    }
    if (videoEl) {
      videoEl.pause();
      videoEl.srcObject = null;
    }
  }

  function scanImageFile(file, canvasEl) {
    return new Promise((resolve, reject) => {
      if (typeof jsQR === 'undefined') {
        reject(new Error('QR scanning library failed to load.'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
        canvasEl.width = img.width;
        canvasEl.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          resolve(code.data);
        } else {
          reject(new Error('No QR code found in that image.'));
        }
      };
      img.onerror = () => reject(new Error('Could not read that image file.'));
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = () => reject(new Error('Could not read that image file.'));
      reader.readAsDataURL(file);
    });
  }

  return { isReady, renderInto, startCameraScan, stopCameraScan, scanImageFile };
})();
