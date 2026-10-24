import React,{useEffect,useState} from 'react';
import {Lock,ShieldCheck,RefreshCw} from 'lucide-react';
import {getAccessToken} from '../../api/client';
import {desktopRequest} from './desktopApi';
import CustomSelect from '../common/CustomSelect';

export default function DesktopSecurityPanel({visible}){
  const [session,setSession]=useState(null),[registers,setRegisters]=useState([]),[pair,setPair]=useState(null);
  const [matched,setMatched]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[minutes,setMinutes]=useState(10);
  const [backup,setBackup]=useState(null),[selected,setSelected]=useState(''),[password,setPassword]=useState('');
  const [primary,setPrimary]=useState(false),[remaining,setRemaining]=useState(null);
  const native=window.ilbiDesktop;
  useEffect(()=>{
    if(!visible)return;
    let stopped=false;
    const poll=async()=>{
      try{
        const current=await desktopRequest('session-state');if(stopped)return;setSession(current);setRemaining(Math.max(0,Math.ceil((current.lease_until*1000-Date.now())/3600000)));
        const setup=await native.getSetupState?.();if(!stopped)setPrimary(setup?.mode==='host');
        if(current.owner){
          const list=await native.getRegisters?.(getAccessToken());if(!stopped&&list)setRegisters(list);
          const status=await native.getBackupStatus?.(getAccessToken()).catch(()=>null);if(!stopped&&status)setBackup(status);
        }
      }catch(failure){if(!stopped&&failure.status!==503)setError(failure.message);}
    };
    void poll();const timer=setInterval(poll,5000);return()=>{stopped=true;clearInterval(timer);};
  },[visible,native]);
  useEffect(()=>{
    if(!visible||!pair?.id||['completed','expired'].includes(pair.state))return;
    let stopped=false;
    const timer=setInterval(()=>{
      void native.getPairingState(getAccessToken(),pair.id).then(next=>{if(!stopped)setPair(next);}).catch(failure=>{if(!stopped)setError(failure.message);});
    },1000);return()=>{stopped=true;clearInterval(timer);};
  },[visible,pair?.id,pair?.state,native]);
  async function run(action){setBusy(true);setError('');try{await action();}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  if(!visible||!session?.lease_until)return null;
  return <section className="desktop-security" aria-label="Kassalar va xavfsizlik">
    <h3><ShieldCheck size={19}/>Kassalar va xavfsizlik</h3>
    {session&&<p className={remaining<24?'sync-lease-warning':''}>Qurilma ruxsati: {remaining>=24?`${Math.floor(remaining/24)} kun ${remaining%24} soat`:`${remaining} soat`}. Internet borida avtomatik yangilanadi.{remaining<24&&' Muddat tugashidan oldin internetga ulaning. Yuborilmagan ishlar saqlanadi.'}</p>}
    {session?.mfa_expires_at&&<p>2FA tasdig‘i {new Date(session.mfa_expires_at*1000).toLocaleString('uz-UZ')} gacha amal qiladi. 24 soat tugagach internet va Telegram kodi kerak. Oddiy parol bilan kirish bu muddatni uzaytirmaydi.</p>}
    <button className="btn btn-secondary" disabled={busy} onClick={()=>run(()=>native.lockSession(getAccessToken(),'explicit'))}><Lock size={16}/>Kassani qulflash</button>
    {error&&<p role="alert" className="sync-notice">{error}</p>}
    {session?.owner&&primary&&<>
      <details><summary>Avtomatik qulflash</summary><p>Kompyuter ishlatilmasa {session.idle_minutes} daqiqadan so‘ng qulflanadi. Qayta kirishda odatiy parol so‘raladi; qoralamalar qoladi.</p>
        <form onSubmit={event=>{event.preventDefault();void run(async()=>{await native.setIdleMinutes(getAccessToken(),Number(minutes));setSession({...session,idle_minutes:Number(minutes)});});}}><label>Vaqt (1–60 daqiqa)<input type="number" min="1" max="60" value={minutes} onChange={event=>setMinutes(event.target.value)}/></label><button className="btn btn-secondary" disabled={busy}>Saqlash</button></form>
      </details>
      <details><summary>Boshqa kompyuterni ulash</summary><p>Bitta kompyuter ishlatsangiz, bu bo‘lim kerak emas. Yangi kassa ulashda ikkala kompyuterda internet bo‘lsin. Keyinchalik bir xil mahalliy tarmoq yetarli; asosiy kompyuter ochiq turadi.</p>
        <button className="btn btn-secondary" disabled={busy} onClick={()=>run(async()=>{setMatched(false);setPair(await native.createPairing(getAccessToken()));})}>{pair?'Yangi kod yaratish':'Ulanish kodini yaratish'}</button>
        {pair&&<div className="desktop-pairing" role="status">
          {pair.state==='waiting'&&<><strong className="desktop-pair-code">{pair.code?.replace(/(.{4})/,'$1 ')}</strong><span>{pair.remaining} soniya qoldi</span><p>Yangi kompyuterda “Boshqa kassaga ulanish”ni ochib shu kodni kiriting. Kod bir marta ishlaydi.</p></>}
          {pair.state==='claimed'&&<><strong>{pair.clientName}</strong><span className="desktop-pair-code">{pair.fingerprint}</span><label className="desktop-check"><input type="checkbox" checked={matched} onChange={event=>setMatched(event.target.checked)}/>Ikkala ekrandagi belgi bir xil</label><button className="btn btn-primary" disabled={busy||!matched} onClick={()=>run(async()=>setPair(await native.approvePairing(getAccessToken(),pair.id,pair.fingerprint)))}>Yangi kassani tasdiqlash</button><small>{pair.remaining} soniya qoldi</small></>}
          {pair.state==='approved'&&<p><RefreshCw size={16} className="sync-arrows"/> Tasdiqlandi. Yangi kompyuter ulanishni tugatmoqda…</p>}
          {pair.state==='completed'&&<p>Yangi kassa ulandi. Unda xodim o‘z hisobi bilan kirsin.</p>}
          {pair.state==='expired'&&<p>Kod muddati tugadi. Yangi kod yarating.</p>}
          {!['completed','expired'].includes(pair.state)&&<button className="btn btn-secondary" disabled={busy} onClick={()=>run(async()=>setPair(await native.cancelPairing(getAccessToken(),pair.id)))}>Ulanishni bekor qilish</button>}
        </div>}
        {registers.length>0&&<ul className="desktop-registers">{registers.map(row=><li key={row.id}><span><strong>{row.name}</strong><small>{row.lastSeen?`Oxirgi aloqa: ${new Date(row.lastSeen).toLocaleString('uz-UZ')}`:'Hali ishlatilmagan'}</small></span><button className="btn btn-secondary" disabled={busy} onClick={()=>run(async()=>{await native.revokeRegister(getAccessToken(),row.id);setRegisters(registers.filter(item=>item.id!==row.id));})}>Kassani uzish</button></li>)}</ul>}
      </details>
      <details><summary>Shifrlangan zaxiralar</summary><p>Dastur ochiq bo‘lib, bir daqiqa ishlatilmaganda kuniga bir marta zaxira yaratiladi. Oxirgi 7 nusxa shu kompyuterda qoladi. Baza, yuborilmagan navbat, rasmlar va qoralamalar saqlanadi.</p><small>Zaxira ushbu o‘rnatishning himoyalangan kaliti bilan ochiladi. Bu kompyuter yoki uning diskiga zarar yetishidan himoya qilmaydi. Ma’lumotlar papkasini va tizimning maxfiy kalitlar omborini o‘chirmang.</small>
        {backup?.backups[0]&&<p>Oxirgi zaxira: {new Date(backup.backups[0].created).toLocaleString('uz-UZ')}</p>}
        {(backup?.busy||busy)&&<p role="status"><RefreshCw size={16} className="sync-arrows"/>Jarayon tugashini kuting. Bir oz vaqt amallar bajarilmaydi.</p>}
        {backup?.error&&<p role="alert">{backup.error}</p>}
        <button className="btn btn-secondary" disabled={busy||backup?.busy} onClick={()=>run(async()=>setBackup(await native.createBackup(getAccessToken())))}>Hozir zaxiralash</button>
        {backup?.backups.length>0&&<form onSubmit={event=>{event.preventDefault();void run(async()=>{await native.restoreBackup(getAccessToken(),selected,password);setPassword('');});}}><div><label style={{ display: 'block', marginBottom: 4 }}>Tiklanadigan zaxira</label><CustomSelect value={selected} onChange={setSelected} placeholder="Zaxirani tanlang" fullWidth options={backup.backups.map(row=>({ value: String(row.id), label: `${new Date(row.created).toLocaleString('uz-UZ')} · ${(row.bytes/1048576).toFixed(1)} MB` }))}/></div><label>Odatiy hisob parolingiz<input type="password" required autoComplete="off" value={password} onChange={event=>setPassword(event.target.value)}/></label><button className="btn btn-secondary" disabled={busy||backup.busy||!selected||!password}>Zaxiradan tiklash</button><small>Avval hozirgi holatning yangi zaxirasi yaratiladi. Tiklash uchun yana tasdiqlash oynasi chiqadi.</small></form>}
      </details>
    </>}
  </section>;
}
