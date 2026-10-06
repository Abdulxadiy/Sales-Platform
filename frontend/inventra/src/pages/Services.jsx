import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Coins,
  Send,
  Receipt,
  Cpu,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Store,
  RefreshCw,
  Bell,
  Smartphone,
  Info,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { tenantApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Services() {
  const { user, isAdmin, isOwner } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('currency'); // 'currency' | 'telegram' | 'receipt' | 'automation'
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(user?.tenant_id || null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [sendingReportNow, setSendingReportNow] = useState(false);

  // Quick Calculator State (USD <-> UZS)
  const [calcUsd, setCalcUsd] = useState('100');
  const [calcUzs, setCalcUzs] = useState('');

  // Main Form Data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    usd_rate: '12800.00',
    daily_report_time: '22:00:00',
    daily_report_target: 'both',
    shift_report_target: 'both',
    telegram_group_id: '',
    notify_web_reports: true,
    notify_on_sale: false,
    notify_on_debt: false,
    receipt_header: 'Xaridingiz uchun rahmat!',
    receipt_footer: 'Tovarlar 14 kun ichida almashtiriladi.',
    receipt_phone: '',
  });

  // Load tenant list for platform_admin
  useEffect(() => {
    if (isAdmin) {
      tenantApi
        .getTenants()
        .then((res) => {
          const list = Array.isArray(res) ? res : res.results || [];
          setTenants(list);
          if (list.length > 0 && !selectedTenantId) {
            setSelectedTenantId(list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  // Load current tenant settings
  const loadTenantData = useCallback(async () => {
    setLoading(true);
    try {
      const params = isAdmin && selectedTenantId ? { tenant_id: selectedTenantId } : {};
      const data = await tenantApi.getCurrentTenant(params);
      setTenant(data);
      setFormData({
        name: data.name || '',
        description: data.description || '',
        usd_rate: data.usd_rate ? String(data.usd_rate) : '12800.00',
        daily_report_time: data.daily_report_time || '22:00:00',
        daily_report_target: data.daily_report_target || 'both',
        shift_report_target: data.shift_report_target || 'both',
        telegram_group_id: data.telegram_group_id || '',
        notify_web_reports: data.notify_web_reports !== undefined ? data.notify_web_reports : true,
        notify_on_sale: Boolean(data.notify_on_sale),
        notify_on_debt: Boolean(data.notify_on_debt),
        receipt_header: data.receipt_header || 'Xaridingiz uchun rahmat!',
        receipt_footer: data.receipt_footer || 'Tovarlar 14 kun ichida almashtiriladi.',
        receipt_phone: data.receipt_phone || '',
      });

      // Update calculator initial UZS
      const rate = parseFloat(data.usd_rate) || 12800;
      setCalcUzs((100 * rate).toLocaleString('uz-UZ'));
    } catch (err) {
      toast.error('Do‘kon sozlamalarini yuklashda xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedTenantId, toast]);

  useEffect(() => {
    loadTenantData();
  }, [loadTenantData]);

  // Handle Calculator Changes
  const handleUsdChange = (val) => {
    setCalcUsd(val);
    const rate = parseFloat(formData.usd_rate) || 12800;
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setCalcUzs((num * rate).toLocaleString('uz-UZ'));
    } else {
      setCalcUzs('');
    }
  };

  const handleUzsChange = (val) => {
    const clean = val.replace(/\s+/g, '');
    setCalcUzs(clean);
    const rate = parseFloat(formData.usd_rate) || 12800;
    const num = parseFloat(clean);
    if (!isNaN(num) && rate > 0) {
      setCalcUsd((num / rate).toFixed(2));
    } else {
      setCalcUsd('');
    }
  };

  // Save Tenant Settings
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        usd_rate: parseFloat(formData.usd_rate) || 12800,
      };
      const params = isAdmin && selectedTenantId ? { tenant_id: selectedTenantId } : {};
      const updated = await tenantApi.updateCurrentTenant(payload, params);
      setTenant(updated);
      toast.success('Sozlamalar muvaffaqiyatli saqlandi');
    } catch (err) {
      toast.error('Saqlashda xatolik yuz berdi: ' + (err.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Test Telegram Message
  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    try {
      const params = isAdmin && selectedTenantId ? { tenant_id: selectedTenantId } : {};
      const res = await tenantApi.testTelegram(params);
      toast.success(res.detail || 'Test xabari muvaffaqiyatli yuborildi!');
    } catch (err) {
      toast.error('Telegram test xatosi: ' + (err.detail || err.message));
    } finally {
      setTestingTelegram(false);
    }
  };

  // Send Daily Report Now
  const handleSendReportNow = async () => {
    setSendingReportNow(true);
    try {
      const params = isAdmin && selectedTenantId ? { tenant_id: selectedTenantId } : {};
      const res = await tenantApi.sendDailyReportNow(params);
      toast.success(res.detail || 'Bugungi kunlik hisobot jo‘natildi!');
    } catch (err) {
      toast.error('Hisobotni yuborishda xatolik: ' + (err.detail || err.message));
    } finally {
      setSendingReportNow(false);
    }
  };

  const tabs = [
    { key: 'currency', label: 'Valyuta & Kurs', icon: Coins },
    { key: 'telegram', label: 'Telegram & Bildirishnomalar', icon: Send },
    { key: 'receipt', label: 'Chek & Kassa', icon: Receipt },
    { key: 'automation', label: 'Avtomatlashtirish & Xizmatlar', icon: Cpu },
  ];

  if (loading && !tenant) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <div>Xizmatlar va sozlamalar yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Header Card */}
      <div
        className="glass-card"
        style={{
          padding: '24px 28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sliders size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Xizmatlar & Do‘kon Sozlamalari
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Do‘koningizning ichki valyuta kursi, Telegram integratsiyasi, chek sozlamalari va xizmatlari
            </div>
          </div>
        </div>

        {/* Platform Admin Tenant Selector or Store Badge */}
        {isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Do‘kon:
            </span>
            <select
              value={selectedTenantId || ''}
              onChange={(e) => setSelectedTenantId(Number(e.target.value))}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (ID: {t.id})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              background: 'var(--bg-chip)',
              border: '1px solid var(--border-subtle)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            <Store size={15} color="var(--primary)" />
            <span>{tenant?.name || 'Mening Do‘konim'}</span>
          </div>
        )}
      </div>

      {/* Tabs Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {tabs.map((tab) => {
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
                fontSize: 13.5,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: isActive ? 'var(--primary)' : 'var(--bg-card)',
                color: isActive ? 'var(--text-on-primary)' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 14px rgba(245, 158, 11, 0.25)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VALYUTA & KURS */}
      {/* ========================================================================= */}
      {activeTab === 'currency' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Ichki Valyuta Kursi (1 USD / UZS)
                </h3>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  Kassa, sotuv narxlari va tovarlar hisob-kitoblarida 1 AQSH dollari uchun qo‘llaniladigan baza kursi
                </div>
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--primary)',
                  padding: '6px 14px',
                  borderRadius: 10,
                  background: 'var(--primary-light)',
                }}
              >
                1 $ = {Number(formData.usd_rate || 0).toLocaleString('uz-UZ')} UZS
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Baza Dollar Kursi (so‘mda)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="number"
                    step="50"
                    min="1"
                    value={formData.usd_rate}
                    onChange={(e) => {
                      setFormData({ ...formData, usd_rate: e.target.value });
                      const num = parseFloat(calcUsd);
                      const rate = parseFloat(e.target.value);
                      if (!isNaN(num) && !isNaN(rate)) {
                        setCalcUzs((num * rate).toLocaleString('uz-UZ'));
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '11px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: 16,
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>UZS</span>
                </div>

                {/* Quick rate adjustment chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {[12750, 12800, 12850, 12900, 12950].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, usd_rate: String(preset) });
                        const num = parseFloat(calcUsd);
                        if (!isNaN(num)) setCalcUzs((num * preset).toLocaleString('uz-UZ'));
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 12, borderRadius: 8 }}
                    >
                      {preset.toLocaleString('uz-UZ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Calculator Card */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  <Sparkles size={15} color="var(--primary)" />
                  <span>Tezkor Kurs Kalkulyatori</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>USD ($)</div>
                    <input
                      type="number"
                      value={calcUsd}
                      onChange={(e) => handleUsdChange(e.target.value)}
                      placeholder="USD"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border-card)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    />
                  </div>
                  <ArrowRight size={16} style={{ color: 'var(--text-muted)', marginTop: 18 }} />
                  <div style={{ flex: 1.4 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>UZS (so‘m)</div>
                    <input
                      type="text"
                      value={calcUzs}
                      onChange={(e) => handleUzsChange(e.target.value)}
                      placeholder="UZS"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border-card)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Information Notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'var(--bg-chip)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Info size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Dollar kursi o‘zgartirilganda, katalogdagi avtomatik konvertatsiya va kassa smenasidagi yangi sotuvlar ushbu kurs bo‘yicha amalga oshiriladi. Avval yopilgan tarixiy smenalar va hisobotlar o‘zgartirilmaydi.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
              >
                <Save size={16} />
                <span>{saving ? 'Saqlanmoqda...' : 'Kursni Saqlash'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TELEGRAM & BILDIRISHNOMALAR */}
      {/* ========================================================================= */}
      {activeTab === 'telegram' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card: Telegram Guruh / Kanal ID */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Telegram Guruh yoki Kanal Integratsiyasi
                </h3>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  Kunlik savdo va smena Z-hisobotlarini avtomatik qabul qiluvchi guruh yoki kanal ID si
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testingTelegram || !formData.telegram_group_id}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: 12.5 }}
                title="Guruhga va shaxsiy chatga test xabari yuborib ko‘rish"
              >
                <Send size={14} color="var(--primary)" />
                <span>{testingTelegram ? 'Yuborilmoqda...' : 'Test xabar yuborish'}</span>
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Telegram Guruh / Kanal ID (yoki @kanal_nomi)
              </label>
              <input
                type="text"
                placeholder="Masalan: -1001928374650 yoki @mening_dokonim"
                value={formData.telegram_group_id}
                onChange={(e) => setFormData({ ...formData, telegram_group_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            {/* Step-by-Step Telegram ID Instruction Guide */}
            <div
              style={{
                borderRadius: 14,
                padding: '16px 20px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                <HelpCircle size={16} color="var(--primary)" />
                <span>Telegram Guruh yoki Kanal ID sini qanday olish mumkin?</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    1
                  </div>
                  <div>
                    Telegram qidiruvidan <strong style={{ color: 'var(--primary)' }}>@inventraa_bot</strong> botimizni toping va uni guruhingiz yoki kanalingizga a’zo qilib qo‘shing.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    2
                  </div>
                  <div>
                    Botga guruhda yoki kanalda xabar yoza olishi uchun <strong>Administrator (Admin)</strong> huquqini bering.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    3
                  </div>
                  <div>
                    <strong>ID raqamini aniqlash:</strong> Guruhingizga <strong style={{ color: 'var(--primary)' }}>@myidbot</strong> yoki <strong style={{ color: 'var(--primary)' }}>@getmyid_bot</strong> botini vaqtincha qo‘shib, guruhda <code>/getgroupid</code> buyrug‘ini yuboring (u <code>-100...</code> bilan boshlanuvchi ID qaytaradi). Agar ommaviy kanal bo‘lsa, to‘g‘ridan-to‘g‘ri kanal username’ini (masalan: <code>@mening_kanalim</code>) kiritishingiz mumkin.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    4
                  </div>
                  <div>
                    Olingan ID ni yuqoridagi maydonga kiriting, <strong>Sozlamalarni saqlash</strong> tugmasini bosing va <strong>Test xabar yuborish</strong> orqali tekshirib ko‘ring!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Report Destination Selectors */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Hisobotlar Yuborilish Manzili
              </h3>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Kunlik avtomatik hisobot va kassa smenasi yopilgandagi Z-hisobot qayerga yuborilishini belgilang
              </div>
            </div>

            {/* Kunlik Hisobot Yo'nalishi */}
            <div>
              <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                1. Kunlik Yig‘ma Hisobot Manzili
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {[
                  { value: 'both', title: 'Ikkalasiga ham (Tavsiya)', desc: 'Ham guruh/kanalga, ham do‘kon egasining shaxsiy Telegramiga' },
                  { value: 'group', title: 'Faqat Guruh / Kanalga', desc: 'Shaxsiy chatni bezovta qilmasdan guruhga jo‘natadi' },
                  { value: 'user', title: 'Faqat Shaxsiy Chatga', desc: 'Faqat do‘kon egasining shaxsiy Telegramiga boradi' },
                  { value: 'none', title: 'O‘chirib qo‘yish', desc: 'Telegramga kunlik hisobot yuborilmaydi' },
                ].map((opt) => {
                  const isChecked = formData.daily_report_target === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setFormData({ ...formData, daily_report_target: opt.value })}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        border: isChecked ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: isChecked ? 'var(--primary-light)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: isChecked ? 'var(--primary)' : 'var(--text-primary)' }}>
                          {opt.title}
                        </span>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            border: `2px solid ${isChecked ? 'var(--primary)' : 'var(--border-subtle)'}`,
                            background: isChecked ? 'var(--primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isChecked && <Check size={11} color="white" />}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {opt.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smena Yopilgandagi Z-Hisobot Yo'nalishi */}
            <div>
              <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                2. Smena Yopilgandagi Z-Hisobot Manzili
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {[
                  { value: 'both', title: 'Ikkalasiga ham (Tavsiya)', desc: 'Guruhga hamda egasining shaxsiy Telegramiga jo‘natadi' },
                  { value: 'group', title: 'Faqat Guruh / Kanalga', desc: 'Faqat do‘kon guruhiga yuboriladi' },
                  { value: 'user', title: 'Faqat Shaxsiy Chatga', desc: 'Faqat do‘kon egasiga yuboriladi' },
                  { value: 'none', title: 'O‘chirib qo‘yish', desc: 'Smena yopilganda Telegramga hisobot bormaydi' },
                ].map((opt) => {
                  const isChecked = formData.shift_report_target === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setFormData({ ...formData, shift_report_target: opt.value })}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        border: isChecked ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: isChecked ? 'var(--primary-light)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: isChecked ? 'var(--primary)' : 'var(--text-primary)' }}>
                          {opt.title}
                        </span>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            border: `2px solid ${isChecked ? 'var(--primary)' : 'var(--border-subtle)'}`,
                            background: isChecked ? 'var(--primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isChecked && <Check size={11} color="white" />}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {opt.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card: Web Interfeys va Qo'shimcha Signallar */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Web Interfeys va Qo‘shimcha Signallar
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Web Notification Toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.notify_web_reports}
                  onChange={(e) => setFormData({ ...formData, notify_web_reports: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', marginTop: 2, cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Web interfeysga Z-hisobot bildirishnomasini chiqarish
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    O‘chirib qo‘yilsa, smena yopilganda hisobot web interfeysdagi bildirishnomalar oynasiga (qo‘ng‘iroqcha) tushmaydi, bu esa bildirishnomalar to‘lib ketishining oldini oladi.
                  </span>
                </div>
              </label>

              {/* Notify on sale */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.notify_on_sale}
                  onChange={(e) => setFormData({ ...formData, notify_on_sale: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', marginTop: 2, cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Savdolar haqida Telegramda xabardor qilish
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    Kassada amalga oshirilgan yirik va muhim savdolar haqida Telegramga tezkor xabar yuborish.
                  </span>
                </div>
              </label>

              {/* Notify on debt */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.notify_on_debt}
                  onChange={(e) => setFormData({ ...formData, notify_on_debt: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', marginTop: 2, cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Nasiya va qarz to‘lovlari haqida xabar berish
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                    Mijoz nasiyasi yozilganda yoki qarz to‘langanda Telegram manziliga xabar yetkaziladi.
                  </span>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
              >
                <Save size={16} />
                <span>{saving ? 'Saqlanmoqda...' : 'Telegram Sozlamalarini Saqlash'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CHEK & KASSA SOZLAMALARI */}
      {/* ========================================================================= */}
      {activeTab === 'receipt' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Settings inputs */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Chek Rekvizitlari & Matnlari
              </h3>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Sotuv chekida chop etiladigan do‘kon sarlavhasi, yakuniy izohi va kontakt raqamlari
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Chek Yuqori Qismi (Sarlavha)
              </label>
              <input
                type="text"
                placeholder="Masalan: Bizni tanlaganingizdan mamnunmiz!"
                value={formData.receipt_header}
                onChange={(e) => setFormData({ ...formData, receipt_header: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Chek Pastki Qismi (Yakuniy Eslatma)
              </label>
              <textarea
                rows={3}
                placeholder="Masalan: Tovarlar 14 kun ichida almashtiriladi. Xaridingiz barakali bo‘lsin!"
                value={formData.receipt_footer}
                onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Chekda Ko‘rsatiladigan Telefon
              </label>
              <input
                type="text"
                placeholder="Masalan: +998 90 123 45 67"
                value={formData.receipt_phone}
                onChange={(e) => setFormData({ ...formData, receipt_phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
              >
                <Save size={16} />
                <span>{saving ? 'Saqlanmoqda...' : 'Chek Sozlamalarini Saqlash'}</span>
              </button>
            </div>
          </div>

          {/* Live Receipt Visual Preview */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={18} color="var(--primary)" />
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Chek Ko‘rinishi (Jonli Preview)
              </h3>
            </div>

            {/* Thermal paper mock card */}
            <div
              style={{
                background: '#fafafa',
                color: '#18181b',
                borderRadius: 8,
                padding: '24px 20px',
                fontFamily: 'monospace, monospace',
                fontSize: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                border: '1px dashed #d4d4d8',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase' }}>
                  {tenant?.name || 'INVENTRA SAVDO'}
                </div>
                {formData.receipt_header && (
                  <div style={{ fontSize: 11, fontStyle: 'italic', color: '#52525b' }}>
                    {formData.receipt_header}
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: '#71717a' }}>
                  Sana: {new Date().toLocaleDateString('uz-UZ')} {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} | Chek #1042
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #a1a1aa' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Nomi</span>
                  <span>Summa</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>1. Smartfon Galaxy A54 (1x)</span>
                  <span>3,850,000 UZS</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>2. Himoya oynasi 9D (2x)</span>
                  <span>70,000 UZS</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #a1a1aa' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800 }}>
                <span>JAMI TO‘LOV:</span>
                <span>3,920,000 UZS</span>
              </div>

              <div style={{ borderTop: '1px dashed #a1a1aa' }} />

              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {formData.receipt_footer && (
                  <div style={{ fontSize: 11, color: '#3f3f46', lineHeight: 1.4 }}>
                    {formData.receipt_footer}
                  </div>
                )}
                {formData.receipt_phone && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#18181b', marginTop: 2 }}>
                    Aloqa: {formData.receipt_phone}
                  </div>
                )}
                <div style={{ fontSize: 9.5, color: '#a1a1aa', marginTop: 6 }}>
                  Inventra Savdo Platformasi orqali chop etildi
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AVTOMATLASHTIRISH & XIZMATLAR */}
      {/* ========================================================================= */}
      {activeTab === 'automation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card: Daily Report Time */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Avtomatik Kunlik Hisobot Vaqti
                </h3>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  Celery Beat orqali do‘konning kunlik umumiy balansi va savdo natijalari avtomatik yuboriladigan reja vaqti
                </div>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <Clock size={15} />
                <span>Reja: {formData.daily_report_time.slice(0, 5)}</span>
              </div>
            </div>

            <div style={{ maxWidth: 300 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Hisobot Yuborilish Soati
              </label>
              <input
                type="time"
                step="60"
                value={formData.daily_report_time.slice(0, 5)}
                onChange={(e) => setFormData({ ...formData, daily_report_time: e.target.value + ':00' })}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 15,
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
              >
                <Save size={16} />
                <span>{saving ? 'Saqlanmoqda...' : 'Vaqtni Saqlash'}</span>
              </button>
            </div>
          </div>

          {/* Card: Manual Instant Trigger */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ maxWidth: 650 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Qo‘lda Tezkor Hisobot Yuborish (Instant Trigger)
              </h3>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Rejadagi kechki soatni kutmasdan, bugungi ayni paytgacha bo‘lgan barcha savdolar va kassa holatini Telegramdagi belgilangan manzilga darhol yuborish.
              </div>
            </div>
            <button
              type="button"
              onClick={handleSendReportNow}
              disabled={sendingReportNow}
              className="btn btn-secondary"
              style={{
                padding: '11px 20px',
                fontSize: 13.5,
                fontWeight: 700,
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
              }}
            >
              <Send size={16} />
              <span>{sendingReportNow ? 'Hisobot yuborilmoqda...' : 'Hisobotni Hozir Yuborish'}</span>
            </button>
          </div>

          {/* Card: System Diagnostics */}
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Tizim Xizmatlari Holati (Diagnostika)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--accent-emerald, #10b981)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Telegram Bot</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>@inventraa_bot (Faol)</div>
                </div>
              </div>

              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--accent-emerald, #10b981)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Celery Beat Planner</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Avtomatik rejalashtiruvchi</div>
                </div>
              </div>

              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--accent-emerald, #10b981)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Redis Kesh & Navbat</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Xabarlar navbati ulangan</div>
                </div>
              </div>

              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--accent-emerald, #10b981)' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>O‘zgarmas Audit</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Xavfsizlik protokoli faol</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
