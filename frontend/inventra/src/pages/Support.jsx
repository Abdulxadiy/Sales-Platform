import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Headphones, Phone, Send, Paperclip, X, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { request } from '../api/client';
import { publicSupportRequest, supportApi } from '../api/support';
import { savedSupportLanguage, supportText } from '../components/support/translations';
import MarkdownViewer from '../components/docs/MarkdownViewer';
import '../components/support/support.css';

function PrivateImage({ api, conversationId, messageId, t }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl;
    api.image(conversationId, messageId).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [api, conversationId, messageId]);
  if (error) return <span>{t.imageError}</span>;
  return url ? <a href={url} target="_blank" rel="noreferrer"><img className="support-image" src={url} alt={t.image} /></a> : <span>{t.loading}</span>;
}

const mergeMessages = (previous, incoming) => Array.from(new Map([...previous, ...incoming].map((m) => [m.id, m])).values()).sort((a, b) => a.id - b.id);


function SupportCenter({ user, authenticated, operator }) {
  const [language, setLanguage] = useState(savedSupportLanguage);
  const t = supportText[language];
  const api = useMemo(() => supportApi(authenticated, operator), [authenticated, operator]);
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState(params.get('conversation') || '');
  const [metadata, setMetadata] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [nextPage, setNextPage] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [mine, setMine] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [image, setImage] = useState(null);
  const [newForm, setNewForm] = useState(false);
  const [form, setForm] = useState({ name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || '', subject: '', text: '', consent: false });
  const [tab, setTab] = useState(params.has('doc') ? 'guide' : 'chat');
  const [documents, setDocuments] = useState([]);
  const [docKey, setDocKey] = useState(params.get('doc') || `yordam_${language}`);
  const [document, setDocument] = useState(null);
  const endRef = useRef(null);
  const readRef = useRef(0);
  const startRequest = useRef(null);
  const sendRequest = useRef(null);
  const fileRef = useRef(null);
  const listQuery = `?page=${page}&status=${filter}&mine=${mine}`;
  const loadList = useCallback(async () => {
    const result = await api.list(listQuery);
    setConversations(result.results);
    setNextPage(Boolean(result.next));
  }, [api, listQuery]);

  useEffect(() => { publicSupportRequest('/support/metadata/').then(setMetadata).catch(() => setError(t.unavailable)); }, [t.unavailable]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (globalThis.document.hidden) return;
      try {
        const result = await api.list(listQuery);
        if (active) { setConversations(result.results); setNextPage(Boolean(result.next)); }
      } catch (err) { if (active) setError(err.message || t.unavailable); }
    };
    load();
    const timer = setInterval(load, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [api, listQuery, t.unavailable]);

  const docRequest = useCallback((path) => authenticated ? request(path) : publicSupportRequest(path), [authenticated]);
  useEffect(() => {
    let active = true;
    docRequest('/docs/').then((data) => { if (active) setDocuments(data.documents); }).catch(() => {});
    return () => { active = false; };
  }, [docRequest]);
  useEffect(() => {
    if (tab !== 'guide') return;
    let active = true;
    setDocument(null);
    docRequest(`/docs/?doc=${encodeURIComponent(docKey)}`).then((data) => { if (active) setDocument(data); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [docKey, tab, docRequest]);

  useEffect(() => {
    setMessages([]); messagesRef.current = []; setConversation(null); setHasOlder(false); readRef.current = 0;
    if (!selected) return;
    let active = true;
    let inFlight = false;
    const load = async () => {
      if (inFlight || globalThis.document.hidden) return;
      inFlight = true;
      try {
        const latest = messagesRef.current.at(-1)?.id;
        const [detail, batch] = await Promise.all([
          api.detail(selected), api.messages(selected, latest ? `?after_id=${latest}` : ''),
        ]);
        if (!active) return;
        setConversation(detail);
        if (!latest) setHasOlder(batch.has_more);
        if (batch.results.length) {
          messagesRef.current = mergeMessages(messagesRef.current, batch.results);
          setMessages(messagesRef.current);
        }
        setError('');
        const through = messagesRef.current.at(-1)?.id || 0;
        if (globalThis.document.hasFocus() && through > readRef.current) {
          await api.action(selected, 'read', { through_id: through });
          if (active) readRef.current = through;
        }
      } catch (err) { if (active) setError(err.message || t.unavailable); }
      finally { inFlight = false; }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [api, selected, t.unavailable]);
  const lastMessageId = messages.at(-1)?.id;
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [lastMessageId]);

  const choose = (id) => {
    setSelected(id); setParams(id ? { conversation: id } : {}, { replace: true });
    setNewForm(false); setDraft(''); setImage(null); sendRequest.current = null;
    if (fileRef.current) fileRef.current.value = '';
  };
  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); await loadList(); }
    catch (err) { setError(err.message || t.unavailable); }
    finally { setBusy(false); }
  };
  const start = (event) => {
    event.preventDefault();
    run(async () => {
      const body = { ...form, language };
      const signature = JSON.stringify(body);
      if (startRequest.current?.signature !== signature) startRequest.current = { signature, id: crypto.randomUUID() };
      const created = await api.create({ ...body, client_id: startRequest.current.id });
      startRequest.current = null;
      choose(created.id); setForm((old) => ({ ...old, subject: '', text: '' }));
    });
  };
  const send = (event) => {
    event.preventDefault();
    run(async () => {
      const signature = `${draft}:${image?.name}:${image?.size}:${image?.lastModified}`;
      if (sendRequest.current?.signature !== signature) sendRequest.current = { signature, id: crypto.randomUUID() };
      const body = new FormData(); body.set('text', draft); body.set('client_id', sendRequest.current.id);
      if (image) body.set('image', image);
      const message = await api.send(selected, body);
      messagesRef.current = mergeMessages(messagesRef.current, [message]); setMessages(messagesRef.current);
      setDraft(''); setImage(null); sendRequest.current = null; if (fileRef.current) fileRef.current.value = '';
    });
  };
  const action = (value) => run(async () => {
    const detail = await api.action(selected, value); setConversation(detail);
    const batch = await api.messages(selected, `?after_id=${messagesRef.current.at(-1)?.id || 0}`);
    messagesRef.current = mergeMessages(messagesRef.current, batch.results); setMessages(messagesRef.current);
  });
  const older = () => run(async () => {
    const batch = await api.messages(selected, `?before_id=${messages[0]?.id}`);
    messagesRef.current = mergeMessages(messagesRef.current, batch.results); setMessages(messagesRef.current); setHasOlder(batch.has_more);
  });
  const otherOperator = operator && conversation?.operator_id && conversation.operator_id !== user?.id;
  const canSend = conversation && conversation.status !== 'closed' && (!operator || (conversation.operator_id === user?.id && conversation.status === 'active'));
  return (
    <main className="support-shell" lang={language}>
      <header className="support-top">
        <Link to={authenticated ? '/' : '/login'} className="support-back"><ArrowLeft size={18} />{authenticated ? t.back : t.login}</Link>
        <select className="input-field" style={{ width: 'auto' }} aria-label="Language" value={language} onChange={(e) => {
          setLanguage(e.target.value); localStorage.setItem('inventra_support_language', e.target.value); setDocKey(`yordam_${e.target.value}`);
        }}><option value="uz">O‘zbekcha</option><option value="ru">Русский</option><option value="en">English</option></select>
      </header>
      <div className="support-heading"><Headphones size={30} /><div><h1>{t.title}</h1><p>{t.subtitle}</p></div></div>
      <div className="support-contact-row">
        {metadata && <><a className="btn btn-secondary" href={`tel:${metadata.phone}`}><Phone size={16} />{metadata.phone}</a>
          <a className="btn btn-secondary" href={`https://t.me/${metadata.telegram_username}`} target="_blank" rel="noreferrer"><Send size={16} />@{metadata.telegram_username}</a></>}
      </div>
      <p className="support-note">{t.noHours}</p>
      {!authenticated && <p className="support-note">{t.guest}</p>}
      <div className="support-tabs"><button className={`btn ${tab === 'chat' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('chat')}><Headphones size={16} />{operator ? t.inbox : t.chat}</button>
        <button className={`btn ${tab === 'guide' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('guide')}><BookOpen size={16} />{t.guide}</button></div>
      {error && <div className="support-error" role="alert">{error}<button className="btn btn-secondary" disabled={busy} onClick={() => run(loadList)}>{t.retry}</button></div>}
      {tab === 'guide' ? <section className="support-docs">
        <select className="input-field" aria-label={t.guide} value={docKey} onChange={(e) => setDocKey(e.target.value)}>
          {documents.map((doc) => <option key={doc.key} value={doc.key}>{doc.title}</option>)}
        </select>
        {document ? <MarkdownViewer content={document.content} /> : <p>{t.loading}</p>}
      </section> : <>
        <p className="support-note">{t.ai}</p>
        <div className="support-workspace">
          <aside className="support-list" aria-label={operator ? t.inbox : t.chat}>
            {operator ? <div className="support-filters"><select className="input-field" aria-label={t.inbox} value={filter} onChange={(e) => { setPage(1); setFilter(e.target.value); }}>
              <option value="">{t.all}</option>{['waiting', 'active', 'closed'].map((s) => <option key={s} value={s}>{t[s]}</option>)}</select>
              <label><input type="checkbox" checked={mine} onChange={(e) => { setPage(1); setMine(e.target.checked); }} /> {t.mine}</label></div>
              : <button className="btn btn-primary" disabled={busy} onClick={() => { choose(''); setNewForm(true); }}>{t.new}</button>}
            {!conversations.length && <p className="support-note">{t.empty}</p>}
            {conversations.map((item) => <button key={item.id} disabled={busy} onClick={() => choose(item.id)} className={`support-thread ${selected === item.id ? 'selected' : ''}`}>
              <strong>{item.subject}</strong><span>{item.name} · {item.language.toUpperCase()}</span>
              <span className={`support-status ${item.status}`}>{t[item.status]}{item.unread_count > 0 && <b className="support-badge">{item.unread_count}</b>}</span>
            </button>)}
            <div className="support-pages">{page > 1 && <button className="btn btn-secondary" disabled={busy} onClick={() => setPage(page - 1)}>←</button>}
              {nextPage && <button className="btn btn-secondary" disabled={busy} onClick={() => setPage(page + 1)}>{t.more}</button>}</div>
          </aside>
          <section className="support-chat">
            {newForm && !operator ? <form className="support-start" onSubmit={start}>
              <h2>{t.new}</h2>
              {[['name', 100], ['subject', 160]].map(([key, limit]) => <label key={key}>{t[key]}<input className="input-field" value={form[key]} maxLength={limit} required onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
              <label>{t.question}<textarea className="input-field" rows={5} maxLength={4000} value={form.text} required onChange={(e) => setForm({ ...form, text: e.target.value })} /></label>
              <label className="support-consent"><input type="checkbox" required checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />{t.consent}</label>
              <button type="button" className="support-link" onClick={() => { setDocKey('maxfiylik_siyosati'); setTab('guide'); }}>{t.privacy}</button>
              <p className="support-note">{t.safe}</p><button className="btn btn-primary" disabled={busy}>{busy ? t.loading : t.start}</button>
            </form> : conversation ? <>
              <div className="support-chat-header"><div><h2>{conversation.subject}</h2><span className={`support-status ${conversation.status}`}>{t[conversation.status]}</span>
                {conversation.operator_name && <small>{t.operator}: {conversation.operator_name}</small>}</div>
                <div className="support-actions">
                  {operator && conversation.status !== 'closed' && !conversation.operator_id && <button disabled={busy} className="btn btn-primary" onClick={() => action('claim')}>{t.claim}</button>}
                  {conversation.status === 'closed' ? <button disabled={busy} className="btn btn-secondary" onClick={() => action('reopen')}>{t.reopen}</button>
                    : !otherOperator && <button disabled={busy} className="btn btn-secondary" onClick={() => action('close')}>{t.close}</button>}
                </div>
              </div>
              <div className="support-messages" role="log" aria-live="polite" aria-label={t.chat}>
                {hasOlder && <button className="btn btn-secondary" disabled={busy} onClick={older}>{t.older}</button>}
                {messages.map((message) => message.sender === 'system' ? <p key={message.id} className="support-event">{t[`${message.event}Event`] || message.event}</p> :
                  <article key={message.id} className={`support-message ${message.sender === (operator ? 'operator' : 'visitor') ? 'own' : ''}`}>
                    <small>{message.author_name || (message.sender === 'operator' ? t.operator : conversation.name)}</small>
                    {message.text && <p>{message.text}</p>}
                    {message.has_image && <PrivateImage api={api} conversationId={selected} messageId={message.id} t={t} />}
                    <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString(language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-GB')}</time>
                  </article>)}<div ref={endRef} />
              </div>
              {canSend ? <form className="support-compose" onSubmit={send}>
                <textarea className="input-field" aria-label={t.question} placeholder={t.placeholder} rows={2} maxLength={4000} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <div className="support-compose-actions"><label className="btn btn-secondary"><Paperclip size={16} />{t.image}<input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="support-file" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file && (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) { setError(t.imageLimit); e.target.value = ''; return; }
                  setImage(file || null);
                }} /></label><span className="support-note">{t.imageLimit}</span><button className="btn btn-primary" disabled={busy || (!draft.trim() && !image)}><Send size={16} />{busy ? t.loading : t.send}</button></div>
                {image && <div>{image.name}<button className="support-link" type="button" aria-label={t.remove} onClick={() => { setImage(null); fileRef.current.value = ''; }}><X size={16} /></button></div>}
              </form> : <p className="support-note support-compose">{otherOperator ? t.busy : t[conversation.status]}</p>}
            </> : <div className="support-empty"><Headphones size={44} /><p>{selected ? t.loading : t.select}</p></div>}
          </section>
        </div>
      </>}
    </main>
  );
}

export default function Support() {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <div className="support-shell">Loading…</div>;
  return <SupportCenter key={`${user?.id || 'guest'}:${isAuthenticated}`} user={user} authenticated={isAuthenticated} operator={isAdmin} />;
}

