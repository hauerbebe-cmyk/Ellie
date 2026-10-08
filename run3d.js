/* =====================================================================
   Ellie Run 3D – Endless Runner durch Köln (three.js r128)
   Simulation: fester Takt (60/s) + Seed  → Geist-Rennen per Replay
   ===================================================================== */
(function(){
'use strict';
const T=window.THREE;
const SEG=12, LANE=2.2, DT=1/60, VIS=12, ZONELEN=480, SIMV=2;
const ZONES=[
  {k:'loev',   name:'Köln-Lövenich',      sub:'Willkumme!',            sky:0x9fd0f2, fog:0xcfe6f7, ground:0x86c25e, road:0x55545d},
  {k:'wald',   name:'Stadtwald',          sub:'Jet frische Luff!',     sky:0x9fd6bf, fog:0xcde9dc, ground:0x4f9a45, road:0xa4815a},
  {k:'bruecke',name:'Hohenzollernbrücke', sub:'Üvver d\'r Rhing',      sky:0xa7c4ec, fog:0xd3e0f3, ground:0x3f7cbc, road:0x5c5a63},
  {k:'dom',    name:'Domplatte',          sub:'Dä Dom en Kölle!',      sky:0xb9c3e3, fog:0xdbe0ef, ground:0xb7b0a4, road:0x9a948b},
];
const SLOTS=[['head','Kopf'],['neck','Hals'],['body','Körper'],['eyes','Augen'],['fx','Spur']];
const ITEMS=[
  {k:'party',   s:'head',n:'Partyhut',         p:100,e:'🥳'},
  {k:'fcmuetze',s:'head',n:'FC-Mütze',         p:150,e:'🧢'},
  {k:'helm',    s:'head',n:'Baustellenhelm',   p:180,e:'⛑️',d:'Für die Kölner Dauerbaustellen'},
  {k:'narren',  s:'head',n:'Narrenkappe',      p:300,e:'🃏',d:'Kölle Alaaf!'},
  {k:'stange',  s:'head',n:'Kölsch-Stange',    p:350,e:'🍺',d:'Noch e Kölsch?'},
  {k:'hoerner', s:'head',n:'Geißbock-Hörner',  p:400,e:'🐐',d:'Wie Hennes'},
  {k:'crown',   s:'head',n:'Krone',            p:500,e:'👑'},
  {k:'halo',    s:'head',n:'Heiligenschein',   p:900,e:'😇',d:'Für ganz brave Hunde'},
  {k:'scarf',   s:'neck',n:'Halstuch',         p:50, e:'🧣'},
  {k:'glocke',  s:'neck',n:'Glöckchen',        p:90, e:'🔔'},
  {k:'fliege',  s:'neck',n:'Fliege',           p:120,e:'🎀'},
  {k:'blumen',  s:'neck',n:'Strüßjer-Kette',   p:180,e:'🌼',d:'Karnevalsblümchen'},
  {k:'orden',   s:'neck',n:'Karnevalsorden',   p:280,e:'🎖️'},
  {k:'pulli',   s:'body',n:'Flieder-Pulli',    p:120,e:'🧶'},
  {k:'rain',    s:'body',n:'Regenmantel',      p:150,e:'🧥'},
  {k:'fc',      s:'body',n:'FC-Trikot',        p:250,e:'⚽'},
  {k:'koebes',  s:'body',n:'Köbes-Schürze',    p:300,e:'👔',d:'Wie im Brauhaus'},
  {k:'cape',    s:'body',n:'Superhelden-Cape', p:450,e:'🦸'},
  {k:'funken',  s:'body',n:'Funken-Uniform',   p:650,e:'💂',d:'Rot-weiß wie die Roten Funken'},
  {k:'shades',  s:'eyes',n:'Sonnenbrille',     p:200,e:'🕶️'},
  {k:'herz',    s:'eyes',n:'Herzbrille',       p:240,e:'😍'},
  {k:'monokel', s:'eyes',n:'Monokel',          p:350,e:'🧐'},
  {k:'konfetti',s:'fx',  n:'Konfetti-Spur',    p:400,e:'🎊'},
  {k:'herzen',  s:'fx',  n:'Herzchen-Spur',    p:450,e:'💜'},
  {k:'sterne',  s:'fx',  n:'Sternen-Spur',     p:550,e:'✨'},
  {k:'kamelle', s:'fx',  n:'Kamelle-Spur',     p:650,e:'🍬'},
  {k:'regenbogen',s:'fx',n:'Regenbogen-Spur',  p:800,e:'🌈'},
];
// Alle 86 Kölner Stadtteile (Veedel) nach Stadtbezirk – Reihenfolge der Schilder startet in Lövenich
const VEEDEL=[
  ['Lindenthal',['Lövenich','Weiden','Junkersdorf','Müngersdorf','Braunsfeld','Lindenthal','Sülz','Klettenberg','Widdersdorf']],
  ['Ehrenfeld',['Ehrenfeld','Neuehrenfeld','Bickendorf','Vogelsang','Ossendorf','Bocklemünd/Mengenich']],
  ['Innenstadt',['Neustadt-Nord','Altstadt-Nord','Altstadt-Süd','Neustadt-Süd','Deutz']],
  ['Nippes',['Nippes','Riehl','Niehl','Longerich','Mauenheim','Weidenpesch','Bilderstöckchen']],
  ['Chorweiler',['Chorweiler','Fühlingen','Worringen','Pesch','Esch/Auweiler','Heimersdorf','Lindweiler','Blumenberg','Merkenich','Seeberg','Volkhoven/Weiler','Roggendorf/Thenhoven']],
  ['Mülheim',['Mülheim','Dellbrück','Stammheim','Buchheim','Buchforst','Holweide','Dünnwald','Höhenhaus','Flittard']],
  ['Kalk',['Kalk','Brück','Rath/Heumar','Merheim','Neubrück','Höhenberg','Ostheim','Vingst','Humboldt/Gremberg']],
  ['Porz',['Porz','Poll','Eil','Lind','Wahn','Wahnheide','Zündorf','Grengel','Westhoven','Elsdorf','Ensen','Gremberghoven','Libur','Urbach','Finkenberg','Langel']],
  ['Rodenkirchen',['Rodenkirchen','Marienburg','Godorf','Sürth','Zollstock','Raderthal','Weiß','Raderberg','Meschenich','Rondorf','Immendorf','Bayenthal','Hahnwald']],
];
const VLIST=[]; VEEDEL.forEach(([b,arr])=>arr.forEach(n=>VLIST.push({n,b})));
const SIGN0=40, SIGNGAP=90;
const MISSIONS=[
  {id:'d800',  t:'Lauf 800 m in einer Runde',            chk:s=>s.d>=800},
  {id:'d1500', t:'Lauf 1.500 m in einer Runde',          chk:s=>s.d>=1500},
  {id:'t50',   t:'Sammle 50 Leckerli in einer Runde',    chk:s=>s.treats>=50},
  {id:'t100',  t:'Sammle 100 Leckerli in einer Runde',   chk:s=>s.treats>=100},
  {id:'bruecke',t:'Erreiche die Hohenzollernbrücke',     chk:s=>s.d>=ZONELEN*2},
  {id:'dom',   t:'Erreiche die Domplatte',               chk:s=>s.d>=ZONELEN*3},
  {id:'pw2',   t:'Sammle 2 Power-ups in einer Runde',    chk:s=>s.pows>=2},
  {id:'heart3',t:'Sammle 3 💜 in einer Runde',           chk:s=>s.hearts>=3},
  {id:'calm',  t:'Lauf 600 m mit Angst unter 50',        chk:s=>s.calm600},
  {id:'v3',    t:'Entdecke heute 3 neue Veedel',         cum:'newV',n:3},
  {id:'runs3', t:'Spiel heute 3 Runden',                 cum:'runs',n:3},
];
const MIS_REWARD=75;
const KOELSCH={hit:['Oh nää! 😣','Autsch! 😣','Wat soll dä Quatsch? 😣','Leck mich en de Täsch! 😣'],
  heart:['Hätzlich! 💜','Kuschelpause! 💜','Wie schön! 💜'],
  over:['Et hätt noch immer jot jejange – nächste Runde!','Et kütt wie et kütt.','Nit jeck maache – nochmol!']};
const pickR=a=>a[Math.floor(Math.random()*a.length)];
const KARNEVAL=(()=>{const t=today();return t.slice(5)==='11-11'||(t>='2027-02-04'&&t<='2027-02-09')})();
const TREAT_E=KARNEVAL?'🍬':'🦴';
const POW={magnet:{e:'🧲',n:'Magnet',t:8},turbo:{e:'⚡',n:'Zoomies',t:5},snout:{e:'👃',n:'Schnüffelnase',t:10}};
const LEN={bin:.8,log:.9,scooter:.9,barrier:.5,branch:.5,baustelle:.5,jogger:.6,bike:1.6,koebes:.6,tram:10};
const JUMPABLE={bin:1,log:1,scooter:1}, DUCKABLE={barrier:1,branch:1,baustelle:1};
const WHY={quit:['Aufgegeben 🏳️','Ellie wartet auf die nächste Runde.'],angst:['Zu viel Angst 😰','Ellie will nach Hause zum Kuscheln.'],tram:['Von der KVB erwischt 🚋','Die KVB kütt – nur nit pünktlich!']};

/* ---------- Zufall mit Seed ---------- */
function hashStr(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle(arr,r){for(let i=arr.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}

/* ---------- Welt (deterministisch) ---------- */
function World(seed,thunder){this.seed=seed;this.h=hashStr(seed);this.cache=new Map();this.thunder=!!thunder}
World.prototype.zoneIdx=function(i){return Math.floor(i*SEG/ZONELEN)%ZONES.length};
World.prototype.seg=function(i){let s=this.cache.get(i);if(!s){s=genSeg(this,i);this.cache.set(i,s)}return s};
World.prototype.trim=function(min){for(const k of this.cache.keys()) if(k<min) this.cache.delete(k)};
const WEIGHTS={
  loev:[['bin',.22],['scooter',.14],['barrier',.14],['baustelle',.1],['jogger',.22],['bike',.18]],
  wald:[['log',.4],['branch',.3],['jogger',.3]],
  bruecke:[['tram',.3],['bike',.3],['barrier',.2],['jogger',.2]],
  dom:[['barrier',.12],['baustelle',.12],['bin',.12],['scooter',.12],['koebes',.22],['tram',.3]],
};
const MOVE={jogger:.25,bike:.6,koebes:.2,tram:1.1};
function genSeg(W,i){
  const r=mulberry((W.h^Math.imul(i+1,0x9E3779B1))>>>0), z0=i*SEG, zi=W.zoneIdx(i), zk=ZONES[zi].k, items=[];
  let k=0; const add=o=>{o.id=i+'-'+(k++);items.push(o);return o};
  if(i<5){ if(i>1) for(let j=0;j<4;j++) add({t:'treat',lane:1,z:z0+2+j*2.6,y:.6}); return {i,zi,items}; }
  const diff=Math.min(1,i/160), mid=z0+6;
  const lanes=shuffle([0,1,2],r);
  let free=[0,1,2];
  if(r()<.16-.06*diff){
    const ln=lanes[0]; for(let j=0;j<5;j++) add({t:'treat',lane:ln,z:z0+1+j*2.2,y:.6});
  } else {
    const w=WEIGHTS[zk]; const pick=()=>{let x=r(),a=0;for(const [t,p] of w){a+=p;if(x<a)return t}return w[0][0]};
    const nb=r()<.3+.35*diff?2:1; let tram=false;
    for(let j=0;j<nb;j++){
      let t=pick(); if(t==='tram'){ if(tram) t='barrier'; tram=true }
      const ln=lanes[j], o={t,lane:ln,z:mid};
      if(MOVE[t]){ o.m=MOVE[t]; o.z=mid+70*o.m/(1+o.m) }
      add(o);
      if(JUMPABLE[t]&&r()<.55){ for(let q=-2;q<=2;q++) add({t:'treat',lane:ln,z:mid+q*1.3,y:.6+1.1*(1-(q*q)/5)}) }
    }
    free=lanes.slice(nb);
    const fl=free[Math.floor(r()*free.length)];
    if(r()<.6) for(let j=0;j<4;j++) add({t:'treat',lane:fl,z:z0+1.5+j*2.4,y:.6});
  }
  const fl2=free[Math.floor(r()*free.length)];
  const x=r();
  if(x<.07) add({t:'power',k:['magnet','turbo','snout'][Math.floor(r()*3)],lane:fl2,z:z0+10.5,y:.8});
  else if(x<.13) add({t:'heart',lane:fl2,z:z0+10.5,y:.8});
  if((zk==='loev'||zk==='dom')&&r()<.12) add({t:'pigeons',lane:free[0],z:z0+3});
  if(r()<.07) add({t:'honk',lane:-1,z:z0+r()*SEG});
  if(zk==='dom'&&r()<.05) add({t:'knall',lane:-1,z:z0+r()*SEG});
  if(r()<.05) add({t:'thunder',lane:-1,z:z0+r()*SEG});
  return {i,zi,items};
}

/* ---------- Läufer (Spieler oder Geist) ---------- */
function Runner(W,inputs){Object.assign(this,{W,inputs:inputs||[],ii:0,tick:0,d:0,lane:1,x:0,y:0,vy:0,duck:0,alive:true,anx:0,treats:0,
  pw:{magnet:0,turbo:0,snout:0},stum:0,inv:0,done:new Set(),why:'',events:[]})}
Runner.prototype.input=function(a){
  if(!this.alive) return;
  if(a==='L') this.lane=Math.max(0,this.lane-1);
  else if(a==='R') this.lane=Math.min(2,this.lane+1);
  else if(a==='U'){ if(this.y<=.001){this.vy=9.2;this.duck=0;this.ev('jump')} }
  else if(a==='D'){ if(this.y>.05) this.vy=-16; this.duck=42; this.ev('duck') }
};
Runner.prototype.speed=function(){let v=Math.min(23,10+this.d*.0095);if(this.pw.turbo>0)v*=1.45;if(this.stum>0)v*=.6;return v};
Runner.prototype.itemZ=function(it){return it.m?it.z-it.m*Math.max(0,this.d-(it.z-70)):it.z};
Runner.prototype.score=function(){return Math.floor(this.d+this.treats*5)};
Runner.prototype.ev=function(t,k){this.events.push([t,k])};
Runner.prototype.scare=function(n,k){if(this.pw.turbo>0)n*=.5;this.anx+=n;this.ev('scare',k)};
Runner.prototype.step=function(){
  if(!this.alive) return;
  while(this.ii<this.inputs.length&&this.inputs[this.ii][0]<=this.tick){this.input(this.inputs[this.ii][1]);this.ii++}
  const tx=(this.lane-1)*LANE, dx=tx-this.x, mv=15*DT; this.x=Math.abs(dx)<=mv?tx:this.x+Math.sign(dx)*mv;
  if(this.y>0||this.vy>0){this.vy-=27*DT;this.y+=this.vy*DT;if(this.y<=0){this.y=0;this.vy=0}}
  if(this.duck>0) this.duck--;
  for(const k in this.pw) if(this.pw[k]>0) this.pw[k]--;
  if(this.stum>0) this.stum--; if(this.inv>0) this.inv--;
  this.d+=this.speed()*DT;
  this.anx=Math.max(0,this.anx-1.1*DT);
  this.collide();
  if(this.alive&&this.anx>=100){this.alive=false;this.why='angst';this.ev('over')}
  this.tick++;
};
Runner.prototype.collide=function(){
  const W=this.W, si=Math.floor(this.d/SEG), lf=this.x/LANE+1;
  for(let s=Math.max(0,si-1);s<=si+9;s++){
    for(const it of W.seg(s).items){
      if(this.done.has(it.id)) continue;
      const dz=this.itemZ(it)-this.d;
      if(it.lane<0){ if(dz<=0){ this.done.add(it.id); if(it.t==='honk') this.scare(12,'honk'); else if(it.t==='knall') this.scare(18,'knall'); else if(W.thunder) this.scare(15,'thunder') } continue }
      if(dz<-3||dz>4) continue;
      const laneHit=Math.abs(lf-it.lane)<.62;
      if(it.t==='treat'||it.t==='heart'||it.t==='power'){
        const mag=this.pw.magnet>0&&it.t==='treat';
        const got=mag?(Math.abs(dz)<2.5&&Math.abs(lf-it.lane)<2.6):(laneHit&&Math.abs(dz)<.9&&Math.abs(this.y+.5-(it.y||.6))<1.3);
        if(got){ this.done.add(it.id);
          if(it.t==='treat'){this.treats+=this.pw.snout>0?2:1;this.ev('treat')}
          else if(it.t==='heart'){this.anx=Math.max(0,this.anx-30);this.ev('heart')}
          else {this.pw[it.k]=POW[it.k].t*60;this.ev('power',it.k)} }
        continue;
      }
      if(it.t==='pigeons'){ if(laneHit&&Math.abs(dz)<1){this.done.add(it.id);this.scare(8,'pigeons')} continue }
      if(!laneHit||Math.abs(dz)>LEN[it.t]/2+.35) continue;
      if(JUMPABLE[it.t]&&this.y>.75) continue;
      if(DUCKABLE[it.t]&&this.duck>0) continue;
      this.done.add(it.id);
      if(this.pw.turbo>0||this.inv>0){this.ev('smash',it.t);continue}
      if(it.t==='tram'){this.alive=false;this.why='tram';this.ev('crash');return}
      this.anx+=34;this.stum=48;this.inv=60;this.ev('hit',it.t);
    }
  }
};

/* ---------- three.js Bausteine ---------- */
let G=null;           // Geometrien
const MAT={};
function mat(c,opt){const key=c+'|'+(opt?JSON.stringify(opt):'');return MAT[key]||(MAT[key]=new T.MeshLambertMaterial(Object.assign({color:c},opt||{})))}
function geos(){ if(G) return G; G={box:new T.BoxGeometry(1,1,1),sph:new T.SphereGeometry(1,14,10),sphL:new T.SphereGeometry(1,8,6),cyl:new T.CylinderGeometry(1,1,1,12),
  cone:new T.ConeGeometry(1,1,10),cone4:new T.ConeGeometry(1,1,4),torus:new T.TorusGeometry(1,.12,8,20),arch:new T.TorusGeometry(1,.02,6,28,Math.PI),wheel:new T.TorusGeometry(.34,.05,6,16)}; return G }
function part(geo,c,sx,sy,sz,x,y,z,par,m){const o=new T.Mesh(geo,m||mat(c));o.scale.set(sx,sy,sz);o.position.set(x,y,z);par.add(o);return o}
const texCache={};
function emojiTex(e,size){const key=e+size;if(texCache[key])return texCache[key];const c=document.createElement('canvas');c.width=c.height=size||128;const x=c.getContext('2d');
  x.font=`${(size||128)*.8}px "Apple Color Emoji","Noto Color Emoji",system-ui`;x.textAlign='center';x.textBaseline='middle';x.fillText(e,c.width/2,c.height/2+c.height*.05);
  return texCache[key]=new T.CanvasTexture(c)}
function labelTex(text,col){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.fillStyle='rgba(30,20,45,.75)';
  x.beginPath();x.roundRect?x.roundRect(8,8,240,48,24):x.rect(8,8,240,48);x.fill();x.fillStyle=col||'#fff';x.font='bold 30px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(text,128,33);return new T.CanvasTexture(c)}
function stripeTex(a,b,n){const c=document.createElement('canvas');c.width=128;c.height=16;const x=c.getContext('2d');for(let i=0;i<n;i++){x.fillStyle=i%2?b:a;x.fillRect(i*128/n,0,128/n,16)}return new T.CanvasTexture(c)}
function boardTex(text,bg,fg,sub,w,h){const key='b|'+text+bg+fg+(sub||'')+(w||'');if(texCache[key])return texCache[key];const c=document.createElement('canvas');c.width=w||512;c.height=h||(sub?220:150);const x=c.getContext('2d');
  x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);x.strokeStyle=fg;x.lineWidth=10;x.strokeRect(10,10,c.width-20,c.height-20);x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';
  let fs=sub?82:90;x.font=`900 ${fs}px system-ui,sans-serif`;while(x.measureText(text).width>c.width-60&&fs>30){fs-=4;x.font=`900 ${fs}px system-ui,sans-serif`}
  x.fillText(text,c.width/2,sub?c.height*.4:c.height/2+4);if(sub){x.font='700 36px system-ui,sans-serif';x.fillText(sub,c.width/2,c.height*.78)}
  const t=new T.CanvasTexture(c);t.anisotropy=4;return texCache[key]=t}
function board(text,bg,fg,w,h,x,y,z,par,sub,ry){const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:boardTex(text,bg,fg,sub),side:T.DoubleSide}));m.position.set(x,y,z);if(ry)m.rotation.y=ry;par.add(m);return m}
function sprite(e,s,par,y){const m=new T.Sprite(new T.SpriteMaterial({map:emojiTex(e),transparent:true,depthWrite:false}));m.scale.set(s,s,s);m.position.y=y||0;par.add(m);return m}

/* ---------- Ellie in 3D ---------- */
function buildEllie(ghost,outfit){
  const g=geos(), root=new T.Group(), body=new T.Group(); root.add(body);
  const gm=ghost?new T.MeshBasicMaterial({color:0xb192ec,transparent:true,opacity:.42,depthWrite:false}):null;
  const P=(geo,c,sx,sy,sz,x,y,z,par)=>part(geo,c,sx,sy,sz,x,y,z,par||body,gm);
  const GREY=0xb4b6be, DARK=0x2e2d33, WHITE=0xf3f0ea, MERLE=0x868892;
  P(g.sph,GREY,.42,.4,.62,0,.8,0);
  P(g.sph,WHITE,.3,.32,.3,0,.74,-.42);
  if(!ghost){ [[.25,.98,.1],[-.22,.92,.25],[.12,1.05,-.2],[-.3,.82,-.1],[.3,.8,.32]].forEach(p=>P(g.sphL,MERLE,.13,.1,.15,p[0],p[1],p[2])); P(g.sph,DARK,.2,.14,.22,-.05,1.0,.32) }
  const head=new T.Group(); head.position.set(0,1.2,-.6); body.add(head);
  P(g.sph,GREY,.34,.32,.34,0,0,0,head);
  P(g.sph,0xd3d4d9,.2,.12,.2,0,.27,.02,head);
  P(g.sph,0xdcdde1,.07,.15,.05,0,.1,-.29,head);
  P(g.sph,WHITE,.21,.17,.25,0,-.09,-.25,head);
  P(g.sph,0xd8c4ab,.07,.06,.06,.13,-.14,-.33,head); P(g.sph,0xd8c4ab,.07,.06,.06,-.13,-.14,-.33,head);
  P(g.sph,0x18181c,.085,.065,.065,0,-.02,-.48,head);
  for(const s of [-1,1]){
    P(g.sph,DARK,.14,.13,.07,s*.15,.06,-.25,head);
    P(g.sph,0x1d1410,.05,.05,.03,s*.14,.07,-.31,head);
    if(!ghost) P(g.sph,0xffffff,.016,.016,.01,s*.13-.015,.09,-.34,head);
  }
  const tongue=P(g.sph,0xec7a98,.06,.025,.09,0,-.2,-.36,head);
  const ears=[];
  for(const s of [-1,1]){const e=new T.Group();e.position.set(s*.3,.06,-.02);head.add(e);P(g.sph,DARK,.12,.27,.1,0,-.17,0,e);e.rotation.z=s*.22;ears.push(e)}
  const tail=new T.Group(); tail.position.set(0,.98,.55); body.add(tail); P(g.sph,GREY,.11,.11,.3,0,.12,.2,tail); tail.rotation.x=-.7;
  const legs=[];
  for(const [x,z] of [[.2,-.36],[-.2,-.36],[.2,.38],[-.2,.38]]){const l=new T.Group();l.position.set(x,.62,z);body.add(l);P(g.cyl,0xe4e2de,.09,.5,.09,0,-.25,0,l);P(g.sph,WHITE,.1,.06,.12,0,-.5,-.03,l);legs.push(l)}
  const fit=new T.Group(); body.add(fit); const hfit=new T.Group(); head.add(hfit);
  const ell={root,body,head,ears,tail,legs,tongue,fit,hfit,phase:0};
  if(!ghost) setOutfit(ell,outfit||{});
  return ell;
}
let CAPEG=null;
function setOutfit(ell,eq){
  const g=geos(), f=ell.fit, hf=ell.hfit; for(const grp of [f,hf]) while(grp.children.length) grp.remove(grp.children[0]);
  const P=(geo,c,sx,sy,sz,x,y,z,par,m)=>part(geo,c,sx,sy,sz,x,y,z,par,m), RED=0xd7263d, GOLD=0xf2c230, WH=0xffffff, HOT=0xe4501f;
  const collar=c=>{const t=P(g.torus,c,.3,.3,.3,0,1.0,-.47,f);t.rotation.x=1.25;return t};
  const coat=c=>P(g.sph,c,.45,.43,.6,0,.84,.03,f);
  switch(eq.head){
    case 'party': { const c=P(g.cone,HOT,.14,.34,.14,.05,.48,0,hf); c.rotation.z=-.2; P(g.sph,WH,.06,.06,.06,.1,.66,0,hf); P(g.sph,0xf6d33c,.03,.03,.03,.02,.45,-.12,hf); break }
    case 'fcmuetze': P(g.sph,RED,.35,.24,.35,0,.17,0,hf); P(g.cyl,WH,.355,.07,.355,0,.12,0,hf); P(g.sph,WH,.09,.09,.09,0,.43,0,hf); break;
    case 'helm': P(g.sph,0xf6c90e,.37,.25,.37,0,.17,0,hf); P(g.cyl,0xf6c90e,.43,.03,.43,0,.13,-.03,hf); P(g.box,0xe0b000,.06,.2,.5,0,.3,0,hf); break;
    case 'narren': for(const sd of [-1,1]){ const c=P(g.cone,sd<0?RED:WH,.13,.42,.13,sd*.2,.42,0,hf); c.rotation.z=-sd*.9; P(g.sph,GOLD,.06,.06,.06,sd*.45,.55,0,hf) }
      P(g.cyl,RED,.33,.08,.33,0,.2,0,hf); P(g.sph,GOLD,.05,.05,.05,0,.2,-.33,hf); break;
    case 'stange': P(g.cyl,0xf3c94a,.07,.32,.07,0,.48,0,hf,new T.MeshLambertMaterial({color:0xf3c94a,transparent:true,opacity:.9})); P(g.cyl,WH,.072,.07,.072,0,.67,0,hf); P(g.cyl,0x8a6a3a,.16,.04,.16,0,.31,0,hf); break;
    case 'hoerner': for(const sd of [-1,1]){ const c=P(g.cone,0xe9dcc0,.06,.32,.06,sd*.2,.38,.02,hf); c.rotation.z=-sd*.75; c.rotation.x=.3; const t=P(g.cone,0xd9c9a6,.04,.16,.04,sd*.36,.5,.1,hf); t.rotation.z=-sd*1.6 } break;
    case 'crown': P(g.cyl,GOLD,.16,.07,.16,0,.3,0,hf); for(let i=0;i<5;i++){const a=i/5*Math.PI*2;P(g.cone,GOLD,.04,.1,.04,Math.cos(a)*.13,.38,Math.sin(a)*.13,hf)} P(g.sph,RED,.03,.03,.03,0,.3,-.16,hf); break;
    case 'halo': { const t=P(g.torus,0xffe066,.2,.2,.2,0,.46,0,hf,new T.MeshBasicMaterial({color:0xffe066})); t.rotation.x=Math.PI/2; t.userData.spin=1; break }
  }
  switch(eq.neck){
    case 'scarf': collar(RED); P(g.box,RED,.14,.3,.05,.12,.82,-.6,f).rotation.z=.3; break;
    case 'glocke': collar(RED); P(g.sph,GOLD,.08,.09,.08,0,.82,-.68,f); P(g.sph,0x8a6a1a,.03,.03,.03,0,.74,-.7,f); break;
    case 'fliege': collar(0x6a43ad); for(const sd of [-1,1]){ const c=P(g.cone4,0x8459c4,.09,.16,.05,sd*.09,.88,-.69,f); c.rotation.z=sd*Math.PI/2 } P(g.sph,0x6a43ad,.04,.04,.04,0,.88,-.7,f); break;
    case 'blumen': for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; P(g.sphL,[RED,0xffbe0b,WH,0x3a86ff,0xff006e][i%5],.065,.065,.065,Math.cos(a)*.3,1.0+Math.sin(a)*.09,-.47+Math.sin(a)*.27,f) } break;
    case 'orden': collar(RED); P(g.box,WH,.08,.16,.02,0,.82,-.69,f); P(g.cyl,GOLD,.09,.02,.09,0,.7,-.7,f).rotation.x=Math.PI/2; P(g.sph,RED,.035,.035,.02,0,.7,-.72,f); break;
  }
  switch(eq.body){
    case 'pulli': coat(0xb192ec); P(g.cyl,0x8459c4,.455,.06,.455,0,.84,.03,f).rotation.x=Math.PI/2; break;
    case 'rain': coat(0xf2c418); P(g.sph,0xf2c418,.36,.2,.36,0,.15,.04,hf); break;
    case 'fc': coat(0xe3001b); P(g.cyl,WH,.44,.07,.44,0,.86,.02,f).rotation.x=Math.PI/2; break;
    case 'koebes': coat(0x1f3f8a); collar(WH); P(g.cyl,0x2a4fa8,.47,.05,.47,0,.84,.03,f).rotation.x=Math.PI/2; break;
    case 'cape': { const c=new T.Mesh(CAPEG||(CAPEG=new T.SphereGeometry(1,18,10,0,Math.PI*2,0,Math.PI*.42)),new T.MeshLambertMaterial({color:RED,side:T.DoubleSide})); c.scale.set(.5,.5,.68); c.position.set(0,.86,.08); f.add(c); collar(GOLD); break }
    case 'funken': coat(RED); for(const sd of [-1,1]){ const b=P(g.box,WH,.07,.03,1.0,0,1.2,0,f); b.rotation.y=sd*.5 } collar(WH); P(g.box,GOLD,.5,.06,.06,0,.84,-.52,f); break;
  }
  switch(eq.eyes){
    case 'shades': for(const sd of [-1,1]) P(g.box,0x111111,.14,.08,.03,sd*.14,.07,-.34,hf); P(g.box,0x111111,.1,.02,.02,0,.08,-.35,hf); break;
    case 'herz': for(const sd of [-1,1]){ const b=P(g.box,0xff3d8b,.11,.11,.03,sd*.14,.07,-.34,hf); b.rotation.z=Math.PI/4 } P(g.box,0xff3d8b,.08,.02,.02,0,.09,-.35,hf); break;
    case 'monokel': { const m=P(g.torus,GOLD,.08,.08,.08,.15,.07,-.33,hf); P(g.box,GOLD,.01,.18,.01,.21,-.04,-.33,hf); break }
  }
}
function animEllie(ell,st,speed,dt,idle){
  ell.phase+=dt*(idle?3:speed*1.15);
  const p=ell.phase, air=st.y>.05, duck=st.duck>0;
  ell.legs.forEach((l,i)=>{ l.rotation.x=idle?0:air?(i<2?-.9:.9):Math.sin(p+(i%2?Math.PI:0)+(i<2?0:Math.PI/2))*.85 });
  ell.body.position.y=idle?Math.sin(p*.7)*.01:air?0:Math.abs(Math.sin(p))*.06;
  ell.body.scale.y=duck?.62:1; ell.body.position.y-=duck?.08:0;
  ell.ears.forEach((e,i)=>e.rotation.x=(air?-.6:0)+Math.sin(p*2+i)*(idle?.03:.18));
  ell.tail.rotation.y=Math.sin(p*(idle?4:2.5))*.6;
  ell.head.rotation.x=idle?Math.sin(p*.5)*.05:Math.sin(p*2)*.04;
  ell.tongue.visible=idle||speed>13;
}

