import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

// The real decoder reads generated video frames; no barcode callback is mocked.
window.cameraQA = { requests: [], streams: [], scans: [], closes: 0, delay: 0, failure: null, granted: 0 };
const qa = window.cameraQA;
window.BarcodeDetector = class { constructor() { throw new Error('Native detector unavailable'); } };
const frame = document.createElement('canvas'); frame.width = 1280; frame.height = 720;
const context = frame.getContext('2d');
qa.blank = () => { context.fillStyle = '#fff'; context.fillRect(0, 0, frame.width, frame.height); };
qa.blank();
// Keep the simulated camera producing frames, including after a code changes.
setInterval(() => context.fillRect(0, 0, 1, 1), 50);
qa.barcode = async (code, format = 'EAN13', rotated = false) => {
  qa.blank();
  const label = document.createElement('canvas');
  if (format === 'QR') await QRCode.toCanvas(label, code, { width: 280, margin: 4 });
  else JsBarcode(label, code, { format, width: 3, height: 160, margin: 30, displayValue: false });
  context.save(); context.translate(frame.width / 2, frame.height / 2);
  if (rotated) context.rotate(Math.PI / 2);
  context.drawImage(label, -label.width / 2, -label.height / 2); context.restore();
};
Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async constraints => {
  qa.requests.push(constraints);
  await new Promise(resolve => setTimeout(resolve, qa.delay));
  if (qa.failure) throw new DOMException('Test camera error', qa.failure);
  const stream = frame.captureStream(15);
  const track = stream.getVideoTracks()[0];
  const deviceId = constraints.video.deviceId?.exact || 'back-camera';
  track.getSettings = () => ({ deviceId });
  track.getCapabilities = () => ({ torch: true, focusMode: ['continuous'] });
  track.applyConstraints = async constraints => { qa.trackConstraints = constraints; };
  qa.streams.push(stream); qa.granted++; return stream;
} });
Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', { value: async () => [
  { kind: 'videoinput', deviceId: 'back-camera', label: 'Back camera' },
  { kind: 'videoinput', deviceId: 'front-camera', label: 'Front camera' },
] });
