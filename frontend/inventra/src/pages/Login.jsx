import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Lock, User, KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff, Sun, Moon, HelpCircle, Play, Clock, RefreshCw, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { authApi } from '../api/client';
import Modal from '../components/common/Modal';
import InventraLogo from '../components/common/InventraLogo';
import InventraIntroAnimation from '../components/common/InventraIntroAnimation';

const OTP_EXPIRY_SECONDS = 180; // 3 daqiqa

export default function Login() {
  const navigate = useNavigate();
  const { loginStep1, loginStep2, loading, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(1); // 1 = credentials, 2 = telegram otp
  const [rememberMe, setRememberMe] = useState(() => {
    const saved = localStorage.getItem('inventra_remember_me');
    return saved !== null ? saved === 'true' : true;
  });
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('inventra_remember_login') || '';
  });
  const [password, setPassword] = useState(() => {
    try {
      const savedPass = localStorage.getItem('inventra_remember_password');
      return savedPass ? decodeURIComponent(escape(atob(savedPass))) : '';
    } catch {
      return '';
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneHint, setPhoneHint] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [otpTimeLeft, setOtpTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resending, setResending] = useState(false);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    if (username && !password && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [username, password]);

  // 2FA OTP Countdown Timer (3 daqiqa)
  useEffect(() => {
    if (step !== 2) return;

    const timer = setInterval(() => {
      setOtpTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRememberMeChange = (e) => {
    const checked = e.target.checked;
    setRememberMe(checked);
    if (!checked) {
      localStorage.removeItem('inventra_remember_login');
      localStorage.removeItem('inventra_remember_password');
      localStorage.setItem('inventra_remember_me', 'false');
    } else {
      localStorage.setItem('inventra_remember_me', 'true');
      if (username) localStorage.setItem('inventra_remember_login', username.trim());
      if (password) {
        try {
          localStorage.setItem('inventra_remember_password', btoa(unescape(encodeURIComponent(password))));
        } catch {
          // ignore
        }
      }
    }
  };

  // Password reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetMode, setResetMode] = useState('sent'); // 'sent' | 'change_with_old' | 'prompt_login'
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [hasEmail, setHasEmail] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleStep1 = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (rememberMe) {
        localStorage.setItem('inventra_remember_login', username.trim());
        try {
          localStorage.setItem('inventra_remember_password', btoa(unescape(encodeURIComponent(password))));
        } catch {
          // ignore
        }
        localStorage.setItem('inventra_remember_me', 'true');
      } else {
        localStorage.removeItem('inventra_remember_login');
        localStorage.removeItem('inventra_remember_password');
        localStorage.setItem('inventra_remember_me', 'false');
      }
      const res = await loginStep1(username.trim(), password);
      setPhoneHint(res.phone_hint || '');
      setOtpCode('');
      setOtpTimeLeft(OTP_EXPIRY_SECONDS);
      setStep(2);
      toast.info('Tasdiqlash kodi Telegram orqali yuborildi');
    } catch (err) {
      setErrorMsg(err.message || 'Login yoki parol noto‘g‘ri');
    }
  };

  const handleResendOtp = async () => {
    if (otpTimeLeft > 0 || resending) return;
    setResending(true);
    setErrorMsg('');
    try {
      const res = await loginStep1(username.trim(), password);
      if (res.phone_hint) setPhoneHint(res.phone_hint);
      setOtpCode('');
      setOtpTimeLeft(OTP_EXPIRY_SECONDS);
      toast.success('Yangi tasdiqlash kodi Telegram orqali yuborildi');
    } catch (err) {
      setErrorMsg(err.message || 'Kodni qayta yuborishda xatolik yuz berdi');
    } finally {
      setResending(false);
    }
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (otpTimeLeft === 0) {
      setErrorMsg('Tasdiqlash kodi muddati tugagan (3 daqiqa o‘tdi). Iltimos, pastdagi "Kodni qayta yuborish" tugmasini bosing.');
      return;
    }

    try {
      if (rememberMe) {
        localStorage.setItem('inventra_remember_login', username.trim());
        localStorage.setItem('inventra_remember_me', 'true');
      } else {
        localStorage.removeItem('inventra_remember_login');
        localStorage.setItem('inventra_remember_me', 'false');
      }
      await loginStep2(username.trim(), otpCode, rememberMe);
      toast.success('Xush kelibsiz!');
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Tasdiqlash kodi noto‘g‘ri yoki muddati o‘tgan');
    }
  };

  const triggerPasswordReset = async (ident) => {
    const trimmed = (ident || '').trim();
    if (!trimmed) {
      toast.warning('Foydalanuvchi nomi yoki telefon raqamingizni kiriting');
      return;
    }
    setResetLoading(true);
    try {
      const res = await authApi.passwordResetRequest(trimmed);
      setResetIdentifier(trimmed);
      setEmailHint(res.email_hint || '');
      setHasEmail(Boolean(res.has_email));
      setResetMode('sent');
      setResetModalOpen(true);
      if (res.has_email) {
        toast.success(res.detail || 'Tiklash havolasi emailingizga yuborildi');
      } else {
        toast.info(res.detail || 'Hisob ma’lumotlari qabul qilindi');
      }
    } catch (err) {
      toast.error(err.message || 'Parolni tiklash so‘rovida xatolik');
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotClick = async () => {
    const ident = username.trim();
    if (!ident) {
      setResetIdentifier('');
      setResetMode('prompt_login');
      setResetModalOpen(true);
      return;
    }
    await triggerPasswordReset(ident);
  };

  const handleChangeWithOld = async (e) => {
    e.preventDefault();
    const loginUser = (resetIdentifier || username || '').trim();
    if (!loginUser) {
      toast.warning('Login kiritilishi shart');
      return;
    }
    if (!oldPassword || !newPassword) {
      toast.warning('Barcha maydonlarni to‘ldiring');
      return;
    }
    if (newPassword.length < 8) {
      toast.warning('Yangi parol kamida 8 ta belgidan iborat bo‘lishi kerak');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Yangi parollar bir-biriga mos kelmadi');
      return;
    }
    setResetLoading(true);
    try {
      const res = await authApi.changePasswordWithOld({
        login: loginUser,
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success(res.detail || 'Parolingiz muvaffaqiyatli yangilandi!');
      setResetModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setUsername(loginUser);
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
    } catch (err) {
      toast.error(err.message || 'Parolni yangilashda xatolik');
    } finally {
      setResetLoading(false);
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
      {/* Fullscreen Intro Animation */}
      {showIntro && (
        <InventraIntroAnimation
          isDark={isDark}
          onComplete={() => setShowIntro(false)}
        />
      )}

      {/* Top Bar with Replay & Theme Switcher */}
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
          onClick={() => setShowIntro(true)}
          style={{
            height: 42,
            padding: '0 14px',
            borderRadius: 14,
            background: 'var(--bg-chip)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
          title="Kirish animatsiyasini qayta ko‘rish"
        >
          <Play size={13} fill="var(--primary)" color="var(--primary)" />
          <span>Intro</span>
        </button>

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

      {/* Decorative Ambient Glow (Warm Amber in dark mode) */}
      <div
        style={{
          position: 'absolute',
          width: 440,
          height: 440,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(12, 10, 9, 0) 70%)'
            : 'radial-gradient(circle, rgba(11, 9, 9, 0.08) 0%, rgba(240, 239, 235, 0) 70%)',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -20%)',
          filter: 'blur(75px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="glass-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '40px 36px',
          borderRadius: 24,
          border: '1px solid var(--border-card)',
          background: 'var(--bg-card)',
          boxShadow: isDark ? '0 24px 60px rgba(0, 0, 0, 0.75)' : 'var(--shadow-lg)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Brand Logo & Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 12 }}>
            <InventraLogo size={58} variant="vertical" badgeText="PRO" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0', fontWeight: 500, letterSpacing: '0.04em' }}>
            Savdo Platformasi & POS Tizimi
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 12,
              padding: '10px 14px',
              color: 'var(--accent-rose)',
              fontSize: 13,
              marginBottom: 20,
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Foydalanuvchi nomi, telefon raqam yoki email
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
                  placeholder="admin, +998901234567 yoki email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="input-field"
                  style={{ paddingLeft: 42 }}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Username, tizimga biriktirilgan telefon raqam (+998...) yoki email orqali kiring
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Maxfiy parol
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 14, top: 14 }}
                />
                <input
                  ref={passwordInputRef}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

              {/* Meni eslab qol & Parolni unutdingizmi */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 10,
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={handleRememberMeChange}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      accentColor: 'var(--primary)',
                      cursor: 'pointer',
                    }}
                  />
                  <span>Meni eslab qol</span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotClick}
                  disabled={resetLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: resetLoading ? 'not-allowed' : 'pointer',
                    padding: 0,
                  }}
                >
                  {resetLoading ? 'Yuborilmoqda...' : 'Unutdingizmi?'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: 8, padding: '13px' }}
            >
              <span>{loading ? 'Tekshirilmoqda...' : 'Davom etish'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleStep2} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                textAlign: 'center',
                padding: '16px',
                borderRadius: 14,
                background: 'var(--primary-light)',
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
                <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>
                  Aloqa: {phoneHint}
                </div>
              )}

              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5, borderTop: '1px dashed var(--border-subtle)', paddingTop: 8 }}>
                Kod kelmadimi? Rasmiy Telegram botimiz:{' '}
                <a
                  href="https://t.me/inventraa_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}
                >
                  @inventraa_bot
                </a>
                <br />
                Botga kirib (<code>/start</code>), telefon raqamingizni ulaganingizga ishonch hosil qiling.
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Tasdiqlash kodi (OTP)
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
                    fontSize: 18,
                    letterSpacing: '0.25em',
                    fontWeight: 800,
                    opacity: otpTimeLeft === 0 ? 0.6 : 1,
                  }}
                />
              </div>
            </div>

            {/* Resend OTP button — faqat 3 daqiqa to'liq tugagandan so'ng ochiladi */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: -2 }}>
              {otpTimeLeft > 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                  }}
                >
                  <span>Kodni qayta yuborish:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {formatTimer(otpTimeLeft)}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  style={{
                    background: 'none',
                    border: '1px solid var(--primary)',
                    color: 'var(--primary)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: resending ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 8,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                  <span>{resending ? 'Yuborilmoqda...' : 'Kodni qayta yuborish'}</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Orqaga
              </button>
              <button
                type="submit"
                disabled={loading || otpTimeLeft === 0}
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                {loading ? 'Kutilyapti...' : otpTimeLeft === 0 ? 'Kodni Yangilang' : 'Tizimga Kirish'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Password Reset Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={
          resetMode === 'change_with_old'
            ? 'Eski Parol Orqali Yangilash'
            : 'Parolni Qayta Tiklash'
        }
      >
        {resetMode === 'prompt_login' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              triggerPasswordReset(resetIdentifier);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Parolni tiklash havolasini hisobingizga biriktirilgan emailga yuborish uchun
              foydalanuvchi nomingizni (username) yoki telefon raqamingizni kiriting.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Foydalanuvchi nomi, telefon yoki email <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="text"
                  placeholder="admin, +998901234567 yoki email"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 42 }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="btn btn-secondary"
              >
                Bekor Qilish
              </button>
              <button
                type="submit"
                disabled={resetLoading}
                className="btn btn-primary"
              >
                {resetLoading ? 'Yuborilmoqda...' : 'Tiklash Havolasini Yuborish'}
              </button>
            </div>
          </form>
        )}

        {resetMode === 'sent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {hasEmail ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Tiklash Havolasi Yuborildi
                    </h4>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Elektron pochtangizni tekshiring
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Sizning hisobingizga biriktirilgan{' '}
                  <strong style={{ color: 'var(--primary)', letterSpacing: '0.04em', fontWeight: 700 }}>
                    {emailHint}
                  </strong>{' '}
                  pochtasiga parolni qayta tiklash uchun bir martalik havola yuborildi.
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}
                >
                  Iltimos, pochtangizni (jumladan <strong>"Spam"</strong> papkasini) tekshiring. Havola 24 soat davomida amal qiladi.
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'rgba(245, 158, 11, 0.06)',
                    border: '1px dashed rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    Ushbu pochtaga kirish imkoni yo‘qmi yoki undan foydalanmaysizmi?
                  </span>
                  <button
                    type="button"
                    onClick={() => setResetMode('change_with_old')}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    Men bu emaildan foydalanmayman &rarr;
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="btn btn-primary"
                    style={{ minWidth: 120 }}
                  >
                    Tushundim
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: 'rgba(244, 63, 94, 0.12)',
                      color: 'var(--accent-rose)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Email Manzil Mavjud Emas
                    </h4>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Akkauntga email biriktirilmagan
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Ushbu hisobga elektron pochta biriktirilmagan. Parolni eslab qolgan eski (joriy)
                  parolingiz orqali yangilashingiz mumkin.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    Yopish
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetMode('change_with_old')}
                    className="btn btn-primary"
                  >
                    Eski Parol Bilan Yangilash
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {resetMode === 'change_with_old' && (
          <form onSubmit={handleChangeWithOld} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Emailingizga kira olmasangiz, eslab qolgan joriy (eski) parolingizni kiritib yangi parol o‘rnatishingiz mumkin.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                Foydalanuvchi nomi / Login
              </label>
              <input
                type="text"
                value={resetIdentifier || username}
                disabled
                className="input-field"
                style={{ opacity: 0.75, cursor: 'not-allowed' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                Eski (joriy) parol <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                Yangi parol <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Kamida 8 ta belgi"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                Yangi parolni takrorlang <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setResetMode(hasEmail ? 'sent' : 'prompt_login')}
                className="btn btn-secondary"
              >
                Orqaga
              </button>
              <button
                type="submit"
                disabled={resetLoading}
                className="btn btn-primary"
              >
                {resetLoading ? 'Yangilanmoqda...' : 'Parolni Yangilash'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