/* ---------- Hindernisse & Szenerie ---------- */
const JOGCOL=[0x3a86ff,0xff006e,0x2ec4b6,0xffbe0b,0x8338ec];
function buildItem(it){
  const g=geos(), o=new T.Group();
  switch(it.t){
    case 'bin': part(g.cyl,0x5d6d7e,.36,.92,.36,0,.46,0,o); part(g.box,0x2b2b31,.78,.08,.78,0,.95,0,o); part(g.box,0x8d9aa6,.2,.05,.06,0,.75,-.37,o); break;
    case 'log': { const l=part(g.cyl,0x7a5230,.36,2,.36,0,.36,0,o); l.rotation.z=Math.PI/2; part(g.cyl,0xc49a6c,.3,.01,.3,1.01,.36,0,o).rotation.z=Math.PI/2; break }
    case 'barrier': { for(const s of [-1,1]) part(g.box,0xdddddd,.1,1.5,.1,s*1,.75,0,o); const b=new T.Mesh(g.box,new T.MeshLambertMaterial({map:stripeTex('#d7263d','#ffffff',8)}));b.scale.set(2.1,.24,.1);b.position.y=1.38;o.add(b); break }
    case 'branch': { const b=part(g.cyl,0x6b4a2b,.12,2.4,.12,0,1.4,0,o); b.rotation.z=Math.PI/2+.08; for(let i=0;i<5;i++) part(g.sphL,0x3f8f3a,.32,.24,.32,-1+i*.5,1.55+(i%2)*.12,0,o); break }
    case 'jogger': { const c=JOGCOL[Math.abs(hashStr(it.id))%JOGCOL.length];
      part(g.box,c,.5,.62,.3,0,1.2,0,o); part(g.sph,0xe0b48a,.17,.19,.17,0,1.68,0,o); part(g.box,0xffffff,.36,.05,.36,0,1.78,0,o);
      o.userData.legs=[part(g.box,0x2b2d42,.16,.62,.16,.12,.58,0,o),part(g.box,0x2b2d42,.16,.62,.16,-.12,.58,0,o)];
      for(const l of o.userData.legs) l.geometry=g.box; break }
    case 'bike': { for(const z of [-.55,.55]){const w=new T.Mesh(g.wheel,mat(0x1d1d22));w.rotation.y=Math.PI/2;w.position.set(0,.36,z);o.add(w)}
      part(g.box,0xd7263d,.06,.06,1.1,0,.62,0,o); part(g.box,0xd7263d,.06,.5,.06,0,.5,.25,o);
      part(g.box,0x3a86ff,.42,.55,.3,0,1.15,.15,o); part(g.sph,0xe0b48a,.15,.17,.15,0,1.6,.05,o); part(g.sph,0xffbe0b,.17,.1,.19,0,1.72,.05,o); break }
    case 'tram': { part(g.box,0xe3001b,2,1.0,10,0,.75,0,o); part(g.box,0xf4f4f4,2,1.15,10,0,1.82,0,o); part(g.box,0x2a3340,2.04,.6,9.5,0,1.9,0,o);
      part(g.box,0x9aa0a6,1.6,.15,9,0,2.48,0,o); part(g.box,0x2a3340,1.6,.55,.04,0,1.95,5.01,o);
      for(const s of [-1,1]) part(g.sph,0xfff3a0,.12,.12,.04,s*.65,.95,5.02,o,new T.MeshBasicMaterial({color:0xfff3a0})); break }
    case 'pigeons': { o.userData.birds=[]; for(let i=0;i<3;i++){const b=new T.Group();b.position.set((i-1)*.45,.12,(i%2)*.3);o.add(b);part(g.sph,0x9ea3ad,.13,.11,.17,0,0,0,b);part(g.sph,0x5f6b78,.08,.08,.08,0,.08,-.15,b);o.userData.birds.push(b)} break }
    case 'scooter': { const d=part(g.box,0x2f3238,.34,.1,1.25,0,.12,0,o); for(const z of [-.55,.55]){const w=new T.Mesh(g.wheel,mat(0x1d1d22));w.scale.set(.5,.5,.5);w.rotation.y=Math.PI/2;w.position.set(0,.17,z);o.add(w)}
      const st=part(g.box,0x3fd16b,.08,.08,1.15,.08,.42,-.95,o); st.rotation.x=1.25; part(g.box,0x2f3238,.7,.07,.07,.1,.36,-1.5,o); part(g.box,0x3fd16b,.36,.04,.9,0,.18,0,o); o.rotation.y=.25; break }
    case 'baustelle': { for(const sd of [-1,1]){ part(g.box,0xe4501f,.14,1.55,.14,sd*1,.78,0,o); part(g.box,0xffffff,.15,.12,.15,sd*1,.7,0,o); part(g.box,0x333333,.45,.08,.45,sd*1,.04,0,o) }
      const b=new T.Mesh(g.box,new T.MeshLambertMaterial({map:stripeTex('#f6c90e','#222222',10)}));b.scale.set(2.2,.26,.12);b.position.y=1.42;o.add(b);
      const sg=new T.Mesh(new T.PlaneGeometry(1.1,.36),new T.MeshBasicMaterial({map:boardTex('BAUSTELLE','#f6c90e','#1d1d1d'),transparent:true}));sg.position.set(0,1.78,.07);o.add(sg);
      o.userData.blink=part(g.sph,0xffa31a,.09,.09,.09,1,1.66,0,o,new T.MeshBasicMaterial({color:0xffa31a})); break }
    case 'koebes': { part(g.box,0xf4f4f4,.5,.42,.3,0,1.38,0,o); part(g.box,0x1f3f8a,.52,.75,.32,0,.95,0,o); part(g.sph,0xe0b48a,.17,.19,.17,0,1.8,0,o); part(g.sph,0x3b2a1e,.18,.08,.18,0,1.94,0,o);
      const tr=part(g.cyl,0x8a6a3a,.32,.05,.32,.38,1.55,-.15,o); for(let q=0;q<5;q++){const a=q/5*Math.PI*2;part(g.cyl,0xf3c94a,.05,.22,.05,.38+Math.cos(a)*.2,1.69,-.15+Math.sin(a)*.2,o);part(g.cyl,0xffffff,.052,.04,.052,.38+Math.cos(a)*.2,1.81,-.15+Math.sin(a)*.2,o)}
      o.userData.legs=[part(g.box,0x1d1d22,.16,.6,.16,.12,.3,0,o),part(g.box,0x1d1d22,.16,.6,.16,-.12,.3,0,o)]; break }
    case 'treat': sprite(TREAT_E,.75,o,it.y||.6); break;
    case 'heart': sprite('💜',.9,o,it.y||.8); break;
    case 'power': { sprite(POW[it.k].e,1.05,o,it.y||.8); const r=new T.Mesh(g.torus,new T.MeshBasicMaterial({color:0xb192ec,transparent:true,opacity:.7}));r.scale.set(.6,.6,.6);r.position.y=it.y||.8;o.add(r);o.userData.ring=r; break }
    default: return null;
  }
  return o;
}
function buildScenery(i,zi,par,night){
  const g=geos(), Z=ZONES[zi], r=mulberry(hashStr('deko'+i)), z0=-(i*SEG), zc=z0-SEG/2, w=3*LANE+.6;
  part(g.box,Z.road,w,.1,SEG+.02,0,-.05,zc,par);
  if(Z.k!=='wald') for(const x of [-LANE/2,LANE/2]) for(let q=0;q<3;q++) part(g.box,0xf2f2f2,.08,.02,1.6,x,.01,z0-1-q*4,par);
  if(Z.k==='bruecke'){
    part(g.box,Z.ground,90,.1,SEG,0,-2.2,zc,par);
    for(const s of [-1,1]){ part(g.box,0x4e5560,.12,1,SEG,s*(w/2+.1),.5,zc,par); part(g.box,0x4e5560,.5,.15,SEG,s*(w/2+.1),1,zc,par);
      for(let q=0;q<7;q++) part(g.box,[0xff006e,0xffbe0b,0x3a86ff,0x2ec4b6,0xe4501f][Math.floor(r()*5)],.08,.12,.08,s*(w/2+.18),.55+r()*.4,z0-r()*SEG,par);
      part(g.box,0x5c5a63,3,.12,SEG,s*(w/2+1.6),-.05,zc,par); }
    if(i%3===1) for(const s of [-1,1]){ for(const xo of [0,1.8]){ const a=new T.Mesh(g.arch,mat(0x6f7c86));a.scale.set(SEG*1.5,9,15);a.rotation.y=Math.PI/2;a.position.set(s*(w/2+3.4+xo),0,zc);par.add(a);
        for(let q=-4;q<=4;q++){const h=Math.sqrt(Math.max(0,1-(q/4.5)**2))*9;if(h>.5) part(g.box,0x6f7c86,.12,h,.12,s*(w/2+3.4+xo),h/2,zc+q*4,par)} } }
    { const rg=new T.Group(); riverSights(i,rg,night); rg.traverse(m=>{ if(m.material){ m.material=m.material.clone(); m.material.fog=false } }); par.add(rg) }
    return;
  }
  for(const s of [-1,1]){ part(g.box,Z.ground,40,.1,SEG+.02,s*(20+w/2),-.06,zc,par); if(Z.k!=='wald') part(g.box,0xc9c3b8,1.2,.16,SEG,s*(w/2+.6),.02,zc,par) }
  // Wahrzeichen: eigener Zufall, damit die Häuser gleich bleiben
  const r2=mulberry(hashStr('lm'+i)), li=i%(ZONELEN/SEG), every={loev:3,wald:4,dom:3}[Z.k], set=LMSET[Z.k];
  let lmSide=0;
  if(Z.k==='loev'&&li===20){ lmSide=-1; LMK.stadion(par,-1,zc,night) }
  else if(set&&i%every===1){ lmSide=r2()<.5?-1:1; LMK[set[Math.floor(r2()*set.length)]](par,lmSide,zc,night) }
  if((Z.k==='loev'&&i%7===3)||(Z.k==='dom'&&i%4===2)) wimpel(z0-3,par);
  if(Z.k==='loev'){
    for(const s of [-1,1]){
      part(g.box,0x3f8f3a,.9,.9,SEG*.8,s*5.2,.45,zc,par);
      const n=s===lmSide?0:1+Math.floor(r()*2);
      for(let q=0;q<n;q++){ const hw=3.5+r()*2.5, hh=3+r()*3, hz=z0-2-q*6-r()*2, hx=s*(9+r()*3);
        part(g.box,[0xf4e3c3,0xe8c4a0,0xf1d9d9,0xdfe8f1,0xf6efe2][Math.floor(r()*5)],hw,hh,4.5,hx,hh/2,hz,par);
        const rf=part(g.cone4,[0xb5523b,0x8c3b2e,0x6b6f78][Math.floor(r()*3)],hw*.78,2,3.4,hx,hh+1,hz,par); rf.rotation.y=Math.PI/4;
        for(const wx of [-hw/4,hw/4]) part(g.box,night?0xffe28a:0x8fb8de,.7,.7,.05,hx+wx,hh*.6,hz+2.26,par,night?new T.MeshBasicMaterial({color:0xffe28a}):null) }
      if(i%2===0) lamp(s*(w/2+1),z0-6,par,night);
    }
  } else if(Z.k==='wald'){
    for(const s of [-1,1]) for(let q=0;q<5;q++){ const tx=s*(4.5+r()*14), tz=z0-r()*SEG, th=2.5+r()*3; if(s===lmSide&&Math.abs(tx)<22) continue;
      part(g.cyl,0x6b4a2b,.18,th*.5,.18,tx,th*.25,tz,par); part(g.cone,[0x2f7d32,0x3f8f3a,0x2b6b2f][Math.floor(r()*3)],1.2+r()*.6,th,1.2+r()*.6,tx,th*.75,tz,par) }
    if(i%3===0) lamp(-(w/2+1),z0-4,par,night);
  } else if(Z.k==='dom'){
    for(const s of [-1,1]){ const n=s===lmSide?0:1+Math.floor(r()*2);
      for(let q=0;q<n;q++){ const hw=5+r()*3, hh=7+r()*6; part(g.box,[0xd8cfc0,0xc9bfae,0xe3dbcd][Math.floor(r()*3)],hw,hh,6,s*(14+r()*4),hh/2,z0-3-q*6,par) }
      if(i%2===0) lamp(s*(w/2+1),z0-6,par,night) }
  }
}
function lamp(x,z,par,night){const g=geos();part(g.cyl,0x3d3d44,.06,3.2,.06,x,1.6,z,par);part(g.sph,night?0xfff1b0:0xe9e4d6,.18,.14,.18,x,3.25,z,par,night?new T.MeshBasicMaterial({color:0xfff1b0}):null)}
function buildDom(){ // Kölner Dom als Wahrzeichen (ohne Nebel, damit von weitem sichtbar)
  const g=geos(), o=new T.Group(), M=c=>new T.MeshLambertMaterial({color:c,fog:false}), P=(geo,c,a,b,cc,x,y,z,r)=>{const m=new T.Mesh(geo,M(c));m.scale.set(a,b,cc);m.position.set(x,y,z);if(r)m.rotation.set(r[0],r[1],r[2]);o.add(m);return m};
  const C=0x5a554f, D=0x45413d;
  P(g.box,C,18,26,52,0,13,8); P(g.box,D,13,13,52,0,26,8,[0,0,Math.PI/4]);          // Langhaus + Dach
  P(g.box,C,30,22,14,0,11,22); P(g.box,D,10,10,14,0,22,22,[0,0,Math.PI/4]);         // Querhaus
  for(const s of [-1,1]){ P(g.box,C,8,54,8,s*5.5,27,-20); P(g.cone,D,3.9,30,3.9,s*5.5,69,-20); P(g.cone,0x7c766e,.7,3,.7,s*5.5,85,-20);
    for(let q=0;q<3;q++) P(g.box,0x37332f,1.1,9,.3,s*5.5+(q-1)*2.2,34,-24.1);
    for(let q=0;q<5;q++) P(g.cone,D,.5,4,.5,s*(2+q*1.6),27,-24) }
  P(g.box,0x37332f,4,8,.3,0,14,-16.1); P(g.cone,D,2.6,5,.6,0,19.5,-16.2);           // Portal
  return o;
}

