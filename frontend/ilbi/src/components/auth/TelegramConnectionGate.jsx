import IlbiLoader from '../common/IlbiLoader';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { authApi } from '../../api/client';

const BOT_URL = 'https://t.me/ilbi_bot';

export default function TelegramConnectionGate({ loginTicket, phoneHint, onOtpSent, onBack, onRenew, backLabel = 'Orqaga' }) {
  const [linked, setLinked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const checkingRef = useRef(false);
  const autoSentRef = useRef(false);
  const expiredMessage = onRenew
    ? 'Tekshiruv muddati tugagan. Taklif havolasi orqali davom eting.'
    : 'Tekshiruv muddati tugagan. Login sahifasidan parolni qayta kiriting.';

  const sendCode = useCallback(async () => {
    if (sending || !loginTicket) return;
    setSending(true);
    setError('');
    try {
      const response = await authApi.sendTelegramOtp(loginTicket);
      if (!response?.otp_sent) throw new Error('Kod yuborilgani tasdiqlanmadi. Qayta urinib ko‘ring.');
      onOtpSent();
    } catch (err) {
      if (err.status === 404 || err.data?.error === 'telegram_contact_not_found') {
        setLinked(false);
        autoSentRef.current = false;
        setError('Bu raqam @ilbi_bot orqali hali ulanmagan. Botda /start bosing va o‘z telefon kontaktingizni ulashing.');
      } else {
        if (err.status === 400 || err.status === 401 || err.status === 403) setSessionExpired(true);
        setError(err.status === 400 || err.status === 401 || err.status === 403
          ? expiredMessage
          : (err.message || 'Kodni yuborib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.'));
      }
    } finally {
      setSending(false);
    }
  }, [loginTicket, sending, onOtpSent, expiredMessage]);

  const checkConnection = useCallback(async (showError = false) => {
    if (!loginTicket || checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    try {
      const status = await authApi.telegramStatus(loginTicket);
      const isLinked = Boolean(status.telegram_linked);
      setLinked(isLinked);
      setChecked(true);
      setError('');
      if (isLinked && !autoSentRef.current) {
        autoSentRef.current = true;
        sendCode();
      }
    } catch (err) {
      if (err.status === 400 || err.status === 401 || err.status === 403) {
        setLinked(false);
        setSessionExpired(true);
      }
      if (showError || err.status === 400 || err.status === 401 || err.status === 403) {
        setError(err.status === 400 || err.status === 401 || err.status === 403
          ? expiredMessage
          : (err.message || 'Bot bilan ulanishni tekshirib bo‘lmadi. Qayta urinib ko‘ring.'));
      }
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [loginTicket, expiredMessage, sendCode]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => checkConnection(), 0);
    const interval = window.setInterval(() => checkConnection(), 8000);
    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
    };
  }, [checkConnection]);

  const renewTicket = async () => {
    if (!onRenew || renewing) return;
    setRenewing(true);
    setError('');
    try {
      await onRenew();
    } catch (err) {
      setError(err.message || 'Havola orqali davom ettirib bo‘lmadi.');
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 17 }}>
      <div style={{ textAlign: 'center', padding: '6px 0 0' }}>
        <div style={{ width: 54, height: 54, borderRadius: 17, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: linked ? 'rgba(34, 197, 94, 0.15)' : 'var(--primary-light)', color: linked ? 'var(--accent-emerald)' : 'var(--primary)', marginBottom: 12 }}>
          {linked ? <CheckCircle2 size={28} /> : <ShieldCheck size={28} />}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 7px', color: 'var(--text-primary)' }}>
          {linked ? 'Telegram hisobingiz bog‘landi' : 'Telegram botni ulang'}
        </h2>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>
          {linked
            ? 'Raqamingiz tasdiqlandi. Xavfsizlik kodi Telegram botingizga yuborilmoqda...'
            : 'Xavfsizlik kodi yuborilishidan oldin hisobingizga biriktirilgan telefon raqami botda tasdiqlanishi kerak.'}
        </p>
        {phoneHint && <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: '8px 0 0' }}>Hisob raqami: {phoneHint}</p>}
      </div>

      {/* Faqat HALI bog'lanmagan foydalanuvchilar uchungina bot yo'riqnomasi ko'rsatiladi */}
      {!linked && (
        <>
          <div style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-chip)', borderRadius: 14, padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 9 }}><strong style={{ color: 'var(--primary)' }}>1.</strong><span><strong>@ilbi_bot</strong> ni oching va <strong>Start</strong> yoki <code>/start</code> ni bosing.</span></div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 9 }}><strong style={{ color: 'var(--primary)' }}>2.</strong><span>Botdagi <strong>“Telefon raqamni ulashish”</strong> tugmasi bilan aynan o‘zingizning kontaktingizni yuboring.</span></div>
            <div style={{ display: 'flex', gap: 10 }}><strong style={{ color: 'var(--primary)' }}>3.</strong><span>Ulanish tasdiqlangach, tasdiqlash kodi avtomatik yuboriladi.</span></div>
          </div>

          <a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px' }}>
            <ExternalLink size={17} /> Telegram botni ochish (@ilbi_bot)
          </a>
        </>
      )}

      <div aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', borderRadius: 12, background: linked ? 'rgba(34, 197, 94, 0.1)' : 'var(--primary-light)', color: linked ? 'var(--accent-emerald)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
        {linked ? <CheckCircle2 size={18} /> : checking ? <IlbiLoader size={25} inline decorative /> : <RefreshCw size={17} />}
        <span>{linked ? (sending ? 'Tasdiqlash kodi yuborilmoqda...' : 'Raqamingiz botga muvaffaqiyatli ulandi') : checking ? 'Botga ulanish tekshirilmoqda...' : checked ? 'Raqamingiz hali botga ulanmagan' : 'Ulanishni tekshirib bo‘lmadi'}</span>
      </div>

      {error && <div role="alert" style={{ background: 'rgba(var(--danger-rgb), 0.1)', border: '1px solid rgba(var(--danger-rgb), 0.3)', borderRadius: 12, padding: '10px 12px', color: 'var(--accent-rose)', fontSize: 12.5 }}>{error}</div>}

      {sessionExpired && onRenew ? (
        <button type="button" onClick={renewTicket} disabled={renewing} className="btn btn-primary" style={{ width: '100%', padding: '13px', justifyContent: 'center' }}>
          {renewing ? <IlbiLoader size={25} inline decorative /> : <RefreshCw size={17} />}  {renewing ? 'Yangilanmoqda...' : 'Havola orqali davom etish'}
        </button>
      ) : linked ? (
        <button type="button" onClick={sendCode} disabled={sending} className="btn btn-primary" style={{ width: '100%', padding: '13px', justifyContent: 'center' }}>
          <Send size={17} /> {sending ? 'Kod yuborilmoqda...' : 'Tasdiqlash kodini yuborish'} <ArrowRight size={17} />
        </button>
      ) : (
        <button type="button" onClick={() => checkConnection(true)} disabled={checking} className="btn btn-primary" style={{ width: '100%', padding: '13px', justifyContent: 'center' }}>
          {checking ? <IlbiLoader size={25} inline decorative /> : <RefreshCw size={17} />}  {checking ? 'Tekshirilmoqda...' : 'Ulanishni tekshirish'}
        </button>
      )}

      {onBack && <button type="button" onClick={onBack} style={{ alignSelf: 'center', border: 0, background: 'none', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, cursor: 'pointer' }}><ArrowLeft size={15} /> {backLabel}</button>}
    </div>
  );
}
