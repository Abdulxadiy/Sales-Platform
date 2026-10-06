import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Store,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  Sun,
  Moon,
  KeyRound,
  RefreshCw,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

const OTP_EXPIRY_SECONDS = 180; // 3 daqiqa

export default function SetupAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { loginStep1, loginStep2 } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const token = searchParams.get('token');

  // Step 1 = Set Username & Password, Step 2 = Telegram 2FA Verification
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 2 state
  const [accountUsername, setAccountUsername] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [telegramLinked, setTelegramLinked] = useState(true);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimeLeft, setOtpTimeLeft] = useState(OTP_EXPIRY_SECONDS);

  useEffect(() => {
    if (!token) {
      setErrorMsg("Parol o‘rnatish xavfsizlik tokeni topilmadi. Iltimos, emailingizga kelgan to‘liq havoladan foydalaning.");
    }
  }, [token]);

  // OTP 3-daqiqa ortga sanash taymeri
  useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(() => {
      setOtpTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!token) {
      setErrorMsg("Token mavjud emas yoki yaroqsiz.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg("Parol kamida 8 ta belgidan iborat bo‘lishi kerak.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Kiritilgan parollar bir-biriga mos kelmadi.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.passwordResetConfirm({
        token,
        new_password: newPassword,
        username: username.trim() || undefined,
      });

      const effectiveUsername = res.username || username.trim();
      setAccountUsername(effectiveUsername);
      setPhoneHint(res.phone_hint || '');
      setTelegramLinked(res.telegram_linked);

      // Move directly to Step 2 (Telegram 2FA)
      setStep(2);
      setOtpTimeLeft(OTP_EXPIRY_SECONDS);
      setResendCooldown(60);

      if (res.telegram_linked && res.otp_sent) {
        toast.success("Parol saqlandi! Telegram botingizga 6 xonali tasdiqlash kodi yuborildi.");
      } else if (!res.telegram_linked) {
        toast.warning("Parol saqlandi, ammo telefoningiz Telegram botga ulanmagan!");
      } else {
        toast.info("Parol saqlandi. Tasdiqlash kodini kiritishingiz mumkin.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Parolni o‘rnatishda xatolik yuz berdi. Havola eskirgan bo‘lishi mumkin.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Verify = async (e) => {
    e.preventDefault();
    if (otpTimeLeft === 0) {
      setErrorMsg("Tasdiqlash kodi muddati tugagan (3 daqiqa o‘tdi). Iltimos, kodni qayta yuboring.");
      return;
    }

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg("Iltimos, 6 xonali tasdiqlash kodini to‘liq kiriting.");
      return;
    }

    setErrorMsg('');
    setOtpLoading(true);
    try {
      await loginStep2(accountUsername, otpCode.trim());
      toast.success("Xush kelibsiz! Tizimga muvaffaqiyatli kirdingiz.");
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || "Tasdiqlash kodi noto‘g‘ri yoki muddati o‘tgan.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimeLeft > 0 || otpLoading) return;
    setErrorMsg('');
    setOtpLoading(true);
    try {
      const res = await loginStep1(accountUsername, newPassword);
      setPhoneHint(res.phone_hint || phoneHint);
      setTelegramLinked(true);
      setOtpTimeLeft(OTP_EXPIRY_SECONDS);
      toast.info("Yangi tasdiqlash kodi Telegram orqali yuborildi.");
    } catch (err) {
      if (err.message?.includes('telegram') || err.status === 404 || err.status === 502) {
        setTelegramLinked(false);
        setErrorMsg("Telefon raqamingiz Telegram botga ulanmagan. Iltimos, avval botga kiring.");
      } else {
        setErrorMsg(err.message || "Kodni qayta yuborishda xatolik yuz berdi.");
      }
    } finally {
      setOtpLoading(false);
    }
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
        padding: 20,
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
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            width: 44,
            height: 44,
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

      <div
        className="glass-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 460,
          padding: '40px 36px',
          borderRadius: 24,
          border: '1px solid var(--border-card)',
          background: 'var(--bg-card)',
          boxShadow: isDark ? '0 24px 60px rgba(0, 0, 0, 0.7)' : 'var(--shadow-lg)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: 'var(--primary)',
              color: 'var(--text-on-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark ? 'var(--primary-glow)' : 'var(--shadow-md)',
              marginBottom: 14,
            }}
          >
            {step === 1 ? <Store size={30} /> : <ShieldCheck size={30} />}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            {step === 1 ? 'Hisobni Faollashtirish' : 'Telegram 2FA Tasdiqlash'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 6, fontWeight: 500 }}>
            {step === 1
              ? 'Inventra platformasiga kirish uchun parolingizni belgilang'
              : 'Xavfsiz login uchun Telegram orqali yuborilgan kodni kiriting'}
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 12,
              padding: '12px 14px',
              color: 'var(--accent-rose)',
              fontSize: 13,
              marginBottom: 20,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Foydalanuvchi Nomi (Username — Ixtiyoriy)
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 14, top: 14 }}
                />
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  type="text"
                  placeholder="masalan: ali_owner"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 42 }}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Agar kiritmasangiz, telefon raqamingiz yoki emailingiz orqali ham kirishingiz mumkin.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Yangi Parol <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 14, top: 14 }}
                />
                <input
                  id="new-password"
                  name="new-password"
                  autoComplete="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Kamida 8 ta belgi"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="input-field"
                  style={{ paddingLeft: 42, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: 14,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Parolni Qayta Kiriting <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 14, top: 14 }}
                />
                <input
                  id="confirm-password"
                  name="confirm-password"
                  autoComplete="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Parolni qaytadan kiriting"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="input-field"
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="btn btn-primary"
              style={{ marginTop: 8, padding: '13px' }}
            >
              <span>{loading ? 'Saqlanmoqda...' : 'Davom Etish (2FA Tasdiqlash) →'}</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Link to="/login" style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                Login sahifasiga qaytish
              </Link>
            </div>
          </form>
        ) : (
          /* Step 2: Telegram 2FA Code Input & Auto-Login */
          <form onSubmit={handleStep2Verify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                textAlign: 'center',
                padding: '16px',
                borderRadius: 14,
                background: 'var(--primary-light, rgba(59, 130, 246, 0.1))',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <ShieldCheck size={28} color="var(--primary)" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>
                2-Bosqichli Xavfsizlik (2FA)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Telegram botingizga 6 xonali tasdiqlash kodi yuborildi
              </div>
              {phoneHint && (
                <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4, fontWeight: 700 }}>
                  Raqam: {phoneHint}
                </div>
              )}
            </div>

            {/* Warning if telegram is not linked */}
            {!telegramLinked && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 14,
                  padding: '14px',
                  textAlign: 'left',
                  fontSize: 12.5,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--accent-amber, #f59e0b)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={16} />
                  Raqamingiz Telegram botga ulanmagan:
                </div>
                1. Rasmiy botimizga kiring: <strong>@inventraa_bot</strong> (<code>/start</code>).<br />
                2. <strong>"📱 Telefon raqamni ulashish"</strong> tugmasini bosing.<br />
                3. So‘ngra quyidagi <strong>"Kodni qayta yuborish"</strong> tugmasini bosing.
                <div style={{ marginTop: 10 }}>
                  <a
                    href="https://t.me/inventraa_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}
                  >
                    <ExternalLink size={14} />
                    <span>Telegram Botni Ochish (@inventraa_bot)</span>
                  </a>
                </div>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Telegram Tasdiqlash Kodi (6 xonali) <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </label>
                <span style={{ fontSize: 12, fontWeight: 700, color: otpTimeLeft > 30 ? 'var(--primary)' : 'var(--accent-rose)' }}>
                  {formatTimer(otpTimeLeft)}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 14, top: 14 }}
                />
                <input
                  id="otp-code"
                  name="one-time-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  type="text"
                  placeholder={otpTimeLeft === 0 ? "Muddati tugagan" : "123456"}
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  disabled={otpTimeLeft === 0}
                  autoFocus
                  required
                  className="input-field"
                  style={{
                    paddingLeft: 42,
                    fontSize: 20,
                    letterSpacing: '0.25em',
                    fontWeight: 800,
                    textAlign: 'center',
                    opacity: otpTimeLeft === 0 ? 0.6 : 1,
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={otpLoading || otpCode.length !== 6 || otpTimeLeft === 0}
              className="btn btn-primary"
              style={{ padding: '13px', width: '100%', marginTop: 4 }}
            >
              <span>{otpLoading ? 'Tekshirilmoqda...' : otpTimeLeft === 0 ? 'Kodni Yangilang' : 'Tasdiqlash va Tizimga Kirish'}</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpTimeLeft > 0 || otpLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: otpTimeLeft > 0 ? 'var(--text-muted)' : 'var(--primary)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: otpTimeLeft > 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: 0,
                }}
              >
                <RefreshCw size={14} className={otpLoading ? 'animate-spin' : ''} />
                <span>
                  {otpTimeLeft > 0 ? `Kodni qayta yuborish (${formatTimer(otpTimeLeft)})` : 'Kodni qayta yuborish'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Parolni o‘zgartirish
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