/* ---------- Kölner Wahrzeichen & Veedel-Deko (nur Optik) ---------- */
const lit=(night,c)=>night?new T.MeshBasicMaterial({color:0xffe28a}):mat(c||0x8fb8de);
const glass=(c,o)=>new T.MeshLambertMaterial({color:c,transparent:true,opacity:o||.55});
const LMK={
  buedchen(par,s,z,night){ const g=geos(), x=s*7.6;
    part(g.box,0xefe6d2,2.8,2.6,2.4,x,1.3,z,par); part(g.box,0x7a3b2e,3.2,.2,2.8,x,2.7,z,par);
    part(g.box,0,1.9,.9,.03,x,1.55,z+1.21,par,lit(night,0x3a3340)); part(g.box,0xd8cfc0,2,.12,.5,x,1.05,z+1.4,par);
    const aw=new T.Mesh(g.box,new T.MeshLambertMaterial({map:stripeTex('#d7263d','#ffffff',10)})); aw.scale.set(3,.08,1); aw.position.set(x,2.25,z+1.7); aw.rotation.x=.25; par.add(aw);
    board('Büdchen','#d7263d','#ffffff',2.4,.7,x,3.15,z+1.25,par);
    for(const q of [-.8,.8]){ part(g.box,0xf2c418,.55,.35,.42,x+q,.18,z+1.7,par); for(let b=0;b<3;b++) part(g.cyl,0x5b3a17,.05,.22,.05,x+q-.15+b*.15,.46,z+1.7,par) } },
  haltestelle(par,s,z){ const g=geos(), x=s*6.3;
    part(g.box,0,3,2.1,.06,x,1.05,z-.6,par,glass(0xa8d4e6,.45)); part(g.box,0x5c5a63,3.3,.12,1.5,x,2.2,z,par);
    for(const q of [-1.5,1.5]) part(g.box,0x5c5a63,.08,2.2,.08,x+q,1.1,z-.6,par); part(g.box,0x8d8a94,2,.1,.4,x,.5,z-.35,par);
    part(g.cyl,0x9a9aa2,.05,2.8,.05,x+s*1.9,1.4,z+.6,par); board('H','#0a8a3c','#f6c90e',.6,.6,x+s*1.9,2.75,z+.62,par); board('KVB','#e3001b','#ffffff',.6,.3,x+s*1.9,2.25,z+.62,par);
    board('Kölle Alaaf!','#8459c4','#ffffff',1.6,.8,x,1.25,z-.56,par) },
  brauhaus(par,s,z,night){ const g=geos(), x=s*10.8, D=0x4a3020;
    part(g.box,0xf3e3c3,6,6.5,5,x,3.25,z,par); const rf=part(g.cone4,0x8c3b2e,4.6,2.6,3.6,x,7.8,z,par); rf.rotation.y=Math.PI/4;
    for(const y of [2.3,4.9]) part(g.box,D,6.02,.18,.03,x,y,z+2.51,par); for(const q of [-2.9,-1,1,2.9]) part(g.box,D,.18,6.5,.03,x+q,3.25,z+2.52,par);
    for(const q of [-2,2]) part(g.box,0,.9,1,.04,x+q,1.3,z+2.53,par,lit(night,0x6f4a2a));
    board('Brauhaus','#4a2a14','#f2c230',3.4,1.45,x,3.6,z+2.56,par,'Kölsch vum Fass');
    const f=part(g.cyl,0x7a5230,.45,.95,.45,x-s*2.2,.45,z+3.1,par); f.rotation.z=Math.PI/2; part(g.torus,0x3a3a3a,.47,.47,.47,x-s*2.2,.45,z+3.1,par).rotation.y=Math.PI/2 },
  kirche(par,s,z){ const g=geos(), x=s*12.5;
    part(g.box,0xe8e2d6,5,5,8,x,2.5,z,par); const rf=part(g.cone4,0x6b6f78,3.6,2.6,5.7,x,6.3,z,par); rf.rotation.y=Math.PI/4;
    part(g.box,0xe0d9cb,2.4,10,2.4,x,5,z+4.6,par); const sp=part(g.cone4,0x4f5560,1.75,4.5,1.75,x,12.25,z+4.6,par); sp.rotation.y=Math.PI/4;
    part(g.cyl,0xffffff,.45,.05,.45,x,8.3,z+5.82,par).rotation.x=Math.PI/2; part(g.box,0x37332f,.9,1.8,.04,x,.9,z+5.82,par) },
  stadion(par,s,z,night){ const g=geos(), x=s*34;
    for(const zz of [-13,13]) part(g.box,0xd9d9de,34,7,3,x,3.5,z+zz,par); for(const xx of [-17,17]) part(g.box,0xd9d9de,3,7,26,x+xx,3.5,z,par);
    part(g.box,0x3f8f3a,30,.2,23,x,.2,z,par);
    for(const xx of [-17,17]) for(const zz of [-13,13]){ part(g.cyl,0xb8bcc4,.35,22,.35,x+xx,11,z+zz,par); part(g.box,0,3,1.5,.4,x+xx,22,z+zz,par,new T.MeshBasicMaterial({color:night?0xffffff:0xe9edf5})) }
    board('RheinEnergieSTADION','#e3001b','#ffffff',16,2.2,x,6,z+14.6,par) },
  weiher(par,s,z){ const g=geos(), x=s*13;
    const w=new T.Mesh(new T.CircleGeometry(7,28),mat(0x4f93c8)); w.rotation.x=-Math.PI/2; w.scale.set(1.3,1,1); w.position.set(x,.03,z); par.add(w);
    part(g.box,0x8a5a32,.9,.3,2,x-s*2,.15,z+1,par); part(g.box,0xffffff,.7,.15,.4,x-s*2,.35,z+1.4,par);
    for(let q=0;q<4;q++){ const dx=x+s*(q*1.2-1), dz=z-2+q*.7; part(g.sph,0xffffff,.22,.16,.3,dx,.15,dz,par); part(g.sph,0x2e7d32,.1,.1,.1,dx,.32,dz-.22,par) }
    part(g.cyl,0x6b4a2b,.06,1.6,.06,s*5.8,.8,z+2,par); board('Stadtwaldweiher','#2e6b3a','#ffffff',2.4,.6,s*5.8,1.7,z+2.03,par) },
  geissbock(par,s,z){ const g=geos(), x=s*10;
    part(g.box,0xf4f4f4,5.5,3,4,x,1.5,z,par); const rf=part(g.cone4,0xd7263d,4.2,1.8,3,x,3.9,z,par); rf.rotation.y=Math.PI/4;
    board('Geißbockheim','#e3001b','#ffffff',3.6,1.2,x,2.1,z+2.03,par,'1. FC Köln');
    const gx=x-s*3.6, gz=z+3.5; part(g.box,0x7a6a5a,2.2,.5,1.4,gx,.25,gz,par);
    part(g.sph,0xf3f0ea,.55,.42,.75,gx,1.2,gz,par); part(g.sph,0xf3f0ea,.26,.3,.3,gx,1.65,gz+.75,par);
    for(const sd of [-1,1]){ const h=part(g.cone,0xd9c9a6,.07,.45,.07,gx+sd*.15,2.0,gz+.65,par); h.rotation.z=-sd*.6; h.rotation.x=-.5; part(g.cyl,0xe8e2d6,.07,.55,.07,gx+sd*.25,.75,gz+.4,par); part(g.cyl,0xe8e2d6,.07,.55,.07,gx+sd*.25,.75,gz-.4,par) }
    part(g.cone,0xe8e2d6,.08,.25,.08,gx,1.38,gz+.95,par).rotation.x=Math.PI },
  biergarten(par,s,z){ const g=geos(), x=s*9.5;
    for(const q of [-2.5,0,2.5]){ part(g.box,0x8a5a32,1.6,.08,.7,x,.8,z+q,par); part(g.box,0x8a5a32,1.6,.06,.25,x,.45,z+q+.55,par); part(g.box,0x8a5a32,1.6,.06,.25,x,.45,z+q-.55,par);
      part(g.cyl,0xdddddd,.04,2.3,.04,x,1.15,z+q,par); part(g.cone,q?0xd7263d:0xffffff,1.3,.6,1.3,x,2.4,z+q,par) }
    part(g.cyl,0x6b4a2b,.06,1.8,.06,s*5.8,.9,z+3.5,par); board('Biergarten','#2e6b3a','#f2c230',2,.7,s*5.8,1.9,z+3.53,par,'Kölsch & Halve Hahn') },
  dombrauhaus(par,s,z,night){ const g=geos(), x=s*14;
    part(g.box,0xe9dccb,8,10,6,x,5,z,par); part(g.box,0x7a3b2e,8.4,.6,6.4,x,10.2,z,par);
    for(let r=0;r<3;r++) for(const q of [-2.6,0,2.6]) part(g.box,0,1.1,1.4,.04,x+q,2+r*2.8,z+3.02,par,lit(night,0x5d6e80));
    board('Brauhaus am Dom','#b3122e','#ffffff',5,1.6,x,8.6,z+3.06,par,'Kölsch · Halve Hahn · Himmel un Ääd') },
  hbf(par,s,z){ const g=geos(), x=s*16;
    const v=new T.Mesh(new T.CylinderGeometry(6,6,14,16,1,true,0,Math.PI),glass(0x9fb8c9,.6)); v.rotation.z=Math.PI/2; v.rotation.y=Math.PI/2; v.position.set(x,4,z); v.scale.set(1,1,.7); par.add(v);
    part(g.box,0xb9b2a6,12,4,1,x,2,z+7,par); board('Köln Hbf','#1d4f91','#ffffff',4.5,1.1,x,4.6,z+7.6,par) },
  museum(par,s,z){ const g=geos(), x=s*14;
    part(g.box,0xd0c8bb,12,5,8,x,2.5,z,par); part(g.box,0x37414a,11.6,1.2,.05,x,3.3,z+4.03,par); board('Römisch-Germanisches Museum','#37332f','#f2ede4',6,.9,x,1.4,z+4.06,par) },
  heinzel(par,s,z){ const g=geos(), x=s*7.5;
    part(g.cyl,0x9a948b,1.7,.6,1.7,x,.3,z,par); part(g.cyl,0x4f93c8,1.45,.62,1.45,x,.32,z,par);
    for(let q=0;q<3;q++){ const a=q/3*Math.PI*2, gx=x+Math.cos(a)*.7, gz=z+Math.sin(a)*.7; part(g.sph,0x6b5a3a,.22,.3,.22,gx,.95,gz,par); part(g.sph,0xe0b48a,.14,.14,.14,gx,1.3,gz,par); part(g.cone,0xd7263d,.15,.4,.15,gx,1.6,gz,par) }
    board('Heinzelmännchen','#37332f','#f2ede4',1.8,.45,x,.6,z+1.75,par) },
  k4711(par,s,z,night){ const g=geos(), x=s*12.5;
    part(g.box,0xe8e0cf,6,8,5,x,4,z,par); part(g.box,0x2b8a7e,6.2,.5,5.2,x,8.2,z,par);
    for(const q of [-1.6,1.6]) part(g.box,0,1.3,1.6,.04,x+q,2,z+2.52,par,lit(night,0x5d6e80));
    board('4711','#2b8a7e','#f2c230',3,1.5,x,5.4,z+2.56,par,'Echt Kölnisch Wasser') },
  tuennes(par,s,z){ const g=geos(), x=s*7.3, B=0x6b5a3a;
    part(g.box,0x9a948b,2.6,.7,1.4,x,.35,z,par);
    part(g.sph,B,.42,.55,.4,x-.6,1.3,z,par); part(g.sph,B,.28,.28,.28,x-.6,2.05,z,par); part(g.sph,B,.13,.13,.2,x-.6,2.0,z+.3,par);
    part(g.cyl,B,.22,1.1,.22,x+.6,1.25,z,par); part(g.sph,B,.24,.26,.24,x+.6,2.0,z,par); part(g.cone,B,.28,.2,.28,x+.6,2.28,z,par);
    board('Tünnes & Schäl','#37332f','#f2ede4',2.2,.45,x,.4,z+.72,par) },
};
const LMSET={loev:['buedchen','haltestelle','brauhaus','kirche','buedchen','haltestelle'],wald:['weiher','geissbock','biergarten'],dom:['dombrauhaus','hbf','museum','heinzel','k4711','tuennes']};
function wimpel(z,par){ const g=geos(), n=14, wd=3*LANE+3;
  part(g.cyl,0x444444,.015,wd,.015,0,4.6,z,par).rotation.z=Math.PI/2;
  for(let q=0;q<n;q++){ const m=new T.Mesh(new T.CircleGeometry(.28,3),new T.MeshBasicMaterial({color:q%2?0xffffff:0xd7263d,side:T.DoubleSide})); m.rotation.z=-Math.PI/2; m.position.set(-wd/2+(q+.5)*wd/n,4.42,z); par.add(m) } }
