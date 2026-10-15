// Runs in Chrome. Alpha layers are composited before text contrast is measured.
export function auditTheme() {
  const rgb = value => {
    const srgb=value.match(/^color\(srgb ([^)]+)\)/);
    if(srgb){const parts=srgb[1].split(/[ /]+/).map(Number);return [parts[0]*255,parts[1]*255,parts[2]*255,parts[3]??1];}
    const m = value.match(/^rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0, 0];
    const n = m[1].split(/[, /]+/).map(Number);
    return [n[0], n[1], n[2], n[3] ?? 1];
  };
  const over = (fg, bg) => {
    const a = fg[3] + bg[3] * (1 - fg[3]);
    return a ? [0,1,2].map(i => (fg[i]*fg[3]+bg[i]*bg[3]*(1-fg[3]))/a).concat(a) : [0,0,0,0];
  };
  const lum = c => c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
  const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  const failures=[];
  let measured=0, gradients=0;
  for (const el of document.querySelectorAll('body *')) {
    const icon=el.matches('button svg')&&!el.closest('button').textContent.trim();
    if (!icon&&(!el.childNodes.length || ![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))) continue;
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);
    if (!r.width || !r.height || r.bottom<=0 || r.top>=innerHeight || r.right<=0 || r.left>=innerWidth || s.visibility!=='visible')continue;
    if ((!icon&&el.closest('svg'))||el.closest('[disabled],[aria-disabled="true"],.thermal-receipt-paper,[data-print-surface="paper"],#printable-invoice-a4,#printable-shift-report')) continue;
    let layers=[],opacity=1,hasGradient=false,hidden=false;
    for(let p=el;p;p=p.parentElement){const ps=getComputedStyle(p);if(ps.display==='none'||ps.visibility==='hidden')hidden=true;opacity*=Number(ps.opacity);layers.push(rgb(ps.backgroundColor));if(ps.backgroundImage!=='none')hasGradient=true;}
    if(hidden||opacity<.75)continue;
    if(hasGradient){gradients++;continue;}
    let bg=[255,255,255,1];for(const layer of layers.reverse())bg=over(layer,bg);
    let fg=rgb(s.color);fg[3]*=opacity;fg=over(fg,bg);
    const threshold=icon ? 3 : parseFloat(s.fontSize)>=24 || (parseFloat(s.fontSize)>=18&&Number(s.fontWeight)>=700) ? 3 : 4.5;
    const contrast=ratio(fg,bg);measured++;
    if(contrast+.02<threshold)failures.push({tag:el.tagName,cls:typeof el.className==='string'?el.className:'',text:(el.textContent.trim()||el.closest('button')?.getAttribute('aria-label')||el.closest('button')?.title||'icon').slice(0,80),color:s.color,bg:bg.slice(0,3).map(Math.round),contrast:+contrast.toFixed(2),threshold});
  }
  const css=getComputedStyle(document.documentElement);
  const clippedHeaderControls=innerWidth<=768?[...document.querySelectorAll('.header-actions-row > *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&(r.left<0||r.right>innerWidth);}).map(el=>el.textContent.trim()):[];
  return {theme:document.documentElement.dataset.theme,primary:css.getPropertyValue('--primary').trim(),background:css.getPropertyValue('--bg-app').trim(),colorScheme:css.colorScheme,measured,gradientTextForVisualReview:gradients,failures,clippedHeaderControls,horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
}
