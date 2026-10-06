import React, { useState, useEffect } from 'react';
import {
  Edit3,
  Save,
  X,
  FileText,
  ShieldCheck,
  AlertCircle,
  Users,
  Store,
  Shield,
  Printer,
  Calendar,
  Globe,
  CheckCircle,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { docsApi } from '../api/client';
import MarkdownViewer from '../components/docs/MarkdownViewer';

export default function Documentation() {
  const { user, isOwner, isStaff, isAdmin } = useAuth();
  const toast = useToast();

  // Determine initial document key based on role
  const getDefaultDoc = () => {
    if (isAdmin) return 'platform_admin_amaliy_qollanma';
    if (isOwner) return 'owner_amaliy_qollanma';
    return 'staff_amaliy_qollanma';
  };

  const [activeTab, setActiveTab] = useState(getDefaultDoc());
  const [docData, setDocData] = useState({ title: '', content: '', can_edit: false });
  const [loading, setLoading] = useState(true);

  // Edit mode for Platform Admin
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Tab definitions filtered by role
  const allTabs = [
    // 1. Amaliy Vizual Qo'llanmalar (Rasmlar bilan)
    ...(isAdmin
      ? [
          {
            key: 'platform_admin_amaliy_qollanma',
            label: 'Admin: Amaliy Yo‘riqnoma (Rasmli)',
            icon: Shield,
            category: 'practical',
            badge: 'Rasmli',
          },
        ]
      : []),
    ...(isAdmin || isOwner
      ? [
          {
            key: 'owner_amaliy_qollanma',
            label: 'Owner: Amaliy Yo‘riqnoma (Rasmli)',
            icon: Store,
            category: 'practical',
            badge: 'Rasmli',
          },
        ]
      : []),
    {
      key: 'staff_amaliy_qollanma',
      label: 'Xodimlar: Amaliy Yo‘riqnoma (Rasmli)',
      icon: Users,
      category: 'practical',
      badge: 'Rasmli',
    },

    // 2. Tizim Reglamenti va Qoidalar
    ...(isAdmin
      ? [
          {
            key: 'platform_admin_qollanma',
            label: 'Admin Reglamenti',
            icon: Shield,
            category: 'manual',
          },
        ]
      : []),
    ...(isAdmin || isOwner
      ? [
          {
            key: 'owner_qollanma',
            label: 'Do‘kon Egasi Reglamenti',
            icon: Store,
            category: 'manual',
          },
        ]
      : []),
    {
      key: 'staff_qollanma',
      label: 'Xodimlar Reglamenti',
      icon: Users,
      category: 'manual',
    },

    // 3. Huquqiy Hujjatlar
    {
      key: 'ommaviy_oferta',
      label: 'Ommaviy Oferta',
      icon: FileText,
      category: 'legal',
    },
    {
      key: 'maxfiylik_siyosati',
      label: 'Maxfiylik Siyosati',
      icon: ShieldCheck,
      category: 'legal',
    },
    {
      key: 'foydalanish_qoidalari',
      label: 'Foydalanish Qoidalari',
      icon: AlertCircle,
      category: 'legal',
    },
    {
      key: 'certificate',
      label: 'Rozilik Hujjati (Sertifikat)',
      icon: CheckCircle,
      category: 'certificate',
    },
  ];

  // Fetch active document content
  const loadDoc = async (key) => {
    if (key === 'certificate') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsEditing(false);
    try {
      const res = await docsApi.getDoc(key);
      setDocData({
        title: res.title || '',
        content: res.content || '',
        can_edit: Boolean(res.can_edit),
      });
      setEditContent(res.content || '');
    } catch (err) {
      toast.error(err.message || 'Qo‘llanmani yuklashda xatolik yuz berdi');
      setDocData({
        title: 'Xatolik',
        content: 'Hujjatni yuklash imkoni bo‘lmadi yoki ruxsat etilmagan.',
        can_edit: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoc(activeTab);
  }, [activeTab]);

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Faqat Platform Administratori hujjatlarni o‘zgartira oladi.');
      return;
    }

    setSaving(true);
    try {
      await docsApi.updateDoc(activeTab, editContent);
      setDocData((prev) => ({ ...prev, content: editContent }));
      setIsEditing(false);
      toast.success('Hujjat muvaffaqiyatli saqlandi!');
    } catch (err) {
      toast.error(err.message || 'Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Top Header & Actions */}
      <div
        className="doc-hide-print"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          paddingBottom: 20,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: 'var(--bg-chip)',
                  color: 'var(--primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Hujjatlar & Yo‘riqnomalar
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Inventra Documentation Portal
              </span>
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: '0 0 6px',
              }}
            >
              Foydalanish Qo‘llanmasi va Huquqiy Hujjatlar
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0, maxWidth: 750, lineHeight: 1.5 }}>
              {isAdmin && 'Siz Platform Administratorisiz: barcha qo‘llanmalarni ko‘rishingiz va to‘g‘ridan-to‘g‘ri tahrirlashingiz mumkin.'}
              {isOwner && 'Do‘kon Egasi uchun maxsus yo‘riqnoma va rasmiy huquqiy hujjatlar.'}
              {isStaff && 'Do‘kon xodimlari (kassir/omborchi) uchun amaliy ish qo‘llanmasi.'}
            </p>
          </div>

          {/* Edit / Save Buttons (Admin Only) */}
          {isAdmin && activeTab !== 'certificate' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditContent(docData.content);
                      setIsEditing(false);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: 13, padding: '9px 16px' }}
                  >
                    <X size={15} />
                    <span>Bekor qilish</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ fontSize: 13, padding: '9px 18px' }}
                  >
                    <Save size={15} />
                    <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn btn-primary"
                  style={{ fontSize: 13, padding: '9px 18px' }}
                >
                  <Edit3 size={15} />
                  <span>Qo‘llanmani Tahrirlash</span>
                </button>
              )}
            </div>
          )}

          {activeTab === 'certificate' && (
            <button
              type="button"
              onClick={handlePrintCertificate}
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: '9px 16px' }}
            >
              <Printer size={15} />
              <span>Hujjatni Chop Etish</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div
        className="doc-hide-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 6,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {allTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: isActive ? 'var(--primary)' : 'var(--bg-chip)',
                color: isActive ? 'var(--text-on-primary)' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 14px rgba(245, 158, 11, 0.25)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 8,
                    background: isActive ? 'rgba(0, 0, 0, 0.25)' : 'rgba(245, 158, 11, 0.22)',
                    color: isActive ? '#fff' : 'var(--primary)',
                    letterSpacing: '0.04em',
                    marginLeft: 2,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div
            className="animate-spin"
            style={{
              width: 36,
              height: 36,
              border: '3px solid var(--border-subtle)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              margin: '0 auto 16px',
            }}
          />
          <span style={{ fontSize: 14 }}>Hujjat matni yuklanmoqda...</span>
        </div>
      ) : activeTab === 'certificate' ? (
        /* Acceptance Certificate View (Rozilik Hujjati) */
        <div
          className="glass-card doc-certificate"
          style={{
            maxWidth: 780,
            margin: '10px auto',
            padding: '44px 48px',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 24,
          }}
        >
          {/* Certificate Accent Gradient Top Bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, #F59E0B, #EA580C, #10B981)',
            }}
          />

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.2)',
              }}
            >
              <ShieldCheck size={36} />
            </div>
            <span
              style={{
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 800,
                color: 'var(--primary)',
                display: 'block',
              }}
            >
              Rasmiy Elektron Dalolatnoma
            </span>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: '8px 0 6px',
                letterSpacing: '-0.02em',
              }}
            >
              Ommaviy Oferta va Maxfiylik Shartlariga Rozilik Sertifikati
            </h2>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                maxWidth: 520,
                margin: '0 auto',
                lineHeight: 1.5,
              }}
            >
              Ushbu hujjat foydalanuvchi tomonidan Inventra platformasining Ommaviy Ofertasi, Maxfiylik Siyosati va Foydalanish Qoidalariga berilgan rasmiy elektron akseptni tasdiqlaydi.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              margin: '28px 0',
              padding: 24,
              borderRadius: 16,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Foydalanuvchi F.I.Sh:
              </span>
              <strong style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700 }}>
                {user?.first_name || user?.last_name ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim() : user?.username}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Telefon Raqami:
              </span>
              <strong style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {user?.phone_number || 'Ko‘rsatilmagan'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Tizimdagi Roli:
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: 'var(--bg-chip)',
                  color: 'var(--primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {user?.role_display || user?.role || 'Foydalanuvchi'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Bog‘langan Do‘kon (Tenant):
              </span>
              <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                {user?.tenant_name || (isAdmin ? 'Barcha Do‘konlar (Superadmin)' : 'Mavjud emas')}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Rozilik Berilgan Sana & Vaqt:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                <Calendar size={15} color="var(--primary)" />
                <span>
                  {user?.terms_accepted_at
                    ? new Date(user.terms_accepted_at).toLocaleString('uz-UZ')
                    : '2026-10-01 13:45:00 (Tasdiqlangan)'}
                </span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Qabul Qilingan IP-Manzil:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                <Globe size={15} color="var(--primary)" />
                <span>{user?.terms_accepted_ip || '195.158.10.25 (Avto-qayd)'}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: 20,
              marginTop: 20,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} color="var(--accent-emerald)" />
              <span>O‘zbekiston Respublikasi O‘RQ-547 va elektron tijorat qonunlariga muvofiq qonuniy kuchga ega.</span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, opacity: 0.8 }}>
              SERIYA: INV-CONF-{user?.id || '001'}-2026
            </div>
          </div>
        </div>
      ) : isEditing ? (
        /* Edit Mode (Platform Admin) */
        <div
          className="glass-card"
          style={{
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit3 size={15} />
              Tahrirlash rejimi (Markdown formatida to‘g‘ridan-to‘g‘ri o‘zgartiring):
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              Fayl: docs/{activeTab}.md
            </span>
          </div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={24}
            style={{
              width: '100%',
              padding: 20,
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              fontSize: 13,
              lineHeight: 1.6,
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              borderRadius: 14,
              border: '1px solid var(--border-card)',
              outline: 'none',
              resize: 'vertical',
              boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
            placeholder="Markdown matnini kiriting..."
          />
        </div>
      ) : (
        /* View Mode (All Roles) */
        <div
          className="glass-card"
          style={{
            padding: '36px 44px',
          }}
        >
          <MarkdownViewer content={docData.content} />
        </div>
      )}
    </div>
  );
}