function riverSights(i,par,night){ const g=geos(), li=i%(ZONELEN/SEG), z0=-(i*SEG), Y=-2.2;
  if(li%9===4||li===31){ const s=li%2?1:-1, x=s*(17+li%5*2), z=z0-6;
    part(g.box,0xf4f4f4,3.6,1.3,16,x,Y+.65,z,par); part(g.box,0x1d4f91,3.62,.3,16.02,x,Y+.9,z,par); part(g.box,0xf4f4f4,3,1.2,11,x,Y+1.9,z+.5,par);
    part(g.box,0,3.02,.5,10,x,Y+2,z+.5,par,lit(night,0x3d5a78)); part(g.box,0xf4f4f4,2.4,.9,5,x,Y+2.95,z+1,par); part(g.cyl,0xf2c230,.35,1.2,.35,x,Y+3.6,z+2.2,par);
    board('MS Colonia','#ffffff','#1d4f91',3.2,.8,x-s*1.83,Y+2.4,z-2,par,null,-s*Math.PI/2) }
  if(li===10) for(let q=0;q<3;q++){ const x=-38, z=z0-q*34, c=0xb7c7d4;
    part(g.box,c,7,24,8,x,Y+12,z,par); part(g.box,c,7,6,26,x+.0,Y+27,z+9,par); part(g.box,0x8aa0b2,7.04,4,26.04,x,Y+27,z+9,par,glass(0x8aa0b2,.8)) }
  if(li===16){ const y=15; part(g.box,0x333333,120,.06,.06,0,y,z0-6,par); for(const x of [-42,42]){ part(g.box,0x9aa0a6,1.2,y+3,1.2,x,(y+3)/2+Y,z0-6,par) }
    for(const x of [-24,-4,19]){ part(g.box,0x777777,.05,1,.05,x,y-.5,z0-6,par); part(g.box,0xe3001b,1.1,1.2,1.4,x,y-1.6,z0-6,par); part(g.box,0,1.12,.5,1.3,x,y-1.4,z0-6,par,glass(0xbfe0f0,.8)) } }
  if(li===22){ const t=new T.Mesh(new T.CylinderGeometry(8,8,62,3),glass(0x6f9cc4,.9)); t.position.set(34,Y+31,z0-6); t.rotation.y=.4; par.add(t); board('KölnTriangle','#1d3550','#ffffff',8,1.4,34,Y+58,z0+2.5,par) }
  if(li===28){ part(g.box,0,16,7,10,-26,Y+3.5,z0-6,par,glass(0xbfd7e3,.7)); part(g.box,0xd8d2c4,16.4,.6,10.4,-26,Y+7.2,z0-6,par); board('Schokoladenmuseum','#5a3115','#f2d7a8',9,1.4,-26,Y+5.4,z0-.9,par) }
  if(li===34){ const d=part(g.sph,0x2457c5,9,4.5,6,26,Y,z0-6,par); board('Musical Dome','#2457c5','#ffffff',6,1.1,26,Y+3.2,z0+.1,par) }
}
function buildColonius(){ const o=new T.Group(), M=c=>new T.MeshLambertMaterial({color:c,fog:false}), P=(geo,c,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(geo,M(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);o.add(m);return m}, g=geos();
  P(g.cyl,0xc5c7cc,0,70,0,1.6,140,1.6); P(g.cyl,0xd9dbe0,0,124,0,7,7,7); P(g.cyl,0xb7bac0,0,131,0,5,3,5); P(g.cyl,0xd9dbe0,0,137,0,4,3,4);
  P(g.cyl,0xe3001b,0,160,0,.5,40,.5); const l=new T.Mesh(g.sph,new T.MeshBasicMaterial({color:0xff3030,fog:false})); l.position.y=181; l.scale.setScalar(.9); o.add(l); return o }
function veedelSign(v){ const g=geos(), o=new T.Group();
  for(const q of [-1.45,1.45]) part(g.cyl,0x9a9aa2,.05,2.6,.05,q,1.3,0,o);
  const m=new T.Mesh(new T.PlaneGeometry(3.4,1.46),new T.MeshBasicMaterial({map:boardTex(v.n,'#f6c400','#111111','Stadt Köln · '+v.b),side:T.DoubleSide})); m.position.y=2.2; o.add(m);
  return o }

/* ---------- Sound (WebAudio, ohne Dateien) ---------- */
let AC=null; let muted=false; try{muted=localStorage.getItem('ellie.r3mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,dur,type,vol,f2,delay){if(muted)return;const a=ac();if(!a)return;const t0=a.currentTime+(delay||0),o=a.createOscillator(),gn=a.createGain();o.type=type||'sine';
  o.frequency.setValueAtTime(f,t0);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+dur);gn.gain.setValueAtTime(vol||.12,t0);gn.gain.exponentialRampToValueAtTime(.001,t0+dur);o.connect(gn);gn.connect(a.destination);o.start(t0);o.stop(t0+dur+.02)}
function noise(dur,vol,lp){if(muted)return;const a=ac();if(!a)return;const n=Math.floor(a.sampleRate*dur),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=lp||900;const gn=a.createGain();gn.gain.value=vol||.3;s.connect(f);f.connect(gn);gn.connect(a.destination);s.start()}
const SFX={
  treat:()=>tone(988,.07,'square',.045,1480), heart:()=>{tone(660,.12,'sine',.1);tone(990,.18,'sine',.09,null,.1)},
  power:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,.12,'triangle',.08,null,i*.06))}, jump:()=>tone(320,.16,'sine',.08,640), duck:()=>tone(400,.12,'sine',.06,200),
  hit:()=>{noise(.25,.35,500);tone(180,.25,'sawtooth',.08,90)}, crash:()=>{noise(.6,.5,400);tone(140,.6,'sawtooth',.12,50)},
  honk:()=>{tone(392,.32,'square',.06);tone(494,.32,'square',.05)}, knall:()=>noise(.4,.6,2500), thunder:()=>noise(1.6,.55,220),
  pigeons:()=>{for(let i=0;i<5;i++) noise(.05,.15,3000)}, smash:()=>{noise(.15,.3,1500);tone(700,.1,'square',.06,1200)},
  bark:()=>{tone(520,.08,'sawtooth',.1,300);tone(480,.08,'sawtooth',.09,280,.13)}, over:()=>[523,440,349,262].forEach((f,i)=>tone(f,.22,'triangle',.09,null,i*.16)),
};

