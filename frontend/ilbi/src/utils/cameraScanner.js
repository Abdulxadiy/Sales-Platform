const FRAME_ERRORS = new Set(['NotFoundException', 'ChecksumException', 'FormatException']);

export function cameraErrorMessage(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Kameraga ruxsat berilmadi. Brauzerning sayt sozlamalarida kameraga ruxsat bering va qayta urining.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Qurilmada kamera topilmadi. Kamerani ulang va qayta urining.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Kamerani ochib bo‘lmadi. Uni ishlatayotgan boshqa ilovani yoping va qayta urining.';
    case 'OverconstrainedError':
      return 'Tanlangan kamera mavjud emas. Oynani yopib, kamerani qayta oching.';
    default:
      return 'Kamerani ishga tushirishda xatolik yuz berdi. Qayta urinib ko‘ring.';
  }
}

/** Own one stream, including streams granted after the dialog has been closed. */
export function startCameraSession({
  video, deviceId, onReady, onDetected, onError,
  mediaDevices = navigator.mediaDevices,
  waitFor = Promise.resolve(),
  loadReader = async () => (await import('./barcodeReader.js')).createBarcodeReader(),
}) {
  let stopped = false;
  let stream;
  let controls;
  let removeEndedListener;

  const releaseStream = () => {
    removeEndedListener?.();
    stream?.getTracks().forEach(track => track.stop());
    if (stream && video.srcObject === stream) {
      video.pause();
      video.srcObject = null;
    }
  };

  const stop = () => {
    stopped = true;
    controls?.stop();
    releaseStream();
  };

  const fail = error => {
    if (stopped) return;
    stop();
    onError(error);
  };

  const ready = (async () => {
    try {
      // A rapid close/reopen must not request a second camera while permission
      // for the old one is still pending (or race React StrictMode cleanup).
      await waitFor;
      if (stopped) return;
      const reader = await loadReader();
      if (stopped) return;
      stream = await mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (stopped) { releaseStream(); return; }

      const track = stream.getVideoTracks()[0];
      if (!track) throw new DOMException('No video track', 'NotFoundError');
      const ended = () => fail(new DOMException('Camera disconnected', 'NotReadableError'));
      track.addEventListener('ended', ended);
      removeEndedListener = () => track.removeEventListener('ended', ended);
      video.srcObject = stream;
      await video.play();
      if (stopped) { releaseStream(); return; }
      onReady(stream);

      controls = await reader.decodeFromVideoElement(video, (result, error, scanControls) => {
        if (stopped) { scanControls.stop(); return; }
        const code = result?.getText()?.trim();
        if (code) {
          controls = scanControls;
          stop(); // Release the camera before notifying the page, exactly once.
          onDetected(code);
        } else if (error && !FRAME_ERRORS.has(error.getKind?.() || error.name)) {
          controls = scanControls;
          fail(error);
        }
      });
      if (stopped) controls.stop();
    } catch (error) {
      fail(error);
    }
  })();

  return { stop, ready };
}
