import React from 'react';
import { PanelsTopLeft, PanelLeft } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function WorkspaceSwitch({ className = '' }) {
  const { mode, toggleMode } = useWorkspace();
  const fast = mode === 'fast';
  if (!toggleMode) return null;
  return <button type="button" className={`workspace-switch ${className}`} onClick={toggleMode}
    aria-label="Ish stolini almashtirish" aria-pressed={fast}
    title={fast ? 'Klassik ish stoliga o‘tish' : 'Tezkor ish stoliga o‘tish'}>
    {fast ? <PanelLeft size={18} /> : <PanelsTopLeft size={18} />}
    <span className="sr-only">{fast ? 'Klassik' : 'Tezkor'} ish stoli</span>
  </button>;
}
