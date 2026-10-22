import React, {useEffect, useState} from 'react';
import {desktopRequest} from './desktopApi';
import './sync.css';

export default function DesktopAccess() {
  const [state,setState] = useState(null);
  useEffect(()=>{
    if (!window.ilbiDesktop) return;
    let alive=true;
    desktopRequest('status').then(value=>{if(alive)setState(value);}).catch(()=>{});
    return ()=>{alive=false;};
  },[]);
  if (!state?.enrolled) return null;
  return <div className="desktop-access" role="note"><strong>Shu kompyuterda ishlash</strong>
    <p>Odatiy login va hisob parolingizni kiriting. Tayyorlangan hisob internet bilan ham, internetsiz ham ishlaydi. Alohida offline parol kerak emas.</p>
    {state.unlock_required && <small>Xavfsizlik uchun qulflangan kassada parolni o‘zingiz kiriting.</small>}
  </div>;
}
