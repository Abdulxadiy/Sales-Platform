import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Zap, ZapOff, RefreshCw, AlertCircle } from 'lucide-react';

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.ITF,
];

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // AudioContext might be restricted until user gesture; ignore
  }
}

export default function CameraBarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = 'Shtrix-kodni skanerlash',
}) {
  const [cameras, setCameras] = useState([]);
  const [selectedCamIndex, setSelectedCamIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);

  const dialogRef = useRef(null);
  const scannerRef = useRef(null);
  const isStoppingRef = useRef(false);
  const hasDetectedRef = useRef(false);
  const nativeDetectorRef = useRef(null);
  const animFrameRef = useRef(null);
  const elementId = 'camera-barcode-scanner-viewport';

  // Initialize native BarcodeDetector if supported by the browser (iOS 17+ Safari, Android Chrome)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        nativeDetectorRef.current = new window.BarcodeDetector({
          formats: [
            'code_128',
            'code_39',
            'code_93',
            'ean_13',
            'ean_8',
            'qr_code',
            'upc_a',
            'upc_e',
            'itf',
            'data_matrix',
          ],
        });
      } catch {
        nativeDetectorRef.current = null;
      }
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (isStoppingRef.current || !scannerRef.current) return;
    isStoppingRef.current = true;
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current.clear();
    } catch {
      // Ignore cleanup error
    } finally {
      scannerRef.current = null;
      isStoppingRef.current = false;
      setIsScanning(false);
      setTorchOn(false);
    }
  }, []);

  const handleDetected = useCallback(
    (decodedText) => {
      if (hasDetectedRef.current) return;
      hasDetectedRef.current = true;
      setScannedCode(decodedText);
      playBeep();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([80, 40, 80]);
        } catch {}
      }

      setTimeout(async () => {
        await stopScanner();
        onScan(decodedText);
        onClose();
      }, 350);
    },
    [onScan, onClose, stopScanner]
  );

  // Hardware-accelerated native scan loop running directly on video frames
  const startNativeScanLoop = useCallback(() => {
    if (!nativeDetectorRef.current) return;
    const checkFrame = async () => {
      if (hasDetectedRef.current || !isOpen) return;
      const videoElem = document.querySelector(`#${elementId} video`);
      if (videoElem && videoElem.readyState >= 2 && !videoElem.paused) {
        try {
          const detected = await nativeDetectorRef.current.detect(videoElem);
          if (detected && detected.length > 0 && detected[0].rawValue) {
            handleDetected(detected[0].rawValue);
            return;
          }
        } catch {
          // Frame detect skip; continue loop
        }
      }
      animFrameRef.current = requestAnimationFrame(checkFrame);
    };
    animFrameRef.current = requestAnimationFrame(checkFrame);
  }, [isOpen, handleDetected]);

  const startScanner = useCallback(
    async (cameraId) => {
      if (!isOpen) return;
      setErrorMessage('');
      hasDetectedRef.current = false;
      setScannedCode(null);

      try {
        await stopScanner();

        const html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
          useBarCodeDetectorIfSupported: true,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = html5QrCode;

        // HD video constraints with continuous autofocus
        const videoConstraints = {
          facingMode: 'environment',
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          focusMode: 'continuous',
        };

        const config = {
          fps: 20,
          disableFlip: false,
          videoConstraints,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Generous scanning area so 1D linear barcodes and QR codes are not prematurely cropped
            const w = Math.floor(viewfinderWidth * 0.88);
            const h = Math.floor(Math.min(viewfinderHeight * 0.72, 280));
            return { width: Math.max(w, 240), height: Math.max(h, 160) };
          },
        };

        const cameraConfig = cameraId
          ? { deviceId: { exact: cameraId } }
          : videoConstraints;

        await html5QrCode.start(
          cameraConfig,
          config,
          (decodedText) => {
            handleDetected(decodedText);
          },
          () => {
            // Frame scan failure (no code in current frame); ignore
          }
        );

        setIsScanning(true);
        startNativeScanLoop();

        // Check if camera capabilities support torch
        try {
          const stream = html5QrCode.getRunningTrackCameraCapabilities?.();
          if (stream?.torchFeature?.()?.isSupported?.()) {
            setHasTorch(true);
          } else {
            const videoElem = document.querySelector(`#${elementId} video`);
            const track = videoElem?.srcObject?.getVideoTracks?.()[0];
            const caps = track?.getCapabilities?.();
            setHasTorch(Boolean(caps?.torch));
          }
        } catch {
          setHasTorch(false);
        }
      } catch (err) {
        setIsScanning(false);
        const msg = String(err?.message || err || '');
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setErrorMessage('Kameraga ruxsat berilmadi. Iltimos, brauzer sozlamalarida kameraga ruxsat bering.');
        } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
          setErrorMessage('Qurilmada kamera topilmadi.');
        } else {
          setErrorMessage('Kamerani ishga tushirishda xatolik yuz berdi. Qayta urinib ko‘ring.');
        }
      }
    },
    [isOpen, stopScanner, handleDetected, startNativeScanLoop]
  );

  // Initialize camera list on open
  useEffect(() => {
    let active = true;
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!active) return;
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer environment/back camera if labeled
          const backCamIndex = devices.findIndex(
            (d) =>
              d.label?.toLowerCase().includes('back') ||
              d.label?.toLowerCase().includes('orqa') ||
              d.label?.toLowerCase().includes('environment')
          );
          const initialIndex = backCamIndex >= 0 ? backCamIndex : 0;
          setSelectedCamIndex(initialIndex);
          startScanner(devices[initialIndex]?.id);
        } else {
          startScanner(null);
        }
      })
      .catch(() => {
        if (active) {
          startScanner(null);
        }
      });

    return () => {
      active = false;
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      const videoElem = document.querySelector(`#${elementId} video`);
      const track = videoElem?.srcObject?.getVideoTracks?.()[0];
      if (track?.applyConstraints) {
        await track.applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setTorchOn(nextTorch);
      }
    } catch {
      // Torch toggle failed
    }
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const nextIndex = (selectedCamIndex + 1) % cameras.length;
    setSelectedCamIndex(nextIndex);
    startScanner(cameras[nextIndex]?.id);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          // Ignore error if already open
        }
      }
    } else {
      if (dialog.open) {
        try {
          dialog.close();
        } catch {
          // Ignore error if already closed
        }
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e) => {
      e.preventDefault();
      onClose();
    };

    const handleBackdropClick = (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isDialogContent) {
        onClose();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (!('closedBy' in HTMLDialogElement.prototype)) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="custom-dialog camera-scanner-dialog"
      closedby="any"
      aria-labelledby="camera-modal-title"
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        margin: 'auto',
        outline: 'none',
        overflow: 'visible',
        maxWidth: '90vw',
        width: 'min(calc(100vw - 32px), 440px)',
      }}
    >
      <div
        className="dialog-content"
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(245, 158, 11, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--primary, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={18} />
            </div>
            <div>
              <h3 id="camera-modal-title" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Shtrix-kodni to‘rtburchak ichiga to‘g‘rilang
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewport Area */}
        <div
          style={{
            position: 'relative',
            background: '#000',
            width: '100%',
            aspectRatio: '4/3',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* HTML5 QR Code Container */}
          <div
            id={elementId}
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
            }}
          />

          {/* Futuristic Targeting Reticle & Scan Line */}
          {isScanning && !errorMessage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '84%',
                  height: '64%',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                  borderRadius: 12,
                  transition: 'border-color 0.2s ease',
                }}
              >
                {/* 4 Corner Markers */}
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    left: -2,
                    width: 24,
                    height: 24,
                    borderTop: `3px solid ${scannedCode ? 'var(--accent-emerald, #10b981)' : 'var(--primary, #f59e0b)'}`,
                    borderLeft: `3px solid ${scannedCode ? 'var(--accent-emerald, #10b981)' : 'var(--primary, #f59e0b)'}`,
                    borderTopLeftRadius: 10,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 24,
                    height: 24,
                    borderTop: `3px solid ${scannedCode ? 'var(--accent-emerald, #10b981)' : 'var(--primary, #f59e0b)'}`,
                    borderRight: `3px solid ${scannedCode ? 'var(--accent-emerald, #10b981)' : 'var(--primary, #f59e0b)'}`,
                    borderTopRightRadius: 10,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    left: -2,
                    width: 24,
                    height: 24,
                    borderBottom: `3px solid ${scannedCode ? 'var(--accent-emerald, #10b981)' : 'var(--primary, #f59e0b)'}`,
                    borderLeft: `3px solid ${scannedCode ? 'var(--accent-emerald, #10b981)' : 'var(--primary, #f59e0b)'}`,
                    borderBottomLeftRadius: 10,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 24,
                    height: 24,
                    borderBottom: `3px solid ${scannedCode ? 'var(--accent-emerald, #10b981)' : 'var(--primary, #f59e0b)'}`,
                    borderRight: `3px solid ${scannedCode ? 'var(--accent-emerald, #10b981)' : 'var(--primary, #f59e0b)'}`,
                    borderBottomRightRadius: 10,
                  }}
                />

                {/* Animated Laser Line */}
                <div
                  style={{
                    position: 'absolute',
                    left: '5%',
                    right: '5%',
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, var(--primary, #f59e0b), #fbbf24, transparent)',
                    boxShadow: '0 0 12px var(--primary, #f59e0b)',
                    animation: 'scannerLaser 2s infinite ease-in-out',
                  }}
                />
              </div>
            </div>
          )}

          {/* Success Flash Notification */}
          {scannedCode && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 8,
                zIndex: 10,
                backdropFilter: 'blur(3px)',
              }}
            >
              <span
                style={{
                  background: 'var(--accent-emerald, #10b981)',
                  color: '#fff',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                }}
              >
                ✓ {scannedCode}
              </span>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>
                O‘qildi! Yuklanmoqda...
              </span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                position: 'absolute',
                inset: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: 12,
                background: 'rgba(20, 24, 32, 0.95)',
                padding: 20,
                borderRadius: 12,
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <AlertCircle size={36} color="var(--accent-rose, #ef4444)" />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.5 }}>
                {errorMessage}
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => startScanner(cameras[selectedCamIndex]?.id || null)}
                style={{ fontSize: 12, padding: '6px 14px', marginTop: 4 }}
              >
                Qayta urinish
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions / Camera Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: (hasTorch || cameras.length > 1) ? 'space-between' : 'flex-end',
            padding: '12px 18px',
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Flash/Torch button if supported */}
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                title={torchOn ? 'Chiroqni o‘chirish' : 'Chiroqni yoqish'}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  padding: '6px 12px',
                  color: torchOn ? 'var(--primary, #f59e0b)' : undefined,
                  borderColor: torchOn ? 'var(--primary, #f59e0b)' : undefined,
                }}
              >
                {torchOn ? <Zap size={15} /> : <ZapOff size={15} />}
                <span>{torchOn ? 'Chiroq: Yoqiq' : 'Chiroq'}</span>
              </button>
            )}

            {/* Switch Camera Button if multiple devices */}
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                title="Kamerani almashtirish"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  padding: '6px 12px',
                }}
              >
                <RefreshCw size={14} />
                <span>Kamera #{selectedCamIndex + 1}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ fontSize: 13, fontWeight: 600, padding: '8px 18px', cursor: 'pointer' }}
          >
            Bekor qilish
          </button>
        </div>
      </div>

      <style>{`
        dialog.camera-scanner-dialog::backdrop {
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        @keyframes scannerLaser {
          0% { top: 6%; }
          50% { top: 92%; }
          100% { top: 6%; }
        }
        #${elementId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>
    </dialog>
  );
}
