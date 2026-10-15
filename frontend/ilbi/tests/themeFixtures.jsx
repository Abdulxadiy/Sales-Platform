import React from 'react';
import {createRoot} from 'react-dom/client';
import '../src/index.css';
import '../src/components/support/support.css';
import DatePicker from '../src/components/common/CustomDatePicker';
import Select from '../src/components/common/CustomSelect';
import Confirm from '../src/components/common/ConfirmDialog';
import Permissions from '../src/components/employees/EmployeePermissionsSelector';
import Voice from '../src/components/support/VoicePlayer';
import Loading from '../src/components/common/AppLoadingScreen';
import Intro from '../src/components/common/IlbiIntroAnimation';
document.documentElement.dataset.theme=localStorage.getItem('ilbi_theme')==='dark'?'dark':'light';
const host=document.querySelector('#theme-fixtures');
host.style.cssText='min-height:100vh;background:var(--bg-app);padding:30px;color:var(--text-primary)';
const root=createRoot(host);
window.themeFixtureRoot=root;
window.themeFixtures={React,root,Confirm,Loading,Intro};
root.render(<div style={{maxWidth:900,margin:'auto',display:'grid',gap:22}}>
 <DatePicker value="2026-10-15" onChange={()=>{}}/>
 <Select value="one" options={[{value:'one',label:'Birinchi variant'},{value:'two',label:'Ikkinchi variant'}]} onChange={()=>{}}/>
 <Permissions permissionChoices={[{id:1,codename:'view_product',category:'catalog',name:'Mahsulotlarni ko‘rish'}]} selectedIds={[1]} onChange={()=>{}}/>
 <div className="support-widget-msg from-user"><div className="support-widget-bubble">Yuborilgan xabar<div className="support-message-reply-quote"><span className="support-message-reply-author">Operator</span><span className="support-message-reply-text">Javob matni</span></div><Voice duration={30}/></div></div>
 <div className="support-message own">Suhbatdagi xabar<Voice duration={30}/></div>
</div>);
