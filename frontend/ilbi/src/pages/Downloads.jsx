import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Download, ExternalLink, Smartphone } from 'lucide-react';
import IlbiLogo from '../components/common/IlbiLogo';
import RecoveryNotice, { RetryButton } from '../components/common/RecoveryNotice';
import { desktopRequest } from '../components/sync/desktopApi';
import { useAuth } from '../hooks/useAuth';
import { releaseSize, releaseURL } from '../utils/downloads';
import { version } from '../../package.json';
import './Downloads.css';

export default function Downloads() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState({ loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    async function load() {
      setState(previous => ({ ...previous, loading: true }));
      try {
        let manifest, origin = window.location.origin;
        if (window.ilbiDesktop) {
          const result = await desktopRequest('releases', undefined, { signal: controller.signal });
          manifest = result.release; origin = result.origin;
        } else {
          const response = await fetch('/downloads/releases.json', { signal: controller.signal, cache: 'no-store' });
          if (response.status === 404) { if (alive) setState({ loading: false, origin }); return; }
          if (!response.ok) throw Error('Yuklab olish serveri vaqtincha javob bermayapti. Birozdan keyin qayta urinib ko‘ring.');
          manifest = await response.json();
        }
        if (manifest?.schema !== 1) throw Error('Yuklamalar ro‘yxatini o‘qib bo‘lmadi. Birozdan keyin qayta tekshiring.');
        if (alive) setState({ loading: false, origin, manifest });
      } catch (error) {
        if (alive && error.name !== 'AbortError') setState({ loading: false, error: error instanceof TypeError
          ? 'Yuklab olish serveriga ulanib bo‘lmadi. Internet ishlayotgan bo‘lsa ham, server bilan ulanish vaqtincha uzilishi mumkin.'
          : error.message || 'Yuklamalar ro‘yxatini ochib bo‘lmadi. Qayta urinib ko‘ring.' });
      }
    }
    void load();
    return () => { alive = false; controller.abort(); };
  }, [attempt]);
  const windows = state.manifest?.windows;
  const linux = state.manifest?.linux;
  const mobile = state.manifest?.mobile;
  const windowsURL = releaseURL(windows?.url, state.origin);
  const linuxURL = releaseURL(linux?.url, state.origin);
  const mobileURL = releaseURL(mobile?.url, state.origin);
  return <div className="downloads-page">
    <header className="downloads-header"><Link to="/" aria-label="ILBI bosh sahifa"><IlbiLogo size={38} showText /></Link>
      <Link className="downloads-back" to={isAuthenticated ? '/dashboard' : '/'}><ArrowLeft size={16} />{isAuthenticated ? 'Ish stoliga' : 'Asosiy sahifaga'}</Link>
    </header>
    <main className="downloads-main">
      <span className="downloads-eyebrow">ILBI sizning qurilmangizda</span>
      <h1>Yuklab olish</h1><p className="downloads-intro">Do‘koningiz bilan kompyuterda ishlang. Internet qaytganda offline ishlaringiz server bilan sinxronlanadi.</p>
      {state.error && <RecoveryNotice className="downloads-notice" title="Yuklamalar ro‘yxati ochilmadi" actions={<>
        <RetryButton loading={state.loading} onClick={() => setAttempt(value => value + 1)}>Qayta tekshirish</RetryButton>
        {window.ilbiDesktop?.openDownloads && <button className="btn btn-secondary downloads-open-site" type="button" onClick={() => {
          void window.ilbiDesktop.openDownloads().catch(() => setState(previous => ({ ...previous, error: 'Rasmiy saytni brauzerda ochib bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.' })));
        }}><ExternalLink size={16} aria-hidden="true" />Saytda ochish</button>}
      </>}>{state.error}</RecoveryNotice>}
      <div className="downloads-grid">
        <article className="downloads-card"><div className="downloads-platform-icon"><img src="/brand/ilbi-desktop.svg" width="52" height="52" alt="ILBI ilovasi belgisi" /></div>
          <div className="downloads-card-heading"><h2>Windows uchun ILBI</h2><span>v{windows?.version || version}</span></div>
          <p>Klassik va Tezkor ish stoli. Savdo, ombor, nasiya va sinxronlash navbati bir dasturda.</p>
          <div className="downloads-details"><span>Windows · 64 bit</span>{releaseSize(windows?.bytes) && <span>{releaseSize(windows.bytes)}</span>}{windowsURL && windows?.channel === 'preview' && <span className="downloads-preview">Sinov nusxasi</span>}</div>
          {windowsURL ? <a className="btn btn-primary downloads-button" href={windowsURL} target="_blank" rel="noopener noreferrer"><Download size={18} />Windows uchun yuklab olish</a>
            : <button type="button" className="btn btn-primary downloads-button" disabled>{state.loading ? 'Tekshirilmoqda…' : 'Yuklab olish hali ochilmagan'}</button>}
          {windowsURL && windows?.channel === 'preview' && <small>Sinov nusxasi. Ishlab chiqarishdagi POS savdosi fiskal integratsiya tayyor bo‘lgach ochiladi.</small>}
          {windows?.sha256 && <details className="downloads-checksum"><summary>Faylning SHA-256 qiymati</summary><code>{windows.sha256}</code></details>}
        </article>
        <article className="downloads-card" data-platform="linux"><div className="downloads-platform-icon"><img src="/brand/ilbi-desktop.svg" width="52" height="52" alt="ILBI Linux ilovasi belgisi" /></div>
          <div className="downloads-card-heading"><h2>Linux uchun ILBI</h2><span>v{linux?.version || version}</span></div>
          <p>Arch Linux va Ubuntu 22.04+ uchun. Python va mahalliy baza ilovaning ichida; virtual mashina kerak emas.</p>
          <div className="downloads-details"><span>Linux · x86_64</span>{releaseSize(linux?.bytes) && <span>{releaseSize(linux.bytes)}</span>}{linuxURL && linux?.channel === 'preview' && <span className="downloads-preview">Sinov nusxasi</span>}</div>
          {linuxURL ? <a className="btn btn-primary downloads-button" href={linuxURL} target="_blank" rel="noopener noreferrer"><Download size={18} />Linux uchun yuklab olish</a>
            : <button type="button" className="btn btn-primary downloads-button" disabled>{state.loading ? 'Tekshirilmoqda…' : 'Linux yuklamasi hali ochilmagan'}</button>}
          <small>Arxiv va oddiy o‘rnatuvchi. <a href="#linux-install">Linux’da o‘rnatish — 4 qadam</a></small>
          {linuxURL && linux?.channel === 'preview' && <small>Sinov nusxasi. POS savdosiga mavjud fiskal integratsiya cheklovi amal qiladi.</small>}
          {linux?.sha256 && <details className="downloads-checksum"><summary>Faylning SHA-256 qiymati</summary><code>{linux.sha256}</code></details>}
        </article>
        <article className="downloads-card"><div className="downloads-platform-icon"><Smartphone size={27} /></div>
          <div className="downloads-card-heading"><h2>Mobil ilova</h2><span>{mobileURL ? `v${mobile.version}` : 'Hozircha mavjud emas'}</span></div>
          <p>Mobil ilova chiqarilganda uning rasmiy yuklab olish havolasi ham shu sahifada bo‘ladi.</p>
          <div className="downloads-details"><span>{mobile?.label || 'Telefon va planshet uchun'}</span></div>
          {mobileURL ? <a className="btn btn-secondary downloads-button" href={mobileURL} target="_blank" rel="noopener noreferrer"><Download size={18} />Mobil ilovani yuklab olish</a>
            : <button type="button" className="btn btn-secondary downloads-button" disabled>Mobil ilova hali joylanmagan</button>}
        </article>
      </div>
      <section className="downloads-linux-install" id="linux-install" aria-labelledby="linux-install-heading"><h2 id="linux-install-heading">Linux’da o‘rnatish — 4 qadam</h2><ol>
        <li>Yuklangan <code>.tar.gz</code> arxivni papkaga oching.</li>
        <li>Ichidagi <strong>ILBI</strong> papkasida o‘ng tugma → <strong>Terminalda ochish</strong>.</li>
        <li><code>bash install.sh</code> yozib, Enter bosing. <code>sudo</code> kerak emas.</li>
        <li>Ilovalar menyusidan <strong>ILBI</strong>ni oching.</li>
      </ol><p>Menyuda ko‘rinmasa: <code>~/.local/bin/ilbi</code>.</p>
        <p>Paket Linux x86_64 uchun. GNOME Keyring yoki KWallet ochiq bo‘lsin. Yangilashda ILBI’ni yoping va yangi arxivdagi <code>install.sh</code> faylini yana ishga tushiring — ma’lumotlar saqlanadi.</p>
        <Link className="downloads-linux-guide" to="/desktop-guide#7-linux-uchun-batafsil-qollanma"><BookOpen size={18} aria-hidden="true" /><span>Linux uchun batafsil qo‘llanma<small>Arch, boshqa Linux’lar va parollar omborini sozlash.</small></span><ArrowLeft size={16} aria-hidden="true" style={{ transform: 'rotate(180deg)' }} /></Link>
      </section>
      <section className="downloads-help" aria-labelledby="download-start"><h2 id="download-start">Birinchi ishga tushirish</h2>
        <ol><li>ILBI’ni o‘rnating va <strong>Ishni boshlash</strong> tugmasini bosing.</li><li>Internet orqali do‘kon egasi hisobiga kirib, offline ishlashni tayyorlang.</li><li>Bitta kompyuter uchun shu yetarli. Keyinroq boshqa kassa kerak bo‘lsa, <strong>ILBI → Boshqa kassani ulash</strong> menyusidan qo‘shing.</li></ol>
        <p>Bir nechta kassa ishlatilganda asosiy kompyuter va undagi ILBI ochiq turadi. Offline ruxsat internet orqali yangilanib turadi; uning muddati 7 kun.</p>
        <Link className="downloads-guide-link" to="/desktop-guide"><BookOpen size={19} /><span><strong>Ilovani sozlash — rasmli qo‘llanma</strong><small>Birinchi kirish, offline parol, sinxronlash va qo‘shimcha kassalar.</small></span><ArrowLeft size={17} style={{ transform: 'rotate(180deg)' }} /></Link>
      </section>
    </main>
    <footer className="downloads-footer"><span>ILBI · v{version}</span><Link to="/support">Yordam markazi</Link><Link to="/login">Tizimga kirish</Link></footer>
  </div>;
}
