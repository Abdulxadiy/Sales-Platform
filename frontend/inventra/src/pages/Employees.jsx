import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, UserX, Shield, Phone, Mail, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react';
import { tenantApi, authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import Modal from '../components/common/Modal';

export default function Employees() {
  const { user, isAdmin, isOwner } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(user?.tenant_id || null);
  const [loading, setLoading] = useState(true);
  const [hireModalOpen, setHireModalOpen] = useState(false);
  const [hiring, setHiring] = useState(false);

  // Hire Form
  const [hireForm, setHireForm] = useState({
    phone_number: '',
    role: 'staff',
    position: 'Kassir',
    first_name: '',
    last_name: '',
  });

  // Action state
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const res = await tenantApi.getTenants();
        const list = Array.isArray(res) ? res : res.results || [];
        setTenants(list);
        if (list.length > 0 && !selectedTenantId) {
          setSelectedTenantId(list[0].id);
        }
      } else {
        setSelectedTenantId(user?.tenant_id || 1);
      }
    } catch (err) {
      toast.error('Ma’lumotlarni yuklashda xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user, selectedTenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleHireSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTenantId) {
      toast.warning('Do‘kon tanlanmagan');
      return;
    }
    if (!hireForm.phone_number.trim()) {
      toast.warning('Telefon raqamini kiriting');
      return;
    }

    setHiring(true);
    try {
      await tenantApi.hireEmployee(selectedTenantId, {
        phone_number: hireForm.phone_number.trim(),
        role: hireForm.role,
        position: hireForm.position.trim(),
        first_name: hireForm.first_name.trim() || undefined,
        last_name: hireForm.last_name.trim() || undefined,
      });

      toast.success('Yangi xodim muvaffaqiyatli qabul qilindi!');
      setHireModalOpen(false);
      setHireForm({ phone_number: '', role: 'staff', position: 'Kassir', first_name: '', last_name: '' });
      loadData();
    } catch (err) {
      toast.error(err.message || 'Xodimni ishga olishda xatolik');
    } finally {
      setHiring(false);
    }
  };

  const handleFireEmployee = async (targetUserId) => {
    const isConfirmed = await confirm({
      title: 'Xodimni ishdan bo‘shatish',
      message: 'Haqiqatan ham bu xodimni ishdan bo‘shatmoqchimisiz? Uning tizimga kirish huquqi to‘xtatiladi.',
      confirmText: 'Ishdan bo‘shatish',
      cancelText: 'Bekor qilish',
      type: 'danger',
    });
    if (!isConfirmed) return;
    setActionLoadingId(targetUserId);
    try {
      await tenantApi.fireEmployee(selectedTenantId, targetUserId);
      toast.warning('Xodim ishdan bo‘shatildi');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Ishdan bo‘shatishda xatolik');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnban = async (targetUserId) => {
    setActionLoadingId(targetUserId);
    try {
      await authApi.unban(targetUserId);
      toast.success('Foydalanuvchi blokdan chiqarildi');
    } catch (err) {
      toast.error(err.message || 'Blokdan chiqarishda xatolik');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
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
            Xodimlar & Jamoa Boshqaruvi
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Do‘koningizdagi barcha xodimlar, lavozimlar va tizimga kirish huquqlari
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAdmin && tenants.length > 0 && (
            <select
              value={selectedTenantId || ''}
              onChange={(e) => setSelectedTenantId(Number(e.target.value))}
              className="input-field"
              style={{ width: 'auto', padding: '8px 36px 8px 14px', fontSize: 13 }}
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setHireModalOpen(true)}
            className="btn btn-primary"
          >
            <UserPlus size={16} />
            <span>+ Yangi Xodim Yollash</span>
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div
        className="glass-card"
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'var(--primary-light)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <Users size={28} color="var(--primary)" />
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            Avtomatlashtirilgan Xodimlar Integratsiyasi
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Yangi yollangan xodim Telegram boti orqali birinchi marta 2FA kodini tasdiqlab, o‘z parolini belgilashi bilan POS kassa va savdo qilish imkoniyatiga ega bo‘ladi.
          </p>
        </div>
      </div>

      {/* Staff List Table */}
      <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-chip)',
                fontSize: 12,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <th style={{ padding: '14px 20px' }}>Xodim</th>
              <th style={{ padding: '14px 20px' }}>Lavozimi</th>
              <th style={{ padding: '14px 20px' }}>Roli</th>
              <th style={{ padding: '14px 20px' }}>Aloqa</th>
              <th style={{ padding: '14px 20px' }}>Holat</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <td style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    US
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      Asosiy Mas’ul Xodim
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {user?.username || 'Kassir'}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 500 }}>
                Katta Kassir & Administrator
              </td>
              <td style={{ padding: '16px 20px' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {user?.role || 'staff'}
                </span>
              </td>
              <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                Telegram 2FA Ulangan
              </td>
              <td style={{ padding: '16px 20px' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--accent-emerald)',
                  }}
                >
                  Faol
                </span>
              </td>
              <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Asosiy akkaunt</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Hire Employee Modal */}
      <Modal
        isOpen={hireModalOpen}
        onClose={() => setHireModalOpen(false)}
        title="Yangi Xodim Yollash"
      >
        <form onSubmit={handleHireSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Telefon Raqami (Telegram 2FA uchun) <span style={{ color: 'var(--accent-rose)' }}>*</span>
            </label>
            <input
              id="employee-phone"
              name="tel"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+998901234567"
              value={hireForm.phone_number}
              onChange={(e) => setHireForm({ ...hireForm, phone_number: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Ismi
              </label>
              <input
                id="employee-first-name"
                name="given-name"
                autoComplete="given-name"
                type="text"
                placeholder="Ali"
                value={hireForm.first_name}
                onChange={(e) => setHireForm({ ...hireForm, first_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Familiyasi
              </label>
              <input
                id="employee-last-name"
                name="family-name"
                autoComplete="family-name"
                type="text"
                placeholder="Valiyev"
                value={hireForm.last_name}
                onChange={(e) => setHireForm({ ...hireForm, last_name: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Tizimdagi Roli
              </label>
              <select
                id="employee-role"
                name="role"
                value={hireForm.role}
                onChange={(e) => setHireForm({ ...hireForm, role: e.target.value })}
                className="input-field"
              >
                <option value="staff">Kassir / Xodim (Staff)</option>
                {isAdmin && <option value="owner">Do‘kon Egasi (Owner)</option>}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Lavozimi
              </label>
              <input
                id="employee-position"
                name="organization-title"
                autoComplete="organization-title"
                type="text"
                placeholder="Masalan: Bosh Kassir"
                value={hireForm.position}
                onChange={(e) => setHireForm({ ...hireForm, position: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setHireModalOpen(false)}
              className="btn btn-secondary"
            >
              Bekor Qilish
            </button>
            <button
              type="submit"
              disabled={hiring}
              className="btn btn-primary"
            >
              {hiring ? 'Yollanmoqda...' : 'Ishga Qabul Qilish'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
