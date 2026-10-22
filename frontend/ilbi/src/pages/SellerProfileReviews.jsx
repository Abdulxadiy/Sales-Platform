import IlbiLoader from '../components/common/IlbiLoader';
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react';
import { tenantApi } from '../api/client';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import CustomSelect from '../components/common/CustomSelect';
import CustomDatePicker from '../components/common/CustomDatePicker';
import { useToast } from '../context/ToastContext';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Tekshiruv kutilmoqda' },
  { value: 'approved', label: 'Tasdiqlangan' },
  { value: 'rejected', label: 'Rad etilgan' },
  { value: 'expired', label: 'Muddati o‘tgan' },
  { value: 'all', label: 'Barcha holatlar' },
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', dateStyle: 'medium', timeStyle: 'short' });
}

function statusColor(status) {
  if (status === 'approved') return 'var(--accent-emerald)';
  if (status === 'rejected') return 'var(--accent-rose)';
  return 'var(--accent-amber)';
}

export default function SellerProfileReviews() {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [profiles, setProfiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [decision, setDecision] = useState('approved');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    tenantApi.getSellerProfilesForReview({ status: statusFilter, q: search, page, page_size: PAGE_SIZE })
      .then((response) => {
        if (!active) return;
        setProfiles(response.results || []);
        setTotal(response.count || 0);
      })
      .catch((error) => {
        if (!active) return;
        setProfiles([]);
        setTotal(0);
        setLoadError(error.message || 'Sotuvchi profillarini yuklab bo‘lmadi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [statusFilter, search, page, revision]);

  const openReview = (profile, nextDecision) => {
    setSelected(profile);
    setDecision(nextDecision);
    setReason('');
    setExpiresAt('');
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!selected) return;
    const reviewReason = reason.trim();
    if (decision === 'rejected' && !reviewReason) {
      toast.warning('Rad etish sababini kiriting.');
      return;
    }
    let expiry = null;
    if (decision === 'approved') {
      const selectedDate = new Date(expiresAt);
      if (!expiresAt || Number.isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
        toast.warning('Tasdiqning kelajakdagi amal qilish muddatini kiriting.');
        return;
      }
      expiry = selectedDate.toISOString();
    }

    setSubmitting(true);
    try {
      await tenantApi.reviewSellerProfile(selected.id, {
        status: decision,
        reason: reviewReason,
        ...(expiry ? { expires_at: expiry } : {}),
      });
      toast.success(decision === 'approved' ? 'Sotuvchi profili tasdiqlandi.' : 'Sotuvchi profili rad etildi.');
      setSelected(null);
      setPage(1);
      setRevision((value) => value + 1);
    } catch (error) {
      toast.error(error.message || 'Qarorni saqlab bo‘lmadi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, display: 'flex', alignItems: 'center', gap: 9 }}>
            <ShieldCheck size={23} /> Sotuvchi profillarini tekshirish
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '6px 0 0' }}>
            YTT, MChJ va boshqa sotuvchilar taqdim etgan ma’lumotlarni ko‘rib chiqing.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setRevision((value) => value + 1)} disabled={loading}>
          <RefreshCw size={16} /> Yangilash
        </button>
      </div>

      <div className="glass-card" style={{ padding: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12 }}>
        <div style={{ display: 'grid', gap: 5, minWidth: 220, flex: '0 1 260px', fontSize: 13, fontWeight: 600 }}>
          <span>Holat</span>
          <CustomSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
            size="md"
            fullWidth
          />
        </div>
        <form
          onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchText.trim()); }}
          style={{ display: 'flex', flex: '1 1 280px', gap: 8, alignItems: 'end' }}
        >
          <label style={{ display: 'grid', gap: 5, flex: 1, fontSize: 13, fontWeight: 600 }}>
            Profil yoki egasi nomi
            <input className="input-field" value={searchText} maxLength={100} onChange={(event) => setSearchText(event.target.value)} placeholder="Nom bo‘yicha qidirish" />
          </label>
          <button type="submit" className="btn btn-primary" aria-label="Qidirish"><Search size={17} /> Qidirish</button>
        </form>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-secondary)' }}>
          {loading ? 'Yuklanmoqda...' : `${total} ta profil`}
        </div>
        {loadError ? (
          <div role="alert" style={{ padding: 24, color: 'var(--accent-rose)' }}>{loadError}</div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: 790, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead style={{ background: 'var(--bg-chip)', color: 'var(--text-muted)' }}>
                <tr>
                  <th style={{ padding: '12px 16px' }}>Sotuvchi</th>
                  <th style={{ padding: '12px 16px' }}>Egasi</th>
                  <th style={{ padding: '12px 16px' }}>Holat</th>
                  <th style={{ padding: '12px 16px' }}>Topshirildi</th>
                  <th style={{ padding: '12px 16px' }}>Biriktirilgan do‘kon</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center' }}><IlbiLoader label="Yuklanmoqda..." /></td></tr>
                ) : profiles.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>Bu filtr bo‘yicha profil topilmadi.</td></tr>
                ) : profiles.map((profile) => (
                  <tr key={profile.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <strong>{profile.official_name}</strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        #{profile.id} · {profile.legal_form?.toUpperCase()} · STIR {profile.tax_identifier_masked}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{profile.owner_name || `#${profile.owner_id}`}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: statusColor(profile.status), fontWeight: 700 }}>
                        {profile.status === 'approved' ? <CheckCircle2 size={14} /> : profile.status === 'rejected' ? <XCircle size={14} /> : <Clock size={14} />}
                        {profile.status_display || profile.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{formatDate(profile.submitted_at)}</td>
                    <td style={{ padding: '12px 16px' }}>{profile.tenant_count ?? 0} ta</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => openReview(profile, 'approved')}>
                        Ko‘rish / qaror
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination currentPage={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <Modal isOpen={Boolean(selected)} onClose={() => { if (!submitting) setSelected(null); }} title="Sotuvchi profilini tekshirish" maxWidth={680}>
        {selected && (
          <form onSubmit={submitReview} style={{ display: 'grid', gap: 15 }}>
            <div style={{ display: 'grid', gap: 7, fontSize: 13, lineHeight: 1.5 }}>
              <div><strong>Rasmiy nomi:</strong> {selected.official_name}</div>
              <div><strong>Egasi:</strong> {selected.owner_name || `#${selected.owner_id}`}</div>
              <div><strong>Shakli:</strong> {selected.legal_form?.toUpperCase()} · <strong>STIR:</strong> {selected.tax_identifier_masked}</div>
              <div><strong>Soliq rejimi:</strong> {selected.tax_regime || 'Ko‘rsatilmagan'}</div>
              <div><strong>Faoliyat:</strong> {selected.permitted_activity || 'Ko‘rsatilmagan'}</div>
              <div><strong>Fiskal provayder:</strong> {selected.fiscal_provider || 'Ko‘rsatilmagan'}</div>
              <div><strong>Oldingi qaror:</strong> {selected.status_display || selected.status} {selected.review_reason ? `— ${selected.review_reason}` : ''}</div>
              {selected.expires_at && <div><strong>Oldingi muddat:</strong> {formatDate(selected.expires_at)}</div>}
            </div>
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-chip)', color: 'var(--text-secondary)', fontSize: 12 }}>
              Profil qarori rasmiy fiskal provayder ulanishi o‘rnini bosmaydi. Tasdiqlashdan oldin taqdim etilgan ma’lumotlarni tekshiring.
            </div>
            <div style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
              <span>Qaror</span>
              <CustomSelect
                value={decision}
                onChange={(val) => setDecision(val)}
                options={[
                  { value: 'approved', label: 'Tasdiqlash' },
                  { value: 'rejected', label: 'Rad etish' },
                ]}
                size="md"
                fullWidth
              />
            </div>
            {decision === 'approved' && (
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                  Amal qilish muddati
                </label>
                <CustomDatePicker
                  includeTime
                  fullWidth
                  value={expiresAt}
                  onChange={setExpiresAt}
                  placeholder="Muddati va vaqtini tanlang..."
                />
              </div>
            )}
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
              {decision === 'rejected' ? 'Rad etish sababi' : 'Tekshiruv izohi (ixtiyoriy)'}
              <textarea className="input-field" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} required={decision === 'rejected'} />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}>
              <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => setSelected(null)}>Bekor qilish</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saqlanmoqda...' : decision === 'approved' ? 'Tasdiqlash' : 'Rad etish'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
