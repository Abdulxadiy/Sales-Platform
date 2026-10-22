import {useEffect} from 'react';
import {getAccessToken, parseJwt} from '../../api/client';
import {useAuth} from '../../hooks/useAuth';
import {desktopRequest} from './desktopApi';

export default function DesktopSessionGuard() {
  const {user,logout} = useAuth();
  useEffect(()=>{
    if (!window.ilbiDesktop || !user) return;
    let stopped=false, lastActivity=0;
    const locked=()=>{if(!stopped)logout();};
    const check=async()=>{
      try {
        const native=await window.ilbiDesktop.getSessionLock?.();if(native?.locked){locked();return;}
        if(parseJwt(getAccessToken())?.desktop_device){const state=await desktopRequest('session-state');if(state.locked)locked();}
      }
      catch(error){if([401,403,423].includes(error.status))locked();}
    };
    const activity=event=>{
      if(!event.isTrusted || Date.now()-lastActivity<10000)return;
      lastActivity=Date.now();
      void window.ilbiDesktop.noteActivity?.().catch(()=>{});
      if(parseJwt(getAccessToken())?.desktop_device)void desktopRequest('activity',{}).catch(error=>{if([401,423].includes(error.status))locked();});
    };
    const timer=setInterval(check,5000);
    for(const name of ['pointerdown','keydown','wheel','touchstart'])window.addEventListener(name,activity,{passive:true});
    window.addEventListener('desktop:locked',locked);
    const unsubscribe=window.ilbiDesktop.onSessionLock?.(locked);
    void check();
    return ()=>{
      stopped=true;clearInterval(timer);window.removeEventListener('desktop:locked',locked);unsubscribe?.();
      for(const name of ['pointerdown','keydown','wheel','touchstart'])window.removeEventListener(name,activity);
    };
  },[user,logout]);
  return null;
}
