/* =====================================================================
   Ellie Run 3D – Endless Runner durch Köln (three.js r128)
   Simulation: fester Takt (60/s) + Seed  → Geist-Rennen per Replay
   ===================================================================== */
(function(){
'use strict';
const T=window.THREE;
const SEG=12, LANE=2.2, DT=1/60, VIS=12, ZONELEN=480, SIMV=1;
const ZONES=[
  {k:'loev',   name:'Köln-Lövenich',      sky:0x9fd0f2, fog:0xcfe6f7, ground:0x86c25e, road:0x55545d},
  {k:'wald',   name:'Stadtwald',          sky:0x9fd6bf, fog:0xcde9dc, ground:0x4f9a45, road:0xa4815a},
  {k:'bruecke',name:'Hohenzollernbrücke', sky:0xa7c4ec, fog:0xd3e0f3, ground:0x3f7cbc, road:0x5c5a63},
  {k:'dom',    name:'Domplatte',          sky:0xb9c3e3, fog:0xdbe0ef, ground:0xb7b0a4, road:0x9a948b},
];
const OUTFITS=[
  {k:'none',  n:'Nur Ellie',    p:0,   e:'🐾'},
  {k:'scarf', n:'Halstuch',     p:50,  e:'🧣'},
  {k:'party', n:'Partyhut',     p:100, e:'🥳'},
  {k:'rain',  n:'Regenmantel',  p:150, e:'🧥'},
  {k:'shades',n:'Sonnenbrille', p:200, e:'🕶️'},
  {k:'fc',    n:'FC-Trikot',    p:250, e:'⚽'},
  {k:'crown', n:'Krone',        p:500, e:'👑'},
];
const POW={magnet:{e:'🧲',n:'Magnet',t:8},turbo:{e:'⚡',n:'Zoomies',t:5},snout:{e:'👃',n:'Schnüffelnase',t:10}};
const LEN={bin:.8,log:.9,barrier:.5,branch:.5,jogger:.6,bike:1.6,tram:10};
const WHY={quit:['Aufgegeben 🏳️','Ellie wartet auf die nächste Runde.'],angst:['Zu viel Angst 😰','Ellie will nach Hause zum Kuscheln.'],tram:['Von der KVB erwischt 🚋','Nächstes Mal ausweichen!']};

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
  loev:[['bin',.32],['barrier',.24],['jogger',.24],['bike',.2]],
  wald:[['log',.4],['branch',.3],['jogger',.3]],
  bruecke:[['tram',.3],['bike',.3],['barrier',.2],['jogger',.2]],
  dom:[['barrier',.26],['bin',.24],['jogger',.24],['tram',.26]],
};
const MOVE={jogger:.25,bike:.6,tram:1.1};
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
      if((t==='bin'||t==='log')&&r()<.55){ for(let q=-2;q<=2;q++) add({t:'treat',lane:ln,z:mid+q*1.3,y:.6+1.1*(1-(q*q)/5)}) }
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
      if((it.t==='bin'||it.t==='log')&&this.y>.75) continue;
      if((it.t==='barrier'||it.t==='branch')&&this.duck>0) continue;
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
  const fit=new T.Group(); body.add(fit);
  const ell={root,body,head,ears,tail,legs,tongue,fit,phase:0};
  if(!ghost) setOutfit(ell,outfit);
  return ell;
}
function setOutfit(ell,k){
  const g=geos(), f=ell.fit; while(f.children.length) f.remove(f.children[0]);
  const hf=new T.Group(); hf.position.copy(ell.head.position); f.add(hf);
  const HOT=0xe4501f;
  if(k==='scarf'){ const t=part(g.torus,0xd7263d,.33,.33,.33,0,1.0,-.45,f); t.rotation.x=1.25; part(g.box,0xd7263d,.14,.3,.05,.12,.82,-.6,f).rotation.z=.3 }
  if(k==='party'){ const c=part(g.cone,HOT,.14,.34,.14,.05,.48,0,hf); c.rotation.z=-.2; part(g.sph,0xffffff,.06,.06,.06,.1,.66,0,hf); part(g.sph,0xf6d33c,.03,.03,.03,.02,.45,-.12,hf) }
  if(k==='rain'){ part(g.sph,0xf2c418,.45,.43,.6,0,.84,.03,f); part(g.sph,0xf2c418,.36,.2,.36,0,.15,.04,hf) }
  if(k==='shades'){ for(const s of [-1,1]) part(g.box,0x111111,.14,.08,.03,s*.14,.07,-.34,hf); part(g.box,0x111111,.1,.02,.02,0,.08,-.35,hf) }
  if(k==='fc'){ part(g.sph,0xe3001b,.44,.42,.58,0,.82,.02,f); part(g.cyl,0xffffff,.44,.07,.44,0,.86,.02,f).rotation.x=Math.PI/2 }
  if(k==='crown'){ part(g.cyl,0xf2c230,.16,.07,.16,0,.3,0,hf); for(let i=0;i<5;i++){const a=i/5*Math.PI*2;part(g.cone,0xf2c230,.04,.1,.04,Math.cos(a)*.13,.38,Math.sin(a)*.13,hf)} }
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
    case 'treat': sprite('🦴',.75,o,it.y||.6); break;
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
    return;
  }
  for(const s of [-1,1]){ part(g.box,Z.ground,40,.1,SEG+.02,s*(20+w/2),-.06,zc,par); if(Z.k!=='wald') part(g.box,0xc9c3b8,1.2,.16,SEG,s*(w/2+.6),.02,zc,par) }
  if(Z.k==='loev'){
    for(const s of [-1,1]){
      part(g.box,0x3f8f3a,.9,.9,SEG*.8,s*5.2,.45,zc,par);
      const n=1+Math.floor(r()*2);
      for(let q=0;q<n;q++){ const hw=3.5+r()*2.5, hh=3+r()*3, hz=z0-2-q*6-r()*2, hx=s*(9+r()*3);
        part(g.box,[0xf4e3c3,0xe8c4a0,0xf1d9d9,0xdfe8f1,0xf6efe2][Math.floor(r()*5)],hw,hh,4.5,hx,hh/2,hz,par);
        const rf=part(g.cone4,[0xb5523b,0x8c3b2e,0x6b6f78][Math.floor(r()*3)],hw*.78,2,3.4,hx,hh+1,hz,par); rf.rotation.y=Math.PI/4;
        for(const wx of [-hw/4,hw/4]) part(g.box,night?0xffe28a:0x8fb8de,.7,.7,.05,hx+wx,hh*.6,hz+2.26,par,night?new T.MeshBasicMaterial({color:0xffe28a}):null) }
      if(i%2===0) lamp(s*(w/2+1),z0-6,par,night);
    }
  } else if(Z.k==='wald'){
    for(const s of [-1,1]) for(let q=0;q<5;q++){ const tx=s*(4.5+r()*14), tz=z0-r()*SEG, th=2.5+r()*3;
      part(g.cyl,0x6b4a2b,.18,th*.5,.18,tx,th*.25,tz,par); part(g.cone,[0x2f7d32,0x3f8f3a,0x2b6b2f][Math.floor(r()*3)],1.2+r()*.6,th,1.2+r()*.6,tx,th*.75,tz,par) }
    if(i%3===0) lamp(-(w/2+1),z0-4,par,night);
  } else if(Z.k==='dom'){
    for(const s of [-1,1]){ const n=1+Math.floor(r()*2);
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
function loadProfile(){const p=S.info.find(i=>i.id===profileId())?.data||{};return {bank:p.bank||0,owned:p.owned||['none'],equipped:p.equipped||'none',runs:p.runs||0}}
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
      <div class="r3-treats">🦴 <b id="r3t">0</b></div></div>
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
  R.ellie=buildEllie(false,R.prof.equipped); scene.add(R.ellie.root);
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
  R.state='menu'; R.ov.querySelector('#r3hud').hidden=true;
  const pr=R.prof, best=Math.max(0,...runScores().filter(x=>x.player===me.name).map(x=>x.score));
  const gh=ghostFor(dailySeed()), wx=R.wx;
  const wxTxt=wx.live?`${wx.thunder?'⛈️ Gewitter':wx.rain?'🌧️ Regen':wx.night?'🌙 Nacht':'☀️ Trocken'} in Lövenich – wie im Spiel`:'';
  panel(`<div class="r3-card r3-menu">
    <button class="r3-x" data-r3="close" aria-label="Schließen">✕</button>
    <div class="r3-title">Ellie Run <span>3D</span></div>
    <div class="r3-sub">Durch Lövenich, Stadtwald, über die Hohenzollernbrücke bis zum Dom.</div>
    <button class="r3-btn hot" data-r3="start" data-mode="endless">▶ Endlos laufen</button>
    <button class="r3-btn" data-r3="start" data-mode="daily">📅 Tages-Challenge<small>${gh?`Geist: ${esc(gh.player)} · ${fmtN(gh.score)} Pkt.`:'Gleiche Strecke für euch beide – heute noch keiner gelaufen'}</small></button>
    <div class="r3-row"><button class="r3-btn ghost" data-r3="shop">🛍️ Shop · 🦴 ${fmtN(pr.bank)}</button><button class="r3-btn ghost sq" data-r3="mute">${muted?'🔇':'🔊'}</button></div>
    <div class="r3-meta">${best?`Dein Rekord: <b>${fmtN(best)}</b>`:'Noch kein Rekord'}${wxTxt?` · ${wxTxt}`:''}</div>
    <details class="r3-how"><summary>So geht's</summary>
      <p>Wischen ← → wechselt die Spur, ↑ springt (über Mülltonnen & Baumstämme), ↓ duckt (unter Absperrungen & Ästen). Joggern, Radlern und der KVB ausweichen – die KVB ist tödlich!</p>
      <p>Hupen, Knallen, Tauben und Donner machen Ellie Angst. 💜 Kuscheln beruhigt. Ist das Angstmeter voll, ist die Runde vorbei.</p>
      <p>🧲 Magnet zieht Leckerli an · ⚡ Zoomies: schnell & unverwundbar · 👃 Schnüffelnase: doppelte Leckerli. Leckerli kannst du im Shop gegen Outfits tauschen.</p></details>
  </div>`,true);
}
function shop(){
  const pr=R.prof;
  panel(`<div class="r3-card r3-shop"><button class="r3-x" data-r3="menu" aria-label="Zurück">‹</button>
    <div class="r3-title sm">Shop</div><div class="r3-sub">Dein Konto: 🦴 <b>${fmtN(pr.bank)}</b> Leckerli</div>
    <div class="r3-grid">${OUTFITS.map(o=>{const own=pr.owned.includes(o.k), eq=pr.equipped===o.k;
      return `<button class="r3-item ${eq?'on':''}" data-r3="outfit" data-k="${o.k}"><span class="e">${o.e}</span><b>${o.n}</b><small>${eq?'✓ angezogen':own?'Anziehen':`🦴 ${o.p}`}</small></button>`}).join('')}</div>
  </div>`,true);
}
async function buyOrWear(k){
  const o=OUTFITS.find(x=>x.k===k), pr=R.prof;
  if(!pr.owned.includes(k)){ if(pr.bank<o.p){ msg(`Noch ${o.p-pr.bank} 🦴 sammeln`); return } pr.bank-=o.p; pr.owned.push(k); SFX.power() }
  pr.equipped=k; setOutfit(R.ellie,k); shop(); saveProfile(pr);
}
function start(mode){
  ac(); SFX.bark();
  const seed=mode==='daily'?dailySeed():'run-'+Date.now()+'-'+Math.floor(Math.random()*1e6);
  newWorld(seed,mode==='endless'&&R.wx.thunder);
  R.mode=mode; R.state='run'; R.paused=false; R.acc=0; R.zone=-1; panel('');
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
  pr.bank+=P.treats; pr.runs=(pr.runs||0)+1; saveProfile(pr);
  let ghostTxt='';
  if(R.ghost){ const gs=R.ghostRow.score; ghostTxt=score>gs?`🏆 Du hast ${esc(R.ghostRow.player)}s Geist geschlagen!`:`👻 ${esc(R.ghostRow.player)}s Geist: ${fmtN(gs)} – knapp!` }
  const [h1,h2]=WHY[P.why]||WHY.angst;
  setTimeout(()=>{ if(!R) return; R.ov.querySelector('#r3hud').hidden=true;
    panel(`<div class="r3-card r3-over"><div class="r3-face">${moodFace(score>prevBest&&prevBest>0?5:P.why==='angst'?1:2)}</div>
      <div class="r3-title sm">${score>prevBest&&prevBest>0?'Neuer Rekord! 🎉':esc(h1)}</div><div class="r3-sub">${score>prevBest&&prevBest>0?esc(h1)+' – '+esc(h2):esc(h2)}</div>
      <div class="r3-big">${fmtN(score)}</div><div class="r3-sub">${fmtN(P.d)} m · 🦴 +${P.treats} Leckerli (Konto: ${fmtN(pr.bank)})</div>
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
    if(a==='close') close(); else if(a==='start') start(b.dataset.mode); else if(a==='shop') shop(); else if(a==='menu'){R.state='menu';newWorld('menu-'+Date.now(),false);menu()}
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
    else if(t==='heart'){SFX.heart();msg('💜 Kuscheln! Angst −30','good')}
    else if(t==='power'){SFX.power();msg(`${POW[k].e} ${POW[k].n}!`,'good')}
    else if(t==='jump') SFX.jump(); else if(t==='duck') SFX.duck();
    else if(t==='hit'){SFX.hit();R.shake=.35;msg('Autsch! 😣','bad');flash('rgba(228,80,31,.35)')}
    else if(t==='smash'){SFX.smash();msg('💪 Durch!','good')}
    else if(t==='scare'){ SFX[k](); R.shake=.15;
      if(k==='honk') msg('HUUUP! 📢','bad'); else if(k==='knall'){msg('KNALL! 💥','bad');flash('rgba(255,240,200,.6)')}
      else if(k==='pigeons') msg('Gurr! 🐦','bad'); else if(k==='thunder'){msg('DONNER ⛈️','bad');flash('rgba(255,255,255,.85)')} }
  }
  R.P.events.length=0; if(R.ghost) R.ghost.events.length=0;
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
  if(R.state==='run'&&!R.paused){ R.acc+=dt; let n=0; while(R.acc>=DT&&n<8){ R.P.step(); if(R.ghost) R.ghost.step(); handleEvents(); R.acc-=DT; n++; if(!R.P.alive){endRun();break} } hud() }
  draw(dt);
}
function draw(dt){
  const P=R.P, run=R.state==='run'||R.state==='over';
  syncSegs();
  const zi=R.W.zoneIdx(Math.floor(P.d/SEG)); if(zi!==R.zone){ R.zone=zi; applyAtmo(); if(R.state==='run'&&P.d>5){const z=R.ov.querySelector('#r3z');z.textContent='📍 '+ZONES[zi].name;z.classList.remove('on');void z.offsetWidth;z.classList.add('on')} }
  const cyc=ZONELEN*ZONES.length, dstart=Math.floor((P.d+400)/cyc)*cyc+ZONELEN*3;
  if(!R.dom){R.dom=buildDom();R.scene.add(R.dom)}
  R.dom.visible=P.d>dstart-420&&P.d<dstart+ZONELEN; R.dom.position.set(-34,0,-(dstart+230));
  const t=performance.now()/1000;
  for(const [i,v] of R.segs) for(const {it,o} of v.items){
    if(it.m) o.position.z=-P.itemZ(it);
    if(it.t==='treat'||it.t==='heart'||it.t==='power'){ o.visible=!P.done.has(it.id); if(o.userData.ring) o.userData.ring.rotation.y=t*2; o.children[0].position.y=(it.y||.6)+Math.sin(t*3+it.z)*.08;
      if(o.visible&&P.pw.magnet>0&&it.t==='treat'){const dz=P.itemZ(it)-P.d; if(dz<6&&dz>-1){o.position.x+=(P.x-o.position.x)*.25}} }
    if(it.t==='pigeons'&&P.done.has(it.id)) o.userData.birds.forEach((b,j)=>{b.position.y+=dt*(4+j);b.position.x+=dt*(j-1)*3});
    if(o.userData.legs&&it.m){const ph=t*9;o.userData.legs[0].rotation.x=Math.sin(ph)*.6;o.userData.legs[1].rotation.x=-Math.sin(ph)*.6}
  }
  const el=R.ellie; el.root.position.set(P.x,P.y,-P.d);
  if(R.state==='menu'){ el.root.rotation.y+=dt*.6; animEllie(el,P,0,dt,true) }
  else { el.root.rotation.y=0; animEllie(el,P,P.speed(),dt,!P.alive); el.root.visible=P.inv%10<6||P.inv===0 }
  R.shadow.position.set(P.x,.02,-P.d); R.shadow.scale.setScalar(1-Math.min(.5,P.y*.25));
  if(R.gEllie){ const g=R.ghost; R.gEllie.root.position.set(g.x,g.y,-g.d); R.gEllie.root.visible=g.alive; animEllie(R.gEllie,g,g.speed(),dt,false) }
  const sh=R.shake>0?(Math.random()-.5)*R.shake:0; R.shake=Math.max(0,R.shake-dt);
  if(R.state==='menu'){ R.cam.position.set(Math.sin(t*.15)*.6+1.4,2.5,-P.d+5.6); R.cam.lookAt(0,-.15,-P.d) }
  else { R.cam.position.set(P.x*.55+sh,3.3+P.y*.3,-P.d+6.3); R.cam.lookAt(P.x*.8,1.15,-P.d-8) }
  if(R.rain){ const a=R.rain.geometry.attributes.position; for(let i=0;i<a.count;i++){ let y=a.getY(i)-dt*26; if(y<0)y+=18; a.setY(i,y) } a.needsUpdate=true; R.rain.position.set(R.cam.position.x,0,R.cam.position.z) }
  if(R.stars) R.stars.position.set(R.cam.position.x,0,R.cam.position.z);
  if(R.state==='run'&&R.wx.thunder&&R.mode==='daily'&&Math.random()<dt*.04) flash('rgba(255,255,255,.6)');
  R.renderer.render(R.scene,R.cam);
}

/* ---------- Test-Helfer (für automatisierte Tests) ---------- */
function simulate(seed,inputs,maxTicks){const W=new World(seed,false),r=new Runner(W,inputs);let n=0;while(r.alive&&n<(maxTicks||36000)){r.step();n++}return {d:r.d,score:r.score(),treats:r.treats,why:r.why,ticks:r.tick}}

window.Run3D={open,close,simulate,_state:()=>R,World,Runner,SEG,LANE};
})();
