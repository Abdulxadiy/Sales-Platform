import React, { useEffect, useState } from 'react';
import { BellRing, Plus, Trash2, RotateCw } from 'lucide-react';
import Modal from '../common/Modal';
import CustomSelect from '../common/CustomSelect';
import Pagination from '../common/Pagination';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../hooks/useAuth';
import { workspaceApi } from '../../api/workspace';

export default function Reminders({ compact = false, initiallyCreating = false }) {
  const { reminders, refreshReminders } = useWorkspace();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [creating, setCreating] = useState(initiallyCreating);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [members, setMembers] = useState([]);
  const [assigned, setAssigned] = useState(String(user?.id));
  const [busy, setBusy] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completed, setCompleted] = useState(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!creating) return;
    const controller = new AbortController();
    workspaceApi.members(controller.signal).then(setMembers).catch(error => {
      if (!controller.signal.aborted) toast.error(error.message);
    });
    return () => controller.abort();
  }, [creating, activeTenant?.id, toast]);
  useEffect(() => {
    if (!showCompleted && page === 1) return;
    const controller = new AbortController();
    workspaceApi.reminders(showCompleted ? 'true' : 'false', controller.signal, page).then(data => setCompleted({ ...data, page, status: showCompleted })).catch(error => {
      if (!controller.signal.aborted) toast.error(error.message);
    });
    return () => controller.abort();
  }, [showCompleted, page, revision, activeTenant?.id, toast]);
  async function save(event) {
    event.preventDefault();
    if (busy || !title.trim() || !due) return;
    setBusy(true);
    try {
      await workspaceApi.createReminder({ title: title.trim(), due_at: new Date(due).toISOString(), assigned_to_id: Number(assigned) });
      setCreating(false); setTitle(''); setDue(''); refreshReminders();
      toast.success('Eslatma saqlandi');
    } catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  }
  async function update(row, remove = false) {
    if (busy) return;
    if (remove && !await confirm({ title: 'Eslatmani o‘chirish', message: row.title, type: 'danger', confirmText: 'O‘chirish' })) return;
    setBusy(true);
    try {
      if (remove) await workspaceApi.deleteReminder(row.id);
      else await workspaceApi.updateReminder(row.id, { completed: !row.completed });
      refreshReminders();
      setRevision(value => value + 1);
    } catch (error) { toast.error(error.message); }
    finally { setBusy(false); }
  }
  const current = showCompleted || page > 1 ? (completed?.page === page && completed?.status === showCompleted ? completed : null) : reminders;
  const rows = current?.results || [];
  return <section className={`workspace-card workspace-reminders ${compact ? 'compact' : ''}`}>
    <div className="workspace-card-heading"><h2><BellRing size={18} /> Eslatmalar</h2>
      <button className="workspace-text-button" onClick={() => setCreating(true)} type="button"><Plus size={15} /> Eslatma</button></div>
    {reminders?.error && <div role="alert" className="workspace-error">{reminders.error}
      <button type="button" onClick={refreshReminders}>Qayta yuklash</button></div>}
    <div className="workspace-reminder-list">
      {rows.slice(0, compact ? 4 : 50).map(row => <div className="workspace-reminder" key={row.id}>
        <input type="checkbox" checked={row.completed} disabled={busy} onChange={() => update(row)} aria-label={`${row.title} — bajarildi`} />
        <div><strong>{row.title}</strong><small>{row.assigned_to_name}</small></div>
        <time className={row.overdue ? 'overdue' : ''} dateTime={row.due_at}>
          {new Date(row.due_at).toLocaleString('uz-UZ', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>
        {!compact && <button type="button" className="workspace-icon-button" onClick={() => update(row, true)} disabled={busy} aria-label={`${row.title} — o‘chirish`}><Trash2 size={14} /></button>}
      </div>)}
      {!rows.length && <p className="workspace-empty">{!reminders && !showCompleted ? 'Yuklanmoqda…' : showCompleted ? 'Bajarilgan eslatmalar yo‘q.' : 'Hozircha eslatmalar yo‘q. Muhim ishni vaqt bilan belgilang.'}</p>}
    </div>
    {!compact && <Pagination currentPage={page} totalItems={current?.count || 0} pageSize={50} onPageChange={setPage} compact />}
    {!compact && <button type="button" className="workspace-text-button" onClick={() => { setPage(1); setShowCompleted(value => !value); }}><RotateCw size={14} />{showCompleted ? 'Faol eslatmalar' : 'Bajarilganlarni ko‘rish'}</button>}
    {compact && reminders?.count > 4 && <button type="button" className="workspace-text-button" onClick={() => window.dispatchEvent(new Event('workspace_open_reminders'))}>Barchasi ({reminders.count})</button>}
    {creating && <Modal isOpen onClose={() => { if (!busy) setCreating(false); }} title="Yangi eslatma" maxWidth={480}>
      <form onSubmit={save} className="workspace-form">
        <label>Vazifa<input autoFocus value={title} onChange={event => setTitle(event.target.value)} maxLength={200} required placeholder="Masalan: nasiya bo‘yicha qo‘ng‘iroq" /></label>
        <label>Sana va vaqt<input type="datetime-local" value={due} onChange={event => setDue(event.target.value)} required /></label>
        {activeTenant?.is_owner && <div><label>Mas’ul xodim</label><CustomSelect value={assigned} onChange={value => setAssigned(String(value))}
          options={members.map(member => ({ value: String(member.id), label: member.name }))} placeholder="Mas’ulni tanlang" /></div>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Eslatmani saqlash'}</button>
      </form>
    </Modal>}
  </section>;
}
