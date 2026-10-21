import { useEffect, useLayoutEffect, useRef, useState, useCallback, useId } from 'react';
import { Camera, X, Zap, ZapOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cameraErrorMessage, startCameraSession } from '../../utils/cameraScanner';
import { RetryButton } from './RecoveryNotice';

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => { void ctx.close().catch(() => {}); };
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Sound is optional; browsers may require a user gesture.
  }
}

export default function CameraBarcodeScanner({
  isOpen, onClose, onScan, title = 'Shtrix-kodni skanerlash',
}) {
  const titleId = useId();
  const [cameras, setCameras] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [activeDeviceId, setActiveDeviceId] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const sessionRef = useRef(null);
  const startupRef = useRef(Promise.resolve());
  const openRef = useRef(false);
  const callbacksRef = useRef({ onClose, onScan });

  // Inline callbacks from POS/catalog/intake change on every parent render.
  // Keep the latest callbacks without restarting the camera on those renders.
  useLayoutEffect(() => { callbacksRef.current = { onClose, onScan }; }, [onClose, onScan]);

  const closeScanner = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    sessionRef.current?.stop();
    dialogRef.current?.close();
    setDeviceId('');
    callbacksRef.current.onClose();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen) {
      openRef.current = false;
      if (dialog.open) dialog.close();
      setDeviceId('');
      return;
    }
    openRef.current = true;
    if (!dialog.open) dialog.showModal();
    setIsScanning(false);
    setErrorMessage('');
    setHasTorch(false);
    setTorchOn(false);
    setCameras([]);

    const cleanup = () => {
      openRef.current = false;
      sessionRef.current?.stop();
    };
    if (!window.isSecureContext) {
      setErrorMessage('Kamera uchun saytni HTTPS orqali oching. Telefonda oddiy HTTP yoki lokal IP manzilda kamera ishlamaydi.');
      return cleanup;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Bu brauzer kamerani qo‘llab-quvvatlamaydi. Saytni yangilangan Chrome yoki Safari brauzerida oching.');
      return cleanup;
    }

    const session = startCameraSession({
      video: videoRef.current,
      deviceId,
      waitFor: startupRef.current,
      onReady: stream => {
        setIsScanning(true);
        const track = stream.getVideoTracks()[0];
        setActiveDeviceId(track.getSettings?.().deviceId || deviceId);
        try {
          const capabilities = track.getCapabilities?.();
          setHasTorch(Boolean(capabilities?.torch));
          if (capabilities?.focusMode?.includes('continuous')) {
            void track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
          }
        } catch { /* Camera enhancements are optional. */ }
        // Enumerate after permission; this does not open a second camera stream.
        navigator.mediaDevices.enumerateDevices?.().then(devices => {
          if (sessionRef.current === session && openRef.current) {
            setCameras(devices.filter(device => device.kind === 'videoinput' && device.deviceId));
          }
        }).catch(() => {});
      },
      onDetected: code => {
        const handleScan = callbacksRef.current.onScan;
        closeScanner(); // Close immediately, even if product lookup takes time.
        playBeep();
        try { navigator.vibrate?.(80); } catch { /* Optional feedback. */ }
        handleScan(code);
      },
      onError: error => {
        setIsScanning(false);
        setErrorMessage(cameraErrorMessage(error));
      },
    });
    sessionRef.current = session;
    startupRef.current = session.ready;
    return () => {
      openRef.current = false;
      session.stop();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [isOpen, deviceId, attempt, closeScanner]);

  const toggleTorch = async () => {
    const track = videoRef.current?.srcObject?.getVideoTracks()[0];
    if (!track || !hasTorch) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      if (videoRef.current?.srcObject?.getVideoTracks()[0] === track) setTorchOn(next);
    } catch {
      setHasTorch(false);
      setTorchOn(false);
    }
  };

  const selectedIndex = Math.max(0, cameras.findIndex(camera => camera.deviceId === activeDeviceId));
  const switchCamera = () => {
    if (isScanning && cameras.length > 1) {
      setDeviceId(cameras[(selectedIndex + 1) % cameras.length].deviceId);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="custom-dialog camera-scanner-dialog"
      closedby="any"
      aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); closeScanner(); }}
      onClose={() => { if (!dialogRef.current?.open) closeScanner(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
          closeScanner();
        }
      }}
      style={{ border: 'none', background: 'transparent', padding: 0, margin: 'auto', outline: 'none', maxWidth: '90vw', width: 'min(calc(100vw - 32px), 440px)' }}
    >
      <div className="dialog-content" style={{ width: '100%', background: 'var(--bg-card, #fff)', border: '1px solid var(--border-card)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Camera size={20} />
            <div>
              <h3 id={titleId} style={{ margin: 0, fontSize: 15 }}>{title}</h3>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Kodni to‘liq ko‘rsating va kamerani bir oz uzoqlashtiring</span>
            </div>
          </div>
          <button type="button" onClick={closeScanner} aria-label="Yopish" className="btn btn-secondary" style={{ padding: 6 }}><X size={20} /></button>
        </div>

        <div style={{ position: 'relative', background: '#000', width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}>
          <video ref={videoRef} autoPlay muted playsInline aria-label="Kamera tasviri" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          {isScanning && !errorMessage && (
            <div aria-hidden="true" style={{ position: 'absolute', inset: '18% 6%', border: '2px solid var(--primary)', borderRadius: 12, pointerEvents: 'none', boxShadow: '0 0 0 9999px rgba(0,0,0,.2)' }} />
          )}
          {!isScanning && !errorMessage && (
            <div role="status" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', textAlign: 'center', padding: 20 }}>
              Kamera ochilmoqda… Kameraga ruxsat so‘ralsa, ruxsat bering.
            </div>
          )}
          {errorMessage && (
            <div role="alert" style={{ position: 'absolute', inset: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12, background: '#141820', color: '#fff', padding: 16, borderRadius: 12 }}>
              <AlertCircle size={30} color="var(--accent-rose)" />
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{errorMessage}</p>
              <RetryButton onClick={() => setAttempt(value => value + 1)} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 18px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {hasTorch && isScanning && (
              <button type="button" onClick={toggleTorch} className="btn btn-secondary" aria-pressed={torchOn} title={torchOn ? 'Chiroqni o‘chirish' : 'Chiroqni yoqish'}>
                {torchOn ? <Zap size={15} /> : <ZapOff size={15} />} Chiroq
              </button>
            )}
            {cameras.length > 1 && (
              <button type="button" onClick={switchCamera} disabled={!isScanning} title="Kamerani almashtirish" className="btn btn-secondary">
                <RefreshCw size={14} /> Kamera #{selectedIndex + 1}
              </button>
            )}
          </div>
          <button type="button" className="btn btn-secondary" onClick={closeScanner}>Bekor qilish</button>
        </div>
      </div>
      <style>{`dialog.camera-scanner-dialog::backdrop { background: rgba(0,0,0,.88); }`}</style>
    </dialog>
  );
}
