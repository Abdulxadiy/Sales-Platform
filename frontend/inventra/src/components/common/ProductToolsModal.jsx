import { useEffect, useState } from 'react';
import { catalogApi, resolveMediaUrl } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Modal from './Modal';
import PriceInput from './PriceInput';

const emptyVariant = { name: '', unit: 'dona', price_partner: '0', price_min: '0', price_recommended: '0' };

export default function ProductToolsModal({ productId, onClose, onChanged }) {
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [variant, setVariant] = useState(emptyVariant);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setProduct(null);
    setVariant(emptyVariant);
    if (productId) catalogApi.getProduct(productId).then((data) => {
      if (active) setProduct(data);
    }).catch((error) => { if (active) toast.error(error.message); });
    return () => { active = false; };
  }, [productId, toast]);

  const perform = async (operation) => {
    setBusy(true);
    try {
      await operation();
      setProduct(await catalogApi.getProduct(productId));
      onChanged();
      toast.success('Saqlandi');
    } catch (error) { toast.error(error.message || 'Saqlashda xatolik'); }
    finally { setBusy(false); }
  };

  return <Modal isOpen={Boolean(productId)} onClose={onClose} title={product?.name || 'Rasmlar va variantlar'}>
    {product ? <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <h3>Mahsulot rasmlari ({product.gallery_images?.length || 0}/3)</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {(product.gallery_images || []).map((image) => <div key={image.id}>
            <img src={resolveMediaUrl(image.image)} alt={product.name} style={{ width: 100, height: 100, objectFit: 'cover' }} />
            <button className="btn btn-danger" disabled={busy} onClick={() => perform(() => catalogApi.deleteProductImage(productId, image.id))}>Rasmni o‘chirish</button>
          </div>)}
        </div>
        <label>Yangi rasm<input type="file" accept="image/*" disabled={busy || (product.gallery_images?.length || 0) >= 3} onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const form = new FormData();
          form.append('image', file);
          form.append('order', product.gallery_images?.length || 0);
          perform(() => catalogApi.uploadProductImage(productId, form));
          event.target.value = '';
        }} /></label>
      </div>
      <form style={{ display: 'grid', gap: 12 }} onSubmit={(event) => {
        event.preventDefault();
        perform(async () => { await catalogApi.createVariant(productId, variant); setVariant(emptyVariant); });
      }}>
        <h3>Yangi variant qo‘shish</h3>
        <p>Masalan, shu mahsulotning boshqa o‘lchami yoki rangi. Qoldiq keyin ombor kirimida kiritiladi.</p>
        <label>Variant nomi<input className="input-field" required maxLength={150} value={variant.name} onChange={(event) => setVariant({ ...variant, name: event.target.value })} /></label>
        <label>O‘lchov birligi<select className="input-field" value={variant.unit} onChange={(event) => setVariant({ ...variant, unit: event.target.value })}>
          {['dona', 'kg', 'litr', 'metr'].map((unit) => <option key={unit}>{unit}</option>)}
        </select></label>
        {[['price_partner', 'Hamkor narxi'], ['price_min', 'Minimal narx'], ['price_recommended', 'Sotuv narxi']].map(([field, label]) => <label key={field}>{label}<PriceInput min={0} required value={variant[field]} onChange={(event) => setVariant({ ...variant, [field]: event.target.value })} /></label>)}
        <button className="btn btn-primary" disabled={busy}>Variantni saqlash</button>
      </form>
    </div> : <p>Yuklanmoqda...</p>}
  </Modal>;
}
