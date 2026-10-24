import {useEffect} from 'react';
import {getAccessToken, getAuthenticationGeneration, parseJwt} from '../../api/client';
import {useAuth} from '../../hooks/useAuth';
import {desktopRequest} from './desktopApi';

export default function DesktopSessionGuard() {
  const {user,logout} = useAuth();
  useEffect(()=>{
    if (!window.ilbiDesktop || !user) return;
    let stopped=false,lastNative=0,lastBackend=0,nativeTimer,backendTimer;
    const generation=getAuthenticationGeneration();
    const locked=()=>{if(!stopped&&generation===getAuthenticationGeneration())logout();};
    const check=async()=>{
      try {
        const native=await window.ilbiDesktop.getSessionLock?.();if(native?.locked){locked();return;}
        if(parseJwt(getAccessToken())?.desktop_device){const state=await desktopRequest('session-state');if(state.locked)locked();}
      }
      catch(error){if([401,403,423].includes(error.status))locked();}
    };
    const nativeActivity=()=>{
      clearTimeout(nativeTimer);nativeTimer=undefined;if(stopped)return;lastNative=Date.now();
      void window.ilbiDesktop.noteActivity?.().catch(()=>{});
    };
    const backendActivity=()=>{
      clearTimeout(backendTimer);backendTimer=undefined;if(stopped)return;lastBackend=Date.now();
      if(parseJwt(getAccessToken())?.desktop_device)void desktopRequest('activity',{}).catch(error=>{if([401,423].includes(error.status))locked();});
    };
    const activity=event=>{
      if(!event.isTrusted)return;
      if(Date.now()-lastNative>=100)nativeActivity();
      else if(!nativeTimer)nativeTimer=setTimeout(nativeActivity,100);
      if(Date.now()-lastBackend>=5000)backendActivity();
      else if(!backendTimer)backendTimer=setTimeout(backendActivity,5000-(Date.now()-lastBackend));
    };
    const events=['pointerdown','pointermove','keydown','input','wheel','touchstart','touchmove'];
    const timer=setInterval(check,5000);
    for(const name of events)window.addEventListener(name,activity,{passive:true});
    window.addEventListener('desktop:locked',locked);
    const unsubscribe=window.ilbiDesktop.onSessionLock?.(locked);
    void check();
    return ()=>{
      stopped=true;clearInterval(timer);clearTimeout(nativeTimer);clearTimeout(backendTimer);window.removeEventListener('desktop:locked',locked);unsubscribe?.();
      for(const name of events)window.removeEventListener(name,activity);
    };
  },[user,logout]);
  return null;
}