/* ---------- Spielzustand ---------- */
let R=null; // aktuelle Instanz
const fmtN=n=>Math.floor(n).toLocaleString('de-DE');
function profileId(){return 'run3d:'+me.name}
const ITEM=k=>ITEMS.find(x=>x.k===k);
function loadProfile(){
  const p=JSON.parse(JSON.stringify(S.info.find(i=>i.id===profileId())?.data||{}));
  const pr={bank:p.bank||0,owned:(p.owned||[]).filter(k=>ITEM(k)),eq:p.eq||{},runs:p.runs||0,veedel:p.veedel||[],vnext:p.vnext||0,mis:p.mis||null};
  if(p.equipped&&!p.eq&&ITEM(p.equipped)) pr.eq[ITEM(p.equipped).s]=p.equipped;   // altes Profil (nur 1 Outfit)
  for(const sl in pr.eq) if(!pr.owned.includes(pr.eq[sl])) delete pr.eq[sl];
  misFresh(pr); return pr;
}
/* ---------- Tagesaufgaben ---------- */
function todaysMissions(){ const r=mulberry(hashStr('mis-'+today())); return shuffle(MISSIONS.slice(),r).slice(0,3) }
function misFresh(pr){ if(!pr.mis||pr.mis.day!==today()) pr.mis={day:today(),done:[],cum:{newV:0,runs:0}} }
function misProgress(m,pr,st){ if(m.cum) return Math.min(m.n,pr.mis.cum[m.cum]||0)+'/'+m.n; return '' }
function evalMissions(){
  const pr=R.prof; misFresh(pr); const st=R.st;
  for(const m of todaysMissions()){ if(pr.mis.done.includes(m.id)) continue;
    const ok=m.cum?(pr.mis.cum[m.cum]||0)>=m.n:(st&&m.chk(st));
    if(ok){ pr.mis.done.push(m.id); pr.bank+=MIS_REWARD; R.misNew=(R.misNew||[]).concat(m.id); if(R.state==='run'){ SFX.power(); setTimeout(()=>R&&msg('✅ Aufgabe geschafft! +'+MIS_REWARD+' '+TREAT_E,'good'),400) } } }
}
function misHTML(){ const pr=R.prof; misFresh(pr); const ms=todaysMissions(), n=ms.filter(m=>pr.mis.done.includes(m.id)).length;
  return `<div class="r3-mis"><div class="r3-mis-h">Tagesaufgaben <span>${n}/3</span></div>${ms.map(m=>{const d=pr.mis.done.includes(m.id);return `<div class="r3-mis-i ${d?'done':''}"><i>${d?'✓':''}</i><span>${esc(m.t)}</span><small>${d?'':misProgress(m,pr)||('+'+MIS_REWARD+' '+TREAT_E)}</small></div>`}).join('')}</div>` }
