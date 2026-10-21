import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, X } from 'lucide-react';
import IlbiLogo from '../components/common/IlbiLogo';
import MarkdownViewer, { createHeadingSlug } from '../components/docs/MarkdownViewer';
import source from '../content/desktop-guide.uz.md?raw';
import imageManifest from '../content/desktop-guide/manifest.json';
import './DesktopGuide.css';

const images = import.meta.glob('../content/desktop-guide/*.png', { eager: true, query: '?url', import: 'default' });
const imageDimensions = Object.fromEntries(imageManifest.frames.map(frame => [images[`../content/desktop-guide/${frame.file}`], frame.dimensions]));
const content = source.replace(/\(desktop-guide\/([^/)]+\.png)\)/g, (_, name) => `(${images[`../content/desktop-guide/${name}`]})`);
const sections = [...source.matchAll(/^## (.+)$/gm)].map((match) => ({ title: match[1], id: createHeadingSlug(match[1]) }));

export default function DesktopGuide() {
  const [params] = useSearchParams();
  const separateWindow = Boolean(window.ilbiDesktop) && params.get('desktop-window') === '1';
  return <div className="desktop-guide-page">
    <header className="desktop-guide-header">
      <IlbiLogo size={36} />
      {separateWindow ? <button type="button" onClick={() => window.close()}><X size={16} />Qo‘llanmani yopish</button>
        : <Link to="/download"><ArrowLeft size={16} />Yuklab olish</Link>}
    </header>
    <div className="desktop-guide-intro"><span>Windows va Linux ilovasi uchun rasmli qo‘llanma</span>
      <h1>ILBI ilovasini sozlash</h1>
      <p>Bir marta sozlang. Internet bo‘lmasa ham ishlang. Ulanish qaytganda ishlaringiz serverga yuboriladi.</p>
    </div>
    <div className="desktop-guide-layout">
      <nav className="desktop-guide-toc" aria-label="Qo‘llanma bo‘limlari"><strong>Kerakli qadamga o‘ting</strong>
        {sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
        <small>Rasm ustiga bosing — kattalashtirib ko‘ring.</small>
      </nav>
      <main className="desktop-guide-article"><MarkdownViewer content={content} imageDimensions={imageDimensions} /></main>
    </div>
    <footer className="desktop-guide-footer"><span>Matn va rasmlar ilovada internetsiz ham ochiladi.</span>
      <Link to="/download"><Download size={15} />Ilovani yuklab olish</Link>
    </footer>
  </div>;
}
