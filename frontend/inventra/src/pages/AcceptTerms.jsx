import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { docsApi } from '../api/client';
import Modal from '../components/common/Modal';
import InventraLogo from '../components/common/InventraLogo';
import MarkdownViewer from '../components/docs/MarkdownViewer';

export default function AcceptTerms() {
  const navigate = useNavigate();
  const { user, isAuthenticated, hasAcceptedTerms, acceptTerms, logout, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();

  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Full-text modal state
  const [activeModalDoc, setActiveModalDoc] = useState(null); // 'ommaviy_oferta' | 'maxfiylik_siyosati' | 'foydalanish_qoidalari'
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Redirect if already accepted or not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (hasAcceptedTerms) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, hasAcceptedTerms, navigate]);

  const handleOpenDetailModal = async (docKey, title) => {
    setActiveModalDoc(docKey);
    setModalTitle(title);
    setModalLoading(true);
    try {
      const res = await docsApi.getDoc(docKey);
      setModalContent(res.content || '');
    } catch (err) {
      toast.error(err.message || 'Hujjat matnini yuklashda xatolik yuz berdi');
      setModalContent('Hujjat matnini yuklash imkoni bo‘lmadi.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!agreed) {
      toast.warning('Iltimos, avval shartlarga rozilik katakchasini belgilang');
      return;
    }

    setSubmitting(true);
    try {
      await acceptTerms();
      toast.success('Shartlar muvaffaqiyatli qabul qilindi. Xush kelibsiz!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Rozilikni qayd etishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        position: 'relative',
        padding: '30px 16px',
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* Top Bar with Theme Switcher */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 30,
        }}
      >
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: 'var(--bg-chip)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          title={isDark ? 'Kunduzgi rejimga o‘tish' : 'Tungi rejimga o‘tish'}
          aria-label="Mavzuni almashtirish"
        >
          {isDark ? <Sun size={18} color="var(--primary)" /> : <Moon size={18} />}
        </button>
      </div>

      {/* Decorative Ambient Glow */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(12, 10, 9, 0) 70%)'
            : 'radial-gradient(circle, rgba(99, 102, 241, 0.10) 0%, rgba(240, 239, 235, 0) 70%)',
          top: '15%',
          left: '50%',
          transform: 'translate(-50%, -15%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Container Card */}
      <div
        className="glass-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 680,
          padding: '36px 32px',
          borderRadius: 24,
          border: '1px solid var(--border-card)',
          background: 'var(--bg-card)',
          boxShadow: isDark ? '0 24px 60px rgba(0, 0, 0, 0.75)' : 'var(--shadow-lg)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 12 }}>
            <InventraLogo size={52} variant="vertical" badgeText="HIMOYA" />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '6px 0 4px',
              letterSpacing: '-0.02em',
            }}
          >
            Foydalanish Shartlari & Maxfiylik Kelishuvi
          </h1>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 13,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Hurmatli {user?.first_name || user?.username || 'foydalanuvchi'}, tizimdan foydalanishni boshlashdan oldin quyidagi rasmiy shartlar bilan tanishib chiqing:
          </p>
        </div>

        {/* Scrollable Summary Frame (to'rtburchak ramka) */}
        <div
          style={{
            maxHeight: 340,
            overflowY: 'auto',
            paddingRight: 8,
            marginBottom: 20,
          }}
          className="custom-scrollbar space-y-3"
        >
          {/* Card 1: Ommaviy Oferta */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-chip)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileText size={17} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                1. Ommaviy Oferta Shartnomasi
              </h3>
            </div>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
                margin: '0 0 10px',
              }}
            >
              Inventra SaaS dasturiy platformasidan foydalanish tartibi, savdo va kassa hisobi, xizmat ko‘rsatish qoidalari hamda obuna shartlarini belgilaydi.
              Do‘koningiz ma’lumotlari (narxlar, mijozlar va ombor qoldig‘i) dasturiy Tenant Izolatsiyasi orqali qat’iy himoyalanadi va tijorat siringiz kafolatlanadi.
            </p>
            <button
              type="button"
              onClick={() => handleOpenDetailModal('ommaviy_oferta', 'Ommaviy Oferta Shartnomasi')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--primary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              <span>Batafsil to‘liq matnni o‘qish</span>
              <ExternalLink size={12} />
            </button>
          </div>

          {/* Card 2: Maxfiylik Siyosati */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-chip)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={17} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                2. Maxfiylik va Shaxsiy Ma’lumotlar Siyosati
              </h3>
            </div>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
                margin: '0 0 10px',
              }}
            >
              O‘zbekiston Respublikasining O‘RQ-547-sonli Qonuni talablari asosida. Telefon raqamingiz, savdo cheklari va kassa amaliyotlari zamonaviy kriptografik xeshlar va 2FA orqali shifrlanadi. Shaxsiy va tijorat ma’lumotlaringiz hech qachon uchinchi shaxslarga berilmaydi va sotilmaydi.
            </p>
            <button
              type="button"
              onClick={() => handleOpenDetailModal('maxfiylik_siyosati', 'Maxfiylik va Shaxsiy Ma’lumotlar Siyosati')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--primary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              <span>Batafsil to‘liq matnni o‘qish</span>
              <ExternalLink size={12} />
            </button>
          </div>

          {/* Card 3: Foydalanish Qoidalari */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-chip)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={17} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                3. Xizmatdan Foydalanish Qoidalari & Xavfsizlik
              </h3>
            </div>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
                margin: '0 0 10px',
              }}
            >
              Parol xavfsizligi, 2FA Telegram tasdiqlash kodi gigiyenasi va akkaunt daxlsizligi talab etiladi. Tizimda taqiqlangan noqonuniy savdolar, ruxsatsiz urinishlar (brute-force) va kassa ma’lumotlarini soxtalashtirish taqiqlanadi. Har bir amal o‘zgarmas Audit Jurnalida muhrlanadi.
            </p>
            <button
              type="button"
              onClick={() => handleOpenDetailModal('foydalanish_qoidalari', 'Xizmatdan Foydalanish Qoidalari')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--primary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              <span>Batafsil to‘liq matnni o‘qish</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {/* Checkbox & Notice Statement */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 16,
            background: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(99, 102, 241, 0.06)',
            border: isDark ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(99, 102, 241, 0.15)',
            marginBottom: 20,
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              id="agreeCheckbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{
                width: 19,
                height: 19,
                marginTop: 2,
                cursor: 'pointer',
                accentColor: 'var(--primary)',
              }}
            />
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'block',
                  lineHeight: 1.4,
                }}
              >
                Men yuqoridagi Ommaviy oferta, Maxfiylik siyosati va Foydalanish qoidalari bilan to‘liq tanishdim va ularga roziman.
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                Siz «Davom etish» tugmasini bosish orqali ushbu shartlarga rasmiy rozilik bildirgan hisoblanasiz va roziligingiz audit jurnalida qayd etiladi.
              </span>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: '12px 18px',
              borderRadius: 14,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-chip)',
              color: 'var(--text-muted)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={16} />
            <span>Chiqish</span>
          </button>

          <button
            type="button"
            onClick={handleAccept}
            disabled={!agreed || submitting || loading}
            style={{
              flex: 1,
              padding: '13px 24px',
              borderRadius: 14,
              border: 'none',
              background: agreed ? 'var(--primary)' : 'var(--bg-chip)',
              color: agreed ? '#ffffff' : 'var(--text-muted)',
              fontSize: 14,
              fontWeight: 700,
              cursor: agreed && !submitting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: agreed ? '0 4px 14px rgba(245, 158, 11, 0.35)' : 'none',
              transition: 'all 0.2s',
              opacity: agreed ? 1 : 0.6,
            }}
          >
            <span>{submitting ? 'Saqlanmoqda...' : 'Roziman va davom etish'}</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>

      {/* Full Document Detail Modal */}
      {activeModalDoc && (
        <Modal
          isOpen={Boolean(activeModalDoc)}
          onClose={() => setActiveModalDoc(null)}
          title={modalTitle}
          size="xl"
        >
          <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: 8 }} className="custom-scrollbar">
            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                Hujjat yuklanmoqda...
              </div>
            ) : (
              <MarkdownViewer content={modalContent} />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              onClick={() => setActiveModalDoc(null)}
              className="btn btn-primary"
              style={{
                padding: '8px 20px',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Yopish
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
