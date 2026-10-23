import React, { useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

export default function DocImage({ src, caption = '', width, height }) {
  const dialogRef = useRef(null);
  const cardRef = useRef(null);
  const [zoomed, setZoomed] = useState(false);

  const initialUrl = src.startsWith('../rasmlar/focused/')
    ? `/api/v1/docs/images/${src.slice('../rasmlar/focused/'.length)}`
    : src;
  const [imgUrl, setImgUrl] = useState(initialUrl);

  const handleError = () => {
    const filename = src.startsWith('../rasmlar/focused/')
      ? src.slice('../rasmlar/focused/'.length)
      : null;
    if (filename && !imgUrl.startsWith('https://')) {
      setImgUrl(`https://new-dev.site/api/v1/docs/images/${filename}`);
    }
  };

  const handleOpen = () => {
    setZoomed(false);
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  };

  const handleClose = () => {
    if (dialogRef.current && dialogRef.current.open) {
      dialogRef.current.close();
    }
  };

  const handleDialogClick = (e) => {
    if (cardRef.current && !cardRef.current.contains(e.target)) {
      handleClose();
    }
  };

  return (
    <figure className="doc-focus-figure">
      <button
        type="button"
        className="doc-focus-trigger"
        title="Rasmni kattalashtirish"
        onClick={handleOpen}
      >
        <img src={imgUrl} alt={caption || 'Qo‘llanma rasmi'} width={width} height={height} loading="lazy" onError={handleError} />
      </button>

      {caption && <figcaption>{caption}</figcaption>}
      <small>Rasm ustiga bosing — katta ko‘rinishda ochiladi.</small>

      <dialog
        ref={dialogRef}
        className="doc-image-dialog"
        onClick={handleDialogClick}
        aria-label={caption || 'Rasm'}
      >
        <div ref={cardRef} className="doc-image-card">
          <div className="doc-image-toolbar">
            <span title={caption}>{caption}</span>
            <div className="doc-image-toolbar-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setZoomed(!zoomed)}
                aria-label={zoomed ? "Kichiklashtirish" : "Kattalashtirish"}
                title={zoomed ? "Asl hajmga qaytarish" : "Yaqinlashtirish"}
              >
                {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                aria-label="Yopish"
                title="Yopish"
                onClick={handleClose}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="doc-image-scroll">
            <img
              src={imgUrl}
              alt={caption}
              className={zoomed ? 'is-zoomed' : ''}
              onClick={() => setZoomed(!zoomed)}
              title={zoomed ? "Kichiklashtirish uchun bosing" : "Yaqinlashtirish uchun bosing"}
              onError={handleError}
            />
          </div>
        </div>
      </dialog>
    </figure>
  );
}
