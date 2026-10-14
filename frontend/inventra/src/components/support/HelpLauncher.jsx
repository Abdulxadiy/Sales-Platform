import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supportApi } from '../../api/support';
import { savedSupportLanguage, supportText } from './translations';
import { startSupportPolling } from './polling';
import './support.css';

export default function HelpLauncher() {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  const hidden = pathname === '/support' || pathname === '/pos' || pathname.startsWith('/r/') || pathname.startsWith('/receipt/');
  useEffect(() => {
    setUnread(0);
    if (hidden || loading) return;
    let active = true;
    const poller = startSupportPolling(async () => {
      const result = await supportApi(isAuthenticated, isAdmin).list();
      if (active) setUnread(result.unread_total || 0);
    }, { intervalMs: 20000 });
    return () => { active = false; poller.stop(); };
  }, [isAuthenticated, isAdmin, user?.id, hidden, loading]);
  if (hidden) return null;
  const title = supportText[savedSupportLanguage()].title;
  return <Link to="/support" className={`support-launcher ${pathname === '/pos' ? 'compact' : ''}`} aria-label={`${title}${unread ? ` (${unread})` : ''}`} title={title}>
    <Headphones size={21} /><span>{title}</span>{unread > 0 && <b className="support-badge">{unread}</b>}
  </Link>;
}
