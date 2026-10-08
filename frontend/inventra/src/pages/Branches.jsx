import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  CheckCircle,
  Shield,
  Building2,
  Store,
} from 'lucide-react';
import { tenantApi } from '../api/client';
import Modal from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';

export default function Branches() {
  const toast = useToast();
  const confirm = useConfirm();
  const { isOwner, isAdmin } = useAuth();
  const { branches, refreshBranches, activeBranch, setActiveBranch } = useBranch();

  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [isMain, setIsMain] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    setEditingBranch(null);
    setName('');
    setCode('');
    setPhoneNumber('');
    setAddress('');
    setIsMain(branches.length === 0);
    setModalOpen(true);
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setName(branch.name || '');
    setCode(branch.code || '');
    setPhoneNumber(branch.phone_number || '');
    setAddress(branch.address || '');
    setIsMain(Boolean(branch.is_main));
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Filial nomini kiriting');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim(),
        phone_number: phoneNumber.trim(),
        address: address.trim(),
        is_main: isMain,
      };

      if (editingBranch) {
        await tenantApi.updateBranch(editingBranch.id, payload);
        toast.success('Filial ma’lumotlari muvaffaqiyatli yangilandi');
      } else {
        await tenantApi.createBranch(payload);
        toast.success('Yangi filial muvaffaqiyatli yaratildi');
      }

      setModalOpen(false);
      await refreshBranches();
    } catch (err) {
      toast.error(err.message || 'Filialni saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branch) => {
    if (branch.is_main) {
      toast.warning('Asosiy filialni o‘chirib bo‘lmaydi');
      return;
    }

    const ok = await confirm({
      title: 'Filialni o‘chirish',
      message: `Haqiqatan ham "${branch.name}" filialini o‘chirmoqchimisiz? Agar filialda qoldiq tovarlar bo‘lsa, avval ularni boshqa filialga o‘tkazish kerak.`,
      confirmText: 'Ha, o‘chirish',
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (!ok) return;

    try {
      await tenantApi.deleteBranch(branch.id);
      toast.success('Filial o‘chirildi');
      await refreshBranches();
    } catch (err) {
      toast.error(err.message || 'Filialni o‘chirishda xatolik yuz berdi');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner & Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          background: 'var(--bg-card)',
          padding: '20px 24px',
          borderRadius: 16,
          border: '1px solid var(--border-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <GitBranch size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Filiallar Boshqaruvi
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Barcha savdo nuqtalari, omborlar va manzillarni boshqarish
            </p>
          </div>
        </div>

        {(isOwner || isAdmin) && (
          <button
            type="button"
            onClick={openCreateModal}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
          >
            <Plus size={18} />
            <span>Yangi filial qo‘shish</span>
          </button>
        )}
      </div>

      {/* Branches Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {branches.map((b) => {
          const isCurrentActive = activeBranch?.id === b.id;
          return (
            <div
              key={b.id}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 14,
                border: isCurrentActive
                  ? '2px solid var(--primary)'
                  : '1px solid var(--border-card)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                position: 'relative',
                boxShadow: isCurrentActive ? '0 4px 20px rgba(59, 130, 246, 0.15)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: b.is_main
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'var(--bg-chip)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: b.is_main ? 'var(--accent-emerald)' : 'var(--text-primary)',
                    }}
                  >
                    <Store size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {b.name}
                    </h3>
                    {b.code && (
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: 'monospace',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Kod: {b.code}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {b.is_main && (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--accent-emerald)',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      Asosiy
                    </span>
                  )}
                  {isCurrentActive && (
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: 'var(--primary)',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      Faol
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>
                    {b.address || 'Manzil ko‘rsatilmagan'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={15} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>
                    {b.phone_number || 'Telefon ko‘rsatilmagan'}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-subtle)',
                  marginTop: 'auto',
                }}
              >
                {!isCurrentActive ? (
                  <button
                    type="button"
                    onClick={() => setActiveBranch(b)}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '5px 12px' }}
                  >
                    Ushbu filialga o‘tish
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    ✓ Hozirda tanlangan
                  </span>
                )}

                {(isOwner || isAdmin) && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(b)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px' }}
                      title="Tahrirlash"
                    >
                      <Edit2 size={14} />
                    </button>
                    {!b.is_main && (
                      <button
                        type="button"
                        onClick={() => handleDelete(b)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', color: 'var(--accent-rose)' }}
                        title="O‘chirish"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBranch ? 'Filialni tahrirlash' : 'Yangi filial yaratish'}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              Filial nomi <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Masalan: Chilonzor filiali"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              Filial kodi (qisqa identifikator)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Masalan: CHILONZOR yoki B2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              Telefon raqami
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="+998 90 123 45 67"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
              Manzil
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Toshkent sh., Chilonzor 9-mavze, 12-uy"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input
              type="checkbox"
              id="isMainBranchCheck"
              checked={isMain}
              onChange={(e) => setIsMain(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="isMainBranchCheck" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Asosiy filial deb belgilash
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-secondary"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
