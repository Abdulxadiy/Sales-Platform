import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Archive,
  Image as ImageIcon,
  Tag,
  DollarSign,
  Barcode,
  Layers,
  Sparkles,
  Info,
  Trash2,
  FolderTree,
  X,
  Check,
  PackagePlus,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { catalogApi, resolveMediaUrl } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { usePersistedState } from '../hooks/usePersistedState';

const defaultProductForm = {
  name: '',
  category_id: '',
  unit: 'dona',
  variant_name: 'Standart',
  code: '',
  price_partner: '',
  price_min: '',
  price_recommended: '',
  do_intake: false,
  intake_quantity: '',
  intake_cost_price: '',
  intake_supplier: '',
  intake_note: '',
};

const defaultCategoryForm = {
  name: '',
  kod: '',
  parent_id: '',
  currency: 'UZS',
};

export default function Catalog() {
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [manageCategoriesModalOpen, setManageCategoriesModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editProductModalOpen, setEditProductModalOpen] = useState(false);
  const [editPriceModalOpen, setEditPriceModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Forms - Persisted Drafts
  const [productForm, setProductForm, resetProductForm] = usePersistedState(
    'inventra_draft_product',
    defaultProductForm
  );
  const [productImage, setProductImage] = useState(null);

  const [categoryForm, setCategoryForm, resetCategoryForm] = usePersistedState(
    'inventra_draft_category',
    defaultCategoryForm
  );

  const [editCategoryForm, setEditCategoryForm] = useState({
    name: '',
    kod: '',
    parent_id: '',
    currency: 'UZS',
  });

  const [editProductForm, setEditProductForm] = useState({
    product_id: null,
    variant_id: null,
    name: '',
    category_id: '',
    unit: 'dona',
    code: '',
    barcode: '',
    price_partner: '',
    price_min: '',
    price_recommended: '',
    current_image: null,
  });
  const [editProductImage, setEditProductImage] = useState(null);

  const [priceForm, setPriceForm] = useState({
    price_recommended: '',
    price_min: '',
    price_partner: '',
    barcode: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await catalogApi.getCategories();
      const list = res.results || res;
      setCategories(Array.isArray(list) ? list : []);
    } catch {
      // ignore
    }
  }, []);

  const loadVariants = useCallback(async (cat = '', query = '') => {
    setLoading(true);
    try {
      const res = await catalogApi.getVariants({
        category: cat || undefined,
        search: query || undefined,
      });
      const list = res.results || res;
      setVariants(Array.isArray(list) ? list : []);
    } catch {
      toast.error('Katalogni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadVariants();
  }, [loadCategories, loadVariants]);

  useEffect(() => {
    if (searchParams.get('new') === '1' || searchParams.get('action') === 'new_product') {
      setProductModalOpen(true);
      if (searchParams.get('intake') === '1') {
        setProductForm((prev) => ({ ...prev, do_intake: true }));
      }
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('new');
      newParams.delete('action');
      newParams.delete('intake');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, setProductForm]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    loadVariants(selectedCat, val);
  };

  const handleCatChange = (e) => {
    const val = e.target.value;
    setSelectedCat(val);
    loadVariants(val, search);
  };

  const formatPrice = (val, cur = 'UZS') => {
    const n = Number(val || 0);
    return cur === 'USD'
      ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${n.toLocaleString('uz-UZ')} UZS`;
  };

  const formatUZS = (val) => formatPrice(val, 'UZS');

  const calculateSuggestedCode = (catId, minPrice) => {
    const cat = categories.find((c) => c.id === parseInt(catId, 10));
    if (!cat) return '';
    const thousands = Math.floor(Number(minPrice || 0) / (cat.currency === 'USD' ? 1 : 1000));
    if (cat.parent) {
      const parent = categories.find((p) => p.id === cat.parent);
      return `${parent?.kod || '01'}/${cat.kod || '01'}/${thousands}`;
    }
    return `${cat.kod || '01'}/${thousands}`;
  };

  const handleProductCategoryChange = (catId) => {
    const newCode = calculateSuggestedCode(catId, productForm.price_min);
    setProductForm((prev) => ({
      ...prev,
      category_id: catId,
      code: prev.code && prev.category_id ? prev.code : newCode,
    }));
  };

  const handleProductMinPriceChange = (val) => {
    setProductForm((prev) => {
      let newCode = prev.code;
      if (prev.category_id && (!prev.code || prev.code.includes('/'))) {
        const parts = prev.code.split('/');
        const cat = categories.find((c) => c.id === parseInt(prev.category_id, 10));
        const thousands = Math.floor(Number(val || 0) / (cat?.currency === 'USD' ? 1 : 1000));
        if (parts.length >= 2) {
          parts[parts.length - 1] = thousands;
          newCode = parts.join('/');
        } else {
          newCode = calculateSuggestedCode(prev.category_id, val);
        }
      }
      return { ...prev, price_min: val, code: newCode };
    });
  };

  const handleParentCategoryChange = (e) => {
    const parentId = typeof e === 'object' && e !== null && 'target' in e ? e.target.value : e;
    if (parentId) {
      const parent = categories.find((c) => c.id === parseInt(parentId, 10));
      setCategoryForm((prev) => ({
        ...prev,
        parent_id: parentId,
        currency: parent?.currency || 'UZS',
      }));
    } else {
      setCategoryForm((prev) => ({
        ...prev,
        parent_id: '',
      }));
    }
  };

  const getCategoryLabel = (c) => {
    if (c.parent) {
      const parent = categories.find((p) => p.id === c.parent);
      return `${parent ? parent.name + ' > ' : ''}${c.name} [${parent ? parent.kod + '/' : ''}${c.kod}] (${c.currency})`;
    }
    return `${c.name} [${c.kod}] (${c.currency})`;
  };

  // Create Product Submit
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.category_id) {
      toast.warning('Mahsulot nomi va kategoriyasini tanlang');
      return;
    }

    if (productForm.do_intake) {
      if (!productForm.intake_quantity || parseFloat(productForm.intake_quantity) <= 0) {
        toast.warning('Kirim miqdorini to‘g‘ri kiriting');
        return;
      }
      if (productForm.intake_cost_price === '' || parseFloat(productForm.intake_cost_price) < 0) {
        toast.warning('Tovar tan narxini (asl narxini) kiriting');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (productImage) {
        const formData = new FormData();
        formData.append('name', productForm.name.trim());
        formData.append('category_id', productForm.category_id);
        formData.append('unit', productForm.unit);
        formData.append('variant_name', productForm.variant_name || 'Standart');
        if (productForm.code.trim()) {
          formData.append('code', productForm.code.trim());
        }
        formData.append('price_partner', productForm.price_partner || '0');
        formData.append('price_min', productForm.price_min || '0');
        formData.append('price_recommended', productForm.price_recommended || '0');
        formData.append('image', productImage);

        if (productForm.do_intake) {
          formData.append('initial_quantity', productForm.intake_quantity);
          formData.append('initial_cost_price', productForm.intake_cost_price);
          if (productForm.intake_supplier?.trim()) {
            formData.append('supplier', productForm.intake_supplier.trim());
          }
          if (productForm.intake_note?.trim()) {
            formData.append('intake_note', productForm.intake_note.trim());
          }
        }

        await catalogApi.createProduct(formData);
      } else {
        const payload = {
          name: productForm.name.trim(),
          category_id: parseInt(productForm.category_id, 10),
          unit: productForm.unit,
          variant_name: productForm.variant_name || 'Standart',
          code: productForm.code.trim() || undefined,
          price_partner: parseFloat(productForm.price_partner || 0),
          price_min: parseFloat(productForm.price_min || 0),
          price_recommended: parseFloat(productForm.price_recommended || 0),
        };

        if (productForm.do_intake) {
          payload.initial_quantity = parseFloat(productForm.intake_quantity);
          payload.initial_cost_price = parseFloat(productForm.intake_cost_price);
          if (productForm.intake_supplier?.trim()) {
            payload.supplier = productForm.intake_supplier.trim();
          }
          if (productForm.intake_note?.trim()) {
            payload.intake_note = productForm.intake_note.trim();
          }
        }

        await catalogApi.createProduct(payload);
      }

      if (productForm.do_intake) {
        toast.success(`"${productForm.name}" yaratildi va ${productForm.intake_quantity} ${productForm.unit} omborga kirim qilindi!`);
      } else {
        toast.success(`"${productForm.name}" mahsuloti muvaffaqiyatli yaratildi!`);
      }
      setProductModalOpen(false);
      resetProductForm();
      setProductImage(null);
      loadVariants(selectedCat, search);
    } catch (err) {
      toast.error(err.message || 'Mahsulotni saqlashda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Category Submit
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.warning('Kategoriya nomini kiriting');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        currency: categoryForm.currency,
      };
      if (categoryForm.kod.trim()) {
        payload.kod = categoryForm.kod.trim();
      }
      if (categoryForm.parent_id) {
        payload.parent_id = parseInt(categoryForm.parent_id, 10);
      }

      await catalogApi.createCategory(payload);

      toast.success('Yangi kategoriya yaratildi!');
      setCategoryModalOpen(false);
      resetCategoryForm();
      loadCategories();
    } catch (err) {
      toast.error(err.message || 'Kategoriyani yaratishda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Price Modal
  const openEditPrice = (variant) => {
    setSelectedVariant(variant);
    setPriceForm({
      price_recommended: variant.price_recommended || '',
      price_min: variant.price_min || '',
      price_partner: variant.price_partner || '',
      barcode: variant.barcode || '',
    });
    setEditPriceModalOpen(true);
  };

  // Update Price Submit
  const handlePriceUpdate = async (e) => {
    e.preventDefault();
    if (!selectedVariant) return;

    setSubmitting(true);
    try {
      await catalogApi.updateVariant(selectedVariant.id, {
        price_recommended: parseFloat(priceForm.price_recommended),
        price_min: parseFloat(priceForm.price_min),
        price_partner: parseFloat(priceForm.price_partner),
        barcode: priceForm.barcode.trim() || undefined,
      });

      toast.success('Tovar narxi muvaffaqiyatli yangilandi!');
      setEditPriceModalOpen(false);
      loadVariants(selectedCat, search);
    } catch (err) {
      toast.error(err.message || 'Narxni yangilashda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  // Archive Variant
  const handleArchive = async (id, name) => {
    const isConfirmed = await confirm({
      title: 'Tovarni arxivlash',
      message: `"${name}" tovarini arxivga o‘tkazmoqchimisiz? Arxivlangan tovarlar POS kassada ko‘rinmaydi.`,
      confirmText: 'Arxivga o‘tkazish',
      cancelText: 'Bekor qilish',
      type: 'warning',
    });
    if (!isConfirmed) return;
    try {
      await catalogApi.archiveVariant(id);
      toast.info('Tovar arxivlandi');
      loadVariants(selectedCat, search);
    } catch (err) {
      toast.error(err.message || 'Arxivlashda xatolik');
    }
  };

  // Category Edit & Delete Handlers
  const handleStartEditCategory = (cat) => {
    setEditingCategory(cat);
    setEditCategoryForm({
      name: cat.name || '',
      kod: cat.kod || '',
      parent_id: cat.parent ? String(cat.parent) : '',
      currency: cat.currency || 'UZS',
    });
  };

  const handleSaveEditCategory = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editCategoryForm.name.trim()) {
      toast.warning('Kategoriya nomini kiriting');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: editCategoryForm.name.trim(),
        currency: editCategoryForm.currency,
      };
      if (editCategoryForm.kod.trim()) {
        payload.kod = editCategoryForm.kod.trim();
      }
      if (editCategoryForm.parent_id) {
        payload.parent_id = parseInt(editCategoryForm.parent_id, 10);
        payload.clear_parent = false;
      } else if (editingCategory.parent) {
        payload.clear_parent = true;
      }

      await catalogApi.updateCategory(editingCategory.id, payload);
      toast.success('Kategoriya muvaffaqiyatli yangilandi!');
      setEditingCategory(null);
      await loadCategories();
      await loadVariants(selectedCat, search);
    } catch (err) {
      toast.error(err.message || 'Kategoriyani yangilashda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const isConfirmed = await confirm({
      title: 'Kategoriyani o‘chirish',
      message: `"${cat.name}" kategoriyasini o‘chirmoqchimisiz? Agar ushbu kategoriyada faol mahsulotlar yoki subkategoriyalar mavjud bo‘lsa, tizim xavfsizlik maqsadida o‘chirishni rad etadi.`,
      confirmText: 'O‘chirish',
      cancelText: 'Bekor qilish',
      type: 'danger',
    });
    if (!isConfirmed) return;
    try {
      await catalogApi.deleteCategory(cat.id);
      toast.success(`"${cat.name}" kategoriyasi muvaffaqiyatli o‘chirildi`);
      if (editingCategory?.id === cat.id) {
        setEditingCategory(null);
      }
      await loadCategories();
      await loadVariants(selectedCat, search);
    } catch (err) {
      toast.error(err.message || 'Kategoriyani o‘chirishda xatolik');
    }
  };

  // Product Edit & Delete Handlers
  const handleOpenEditProduct = (v) => {
    setEditProductImage(null);
    setEditProductForm({
      product_id: v.product,
      variant_id: v.id,
      name: v.product_name,
      category_id: v.category_id ? String(v.category_id) : '',
      unit: v.unit || 'dona',
      code: v.code || '',
      barcode: v.barcode || '',
      price_partner: v.price_partner || '',
      price_min: v.price_min || '',
      price_recommended: v.price_recommended || '',
      current_image: v.image,
    });
    setEditProductModalOpen(true);
  };

  const handleEditProductCategoryChange = (catId) => {
    const newCode = calculateSuggestedCode(catId, editProductForm.price_min);
    setEditProductForm((prev) => ({
      ...prev,
      category_id: catId,
      code: prev.code && prev.category_id ? prev.code : newCode,
    }));
  };

  const handleEditProductMinPriceChange = (val) => {
    setEditProductForm((prev) => {
      let newCode = prev.code;
      if (prev.category_id && (!prev.code || prev.code.includes('/'))) {
        const parts = prev.code.split('/');
        const cat = categories.find((c) => c.id === parseInt(prev.category_id, 10));
        const thousands = Math.floor(Number(val || 0) / (cat?.currency === 'USD' ? 1 : 1000));
        if (parts.length >= 2) {
          parts[parts.length - 1] = thousands;
          newCode = parts.join('/');
        } else {
          newCode = calculateSuggestedCode(prev.category_id, val);
        }
      }
      return { ...prev, price_min: val, code: newCode };
    });
  };

  const handleSaveEditProduct = async (e) => {
    e.preventDefault();
    if (!editProductForm.name.trim() || !editProductForm.category_id) {
      toast.warning('Mahsulot nomi va kategoriyasini tanlang');
      return;
    }
    setSubmitting(true);
    try {
      if (editProductImage) {
        const formData = new FormData();
        formData.append('name', editProductForm.name.trim());
        formData.append('category_id', editProductForm.category_id);
        formData.append('variant_id', editProductForm.variant_id);
        formData.append('unit', editProductForm.unit);
        if (editProductForm.code.trim()) {
          formData.append('code', editProductForm.code.trim());
        }
        if (editProductForm.barcode.trim()) {
          formData.append('barcode', editProductForm.barcode.trim());
        }
        formData.append('price_partner', editProductForm.price_partner || '0');
        formData.append('price_min', editProductForm.price_min || '0');
        formData.append('price_recommended', editProductForm.price_recommended || '0');
        formData.append('image', editProductImage);

        await catalogApi.updateProduct(editProductForm.product_id, formData);
      } else {
        const payload = {
          name: editProductForm.name.trim(),
          category_id: parseInt(editProductForm.category_id, 10),
          variant_id: editProductForm.variant_id,
          unit: editProductForm.unit,
          code: editProductForm.code.trim() || undefined,
          barcode: editProductForm.barcode.trim() || undefined,
          price_partner: parseFloat(editProductForm.price_partner || 0),
          price_min: parseFloat(editProductForm.price_min || 0),
          price_recommended: parseFloat(editProductForm.price_recommended || 0),
        };
        await catalogApi.updateProduct(editProductForm.product_id, payload);
      }

      toast.success(`"${editProductForm.name}" mahsuloti muvaffaqiyatli yangilandi!`);
      setEditProductModalOpen(false);
      setEditProductImage(null);
      await loadVariants(selectedCat, search);
    } catch (err) {
      toast.error(err.message || 'Mahsulotni yangilashda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (v) => {
    const isConfirmed = await confirm({
      title: 'Mahsulotni o‘chirish',
      message: `"${v.product_name}" mahsulotini o‘chirmoqchimisiz? Agar ushbu mahsulot bo‘yicha savdo yoki ombor harakati bo‘lsa, moliyaviy audit uchun u arxivlanadi. Agar savdo tarixi bo‘lmasa, tizimdan butunlay o‘chiriladi.`,
      confirmText: 'O‘chirish',
      cancelText: 'Bekor qilish',
      type: 'danger',
    });
    if (!isConfirmed) return;
    try {
      await catalogApi.deleteProduct(v.product);
      toast.success(`"${v.product_name}" mahsuloti o‘chirildi`);
      await loadVariants(selectedCat, search);
    } catch (err) {
      toast.error(err.message || 'Mahsulotni o‘chirishda xatolik');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Action Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Mahsulotlar & Tovar Nomenklaturasi
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Narxlar, shtrix-kodlar, MinIO rasmlari va qoldiqlar nazorati
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setManageCategoriesModalOpen(true)}
            className="btn btn-secondary"
            title="Kategoriyalarni ko‘rish, tahrirlash va o‘chirish"
          >
            <FolderTree size={16} />
            <span>Kategoriyalarni Boshqarish</span>
          </button>

          <button
            onClick={() => setCategoryModalOpen(true)}
            className="btn btn-secondary"
          >
            <Tag size={16} />
            <span>+ Kategoriya</span>
          </button>

          <button
            onClick={() => setProductModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Yangi Tovar</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search
            size={18}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 14, top: 13 }}
          />
          <input
            type="text"
            placeholder="Tovar nomi, 3 bosqichli kod yoki shtrix-kod bo‘yicha tezkor qidiruv..."
            value={search}
            onChange={handleSearch}
            className="input-field"
            style={{ paddingLeft: 42 }}
          />
        </div>

        <CustomSelect
          value={selectedCat}
          onChange={(val) => {
            handleCatChange({ target: { value: val } });
          }}
          options={[
            { value: '', label: 'Barcha kategoriyalar' },
            ...categories.map((c) => ({
              value: c.id,
              label: getCategoryLabel(c),
            })),
          ]}
          size="md"
          style={{ minWidth: 230 }}
        />
      </div>

      {/* Variants / Products Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 18,
        }}
      >
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            Tovarlar yuklanmoqda...
          </div>
        ) : variants.length === 0 ? (
          <div
            className="glass-card"
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Package size={44} color="var(--primary)" />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Hech qanday tovar topilmadi
            </span>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Katalogga birinchi tovaringizni qo‘shish uchun yuqoridagi tugmani bosing
            </p>
            <button
              onClick={() => setProductModalOpen(true)}
              className="btn btn-primary"
              style={{ marginTop: 8 }}
            >
              + Birinchi Tovarni Qo‘shish
            </button>
          </div>
        ) : (
          variants.map((v) => {
            const stockQty = parseFloat(v.stock_quantity || 0);
            const isOutOfStock = stockQty <= 0;

            return (
              <div
                key={v.id}
                className="glass-card interactive"
                style={{
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  position: 'relative',
                }}
              >
                {/* Product Image / Icon Banner */}
                <div
                  style={{
                    height: 165,
                    borderRadius: 12,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    padding: 8,
                  }}
                >
                  {v.image ? (
                    <img
                      src={resolveMediaUrl(v.image)}
                      alt={v.product_name}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  ) : null}
                  <div
                    className="fallback-icon"
                    style={{
                      display: v.image ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    <Package size={40} color="var(--primary)" opacity={0.6} />
                  </div>

                  {/* Stock Pill Badge */}
                  <span
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: isOutOfStock
                        ? 'rgba(244, 63, 94, 0.9)'
                        : 'rgba(16, 185, 129, 0.9)',
                      color: '#fff',
                    }}
                  >
                    {stockQty} {v.unit || 'dona'}
                  </span>
                </div>

                {/* Info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                      {v.category_name || 'Kategoriyasiz'}
                    </span>
                    {v.code && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: 'var(--primary)',
                          fontFamily: 'monospace',
                        }}
                        title="3 Bosqichli Kod (Kategoriya/Subkategoriya/Narx)"
                      >
                        Kod: {v.code}
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0 2px', color: 'var(--text-primary)' }}>
                    {v.product_name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Variant: {v.name}
                    </div>
                    {v.barcode && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          fontFamily: 'monospace',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title={`Shtrix-kod: ${v.barcode}`}
                      >
                        <Barcode size={13} opacity={0.7} />
                        <span>{v.barcode}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prices */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-chip)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sotuv narxi</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>
                      {formatPrice(v.price_recommended, v.currency)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Minimal narx</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {formatPrice(v.price_min, v.currency)}
                    </div>
                  </div>
                </div>

                {/* Extra info: Hamkor narxi & Barcode */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>Hamkor narxi (1-narx): <strong style={{ color: 'var(--text-secondary)' }}>{formatPrice(v.price_partner, v.currency)}</strong></span>
                  {v.barcode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Barcode size={13} color="var(--primary)" />
                      <span>{v.barcode}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
                  <button
                    onClick={() => handleOpenEditProduct(v)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '7px 10px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    title="Mahsulot ma‘lumotlari va narxlarni tahrirlash"
                  >
                    <Edit2 size={13} />
                    <span>Tahrirlash</span>
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(v)}
                    className="btn btn-danger"
                    style={{ padding: '7px 10px' }}
                    title="Mahsulotni o‘chirish"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Product Modal */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title="Yangi Mahsulot Qo‘shish"
        maxWidth={640}
      >
        <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Mahsulot Nomi <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Masalan: Coca Cola 1.5L"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Kategoriya <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <CustomSelect
                value={productForm.category_id}
                onChange={(val) => handleProductCategoryChange(val)}
                placeholder="Tanlang..."
                options={categories.map((c) => ({
                  value: c.id,
                  label: getCategoryLabel(c),
                }))}
                fullWidth
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                O‘lchov Birligi
              </label>
              <CustomSelect
                value={productForm.unit}
                onChange={(val) => setProductForm({ ...productForm, unit: val })}
                options={[
                  { value: 'dona', label: 'Dona' },
                  { value: 'kg', label: 'Kilogramm (kg)' },
                  { value: 'litr', label: 'Litr' },
                  { value: 'metr', label: 'Metr' },
                ]}
                fullWidth
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                3 Bosqichli Kod (Kategoriya / Subkategoriya / Narx)
              </label>
              <button
                type="button"
                onClick={() => {
                  const code = calculateSuggestedCode(productForm.category_id, productForm.price_min);
                  setProductForm((prev) => ({ ...prev, code }));
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Kategoriya va minimal narx bo‘yicha kodni qayta hisoblash"
              >
                <Sparkles size={13} />
                <span>Avto-kod</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="Masalan: 01/02/11"
              value={productForm.code}
              onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
              className="input-field"
              style={{ fontFamily: 'monospace', fontWeight: 600 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Format: {`{Ota kategoriya}/{Subkategoriya}/{Min narx // 1000}`} (erkin tahrirlash mumkin)
            </span>
          </div>

          {(() => {
            const selectedCatObj = categories.find((c) => c.id === parseInt(productForm.category_id, 10));
            const cur = selectedCatObj?.currency || 'UZS';

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Hamkor Narxi ({cur}) <span style={{ color: 'var(--accent-rose)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="10000"
                      value={productForm.price_partner}
                      onChange={(e) => setProductForm({ ...productForm, price_partner: e.target.value })}
                      className="input-field"
                      required
                    />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                      1-narx (ulgurji)
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Minimal Narx ({cur}) <span style={{ color: 'var(--accent-rose)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="11000"
                      value={productForm.price_min}
                      onChange={(e) => handleProductMinPriceChange(e.target.value)}
                      className="input-field"
                      required
                    />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                      Chegara narxi
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Sotuv Narxi ({cur}) <span style={{ color: 'var(--accent-rose)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="13000"
                      value={productForm.price_recommended}
                      onChange={(e) => setProductForm({ ...productForm, price_recommended: e.target.value })}
                      className="input-field"
                      required
                    />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                      Tavsiya narx
                    </span>
                  </div>
                </div>

                {/* Immediate Stock Intake Option */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: productForm.do_intake ? '1px solid var(--primary)' : '1px solid var(--border-card)',
                    background: productForm.do_intake ? 'var(--bg-surface-elevated, var(--bg-card))' : 'var(--bg-card)',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={() => setProductForm((prev) => ({ ...prev, do_intake: !prev.do_intake }))}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="checkbox"
                        id="do_intake_checkbox"
                        checked={!!productForm.do_intake}
                        onChange={(e) => setProductForm((prev) => ({ ...prev, do_intake: e.target.checked }))}
                        style={{ width: 17, height: 17, cursor: 'pointer', accentColor: 'var(--primary)' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <label
                          htmlFor="do_intake_checkbox"
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <PackagePlus size={16} color="var(--primary)" />
                          <span>Darhol omborga kirim qilish (Boshlang‘ich qoldiq)</span>
                        </label>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Yangi tovar yaratilishi bilan uning miqdori va tan narxini omborga qabul qilish
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: productForm.do_intake ? 'var(--primary)' : 'var(--bg-chip)',
                        color: productForm.do_intake ? 'var(--primary-foreground)' : 'var(--text-muted)',
                      }}
                    >
                      {productForm.do_intake ? 'KIRIM QILINADI' : 'KIRIMSIZ'}
                    </span>
                  </div>

                  {/* Intake fields */}
                  {productForm.do_intake && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        paddingTop: 12,
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                            Kirim Miqdori ({productForm.unit || 'dona'}) <span style={{ color: 'var(--accent-rose)' }}>*</span>
                          </label>
                          <input
                            type="number"
                            step={productForm.unit === 'dona' ? '1' : '0.001'}
                            min={productForm.unit === 'dona' ? '1' : '0.001'}
                            placeholder={productForm.unit === 'dona' ? 'Masalan: 10' : 'Masalan: 10.5'}
                            value={productForm.intake_quantity}
                            onChange={(e) => setProductForm((prev) => ({ ...prev, intake_quantity: e.target.value }))}
                            className="input-field"
                            required={productForm.do_intake}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                            Asl Narx / Tan Narxi ({cur}) <span style={{ color: 'var(--accent-rose)' }}>*</span>
                          </label>
                          <input
                            type="number"
                            step={cur === 'USD' ? '0.01' : '1'}
                            min="0"
                            placeholder={cur === 'USD' ? 'Masalan: 10' : 'Masalan: 45000'}
                            value={productForm.intake_cost_price}
                            onChange={(e) => setProductForm((prev) => ({ ...prev, intake_cost_price: e.target.value }))}
                            className="input-field"
                            required={productForm.do_intake}
                          />
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                            Omborga kirim qilinadigan faktura narxi
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                            Ta’minotchi (Yetkazib beruvchi)
                          </label>
                          <input
                            type="text"
                            placeholder="Masalan: Global Trade MCHJ yoki Baza"
                            value={productForm.intake_supplier}
                            onChange={(e) => setProductForm((prev) => ({ ...prev, intake_supplier: e.target.value }))}
                            className="input-field"
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                            Faktura raqami / Izoh
                          </label>
                          <input
                            type="text"
                            placeholder="Masalan: Faktura #1084"
                            value={productForm.intake_note}
                            onChange={(e) => setProductForm((prev) => ({ ...prev, intake_note: e.target.value }))}
                            className="input-field"
                          />
                        </div>
                      </div>

                      {parseFloat(productForm.intake_quantity || 0) > 0 && parseFloat(productForm.intake_cost_price || 0) > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'var(--bg-input)',
                            border: '1px dashed var(--border-card)',
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: 'var(--text-secondary)' }}>Jami kirim tovar partiyasi qiymati:</span>
                          <strong style={{ color: 'var(--primary)', fontSize: 13 }}>
                            {(parseFloat(productForm.intake_quantity) * parseFloat(productForm.intake_cost_price)).toLocaleString()} {cur}
                          </strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!productForm.do_intake && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: 12,
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Info size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>
                      Mahsulotning <strong>tannarxi</strong> ombor orqali tovar kirim qilinganda faktura narxiga qarab belgilanadi.
                    </span>
                  </div>
                )}
              </>
            );
          })()}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Mahsulot Rasmi (MinIO Cloud Saqlash)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProductImage(e.target.files[0] || null)}
              className="input-field"
              style={{ padding: '8px 12px' }}
            />
            {productImage && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                  src={URL.createObjectURL(productImage)}
                  alt="Preview"
                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {productImage.name} ({Math.round(productImage.size / 1024)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => setProductImage(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-rose)',
                    fontSize: 12,
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  Rasmni o‘chirish
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div>
              {(productForm.name || productForm.category_id || productForm.code || productForm.price_min || productForm.price_recommended || productImage) && (
                <button
                  type="button"
                  onClick={() => {
                    resetProductForm();
                    setProductImage(null);
                    toast.info('Mahsulot qoralamasi tozalandi');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-rose)',
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: '6px 0',
                    textDecoration: 'underline',
                  }}
                >
                  Qoralamani tozalash
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="btn btn-secondary"
              >
                Bekor Qilish
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Saqlanmoqda...' : 'Mahsulotni Yaratish'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Create Category Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Yangi Kategoriya Qo‘shish"
      >
        <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Ota Kategoriya (Ixtiyoriy)
            </label>
            <CustomSelect
              value={categoryForm.parent_id}
              onChange={handleParentCategoryChange}
              placeholder="(Ota kategoriya yo‘q — Asosiy Kategoriya)"
              options={[
                { value: '', label: '(Ota kategoriya yo‘q — Asosiy Kategoriya)' },
                ...categories
                  .filter((c) => !c.parent)
                  .map((c) => ({
                    value: c.id,
                    label: `${c.name} [Kod: ${c.kod}] (${c.currency})`,
                  })),
              ]}
              fullWidth
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Faqat asosiy kategoriyalar ota kategoriya bo‘la oladi (2 bosqichli ierarxiya)
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Kategoriya Nomi <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Masalan: Ichimliklar yoki Gazli suvlar..."
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Kategoriya Kodi (Ixtiyoriy)
              </label>
              <input
                type="text"
                placeholder="Masalan: 01"
                value={categoryForm.kod}
                onChange={(e) => setCategoryForm({ ...categoryForm, kod: e.target.value })}
                className="input-field"
                style={{ fontFamily: 'monospace' }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Bo‘sh qolsa avtomatik beriladi
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Valyuta <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <CustomSelect
                value={categoryForm.currency}
                onChange={(val) => setCategoryForm({ ...categoryForm, currency: val })}
                disabled={Boolean(categoryForm.parent_id)}
                options={[
                  { value: 'UZS', label: 'UZS (So‘m)' },
                  { value: 'USD', label: 'USD (AQSH Dollari)' },
                ]}
                fullWidth
              />
              {categoryForm.parent_id && (
                <span style={{ fontSize: 11, color: 'var(--accent-emerald, #10b981)', marginTop: 4, display: 'block' }}>
                  ✓ Ota kategoriyadan meros olindi
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div>
              {(categoryForm.name || categoryForm.kod) && (
                <button
                  type="button"
                  onClick={() => {
                    resetCategoryForm();
                    toast.info('Kategoriya qoralamasi tozalandi');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-rose)',
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: '6px 0',
                    textDecoration: 'underline',
                  }}
                >
                  Qoralamani tozalash
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="btn btn-secondary"
              >
                Bekor Qilish
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Yaratilmoqda...' : 'Kategoriyani Saqlash'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Price Modal */}
      <Modal
        isOpen={editPriceModalOpen}
        onClose={() => setEditPriceModalOpen(false)}
        title={`Narxlarni Tahrirlash: ${selectedVariant?.product_name || ''}`}
      >
        <form onSubmit={handlePriceUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Tavsiya Etilgan Sotuv Narxi ({selectedVariant?.currency || 'UZS'}) <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="number"
              value={priceForm.price_recommended}
              onChange={(e) => setPriceForm({ ...priceForm, price_recommended: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Hamkor Narxi (1-narx) ({selectedVariant?.currency || 'UZS'}) <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="number"
                value={priceForm.price_partner}
                onChange={(e) => setPriceForm({ ...priceForm, price_partner: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Minimal Chegara Narxi ({selectedVariant?.currency || 'UZS'}) <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="number"
                value={priceForm.price_min}
                onChange={(e) => setPriceForm({ ...priceForm, price_min: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Shtrix-Kod (Skaner uchun)
            </label>
            <input
              type="text"
              placeholder="Masalan: 4780001234567"
              value={priceForm.barcode}
              onChange={(e) => setPriceForm({ ...priceForm, barcode: e.target.value })}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setEditPriceModalOpen(false)}
              className="btn btn-secondary"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? 'Saqlanmoqda...' : 'Narxni Yangilash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manage Categories Modal */}
      <Modal
        isOpen={manageCategoriesModalOpen}
        onClose={() => {
          setManageCategoriesModalOpen(false);
          setEditingCategory(null);
        }}
        title="Kategoriyalarni Boshqarish"
        maxWidth={700}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Subheading / Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                Barcha asosiy va subkategoriyalar ierarxiyasi (Jami: {categories.length} ta)
              </p>
            </div>
            <button
              onClick={() => {
                setManageCategoriesModalOpen(false);
                setCategoryModalOpen(true);
              }}
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              <Plus size={14} />
              <span>Yangi Kategoriya</span>
            </button>
          </div>

          {/* Edit Category Form (when editingCategory is active) */}
          {editingCategory && (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit2 size={15} />
                  Kategoriyani Tahrirlash: {editingCategory.name}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditCategory} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Kategoriya Nomi <span style={{ color: 'var(--accent-rose)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={editCategoryForm.name}
                      onChange={(e) => setEditCategoryForm({ ...editCategoryForm, name: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Kategoriya Kodi
                    </label>
                    <input
                      type="text"
                      value={editCategoryForm.kod}
                      onChange={(e) => setEditCategoryForm({ ...editCategoryForm, kod: e.target.value })}
                      className="input-field"
                      style={{ fontFamily: 'monospace' }}
                      placeholder="Masalan: 01"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Ota Kategoriya
                    </label>
                    <CustomSelect
                      value={editCategoryForm.parent_id}
                      onChange={(val) => {
                        const pId = val;
                        const parent = categories.find((c) => c.id === parseInt(pId, 10));
                        setEditCategoryForm({
                          ...editCategoryForm,
                          parent_id: pId,
                          currency: parent ? parent.currency : editCategoryForm.currency,
                        });
                      }}
                      placeholder="(Asosiy Kategoriya — Ota kategoriya yo‘q)"
                      options={[
                        { value: '', label: '(Asosiy Kategoriya — Ota kategoriya yo‘q)' },
                        ...categories
                          .filter((c) => !c.parent && c.id !== editingCategory.id)
                          .map((c) => ({
                            value: c.id,
                            label: `${c.name} [Kod: ${c.kod}] (${c.currency})`,
                          })),
                      ]}
                      size="sm"
                      fullWidth
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Valyuta
                    </label>
                    <CustomSelect
                      value={editCategoryForm.currency}
                      onChange={(val) => setEditCategoryForm({ ...editCategoryForm, currency: val })}
                      disabled={Boolean(editCategoryForm.parent_id)}
                      options={[
                        { value: 'UZS', label: 'UZS (So‘m)' },
                        { value: 'USD', label: 'USD (AQSH Dollari)' },
                      ]}
                      size="sm"
                      fullWidth
                    />
                    {editCategoryForm.parent_id && (
                      <span style={{ fontSize: 10, color: 'var(--accent-emerald, #10b981)', marginTop: 2, display: 'block' }}>
                        ✓ Ota kategoriyadan meros olinadi
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                  >
                    Bekor Qilish
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '6px 14px' }}
                  >
                    {submitting ? 'Saqlanmoqda...' : 'O‘zgarishlarni Saqlash'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Categories List Hierarchy */}
          <div
            style={{
              maxHeight: 420,
              overflowY: 'auto',
              borderRadius: 12,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}
          >
            {categories.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                Kategoriyalar mavjud emas. Yuqoridagi tugma orqali yangi kategoriya qo‘shing.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {categories
                  .filter((c) => !c.parent)
                  .map((mainCat) => {
                    const subCats = categories.filter((c) => c.parent === mainCat.id);
                    return (
                      <React.Fragment key={mainCat.id}>
                        {/* Main Category Row */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-subtle)',
                            background: editingCategory?.id === mainCat.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: 12,
                                background: 'rgba(59, 130, 246, 0.12)',
                                color: 'var(--primary)',
                                padding: '3px 8px',
                                borderRadius: 6,
                              }}
                            >
                              [{mainCat.kod}]
                            </span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                                {mainCat.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Asosiy kategoriya • {subCats.length} ta subkategoriya
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 999,
                                background: mainCat.currency === 'USD' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                                color: mainCat.currency === 'USD' ? 'var(--accent-emerald, #10b981)' : 'var(--primary)',
                                marginLeft: 6,
                              }}
                            >
                              {mainCat.currency}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              onClick={() => handleStartEditCategory(mainCat)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: 12 }}
                              title="Kategoriyani tahrirlash"
                            >
                              <Edit2 size={13} />
                              <span>Tahrirlash</span>
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(mainCat)}
                              className="btn btn-danger"
                              style={{ padding: '6px 10px' }}
                              title="Kategoriyani o‘chirish"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Subcategories */}
                        {subCats.map((sub) => (
                          <div
                            key={sub.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 16px 10px 36px',
                              borderBottom: '1px solid var(--border-subtle)',
                              background: editingCategory?.id === sub.id ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>↳</span>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 600,
                                  fontSize: 11,
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  color: 'var(--text-secondary)',
                                  padding: '2px 7px',
                                  borderRadius: 6,
                                  border: '1px solid var(--border-subtle)',
                                }}
                              >
                                [{mainCat.kod}/{sub.kod}]
                              </span>
                              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>
                                {sub.name}
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: '1px 6px',
                                  borderRadius: 999,
                                  background: sub.currency === 'USD' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                                  color: sub.currency === 'USD' ? 'var(--accent-emerald, #10b981)' : 'var(--primary)',
                                }}
                              >
                                {sub.currency}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button
                                onClick={() => handleStartEditCategory(sub)}
                                className="btn btn-secondary"
                                style={{ padding: '5px 8px', fontSize: 11 }}
                                title="Subkategoriyani tahrirlash"
                              >
                                <Edit2 size={12} />
                                <span>Tahrirlash</span>
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(sub)}
                                className="btn btn-danger"
                                style={{ padding: '5px 8px' }}
                                title="Subkategoriyani o‘chirish"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </React.Fragment>
                    );
                  })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              onClick={() => {
                setManageCategoriesModalOpen(false);
                setEditingCategory(null);
              }}
              className="btn btn-secondary"
            >
              Yopish
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={editProductModalOpen}
        onClose={() => {
          setEditProductModalOpen(false);
          setEditProductImage(null);
        }}
        title={`Mahsulotni Tahrirlash: ${editProductForm.name || ''}`}
        maxWidth={580}
      >
        <form onSubmit={handleSaveEditProduct} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Mahsulot Nomi <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Masalan: Coca Cola 1.5L"
              value={editProductForm.name}
              onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Kategoriya <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <CustomSelect
                value={editProductForm.category_id}
                onChange={(val) => handleEditProductCategoryChange(val)}
                placeholder="Tanlang..."
                options={categories.map((c) => ({
                  value: c.id,
                  label: getCategoryLabel(c),
                }))}
                fullWidth
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                O‘lchov Birligi
              </label>
              <CustomSelect
                value={editProductForm.unit}
                onChange={(val) => setEditProductForm({ ...editProductForm, unit: val })}
                options={[
                  { value: 'dona', label: 'Dona' },
                  { value: 'kg', label: 'Kilogramm (kg)' },
                  { value: 'litr', label: 'Litr' },
                  { value: 'metr', label: 'Metr' },
                ]}
                fullWidth
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                3 Bosqichli Kod (Kategoriya / Subkategoriya / Narx)
              </label>
              <button
                type="button"
                onClick={() => {
                  const code = calculateSuggestedCode(editProductForm.category_id, editProductForm.price_min);
                  setEditProductForm((prev) => ({ ...prev, code }));
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Kategoriya va minimal narx bo‘yicha kodni qayta hisoblash"
              >
                <Sparkles size={13} />
                <span>Avto-kod</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="Masalan: 01/02/11"
              value={editProductForm.code}
              onChange={(e) => setEditProductForm({ ...editProductForm, code: e.target.value })}
              className="input-field"
              style={{ fontFamily: 'monospace', fontWeight: 600 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Format: {`{Ota kategoriya}/{Subkategoriya}/{Min narx // 1000}`}
            </span>
          </div>

          {(() => {
            const selectedCatObj = categories.find((c) => c.id === parseInt(editProductForm.category_id, 10));
            const cur = selectedCatObj?.currency || 'UZS';

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Hamkor Narxi ({cur}) <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={editProductForm.price_partner}
                    onChange={(e) => setEditProductForm({ ...editProductForm, price_partner: e.target.value })}
                    className="input-field"
                    required
                  />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                    1-narx (ulgurji)
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Minimal Narx ({cur}) <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={editProductForm.price_min}
                    onChange={(e) => handleEditProductMinPriceChange(e.target.value)}
                    className="input-field"
                    required
                  />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                    Chegara narxi
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Sotuv Narxi ({cur}) <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={editProductForm.price_recommended}
                    onChange={(e) => setEditProductForm({ ...editProductForm, price_recommended: e.target.value })}
                    className="input-field"
                    required
                  />
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                    Tavsiya narx
                  </span>
                </div>
              </div>
            );
          })()}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Shtrix-Kod (Skaner uchun)
            </label>
            <input
              type="text"
              placeholder="Masalan: 4780001234567"
              value={editProductForm.barcode}
              onChange={(e) => setEditProductForm({ ...editProductForm, barcode: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Mahsulot Rasmi (MinIO Cloud Saqlash)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setEditProductImage(e.target.files[0] || null)}
              className="input-field"
              style={{ padding: '8px 12px' }}
            />
            {editProductImage ? (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                  src={URL.createObjectURL(editProductImage)}
                  alt="Yangi rasm"
                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Yangi: {editProductImage.name} ({Math.round(editProductImage.size / 1024)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => setEditProductImage(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-rose)',
                    fontSize: 12,
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  Bekor qilish
                </button>
              </div>
            ) : editProductForm.current_image ? (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                  src={resolveMediaUrl(editProductForm.current_image)}
                  alt="Mavjud rasm"
                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Mavjud mahsulot rasmi
                </span>
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                setEditProductModalOpen(false);
                setEditProductImage(null);
              }}
              className="btn btn-secondary"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? 'Saqlanmoqda...' : 'O‘zgarishlarni Saqlash'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
