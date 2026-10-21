import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Download, RefreshCw, Smartphone } from 'lucide-react';
import IlbiLogo from '../components/common/IlbiLogo';
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
      setState({ loading: true });
      try {
        let manifest, origin = window.location.origin;
        if (window.ilbiDesktop) {
          const result = await desktopRequest('releases');
          manifest = result.release; origin = result.origin;
        } else {
          const response = await fetch('/downloads/releases.json', { signal: controller.signal, cache: 'no-store' });
          if (response.status === 404) { if (alive) setState({ loading: false, origin }); return; }
          if (!response.ok) throw Error('release unavailable');
          manifest = await response.json();
        }
        if (manifest?.schema !== 1) throw Error('release format');
        if (alive) setState({ loading: false, origin, manifest });
      } catch (error) {
        if (alive && error.name !== 'AbortError') setState({ loading: false, error: true });
      }
    }
    void load();
    return () => { alive = false; controller.abort(); };
  }, [attempt]);
  const windows = state.manifest?.windows;
  const mobile = state.manifest?.mobile;
  const windowsURL = releaseURL(windows?.url, state.origin);
  const mobileURL = releaseURL(mobile?.url, state.origin);
  return <div className="downloads-page">
    <header className="downloads-header"><Link to="/" aria-label="ILBI bosh sahifa"><IlbiLogo size={38} showText /></Link>
      <Link className="downloads-back" to={isAuthenticated ? '/dashboard' : '/'}><ArrowLeft size={16} />{isAuthenticated ? 'Ish stoliga' : 'Asosiy sahifaga'}</Link>
    </header>
    <main className="downloads-main">
      <span className="downloads-eyebrow">ILBI sizning qurilmangizda</span>
      <h1>Yuklab olish</h1><p className="downloads-intro">Do‘koningiz bilan kompyuterda ishlang. Internet qaytganda offline ishlaringiz server bilan sinxronlanadi.</p>
      {state.error && <div className="downloads-notice" role="status">Yuklab olish ma’lumotlarini hozircha olib bo‘lmadi. Internetga ulanishni tekshiring.
        <button type="button" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={15} />Qayta tekshirish</button></div>}
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
        <article className="downloads-card"><div className="downloads-platform-icon"><Smartphone size={27} /></div>
          <div className="downloads-card-heading"><h2>Mobil ilova</h2><span>{mobileURL ? `v${mobile.version}` : 'Hozircha mavjud emas'}</span></div>
          <p>Mobil ilova chiqarilganda uning rasmiy yuklab olish havolasi ham shu sahifada bo‘ladi.</p>
          <div className="downloads-details"><span>{mobile?.label || 'Telefon va planshet uchun'}</span></div>
          {mobileURL ? <a className="btn btn-secondary downloads-button" href={mobileURL} target="_blank" rel="noopener noreferrer"><Download size={18} />Mobil ilovani yuklab olish</a>
            : <button type="button" className="btn btn-secondary downloads-button" disabled>Mobil ilova hali joylanmagan</button>}
        </article>
      </div>
      <section className="downloads-help" aria-labelledby="download-start"><h2 id="download-start">Birinchi ishga tushirish</h2>
        <ol><li>ILBI’ni o‘rnating va asosiy kompyuterni tanlang.</li><li>Internet orqali do‘kon egasi hisobiga kirib, offline ishlashni tayyorlang.</li><li>Qo‘shimcha kassalarni asosiy kompyuterga mahalliy tarmoq orqali ulang.</li></ol>
        <p>Qo‘shimcha kassalar uchun asosiy kompyuter yoqilgan bo‘lishi kerak. Offline ruxsat internet orqali yangilanib turadi; uning muddati 7 kun.</p>
        <Link className="downloads-guide-link" to="/desktop-guide"><BookOpen size={19} /><span><strong>Ilovani sozlash — rasmli qo‘llanma</strong><small>Birinchi kirish, offline parol, sinxronlash va qo‘shimcha kassalar.</small></span><ArrowLeft size={17} style={{ transform: 'rotate(180deg)' }} /></Link>
      </section>
    </main>
    <footer className="downloads-footer"><span>ILBI · v{version}</span><Link to="/support">Yordam markazi</Link><Link to="/login">Tizimga kirish</Link></footer>
  </div>;
}