async function saveProfile(p){
  const row={id:profileId(),data:p,author:me.name,updated_at:new Date().toISOString()};
  if(DEMO){const ex=S.info.find(i=>i.id===row.id); if(ex) ex.data=p; else S.info.push(row); return true}
  const {data,error}=await sb.from('info').upsert(row).select().single(); if(error){console.error(error);return false} putLocal('info',data); return true;
}
function runScores(){return S.game_scores.filter(x=>x.game==='run3d')}
function dailySeed(){return 'daily-'+today()}
function ghostFor(seed){
  const c=runScores().filter(x=>x.seed===seed&&Array.isArray(x.replay)&&x.meta?.v===SIMV).sort((a,b)=>b.score-a.score);
  return c.find(x=>x.player!==me.name)||c[0]||null;
}
async function fetchWeather(){
  const w={night:false,rain:false,thunder:false};
  const h=new Date().getHours(); w.night=h<7||h>=20;
  try{ const ctl=new AbortController(); setTimeout(()=>ctl.abort(),4000);
    const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.947&longitude=6.832&current=weather_code,precipitation,is_day&timezone=Europe%2FBerlin',{signal:ctl.signal});
    const c=(await r.json()).current; w.night=c.is_day===0; w.thunder=c.weather_code>=95; w.rain=w.thunder||c.precipitation>0.05||(c.weather_code>=51&&c.weather_code<=82); w.live=true;
  }catch(e){}
  return w;
}

/* ---------- Öffnen / Aufbau ---------- */
async function open(){
  if(R) return;
  const ov=document.createElement('div'); ov.id='r3';
  ov.innerHTML=`<canvas id="r3c"></canvas>
  <div class="r3-hud" id="r3hud" hidden>
    <div class="r3-top"><button class="r3-ib" data-r3="pause" aria-label="Pause">⏸</button>
      <div class="r3-score"><b id="r3s">0</b><small id="r3m">0 m</small></div>
      <div class="r3-treats">${TREAT_E} <b id="r3t">0</b></div></div>
    <div class="r3-anx"><span id="r3face"></span><div class="r3-bar"><i id="r3a"></i></div><small>Angst</small></div>
    <div class="r3-pw" id="r3pw"></div><div class="r3-ghost" id="r3g"></div>
    <div class="r3-msg" id="r3msg"></div><div class="r3-zone" id="r3z"></div><div class="r3-hint" id="r3hint">Wischen ← → zum Ausweichen · ↑ springen · ↓ ducken</div>
  </div>
  <div class="r3-flash" id="r3f"></div>
  <div class="r3-panel" id="r3p"></div>`;
  document.body.append(ov); document.body.classList.add('noscroll');
  const cv=ov.querySelector('#r3c');
  let renderer;
  try{ renderer=new T.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'}) }
  catch(e){ ov.remove(); document.body.classList.remove('noscroll'); toast('3D wird auf diesem Gerät nicht unterstützt'); return }
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  const scene=new T.Scene(), cam=new T.PerspectiveCamera(62,1,.1,400);
  const hemi=new T.HemisphereLight(0xffffff,0x7a6a8a,.95), sun=new T.DirectionalLight(0xffffff,.7); sun.position.set(-6,12,6); scene.add(hemi,sun);
  const world=new T.Group(); scene.add(world);
  const shadow=new T.Mesh(new T.CircleGeometry(.6,20),new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.22,depthWrite:false})); shadow.rotation.x=-Math.PI/2; scene.add(shadow);
  R={ov,cv,renderer,scene,cam,hemi,sun,world,shadow,state:'menu',segs:new Map(),prof:loadProfile(),wx:{night:false,rain:false,thunder:false},
     acc:0,last:performance.now(),shake:0,msgT:0,zone:-1,paused:false,raf:0};
  R.ellie=buildEllie(false,R.prof.eq); scene.add(R.ellie.root); R.trail=[]; R.trailT=0; R.signs=new Map(); R.shopSlot='head';
  resize(); window.addEventListener('resize',resize);
  bindInput();
  document.addEventListener('visibilitychange',onVis);
  newWorld('menu-'+Date.now(),false);
  menu();
  R.raf=requestAnimationFrame(loop);
  fetchWeather().then(w=>{ if(!R) return; R.wx=w; applyAtmo(); rebuildSegs(); if(R.state==='menu') menu() });
}
function close(){
  if(!R) return; cancelAnimationFrame(R.raf); window.removeEventListener('resize',resize); document.removeEventListener('visibilitychange',onVis);
  window.removeEventListener('keydown',R.key); R.renderer.dispose(); R.ov.remove(); document.body.classList.remove('noscroll'); R=null; render();
}
function resize(){ if(!R) return; const w=window.innerWidth,h=window.innerHeight; R.renderer.setSize(w,h,false); R.cv.style.width=w+'px'; R.cv.style.height=h+'px'; R.cam.aspect=w/h; R.cam.fov=w<h?66:56; R.cam.updateProjectionMatrix() }
function onVis(){ if(document.hidden&&R&&R.state==='run') pause(true) }
function applyAtmo(){
  const night=R.wx.night, z=ZONES[Math.max(0,R.zone)];
  const sky=new T.Color(night?0x141a33:R.wx.rain?0x8e99a8:z.sky), fog=new T.Color(night?0x1b2140:R.wx.rain?0xa9b1bc:z.fog);
  R.scene.background=sky; R.scene.fog=new T.Fog(fog,28,135);
  R.hemi.intensity=night?.42:R.wx.rain?.8:.95; R.sun.intensity=night?.12:R.wx.rain?.35:.7; R.hemi.groundColor=new T.Color(night?0x1d1830:0x7a6a8a);
  if(R.wx.rain&&!R.rain){ const n=900,pos=new Float32Array(n*3); for(let i=0;i<n;i++){pos[i*3]=(Math.random()-.5)*30;pos[i*3+1]=Math.random()*18;pos[i*3+2]=-Math.random()*60}
    const gq=new T.BufferGeometry(); gq.setAttribute('position',new T.BufferAttribute(pos,3));
    R.rain=new T.Points(gq,new T.PointsMaterial({color:0xcfd8e6,size:.08,transparent:true,opacity:.75})); R.scene.add(R.rain) }
  if(night&&!R.stars){ const n=300,pos=new Float32Array(n*3); for(let i=0;i<n;i++){const a=Math.random()*Math.PI,b=Math.random()*Math.PI*.45;pos[i*3]=Math.cos(a)*180*Math.cos(b);pos[i*3+1]=20+Math.sin(b)*120;pos[i*3+2]=-Math.sin(a)*180*Math.cos(b)}
    const gq=new T.BufferGeometry(); gq.setAttribute('position',new T.BufferAttribute(pos,3)); R.stars=new T.Points(gq,new T.PointsMaterial({color:0xffffff,size:.9,fog:false})); R.scene.add(R.stars) }
}
function newWorld(seed,thunder){
  R.W=new World(seed,thunder); R.P=new Runner(R.W,[]); R.ghost=null; R.zone=-1;
  for(const v of R.segs.values()) R.world.remove(v.g); R.segs.clear();
  if(R.gEllie){R.scene.remove(R.gEllie.root);R.gEllie=null}
}
function rebuildSegs(){ for(const v of R.segs.values()) R.world.remove(v.g); R.segs.clear() }
function syncSegs(){
  const si=Math.floor(R.P.d/SEG);
  for(const [i,v] of R.segs) if(i<si-2){R.world.remove(v.g);R.segs.delete(i)}
  for(let i=Math.max(0,si-1);i<=si+VIS;i++){ if(R.segs.has(i)) continue;
    const seg=R.W.seg(i), g=new T.Group(), items=[];
    buildScenery(i,seg.zi,g,R.wx.night);
    for(const it of seg.items){ const o=buildItem(it); if(!o) continue; o.position.set((it.lane-1)*LANE,0,-it.z); g.add(o); items.push({it,o}) }
    R.world.add(g); R.segs.set(i,{g,items});
  }
  R.W.trim(si-3);
}

