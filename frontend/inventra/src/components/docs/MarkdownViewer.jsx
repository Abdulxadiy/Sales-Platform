import React, { useEffect } from 'react';
import {
  Info,
  AlertTriangle,
  CheckCircle,
  Flame,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

/**
 * Converts a heading title into a URL slug matching markdown TOC links.
 * E.g. "1. Do'kon Egasining Rol va Vakolatlari" -> "1-dokon-egasining-rol-va-vakolatlari"
 * E.g. "2.1. Birinchi marta kirish va parol o'rnatish" -> "21-birinchi-marta-kirish-va-parol-ornatish"
 */
export function createHeadingSlug(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Smoothly scrolls to a heading element matching target ID or slug
 */
function scrollToHeading(targetId, rawHref) {
  if (!targetId || typeof document === 'undefined') return;

  // 1. Direct ID lookup
  let el = document.getElementById(targetId);

  // 2. Dash variation lookup (e.g. single vs double dash)
  if (!el) {
    const singleDash = targetId.replace(/--+/g, '-');
    el = document.getElementById(singleDash);
  }

  // 3. Search elements by data-slug attribute
  if (!el) {
    const headings = document.querySelectorAll('[data-slug]');
    for (const h of headings) {
      const slug = h.getAttribute('data-slug');
      if (
        slug === targetId ||
        slug?.replace(/--+/g, '-') === targetId.replace(/--+/g, '-')
      ) {
        el = h;
        break;
      }
      // Section number prefix match e.g. "41-"
      const targetNum = targetId.match(/^(\d+)-/);
      const slugNum = slug ? slug.match(/^(\d+)-/) : null;
      if (targetNum && slugNum && targetNum[1] === slugNum[1]) {
        el = h;
        break;
      }
    }
  }

  // 4. Text content search fallback
  if (!el) {
    const cleanWord = targetId.replace(/[-_]+/g, ' ').toLowerCase();
    const headings = document.querySelectorAll('.doc-viewer h1, .doc-viewer h2, .doc-viewer h3, .doc-viewer h4');
    for (const h of headings) {
      if (h.textContent.toLowerCase().includes(cleanWord)) {
        el = h;
        break;
      }
    }
  }

  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      window.history.pushState(null, '', rawHref || `#${targetId}`);
    } catch {
      // ignore if unsupported
    }
  }
}

/**
 * Clean, lightweight, dependency-free Markdown renderer with full TOC anchor support.
 * Formatted specifically for the Inventra Obsidian & Gold Design System.
 */
