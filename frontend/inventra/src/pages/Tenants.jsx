import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Power,
  PowerOff,
  User,
  Building,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { tenantApi } from '../api/client';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

export default function Tenants() {
  const toast = useToast();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Edit tenant state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    usd_rate: '12800.00',
    changeOwner: false,
    new_owner_phone_number: '',
    new_owner_email: '',
  });

  // Delete tenant state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    owner_phone_number: '',
    owner_email: '',
    description: '',
  });

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tenantApi.getTenants();
      const list = Array.isArray(res) ? res : res.results || [];
      setTenants(list);
    } catch (err) {
      toast.error('Do‘konlar ro‘yxatini yuklashda xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.owner_phone_number.trim() || !form.owner_email.trim()) {
      toast.warning('Do‘kon nomi, egasining telefon raqami va email manzilini kiriting');
      return;
    }

    setCreating(true);
    try {
      const email = form.owner_email.trim();
      const created = await tenantApi.createTenant({
        name: form.name.trim(),
        owner_phone_number: form.owner_phone_number.trim(),
        owner_email: email,
        description: form.description.trim() || undefined,
      });

      toast.success(`"${created.name}" do‘koni ro‘yxatdan o‘tkazildi! Parol havolasi ${email} ga yuborildi (Spam papkasini ham tekshiring).`);
      setCreateModalOpen(false);
      setForm({ name: '', owner_phone_number: '', owner_email: '', description: '' });
      loadTenants();
    } catch (err) {
      toast.error(err.message || 'Do‘kon yaratishda xatolik yuz berdi');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (tenant) => {
    setActionLoadingId(tenant.id);
    try {
      if (tenant.is_active) {
        await tenantApi.deactivateTenant(tenant.id);
        toast.warning(`"${tenant.name}" do‘koni faoliyati muzlatildi`);
      } else {
        await tenantApi.activateTenant(tenant.id);
        toast.success(`"${tenant.name}" do‘koni qayta faollashtirildi`);
      }
      loadTenants();
    } catch (err) {
      toast.error(err.message || 'Holatni o‘zgartirishda xatolik');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenEdit = (tenant) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.name || '',
      description: tenant.description || '',
      usd_rate: tenant.usd_rate || '12800.00',
      changeOwner: false,
      new_owner_phone_number: '',
      new_owner_email: '',
    });
    setEditModalOpen(true);
  };

  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.warning('Do‘kon nomini kiriting');
      return;
    }

    if (editForm.changeOwner) {
      if (!editForm.new_owner_phone_number.trim()) {
        toast.warning('Yangi egasining telefon raqamini kiriting');
        return;
      }
      if (!editForm.new_owner_email.trim()) {
        toast.warning('Yangi egasining email manzilini kiriting');
        return;
      }
    }

    setUpdating(true);
    try {
      // 1. Update basic tenant attributes
      const updated = await tenantApi.updateTenant(editingTenant.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        usd_rate: Number(editForm.usd_rate) || 12800,
      });

      // 2. Transfer ownership if requested
      if (editForm.changeOwner && editForm.new_owner_phone_number.trim()) {
        const ownerEmail = editForm.new_owner_email.trim();
        await tenantApi.changeOwner(editingTenant.id, {
          new_owner_phone_number: editForm.new_owner_phone_number.trim(),
          new_owner_email: ownerEmail,
        });
        toast.success(
          `"${updated.name}" saqlandi va egasi almashtirildi! Parol havolasi ${ownerEmail} ga yuborildi (Spam papkasini ham tekshiring).`
        );
      } else {
        toast.success(`"${updated.name}" do‘koni muvaffaqiyatli tahrirlandi!`);
      }

      setEditModalOpen(false);
      setEditingTenant(null);
      loadTenants();
    } catch (err) {
      toast.error(err.message || 'Do‘konni tahrirlashda xatolik yuz berdi');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenDelete = (tenant) => {
    setDeletingTenant(tenant);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTenant) return;
    setDeleting(true);
    try {
      await tenantApi.deleteTenant(deletingTenant.id);
      toast.success(`"${deletingTenant.name}" do‘koni butunlay o‘chirildi`);
      setDeleteModalOpen(false);
      setDeletingTenant(null);
      loadTenants();
    } catch (err) {
      toast.error(err.message || 'Do‘konni o‘chirishda xatolik yuz berdi');
    } finally {
      setDeleting(false);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      String(t.id).includes(q)
    );
  });

  const activeCount = tenants.filter((t) => t.is_active).length;
  const inactiveCount = tenants.length - activeCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Platformadagi barcha do‘konlar monitoringi va boshqaruvi
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
        >
          <Plus size={18} />
          <span>Yangi Do‘kon Qo‘shish</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Jami Do‘konlar</span>
            <Store size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{tenants.length} ta</div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Faol Do‘konlar</span>
            <CheckCircle2 size={18} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-emerald)' }}>
            {activeCount} ta
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Muzlatilgan Do‘konlar</span>
            <XCircle size={18} color="var(--accent-rose)" />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-rose)' }}>
            {inactiveCount} ta
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--bg-card)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Do‘kon nomi yoki ID bo‘yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            outline: 'none',
            fontSize: 14,
            width: '100%',
          }}
        />
      </div>

      {/* Tenants Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', minWidth: 840, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'rgba(0,0,0,0.2)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>ID</th>
                <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Do‘kon Nomi</th>
                <th style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>Tavsif</th>
              <th style={{ padding: '14px 20px' }}>Egasi (Owner)</th>
              <th style={{ padding: '14px 20px' }}>Holat</th>
              <th style={{ padding: '14px 20px' }}>Yaratilgan Sana</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Do‘konlar ro‘yxati yuklanmoqda...
                </td>
              </tr>
            ) : filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <Building size={40} color="var(--text-muted)" />
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {search ? 'Qidiruv bo‘yicha do‘kon topilmadi' : 'Hozircha birorta ham do‘kon mavjud emas'}
                    </span>
                    {!search && (
                      <button
                        onClick={() => setCreateModalOpen(true)}
                        className="btn btn-secondary"
                        style={{ marginTop: 6 }}
                      >
                        + Birinchi Do‘konni Qo‘shish
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredTenants.map((t) => (
                <tr
                  key={t.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-muted)' }}>
                    #{t.id}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-xs)',
                          background: t.is_active
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Store
                          size={16}
                          color={t.is_active ? 'var(--accent-emerald)' : 'var(--accent-rose)'}
                        />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {t.description || '—'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={14} color="var(--primary)" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {t.owner_details?.phone_number || (t.owner ? `ID #${t.owner}` : 'Biriktirilgan')}
                        </span>
                      </div>
                      {t.owner_details?.email && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 20 }}>
                          {t.owner_details.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: t.is_active
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                        color: t.is_active ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                        border: `1px solid ${t.is_active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      }}
                    >
                      {t.is_active ? 'Faol' : 'Muzlatilgan'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {t.created_at
                      ? new Date(t.created_at).toLocaleDateString('uz-UZ', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEdit(t)}
                        title="Do‘kon ma’lumotlarini tahrirlash"
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-chip)',
                          color: 'var(--text-primary)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <Edit2 size={13} color="var(--primary)" />
                        <span>Tahrirlash</span>
                      </button>

                      {/* Status Toggle Button */}
                      <button
                        onClick={() => handleToggleStatus(t)}
                        disabled={actionLoadingId === t.id}
                        title={t.is_active ? 'Faoliyatini to‘xtatish' : 'Qayta faollashtirish'}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-xs)',
                          border: 'none',
                          background: t.is_active
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(16, 185, 129, 0.12)',
                          color: t.is_active ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        {t.is_active ? (
                          <>
                            <PowerOff size={13} />
                            <span>Muzlatish</span>
                          </>
                        ) : (
                          <>
                            <Power size={13} />
                            <span>Faollashtirish</span>
                          </>
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleOpenDelete(t)}
                        title="Do‘konni tizimdan butunlay o‘chirish"
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: 'var(--accent-rose)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <Trash2 size={13} />
                        <span>O‘chirish</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create Tenant Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Yangi Do‘kon (Tenant) Qo‘shish"
      >
        <form onSubmit={handleCreateTenant} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Do‘kon Nomi <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="tenant-name"
              name="organization"
              autoComplete="organization"
              type="text"
              className="input-field"
              placeholder="Masalan: Inventra Flagship Store"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Egasi (Owner) Telefon Raqami <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="owner-phone"
              name="tel"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              className="input-field"
              placeholder="+998901234567"
              value={form.owner_phone_number}
              onChange={(e) => setForm({ ...form, owner_phone_number: e.target.value })}
              required
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Ushbu telefon raqamiga yangi do‘kon egasi (Owner) akkaunti biriktiriladi.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Egasi Email Manzili <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="owner-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              className="input-field"
              placeholder="owner@example.com"
              value={form.owner_email}
              onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
              required
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Yangi do‘kon egasiga parol va username o‘rnatish havolasi ushbu emailga avtomatik yuboriladi.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Do‘kon Tavsifi / Manzil (Ixtiyoriy)
            </label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Filial yoki faoliyat turi haqida qisqacha ma’lumot..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="btn btn-secondary"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? 'Yaratilmoqda...' : 'Do‘konni Yaratish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingTenant(null);
        }}
        title={`"${editingTenant?.name}" Do‘konini Tahrirlash`}
      >
        <form onSubmit={handleUpdateTenant} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Do‘kon Nomi <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="text"
              className="input-field"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Ichki Dollar Kursi (USD Rate, UZS)
            </label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={editForm.usd_rate}
              onChange={(e) => setEditForm({ ...editForm, usd_rate: e.target.value })}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Ushbu do‘kon uchun ichki hisob-kitob dollar kursi (masalan: 12800).
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Do‘kon Tavsifi / Manzil (Ixtiyoriy)
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Filial yoki faoliyat turi haqida qisqacha ma’lumot..."
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>

          {/* Store Owner Transfer Section */}
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-chip)',
              border: '1px solid var(--border-subtle)',
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
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={16} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hozirgi Do‘kon Egasi</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {editingTenant?.owner_details?.phone_number || (editingTenant?.owner ? `ID #${editingTenant.owner}` : '—')}
                    {editingTenant?.owner_details?.email ? ` (${editingTenant.owner_details.email})` : ''}
                  </div>
                </div>
              </div>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={editForm.changeOwner}
                  onChange={(e) => setEditForm({ ...editForm, changeOwner: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>Egasini O‘zgartirish</span>
              </label>
            </div>

            {editForm.changeOwner && (
              <div
                style={{
                  marginTop: 6,
                  paddingTop: 12,
                  borderTop: '1px dashed var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Yangi Egasining Telefon Raqami <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </label>
                  <input
                    id="new-owner-phone"
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    className="input-field"
                    placeholder="+998901234567"
                    value={editForm.new_owner_phone_number}
                    onChange={(e) => setEditForm({ ...editForm, new_owner_phone_number: e.target.value })}
                    required={editForm.changeOwner}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Yangi Egasining Email Manzili <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </label>
                  <input
                    id="new-owner-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    className="input-field"
                    placeholder="newowner@example.com"
                    value={editForm.new_owner_email}
                    onChange={(e) => setEditForm({ ...editForm, new_owner_email: e.target.value })}
                    required={editForm.changeOwner}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Yangi do‘kon egasiga tizimga kirish va yangi parol o‘rnatish havolasi ushbu emailga avtomatik yuboriladi. Oldingi egasining do‘konga kirish huquqi darhol bekor qilinadi.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                setEditModalOpen(false);
                setEditingTenant(null);
              }}
              className="btn btn-secondary"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updating}
            >
              {updating ? 'Saqlanmoqda...' : 'O‘zgarishlarni Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Tenant Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingTenant(null);
        }}
        title="Do‘konni Butunlay O‘chirish"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: '16px',
              borderRadius: 14,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <AlertTriangle size={24} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-rose)', marginBottom: 4 }}>
                Diqqat: Ushbu amalni ortga qaytarib bo‘lmaydi!
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Siz haqiqatan ham <strong>"{deletingTenant?.name}"</strong> (#{deletingTenant?.id}) do‘konini tizimdan butunlay o‘chirmoqchimisiz? Ushbu do‘konga tegishli barcha ma’lumotlar butunlay o‘chiriladi.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeletingTenant(null);
              }}
              className="btn btn-secondary"
            >
              Bekor Qilish
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="btn btn-danger"
              disabled={deleting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
              }}
            >
              <Trash2 size={16} />
              <span>{deleting ? 'O‘chirilmoqda...' : 'Ha, Butunlay O‘chirish'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