/* ---------- Menü, Shop, Ende ---------- */
function panel(html,bottom){const p=R.ov.querySelector('#r3p');p.innerHTML=html;p.hidden=!html;p.classList.toggle('bottom',!!bottom)}
function menu(){
  R.state='menu'; R.ov.querySelector('#r3hud').hidden=true; clearSigns();
  const pr=R.prof, best=Math.max(0,...runScores().filter(x=>x.player===me.name).map(x=>x.score));
  const gh=ghostFor(dailySeed()), wx=R.wx;
  const wxTxt=wx.live?`${wx.thunder?'⛈️ Gewitter':wx.rain?'🌧️ Regen':wx.night?'🌙 Nacht':'☀️ Trocken'} in Lövenich – wie im Spiel`:'';
  panel(`<div class="r3-card r3-menu">
    <button class="r3-x" data-r3="close" aria-label="Schließen">✕</button>
    <div class="r3-title">Ellie Run <span>3D</span></div>
    <div class="r3-sub">Vun Lövenich durch d'r Stadtwald, üvver de Hohenzollernbröck bes an d'r Dom.${KARNEVAL?' 🎭 Kölle Alaaf!':''}</div>
    <button class="r3-btn hot" data-r3="start" data-mode="endless">▶ Endlos laufen</button>
    <button class="r3-btn" data-r3="start" data-mode="daily">📅 Tages-Challenge<small>${gh?`Geist: ${esc(gh.player)} · ${fmtN(gh.score)} Pkt.`:'Gleiche Strecke für euch beide – heute noch keiner gelaufen'}</small></button>
    <div class="r3-row"><button class="r3-btn ghost" data-r3="shop">🛍️ Shop<small>${TREAT_E} ${fmtN(pr.bank)}</small></button><button class="r3-btn ghost" data-r3="album">📍 Veedel<small>${pr.veedel.length}/${VLIST.length}</small></button><button class="r3-btn ghost sq" data-r3="mute">${muted?'🔇':'🔊'}</button></div>
    ${misHTML()}
    <div class="r3-meta">${best?`Dein Rekord: <b>${fmtN(best)}</b>`:'Noch kein Rekord'}${wxTxt?` · ${wxTxt}`:''}</div>
    <details class="r3-how"><summary>So geht's</summary>
      <p>Wischen ← → wechselt die Spur, ↑ springt (über Mülltonnen, E-Scooter & Baumstämme), ↓ duckt (unter Absperrungen, Baustellen & Ästen). Joggern, Radlern, Köbesse und der KVB ausweichen – die KVB ist tödlich!</p>
      <p>Hupen, Knallen, Tauben und Donner machen Ellie Angst. 💜 Kuscheln beruhigt. Ist das Angstmeter voll, ist die Runde vorbei.</p>
      <p>🧲 Magnet zieht Leckerli an · ⚡ Zoomies: schnell & unverwundbar · 👃 Schnüffelnase: doppelte Leckerli.</p>
      <p>📍 Unterwegs kommst du an Ortsschildern aller 86 Kölner Veedel vorbei – jedes neue gibt +10 ${TREAT_E} und landet in deinem Veedel-Album.</p></details>
  </div>`,true);
}
function shop(){
  const pr=R.prof, sl=R.shopSlot, list=ITEMS.filter(x=>x.s===sl);
  panel(`<div class="r3-card r3-shop"><button class="r3-x" data-r3="menu" aria-label="Zurück">‹</button>
    <div class="r3-title sm">Shop</div><div class="r3-sub">Dein Konto: ${TREAT_E} <b>${fmtN(pr.bank)}</b> · ${pr.owned.length}/${ITEMS.length} Teile</div>
    <div class="r3-tabs">${SLOTS.map(([k,n])=>`<button class="${k===sl?'on':''}" data-r3="slot" data-k="${k}">${n}${pr.eq[k]?' •':''}</button>`).join('')}</div>
    <div class="r3-grid">${list.map(o=>{const own=pr.owned.includes(o.k), eq=pr.eq[o.s]===o.k, can=pr.bank>=o.p;
      return `<button class="r3-item ${eq?'on':''} ${!own&&!can?'lock':''}" data-r3="outfit" data-k="${o.k}"><span class="e">${o.e}</span><b>${esc(o.n)}</b>${o.d?`<em>${esc(o.d)}</em>`:''}<small>${eq?'✓ an · tippen zum Ausziehen':own?'Anziehen':`${TREAT_E} ${o.p}`}</small></button>`}).join('')}</div>
  </div>`,true);
}
function album(){
  const pr=R.prof, got=new Set(pr.veedel);
  panel(`<div class="r3-card r3-album"><button class="r3-x" data-r3="menu" aria-label="Zurück">‹</button>
    <div class="r3-title sm">Veedel-Album</div><div class="r3-sub"><b>${got.size}</b> von ${VLIST.length} Kölner Veedeln entdeckt${got.size===VLIST.length?' – Ehrenbürgerin! 🏅':''}</div>
    <div class="r3-vbar"><i style="width:${got.size/VLIST.length*100}%"></i></div>
    ${VEEDEL.map(([b,arr])=>{const n=arr.filter(v=>got.has(v)).length;return `<div class="r3-bez"><div class="r3-bez-h">${esc(b)} <span>${n}/${arr.length}</span></div><div class="r3-vs">${arr.map(v=>`<span class="${got.has(v)?'on':''}">${got.has(v)?esc(v):'???'}</span>`).join('')}</div></div>`}).join('')}
  </div>`,true);
}
async function buyOrWear(k){
  const o=ITEM(k), pr=R.prof;
  if(!pr.owned.includes(k)){ if(pr.bank<o.p){ toastIn(`Noch ${fmtN(o.p-pr.bank)} ${TREAT_E} sammeln`); return } pr.bank-=o.p; pr.owned.push(k); SFX.power(); toastIn(`${o.e} ${o.n} gekauft!`) }
  else if(pr.eq[o.s]===k){ delete pr.eq[o.s]; setOutfit(R.ellie,pr.eq); shop(); saveProfile(pr); return }
  pr.eq[o.s]=k; setOutfit(R.ellie,pr.eq); shop(); saveProfile(pr);
}
function toastIn(t){ const m=R.ov.querySelector('#r3msg'); m.textContent=t; m.className='r3-msg show small'; clearTimeout(m._t); m._t=setTimeout(()=>m.className='r3-msg',1400) }
function start(mode){
  ac(); SFX.bark();
  const seed=mode==='daily'?dailySeed():'run-'+Date.now()+'-'+Math.floor(Math.random()*1e6);
  newWorld(seed,mode==='endless'&&R.wx.thunder);
  R.mode=mode; R.state='run'; R.paused=false; R.acc=0; R.zone=-1; panel('');
  clearSigns(); R.vstart=R.prof.vnext%VLIST.length; R.vk=0; R.misNew=[];
  R.st={d:0,treats:0,pows:0,hearts:0,calm600:false,calmFrom:0,newV:0};
  R.ov.querySelector('#r3hud').hidden=false; R.ov.querySelector('#r3hint').style.opacity=1;
  setTimeout(()=>{const h=R&&R.ov.querySelector('#r3hint');if(h)h.style.opacity=0},4500);
  if(mode==='daily'){ const gh=ghostFor(seed); if(gh){ R.ghost=new Runner(R.W,gh.replay); R.ghostRow=gh; R.gEllie=buildEllie(true); R.scene.add(R.gEllie.root);
    const lab=new T.Sprite(new T.SpriteMaterial({map:labelTex('👻 '+gh.player),transparent:true,depthWrite:false})); lab.scale.set(1.6,.4,1); lab.position.y=2.1; R.gEllie.root.add(lab) } }
  R.ellie.root.rotation.y=0;
}
function pause(on){
  if(R.state!=='run') return; R.paused=on;
  panel(on?`<div class="r3-card"><div class="r3-title sm">Pause</div><button class="r3-btn hot" data-r3="resume">▶ Weiter</button><button class="r3-btn ghost" data-r3="quit">Aufgeben</button></div>`:'');
  if(!on) R.last=performance.now();
}
async function endRun(){
  R.state='over'; SFX[R.P.why==='tram'?'crash':'over']();
  const P=R.P, score=P.score(), pr=R.prof, prevBest=Math.max(0,...runScores().filter(x=>x.player===me.name).map(x=>x.score));
  pr.bank+=P.treats; pr.runs=(pr.runs||0)+1; pr.vnext=(R.vstart+R.vk)%VLIST.length;
  misFresh(pr); pr.mis.cum.runs=(pr.mis.cum.runs||0)+1; trackStats(); evalMissions(); saveProfile(pr);
  const misDone=todaysMissions().filter(m=>R.misNew.includes(m.id));
  let ghostTxt='';
  if(R.ghost){ const gs=R.ghostRow.score; ghostTxt=score>gs?`🏆 Du hast ${esc(R.ghostRow.player)}s Geist geschlagen!`:`👻 ${esc(R.ghostRow.player)}s Geist: ${fmtN(gs)} – knapp!` }
  let [h1,h2]=WHY[P.why]||WHY.angst; if(P.why!=='tram') h2+=' '+pickR(KOELSCH.over);
  setTimeout(()=>{ if(!R) return; R.ov.querySelector('#r3hud').hidden=true;
    panel(`<div class="r3-card r3-over"><div class="r3-face">${moodFace(score>prevBest&&prevBest>0?5:P.why==='angst'?1:2)}</div>
      <div class="r3-title sm">${score>prevBest&&prevBest>0?'Neuer Rekord! 🎉':esc(h1)}</div><div class="r3-sub">${score>prevBest&&prevBest>0?esc(h1)+' – '+esc(h2):esc(h2)}</div>
      <div class="r3-big">${fmtN(score)}</div><div class="r3-sub">${fmtN(P.d)} m · ${TREAT_E} +${P.treats} Leckerli (Konto: ${fmtN(pr.bank)})${R.st.newV?` · 📍 ${R.st.newV} neue Veedel`:''}</div>
      ${misDone.length?`<div class="r3-ghosttxt">✅ ${misDone.map(m=>esc(m.t)).join(' · ')} (+${MIS_REWARD*misDone.length} ${TREAT_E})</div>`:''}
      ${ghostTxt?`<div class="r3-ghosttxt">${ghostTxt}</div>`:''}<div class="r3-sub" id="r3save">Wird im Leaderboard gespeichert …</div>
      <button class="r3-btn hot" data-r3="start" data-mode="${R.mode}">↻ Nochmal</button><div class="r3-row"><button class="r3-btn ghost" data-r3="menu">Menü</button><button class="r3-btn ghost" data-r3="close">Beenden</button></div></div>`);
  },900);
  const ok=await saveScore({player:me.name,score,level:Math.floor(P.d),game:'run3d',seed:R.W.seed,replay:P.inputs.slice(0,4000),meta:{v:SIMV,d:Math.floor(P.d),treats:P.treats,mode:R.mode,why:P.why}});
  setTimeout(()=>{const el=R&&R.ov.querySelector('#r3save'); if(el) el.textContent=ok===true?'✓ Im Leaderboard gespeichert':ok},950);
}

/* ---------- Eingabe ---------- */
function act(a){ if(!R||R.state!=='run'||R.paused||!R.P.alive) return; R.P.inputs.push([R.P.tick,a]) }
function bindInput(){
  const ov=R.ov; let sx=0,sy=0,st=0,used=false;
  ov.addEventListener('click',e=>{const b=e.target.closest('[data-r3]'); if(!b) return; const a=b.dataset.r3;
    if(a==='close') close(); else if(a==='start') start(b.dataset.mode); else if(a==='shop') shop(); else if(a==='album') album(); else if(a==='slot'){R.shopSlot=b.dataset.k;shop()} else if(a==='menu'){R.state='menu';newWorld('menu-'+Date.now(),false);menu()}
    else if(a==='outfit') buyOrWear(b.dataset.k); else if(a==='pause') pause(true); else if(a==='resume') pause(false);
    else if(a==='quit'){R.paused=false;R.P.alive=false;R.P.why='quit';endRun()}
    else if(a==='mute'){muted=!muted;try{localStorage.setItem('ellie.r3mute',muted?'1':'0')}catch(e){};menu()} });
  ov.addEventListener('touchstart',e=>{ if(e.target.closest('[data-r3],.r3-panel')) return; const t=e.touches[0];sx=t.clientX;sy=t.clientY;st=performance.now();used=false },{passive:true});
  ov.addEventListener('touchmove',e=>{ if(used||e.target.closest('.r3-panel')) return; const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    if(Math.max(Math.abs(dx),Math.abs(dy))>28){ used=true; act(Math.abs(dx)>Math.abs(dy)?(dx>0?'R':'L'):(dy>0?'D':'U')) } },{passive:true});
  ov.addEventListener('touchend',e=>{ if(e.target.closest('[data-r3],.r3-panel')) return; if(!used&&performance.now()-st<250) act('U') },{passive:true});
  R.key=e=>{const m={ArrowLeft:'L',ArrowRight:'R',ArrowUp:'U',ArrowDown:'D',' ':'U',a:'L',d:'R',w:'U',s:'D'}[e.key]; if(m&&R&&R.state==='run'){e.preventDefault();act(m)} if(e.key==='Escape'&&R) pause(!R.paused)};
  window.addEventListener('keydown',R.key);
}

