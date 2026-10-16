import {
  BarcodeFormat, DecodeHintType, BinaryBitmap, HybridBinarizer, RGBLuminanceSource,
  MultiFormatOneDReader, QRCodeReader, DataMatrixReader,
  NotFoundException, ChecksumException, FormatException,
} from '@zxing/library';

const isUnreadableFrame = error => error instanceof NotFoundException
  || error instanceof ChecksumException || error instanceof FormatException;

export function createBarcodeReader() {
  const hints = new Map([
    [DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
      BarcodeFormat.ITF, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
    ]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  const readers = [new MultiFormatOneDReader(hints), new QRCodeReader(), new DataMatrixReader()];

  return {
    decodeFromVideoElement(video, callback) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Camera canvas is unavailable');
      let stopped = false;
      let timer;
      let rotated = false;
      const controls = {
        stop() {
          stopped = true;
          clearTimeout(timer);
          readers.forEach(reader => reader.reset());
          canvas.width = canvas.height = 0;
        },
      };

      const scan = () => {
        if (stopped) return;
        try {
          if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
            // Read video pixels, not the CSS-sized preview. Limit large camera
            // frames to 720p-class work; alternate rotation for vertical barcodes.
            const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
            const width = Math.round(video.videoWidth * scale);
            const height = Math.round(video.videoHeight * scale);
            canvas.width = rotated ? height : width;
            canvas.height = rotated ? width : height;
            if (rotated) {
              context.translate(height, 0);
              context.rotate(Math.PI / 2);
            }
            context.drawImage(video, 0, 0, width, height);
            rotated = !rotated;
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            const luminance = new Uint8ClampedArray(canvas.width * canvas.height);
            for (let i = 0, p = 0; i < luminance.length; i++, p += 4) {
              luminance[i] = (pixels[p] + 2 * pixels[p + 1] + pixels[p + 2]) >> 2;
            }
            const bitmap = new BinaryBitmap(new HybridBinarizer(
              new RGBLuminanceSource(luminance, canvas.width, canvas.height),
            ));
            for (const reader of readers) {
              let result;
              try {
                result = reader.decode(bitmap, hints);
              } catch (error) {
                if (isUnreadableFrame(error)) continue;
                throw error;
              }
              callback(result, undefined, controls);
              break;
            }
          }
        } catch (error) {
          controls.stop();
          callback(undefined, error, controls);
        }
        if (!stopped) timer = setTimeout(scan, 120);
      };
      scan();
      return controls;
    },
  };
}