export default function MarkdownViewer({ content = '', className = '' }) {
  if (!content) return null;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashId = window.location.hash.slice(1);
      const timer = setTimeout(() => {
        scrollToHeading(hashId, window.location.hash);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [content]);

  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines = [];
  let inTable = false;
  let tableLines = [];
  let inAlert = false;
  let alertType = '';
  let alertLines = [];

  const flushCodeBlock = (key) => {
    if (codeBlockLines.length > 0) {
      elements.push(
        <div key={`code-${key}`} style={{ margin: '18px 0' }}>
          <pre>
            {codeBlockLang && (
              <div className="code-header">{codeBlockLang}</div>
            )}
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        </div>
      );
      codeBlockLines = [];
    }
    inCodeBlock = false;
  };

  const flushTable = (key) => {
    if (tableLines.length >= 2) {
      const headerRow = tableLines[0]
        .split('|')
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        .map((c) => c.trim());
      const bodyRows = tableLines.slice(2).map((row) =>
        row
          .split('|')
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          .map((c) => c.trim())
      );

      elements.push(
        <div key={`table-${key}`} style={{ overflowX: 'auto', margin: '20px 0' }}>
          <table>
            <thead>
              <tr>
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx}>{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableLines = [];
    inTable = false;
  };

  const flushAlert = (key) => {
    if (alertLines.length > 0) {
      const alertMeta = {
        NOTE: { icon: Info, title: 'Eslatma' },
        TIP: { icon: CheckCircle, title: 'Foydali Maslahat' },
        IMPORTANT: { icon: Flame, title: 'Muhim Talab' },
        WARNING: { icon: AlertTriangle, title: 'Ogohlantirish' },
        CAUTION: { icon: ShieldAlert, title: 'Diqqat / Xavf' },
      }[alertType] || { icon: Info, title: 'Izoh' };

      const typeClass = (alertType || 'note').toLowerCase();
      const IconComponent = alertMeta.icon;

      elements.push(
        <div key={`alert-${key}`} className={`doc-alert ${typeClass}`}>
          <div className="doc-alert-header">
            <IconComponent size={16} style={{ flexShrink: 0 }} />
            <span>{alertMeta.title}</span>
          </div>
          <div className="doc-alert-body">
            {alertLines.map((line, aIdx) => (
              <p key={aIdx} style={{ margin: '4px 0' }}>
                {renderInline(line)}
              </p>
            ))}
          </div>
        </div>
      );
      alertLines = [];
    }
    inAlert = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Code block toggles
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(i);
      } else {
        if (inTable) flushTable(i);
        if (inAlert) flushAlert(i);
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // 2. Table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (inAlert) flushAlert(i);
      inTable = true;
      tableLines.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    // 3. Alerts (> [!NOTE])
    const alertMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
    if (alertMatch) {
      if (inAlert) flushAlert(i);
      inAlert = true;
      alertType = alertMatch[1].toUpperCase();
      continue;
    }

    if (inAlert) {
      if (trimmed.startsWith('>')) {
        alertLines.push(trimmed.replace(/^>\s?/, ''));
        continue;
      } else {
        flushAlert(i);
      }
    }

    // 4. Empty line
    if (!trimmed) {
      continue;
    }

    // 5. Horizontal rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={`hr-${i}`} />);
      continue;
    }

    // 5.5. Standalone Image: ![caption](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const caption = imgMatch[1];
      const src = imgMatch[2];
      elements.push(
        <figure
          key={`img-${i}`}
          style={{
            margin: '26px 0',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-md)',
              maxWidth: '100%',
            }}
          >
            <img
              src={src}
              alt={caption || 'Qo‘llanma rasmi'}
              loading="lazy"
              style={{
                width: '100%',
                maxHeight: 560,
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
          {caption && (
            <figcaption
              style={{
                marginTop: 8,
                fontSize: 12.5,
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              📸 {caption}
            </figcaption>
          )}
        </figure>
      );
      continue;
    }

    // 6. Headings (with auto ID & data-slug for TOC anchor links)
    if (trimmed.startsWith('# ')) {
      const title = trimmed.slice(2);
      const slug = createHeadingSlug(title);
      elements.push(
        <h1 key={`h1-${i}`} id={slug} data-slug={slug}>
          {renderInline(title)}
        </h1>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      const title = trimmed.slice(3);
      const slug = createHeadingSlug(title);
      elements.push(
        <h2 key={`h2-${i}`} id={slug} data-slug={slug}>
          {renderInline(title)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      const title = trimmed.slice(4);
      const slug = createHeadingSlug(title);
      elements.push(
        <h3 key={`h3-${i}`} id={slug} data-slug={slug}>
          {renderInline(title)}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      const title = trimmed.slice(5);
      const slug = createHeadingSlug(title);
      elements.push(
        <h4 key={`h4-${i}`} id={slug} data-slug={slug}>
          {renderInline(title)}
        </h4>
      );
      continue;
    }

    // 7. Blockquotes
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={`quote-${i}`}>
          {renderInline(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // 8. Lists
    if (trimmed.match(/^(\*|-)\s+/)) {
      elements.push(
        <div key={`li-${i}`} className="doc-list-item">
          <span className="doc-bullet" />
          <div style={{ flex: 1 }}>
            {renderInline(trimmed.replace(/^(\*|-)\s+/, ''))}
          </div>
        </div>
      );
      continue;
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="doc-list-item">
          <span className="doc-num">{numMatch[1]}.</span>
          <div style={{ flex: 1 }}>{renderInline(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // 9. Standard paragraph
    elements.push(
      <p key={`p-${i}`}>
        {renderInline(trimmed)}
      </p>
    );
  }

  if (inCodeBlock) flushCodeBlock('end');
  if (inTable) flushTable('end');
  if (inAlert) flushAlert('end');

  return <div className={`doc-viewer ${className}`}>{elements}</div>;
}

/**
 * Parses bold, italic, inline code, and links with interactive smooth scroll for anchors
 */
function renderInline(text = '') {
  if (!text) return null;

  // Split text by formatting tokens: code, bold, italic, strikethrough, images, links
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Image: ![caption](url)
    const inlineImgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (inlineImgMatch) {
      return (
        <img
          key={index}
          src={inlineImgMatch[2]}
          alt={inlineImgMatch[1] || 'rasm'}
          loading="lazy"
          style={{
            maxWidth: '100%',
            borderRadius: 12,
            border: '1px solid var(--border-card)',
            margin: '8px 0',
            display: 'inline-block',
          }}
        />
      );
    }

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={index} className="inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={index} style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
          {part.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      return (
        <del key={index} style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
          {part.slice(2, -2)}
        </del>
      );
    }

    // Link: [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const href = linkMatch[2];
      const isAnchor = href.startsWith('#');
      const isInternal = isAnchor || href.startsWith('/');

      const handleAnchorClick = (e) => {
        if (!isAnchor) return;
        e.preventDefault();
        const targetId = href.slice(1);
        scrollToHeading(targetId, href);
      };

      return (
        <a
          key={index}
          href={href}
          onClick={isAnchor ? handleAnchorClick : undefined}
          target={isInternal ? '_self' : '_blank'}
          rel="noopener noreferrer"
          className="doc-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            cursor: 'pointer',
          }}
        >
          <span>{linkMatch[1]}</span>
          {!isInternal && <ExternalLink size={12} style={{ opacity: 0.7 }} />}
        </a>
      );
    }

    return part;
  });
}
