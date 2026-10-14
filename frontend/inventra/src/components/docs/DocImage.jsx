import React, { useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

export default function DocImage({ src, caption = '' }) {
  const dialogRef = useRef(null);
  const [zoomed, setZoomed] = useState(false);
  const url = src.startsWith('../rasmlar/focused/')
    ? `/api/v1/docs/images/${src.slice('../rasmlar/focused/'.length)}` : src;
  return <figure className="doc-focus-figure">
    <button type="button" className="doc-focus-trigger" title="Rasmni kattalashtirish / Enlarge" onClick={() => { setZoomed(false); dialogRef.current.showModal(); }}>
      <img src={url} alt={caption || 'Qo‘llanma rasmi'} loading="lazy" />
    </button>
    {caption && <figcaption>{caption}</figcaption>}
    <small>Rasm ustiga bosing — katta ko‘rinishda ochiladi.</small>
    <dialog ref={dialogRef} className="doc-image-dialog" closedby="any" aria-label={caption || 'Rasm / Image'}>
      <div className="doc-image-toolbar"><span>{caption}</span><button type="button" className="btn btn-secondary" onClick={() => setZoomed(!zoomed)} aria-label="Zoom">{zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}</button>
        <button type="button" className="btn btn-secondary" aria-label="Yopish / Close" onClick={() => dialogRef.current.close()}><X size={20} /></button></div>
      <div className="doc-image-scroll"><img src={url} alt={caption} style={{ maxWidth: zoomed ? 'none' : '100%', width: zoomed ? 'auto' : undefined }} /></div>
    </dialog>
  </figure>;
}