/* ---------- Schleife ---------- */
function msg(t,cls){const m=R.ov.querySelector('#r3msg');m.textContent=t;m.className='r3-msg show '+(cls||'');clearTimeout(m._t);m._t=setTimeout(()=>m.className='r3-msg',1100)}
function flash(c){const f=R.ov.querySelector('#r3f');f.style.background=c||'#fff';f.classList.remove('on');void f.offsetWidth;f.classList.add('on')}
function handleEvents(){
  for(const [t,k] of R.P.events){
    if(t==='treat') SFX.treat();
    else if(t==='heart'){SFX.heart();msg(pickR(KOELSCH.heart),'good')}
    else if(t==='power'){SFX.power();msg(`${POW[k].e} ${POW[k].n}!`,'good')}
    else if(t==='jump') SFX.jump(); else if(t==='duck') SFX.duck();
    else if(t==='hit'){SFX.hit();R.shake=.35;msg(k==='koebes'?'Pass op, dä Köbes! 🍺':k==='scooter'?'Wer lässt dä Scooter he liggen?! 🛴':pickR(KOELSCH.hit),'bad');flash('rgba(228,80,31,.35)')}
    else if(t==='smash'){SFX.smash();msg('💪 Us d\'r Wäch!','good')}
    else if(t==='scare'){ SFX[k](); R.shake=.15;
      if(k==='honk') msg('HUUUP! 📢','bad'); else if(k==='knall'){msg('KNALL! 💥','bad');flash('rgba(255,240,200,.6)')}
      else if(k==='pigeons') msg('Gurr! 🐦','bad'); else if(k==='thunder'){msg('DONNER ⛈️','bad');flash('rgba(255,255,255,.85)')} }
  }
  for(const [t] of R.P.events){ if(t==='power') R.st.pows++; else if(t==='heart') R.st.hearts++ }
  R.P.events.length=0; if(R.ghost) R.ghost.events.length=0;
}
function trackStats(){ const st=R.st, P=R.P; st.d=P.d; st.treats=P.treats; if(P.anx>=50) st.calmFrom=P.d; if(P.d-st.calmFrom>=600) st.calm600=true }
function clearSigns(){ if(!R.signs) return; for(const m of R.signs.values()) R.scene.remove(m); R.signs.clear() }
function updSigns(){
  const P=R.P; if(R.state!=='run'&&R.state!=='over'){ return }
  const first=Math.max(0,Math.ceil((P.d-30-SIGN0)/SIGNGAP)), last=Math.floor((P.d+150-SIGN0)/SIGNGAP);
  for(const [n,m] of R.signs) if(n<first){R.scene.remove(m);R.signs.delete(n)}
  for(let n=first;n<=last;n++){ if(R.signs.has(n)) continue; const v=VLIST[(R.vstart+n)%VLIST.length], m=veedelSign(v), zz=SIGN0+n*SIGNGAP;
    const zi=R.W.zoneIdx(Math.floor(zz/SEG)); m.position.set((ZONES[zi].k==='bruecke'?1:1)*(1.5*LANE+2.1),0,-zz); m.rotation.y=-.35; R.scene.add(m); R.signs.set(n,m) }
  if(R.state==='run'){ const passed=Math.floor((P.d-SIGN0)/SIGNGAP)+1;
    while(R.vk<passed){ const v=VLIST[(R.vstart+R.vk)%VLIST.length]; R.vk++;
      if(!R.prof.veedel.includes(v.n)){ R.prof.veedel.push(v.n); R.prof.bank+=10; R.st.newV++; misFresh(R.prof); R.prof.mis.cum.newV=(R.prof.mis.cum.newV||0)+1;
        tone(784,.1,'triangle',.08); tone(1175,.16,'triangle',.08,null,.09); zoneBanner('📍 Neues Veedel: '+v.n,'+10 '+TREAT_E+' · '+R.prof.veedel.length+'/'+VLIST.length) }
      else zoneBanner('📍 '+v.n,'Bezirk '+v.b) } }
}
function zoneBanner(t,sub){ const z=R.ov.querySelector('#r3z'); z.innerHTML=esc(t)+(sub?`<small>${esc(sub)}</small>`:''); z.classList.remove('on'); void z.offsetWidth; z.classList.add('on') }
const TRAIL={konfetti:{c:[0xd7263d,0xffbe0b,0x3a86ff,0x2ec4b6,0xff006e,0xb192ec]},herzen:{e:'💜'},sterne:{e:'✨'},kamelle:{e:'🍬'},regenbogen:{rb:[0xe40303,0xff8c00,0xffed00,0x008026,0x004dff,0x750787]}};
function updTrail(dt){
  const k=R.prof.eq.fx, tr=R.trail, P=R.P;
  for(let i=tr.length-1;i>=0;i--){ const q=tr[i]; q.life-=dt; if(q.life<=0){R.scene.remove(q.o);tr.splice(i,1);continue}
    q.o.position.x+=q.vx*dt; q.o.position.y+=q.vy*dt; q.vy-=q.g*dt; q.o.material.opacity=Math.min(1,q.life/q.max*1.6); if(q.spin) q.o.rotation.z+=q.spin*dt }
  const moving=R.state==='run'&&!R.paused&&P.alive, menuish=R.state==='menu';
  if(!k||!TRAIL[k]||!(moving||menuish)) return;
  R.trailT-=dt; if(R.trailT>0) return; R.trailT=TRAIL[k].rb?.03:.06;
  const D=TRAIL[k], bx=P.x, by=P.y, bz=-P.d+.7;
  if(D.rb){ D.rb.forEach((c,j)=>{ const o=new T.Mesh(geos().box,new T.MeshBasicMaterial({color:c,transparent:true,depthWrite:false})); o.scale.set(.5,.07,.5); o.position.set(bx,by+.35+(5-j)*.08,bz); R.scene.add(o); tr.push({o,life:.5,max:.5,vx:0,vy:0,g:0}) }); return }
  for(let j=0;j<(D.c?3:1);j++){ let o;
    if(D.c){ o=new T.Mesh(new T.PlaneGeometry(.12,.08),new T.MeshBasicMaterial({color:D.c[Math.floor(Math.random()*D.c.length)],transparent:true,side:T.DoubleSide,depthWrite:false})) }
    else { o=new T.Sprite(new T.SpriteMaterial({map:emojiTex(D.e),transparent:true,depthWrite:false})); o.scale.setScalar(.32) }
    o.position.set(bx+(Math.random()-.5)*.5,by+.6+Math.random()*.4,bz+(menuish?.2:0)); R.scene.add(o);
    tr.push({o,life:.8,max:.8,vx:(Math.random()-.5)*1.2,vy:1+Math.random()*1.2,g:D.c?3:.8,spin:D.c?(Math.random()-.5)*12:0}) }
}
function hud(){
  const P=R.P, q=id=>R.ov.querySelector(id);
  q('#r3s').textContent=fmtN(P.score()); q('#r3m').textContent=fmtN(P.d)+' m'; q('#r3t').textContent=P.treats;
  const a=Math.min(100,P.anx); q('#r3a').style.width=a+'%'; q('#r3a').className=a>70?'hi':a>40?'mid':'';
  const fv=a>75?1:a>50?2:a>25?3:a>8?4:5; if(q('#r3face').dataset.v!=fv){q('#r3face').dataset.v=fv;q('#r3face').innerHTML=moodFace(fv)}
  q('#r3pw').innerHTML=Object.keys(POW).filter(k=>P.pw[k]>0).map(k=>`<span>${POW[k].e} ${Math.ceil(P.pw[k]/60)}s</span>`).join('');
  if(R.ghost){ const g=R.ghost, diff=Math.floor(P.d-g.d); q('#r3g').textContent=`👻 ${R.ghostRow.player}: ${g.alive?(diff>=0?`${diff} m hinter dir`:`${-diff} m vor dir`):`raus bei ${fmtN(g.d)} m`}` } else q('#r3g').textContent='';
}
function loop(now){
  if(!R) return; R.raf=requestAnimationFrame(loop);
  const dt=Math.min(.1,(now-R.last)/1000); R.last=now;
  if(R.state==='run'&&!R.paused){ R.acc+=dt; let n=0; while(R.acc>=DT&&n<8){ R.P.step(); if(R.ghost) R.ghost.step(); handleEvents(); R.acc-=DT; n++; if(!R.P.alive){endRun();break} }
    if(R.state==='run'){ trackStats(); R.misT=(R.misT||0)+dt; if(R.misT>.5){R.misT=0;evalMissions()} } hud() }
  draw(dt);
}
function draw(dt){
  const P=R.P, run=R.state==='run'||R.state==='over';
  syncSegs();
  const zi=R.W.zoneIdx(Math.floor(P.d/SEG)); if(zi!==R.zone){ R.zone=zi; applyAtmo(); if(R.state==='run'&&P.d>5) zoneBanner(ZONES[zi].name,ZONES[zi].sub) }
  updSigns(); updTrail(dt);
  if(!R.colon){R.colon=buildColonius();R.scene.add(R.colon)}
  R.colon.visible=ZONES[zi].k!=='dom'; R.colon.position.set(150,-10,-P.d-330);
  const cyc=ZONELEN*ZONES.length, dstart=Math.floor((P.d+400)/cyc)*cyc+ZONELEN*3;
  if(!R.dom){R.dom=buildDom();R.scene.add(R.dom)}
  R.dom.visible=P.d>dstart-420&&P.d<dstart+ZONELEN; R.dom.position.set(-34,0,-(dstart+230));
  const t=performance.now()/1000;
  for(const [i,v] of R.segs) for(const {it,o} of v.items){
    if(it.m) o.position.z=-P.itemZ(it);
    if(it.t==='treat'||it.t==='heart'||it.t==='power'){ o.visible=!P.done.has(it.id); if(o.userData.ring) o.userData.ring.rotation.y=t*2; o.children[0].position.y=(it.y||.6)+Math.sin(t*3+it.z)*.08;
      if(o.visible&&P.pw.magnet>0&&it.t==='treat'){const dz=P.itemZ(it)-P.d; if(dz<6&&dz>-1){o.position.x+=(P.x-o.position.x)*.25}} }
    if(it.t==='pigeons'&&P.done.has(it.id)) o.userData.birds.forEach((b,j)=>{b.position.y+=dt*(4+j);b.position.x+=dt*(j-1)*3});
    if(o.userData.blink) o.userData.blink.visible=Math.sin(t*8)>0;
    if(o.userData.legs&&it.m){const ph=t*9;o.userData.legs[0].rotation.x=Math.sin(ph)*.6;o.userData.legs[1].rotation.x=-Math.sin(ph)*.6}
  }
  const el=R.ellie; el.root.position.set(P.x,P.y,-P.d);
  if(R.state==='menu'){ el.root.rotation.y+=dt*.6; animEllie(el,P,0,dt,true) }
  else { el.root.rotation.y=0; animEllie(el,P,P.speed(),dt,!P.alive); el.root.visible=P.inv%10<6||P.inv===0 }
  R.shadow.position.set(P.x,.02,-P.d); R.shadow.scale.setScalar(1-Math.min(.5,P.y*.25));
  if(R.gEllie){ const g=R.ghost; R.gEllie.root.position.set(g.x,g.y,-g.d); R.gEllie.root.visible=g.alive; animEllie(R.gEllie,g,g.speed(),dt,false) }
  const sh=R.shake>0?(Math.random()-.5)*R.shake:0; R.shake=Math.max(0,R.shake-dt);
  if(R.state==='menu'){ R.cam.position.set(Math.sin(t*.15)*.6+1.3,2.3,-P.d+5.2); R.cam.lookAt(0,-1.25,-P.d) }
  else { R.cam.position.set(P.x*.55+sh,3.3+P.y*.3,-P.d+6.3); R.cam.lookAt(P.x*.8,1.15,-P.d-8) }
  if(R.rain){ const a=R.rain.geometry.attributes.position; for(let i=0;i<a.count;i++){ let y=a.getY(i)-dt*26; if(y<0)y+=18; a.setY(i,y) } a.needsUpdate=true; R.rain.position.set(R.cam.position.x,0,R.cam.position.z) }
  if(R.stars) R.stars.position.set(R.cam.position.x,0,R.cam.position.z);
  if(R.state==='run'&&R.wx.thunder&&R.mode==='daily'&&Math.random()<dt*.04) flash('rgba(255,255,255,.6)');
  R.renderer.render(R.scene,R.dbgCam||R.cam);
}

/* ---------- Test-Helfer (für automatisierte Tests) ---------- */
function simulate(seed,inputs,maxTicks){const W=new World(seed,false),r=new Runner(W,inputs);let n=0;while(r.alive&&n<(maxTicks||36000)){r.step();n++}return {d:r.d,score:r.score(),treats:r.treats,why:r.why,ticks:r.tick}}

window.Run3D={open,close,simulate,_state:()=>R,_setOutfit:()=>R&&setOutfit(R.ellie,R.prof.eq),World,Runner,SEG,LANE};
})();
