/* =====================================================================
   Gassi-Tracking im Strava-Stil: GPS-Route, Karte, Statistiken, Fotos
   Nutzt Globals aus index.html (S, ui, me, DEMO, sb, ins, upd, render, toast, esc, …)
   ===================================================================== */
const TRK_KEY='ellie.track', GPHOTO='gassi/';
const TILE='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>';
const MARKS={dog:{e:'🐕',l:'Hund'},bark:{e:'🗣️',l:'Gebellt'},poo:{e:'💩',l:'Geschäft'},scare:{e:'😰',l:'Schreck'}};
let TRK=null;            // laufende Runde
const gUrl={};           // Foto-Pfad → signierte URL

/* ---------- Rechnen & Formatieren ---------- */
function hav(a,b){const R=6371000,k=Math.PI/180,dLa=(b[0]-a[0])*k,dLo=(b[1]-a[1])*k;const h=Math.sin(dLa/2)**2+Math.cos(a[0]*k)*Math.cos(b[0]*k)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function routeDist(r){let d=0;for(let i=1;i<(r||[]).length;i++) if(!r[i][3]) d+=hav(r[i-1],r[i]);return d}
function fmtKm(m,unit=true){return (m/1000).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+(unit?' km':'')}
function fmtDur(s){s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60,p=n=>String(n).padStart(2,'0');return h?`${h}:${p(m)}:${p(x)}`:`${m}:${p(x)}`}
function fmtDurShort(s){const m=Math.max(s?1:0,Math.round(s/60));return m>=60?`${Math.floor(m/60)} h ${m%60} min`:`${m} min`}
function fmtPace(s,m){if(!m||m<50||!s) return '–';const p=s/(m/1000);return `${Math.floor(p/60)}:${String(Math.round(p%60)).padStart(2,'0')}`}
function walkTitle(t){const h=t?+t.slice(0,2):new Date().getHours();return h<5?'Nachtrunde':h<11?'Morgenrunde':h<14?'Mittagsrunde':h<18?'Nachmittagsrunde':h<22?'Abendrunde':'Nachtrunde'}
function walkDur(w){return w.duration_s||(+w.minutes||0)*60}
function walkDist(w){return w.distance_m||0}
function avatarCol(n){return n===me.name?'var(--accent)':'var(--hot)'}
function whenTxt(w){const d=w.day===today()?'Heute':w.day===addDays(today(),-1)?'Gestern':new Date(w.day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'});return d+(w.time?` um ${w.time}`:'')}

/* ---------- Karten ---------- */
let leafletP=null;
function loadLeaflet(){
  if(window.L) return Promise.resolve();
  if(!leafletP){ const l=document.createElement('link');l.rel='stylesheet';l.href='vendor/leaflet/leaflet.css?v=194';document.head.append(l);
    leafletP=loadScript('vendor/leaflet/leaflet.js?v=194') }
  return leafletP;
}
function baseMap(el,opt){
  const m=L.map(el,Object.assign({zoomControl:false,attributionControl:true},opt||{}));
  L.tileLayer(TILE,{subdomains:'abcd',maxZoom:20,attribution:TILE_ATTR,crossOrigin:true}).addTo(m);
  m.attributionControl.setPrefix(false);
  return m;
}
function segments(route){const segs=[[]];(route||[]).forEach(p=>{if(p[3]&&segs[segs.length-1].length) segs.push([]);segs[segs.length-1].push([p[0],p[1]])});return segs.filter(s=>s.length)}
function drawRoute(m,w){
  const r=w.route||[]; if(!r.length) return null;
  const segs=segments(r);
  L.polyline(segs,{color:'#ffffff',weight:9,opacity:.9,lineCap:'round',lineJoin:'round'}).addTo(m);
  const line=L.polyline(segs,{color:'#e4501f',weight:5,lineCap:'round',lineJoin:'round'}).addTo(m);
  const dot=(p,c)=>L.circleMarker([p[0],p[1]],{radius:7,color:'#fff',weight:3,fillColor:c,fillOpacity:1}).addTo(m);
  dot(r[0],'#3f9a5d'); if(r.length>1) dot(r[r.length-1],'#2a2335');
  (w.marks||[]).forEach(k=>L.marker([k.lat,k.lng],{icon:L.divIcon({className:'gmk',html:`<span>${(MARKS[k.k]||{e:'📍'}).e}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).addTo(m));
  (w.photos||[]).forEach(p=>{ if(p.lat==null) return; const u=photoUrl(p); if(!u) return;
    L.marker([p.lat,p.lng],{icon:L.divIcon({className:'gpk',html:`<img src="${esc(u)}">`,iconSize:[38,38],iconAnchor:[19,19]})}).addTo(m) });
  return line;
}
// Statische Karte aus Kacheln + SVG (leicht, für Listen)
const TPX=256;
function merc(lat,lng,z){const s=TPX*2**z, x=(lng+180)/360*s, sl=Math.sin(lat*Math.PI/180);return [x,(0.5-Math.log((1+sl)/(1-sl))/(4*Math.PI))*s]}
function staticMap(w,W,H){
  const r=w.route||[]; if(r.length<2) return '';
  let la0=90,la1=-90,lo0=180,lo1=-180; r.forEach(p=>{la0=Math.min(la0,p[0]);la1=Math.max(la1,p[0]);lo0=Math.min(lo0,p[1]);lo1=Math.max(lo1,p[1])});
  const pad=26; let z=18;
  for(;z>3;z--){const a=merc(la1,lo0,z),b=merc(la0,lo1,z);if(b[0]-a[0]<=W-2*pad&&b[1]-a[1]<=H-2*pad) break}
  const a=merc(la1,lo0,z),b=merc(la0,lo1,z), cx=(a[0]+b[0])/2, cy=(a[1]+b[1])/2, ox=cx-W/2, oy=cy-H/2;
  let tiles=''; const sd='abcd';
  for(let tx=Math.floor(ox/TPX);tx<=Math.floor((ox+W)/TPX);tx++) for(let ty=Math.floor(oy/TPX);ty<=Math.floor((oy+H)/TPX);ty++){
    tiles+=`<img src="https://${sd[(tx+ty)&3]}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}@2x.png" style="left:${tx*TPX-ox}px;top:${ty*TPX-oy}px" alt="">` }
  const pts=segments(r).map(s=>s.map(p=>{const q=merc(p[0],p[1],z);return `${(q[0]-ox).toFixed(1)},${(q[1]-oy).toFixed(1)}`}).join(' '));
  const st=merc(r[0][0],r[0][1],z), en=merc(r[r.length-1][0],r[r.length-1][1],z);
  return `<div class="smap" style="width:${W}px;height:${H}px">${tiles}<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    ${pts.map(p=>`<polyline points="${p}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><polyline points="${p}" fill="none" stroke="#e4501f" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
    <circle cx="${st[0]-ox}" cy="${st[1]-oy}" r="5" fill="#3f9a5d" stroke="#fff" stroke-width="2"/><circle cx="${en[0]-ox}" cy="${en[1]-oy}" r="5" fill="#2a2335" stroke="#fff" stroke-width="2"/></svg>
    <span class="smap-attr">© OSM · CARTO</span></div>`;
}

/* ---------- Fotos ---------- */
function photoUrl(p){const path=typeof p==='string'?p:p.path;return gUrl[path]?.url||(p.local)||null}
async function ensurePhotoUrls(){
  if(DEMO) return;
  const need=[...new Set(S.walks.flatMap(w=>(w.photos||[]).map(p=>p.path)).filter(p=>p&&!(gUrl[p]&&Date.now()-gUrl[p].t<5*864e5)))];
  if(!need.length) return;
  const {data}=await sb.storage.from(BUCKET).createSignedUrls(need,60*60*24*7);
  (data||[]).forEach((u,i)=>{if(u.signedUrl) gUrl[need[i]]={url:u.signedUrl,t:Date.now()}});
  render(true);
}
let ensureT=0;
function gassiAfterRender(){ if(DEMO||!sb) return; const miss=S.walks.some(w=>(w.photos||[]).some(p=>p.path&&!gUrl[p.path]));
  if(miss&&Date.now()-ensureT>8000){ ensureT=Date.now(); ensurePhotoUrls().catch(e=>console.warn(e)) } }
async function uploadWalkPhoto(file,pos){
  const blob=await shrink(file,1800), path=`${GPHOTO}${Date.now()}-${Math.random().toString(36).slice(2,7)}.jpg`;
  const ph={path}; if(pos){ph.lat=pos[0];ph.lng=pos[1]}
  if(DEMO){gUrl[path]={url:URL.createObjectURL(blob),t:Date.now()};return ph}
  const {error}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg'}); if(error) throw error;
  const {data}=await sb.storage.from(BUCKET).createSignedUrl(path,60*60*24*7); gUrl[path]={url:data.signedUrl,t:Date.now()};
  return ph;
}
function pickPhotos(multi){return new Promise(ok=>{const i=document.createElement('input');i.type='file';i.accept='image/*';if(multi)i.multiple=true;i.onchange=()=>ok([...i.files]);i.click()})}
function viewPhoto(url){const d=document.createElement('div');d.className='gview';d.innerHTML=`<img src="${esc(url)}"><button aria-label="Schließen">✕</button>`;d.onclick=()=>d.remove();document.body.append(d)}

/* ---------- Tracking ---------- */
function gassiActive(){return !!TRK}
function trkSave(){ if(!TRK) return; const {start,pts,paused,pauseAcc,pauseAt,marks,photos,needGap}=TRK; lsSet(TRK_KEY,JSON.stringify({start,pts,paused,pauseAcc,pauseAt,marks,photos,needGap})) }
function trkElapsed(){ if(!TRK) return 0; const now=Date.now(); return (now-TRK.start-TRK.pauseAcc-(TRK.paused&&TRK.pauseAt?now-TRK.pauseAt:0))/1000 }
function trkDist(){return TRK?routeDist(TRK.pts):0}
async function wake(on){
  try{ if(on&&'wakeLock' in navigator&&document.visibilityState==='visible'){ TRK.wl=await navigator.wakeLock.request('screen') }
       else if(!on&&TRK?.wl){ await TRK.wl.release(); TRK.wl=null } }catch(e){}
}
function onPos(p){
  if(!TRK) return; const c=p.coords, ll=[c.latitude,c.longitude];
  TRK.cur=ll; TRK.acc=c.accuracy; TRK.lastFix=Date.now();
  if(!TRK.paused&&c.accuracy<=45){
    const t=Math.round((p.timestamp-TRK.start-TRK.pauseAcc)/1000), last=TRK.pts[TRK.pts.length-1];
    const pt=[+ll[0].toFixed(6),+ll[1].toFixed(6),Math.max(0,t)];
    if(!last){ TRK.pts.push(pt) }
    else if(TRK.needGap){ pt.push(1); TRK.pts.push(pt); TRK.needGap=false }
    else { const d=hav(last,pt), dt=Math.max(1,t-last[2]);
      if(d>=Math.max(4,c.accuracy*.5)){ if(d/dt<9||(TRK.rej=(TRK.rej||0)+1)>=4){ TRK.pts.push(pt); TRK.rej=0 } } }
    trkSave();
  }
  trkDrawLive();
}
function onPosErr(e){ if(!TRK) return; TRK.err=e.code===1?'Kein Standort-Zugriff – bitte in den iPhone-Einstellungen erlauben':'GPS-Signal wird gesucht …'; trkHud() }
function trkWatch(){ if(TRK.watch!=null) return; TRK.watch=navigator.geolocation.watchPosition(onPos,onPosErr,{enableHighAccuracy:true,maximumAge:0,timeout:30000}); wake(true) }
function trkUnwatch(){ if(TRK&&TRK.watch!=null){navigator.geolocation.clearWatch(TRK.watch);TRK.watch=null} wake(false) }
document.addEventListener('visibilitychange',()=>{ if(TRK&&document.visibilityState==='visible'&&TRK.watch!=null) wake(true) });

function gassiBoot(){
  const raw=lsGet(TRK_KEY); if(!raw||TRK) return;
  try{ const d=JSON.parse(raw); if(!d.start||Date.now()-d.start>12*3600e3){lsSet(TRK_KEY,'');return}
    TRK=Object.assign({watch:null,marks:[],photos:[]},d); if(!TRK.paused){TRK.paused=true;TRK.pauseAt=Date.now()} trkPill() }catch(e){}
}
async function gassiStart(){
  if(TRK) return gassiOpen();
  if(!navigator.geolocation){toast('GPS wird hier nicht unterstützt');return}
  TRK={start:Date.now(),pts:[],paused:false,pauseAcc:0,pauseAt:null,marks:[],photos:[],watch:null,needGap:false};
  trkSave(); gassiOpen(); trkWatch(); render();
}
function trkPause(on){
  if(!TRK) return;
  if(on&&!TRK.paused){TRK.paused=true;TRK.pauseAt=Date.now()}
  else if(!on&&TRK.paused){TRK.pauseAcc+=Date.now()-(TRK.pauseAt||Date.now());TRK.paused=false;TRK.pauseAt=null;TRK.needGap=TRK.pts.length>0;trkWatch()}
  trkSave(); trkHud(); render(true);
}
function trkPill(){
  let p=document.getElementById('gpill');
  if(!TRK||document.getElementById('gt')){ if(p) p.remove(); return }
  if(!p){p=document.createElement('button');p.id='gpill';p.onclick=gassiOpen;document.body.append(p)}
  p.innerHTML=`<i class="${TRK.paused?'':'rec'}"></i>${TRK.paused?'Gassi pausiert':'Gassi läuft'} · <b>${fmtDur(trkElapsed())}</b> · ${fmtKm(trkDist())}<span>›</span>`;
}
setInterval(()=>{ if(TRK){ trkPill(); if(document.getElementById('gt')) trkHud() } },1000);

async function gassiOpen(){
  if(!TRK) return; closeSheet(true);
  const ov=document.createElement('div'); ov.id='gt'; ov.className='gfull';
  ov.innerHTML=`<div class="gt-map" id="gtm"><div class="gt-load">Karte lädt …</div></div>
    <div class="gt-top"><button class="gt-ib" data-g="min" aria-label="Minimieren">⌄</button><div class="gt-gps" id="gtg">GPS …</div><button class="gt-ib" data-g="center" aria-label="Zentrieren">◎</button></div>
    <div class="gt-panel">
      <div class="gt-stats"><div><small>Zeit</small><b id="gtt">0:00</b></div><div class="mid"><small>Distanz</small><b id="gtd">0,00</b><small>km</small></div><div><small>Tempo</small><b id="gtp">–</b><small>/km</small></div></div>
      <div class="gt-marks">${Object.entries(MARKS).map(([k,m])=>`<button data-g="mark" data-k="${k}"><span>${m.e}</span>${m.l}</button>`).join('')}<button data-g="photo"><span>📷</span>Foto</button></div>
      <div class="gt-ctl" id="gtc"></div>
      <div class="gt-tip">Tipp: Lass den Bildschirm an – das iPhone pausiert GPS, wenn die App im Hintergrund ist. Lücken werden mit einer geraden Linie überbrückt.</div>
    </div>`;
  document.body.append(ov); document.body.classList.add('noscroll'); trkPill();
  ov.addEventListener('click',e=>{const b=e.target.closest('[data-g]'); if(!b) return; const a=b.dataset.g;
    if(a==='min'){gassiMin()} else if(a==='center'){TRK.follow=true;trkDrawLive(true)}
    else if(a==='pause') trkPause(true); else if(a==='resume') trkPause(false); else if(a==='stop') trkStop();
    else if(a==='mark') trkMark(b.dataset.k); else if(a==='photo') trkPhoto() });
  if(TRK.watch==null&&!TRK.paused) trkWatch();
  trkHud();
  try{ await loadLeaflet(); if(!document.getElementById('gt')) return;
    const el=ov.querySelector('#gtm'); el.innerHTML='';
    TRK.map=baseMap(el,{attributionControl:true}); TRK.follow=true;
    TRK.map.setView(TRK.cur||TRK.pts[TRK.pts.length-1]||[50.9466,6.8335],17);
    TRK.map.on('dragstart',()=>TRK.follow=false);
    TRK.line=null; trkDrawLive(true);
  }catch(e){ ov.querySelector('#gtm').innerHTML='<div class="gt-load">Karte offline – Aufzeichnung läuft trotzdem 🐾</div>' }
}
function gassiMin(){ const ov=document.getElementById('gt'); if(ov) ov.remove(); document.body.classList.remove('noscroll'); if(TRK){TRK.map=null;TRK.me=null} trkPill() }
function trkDrawLive(force){
  if(!TRK||!TRK.map) return; const m=TRK.map;
  if(TRK.lyr) TRK.lyr.remove(); TRK.lyr=L.layerGroup().addTo(m);
  const segs=segments(TRK.pts);
  L.polyline(segs,{color:'#fff',weight:9,opacity:.9}).addTo(TRK.lyr); L.polyline(segs,{color:'#e4501f',weight:5}).addTo(TRK.lyr);
  TRK.marks.forEach(k=>L.marker([k.lat,k.lng],{icon:L.divIcon({className:'gmk',html:`<span>${MARKS[k.k].e}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).addTo(TRK.lyr));
  const cur=TRK.cur||TRK.pts[TRK.pts.length-1];
  if(cur){ if(TRK.acc) L.circle(cur,{radius:TRK.acc,color:'#8459c4',weight:1,fillOpacity:.08}).addTo(TRK.lyr);
    L.circleMarker(cur,{radius:9,color:'#fff',weight:3,fillColor:'#8459c4',fillOpacity:1}).addTo(TRK.lyr);
    if(TRK.follow||force) m.setView(cur,Math.max(m.getZoom(),16),{animate:!force}) }
}
function trkHud(){
  const ov=document.getElementById('gt'); if(!ov||!TRK) return; const q=s=>ov.querySelector(s);
  const s=trkElapsed(), d=trkDist();
  q('#gtt').textContent=fmtDur(s); q('#gtd').textContent=fmtKm(d,false); q('#gtp').textContent=fmtPace(s,d);
  const g=q('#gtg'), age=TRK.lastFix?(Date.now()-TRK.lastFix)/1000:999;
  g.className='gt-gps '+(TRK.err&&age>20?'bad':TRK.acc&&TRK.acc<=20&&age<15?'ok':TRK.acc&&age<15?'mid':'bad');
  g.textContent=TRK.paused?'⏸ Pausiert':TRK.err&&age>20?TRK.err:TRK.acc&&age<15?`GPS ±${Math.round(TRK.acc)} m`:'GPS wird gesucht …';
  const c=q('#gtc'), st=TRK.paused?'p':'r';
  if(c.dataset.st!==st){ c.dataset.st=st;
    c.innerHTML=TRK.paused?`<button class="gt-btn" data-g="resume">▶ Weiter</button><button class="gt-btn stop" data-g="stop">■ Beenden</button>`:`<button class="gt-btn pause" data-g="pause">⏸ Pause</button>` }
}
function trkMark(k){
  const p=TRK.cur||TRK.pts[TRK.pts.length-1]; if(!p){toast('Noch kein GPS-Signal');return}
  TRK.marks.push({k,lat:p[0],lng:p[1],t:Math.round(trkElapsed())}); trkSave(); trkDrawLive(); toast(`${MARKS[k].e} ${MARKS[k].l} markiert`);
}
async function trkPhoto(){
  const fs=await pickPhotos(true); if(!fs.length) return; const p=TRK.cur||TRK.pts[TRK.pts.length-1]||null;
  toast('Foto wird hochgeladen …');
  for(const f of fs){ try{ TRK.photos.push(await uploadWalkPhoto(f,p)); trkSave() }catch(e){console.error(e);toast('Foto-Upload fehlgeschlagen')} }
  toast(`📷 ${TRK.photos.length} Foto${TRK.photos.length>1?'s':''} bei dieser Runde`);
}
function trkStop(){
  if(!TRK) return; trkPause(true); trkUnwatch();
  const s=trkElapsed(), d=trkDist(), st=new Date(TRK.start), day=dayOf(st.toISOString());
  const w={_new:true,day,time:hm(st),start_at:st.toISOString(),duration_s:Math.round(s),minutes:Math.max(1,Math.round(s/60)),distance_m:Math.round(d),
    route:TRK.pts,marks:TRK.marks,photos:TRK.photos,title:walkTitle(hm(st)),calm:null,place:'',note:''};
  gassiMin(); gassiSaveSheet(w);
}
function gassiDiscard(){ trkUnwatch(); TRK=null; lsSet(TRK_KEY,''); trkPill(); render() }

/* ---------- Speichern / Bearbeiten ---------- */
async function walkSaveRow(id,row){
  if(DEMO){ if(id){Object.assign(S.walks.find(r=>r.id===id),row)} else {row={...row,id:uid(),author:me.name,created_at:new Date().toISOString()};S.walks.push(row)} render(); return row }
  const q=id?sb.from('walks').update(row).eq('id',id):sb.from('walks').insert({author:me.name,...row});
  const {data,error}=await q.select().single();
  if(error){ console.error(error); toast(/column|schema/i.test(error.message||'')?'Bitte zuerst update_10.sql in Supabase ausführen':'Speichern fehlgeschlagen'); return null }
  putLocal('walks',data); render(); return data;
}
function gassiSaveSheet(w){
  // für neue getrackte Runden und zum Bearbeiten (auch manuelle Runden)
  const isNew=!w.id, tracked=(w.route||[]).length>1;
  let calm=w.calm, photos=[...(w.photos||[])], mins=+w.minutes||30;
  const places=[...new Set(S.walks.map(x=>x.place).filter(Boolean))].slice(-6).reverse();
  const calmChips=()=>CALM.map(c=>`<button class="chip ${calm===c.v?'on':''}" data-calm="${c.v}">${c.e} ${c.l}</button>`).join('');
  const minChips=()=>[15,30,45,60,90,120].map(m=>`<button class="chip ${mins===m?'on':''}" data-min="${m}">${m}</button>`).join('');
  const phHTML=()=>photos.map((p,i)=>`<div class="gph">${photoUrl(p)?`<img src="${esc(photoUrl(p))}">`:'<span>📷</span>'}<button data-rm="${i}" aria-label="Entfernen">✕</button></div>`).join('')+`<button class="gph add" data-addph="1">＋<small>Foto</small></button>`;
  openSheet(`<h3>${isNew?(tracked?'Runde speichern':'Neue Gassi-Runde'):'Gassi-Runde bearbeiten'}</h3><div class="muted">${dayLabel(w.day)}</div>
    ${tracked?`<div class="gs-map">${staticMap(w,340,170)}</div>
      <div class="gs-stats"><div><small>Distanz</small><b>${fmtKm(w.distance_m)}</b></div><div><small>Zeit</small><b>${fmtDur(w.duration_s)}</b></div><div><small>Tempo</small><b>${fmtPace(w.duration_s,w.distance_m)}<small> /km</small></b></div></div>`:''}
    <label class="f">Titel</label><input type="text" id="wti" value="${esc(w.title||walkTitle(w.time))}" placeholder="z. B. Morgenrunde">
    ${tracked?'':`<div class="row" style="gap:10px"><div style="width:130px"><label class="f">Start</label><input type="time" id="wt" value="${esc(w.time||'')}"></div>
      <div class="grow"><label class="f">Dauer (Min.)</label><input type="text" inputmode="numeric" id="wm" value="${mins}"></div></div><div class="chips" id="mc" style="margin-top:8px">${minChips()}</div>`}
    <label class="f">Wie entspannt war sie?</label><div class="chips" id="cc">${calmChips()}</div>
    <label class="f">Fotos</label><div class="gphs" id="gph">${phHTML()}</div>
    <label class="f">Wo? (optional)</label><input type="text" id="wp" value="${esc(w.place||'')}" placeholder="z. B. Feld, Stadtwald, Kiesgrube">
    ${places.length?`<div class="chips" style="margin-top:8px">${places.map(p=>`<button class="chip" data-pl="${esc(p)}">📍 ${esc(p)}</button>`).join('')}</div>`:''}
    <label class="f">Besonderes (optional)</label><input type="text" id="wn" value="${esc(w.note||'')}" placeholder="z. B. Hundebegegnung, Jogger, Knall">
    <button class="btn block" id="save" style="margin-top:16px">Speichern</button>
    ${w._new?'<button class="btn block plain" id="disc" style="margin-top:4px;color:var(--danger)">Runde verwerfen</button>':''}
    ${w.id?'<button class="btn block danger" id="del" style="margin-top:4px">Löschen</button>':''}`, sh=>{
    const q=s=>sh.querySelector(s);
    sh.addEventListener('click',async e=>{
      const m=e.target.closest('[data-min]'),c=e.target.closest('[data-calm]'),p=e.target.closest('[data-pl]'),rm=e.target.closest('[data-rm]'),ad=e.target.closest('[data-addph]');
      if(m){mins=+m.dataset.min;q('#wm').value=mins;q('#mc').innerHTML=minChips()}
      if(c){calm=calm===+c.dataset.calm?null:+c.dataset.calm;q('#cc').innerHTML=calmChips()}
      if(p) q('#wp').value=p.dataset.pl;
      if(rm){photos.splice(+rm.dataset.rm,1);q('#gph').innerHTML=phHTML()}
      if(ad){ const fs=await pickPhotos(true); if(!fs.length) return; ad.innerHTML='⏳';
        for(const f of fs){ try{photos.push(await uploadWalkPhoto(f,null))}catch(err){console.error(err);toast('Foto-Upload fehlgeschlagen')} }
        q('#gph').innerHTML=phHTML() }
    });
    const wm=q('#wm'); if(wm) wm.addEventListener('input',()=>{mins=parseInt(wm.value,10)||0;q('#mc').innerHTML=minChips()});
    q('#save').onclick=async()=>{
      const row={day:w.day,calm,place:q('#wp').value.trim()||null,note:q('#wn').value.trim()||null,title:q('#wti').value.trim()||null,photos};
      if(tracked){ Object.assign(row,{time:w.time,minutes:w.minutes,duration_s:w.duration_s,distance_m:w.distance_m,route:w.route,marks:w.marks||[],start_at:w.start_at||null}) }
      else { row.time=q('#wt').value||null; row.minutes=parseInt(q('#wm').value,10)||null }
      q('#save').disabled=true;
      const saved=await walkSaveRow(w.id,row);
      q('#save').disabled=false; if(!saved) return;
      if(w._new&&tracked){ TRK=null; lsSet(TRK_KEY,''); trkPill() }
      closeSheet(); toast(tracked&&isNew?`🐾 ${fmtKm(row.distance_m)} gespeichert!`:'Gassi gespeichert 🐕');
      if(isNew&&(tracked||photos.length)) setTimeout(()=>gassiDetail(saved.id),300);
    };
    const dc=q('#disc'); if(dc) dc.onclick=()=>{ if(confirm('Runde wirklich verwerfen? Die Route geht verloren.')){ gassiDiscard(); closeSheet() } };
    const dl=q('#del'); if(dl) dl.onclick=()=>{ if(confirm('Runde löschen?')){ del('walks',w.id); closeSheet(); document.getElementById('ga')?.remove(); document.body.classList.remove('noscroll') } };
  });
}

/* ---------- Aktivität (Detailansicht) ---------- */
function statBlock(w){
  const d=walkDist(w), s=walkDur(w), c=CALM.find(x=>x.v===w.calm);
  const items=[]; if(d) items.push(['Distanz',fmtKm(d)]); items.push(['Zeit',s?fmtDur(s):'–']); if(d) items.push(['Tempo',fmtPace(s,d)+'<small> /km</small>']);
  if(!d&&c) items.push(['Entspannung',c.e+' '+c.l]);
  return `<div class="ga-stats">${items.map(([l,v])=>`<div><small>${l}</small><b>${v}</b></div>`).join('')}</div>`;
}
function kudosHTML(w){
  const k=w.kudos||[], mine=k.includes(me.name), own=w.author===me.name;
  return `<button class="ga-kudo ${mine?'on':''}" data-a="gKudo" data-id="${w.id}" ${own?'disabled':''}>🐾 ${k.length?k.length:''}<span>${own?(k.length?`${k.map(esc).join(', ')} ${k.length>1?'haben':'hat'} Pfötchen gegeben`:'Noch keine Pfötchen'):mine?'Pfötchen gegeben':'Pfötchen geben'}</span></button>`;
}
async function gassiDetail(id){
  const w=S.walks.find(x=>x.id===id); if(!w) return; closeSheet(true);
  document.getElementById('ga')?.remove();
  const c=CALM.find(x=>x.v===w.calm), marks=w.marks||[], cnt={}; marks.forEach(m=>cnt[m.k]=(cnt[m.k]||0)+1);
  const ov=document.createElement('div'); ov.id='ga'; ov.className='gfull ga';
  ov.innerHTML=`<div class="ga-bar"><button class="gt-ib" data-g="back" aria-label="Zurück">‹</button><b>Gassi-Runde</b><button class="gt-ib" data-g="edit" aria-label="Bearbeiten">✎</button></div>
    <div class="ga-scroll">
      <div class="ga-head"><span class="ga-av" style="background:${avatarCol(w.author)}">${esc((w.author||'?')[0])}</span><div><b>${esc(w.author||'')}</b><small>${whenTxt(w)}${w.place?' · '+esc(w.place):''}</small></div></div>
      <h2 class="ga-title">${esc(w.title||walkTitle(w.time))}</h2>
      ${w.note?`<p class="ga-note">${esc(w.note)}</p>`:''}
      ${statBlock(w)}
      ${(c&&walkDist(w))||marks.length?`<div class="ga-chips">${c&&walkDist(w)?`<span>${c.e} ${c.l}</span>`:''}${Object.entries(cnt).map(([k,n])=>`<span>${MARKS[k]?.e||'📍'} ${n}× ${MARKS[k]?.l||''}</span>`).join('')}</div>`:''}
      ${(w.route||[]).length>1?`<div class="ga-map" id="gam"></div>`:''}
      ${(w.photos||[]).length?`<div class="ga-photos">${w.photos.map(p=>photoUrl(p)?`<img src="${esc(photoUrl(p))}" data-g="ph" data-u="${esc(photoUrl(p))}">`:'').join('')}</div>`:''}
      ${splitsHTML(w)}
      <div class="ga-actions">${kudosHTML(w)}<button class="btn ghost" data-g="share">📤 Story-Bild</button></div>
    </div>`;
  document.body.append(ov); document.body.classList.add('noscroll');
  ov.addEventListener('click',e=>{const b=e.target.closest('[data-g]'); if(!b) return; const a=b.dataset.g;
    if(a==='back'){ov.remove();document.body.classList.remove('noscroll')}
    else if(a==='edit') gassiSaveSheet(S.walks.find(x=>x.id===id));
    else if(a==='ph') viewPhoto(b.dataset.u);
    else if(a==='share') gassiShare(S.walks.find(x=>x.id===id)) });
  if((w.route||[]).length>1){ try{ await loadLeaflet(); const el=ov.querySelector('#gam'); if(!el) return;
      const m=baseMap(el,{scrollWheelZoom:false}); const line=drawRoute(m,w); m.fitBounds(line.getBounds(),{padding:[28,28]});
    }catch(e){ const el=ov.querySelector('#gam'); if(el) el.innerHTML=staticMap(w,el.clientWidth||340,240) } }
}
function splitsHTML(w){
  const r=w.route||[]; if(r.length<3||walkDist(w)<1000) return '';
  const out=[]; let acc=0, lastT=r[0][2], km=1;
  for(let i=1;i<r.length;i++){ if(!r[i][3]) acc+=hav(r[i-1],r[i]); if(acc>=km*1000){ out.push({km,s:r[i][2]-lastT}); lastT=r[i][2]; km++ } }
  const rest=acc-(km-1)*1000; if(rest>150) out.push({km:(km-1)+rest/1000,s:r[r.length-1][2]-lastT,part:rest});
  if(!out.length) return ''; const max=Math.max(...out.map(o=>o.s/(o.part?o.part/1000:1)));
  return `<div class="ga-splits"><div class="ga-sh">Abschnitte</div>${out.map(o=>{const pace=o.s/(o.part?o.part/1000:1);
    return `<div class="ga-sp"><span>${o.part?o.km.toLocaleString('de-DE',{maximumFractionDigits:1}):o.km}</span><i style="width:${Math.max(18,pace/max*100)}%"></i><b>${fmtPace(o.s,o.part||1000)}</b></div>`}).join('')}</div>`;
}

/* ---------- Story-Bild (wie Strava) ---------- */
function loadImg(src){return new Promise((ok,no)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>ok(i);i.onerror=no;i.src=src})}
async function gassiShare(w){
  toast('Bild wird erstellt …');
  const W=1080,H=1920,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#6a43ad');g.addColorStop(.55,'#8459c4');g.addColorStop(1,'#e4501f');x.fillStyle=g;x.fillRect(0,0,W,H);
  let bg=false; const ph=(w.photos||[]).map(photoUrl).filter(Boolean)[0];
  if(ph){ try{ const im=await loadImg(ph), s=Math.max(W/im.width,H/im.height); x.drawImage(im,(W-im.width*s)/2,(H-im.height*s)/2,im.width*s,im.height*s); bg=true }catch(e){} }
  if(!bg&&(w.route||[]).length>1){ // Kartenhintergrund
    try{ const r=w.route; let la0=90,la1=-90,lo0=180,lo1=-180; r.forEach(p=>{la0=Math.min(la0,p[0]);la1=Math.max(la1,p[0]);lo0=Math.min(lo0,p[1]);lo1=Math.max(lo1,p[1])});
      let z=18; for(;z>3;z--){const a=merc(la1,lo0,z),b=merc(la0,lo1,z);if((b[0]-a[0])*2<=W-300&&(b[1]-a[1])*2<=H-900) break}
      const a=merc(la1,lo0,z),b=merc(la0,lo1,z),cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2-120/2,S2=2,ox=cx-W/S2/2,oy=cy-H/S2/2,jobs=[];
      for(let tx=Math.floor(ox/TPX);tx<=Math.floor((ox+W/S2)/TPX);tx++) for(let ty=Math.floor(oy/TPX);ty<=Math.floor((oy+H/S2)/TPX);ty++)
        jobs.push(loadImg(`https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}@2x.png`).then(im=>x.drawImage(im,(tx*TPX-ox)*S2,(ty*TPX-oy)*S2,TPX*S2,TPX*S2)).catch(()=>{}));
      await Promise.all(jobs); bg=true;
    }catch(e){} }
  const sh=x.createLinearGradient(0,H*.45,0,H);sh.addColorStop(0,'rgba(20,12,30,0)');sh.addColorStop(1,'rgba(20,12,30,.78)');x.fillStyle=sh;x.fillRect(0,0,W,H);
  const tp=x.createLinearGradient(0,0,0,300);tp.addColorStop(0,'rgba(20,12,30,.45)');tp.addColorStop(1,'rgba(20,12,30,0)');x.fillStyle=tp;x.fillRect(0,0,W,300);
  // Route als Linie (Sticker)
  const r=w.route||[]; if(r.length>1){
    let la0=90,la1=-90,lo0=180,lo1=-180; r.forEach(p=>{la0=Math.min(la0,p[0]);la1=Math.max(la1,p[0]);lo0=Math.min(lo0,p[1]);lo1=Math.max(lo1,p[1])});
    const k=Math.cos((la0+la1)/2*Math.PI/180), bw=(lo1-lo0)*k||1e-6, bh=(la1-la0)||1e-6, box=bg&&!ph?null:{x:240,y:820,w:600,h:520};
    x.lineCap='round';x.lineJoin='round';
    if(box){ const s=Math.min(box.w/bw,box.h/bh), offx=box.x+(box.w-bw*s)/2, offy=box.y+(box.h-bh*s)/2;
      for(const seg of segments(r)){ x.beginPath(); seg.forEach((p,i)=>{const px=offx+(p[1]-lo0)*k*s, py=offy+(la1-p[0])*s; i?x.lineTo(px,py):x.moveTo(px,py)});
        x.strokeStyle='rgba(0,0,0,.25)';x.lineWidth=20;x.stroke(); x.strokeStyle='#ffffff';x.lineWidth=12;x.stroke() } }
    else { let z=18; for(;z>3;z--){const a=merc(la1,lo0,z),b=merc(la0,lo1,z);if((b[0]-a[0])*2<=W-300&&(b[1]-a[1])*2<=H-900) break}
      const a=merc(la1,lo0,z),b=merc(la0,lo1,z),cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2-60,ox=cx-W/4,oy=cy-H/4;
      for(const seg of segments(r)){ x.beginPath(); seg.forEach((p,i)=>{const q=merc(p[0],p[1],z),px=(q[0]-ox)*2,py=(q[1]-oy)*2; i?x.lineTo(px,py):x.moveTo(px,py)});
        x.strokeStyle='#fff';x.lineWidth=22;x.stroke(); x.strokeStyle='#e4501f';x.lineWidth=12;x.stroke() } }
  }
  // Texte
  x.fillStyle='#fff'; x.textAlign='left'; x.textBaseline='alphabetic'; const F=(wgt,px)=>`${wgt} ${px}px -apple-system,"SF Pro Rounded",system-ui,sans-serif`;
  x.font=F(800,46); x.fillText('🐾 '+DOG+' · '+(w.author||''),70,130);
  x.font=F(600,34); x.globalAlpha=.85; x.fillText(new Date(w.day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})+(w.time?' · '+w.time:''),70,185); x.globalAlpha=1;
  x.font=F(900,78); x.fillText(w.title||walkTitle(w.time),70,H-470,W-140);
  const d=walkDist(w), s=walkDur(w), st=d?[['Distanz',fmtKm(d)],['Zeit',fmtDur(s)],['Tempo',fmtPace(s,d)+' /km']]:[['Zeit',fmtDur(s)]];
  st.forEach(([l,v],i)=>{const sx=70+i*320; x.font=F(600,32); x.globalAlpha=.8; x.fillText(l,sx,H-370); x.globalAlpha=1; x.font=F(900,64); x.fillText(v,sx,H-300,300)});
  const cm=CALM.find(c=>c.v===w.calm); if(cm){ x.font=F(700,36); x.fillText(`${cm.e} ${cm.l}`,70,H-210) }
  x.font=F(700,30); x.globalAlpha=.7; x.fillText('Ellie-App',70,H-120); x.globalAlpha=1;
  const blob=await new Promise(ok=>c.toBlob(ok,'image/jpeg',.9));
  if(!blob){toast('Bild konnte nicht erstellt werden');return}
  const file=new File([blob],`gassi-${w.day}.jpg`,{type:'image/jpeg'});
  try{ if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:w.title||'Gassi-Runde'}); return } }catch(e){ if(e.name==='AbortError') return }
  const u=URL.createObjectURL(blob); viewPhoto(u); toast('Bild lange drücken zum Sichern');
}

/* ---------- Karten in Listen ---------- */
function walkCard(w,compact){
  const d=walkDist(w), s=walkDur(w), c=CALM.find(x=>x.v===w.calm), ph=(w.photos||[]).map(photoUrl).filter(Boolean);
  const hasMap=(w.route||[]).length>1, k=(w.kudos||[]).length;
  return `<button class="gcard" data-a="gDetail" data-id="${w.id}">
    <div class="gc-head"><span class="ga-av sm" style="background:${avatarCol(w.author)}">${esc((w.author||'?')[0])}</span><div class="grow"><b>${esc(w.title||walkTitle(w.time))}</b><small>${esc(w.author||'')} · ${whenTxt(w)}${w.place?' · '+esc(w.place):''}</small></div>${k?`<span class="gc-k">🐾 ${k}</span>`:''}</div>
    <div class="gc-stats">${d?`<div><small>Distanz</small><b>${fmtKm(d)}</b></div>`:''}<div><small>Zeit</small><b>${s?fmtDurShort(s):'–'}</b></div>${d?`<div><small>Tempo</small><b>${fmtPace(s,d)}<small> /km</small></b></div>`:''}${c?`<div><small>Entspannt</small><b>${c.e}</b></div>`:''}</div>
    ${!compact&&(hasMap||ph.length)?`<div class="gc-media ${hasMap&&ph.length?'two':''}">${hasMap?`<div class="gc-map" data-smap="${w.id}"></div>`:''}${ph.slice(0,hasMap?1:2).map(u=>`<img src="${esc(u)}" alt="">`).join('')}${ph.length>(hasMap?1:2)?`<span class="gc-more">+${ph.length-(hasMap?1:2)}</span>`:''}</div>`:''}
    ${w.note&&!compact?`<div class="gc-note">${esc(w.note)}</div>`:''}
  </button>`;
}
// Statische Karten nach dem Rendern in passender Größe einsetzen
function fillMaps(root){
  (root||document).querySelectorAll('[data-smap]').forEach(el=>{ if(el.dataset.done) return; const w=S.walks.find(x=>x.id===el.dataset.smap); if(!w) return;
    const W=Math.round(el.clientWidth), H=Math.round(el.clientHeight); if(!W||!H) return; el.innerHTML=staticMap(w,W,H); el.dataset.done=1 });
}
new MutationObserver(()=>{ requestAnimationFrame(()=>fillMaps()) }).observe(document.documentElement,{childList:true,subtree:true});

function weekStats(){
  const t=today(), wd0=(new Date(t+'T12:00:00').getDay()+6)%7, mon=addDays(t,-wd0);
  const ws=S.walks.filter(w=>w.day>=mon&&w.day<=t);
  return {n:ws.length,m:ws.reduce((a,w)=>a+walkDist(w),0),s:ws.reduce((a,w)=>a+walkDur(w),0),mon};
}
function gassiStartCard(){
  const st=weekStats(), last=[...S.walks].sort((a,b)=>(b.day+(b.time||'')).localeCompare(a.day+(a.time||'')))[0];
  return `<div class="card gstart">
    <div class="row"><b class="grow">🐾 Gassi</b>${S.walks.length?'<button class="btn plain small" data-a="gFeed">Alle Runden ›</button>':''}</div>
    <div class="gweek"><div><b>${st.n}</b><small>Runden</small></div><div><b>${fmtKm(st.m,false)}</b><small>km</small></div><div><b>${fmtDurShort(st.s)}</b><small>diese Woche</small></div></div>
    <button class="btn hotbtn block" data-a="gStart">${TRK?(TRK.paused?'⏸ Runde fortsetzen':'● Runde läuft – öffnen'):'▶ Gassi tracken'}</button>
    ${last?`<div class="gstart-last">${walkCard(last,false)}</div>`:''}
  </div>`;
}
function gassiFeed(){
  closeSheet(true); document.getElementById('gf')?.remove();
  const ws=[...S.walks].sort((a,b)=>(b.day+(b.time||'')).localeCompare(a.day+(a.time||'')));
  const st=weekStats(), all=S.walks.reduce((a,w)=>a+walkDist(w),0);
  const ov=document.createElement('div'); ov.id='gf'; ov.className='gfull ga';
  const groups={}; ws.forEach(w=>{const k=w.day.slice(0,7);(groups[k]=groups[k]||[]).push(w)});
  ov.innerHTML=`<div class="ga-bar"><button class="gt-ib" data-g="back" aria-label="Zurück">‹</button><b>Gassi-Runden</b><button class="gt-ib" data-g="new" aria-label="Neu">＋</button></div>
    <div class="ga-scroll">
      <div class="gweek big"><div><b>${st.n}</b><small>Runden</small></div><div><b>${fmtKm(st.m,false)}</b><small>km</small></div><div><b>${fmtDurShort(st.s)}</b><small>diese Woche</small></div></div>
      ${all?`<div class="muted small" style="text-align:center;margin:-4px 0 12px">Insgesamt ${fmtKm(all)} mit ${esc(DOG)} getrackt 🐾</div>`:''}
      ${Object.entries(groups).map(([k,arr])=>`<h2>${new Date(k+'-15T12:00:00').toLocaleDateString('de-DE',{month:'long',year:'numeric'})}</h2>${arr.map(w=>walkCard(w,false)).join('')}`).join('')||'<div class="empty">Noch keine Runden – los geht\'s! 🐕</div>'}
    </div>`;
  document.body.append(ov); document.body.classList.add('noscroll');
  ov.addEventListener('click',e=>{const b=e.target.closest('[data-g]'); if(!b) return;
    if(b.dataset.g==='back'){ov.remove();document.body.classList.remove('noscroll')} else if(b.dataset.g==='new'){ov.remove();document.body.classList.remove('noscroll');gassiStart()} });
}
const GASSI_ACT={
  gStart(){gassiStart()},
  gFeed(){gassiFeed()},
  gDetail(d){gassiDetail(d.id)},
  async gKudo(d){ const w=S.walks.find(x=>x.id===d.id); if(!w||w.author===me.name) return;
    const k=new Set(w.kudos||[]); if(k.has(me.name)) k.delete(me.name); else {k.add(me.name);toast('🐾 Pfötchen gegeben!')}
    await walkSaveRow(w.id,{kudos:[...k]}); const b=document.querySelector(`.ga-kudo[data-id="${w.id}"]`); if(b) b.outerHTML=kudosHTML(S.walks.find(x=>x.id===d.id)) },
};
