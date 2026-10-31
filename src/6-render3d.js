/* ================= 3D-ГРАФИКА =================
   Бой в 3D на Three.js. Персонажи и предметы — наборы KayKit (Kay Lousberg, CC0), текстуры и небо — Poly Haven (CC0).
   Симуляция боя та же; этот модуль только рисует её состояние. Если 3D не запускается, работает 2D из 5-render.js. */
const R3={want:store.get('ac.gfx','hi')!=='lo',on:false,ready:false,loading:false,failed:false,progress:0,why:''};
let T=null,T3=null;
const A3={gl:{},clips:{},tex:{},mat:{},pal:{},tpl:{},ghost:{},props:{},proc:{}};
const S3={theme:-1};
const W3=x=>(x-180)/TILE,Z3=y=>(y-320)/TILE;
const AB='a/';
/* файлы ассетов приходят скриптами: так их отдаёт хостинг артефактов в любом приложении */
const RAW={},RAWW={};window.__A3P=(n,s)=>{RAW[n]=s;if(RAWW[n]){RAWW[n]();delete RAWW[n]}};
function payload(n){if(RAW[n])return Promise.resolve(RAW[n]);const el=document.getElementById('p-'+n);if(el){RAW[n]=el.textContent.trim();el.remove();return Promise.resolve(RAW[n])}return new Promise((ok,no)=>{RAWW[n]=()=>ok(RAW[n]);const sc=document.createElement('script');sc.src=AB+'p/'+n+'.js';sc.onerror=()=>no(new Error('файл '+n+' не загрузился'));document.head.appendChild(sc)})}
const b64buf=s=>{const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a.buffer};
const TEAMHUE=[212,356];

/* ---------- загрузка ---------- */
function r3Boot(){if(T||!window.THREE)return;T=window.THREE;T3=window.T3;if(R3.want)r3Load()}
addEventListener('three-ready',r3Boot);
addEventListener('three-fail',e=>{const sc=document.createElement('script');sc.src=AB+'three3d.js';sc.onerror=()=>{R3.failed=true;R3.why='движок 3D не загрузился: '+e.detail;console.warn(R3.why)};document.head.appendChild(sc)});
async function r3Load(){if(R3.loading||R3.ready||!T)return;R3.loading=true;R3.failed=false;
 try{
  const cv=document.createElement('canvas');cv.id='c3';$('#wrap').insertBefore(cv,$('#c'));S3.cv=cv;
  const coarse=matchMedia('(pointer:coarse)').matches,Q=QUAL[qualKey()];S3.q={coarse,dpr:Q.dpr,shadow:Q.sh||1024,aa:true};
  const R=new T.WebGLRenderer({canvas:cv,antialias:S3.q.aa,powerPreference:'high-performance'});
  R.outputColorSpace=T.SRGBColorSpace;R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=1.05;
  R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;S3.R=R;
  // браузер может отобрать видеопамять: на время — 2D, качество вниз; не вернул за 3 с — остаёмся в 2D
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();S3.lost=1;S3.wasOn=R3.on;R3.on=false;cv.style.visibility='hidden';store.set('ac.qual','mid');
   clearTimeout(S3.lostT);S3.lostT=setTimeout(()=>{if(S3.lost)r3Fail('видеопамять закончилась')},3000)});
  cv.addEventListener('webglcontextrestored',()=>{S3.lost=0;clearTimeout(S3.lostT);S3.comp=S3.compHi=null;applyQual();if(S3.wasOn&&!R3.failed&&G&&mode!=='home'){R3.on=true;r3Show()}});
  const files=['Knight','Barbarian','Mage','Rogue','Rogue_Hooded','Skeleton_Minion','Skeleton_Warrior','Skeleton_Mage','Skeleton_Rogue'];
  const texs=[];
  const total=files.length+3+texs.length*3+1;let done=0;const tick=()=>{R3.progress=++done/total};
  const L=new T3.GLTFLoader();
  const TL=new T.TextureLoader();
  // на сайте модели лежат обычными файлами, в артефакте — внутри страницы
  const bin=n=>window.AC_SITE?fetch(n==='sky'?'assets/t/sky.hdr':'assets/m/'+n+'.glb').then(r=>{if(!r.ok)throw new Error('файл '+n+' не загрузился ('+r.status+')');return r.arrayBuffer()}):payload(n).then(b64buf);
  const ld=(u)=>bin(u).then(b=>{const k=window.createImageBitmap;try{window.createImageBitmap=undefined}catch(e){}const pr=L.parseAsync(b,'');try{window.createImageBitmap=k}catch(e){}return pr}).then(g=>{tick();return g});
  const lt=(u,srgb)=>payload(u.replace('.jpg','')).then(s=>TL.loadAsync('data:image/jpeg;base64,'+s)).then(t=>{tick();t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(16,R.capabilities.getMaxAnisotropy());if(srgb)t.colorSpace=T.SRGBColorSpace;return t});
  const jobs=[...files.map(f=>ld(f).then(g=>{A3.gl[f]=g})),ld('anims').then(g=>{for(const c of g.animations)A3.clips[c.name]=c}),ld('props').then(g=>{A3.lib=g.scene}),ld('monsters').then(g=>{A3.mon=g.scene;for(const c of g.animations)A3.clips[c.name]=c}),
   bin('sky').then(b=>{tick();const r=new T3.RGBELoader().parse(b),t=new T.DataTexture(r.data,r.width,r.height,T.RGBAFormat,r.type);t.colorSpace=T.LinearSRGBColorSpace;t.minFilter=t.magFilter=T.LinearFilter;t.generateMipmaps=false;t.flipY=true;t.needsUpdate=true;A3.hdr=t})];
  await Promise.all(jobs);
  r3Setup();for(const sc of[...Object.values(A3.gl).map(g=>g.scene),A3.mon,A3.lib])if(sc)sc.traverse(o=>{if(o.isMesh&&o.material){for(const m of[].concat(o.material))for(const k of['map','normalMap','roughnessMap','metalnessMap','emissiveMap'])if(m[k]){m[k].anisotropy=ANI();m[k].needsUpdate=true}}});await r3LoadTheme(curArena());store.set('ac.q3',0);applyQual();R3.ready=true;setTimeout(r3Icons,50);
 }catch(e){R3.failed=true;R3.why=String(e&&e.message||e);console.warn('3D отключено:',R3.why);if(S3.cv)S3.cv.remove()}
 finally{R3.loading=false}}

/* ---------- материалы ---------- */
/* нарисованные кодом текстуры в мультяшном стиле: светлые нейтральные (цвет задаёт материал) и цветная земля арены */
function wrapDraw(S,x,y,r,fn){for(const dx of[-S,0,S])for(const dy of[-S,0,S])if(x+dx>-r&&x+dx<S+r&&y+dy>-r&&y+dy<S+r)fn(x+dx,y+dy)}
function paint(n){const P=S3.pal||ATH[0],key='t:'+n+(n==='ground'?S3.theme:'');if(A3.tex[key])return A3.tex[key];
 const S=512,cv=document.createElement('canvas');cv.width=cv.height=S;const g=cv.getContext('2d'),r=mul(n.length*97+(S3.theme|0)*13+7);
 const blob=(x,y,w,h,c)=>wrapDraw(S,x,y,Math.max(w,h),(a,b)=>{g.fillStyle=c;g.beginPath();g.ellipse(a,b,w,h,r()*3,0,7);g.fill()});
 if(n==='ground'){const k=P.g;g.fillStyle=P.c1;g.fillRect(0,0,S,S);
  for(let i=0;i<70;i++)blob(r()*S,r()*S,20+r()*50,12+r()*30,r()<.5?P.c2+'40':'#ffffff14');
  if(k==='tile'){g.strokeStyle=P.c2;g.lineWidth=5;for(let i=0;i<=8;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,S);g.moveTo(0,i*64);g.lineTo(S,i*64);g.stroke()}}
  else if(k==='snow'){for(let i=0;i<260;i++)blob(r()*S,r()*S,3+r()*6,2+r()*4,'#ffffffaa')}
  else if(k==='sand'){g.strokeStyle=P.c2+'70';g.lineWidth=4;for(let i=0;i<14;i++){const y=r()*S;g.beginPath();for(let x=-20;x<=S+20;x+=16)g.lineTo(x,y+Math.sin(x/40+i)*8);g.stroke()}}
  else if(k==='ash'){g.strokeStyle=P.c2;g.lineWidth=3;for(let i=0;i<40;i++){let x=r()*S,y=r()*S;g.beginPath();g.moveTo(x,y);for(let j=0;j<4;j++){x+=rndV(-30,30);y+=rndV(-30,30);g.lineTo(x,y)}g.stroke()}}
  else{const dark=P.c2,light=P.c3||'#ffffff';for(let i=0;i<2600;i++){const x=r()*S,y=r()*S,h=6+r()*9;wrapDraw(S,x,y,16,(a,b)=>{g.strokeStyle=r()<.55?dark:light+'aa';g.lineWidth=2.2;g.beginPath();g.moveTo(a,b);g.quadraticCurveTo(a+rndV(-3,3),b-h*.6,a+rndV(-4,4),b-h);g.stroke()})}
   if(k==='swamp')for(let i=0;i<14;i++)blob(r()*S,r()*S,18+r()*30,10+r()*18,'#2a3a1acc')}
 }else if(n==='path'||n==='bank'){g.fillStyle='#f6ead2';g.fillRect(0,0,S,S);for(let i=0;i<160;i++)blob(r()*S,r()*S,6+r()*16,4+r()*10,r()<.5?'#d9c6a2':'#fff6e4');
  for(let i=0;i<110;i++){const x=r()*S,y=r()*S,rr2=3+r()*7;wrapDraw(S,x,y,rr2,(a,b)=>{g.fillStyle='#bfb29a';g.beginPath();g.arc(a,b,rr2,0,7);g.fill();g.fillStyle='#e9e2d4';g.beginPath();g.arc(a-1,b-1.5,rr2*.6,0,7);g.fill()})}}
 else if(n==='cobble'||n==='wall'){const rows=n==='wall'?8:7,bh=S/rows;g.fillStyle='#8f8a82';g.fillRect(0,0,S,S);
  for(let y=0;y<rows;y++){let x=(y%2)*-bh*.7;while(x<S){const w=bh*(n==='wall'?1.6:1.1)+r()*bh*.6,gap=6,c=200+r()*35|0;
   const gr=g.createLinearGradient(0,y*bh,0,y*bh+bh);gr.addColorStop(0,`rgb(${c+12},${c+10},${c+4})`);gr.addColorStop(1,`rgb(${c-26},${c-28},${c-32})`);g.fillStyle=gr;
   g.beginPath();g.roundRect(x+gap/2,y*bh+gap/2,w-gap,bh-gap,12);g.fill();if(x+w>S){g.beginPath();g.roundRect(x+gap/2-S,y*bh+gap/2,w-gap,bh-gap,12);g.fill()}x+=w}}}
 else if(n==='roof'){g.fillStyle='#9a9a9a';g.fillRect(0,0,S,S);const R=32;for(let y=-1;y<S/R*1.4;y++)for(let x=-1;x<S/R+1;x++){const cx=x*R*2+(y%2)*R,cy=y*R*.75;
  const gr=g.createRadialGradient(cx,cy,2,cx,cy+R*.5,R*1.1);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#bdbdbd');g.fillStyle=gr;g.beginPath();g.arc(cx,cy,R,0,Math.PI);g.fill();g.strokeStyle='#8a8a8a';g.lineWidth=3;g.stroke()}}
 else if(n==='planks'){const pw=S/6;for(let i=0;i<6;i++){const c=225+r()*25|0;g.fillStyle=`rgb(${c},${c-22},${c-50})`;g.fillRect(0,i*pw,S,pw);g.fillStyle='#00000030';g.fillRect(0,i*pw,S,4);
  g.strokeStyle='#0000001a';g.lineWidth=2;for(let j=0;j<5;j++){g.beginPath();const y=i*pw+10+r()*(pw-20);g.moveTo(0,y);g.bezierCurveTo(S*.3,y+rndV(-6,6),S*.6,y+rndV(-6,6),S,y);g.stroke()}
  g.fillStyle='#6b5a4a';for(const x of[20,S-20]){g.beginPath();g.arc(x,i*pw+pw/2,5,0,7);g.fill()}}}
 const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=ANI();return A3.tex[key]=t}
function pbr(n,rx,ry,o){o=Object.assign({},o||{});const ground=/^(grass|g\d)$/.test(n);if(ground){n='ground';delete o.color}
 const k=n+(ground?S3.theme:'')+rx+'x'+ry+JSON.stringify(o);if(A3.mat[k])return A3.mat[k];
 const t=paint(n).clone();t.repeat.set(rx,ry);t.needsUpdate=true;
 return A3.mat[k]=new T.MeshStandardMaterial(Object.assign({map:t,roughness:.92,metalness:0},o))}
const flat=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));
/* палитра персонажа: перекраска одежды в цвет команды и карта металла (сталь блестит, ткань матовая) */
const PALRULES={Knight:[[340,20,.4]],Barbarian:[[188,216,.18]],Rogue:[[115,180,.3]],Rogue_Hooded:[[115,180,.3]],Mage:[[232,262,.16],[318,346,.4]],
 Skeleton_Minion:[[330,360,.35]],Skeleton_Warrior:[[330,360,.35]],Skeleton_Mage:[[330,360,.35]],Skeleton_Rogue:[[330,360,.35]]};
function rgb2hsl(r,g,b){const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}return[h,s,l]}
const ANI=()=>Math.min(16,S3.R?S3.R.capabilities.getMaxAnisotropy():4);
function hsl2rgb(h,s,l){h=((h%360)+360)%360/360;if(!s)return[l,l,l];const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,f=t=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p};return[f(h+1/3),f(h),f(h-1/3)]}
const inHue=(h,a,b)=>a<=b?h>=a&&h<=b:h>=a||h<=b;
function palette(model,tm,tint){const key=model+tm+(tint||'');if(A3.pal[key])return A3.pal[key];
 let src=null;A3.gl[model].scene.traverse(o=>{if(!src&&o.isMesh&&o.material.map)src=o.material.map.image});
 const N=512,cv=document.createElement('canvas');cv.width=cv.height=N;const g=cv.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(src,0,0,N,N);
 const im=g.getImageData(0,0,N,N),d=im.data,mr=document.createElement('canvas');mr.width=mr.height=N;const mg=mr.getContext('2d'),mi=mg.createImageData(N,N),md=mi.data;
 const rules=PALRULES[model]||[],skel=model.startsWith('Skeleton'),th=TEAMHUE[tm];
 for(let i=0;i<d.length;i+=4){let[h,s,l]=rgb2hsl(d[i]/255,d[i+1]/255,d[i+2]/255);
  let metal=!skel&&s<.16&&l>.28&&l<.86&&h>150&&h<260,rough=metal?.5:.85;
  let team=false;for(const[a,b,ms]of rules)if(inHue(h,a,b)&&s>=ms){team=true;break}
  if(team){h=th;s=Math.max(s,tm?.62:.58);if(tint==='ice'){h=196;s=.55;l=Math.min(.8,l*1.35)}else if(tint==='storm'){h=tm?330:250;s=.5;l=l*.75}}
  if(tint==='gold'&&metal){h=44;s=.78;l=Math.min(.7,l*1.05);rough=.28}
  if(tint==='green'&&h>8&&h<40&&s>.45&&l>.55){h=98;s=.5;l*=.85}
  if(tint==='tan'&&h>8&&h<40&&s>.45&&l>.55){h=24;s=.55;l*=.9}
  if(tint==='dark'&&metal){l*=.55}
  if(team||tint){const c=hsl2rgb(h,s,l);d[i]=c[0]*255;d[i+1]=c[1]*255;d[i+2]=c[2]*255}
  md[i]=255;md[i+1]=rough*255;md[i+2]=metal?110:0;md[i+3]=255}
 g.putImageData(im,0,0);mg.putImageData(mi,0,0);
 const tx=new T.CanvasTexture(cv);tx.flipY=false;tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=ANI();const tr=new T.CanvasTexture(mr);tr.flipY=false;tr.anisotropy=ANI();
 return A3.pal[key]=new T.MeshStandardMaterial({map:tx,roughnessMap:tr,metalnessMap:tr,roughness:1,metalness:1,envMapIntensity:1.15})}

/* ---------- внешний вид карт ---------- */
const VIS={
 guard:{m:'Knight',keep:['Knight_Helmet','Knight_Cape','1H_Sword','Badge_Shield'],s:.62,atk:['1H_Melee_Attack_Chop','1H_Melee_Attack_Slice_Diagonal']},
 shooters:{m:'Rogue_Hooded',keep:['Rogue_Cape','1H_Crossbow'],s:.52,atk:['1H_Ranged_Shoot']},
 bones:{m:'Skeleton_Minion',keep:[],add:[['sk_blade','handslot.r']],s:.42,move:'Walking_D_Skeletons',atk:['1H_Melee_Attack_Stab','1H_Melee_Attack_Chop'],spawn:'Spawn_Ground_Skeletons'},
 imps:{m:'Rogue',keep:['Knife','Knife_Offhand'],s:.44,tint:'green',move:'Running_A',atk:['1H_Melee_Attack_Stab','1H_Melee_Attack_Slice_Diagonal']},
 slingers:{m:'Rogue',keep:['Rogue_Cape','Throwable'],s:.46,move:'Running_B',atk:['Throw']},
 bomber:{m:'Skeleton_Rogue',keep:['Skeleton_Rogue_Hood','Skeleton_Rogue_Cape'],add:[['bomb','handslot.r']],s:.5,atk:['Throw'],spawn:'Spawn_Ground_Skeletons'},
 militia:{m:'Barbarian',keep:['Barbarian_Hat','Barbarian_Cape','1H_Axe','Barbarian_Round_Shield'],s:.54,atk:['1H_Melee_Attack_Chop','1H_Melee_Attack_Slice_Diagonal']},
 giant:{q:'Orc',hh:3.4,wd:2.6,idle:'Idle',move:'Walk',atk:['Punch','Weapon'],death:'Death',walk:.8},
 colossus:{q:'Yeti',hh:3.9,wd:3.2,col:'#a39c8f',idle:'Idle',move:'Walk',atk:['Punch','Weapon'],death:'Death',walk:.6},
 pebble:{q:'GreenSpikyBlob',hh:1.3,wd:1.4,col:'#b1a99a',idle:'Idle',move:'Walk',atk:['Bite_Front'],death:'Death'},
 drake:{q:'Dragon_Evolved',hh:2,wd:2.2,idle:'Flying_Idle',move:'Fast_Flying',atk:['Headbutt','Punch'],death:'Death'},
 bats:{q:'Dragon',hh:.8,wd:.95,col:'#7a5fa8',idle:'Flying_Idle',move:'Fast_Flying',atk:['Headbutt'],death:'Death'},
 wisp:{q:'Ghost',hh:1,wd:1,col:'#ffb070',emi:'#ff6a1a',idle:'Flying_Idle',move:'Fast_Flying',atk:['Headbutt'],death:'Death'},
 crossbow:{m:'Rogue_Hooded',keep:['Rogue_Cape','2H_Crossbow'],s:.56,atk:['2H_Ranged_Shoot']},
 axe:{m:'Barbarian',keep:['Barbarian_Hat','Barbarian_Cape','2H_Axe'],s:.64,idle:'2H_Melee_Idle',atk:['2H_Melee_Attack_Spin']},
 hammer:{m:'Knight',keep:['Knight_Helmet','2H_Sword'],s:.64,tint:'dark',idle:'2H_Melee_Idle',move:'Running_A',atk:['2H_Melee_Attack_Chop','2H_Melee_Attack_Slice']},
 sorcerer:{m:'Mage',keep:['Mage_Hat','Mage_Cape','2H_Staff'],s:.56,atk:['Spellcast_Shoot']},
 knightrider:{m:'Knight',keep:['Knight_Helmet','Knight_Cape','2H_Sword','Round_Shield'],s:.7,idle:'2H_Melee_Idle',move:'Running_A',atk:['2H_Melee_Attack_Stab','2H_Melee_Attack_Chop']},
 frostsage:{m:'Mage',keep:['Mage_Hat','Mage_Cape','2H_Staff'],s:.56,tint:'ice',atk:['Spellcast_Shoot']},
 torchman:{m:'Barbarian',keep:['Barbarian_Hat','1H_Axe'],add:[['#torch','handslot.l']],s:.5,tint:'tan',atk:['1H_Melee_Attack_Chop','1H_Melee_Attack_Slice_Diagonal']},
 shadowblade:{m:'Skeleton_Rogue',keep:['Skeleton_Rogue_Hood','Skeleton_Rogue_Cape'],add:[['sk_blade','handslot.r']],s:.52,atk:['1H_Melee_Attack_Stab','1H_Melee_Attack_Chop'],spawn:'Spawn_Ground_Skeletons'},
 priest:{m:'Mage',keep:['Mage_Hat','Mage_Cape','2H_Staff'],s:.58,tint:'gold',atk:['Spellcast_Shoot']},
 shieldman:{m:'Knight',keep:['Knight_Helmet','1H_Sword','Spike_Shield'],s:.6,tint:'gold',atk:['1H_Melee_Attack_Chop','1H_Melee_Attack_Slice_Diagonal']},
 raider:{m:'Rogue_Hooded',keep:['Rogue_Cape','Knife','Knife_Offhand'],s:.5,tint:'storm',move:'Running_A',atk:['1H_Melee_Attack_Stab','1H_Melee_Attack_Slice_Diagonal']},
 scorch:{m:'Mage',keep:['Mage_Hat','Mage_Cape','2H_Staff'],s:.56,tint:'storm',atk:['Spellcast_Shoot']},
 thunder:{m:'Mage',keep:['Mage_Hat','Mage_Cape','1H_Wand','Spellbook_open'],s:.56,tint:'storm',atk:['Spellcast_Raise','Spellcast_Shoot']},
 mole:{m:'Barbarian',keep:['1H_Axe','Barbarian_Hat'],s:.46,tint:'tan',move:'Running_A',atk:['1H_Melee_Attack_Chop']},
 warlord:{m:'Knight',keep:['Knight_Helmet','Knight_Cape','2H_Sword'],s:.72,tint:'gold',idle:'2H_Melee_Idle',atk:['2H_Melee_Attack_Spin']},
 archer:{m:'Rogue_Hooded',keep:['Rogue_Cape','2H_Crossbow'],s:.36,atk:['2H_Ranged_Shoot']},
 dagger:{m:'Rogue',keep:['Rogue_Cape','Knife','Knife_Offhand'],s:.38,tint:'storm',atk:['Throw']},
 king:{m:'Knight',keep:['Knight_Cape'],s:.44,crown:1,idle:'Idle',atk:['Spellcast_Raise']}};
const PROC={cannon:1,lair:1,ram:1,airship:1,spring:1,mortar:1,lantern:1};
const US3=1.65;
const HEIGHT={bats:1.9,drake:2.2,airship:3.1,wisp:.5};

/* спаять части персонажа в одну модель на общем скелете: один вызов отрисовки вместо десятка */
/* мультяшный свет: три ступени освещённости вместо плавного затенения (на «Экономии» — обычный материал) */
let TOONG=null;const TOONM={};
function toonGrad(){if(TOONG)return TOONG;const d=new Uint8Array([105,105,105,255,175,175,175,255,235,235,235,255,255,255,255,255]);TOONG=new T.DataTexture(d,4,1,T.RGBAFormat);TOONG.minFilter=TOONG.magFilter=T.NearestFilter;TOONG.needsUpdate=true;return TOONG}
function toonOf(m){if(qualKey()==='eco'||!m||m.isMeshToonMaterial)return m;if(TOONM[m.uuid])return TOONM[m.uuid];
 const t=new T.MeshToonMaterial({map:m.map||null,color:m.color?m.color.clone():new T.Color('#fff'),gradientMap:toonGrad(),emissive:m.emissive?m.emissive.clone():new T.Color(0),emissiveIntensity:m.emissiveIntensity??1,emissiveMap:m.emissiveMap||null,transparent:m.transparent,opacity:m.opacity});
 return TOONM[m.uuid]=t}
let OUTM=null;
function outlineMat(){if(OUTM)return OUTM;OUTM=new T.MeshBasicMaterial({color:'#20182a',side:T.BackSide});
 OUTM.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','vec3 transformed=vec3(position)+normal*.028;')};return OUTM}
/* плавность клипов: переходы чуть мягче */
/* монстры Quaternius: своя модель и свои клипы «Модель/Клип»; цвет команды — обводкой, атлас общий */
const OUTC={};
function outlineTeam(tm){if(OUTC[tm])return OUTC[tm];const m=new T.MeshBasicMaterial({color:tm?'#7a1e18':'#173f7a',side:T.BackSide});
 m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','vec3 transformed=vec3(position)+normal*.045;')};return OUTC[tm]=m}
const monNode=n=>A3.mon.children.find(c=>c.name==='M_'+n);
function bakeMonster(key,tm,V){const src=monNode(V.q),tpl=T3.SkeletonUtils.clone(src);tpl.position.set(0,0,0);tpl.rotation.set(0,0,0);tpl.scale.set(1,1,1);
 tpl.updateMatrixWorld(true);const box=new T.Box3().setFromObject(tpl),h=Math.max(.01,box.max.y-box.min.y),wd=Math.max(.01,box.max.x-box.min.x,box.max.z-box.min.z),k=Math.min(V.hh/h,(V.wd||9)/wd);
 const add=[];tpl.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.frustumCulled=false;
  const m=o.material.clone();m.metalness=0;m.roughness=.75;if(V.col)m.color=new T.Color(V.col);if(V.emi){m.emissive=new T.Color(V.emi);m.emissiveIntensity=.6}o.material=toonOf(m);
  if(o.isSkinnedMesh&&SET.fx!=='low')add.push(o)});
 for(const o of add){const om=new T.SkinnedMesh(o.geometry,outlineTeam(tm));om.frustumCulled=false;om.userData.outline=1;o.parent.add(om);om.bind(o.skeleton,o.bindMatrix)}
 const w=new T.Group();w.add(tpl);tpl.scale.setScalar(k);tpl.position.y=-box.min.y*k;w.userData.V=Object.assign({},V,{hh:h*k,s:h*k/2.47/US3});return w}
function bake(key,tm){const id=key+tm;if(A3.tpl[id])return A3.tpl[id];if(VIS[key].q)return A3.tpl[id]=bakeMonster(key,tm,VIS[key]);const V=VIS[key],gl=A3.gl[V.m],src=gl.scene;src.updateMatrixWorld(true);
 let skin=null;const parts=[],glow=[];
 src.traverse(o=>{if(!o.isMesh)return;if(o.isSkinnedMesh){(o.material.name==='Glow'?glow:parts).push(o);if(!skin)skin=o}else if(V.keep.includes(o.name))parts.push(o)});
 const bones=skin.skeleton.bones;
 const geo=o=>{const s=o.geometry,n=s.attributes.position.count,sk=o.isSkinnedMesh,v=new T.Vector3(),nv=new T.Vector3(),NW=new T.Matrix3().getNormalMatrix(o.matrixWorld);
  const P=new Float32Array(n*3),Nn=new Float32Array(n*3),U=new Float32Array(n*2),SI=new Uint16Array(n*4),SW=new Float32Array(n*4),bi=sk?0:bones.indexOf(o.parent);
  const BM=sk?o.skeleton.boneMatrices:null,M=new T.Matrix4(),tm=new T.Matrix4(),nm=new T.Matrix3();
  for(let i=0;i<n;i++){v.fromBufferAttribute(s.attributes.position,i);nv.fromBufferAttribute(s.attributes.normal,i);
   if(sk){const ai=s.attributes.skinIndex,aw=s.attributes.skinWeight,ix=[ai.getX(i),ai.getY(i),ai.getZ(i),ai.getW(i)],w=[aw.getX(i),aw.getY(i),aw.getZ(i),aw.getW(i)],t=w[0]+w[1]+w[2]+w[3]||1;
    M.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);for(let k=0;k<4;k++){if(!w[k])continue;tm.fromArray(BM,ix[k]*16);const e=M.elements,f=tm.elements;for(let q=0;q<16;q++)e[q]+=f[q]*w[k]/t}
    M.multiply(o.bindMatrix).premultiply(o.bindMatrixInverse).premultiply(o.matrixWorld);v.applyMatrix4(M);nv.applyMatrix3(nm.getNormalMatrix(M)).normalize();
    for(let k=0;k<4;k++){SI[i*4+k]=ix[k];SW[i*4+k]=w[k]/t}}
   else{v.applyMatrix4(o.matrixWorld);nv.applyMatrix3(NW).normalize();SI[i*4]=bi;SW[i*4]=1}
   P[i*3]=v.x;P[i*3+1]=v.y;P[i*3+2]=v.z;Nn[i*3]=nv.x;Nn[i*3+1]=nv.y;Nn[i*3+2]=nv.z;
   if(s.attributes.uv){U[i*2]=s.attributes.uv.getX(i);U[i*2+1]=s.attributes.uv.getY(i)}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(P,3));g.setAttribute('normal',new T.BufferAttribute(Nn,3));g.setAttribute('uv',new T.BufferAttribute(U,2));
  g.setAttribute('skinIndex',new T.BufferAttribute(SI,4));g.setAttribute('skinWeight',new T.BufferAttribute(SW,4));
  if(s.index)g.setIndex(Array.from(s.index.array));else g.setIndex([...Array(n).keys()]);return g};
 for(const o of parts)if(o.isSkinnedMesh)o.skeleton.update();for(const o of glow)o.skeleton.update();
 const geos=parts.map(geo);
 // предметы из общей библиотеки (клинок скелета, бомба) крепятся к кости руки
 for(const[name,bn]of V.add||[]){const b=bones.find(x=>x.name===bn),p=name==='#torch'?torchProp():A3.lib.getObjectByName(name);if(!b||!p)continue;p.updateMatrixWorld(true);
  p.traverse(o=>{if(!o.isMesh)return;const q=o.clone();q.parent=b;q.matrixWorld.copy(b.matrixWorld).multiply(new T.Matrix4().makeRotationX(-Math.PI/2)).multiply(o.matrixWorld);
   const g2=geo(Object.assign(q,{isSkinnedMesh:false}));const mat=o.material;g2.userData.mat=mat;geos.push(g2)})}
 const tpl=T3.SkeletonUtils.clone(src),rm=[];tpl.traverse(o=>{if(o.isMesh)rm.push(o)});rm.forEach(o=>o.removeFromParent());
 const bm={};tpl.traverse(o=>{if(o.isBone)bm[o.name]=o});const tb=bones.map(b=>bm[b.name]);
 const mk=(gs,mat)=>{const m=new T.SkinnedMesh(T3.BufferGeometryUtils.mergeGeometries(gs),mat);m.castShadow=true;m.frustumCulled=false;tpl.add(m);m.bind(new T.Skeleton(tb,bones.map(x=>x.matrixWorld.clone().invert())),new T.Matrix4());return m};
 tpl.updateMatrixWorld(true);
 const body=mk(geos,toonOf(palette(V.m,tm,V.tint)));
 // мультяшная обводка: та же сетка, раздутая по нормалям и вывернутая наизнанку
 if(SET.fx!=='low'){const om=new T.SkinnedMesh(body.geometry,outlineMat());om.frustumCulled=false;om.userData.outline=1;tpl.add(om);om.bind(body.skeleton,body.bindMatrix)}
 if(glow.length)mk(glow.map(geo),new T.MeshStandardMaterial({color:'#ffd27a',emissive:tm?'#ff5a3c':'#7fd4ff',emissiveIntensity:2.2}));
 if(V.crown){const c=crown();const head=tb.find(b=>b.name==='head');if(head)head.add(c)}
 tpl.scale.setScalar(V.s*US3);tpl.userData.V=V;
 return A3.tpl[id]=tpl}
function crown(){const g=new T.Group(),gold=new T.MeshStandardMaterial({color:'#ffcf40',metalness:1,roughness:.25});
 const band=new T.Mesh(new T.CylinderGeometry(.42,.46,.22,12,1,true),gold);band.position.y=.62;g.add(band);
 for(let i=0;i<6;i++){const s=new T.Mesh(new T.ConeGeometry(.08,.24,5),gold),a=i/6*Math.PI*2;s.position.set(Math.cos(a)*.42,.82,Math.sin(a)*.42);g.add(s);
  const j=new T.Mesh(new T.SphereGeometry(.05,8,6),new T.MeshStandardMaterial({color:i%2?'#ff3b3b':'#3b8bff',roughness:.2,metalness:.2}));j.position.set(Math.cos(a)*.44,.64,Math.sin(a)*.44);g.add(j)}
 g.traverse(o=>{if(o.isMesh)o.castShadow=true});return g}

/* ---------- сцена и арена ---------- */
function r3Setup(){const R=S3.R,sc=new T.Scene();S3.scene=sc;
 const pm=new T.PMREMGenerator(R);sc.environment=pm.fromEquirectangular(A3.hdr).texture;sc.environmentIntensity=.45;pm.dispose();
 sc.background=new T.Color('#9cc3e6');sc.fog=new T.Fog('#9cc3e6',72,140);
 const hemi=new T.HemisphereLight('#dbe9ff','#4d5a33',.55);sc.add(hemi);S3.hemi=hemi;
 const sun=new T.DirectionalLight('#fff0d6',2.5);sun.position.set(-11,26,13);sun.castShadow=true;sun.shadow.mapSize.set(S3.q.shadow,S3.q.shadow);
 Object.assign(sun.shadow.camera,{left:-13,right:13,top:19,bottom:-19,near:2,far:70});sun.shadow.bias=-.0005;sun.shadow.normalBias=.035;sc.add(sun,sun.target);S3.sun=sun;
 const cam=new T.PerspectiveCamera(36.5,9/16,1,160);S3.cam=cam;S3.cam0=new T.Vector3(0,44,22.5);S3.look=new T.Vector3(0,0,.9);
 cam.position.copy(S3.cam0);cam.lookAt(S3.look);
 S3.ray=new T.Raycaster();S3.plane=new T.Plane(new T.Vector3(0,1,0),0);
 S3.dyn=new T.Group();sc.add(S3.dyn);
 S3.parts=particles();sc.add(S3.parts.add.pts,S3.parts.norm.pts);
 S3.waterN=waterNormals();S3.soft=softTex();
 S3.windU={value:0}}
/* свечение ярких мест (заклинания, огонь, снаряды) — только на «Высоком» качестве, порог высокий, чтобы не было дымки */
/* лёгкая резкость: усиливает разницу пикселя с соседями (крест из 4 выборок), сила .35 */
const sharpShader=()=>({uniforms:{tDiffuse:{value:null},px:{value:new T.Vector2(1/390,1/844)},k:{value:.35}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform sampler2D tDiffuse;uniform vec2 px;uniform float k;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;vec3 n=texture2D(tDiffuse,vUv+vec2(0.,px.y)).rgb+texture2D(tDiffuse,vUv-vec2(0.,px.y)).rgb+texture2D(tDiffuse,vUv+vec2(px.x,0.)).rgb+texture2D(tDiffuse,vUv-vec2(px.x,0.)).rgb;vec3 s=c+(c*4.-n)*k;vec3 lo=min(c,min(n*.25,c));vec3 hi=max(c,max(n*.25,c));gl_FragColor=vec4(clamp(s,lo-.04,hi+.04),1.);}'});
function makeComp(){if(!T3.EffectComposer)return null;const R=S3.R,hf=R.capabilities.isWebGL2&&(R.extensions.has('EXT_color_buffer_float')||R.extensions.has('EXT_color_buffer_half_float'));
 const rt=new T.WebGLRenderTarget(4,4,{type:hf?T.HalfFloatType:T.UnsignedByteType,samples:S3.q.coarse?2:4});const c=new T3.EffectComposer(S3.R,rt);c.addPass(new T3.RenderPass(S3.scene,S3.cam));c.addPass(new T3.UnrealBloomPass(new T.Vector2(256,456),.7,.35,1.6));c.addPass(new T3.OutputPass());
 if(T3.ShaderPass){const sp=new T3.ShaderPass(sharpShader());c.addPass(sp);S3.sharp=sp}return c}
function softTex(){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.45,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return new T.CanvasTexture(c)}
function waterNormals(){const N=128,cv=document.createElement('canvas');cv.width=cv.height=N;const g=cv.getContext('2d'),im=g.createImageData(N,N),d=im.data,hgt=new Float32Array(N*N);
 const waves=[[1,2,.9],[3,-1,.5],[-2,3,.35],[5,1,.22],[-4,-5,.15],[7,-3,.1]];
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){let v=0;for(const[a,b,amp]of waves)v+=amp*Math.sin(2*Math.PI*(a*x+b*y)/N+a*1.7);hgt[y*N+x]=v}
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const hx=hgt[y*N+(x+1)%N]-hgt[y*N+(x+N-1)%N],hy=hgt[((y+1)%N)*N+x]-hgt[((y+N-1)%N)*N+x],l=Math.hypot(hx,hy,1.2),i=(y*N+x)*4;
  d[i]=(-hx/l*.5+.5)*255;d[i+1]=(-hy/l*.5+.5)*255;d[i+2]=(1.2/l*.5+.5)*255;d[i+3]=255}
 g.putImageData(im,0,0);const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;return t}
/* факел в руке: древко и пламя (светящийся материал) */
function torchProp(){const g=new T.Group(),st=new T.Mesh(new T.CylinderGeometry(.045,.035,.7,8),new T.MeshStandardMaterial({color:'#6b4526',roughness:.9}));st.position.y=.2;g.add(st);
 const wr=new T.Mesh(new T.CylinderGeometry(.07,.06,.12,8),new T.MeshStandardMaterial({color:'#3a2a1a',roughness:.8}));wr.position.y=.55;g.add(wr);
 const fl=new T.Mesh(new T.ConeGeometry(.11,.32,8),new T.MeshStandardMaterial({color:'#ffcf5a',emissive:'#ff8a1a',emissiveIntensity:2.4}));fl.position.y=.76;g.add(fl);g.updateMatrixWorld(true);return g}
function propClone(name,s){const p=A3.lib.getObjectByName(name);if(!p)return new T.Group();const c=p.clone(true);c.position.set(0,0,0);c.rotation.set(0,0,0);if(s)c.scale.setScalar(s);
 c.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return c}
function ribbon(pts,w,mat,y){const pos=[],uv=[],idx=[];let len=0;
 for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[Math.min(pts.length-1,i+1)],o=pts[Math.max(0,i-1)];const dx=q[0]-o[0],dz=q[1]-o[1],l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;
  if(i)len+=Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]);pos.push(p[0]+nx*w/2,y,p[1]+nz*w/2,p[0]-nx*w/2,y,p[1]-nz*w/2);uv.push(0,len/w,1,len/w);
  if(i){const a=(i-1)*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 const m=new T.Mesh(g,mat);m.receiveShadow=true;return m}
function edgeAlpha(){const c=document.createElement('canvas');c.width=64;c.height=4;const g=c.getContext('2d'),r=g.createLinearGradient(0,0,64,0);
 r.addColorStop(0,'rgba(0,0,0,1)');r.addColorStop(.22,'#fff');r.addColorStop(.78,'#fff');r.addColorStop(1,'rgba(0,0,0,1)');g.fillStyle=r;g.fillRect(0,0,64,4);return new T.CanvasTexture(c)}
/* слой «живой» земли поверх травы: крупные светлые и тёмные пятна, лёгкая клетка, травинки и цветы */
function macroGround(P){const W0=540,H0=960,ck=document.createElement('canvas');ck.width=W0;ck.height=H0;const g=ck.getContext('2d'),r=mul(41+(S3.theme|0)*7),u=W0/18;
 for(let y=0;y<32;y++)for(let x=0;x<18;x++){g.fillStyle=(x+y)&1?'rgba(255,255,255,.045)':'rgba(0,30,0,.05)';g.fillRect(x*u,y*u,u,u)}
 const patch=(c,n,r0,r1,a)=>{for(let i=0;i<n;i++){const x=r()*W0,y=r()*H0,R=r0+r()*(r1-r0),gr=g.createRadialGradient(x,y,0,x,y,R);gr.addColorStop(0,c.replace('A',a));gr.addColorStop(1,c.replace('A',0));g.fillStyle=gr;g.fillRect(x-R,y-R,R*2,R*2)}};
 patch('rgba(255,255,170,A)',46,50,150,.13);patch('rgba(0,40,10,A)',54,50,160,.14);patch('rgba(120,200,60,A)',26,40,100,.1);
 const snow=P.g==='snow',sand=P.g==='sand'||P.g==='ash';
 if(!sand)for(let i=0;i<2600;i++){const x=r()*W0,y=r()*H0,h=5+r()*8;g.strokeStyle=r()<.5?'rgba(20,70,10,.28)':snow?'rgba(255,255,255,.35)':'rgba(190,255,120,.3)';g.lineWidth=1.6;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+rndV(-3,3),y-h*.6,x+rndV(-4,4),y-h);g.stroke()}
 const cols=snow?['#ffffff','#cfe8ff']:sand?['#fff2c8','#c9a86a']:['#ffffff','#ffe95a','#ff9ad0','#b9a0ff'];
 for(let i=0;i<(sand?60:230);i++){const x=r()*W0,y=r()*H0,c=cols[r()*cols.length|0];g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.arc(x+1,y+1.5,3,0,7);g.fill();g.fillStyle=c;g.beginPath();g.arc(x,y,2.4,0,7);g.fill();g.fillStyle='rgba(255,220,80,.9)';g.beginPath();g.arc(x,y,.9,0,7);g.fill()}
 const t=new T.CanvasTexture(ck);t.colorSpace=T.SRGBColorSpace;t.anisotropy=ANI();return t}
function buildArena(th){if(S3.arena){S3.scene.remove(S3.arena)}S3.bridgeG=[];S3.torches=[];const A=new T.Group();S3.arena=A;S3.scene.add(A);const rng=mul(17+th*31);
 // земля и поле
 const TH3=ATH[th]||ATH[0];S3.theme=th;applyLook(TH3);const grass=pbr('grass',20,28),gr=new T.Mesh(new T.PlaneGeometry(88,120),grass);gr.rotation.x=-Math.PI/2;gr.receiveShadow=true;A.add(gr);S3.gmats=[grass];
 const ct=macroGround(TH3);

 const chk=new T.Mesh(new T.PlaneGeometry(18,32),new T.MeshBasicMaterial({map:ct,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));chk.rotation.x=-Math.PI/2;chk.position.y=.004;A.add(chk);S3.chk=chk;
 // дорожки
 const pm=pbr('path',1,1,{alphaMap:edgeAlpha(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,color:TH3.path,side:T.DoubleSide});S3.gmats.push(pm);for(const m of S3.gmats)m.userData.c0=m.color.clone();
 const pmat=pm.clone();pmat.map=pm.map.clone();pmat.map.repeat.set(1,1);
 for(const s of[1,-1])for(const bx of[-5.5,5.5]){const pts=[];for(let i=0;i<=16;i++){const t=i/16;const x=(1-t)*(1-t)*0+2*(1-t)*t*bx+t*t*bx,z=(1-t)*(1-t)*13+2*(1-t)*t*13+t*t*9.75;pts.push([x,z*s])}
  pts.push([bx,1.25*s]);A.add(ribbon(pts,1.45,pm,.012))}
 // площадки башен
 const top=pbr('cobble',1.4,1.4),side=pbr('wall',2,.25,{color:'#cfc6b6'});
 for(const s of[1,-1])for(const[x,z,w]of[[-5.5,9.75,3],[5.5,9.75,3],[0,13,4]]){const p=new T.Mesh(new T.BoxGeometry(w,.18,w),[side,side,top,top,side,side]);p.position.set(x,.09,z*s);p.receiveShadow=true;p.castShadow=true;A.add(p)}
 // бортик вокруг поля
 const kerb=pbr('wall',8,.3,{color:'#bdb4a3'});
 for(const[x,z,w,d]of[[0,-16.18,18.7,.36],[0,16.18,18.7,.36],[-9.18,0,.36,32]  ,[9.18,0,.36,32]]){const k=new T.Mesh(new T.BoxGeometry(w,.32,d),kerb);k.position.set(x,.16,z);k.receiveShadow=true;k.castShadow=true;A.add(k)}
 // река, берега, мосты
 const bank=pbr('bank',9,1,{alphaMap:edgeAlpha(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3});
 const bk=ribbon([[-44,0],[44,0]],3.4,bank,.016);bk.material=bank.clone();bk.material.alphaMap=edgeAlpha();bk.material.alphaMap.repeat.set(1,1);
 const ag=bk.geometry.attributes.uv;for(let i=0;i<ag.count;i++)ag.setXY(i,ag.getX(i),ag.getY(i));A.add(bk);
 const bed=new T.Mesh(new T.PlaneGeometry(88,2.3),new T.MeshStandardMaterial({color:'#2a6a7a',roughness:1}));bed.rotation.x=-Math.PI/2;bed.position.y=.02;A.add(bed);
 const wn=S3.waterN.clone();wn.repeat.set(18,1.2);wn.needsUpdate=true;
 const lines=waveLines();lines.repeat.set(10,1);
 const water=new T.Mesh(new T.PlaneGeometry(88,2.1),new T.MeshStandardMaterial(Object.assign({color:'#38c6ec',roughness:.25,metalness:0,normalMap:wn,normalScale:new T.Vector2(.25,.25),emissive:'#ffffff',emissiveMap:lines,emissiveIntensity:.22,envMapIntensity:.8},TH3.water)));
 water.rotation.x=-Math.PI/2;water.position.y=.05;A.add(water);S3.water=water;
 // пена у берегов: полупрозрачные полосы с бегущей рябью
 S3.foam=[];const ft=foamTex();for(const z of[-1,1]){const t=ft.clone();t.needsUpdate=true;t.repeat.set(22,1);const f=new T.Mesh(new T.PlaneGeometry(88,.42),new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,opacity:.85}));
  f.rotation.x=-Math.PI/2;f.rotation.z=z>0?0:Math.PI;f.position.set(0,.06,z*.86);A.add(f);S3.foam.push(t)}
 if(qualKey()!=='eco')A.add(grassTufts(rng,TH3));
 for(let i=0;i<34;i++){const x=rng()*40-20;if(Math.abs(Math.abs(x)-5.5)<1.6)continue;const r=propClone('rock_'+'ABCDE'[i%5],.18+rng()*.16);r.position.set(x,.02,(rng()<.5?-1:1)*(1.05+rng()*.25));r.rotation.y=rng()*6.28;A.add(r)}
 const planks=pbr('planks',1,1.6,{color:'#c69a6a'}),beam=pbr('planks',.4,2,{color:'#7a5232'});
 for(const bx of[-5.5,5.5]){const b=new T.Group();
  const deck=new T.Mesh(new T.BoxGeometry(2.1,.16,3.2),[beam,beam,planks,planks,beam,beam]);deck.position.y=.16;deck.castShadow=deck.receiveShadow=true;b.add(deck);
  for(const sx of[-1.12,1.12]){const rail=new T.Mesh(new T.BoxGeometry(.12,.12,3.3),beam);rail.position.set(sx,.62,0);rail.castShadow=true;b.add(rail);
   for(const sz of[-1.5,-.5,.5,1.5]){const post=new T.Mesh(new T.CylinderGeometry(.07,.08,.6,6),beam);post.position.set(sx,.4,sz);post.castShadow=true;b.add(post)}}
  b.position.x=bx;A.add(b);(S3.bridgeG=S3.bridgeG||[]).push(b)}
 // окружение тренировочного лагеря
 const ring=(n,fn)=>{for(let i=0;i<n;i++)fn(i)};
 const place=(name,x,z,s,ry)=>{if(Math.abs(x)>9.6&&Math.abs(x)<15.4&&Math.abs(z)<16.5)x+=Math.sign(x)*5.6;const p=propClone(name,s);p.position.set(x,0,z);p.rotation.y=ry??rng()*6.28;A.add(p);return p};
 stands(A,TH3);
 if(TH3.trees)ring(46,i=>{const side=i%2?1:-1,x=side*(15.2+rng()*8),z=-30+rng()*60;if(Math.abs(z)<2.6&&Math.abs(x)<14)return;place(['tree_A_large','tree_B_large','tree_A_medium','tree_B_medium','tree_single_A','tree_single_B'][i%6],x,z,.9+rng()*.5)});
 if(TH3.trees)ring(18,i=>{const x=-26+i*3+rng()*2,z=-22-rng()*8;place(['tree_A_large','tree_B_large','tree_A_medium'][i%3],x,z,1.1+rng()*.4)});
 place('mountain_A',-15,-34,3.2,.4);place('mountain_B',4,-38,3.6,2.1);place('mountain_C',18,-32,3,1.2);place('hills_A',-6,-27,2.2,0);place('hills_B',13,-25,2,1);
 if(!TH3.trees)ring(40,i=>{const side=i%2?1:-1;place('rock_'+'ABCDE'[i%5],side*(15+rng()*8),-30+rng()*60,1+rng()*1.6)});
 if(th===0){place('tent',-12.5,8,1.3,.9);place('tent',12.8,-7,1.3,-2.3);place('target',-11.2,4,1.1,1.6);place('target',11.4,3.5,1.1,-1.4);
 place('weaponrack',-11,11.5,1.1,1.5);place('weaponrack',11.2,-11,1.1,-1.6);place('barrel',-10.6,6,1.2);place('barrel',10.7,-5,1.2);place('crate',-10.8,-6,1.1);place('crate_small',10.9,6.5,1.1);
 place('bucket_arrows',-10.9,2.6,1.1);place('wheelbarrow',11.6,9,1.1,2);place('sack',-11.4,-3,1.1);place('lumber',11.5,-13,1.1)}
 else if(TH3.trees){for(const[x,z]of[[-12,8],[12.5,-7],[-11.5,-9],[11.8,10]])place(['barrel','crate','sack','lumber'][(x>0)+(z>0)*2],x,z,1.2)}
 if(TH3.treeTint)A.traverse(o=>{if(o.isMesh&&!o.userData.k3&&o.material&&o.material.name==='hexagons_medieval'){o.material=o.material.clone();o.material.color.set(TH3.treeTint);o.userData.k3=1}});
 for(const[x,z,t]of[[-9.6,16.6,0],[9.6,16.6,0],[-9.6,-16.6,1],[9.6,-16.6,1]]){const f=place(t?'flag_red':'flag_blue',x,z,1.6,0);}
 S3.theme=th;S3.weather=TH3.w}

/* ---------- башни ---------- */
function bannerMat(tm,king){const c=document.createElement('canvas');c.width=128;c.height=192;const g=c.getContext('2d'),T0=TEAM[tm];
 const gr=g.createLinearGradient(0,0,0,192);gr.addColorStop(0,T0.m);gr.addColorStop(1,T0.d);g.fillStyle=gr;g.beginPath();g.moveTo(0,0);g.lineTo(128,0);g.lineTo(128,192);g.lineTo(64,150);g.lineTo(0,192);g.closePath();g.fill();
 g.strokeStyle='#ffd35c';g.lineWidth=7;g.stroke();g.fillStyle='#ffd35c';
 if(king){g.beginPath();g.moveTo(26,104);g.lineTo(20,48);g.lineTo(44,72);g.lineTo(64,36);g.lineTo(84,72);g.lineTo(108,48);g.lineTo(102,104);g.closePath();g.fill()}
 else{g.beginPath();g.moveTo(64,34);g.lineTo(104,52);g.lineTo(98,100);g.lineTo(64,124);g.lineTo(30,100);g.lineTo(24,52);g.closePath();g.fill();g.fillStyle=T0.d;g.fillRect(58,52,12,52);g.fillRect(42,66,44,12)}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map:t,alphaTest:.5,side:T.DoubleSide,roughness:.9})}
function crenels(gp,r,n,y,mat,sq){for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=new T.Mesh(new T.BoxGeometry(.34,.4,.3),mat);
  if(sq){const s=sq/2,k=i%(n/4),edge=i/(n/4)|0,t=-s+.25+k*(2*s-.5)/(n/4-1);b.position.set(edge===0?t:edge===2?-t:edge===1?s:-s,y,edge===0?s:edge===2?-s:edge===1?-t:t)}
  else{b.position.set(Math.cos(a)*r,y,Math.sin(a)*r);b.rotation.y=-a}b.castShadow=true;b.receiveShadow=true;gp.add(b)}}
function towerView(t){const g=new T.Group(),k=t.kind==='k',wall=pbr('wall',k?3:2.4,k?2.2:2,{color:'#cbc2b0'}),dark=pbr('wall',2,1,{color:'#8c8273'}),roof=pbr('roof',2,1.2,{color:t.tm?'#ff6a5a':'#4aa8ff'});
 const v={t,g,k,act:-1,cd:0};
 {const ao=new T.Mesh(new T.CircleGeometry(k?3.1:2.2,28),new T.MeshBasicMaterial({map:S3.soft,color:'#0c1806',transparent:true,opacity:.55,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-5}));ao.rotation.x=-Math.PI/2;ao.position.y=.014;g.add(ao)}
 if(k){const body=new T.Mesh(new T.BoxGeometry(3.1,1.5,3.1),wall);body.position.y=.92;g.add(body);
  for(const[x,z]of[[-1.55,-1.55],[1.55,-1.55],[-1.55,1.55],[1.55,1.55]]){const tw=new T.Mesh(new T.CylinderGeometry(.5,.56,2,10),wall);tw.position.set(x,1.17,z);g.add(tw);
   const cn=new T.Mesh(new T.ConeGeometry(.66,.8,10),roof);cn.position.set(x,2.57,z);g.add(cn)}
  const top=new T.Mesh(new T.BoxGeometry(3.3,.18,3.3),dark);top.position.y=1.73;g.add(top);crenels(g,0,16,1.98,wall,3.1);
  const gate=new T.Mesh(new T.BoxGeometry(1.05,1.3,.12),pbr('planks',1,1,{color:'#6b4a2e'}));gate.position.set(0,.62,1.56);g.add(gate);
  for(const sx of[-1.15,1.15]){const tp=torchProp();tp.scale.setScalar(1.5);tp.position.set(sx,0,2.35);g.add(tp);(S3.torches=S3.torches||[]).push(tp.children[2])}
  const bn=new T.Mesh(new T.PlaneGeometry(.95,1.2),bannerMat(t.tm,1));bn.position.set(0,1.0,1.6);gate.position.x=1.05;gate.scale.set(.6,.7,1);g.add(bn);
  const kg=r3Inst('king',t.tm);kg.root.position.set(-.35,1.82,.15);g.add(kg.root);v.unit=kg;
  const cn=cannonModel(t.tm,.9);cn.position.set(.75,1.82,.25);g.add(cn);v.cannon=cn}
 else{const base=new T.Mesh(new T.CylinderGeometry(1.3,1.38,.35,12),dark);base.position.y=.18;g.add(base);
  const body=new T.Mesh(new T.CylinderGeometry(1.06,1.2,1.3,12),wall);body.position.y=1.0;g.add(body);
  const lip=new T.Mesh(new T.CylinderGeometry(1.32,1.12,.26,12),dark);lip.position.y=1.76;g.add(lip);crenels(g,1.2,10,2.03,wall);
  const door=new T.Mesh(new T.BoxGeometry(.55,.85,.1),pbr('planks',1,1,{color:'#6b4a2e'}));door.position.set(0,.62,1.16);door.scale.set(.8,.75,1);g.add(door);
  const bn=new T.Mesh(new T.PlaneGeometry(.6,.75),bannerMat(t.tm,0));bn.position.set(.62,1.12,1.0);bn.rotation.y=.5;g.add(bn);
  const ar=r3Inst(t.tt==='dagger'?'dagger':'archer',t.tm);ar.root.position.set(0,1.86,t.tt==='cannoneer'?-.45:0);g.add(ar.root);v.unit=ar;
  if(t.tt==='cannoneer'){const cn=cannonModel(t.tm,.8);cn.position.set(0,1.86,.25);g.add(cn);v.cannon=cn}}
 g.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true}});
 g.position.set(W3(t.x),.17,Z3(t.y));S3.dyn.add(g);
 // руины на потом
 const ru=new T.Group(),rng=mul(t.id*7);for(let i=0;i<16;i++){const s=.18+rng()*.32,r=new T.Mesh(new T.DodecahedronGeometry(s,0),i%3?wall:dark);
  const a=rng()*6.28,d=rng()*(k?1.7:1.3);r.position.set(Math.cos(a)*d,s*.6,Math.sin(a)*d);r.rotation.set(rng()*3,rng()*3,rng()*3);r.castShadow=r.receiveShadow=true;ru.add(r)}
 const stump=new T.Mesh(new T.CylinderGeometry(k?1.4:1.05,k?1.6:1.25,.55,k?4:12),dark);stump.position.y=.27;if(k)stump.rotation.y=Math.PI/4;ru.add(stump);
 ru.position.copy(g.position);ru.visible=false;S3.dyn.add(ru);v.ruin=ru;
 return v}
function cannonModel(tm,s){const g=new T.Group(),wood=pbr('planks',.6,.6,{color:'#7a5232'}),iron=new T.MeshStandardMaterial({color:'#3a3d44',metalness:.9,roughness:.38});
 const base=new T.Mesh(new T.BoxGeometry(.9,.32,1.05),wood);base.position.y=.3;g.add(base);
 for(const sx of[-.5,.5])for(const sz of[-.3,.32]){const w=new T.Mesh(new T.CylinderGeometry(.24,.24,.12,14),wood);w.rotation.z=Math.PI/2;w.position.set(sx,.24,sz);g.add(w)}
 const yaw=new T.Group();yaw.position.y=.55;g.add(yaw);const pitch=new T.Group();yaw.add(pitch);
 const barrel=new T.Mesh(new T.CylinderGeometry(.16,.22,1.25,14),iron);barrel.rotation.x=Math.PI/2;barrel.position.z=.42;pitch.add(barrel);
 const ring=new T.Mesh(new T.TorusGeometry(.17,.045,8,16),iron);ring.position.z=1.03;pitch.add(ring);
 const ball=new T.Mesh(new T.SphereGeometry(.24,14,10),iron);ball.position.z=-.18;pitch.add(ball);
 const flag=new T.Mesh(new T.BoxGeometry(.5,.1,.3),new T.MeshStandardMaterial({color:TEAM[tm].m,roughness:.7}));flag.position.set(0,.47,-.05);g.add(flag);
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.scale.setScalar(s);g.userData={yaw,pitch,barrel};return g}

/* ---------- экземпляры персонажей ---------- */
function r3Inst(key,tm){const tpl=bake(key,tm),root=T3.SkeletonUtils.clone(tpl);root.scale.copy(tpl.scale);
 const mixer=new T.AnimationMixer(root),V=tpl.userData.V,acts={};
 const act=n=>{if(!acts[n]){const c=(V.q&&A3.clips[V.q+'/'+n])||A3.clips[n];if(!c)return null;acts[n]=mixer.clipAction(c)}return acts[n]};
 const u={root,mixer,V,act,cur:null,play(n,o){o=o||{};const a=act(n);if(!a)return;if(this.cur===a&&!o.restart)return;
   a.reset();a.setLoop(o.once?T.LoopOnce:T.LoopRepeat,Infinity);a.clampWhenFinished=!!o.once;a.timeScale=o.ts||1;a.enabled=true;a.setEffectiveWeight(1);
   if(this.cur&&this.cur!==a)a.crossFadeFrom(this.cur,o.fade??.15,false);a.play();this.cur=a}};
 u.play(V.idle||'Idle');mixer.setTime(Math.random()*2);return u}

/* ---------- процедурные модели ---------- */
function procModel(key,tm){const g=new T.Group(),T0=TEAM[tm],team=new T.MeshStandardMaterial({color:T0.m,roughness:.6}),wood=pbr('planks',.6,.6,{color:'#8a5d36'});
 const iron=new T.MeshStandardMaterial({color:'#4a4e57',metalness:.85,roughness:.4}),parts={};
 if(key==='cannon')return cannonModel(tm,1.15);
 if(key==='mortar'){const g=cannonModel(tm,1.35),U=g.userData;U.pitch.rotation.x=-.9;U.barrel.scale.set(1.7,.55,1.7);U.barrel.position.z=.2;g.children[0].material=pbr('wall',1,.5,{color:'#9a9184'});g.children[0].scale.set(1.1,1.3,1.1);return g}
 if(key==='lantern'){const ln=A3.mon&&monNode('lantern');if(ln){const c=ln.clone(true);c.position.set(0,0,0);const bx=new T.Box3().setFromObject(c);c.scale.setScalar(2.2/Math.max(.01,bx.max.y-bx.min.y));g.add(c)}
  else{const p=new T.Mesh(new T.CylinderGeometry(.08,.1,1.8,8),new T.MeshStandardMaterial({color:'#2e2a26',metalness:.6,roughness:.5}));p.position.y=.9;g.add(p)}
  const glow=new T.Mesh(new T.SphereGeometry(.2,14,10),new T.MeshStandardMaterial({color:'#ffe0a0',emissive:'#ffb040',emissiveIntensity:2.6}));glow.position.y=1.72;g.add(glow);parts.glow=glow;
  const base=new T.Mesh(new T.CylinderGeometry(.45,.55,.18,12),pbr('wall',1,.5,{color:'#8d8577'}));base.position.y=.09;g.add(base)}
 if(key==='lair'){const cr=A3.mon&&monNode('crypt');if(cr){const c=cr.clone(true);c.position.set(0,0,0);const bx=new T.Box3().setFromObject(c);c.scale.setScalar(1.9/Math.max(.01,bx.max.x-bx.min.x,bx.max.z-bx.min.z));c.rotation.y=Math.PI;g.add(c)}
  else{const st=pbr('wall',1,1,{color:'#a49c8c'});const b=new T.Mesh(new T.BoxGeometry(1.7,1.2,1.5),st);b.position.y=.6;g.add(b)}
  const door=new T.Mesh(new T.BoxGeometry(.7,.85,.06),new T.MeshStandardMaterial({color:'#0e0b08',emissive:'#4cff7a',emissiveIntensity:0}));door.position.set(0,.45,.76);g.add(door);parts.door=door;
  const sk=new T.Mesh(new T.SphereGeometry(.2,12,10),new T.MeshStandardMaterial({color:'#efe6cf',roughness:.6}));sk.position.set(0,1.08,.77);g.add(sk);
  const fl=new T.Mesh(new T.BoxGeometry(.06,.9,.06),wood);fl.position.set(.7,1.6,.6);g.add(fl);const cl=new T.Mesh(new T.PlaneGeometry(.45,.3),new T.MeshStandardMaterial({color:T0.m,side:T.DoubleSide}));cl.position.set(.93,1.9,.6);g.add(cl)}
 else if(key==='ram'){const body=new T.Mesh(new T.BoxGeometry(.95,.45,1.6),wood);body.position.y=.5;g.add(body);
  const tri=new T.Shape();tri.moveTo(-.6,0);tri.lineTo(.6,0);tri.lineTo(0,.5);tri.closePath();const rg=new T.ExtrudeGeometry(tri,{depth:1.5,bevelEnabled:false});rg.translate(0,0,-.75);const roof=new T.Mesh(rg,team);roof.position.y=.72;g.add(roof);
  const log=new T.Mesh(new T.CylinderGeometry(.17,.19,2.1,10),wood);log.rotation.x=Math.PI/2;log.position.set(0,.62,.35);g.add(log);parts.log=log;
  const cap=new T.Mesh(new T.CylinderGeometry(.22,.24,.3,10),iron);cap.rotation.x=Math.PI/2;cap.position.set(0,.62,1.42);g.add(cap);parts.cap=cap;
  parts.wheels=[];for(const sx of[-.55,.55])for(const sz of[-.5,.5]){const w=new T.Mesh(new T.CylinderGeometry(.26,.26,.12,14),wood);w.rotation.z=Math.PI/2;w.position.set(sx,.26,sz);g.add(w);parts.wheels.push(w)}}
 else if(key==='spring'){const st=pbr('wall',1.6,.5,{color:'#b8b0a2'});const ring=new T.Mesh(new T.CylinderGeometry(.85,.95,.6,16,1,true),st);ring.position.y=.3;g.add(ring);
  const rim=new T.Mesh(new T.TorusGeometry(.86,.1,8,24),st);rim.rotation.x=Math.PI/2;rim.position.y=.6;g.add(rim);
  const liq=new T.Mesh(new T.CircleGeometry(.8,24),new T.MeshStandardMaterial({color:'#d07bff',emissive:'#a020f0',emissiveIntensity:1.6,roughness:.15}));liq.rotation.x=-Math.PI/2;liq.position.y=.5;g.add(liq);parts.liq=liq;
  for(const sx of[-.75,.75]){const p=new T.Mesh(new T.BoxGeometry(.1,1.2,.1),wood);p.position.set(sx,1,0);g.add(p)}
  const roof=new T.Mesh(new T.ConeGeometry(1.05,.55,4),pbr('roof',1,1,{color:T0.m}));roof.rotation.y=Math.PI/4;roof.position.y=1.85;g.add(roof);
  const drop=new T.Mesh(new T.SphereGeometry(.2,14,10),new T.MeshStandardMaterial({color:'#f0b0ff',emissive:'#c040ff',emissiveIntensity:2}));drop.scale.y=1.3;drop.position.y=1.15;g.add(drop);parts.drop=drop}
 else if(key==='airship'){const cv=document.createElement('canvas');cv.width=64;cv.height=32;const c2=cv.getContext('2d');for(let i=0;i<8;i++){c2.fillStyle=i%2?T0.m:'#f2ead8';c2.fillRect(i*8,0,8,32)}
  const tx=new T.CanvasTexture(cv);tx.colorSpace=T.SRGBColorSpace;const bal=new T.Mesh(new T.SphereGeometry(.95,20,14),new T.MeshStandardMaterial({map:tx,roughness:.55}));bal.scale.set(1,1.12,1);bal.position.y=1.15;g.add(bal);
  const bas=new T.Mesh(new T.BoxGeometry(.75,.42,.75),wood);bas.position.y=-.1;g.add(bas);
  for(const[x,z]of[[-.3,-.3],[.3,-.3],[-.3,.3],[.3,.3]]){const r=new T.Mesh(new T.CylinderGeometry(.015,.015,1,4),new T.MeshStandardMaterial({color:'#5a4228'}));r.position.set(x*1.4,.45,z*1.4);r.rotation.set(-z*.5,0,x*.5);g.add(r)}
  const bomb=new T.Mesh(new T.SphereGeometry(.18,12,8),iron);bomb.position.y=-.45;g.add(bomb);parts.bomb=bomb}
 else if(key==='bats'){const fur=new T.MeshStandardMaterial({color:'#3d3152',roughness:.8}),wing=new T.MeshStandardMaterial({color:'#5d4a7e',roughness:.7,side:T.DoubleSide});
  const b=new T.Mesh(new T.SphereGeometry(.22,12,10),fur);b.scale.set(1,1.1,.9);g.add(b);
  for(const s of[-1,1]){const e=new T.Mesh(new T.ConeGeometry(.06,.16,5),fur);e.position.set(s*.1,.24,0);g.add(e);const ey=new T.Mesh(new T.SphereGeometry(.035,6,6),new T.MeshStandardMaterial({color:'#ffde59',emissive:'#ffb000',emissiveIntensity:1.5}));ey.position.set(s*.08,.08,.18);g.add(ey)}
  const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(.62,.2);sh.lineTo(.55,-.05);sh.lineTo(.42,.02);sh.lineTo(.32,-.12);sh.lineTo(.2,-.02);sh.lineTo(0,-.15);
  const wg=new T.ShapeGeometry(sh);parts.wings=[];for(const s of[-1,1]){const w=new T.Mesh(wg,wing);w.rotation.x=-Math.PI/2;w.scale.x=s;const piv=new T.Group();piv.add(w);g.add(piv);parts.wings.push(piv)}
  const tm2=new T.Mesh(new T.BoxGeometry(.3,.04,.12),team);tm2.position.set(0,-.18,.05);g.add(tm2)}
 else if(key==='drake'){const sc=new T.MeshStandardMaterial({color:T0.m,roughness:.55}),bel=new T.MeshStandardMaterial({color:'#ffe2a0',roughness:.7}),hornM=new T.MeshStandardMaterial({color:'#fff1cc',roughness:.5}),wing=new T.MeshStandardMaterial({color:T0.l,roughness:.6,side:T.DoubleSide});
  const b=new T.Mesh(new T.SphereGeometry(.4,16,12),sc);b.scale.set(.9,.85,1.25);g.add(b);const be=new T.Mesh(new T.SphereGeometry(.3,12,10),bel);be.scale.set(.8,.7,1.1);be.position.set(0,-.12,.08);g.add(be);
  const hd=new T.Group();hd.position.set(0,.38,.55);g.add(hd);const h=new T.Mesh(new T.SphereGeometry(.26,14,12),sc);hd.add(h);const sn=new T.Mesh(new T.BoxGeometry(.28,.18,.3),sc);sn.position.set(0,-.06,.25);hd.add(sn);
  for(const s of[-1,1]){const ho=new T.Mesh(new T.ConeGeometry(.05,.24,6),hornM);ho.position.set(s*.13,.24,-.08);ho.rotation.x=-.6;hd.add(ho);const ey=new T.Mesh(new T.SphereGeometry(.045,8,6),new T.MeshStandardMaterial({color:'#fff',emissive:'#ffcc33',emissiveIntensity:.8}));ey.position.set(s*.12,.06,.18);hd.add(ey)}
  const tail=new T.Mesh(new T.ConeGeometry(.16,.9,8),sc);tail.rotation.x=-Math.PI/2-.3;tail.position.set(0,-.05,-.75);g.add(tail);
  const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(.9,.35);sh.lineTo(.8,.02);sh.lineTo(.6,.12);sh.lineTo(.5,-.08);sh.lineTo(.3,.02);sh.lineTo(0,-.25);
  const wg=new T.ShapeGeometry(sh);parts.wings=[];for(const s of[-1,1]){const w=new T.Mesh(wg,wing);w.rotation.x=-Math.PI/2;w.scale.x=s;const piv=new T.Group();piv.position.set(s*.25,.18,0);piv.add(w);g.add(piv);parts.wings.push(piv)}
  g.scale.setScalar(1.15)}
 else if(key==='colossus'||key==='pebble'){const rock=pbr('bank',.5,.5,{color:'#9a948a'}),eye=new T.MeshStandardMaterial({color:'#fff',emissive:T0.m,emissiveIntensity:2.4});
  const lump=(r,x,y,z)=>{const geo=new T.IcosahedronGeometry(r,1),p=geo.attributes.position,rr=mul(Math.round((x+5)*97+(y+3)*13+z*7));for(let i=0;i<p.count;i++){const k=.82+rr()*.3;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k,p.getZ(i)*k)}geo.computeVertexNormals();
   const m=new T.Mesh(geo,rock);m.position.set(x,y,z);g.add(m);return m};
  const tor=lump(.62,0,1.25,0);tor.scale.set(1.15,1,.9);const hdd=lump(.32,0,2.02,.18);
  for(const s of[-1,1]){const e=new T.Mesh(new T.SphereGeometry(.06,8,6),eye);e.position.set(s*.13,2.05,.46);g.add(e)}
  parts.arms=[];parts.legs=[];for(const s of[-1,1]){const piv=new T.Group();piv.position.set(s*.78,1.55,0);g.add(piv);const a1=lump(.26,0,-.25,0),a2=lump(.3,0,-.75,.05);g.remove(a1,a2);piv.add(a1,a2);parts.arms.push(piv);
   const lp=new T.Group();lp.position.set(s*.32,.7,0);g.add(lp);const l1=lump(.28,0,-.4,0);g.remove(l1);lp.add(l1);parts.legs.push(lp)}
  const band=new T.Mesh(new T.TorusGeometry(.6,.06,6,16),team);band.rotation.x=Math.PI/2;band.position.y=1.0;g.add(band);
  g.scale.setScalar(key==='colossus'?.95:.55)}
 else if(key==='wisp'){const core=new T.Mesh(new T.SphereGeometry(.2,14,10),new T.MeshStandardMaterial({color:'#ffd27a',emissive:'#ff8a2a',emissiveIntensity:3}));g.add(core);parts.core=core;
  const fl=new T.Mesh(new T.ConeGeometry(.22,.6,10,1,true),new T.MeshBasicMaterial({color:'#ff9a3a',transparent:true,opacity:.7,blending:T.AdditiveBlending,depthWrite:false}));fl.position.y=.25;g.add(fl);parts.fl=fl;
  const ring=new T.Mesh(new T.TorusGeometry(.26,.03,6,16),new T.MeshBasicMaterial({color:T0.m}));ring.rotation.x=Math.PI/2;ring.position.y=-.18;g.add(ring)}
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=key!=='wisp'}});g.userData.parts=parts;if(key!=='cannon'&&key!=='lair'){const w=new T.Group();w.add(g);w.scale.setScalar(1.3);w.userData.parts=parts;return w}return g}

/* ---------- начало боя ---------- */
function r3Begin(arena){if(!R3.ready)return false;applyQual();
 if(S3.theme!==arena)buildArena(arena);
 S3.dyn.clear();S3.units=new Map();S3.blds=new Map();S3.towers=[];S3.proj=new Map();S3.fx=[];S3.dying=[];S3.decals=new Map();S3.zones=new Map();S3.pend=new Map();
 for(const t of G.T)S3.towers.push(towerView(t));
 S3.ghostKey=null;S3.zoneKey='';S3.last=performance.now();R3.on=true;return true}

/* ---------- кадр ---------- */
function r3Frame(now){const dt=Math.min(.05,(now-S3.last)/1000||0);S3.last=now;const sc=S3.scene,cam=S3.cam;
 // тряска камеры
 // конец боя: камера плавно подлетает к упавшему королю (только при победе или поражении башней)
 const kd=G.over&&G.res!==2&&!REDUCE?G.T.find(t=>t.kind==='k'&&t.hp<=0):null;S3.zk=kd?Math.min(1,(S3.zk||0)+dt/.9):Math.max(0,(S3.zk||0)-dt*3);
 const zk=S3.zk*S3.zk*(3-2*S3.zk),kx=kd?W3(kd.x):0,kz=kd?Z3(kd.y):0;
 const sh=G.shake>0&&!REDUCE?G.shake*SHAKE_K[SET.shake]*.02:0;cam.position.set(S3.cam0.x+(kx*.55-S3.cam0.x)*zk+rndV(-1,1)*sh,S3.cam0.y*(1-.4*zk)+rndV(-1,1)*sh,S3.cam0.z+(kz*.4+12-S3.cam0.z)*zk);if(zk>0)cam.lookAt(S3.look.x+(kx-S3.look.x)*zk,0,S3.look.z+(kz-S3.look.z)*zk);else cam.lookAt(S3.look);
 if(S3.water){const m=S3.water.material;for(const n of[m.normalMap,m.map])if(n){n.offset.x=(now/1000*.03)%1;n.offset.y=(now/1000*.05)%1}}
 if(S3.foam)for(const t of S3.foam){t.offset.x=(now/1000*.04)%1;t.offset.y=Math.sin(now/900)*.08}if(S3.windU)S3.windU.value=now/1000;
 syncTowers(dt,now);syncUnits(dt,now);syncBuildings(dt,now);syncProj(dt);syncFx(dt,now);syncZones(now);syncPending(now);syncGhost(now);syncParticles(dt);
 stepDebris(dt);stepLights(dt);stepNight(now);stepBridges(dt);if(S3.hype>0)S3.hype-=dt;crowdStep(now);if(Math.random()<.5)towerSmoke();weather(dt);autoQ(dt);
 if(S3.comp){S3.comp.render();if(!S3.compOk){S3.compOk=1;const gl=S3.R.getContext(),rt=S3.comp.readBuffer;S3.R.setRenderTarget(rt);const st=gl.checkFramebufferStatus(gl.FRAMEBUFFER);S3.R.setRenderTarget(null);if(st!==gl.FRAMEBUFFER_COMPLETE){console.warn('постобработка недоступна, рисую без неё');S3.comp=S3.compHi=null;S3.noComp=1;fit()}}}else S3.R.render(sc,cam);overlay(now)}

/* башни: лучники и король целятся и стреляют, павшие сменяются руинами */
function syncTowers(dt,now){for(const v of S3.towers){const t=v.t;
  if(t.hp<=0){if(v.g.visible){v.g.visible=false;v.ruin.visible=true}continue}
  const u=v.unit;u.mixer.update(dt);
  if(t.tg&&alive(t.tg)||t.tg&&t.tg.obj==='t'){const yaw=Math.atan2(Math.cos(t.ang),Math.sin(t.ang));u.root.rotation.y=lerpAng(u.root.rotation.y,yaw,dt*8);if(v.cannon){const y2=v.cannon.userData.yaw;y2.rotation.y=lerpAng(y2.rotation.y,yaw,dt*6)}}
  if(t.cd>v.cd+.3){u.play(u.V.atk[0],{once:true,restart:true,ts:1.6,fade:.05});v.shotT=.6;if(v.cannon)v.cannon.userData.barrel.position.z=.25}
  if(v.cannon){const b=v.cannon.userData.barrel;b.position.z+=(.42-b.position.z)*Math.min(1,dt*6)}
  // королевская пушка спрятана, пока король спит, и выдвигается за время наведения
  if(v.k&&v.cannon){const p=t.act?clamp(1-t.wake/CFG.tower.k.wakeAim,0,1):0;v.cannon.position.y=1.82-.75*(1-p*p*(3-2*p));v.cannon.scale.setScalar(.9*(.55+.45*p))}
  v.cd=t.cd;if(v.shotT>0){v.shotT-=dt;if(v.shotT<=0)u.play(u.V.idle||'Idle',{fade:.25})}
  if(v.k&&v.act!==t.act){v.act=t.act;if(t.act)u.play('Cheer',{once:true,ts:1.3});}
  if(v.k&&t.act&&u.cur===u.act('Cheer')&&!u.cur.isRunning())u.play('Idle',{fade:.3})}}
function lerpAng(a,b,k){let d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*Math.min(1,k)}
/* бойцы */
function unitView(u){const key=u.key,v={u,key,proc:!!PROC[key],h:HEIGHT[key]||0,yaw:u.tm?0:Math.PI,lx:IX(u),ly:IY(u),sw:0,spawn:u.spawnT>0?1:0,t:0};
 if(v.proc){v.root=procModel(key,u.tm);v.parts=v.root.userData.parts}else{v.inst=r3Inst(key,u.tm);v.root=v.inst.root;
  if(u.spawnT>0){const sp=VIS[key].spawn;if(sp){v.inst.play(sp,{once:true,ts:1.6,fade:0});v.rise=1}}}
 const ring=new T.Mesh(new T.RingGeometry(u.r/TILE*.95,u.r/TILE*1.15,24),new T.MeshBasicMaterial({color:TEAM[u.tm].m,transparent:true,opacity:.55,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;v.ring=ring;S3.dyn.add(ring);if(u.evo||u.hero){ring.material.opacity=.9;ring.scale.setScalar(1.25)}
 v.root.rotation.y=v.yaw;S3.dyn.add(v.root);if(!v.h)burst(u.x,u.y,.2,'#c9b99a',8,1.3,.7,0);return v}
function syncUnits(dt,now){const seen=new Set();
 for(const u of G.U){let v=S3.units.get(u);if(!v){v=unitView(u);S3.units.set(u,v)}seen.add(u);
  const ux=IX(u),uy=IY(u),X=W3(ux),Z=Z3(uy),dx=ux-v.lx,dy=uy-v.ly,moved=Math.hypot(dx,dy);v.lx=ux;v.ly=uy;
  // направление движения сглаживается, чтобы толчки соседей не дёргали поворот
  v.vx=(v.vx||0)*.85+dx*.15;v.vy=(v.vy||0)*.85+dy*.15;
  let y=v.h?v.h+Math.sin(now/300+u.id)*.12:0;
  if(u.spawnT>0&&!v.rise&&!REDUCE){const p=u.spawnT/.3;y+=p*p*3}
  y+=jumpH(u)/TILE*1.1;
  v.root.position.set(X,y,Z);
  const hid=!!(G.vis&&u.tm===1&&!G.vis[0].has(u));if(hid!==!!v.hid){v.hid=hid;v.ring.visible=!hid;v.root.traverse(o=>{if(!o.isMesh)return;if(hid){o.userData.m0=o.material;o.material=S3.silMat||o.material}else if(o.userData.m0){o.material=o.userData.m0}})}
  // реакция на удар: короткое «сплющивание» и искры (сильнее на тяжёлых ударах)
  if(u.spawnT>0)v.wasSp=1;else if(v.wasSp){v.wasSp=0;if(u.mass>=8&&!u.fly){v.hitT=.22;v.heavy=1;burst(u.x,u.y,.3,'#cdbf9f',10,1.6,.5,0)}}
  if(u.fl>.07&&!(v.hitT>0)){v.hitT=.12;const hv=u.mx>1500;for(let i=0;i<(hv?7:4);i++)S3.parts.add.emit(X+rndV(-.25,.25),y+.6+(v.h?0:.4)+rndV(0,.5),Z+rndV(-.25,.25),rndV(-1.4,1.4),rndV(.6,2),rndV(-1.4,1.4),u.shield>0?(i%2?'#cfe8ff':'#8fc4ff'):i%2?'#ffffff':'#ffd27a',hv?.32:.24,.28)}
  if(v.hitT>0){v.hitT-=dt;const q=Math.max(0,v.hitT)/(v.heavy?.22:.12);const sq=1-(v.heavy?.2:.12)*q;if(v.hitT<=0)v.heavy=0;v.root.scale.y=(v.sy||(v.sy=v.root.scale.y))*sq;v.root.scale.x=(v.sx0||(v.sx0=v.root.scale.x))*(1+.08*q);v.root.scale.z=(v.sz0||(v.sz0=v.root.scale.z))*(1+.08*q)}
  else if(v.sy){v.root.scale.set(v.sx0,v.sy,v.sz0)}v.ring.position.set(X,.03,Z);
  // поворот: к цели, если бьёт, иначе по ходу
  let want=v.yaw;if(u.tg&&u.lock&&(alive(u.tg)||u.tg.obj==='t'))want=Math.atan2(u.tg.x-u.x,u.tg.y-u.y);else if(Math.hypot(v.vx,v.vy)>.06)want=Math.atan2(v.vx,v.vy);
  v.yaw=lerpAng(v.yaw,want,dt*10);v.root.rotation.y=v.yaw;
  const still=u.frozenT>0||u.stunT>0,rage=u.rageT>0?1.35:1;
  if(v.inst){const I=v.inst,V=I.V;I.mixer.timeScale=still?0:rage*(u.slowT>0?1-u.slowF:1);
   if(u.sw>v.sw+.1&&!still){I.play(V.atk[(v.t++)%V.atk.length],{once:true,restart:true,ts:1.25,fade:.1});v.atkT=.55}
   v.sw=u.sw;if(v.atkT>0)v.atkT-=dt;
   if(!(v.atkT>0)&&!(v.rise&&I.cur&&I.cur.isRunning())){v.rise=0;const spd=moved/Math.max(dt,1e-3);
    if(spd>3)I.play(V.move||'Walking_A',{ts:clamp(spd/(V.move==='Running_A'||V.move==='Running_B'?60:38)*(V.walk||1),.5,2.2)});else I.play(V.idle||'Idle',{fade:.25})}
   I.mixer.update(dt)}
  else procAnim(v,u,dt,now,moved,still);
  // заморозка и ярость видны по цвету кольца
  if(u.c.light&&Math.random()<.45)S3.parts.add.emit(X+rndV(-.25,.25),1.05+rndV(0,.2),Z+rndV(-.15,.15),0,.9,0,['#ffb040','#ff7a1a','#ffe08a'][Math.random()*3|0],.22,.35);
  if(u.dashing)for(let i=0;i<2;i++)S3.parts.add.emit(X+rndV(-.2,.2),.5+rndV(0,.6),Z+rndV(-.2,.2),0,.3,0,'#c8f0ff',.35,.3);
  if(u.charging&&moved>.05&&Math.random()<.6)S3.parts.norm.emit(X+rndV(-.3,.3),.15,Z+rndV(-.3,.3),0,.5,0,'#b8a07a',.45,.7);
  v.ring.material.color.set(still&&u.frozenT>0?'#bfe9ff':u.rageT>0?'#ff5a8a':u.evo?'#c77dff':u.hero?'#ffd84d':TEAM[u.tm].m);
  if((u.evo||u.hero)&&Math.random()<dt*6)S3.parts.add.emit(X+rndV(-.4,.4),.2+rndV(0,1),Z+rndV(-.4,.4),0,.6,0,u.evo?'#c77dff':'#ffd84d',.22,.7)}
 for(const[u,v]of S3.units)if(!seen.has(u)){S3.units.delete(u);dieView(v)}
 for(const v of S3.dying){v.d+=dt;
  if(v.dis){const k=Math.max(0,1-v.d/.45);v.root.scale.set(v.s0*(.4+.6*k),v.s0*(1+.5*(1-k)),v.s0*(.4+.6*k));v.root.position.y+=dt*1.2;if(Math.random()<.7)S3.parts.add.emit(v.root.position.x+rndV(-.3,.3),v.root.position.y+.4,v.root.position.z+rndV(-.3,.3),0,1.2,0,'#e8e0cb',.16,.5);if(v.d>.45){S3.dyn.remove(v.root);v.dead=1}continue}
  if(v.inst)v.inst.mixer.update(dt);if(v.d>1.1)v.root.position.y-=dt*.8;if(v.d>2.4){S3.dyn.remove(v.root);v.dead=1}}
 S3.dying=S3.dying.filter(v=>!v.dead)}
function dieView(v){S3.dyn.remove(v.ring);v.d=0;burst(v.u.x,v.u.y,.6+v.h,'#cfc5b0',8,1,.6,v.h);if(v.inst&&!v.u.nodeath){v.inst.mixer.timeScale=1;v.inst.play(v.inst.V.death||(Math.random()<.5?'Death_A':'Death_B'),{once:true,ts:1.4,fade:.05});S3.dying.push(v)}
 else if(v.proc&&!v.u.nodeath&&qualKey()!=='eco'){v.s0=v.root.scale.x;v.dis=1;S3.dying.push(v);burst(v.u.x,v.u.y,.6+v.h,'#cfc5b0',10,1.2,.9,v.h)}
 else{S3.dyn.remove(v.root);burst(v.u.x,v.u.y,.6+v.h,'#cfc5b0',10,1.2,.9,v.h)}}
function procAnim(v,u,dt,now,moved,still){const p=v.parts,t=still?0:now/1000;
 if(p.wings)for(let i=0;i<2;i++)p.wings[i].rotation.z=(i?-1:1)*Math.sin(t*(u.key==='bats'?22:9))*.7;
 if(p.wheels&&moved>.01)for(const w of p.wheels)w.rotation.x+=moved/TILE/.26*(u.tm?1:-1);
 if(p.log)p.log.position.z=.35+(u.sw>0?Math.sin((1-u.sw/.28)*Math.PI)*.35:0);
 if(p.arms){const sp=moved>.01?Math.sin(t*6):0;p.arms[0].rotation.x=sp*.5;p.arms[1].rotation.x=-sp*.5+(u.sw>0?-1.2*Math.sin((1-u.sw/.28)*Math.PI):0);p.legs[0].rotation.x=-sp*.45;p.legs[1].rotation.x=sp*.45;v.root.position.y+=Math.abs(sp)*.06}
 if(p.core){const k=1+Math.sin(t*14)*.12;p.core.scale.setScalar(k);p.fl.scale.set(1,1+Math.sin(t*11)*.2,1)}
 if(p.bomb)p.bomb.visible=!(u.sw>0)}
/* строения */
function syncBuildings(dt,now){const seen=new Set();
 for(const b of G.B){let v=S3.blds.get(b);if(!v){v={b,root:procModel(b.key,b.tm)};v.root.position.set(W3(b.x),0,Z3(b.y));if(b.key==='lair')v.root.rotation.y=b.tm?Math.PI:0;S3.dyn.add(v.root);S3.blds.set(b,v);burst(b.x,b.y,.4,'#c9b99a',16,1.4,1,0)}
  seen.add(b);const sp=b.spawnT>0?b.spawnT/.3:0;v.root.scale.setScalar((b.key==='cannon'?1.15:b.key==='mortar'?1.35:1)*(1-sp*.5));
  if(b.key==='cannon'||b.key==='mortar'){const y=v.root.userData.yaw;y.rotation.y=lerpAng(y.rotation.y,Math.atan2(Math.cos(b.ang),Math.sin(b.ang)),dt*8);v.root.userData.barrel.position.z=(b.key==='mortar'?.2:.42)-b.at*.18}
  if(b.key==='lair'){const d=v.root.userData.parts.door;d.material.emissiveIntensity=b.at*2}
  if(b.key==='lantern'){const P=v.root.userData.parts;if(P&&P.glow)P.glow.material.emissiveIntensity=2.2+Math.sin(performance.now()/90)*.3+Math.sin(performance.now()/37)*.2}
  if(b.key==='spring'){const P=v.root.userData.parts;if(P&&P.drop){P.drop.position.y=1.15+Math.sin(performance.now()/300)*.08+b.at*.5;P.liq.material.emissiveIntensity=1.2+b.at*2}}}
 for(const[b,v]of S3.blds)if(!seen.has(b)){S3.blds.delete(b);S3.dyn.remove(v.root);burst(b.x,b.y,.6,'#9a8f7a',26,1.8,1.4,0)}}
/* снаряды: стрелы, болты, камни, шары огня и льда, ядра, бомбы */
function projModel(pk,tm){let m;
 if(pk==='arrow'||pk==='tower'||pk==='bolt'||pk==='dagger'){m=propClone(pk==='bolt'?'bone_arrow':'arrow',pk==='bolt'?1.6:1.3);const g=new T.Group();m.rotation.x=Math.PI/2;g.add(m);return g}
 if(pk==='bomb'){m=propClone('bomb',1.6);return m}
 const mat=pk==='orb'||pk==='flame'?new T.MeshStandardMaterial({color:'#ffcf6a',emissive:'#ff6a1a',emissiveIntensity:3}):pk==='ice'?new T.MeshStandardMaterial({color:'#dff6ff',emissive:'#5fc8ff',emissiveIntensity:1.6,roughness:.15}):pk==='stone'?flat('#8e8a83'):new T.MeshStandardMaterial({color:'#2c2f36',metalness:.9,roughness:.35});
 m=new T.Mesh(pk==='ice'?new T.OctahedronGeometry(.16):new T.SphereGeometry(pk==='stone'?.09:pk==='king'||pk==='tball'?.17:pk==='orb'?.17:.14,12,8),mat);m.castShadow=true;return m}
/* следы снарядов: цвет, размер, слой частиц, подъём, жизнь */
const TRAIL={arrow:['#efe3c4',.09,'norm',0,.2],bolt:['#cfeaff',.12,'add',0,.22],stone:['#c9bfae',.1,'norm',0,.25],bomb:['#6b6460',.2,'norm',.3,.45],ball:['#ffb347',.14,'add',0,.22],king:['#ffd27a',.16,'add',0,.25],tball:['#ffb347',.14,'add',0,.22],tower:['#ffe9a8',.1,'add',0,.18]};
function syncProj(dt){const seen=new Set();
 for(const p of G.PR){let v=S3.proj.get(p);if(!v){const fromT=!!p.tw;v={p,m:projModel(p.pk,p.tm),sx:p.x,sy:p.y,sh:fromT?(p.pk==='king'?3.6:3.4):1.1,
   tot:Math.max(1,Math.hypot(p.lx-p.x,p.ly-p.y)),arc:p.hi?4.5:p.pk==='bomb'||p.pk==='stone'?1.6:p.pk==='ball'||p.pk==='king'||p.pk==='tball'?.4:.6,px:W3(p.x),pz:Z3(p.y),py:0};S3.dyn.add(v.m);S3.proj.set(p,v)}
  seen.add(p);const rem=Math.hypot(p.lx-p.x,p.ly-p.y),k=clamp(1-rem/v.tot,0,1),eh=p.fly?2.3:.75,y=v.sh+(eh-v.sh)*k+Math.sin(k*Math.PI)*v.arc;
  const X=W3(IX(p)),Z=Z3(IY(p));v.m.position.set(X,y,Z);
  if(v.m.children.length){const d=new T.Vector3(X-v.px,y-v.py,Z-v.pz);if(d.lengthSq()>1e-6)v.m.lookAt(X+d.x,y+d.y,Z+d.z)}
  // следы: цепочка частиц между прошлой и нынешней позицией — выходит сплошная лента даже у быстрых стрел
  const TR=TRAIL[p.pk];if(TR&&qualKey()!=='eco'&&(!v.th||(v.th=!v.th)||qualKey()==='hi')){const n=Math.min(4,1+Math.ceil(Math.hypot(X-v.px,Z-v.pz)/.35));for(let i=0;i<n;i++){const f=(i+1)/n;S3.parts[TR[2]].emit(v.px+(X-v.px)*f,v.py+(y-v.py)*f,v.pz+(Z-v.pz)*f,rndV(-.05,.05),TR[3],rndV(-.05,.05),TR[0],TR[1],TR[4])}}
  v.th=!v.th;
  if(p.pk==='orb'||p.pk==='flame')S3.parts.add.emit(X,y,Z,0,.2,0,'#ff8a2a',.28,.35);
  if(p.pk==='ice')S3.parts.add.emit(X,y,Z,0,.1,0,'#9fe0ff',.2,.3);
  v.px=X;v.py=y;v.pz=Z}
 for(const[p,v]of S3.proj)if(!seen.has(p)){S3.proj.delete(p);S3.dyn.remove(v.m)}}
/* эффекты из боя */
function syncFx(dt,now){for(const f of G.FX){if(f._3)continue;f._3=1;S3.fx.push(fxView(f))}
 for(const e of S3.fx){e.l+=dt;e.up(e.l/e.m);if(e.l>=e.m){if(e.o)S3.dyn.remove(e.o);e.done=1}}S3.fx=S3.fx.filter(e=>!e.done);
 for(const p of G.PT){if(p._3)continue;p._3=1;S3.parts[p.c==='#ff8a2a'||p.c==='#ffb347'||p.c==='#fff3c0'||p.c==='#ff6a1a'?'add':'norm'].emit(W3(p.x),.25+Math.random()*.3,Z3(p.y),p.vx/22,.6+Math.random()*1.2,p.vy/22,p.c,p.s*.11,p.m*1.4)}
 for(const d of G.DEC){let v=S3.decals.get(d);if(!v){if(d.l>100){const t=G.T.find(t=>Math.abs(t.x-d.x)<1&&Math.abs(t.y-d.y)<1);if(t)debris(t)}else explosion(d.x,d.y,d.r/.7);v=new T.Mesh(new T.CircleGeometry(d.r/TILE,24),new T.MeshBasicMaterial({map:S3.soft,color:'#140c06',transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4}));v.rotation.x=-Math.PI/2;v.position.set(W3(d.x),.021,Z3(d.y));S3.dyn.add(v);S3.decals.set(d,v)}
  v.material.opacity=Math.min(.7,d.l*.25)}
 for(const[d,v]of S3.decals)if(d.l<=0||!G.DEC.includes(d)){S3.dyn.remove(v);S3.decals.delete(d)}}
function fxView(f){const e={l:0,m:f.m||.4,o:null,up(){}},X=W3(f.x||0),Z=Z3(f.y||0);
 switch(f.k){
  case 'flashfx':{if(qualKey()==='eco')break;const r=f.r/TILE,A=S3.parts.add;for(let i=0;i<26;i++){const a=Math.random()*6.28,s=1+Math.random()*3;A.emit(X,.6,Z,Math.cos(a)*s,1.5+Math.random()*2.5,Math.sin(a)*s,i%3?'#fff6c0':'#ffffff',.3,.6)}
   const o=new T.Mesh(new T.RingGeometry(.7,1,48),new T.MeshBasicMaterial({color:'#fff6c0',transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));o.rotation.x=-Math.PI/2;o.position.set(X,.1,Z);S3.dyn.add(o);e.o=o;
   e.up=t=>{const s=r*.4+r*1.3*t;o.scale.set(s,s,s);o.material.opacity=(1-t)**1.5};break}
  case 'gravefx':{if(qualKey()==='eco'){burst(f.x,f.y,.4,'#4a3a52',6,1,.3,0);break}burst(f.x,f.y,.5,'#5b4a62',10,1.4,.34,0);burst(f.x,f.y,.3,'#8a7a70',8,1.1,.26,0);
   const m=new T.Mesh(new T.SphereGeometry(.34,10,6),new T.MeshStandardMaterial({color:'#3a2c2c',roughness:1}));m.scale.y=.4;m.position.set(X,0,Z);S3.dyn.add(m);e.o=m;
   e.up=t=>{m.position.y=-.1+Math.sin(Math.min(1,t*1.4)*Math.PI)*.18;const s=1-Math.max(0,t-.6)/.4;m.scale.set(s,.4*s,s)};break}
  case 'bridge':{const bx=BR[f.i];for(let i=0;i<22;i++){const a=Math.random()*6.28,s=Math.random()*2.4;S3.parts.norm.emit(W3(bx)+Math.cos(a)*.8,.3,Z3(RY)+Math.sin(a)*.5,Math.cos(a)*s,2+Math.random()*3,Math.sin(a)*s*.5,i%2?'#cfefff':'#7a5232',.22,1.1)}
   for(let i=0;i<10;i++)S3.parts.add.emit(W3(bx)+rndV(-1,1),.2,Z3(RY)+rndV(-.5,.5),rndV(-.6,.6),3+Math.random()*3,rndV(-.4,.4),'#e8f8ff',.18,.8);break}
  case 'sky':{const el=document.getElementById('skyfx');if(!el)break;el.className=f.n===1?'ecl':'dwn';
   e.up=t=>{const a=Math.min(1,t*f.m/1.6,(1-t)*f.m/1.6);el.style.opacity=Math.max(0,a).toFixed(2)};break}
  case 'ring':{const o=new T.Mesh(new T.RingGeometry(.86,1,40),new T.MeshBasicMaterial({color:f.c,transparent:true,depthWrite:false,side:T.DoubleSide}));o.rotation.x=-Math.PI/2;o.position.set(X,.06,Z);S3.dyn.add(o);e.o=o;const r=f.r/TILE;
   e.up=t=>{const s=r*(.25+.75*t);o.scale.set(s,s,s);o.material.opacity=1-t};break}
  case 'meteor':{const o=new T.Mesh(new T.SphereGeometry(.38,16,12),new T.MeshStandardMaterial({color:'#ffd27a',emissive:'#ff6a1a',emissiveIntensity:4}));S3.dyn.add(o);e.o=o;const X2=W3(f.x2),Z2=Z3(f.y2);
   e.up=t=>{const x=X+(X2-X)*t,z=Z+(Z2-Z)*t,y=3.6*(1-t)+Math.sin(t*Math.PI)*3.2+.3;o.position.set(x,y,z);S3.parts.add.emit(x,y,z,0,.4,0,'#ff8a2a',.55,.45);S3.parts.norm.emit(x,y,z,0,.6,0,'#5a4a40',.4,.7)};break}
  case 'rain':{const o=propClone('arrow',1.4),g=new T.Group();o.rotation.x=Math.PI/2;g.add(o);g.visible=false;S3.dyn.add(g);e.o=g;e.m=f.m-f.l;const X2=W3(f.x2),Z2=Z3(f.y2);g.lookAt(0,-1,0);
   e.up=t=>{g.visible=true;const y=6*(1-t);g.position.set(X2+(1-t)*.8,y+.1,Z2-(1-t)*.6);g.rotation.set(-Math.PI/2+.25,0,0)};break}
  case 'zapring':{const o=new T.Mesh(new T.RingGeometry(.8,1,40),new T.MeshBasicMaterial({color:'#bfe6ff',transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));o.rotation.x=-Math.PI/2;o.position.set(X,.08,Z);S3.dyn.add(o);e.o=o;const r=f.r/TILE;
   for(let i=0;i<14;i++){const a=Math.random()*6.28,d=Math.random()*r;S3.parts.add.emit(X+Math.cos(a)*d,.3,Z+Math.sin(a)*d,0,1.5,0,'#bfe6ff',.3,.3)}
   e.up=t=>{const s=r*(.6+.4*t);o.scale.set(s,s,s);o.material.opacity=1-t};break}
  case 'swirl':{const o=new T.Mesh(new T.TorusGeometry(f.r/TILE*.85,.05,6,40,Math.PI*1.3),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,depthWrite:false}));o.rotation.x=-Math.PI/2;o.position.set(X,.7,Z);S3.dyn.add(o);e.o=o;
   e.up=t=>{o.rotation.z=t*7;o.material.opacity=.85*(1-t)};break}
  case 'bolt':{const o=boltMesh(W3(f.x),1.4,Z3(f.y),W3(f.x2),1.0,Z3(f.y2));S3.dyn.add(o);e.o=o;e.up=t=>{o.material.opacity=1-t};break}
  case 'slash':{for(let i=0;i<5;i++)S3.parts.add.emit(X,.9,Z,rndV(-2,2),rndV(.5,2.5),rndV(-2,2),'#fff3c0',.12,.25);const o=new T.Mesh(new T.TorusGeometry(.42,.035,4,20,Math.PI*.9),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,depthWrite:false}));o.position.set(X,.9,Z);o.rotation.set(-.6,f.a,f.a);S3.dyn.add(o);e.o=o;
   e.up=t=>{o.material.opacity=1-t;o.rotation.z=f.a+t*1.2};break}
  case 'soul':{const o=new T.Sprite(new T.SpriteMaterial({map:S3.soft,color:f.c,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));o.position.set(X,.8,Z);S3.dyn.add(o);e.o=o;
   e.up=t=>{o.position.y=.8+t*1.8;o.scale.setScalar((.5+t*.6)*f.s);o.material.opacity=.9*(1-t)};break}}
 return e}
function boltMesh(x1,y1,z1,x2,y2,z2){const pts=[],n=7;for(let i=0;i<=n;i++){const t=i/n,j=i&&i<n?.18:0;pts.push(new T.Vector3(x1+(x2-x1)*t+rndV(-j,j),y1+(y2-y1)*t+rndV(-j,j),z1+(z2-z1)*t+rndV(-j,j)))}
 const g=new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,.035,5,false);return new T.Mesh(g,new T.MeshBasicMaterial({color:'#dff4ff',transparent:true,blending:T.AdditiveBlending,depthWrite:false}))}
/* зоны заклинаний на земле */
function syncZones(now){const seen=new Set();for(const z of G.Z){if(z.k==='glow')continue;seen.add(z);let v=S3.zones.get(z);
  if(z.k==='roll'){if(!v){v=new T.Group();const L=spellModel('roller',0);L.scale.set(z.r/TILE*1.05,1,1);v.add(L);v.userData.L=L;S3.dyn.add(v);S3.zones.set(z,v)}
   const back=Math.min(z.spd*TICK,z.spd*TICK)*(1-ALPHA),ry=z.y-z.dir*back;v.position.set(W3(z.x),.45,Z3(ry));v.userData.L.rotation.x=-(z.ang-back/12)*z.dir;
   if(Math.random()<.8)S3.parts.norm.emit(W3(z.x)+rndV(-1,1)*z.r/TILE,.1,Z3(ry)-z.dir*.4,rndV(-.3,.3),.6,-z.dir*.6,'#b9a27e',.35,.5);continue}
  if(!v){const col={freeze:'#bfe9ff',rage:'#ff4f86',poison:'#7ee05a',aura:'#ffd84d',pull:'#9fd0ff',heal:'#4fdc7c',grave:'#7a55b0',flash:'#fff2b0',shade:'#140a26',crater:'#24160a'}[z.k];
   v=new T.Mesh(new T.CircleGeometry(1,40),new T.MeshBasicMaterial({map:S3.soft,color:col,transparent:true,depthWrite:false,blending:z.k==='poison'||z.k==='heal'||z.k==='grave'||z.k==='shade'||z.k==='crater'?T.NormalBlending:T.AdditiveBlending}));v.rotation.x=-Math.PI/2;S3.dyn.add(v);S3.zones.set(z,v);
   if(z.k==='freeze'){v.userData.ice=iceCrystals(z);S3.dyn.add(v.userData.ice)}
   if(z.k==='pull'||z.k==='heal'||z.k==='grave'||z.k==='shade'){const sw=new T.Group(),m=new T.MeshBasicMaterial({color:z.k==='pull'?'#e4f3ff':z.k==='grave'?'#9a6ae0':z.k==='shade'?'#8a6ae8':'#2fbf62',transparent:true,opacity:.8,blending:z.k==='pull'?T.AdditiveBlending:T.NormalBlending,depthWrite:false,side:T.DoubleSide});
    for(let i=0;i<(z.k==='pull'?3:1);i++){const ar=new T.Mesh(z.k==='pull'?new T.RingGeometry(.55+i*.17,.62+i*.17,40,1,i*2.1,3.4):new T.RingGeometry(.93,1,48),m);ar.rotation.x=-Math.PI/2;ar.position.y=.09+i*.01;sw.add(ar)}
    if(z.k==='grave')for(let i=0;i<4;i++){const ts=spellModel('grave',0);const R=z.r/TILE;ts.scale.set(.55/R,.55,.55/R);const a=i*1.7+.4,d=.35+(i%2)*.3;ts.position.set(Math.cos(a)*d,.3,Math.sin(a)*d);ts.rotation.y=rndV(-.4,.4);sw.add(ts)}
    sw.userData.m=m;v.userData.sw=sw;S3.dyn.add(sw)}}
  if(v.userData.sw){const sw=v.userData.sw,s=z.r/TILE*(z.k==='pull'?1-.25*(1-z.t/z.tot):1+.04*Math.sin(now/120));sw.scale.set(s,1,s);sw.position.set(W3(z.x),0,Z3(z.y));sw.rotation.y=z.k==='pull'?now/140:0;sw.userData.m.opacity=.8*Math.min(1,z.t/.3)}
  if(v.userData.ice){const k=Math.min(1,(z.tot-z.t)/.25,z.t/.4);v.userData.ice.scale.setScalar(Math.max(.01,k))}
  if(z.k==='pull')for(let i=0;i<3;i++){const an=now/120+i*2.09+Math.random()*.5,d=(.3+Math.random()*.7)*z.r/TILE;S3.parts.add.emit(W3(z.x)+Math.cos(an)*d,.2+Math.random()*1.4,Z3(z.y)+Math.sin(an)*d,-Math.sin(an)*4-Math.cos(an)*2,.8,Math.cos(an)*4-Math.sin(an)*2,'#cfe8ff',.3,.4)}
  if(z.k==='heal'&&Math.random()<.7){const an=Math.random()*6.28,d=Math.sqrt(Math.random())*z.r/TILE;S3.parts.add.emit(W3(z.x)+Math.cos(an)*d,.2,Z3(z.y)+Math.sin(an)*d,0,1.6,0,'#9dffb8',.3,.7)}
  if(z.k==='poison'&&Math.random()<.6){const an=Math.random()*6.28,d=Math.sqrt(Math.random())*z.r/TILE;S3.parts.norm.emit(W3(z.x)+Math.cos(an)*d,.4,Z3(z.y)+Math.sin(an)*d,rndV(-.2,.2),.25,rndV(-.2,.2),['#6fcf4a','#3f8a2a','#9be86a'][Math.random()*3|0],.9,1.8)}
  const r=z.r/TILE,a=Math.min(1,z.t/.4,(z.tot-z.t)/.2+.2);v.scale.set(r,r,r);v.position.set(W3(z.x),.07,Z3(z.y));v.material.opacity=(z.k==='poison'?.55:.6)*a*(z.k==='rage'?.75+.25*Math.sin(now/150):1);
  if(Math.random()<.5){const an=Math.random()*6.28,d=Math.sqrt(Math.random())*r,c={freeze:'#e8f8ff',rage:'#ff7aa2',poison:'#a8ff7a',aura:'#ffe27a',pull:'#e4f3ff',heal:'#3fd46f',grave:'#b48cff',flash:'#fff6c0',shade:'#3a2560',crater:'#6a5440'}[z.k];
   S3.parts[z.k==='poison'||z.k==='heal'||z.k==='grave'||z.k==='shade'||z.k==='crater'?'norm':'add'].emit(W3(z.x)+Math.cos(an)*d,.2,Z3(z.y)+Math.sin(an)*d,0,z.k==='freeze'?-.3:.9,0,c,z.k==='poison'?.5:.22,1)}}
 for(const[z,v]of S3.zones)if(!seen.has(z)){S3.zones.delete(z);S3.dyn.remove(v);if(v.userData.sw)S3.dyn.remove(v.userData.sw);if(v.userData.ice){S3.dyn.remove(v.userData.ice);burst(z.x,z.y,.5,'#e8f8ff',20,1.6,.6,0)}}}
/* карты в пути: полупрозрачный призрак и кольцо отсчёта (в слое поверх) */
function ghostModel(key,tm){const c=CARDS[key],vk=c.unit||key,id=vk+tm;if(A3.ghost[id])return T3.SkeletonUtils.clone(A3.ghost[id]);
 let m;if(PROC[vk]||c.type==='building')m=procModel(vk,tm);else{const tpl=bake(vk,tm);m=T3.SkeletonUtils.clone(tpl);m.scale.copy(tpl.scale)}
 m.traverse(o=>{if(o.userData.outline){o.visible=false;return}if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.45;o.material.depthWrite=false;o.castShadow=false}});
 const w=new T.Group();if(HEIGHT[vk])m.position.y=HEIGHT[vk];w.add(m);A3.ghost[id]=w;return T3.SkeletonUtils.clone(w)}
function syncPending(now){const seen=new Set();for(const d of G.D){seen.add(d);let v=S3.pend.get(d);
  if(!v){v=new T.Group();const c=CARDS[d.key];if(!c.tunnel){for(const[px,py]of formation(d.key,d.x,d.y)){const m=ghostModel(d.key,d.tm);m.position.x=W3(px);m.position.z=Z3(py);m.rotation.y=d.tm?0:Math.PI;v.add(m)}}
   else{const mound=new T.Mesh(new T.SphereGeometry(.35,10,8,0,6.28,0,1.4),pbr('path',.4,.4));mound.scale.y=.5;v.add(mound);v.userData.mound=mound}
   S3.dyn.add(v);S3.pend.set(d,v)}
  if(v.userData.mound){const tun=d.tun||0,el=d.tot-d.t,k=tun?Math.min(1,el/tun):1;v.userData.mound.position.set(W3(d.sx+(d.x-d.sx)*k),.02,Z3(d.sy+(d.y-d.sy)*k));if(Math.random()<.4)S3.parts.norm.emit(v.userData.mound.position.x,.2,v.userData.mound.position.z,rndV(-.5,.5),.9,rndV(-.5,.5),'#7a5a3c',.22,.6)}}
 for(const[d,v]of S3.pend)if(!seen.has(d)){S3.pend.delete(d);S3.dyn.remove(v)}}
/* выбранная карта: подсветка зон, призрак на месте касания, радиус */
function syncGhost(now){const key=sel!=null&&mode==='play'&&G&&!G.over?G.side[0].hand[sel]:null;
 if(key!==S3.ghostKey){if(S3.ghost)S3.dyn.remove(S3.ghost);S3.ghost=null;S3.ghostKey=key;
  if(key){const c=CARDS[key],g=new T.Group();
   if(c.type==='spell'){const d=new T.Mesh(new T.CircleGeometry(c.rad,48),new T.MeshBasicMaterial({map:S3.soft,color:'#ffe9a8',transparent:true,opacity:.55,depthWrite:false}));d.rotation.x=-Math.PI/2;d.position.y=.08;g.add(d);
    const r=new T.Mesh(new T.RingGeometry(c.rad*.96,c.rad,64),new T.MeshBasicMaterial({color:'#ffe9a8',transparent:true,opacity:.9,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.y=.09;g.add(r);
    if(c.roll){d.visible=r.visible=false;const p=new T.Mesh(new T.PlaneGeometry(c.rad*2,c.roll.len),new T.MeshBasicMaterial({color:'#ffe9a8',transparent:true,opacity:.35,depthWrite:false}));p.rotation.x=-Math.PI/2;p.position.set(0,.08,-c.roll.len/2);g.add(p)}}
   else{for(const[px,py]of formation(key,0,0)){const m=ghostModel(key,0);m.position.x=px/TILE;m.position.z=py/TILE;m.rotation.y=Math.PI;g.add(m)}
    if(c.rng>=3){const r=new T.Mesh(new T.RingGeometry(c.rng-.04,c.rng+.04,64),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.5,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.y=.08;g.add(r)}}
   const ok=new T.Mesh(new T.RingGeometry(.55,.68,32),new T.MeshBasicMaterial({color:'#9cffb8',transparent:true,depthWrite:false}));ok.rotation.x=-Math.PI/2;ok.position.y=.09;g.add(ok);g.userData.ok=ok;
   S3.ghost=g;S3.dyn.add(g)}}
 // зоны выставления
 const zk=key&&CARDS[key].type!=='spell'?key+'|'+(CARDS[key].tunnel?1:0)+pocketOpen(0,10)+pocketOpen(0,W-10):'';
 if(zk!==S3.zoneKey){S3.zoneKey=zk;if(S3.zoneMesh){S3.dyn.remove(S3.zoneMesh);S3.zoneMesh=null}
  if(zk){const cv=document.createElement('canvas');cv.width=180;cv.height=320;const g=cv.getContext('2d');g.scale(.5,.5);g.fillStyle='rgba(255,70,60,.38)';const c=CARDS[key];
   if(c.tunnel)g.fillRect(0,RY-RIV-3,W,2*RIV+6);else for(const left of[1,0]){const x0=left?0:W/2,open=pocketOpen(0,left?10:W-10);if(open){g.fillRect(x0,0,W/2,POCKET_Y);g.fillRect(x0,RY-RIV-3,W/2,2*RIV+6)}else g.fillRect(x0,0,W/2,RY+RIV+3)}
   const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(18,32),new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.1;S3.zoneMesh=m;S3.dyn.add(m)}}
 if(S3.zoneMesh)S3.zoneMesh.material.opacity=.75+.25*Math.sin(now/260);
 if(S3.ghost){const vis=gx>=0;S3.ghost.visible=vis;if(vis){const c=CARDS[key],okk=canPlace(0,key,gx,gy)&&!cardBlocked(0,key)&&G.side[0].el>=c.cost;S3.ghost.position.set(W3(gx),HEIGHT[c.unit||key]&&c.type!=='spell'?0:0,Z3(gy));
  S3.ghost.userData.ok.material.color.set(okk?'#9cffb8':'#ff8a7d');S3.ghost.traverse(o=>{if(o.isMesh&&o.material.opacity!==undefined&&o!==S3.ghost.userData.ok&&c.type!=='spell')o.material.opacity=okk?.5:.22})}}}

/* ---------- частицы: дым, пыль, искры ---------- */
function particles(){const mk=(blend)=>{const N=1400,geo=new T.BufferGeometry(),pos=new Float32Array(N*3),col=new Float32Array(N*4),siz=new Float32Array(N);
  geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('color',new T.BufferAttribute(col,4));geo.setAttribute('size',new T.BufferAttribute(siz,1));
  const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:blend,uniforms:{map:{value:null},px:{value:600}},
   vertexShader:'attribute float size;attribute vec4 color;varying vec4 vC;uniform float px;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*px/-mv.z;gl_Position=projectionMatrix*mv;}',
   fragmentShader:'varying vec4 vC;void main(){vec2 d=gl_PointCoord-.5;float a=smoothstep(.5,.1,length(d));gl_FragColor=vec4(vC.rgb,vC.a*a);}'});
  const pts=new T.Points(geo,mat);pts.frustumCulled=false;const P=[],free=[];for(let i=0;i<N;i++)free.push(i);
  const C=new T.Color();
  return{pts,P,emit(x,y,z,vx,vy,vz,c,size,life){if(!free.length||(REDUCE||SET.fx==='low')&&Math.random()<.6)return;const i=free.pop();C.set(c);P.push({i,x,y,z,vx,vy,vz,r:C.r,g:C.g,b:C.b,s:size,l:0,m:life})},
   step(dt){let w=0;for(const p of P){p.l+=dt;if(p.l>=p.m){free.push(p.i);siz[p.i]=0;continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=(blend===T.AdditiveBlending?.2:.9)*dt;p.vx*=.97;p.vz*=.97;
     const k=p.l/p.m;pos[p.i*3]=p.x;pos[p.i*3+1]=Math.max(.02,p.y);pos[p.i*3+2]=p.z;col[p.i*4]=p.r;col[p.i*4+1]=p.g;col[p.i*4+2]=p.b;col[p.i*4+3]=(1-k)*(blend===T.AdditiveBlending?1:.8);siz[p.i]=p.s*(1+k*1.4);P[w++]=p}
    P.length=w;geo.attributes.position.needsUpdate=geo.attributes.color.needsUpdate=geo.attributes.size.needsUpdate=true}}};
 return{add:mk(T.AdditiveBlending),norm:mk(T.NormalBlending)}}
function syncParticles(dt){const px=S3.R.domElement.height*.9;S3.parts.add.pts.material.uniforms.px.value=px;S3.parts.norm.pts.material.uniforms.px.value=px;S3.parts.add.step(dt);S3.parts.norm.step(dt)}
function burst(x,y,h,col,n,sp,size,hh){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=Math.random()*sp;S3.parts.norm.emit(W3(x)+Math.cos(a)*.2,(hh||0)+.2+Math.random()*h,Z3(y)+Math.sin(a)*.2,Math.cos(a)*s,.6+Math.random()*sp,Math.sin(a)*s,col,size*(.6+Math.random()*.6),.8+Math.random()*.7)}}

/* ---------- слой поверх 3D: полосы здоровья, надписи, эмоции ---------- */
const _p=()=>new T.Vector3();let PV=null;
function proj(x,y,h){if(!PV)PV=new T.Vector3();PV.set(W3(x),h,Z3(y)).project(S3.cam);return[(PV.x+1)/2*C.width,(1-PV.y)/2*C.height]}
function overlay(now){const g=X,k=C.height/640;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,C.width,C.height);
 const bar=(sx,sy,w,p,tm,gold)=>{w*=k;rr(g,sx-w/2-k,sy-3*k,w+2*k,6*k,3*k,gold?'#ffd84d':'rgba(5,8,20,.8)');rr(g,sx-w/2,sy-2*k,Math.max(0,w*p),4*k,2*k,tm?'#ff6a5a':'#4cd37a')};
 for(const b of G.B){const[sx,sy]=proj(b.x,b.y,1.9);bar(sx,sy,28,b.hp/b.mx,b.tm)}
 for(const b of G.bridges||[]){if(b.down<=0&&b.hp>=b.mx)continue;const[sx,sy]=proj(b.x,RY,1.2),w=34*k,p=b.down>0?1-b.down/CFG.bridge.down:b.hp/b.mx;rr(g,sx-w/2-k,sy-3*k,w+2*k,6*k,3*k,'rgba(5,8,20,.8)');rr(g,sx-w/2,sy-2*k,w*p,4*k,2*k,b.down>0?'#9fd8ff':b.fl>0?'#ffffff':'#ffc83d')}
 for(const u of G.U){if(u.spawnT>0)continue;const v=S3.units.get(u),hh=(v&&v.inst?(v.inst.V.hh||2.47*v.inst.V.s*US3):1.7)+(HEIGHT[u.key]||0)+.25;
  if(G.vis&&u.tm===1&&!G.vis[0].has(u))continue;
  if(u.hp<u.mx||u.c.ability||u.shield>0){const[sx,sy]=proj(IX(u),IY(u),hh);const w=Math.max(16,u.r*2.2);bar(sx,sy,w,u.hp/u.mx,u.tm,!!u.c.ability);if(u.shield>0)rr(g,sx-w*k/2,sy-6*k,w*k*u.shield/u.smx,3*k,1.5*k,'#ffd84d')}
  if(u.stunT>0){const[sx,sy]=proj(IX(u),IY(u),hh+.3);g.save();g.scale(k,k);stars(g,sx/k,sy/k,now);g.restore()}}
 for(const t of G.T){if(t.hp<=0)continue;const[sx,sy]=proj(t.x,t.y,t.kind==='k'?(t.tm?3.9:3.6):(t.tm?3.6:3.3));g.save();g.translate(sx,sy);g.scale(k,k);towerBar(g,Object.assign({},t,{x:0,y:0,tm:t.tm,kind:t.kind,r:0}));g.restore();
  if(t.kind==='k'&&!t.act){g.save();g.scale(k,k);g.fillStyle='#fff';g.font=`800 11px ${FONT}`;g.textAlign='center';g.fillText('z',sx/k+16,sy/k+26-Math.sin(now/500)*3);g.font=`800 8px ${FONT}`;g.fillText('z',sx/k+22,sy/k+18-Math.sin(now/500+1)*3);g.restore()}}
 for(const d of G.D){const tun=d.tun||0,dep=d.tot-tun;if(d.tot-d.t<tun)continue;const left=Math.max(0,d.t),pr=1-left/dep,[sx,sy]=proj(d.x,d.y,.05);
  g.lineWidth=4*k;g.strokeStyle='rgba(0,0,0,.45)';g.beginPath();g.arc(sx,sy,11*k,0,7);g.stroke();g.strokeStyle=TEAM[d.tm].l;g.lineWidth=3*k;g.beginPath();g.arc(sx,sy,11*k,-Math.PI/2,-Math.PI/2+pr*Math.PI*2);g.stroke();
  if(dep>=2){g.fillStyle='#fff';g.font=`800 ${10*k}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(Math.ceil(left),sx,sy)}}
 drawAids(g,(x,y)=>proj(x,y,.05),k,now);
 // надписи, баннеры, эмоции: те же функции, что в 2D, но в координатах экрана
 g.save();g.scale(k,k);
 for(const x of G.TX){if(x.big)continue;const[sx,sy]=proj(x.x,x.y,2.2);x._sx=sx/k;x._sy=sy/k}
 drawTexts3(g);drawEmotes3(g);
 for(const f of G.FX)if(f.k==='crown'){const[sx,sy]=f._p||(f._p=proj(f.x,f.y,4.5));drawCrown3(g,f,sx/k,sy/k)}
 for(const f of G.CF){g.save();g.translate(f.x,f.y);g.rotate(f.r);g.globalAlpha=Math.min(1,(f.m-f.l)/.5);g.fillStyle=f.c;g.fillRect(-f.w/2,-f.w/4,f.w,f.w/2);g.restore()}g.globalAlpha=1;
 g.restore()}
function drawTexts3(g){g.textAlign='center';g.textBaseline='middle';
 for(const x of G.TX){const a=1-x.l/x.m;
  if(x.big){const sc=Math.min(1,x.l/.18),al=Math.min(1,(x.m-x.l)/.4);g.save();g.globalAlpha=al;g.translate(W/2,H*.47);g.scale(.6+.4*sc,.6+.4*sc);g.font=`400 ${x.s+8}px 'Lilita One','Russo One',${FONT}`;g.lineWidth=6;g.strokeStyle='rgba(10,12,30,.85)';g.strokeText(x.t,0,0);g.fillStyle=x.c;g.fillText(x.t,0,0);g.restore();continue}
  if(x._sx==null)continue;g.globalAlpha=Math.max(0,a);g.font=`800 ${x.s}px ${FONT}`;g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.7)';g.strokeText(x.t,x._sx,x._sy);g.fillStyle=x.c;g.fillText(x.t,x._sx,x._sy)}
 g.globalAlpha=1}
function drawEmotes3(g){const k=C.height/640;for(const e of G.EM){const kt=G.T.find(t=>t.tm===e.tm&&t.kind==='k'),[sx,sy]=proj(kt.x+(e.tm?70:-70),kt.y,e.tm?3:2.4),bx=sx/k,by=sy/k,a=Math.min(1,e.l/.15,(e.m-e.l)/.3);
 g.globalAlpha=Math.max(0,a);g.font=`800 12px ${FONT}`;const w=g.measureText(e.txt).width+20;rr(g,bx-w/2,by-13,w,26,13,e.tm?'#ffe9e6':'#e6f3ff');
 g.fillStyle='#1b2644';g.textAlign='center';g.textBaseline='middle';g.fillText(e.txt,bx,by+.5);g.globalAlpha=1}}
function drawCrown3(g,f,x0,y0){const p1=Math.min(1,f.l/.45),p2=clamp((f.l-.55)/(f.m-.55),0,1),tx=f.tm?24:W-24,ty=8,e=p2*p2*(3-2*p2),x=x0+(tx-x0)*e,y=y0-26*p1+(ty-(y0-26))*e,sc=(p1<1?p1*1.4:1.4-p2*.6)*(f.n>1?1.3:1);
 g.save();g.translate(x,y);g.scale(sc,sc);g.globalAlpha=p2>.92?(1-p2)/.08:1;g.fillStyle=f.tm?'#ff7b6b':'#ffc83d';g.strokeStyle=f.tm?'#7a1a10':'#8a5a00';g.lineWidth=1.6;
 g.beginPath();g.moveTo(-11,9);g.lineTo(-12,-5);g.lineTo(-6,0);g.lineTo(0,-10);g.lineTo(6,0);g.lineTo(12,-5);g.lineTo(11,9);g.closePath();g.fill();g.stroke();oc(g,0,-10,2,'#fff');g.restore();g.globalAlpha=1}

/* ---------- касание: луч из камеры на землю ---------- */
function r3Pick(cx,cy){const r=S3.cv.getBoundingClientRect(),nx=(cx-r.left)/r.width*2-1,ny=-((cy-r.top)/r.height*2-1);if(nx<-1||nx>1||ny<-1||ny>1)return null;
 S3.ray.setFromCamera({x:nx,y:ny},S3.cam);const p=new T.Vector3();if(!S3.ray.ray.intersectPlane(S3.plane,p))return null;
 const x=p.x*TILE+180,y=p.z*TILE+320;return x<0||x>W||y<0||y>H?null:{x,y}}
function r3Resize(cw,ch){if(!R3.ready)return;const d=Math.min(S3.q.dpr,devicePixelRatio||1,S3.q.coarse&&S3.comp?2:9);S3.R.setPixelRatio(d);S3.R.setSize(cw,ch,false);S3.cv.style.width=cw+'px';S3.cv.style.height=ch+'px';S3.cam.aspect=cw/ch;S3.cam.updateProjectionMatrix();if(S3.comp){S3.comp.setPixelRatio(d);S3.comp.setSize(cw,ch)}if(S3.sharp)S3.sharp.uniforms.px.value.set(1/(cw*d),1/(ch*d))}
/* 3D сломалось на этом устройстве: дальше только 2D, бой продолжается */
function r3Fail(why){if(R3.failed)return;R3.failed=true;R3.why=why;R3.on=false;R3.want=false;r3Stop();console.warn('3D отключено:',why);if(typeof fit==='function')fit();if(typeof toast==='function')toast('3D отключено на этом устройстве — включена упрощённая графика')}
function r3Stop(){R3.on=false;if(S3.cv)S3.cv.style.visibility='hidden'}
function r3Show(){if(S3.cv){S3.cv.style.visibility='visible';S3.cv.style.filter='contrast(1.07) saturate(1.1)'}}

/* ---------- иконки карт из 3D-моделей ---------- */
function spellModel(key){const g=new T.Group(),E=(c,e,i,o)=>new T.MeshStandardMaterial(Object.assign({color:c,emissive:e,emissiveIntensity:i,roughness:.3},o||{}));
 if(key==='fireball'){g.add(new T.Mesh(new T.SphereGeometry(.55,24,16),E('#ffb347','#ff5a10',1.3)));for(let i=0;i<9;i++){const c=new T.Mesh(new T.ConeGeometry(.22,.9,8),E('#ff9a3a','#ff3a08',1.2,{transparent:true,opacity:.85}));const a=i/9*6.28;c.position.set(Math.cos(a)*.25,.15+Math.sin(a)*.25,-.55);c.rotation.x=-Math.PI/2-.2;c.rotation.z=a*.2;g.add(c)}g.rotation.set(.5,.7,0)}
 else if(key==='volley'){for(let i=0;i<5;i++){const a=propClone('arrow',3.2),w=new T.Group();a.rotation.x=Math.PI/2;w.add(a);w.position.set(-.7+i*.35,.2+(i%2)*.35,0);w.rotation.set(Math.PI*.78,0,.15);g.add(w)}}
 else if(key==='spark'){g.add(new T.Mesh(new T.SphereGeometry(.28,16,12),E('#ffffff','#9fdcff',3)));for(let i=0;i<5;i++){const a=i/5*6.28,b=boltMesh(0,0,0,Math.cos(a)*1.1,Math.sin(a)*1.1,.2);b.material.color.set('#bfe8ff');b.geometry=new T.TubeGeometry(b.geometry.parameters.path,24,.06,5,false);g.add(b)}}
 else if(key==='freeze'){const ice=new T.MeshStandardMaterial({color:'#d8f4ff',emissive:'#3fa8ff',emissiveIntensity:.5,roughness:.08,metalness:.1,transparent:true,opacity:.88});
  for(let i=0;i<9;i++){const c=new T.Mesh(new T.OctahedronGeometry(.18+(i%3)*.12),ice);c.scale.y=2.2;const a=i/9*6.28;c.position.set(Math.cos(a)*.42*(i%2+.4),-.3+(i%3)*.12,Math.sin(a)*.3);c.rotation.z=Math.cos(a)*.5;g.add(c)}}
 else if(key==='cry'){const gold=new T.MeshStandardMaterial({color:'#e6c27a',metalness:.8,roughness:.3});const t=new T.Mesh(new T.TorusGeometry(.5,.09,10,24,Math.PI*1.1),gold);g.add(t);const m=new T.Mesh(new T.ConeGeometry(.28,.45,16,1,true),gold);m.position.set(.5,0,0);m.rotation.z=Math.PI;g.add(m);
  const r=new T.Mesh(new T.TorusGeometry(.95,.04,6,40),E('#ff6a9a','#ff2a60',2));g.add(r)}
 else if(key==='poison'){const gl=new T.MeshStandardMaterial({color:'#b8ffcf',roughness:.05,transparent:true,opacity:.45});g.add(new T.Mesh(new T.SphereGeometry(.55,24,16),gl));const liq=new T.Mesh(new T.SphereGeometry(.47,24,16,0,6.28,1.2,1.94),E('#7ee05a','#3a9a1a',1.4));g.add(liq);
  const n=new T.Mesh(new T.CylinderGeometry(.14,.16,.4,12),gl);n.position.y=.68;g.add(n);const cork=new T.Mesh(new T.CylinderGeometry(.15,.13,.16,10),flat('#8a5a32'));cork.position.y=.92;g.add(cork);
  for(let i=0;i<5;i++){const b=new T.Mesh(new T.SphereGeometry(.08+.04*(i%2),10,8),E('#a8ff7a','#4cd32a',1.5,{transparent:true,opacity:.8}));b.position.set(-.5+i*.25,.9+(i%3)*.25,.2);g.add(b)}}
 else if(key==='eclipse'){const d=new T.Mesh(new T.SphereGeometry(.5,24,16),new T.MeshStandardMaterial({color:'#05060e',roughness:.6}));g.add(d);
  const r=new T.Mesh(new T.TorusGeometry(.58,.07,10,40),E('#ffe9b0','#ffb347',3));g.add(r);const r2=new T.Mesh(new T.TorusGeometry(.78,.03,8,40),E('#b8c4ff','#7a8cff',1.6));r2.rotation.x=.5;g.add(r2)}
 else if(key==='dawn'){const s=new T.Mesh(new T.SphereGeometry(.38,20,14),E('#fff3c0','#ffc83d',3));g.add(s);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,ray=new T.Mesh(new T.ConeGeometry(.06,.34,5),E('#ffe38a','#ffb02a',2.2));ray.position.set(Math.cos(a)*.62,Math.sin(a)*.62,0);ray.rotation.z=a-Math.PI/2;g.add(ray)}}
 else if(key==='sapper'){const k=new T.Mesh(new T.CylinderGeometry(.42,.42,.8,18),new T.MeshStandardMaterial({color:'#7a5232',roughness:.8}));g.add(k);
  for(const y of[-.28,.28]){const h=new T.Mesh(new T.TorusGeometry(.43,.05,6,24),new T.MeshStandardMaterial({color:'#3a3d44',metalness:.8,roughness:.4}));h.rotation.x=Math.PI/2;h.position.y=y;g.add(h)}
  const f=new T.Mesh(new T.CylinderGeometry(.03,.03,.45,6),new T.MeshStandardMaterial({color:'#2a2a2a'}));f.position.set(.15,.6,0);f.rotation.z=-.4;g.add(f);
  const sp=new T.Mesh(new T.SphereGeometry(.09,10,8),E('#fff3c0','#ff8a1a',3));sp.position.set(.27,.82,0);g.add(sp)}
 else if(key==='flash'){const c=new T.Mesh(new T.OctahedronGeometry(.42,0),E('#fffbe0','#ffe066',3));g.add(c);
  for(let i=0;i<8;i++){const r=new T.Mesh(new T.BoxGeometry(.06,.75,.06),E('#fff6c0','#ffd84d',2.5));const a=i/8*Math.PI*2;r.position.set(Math.cos(a)*.62,Math.sin(a)*.62,0);r.rotation.z=a-Math.PI/2;g.add(r)}}
 else if(key==='shade'){const o=new T.Mesh(new T.SphereGeometry(.5,24,16),new T.MeshStandardMaterial({color:'#1a1030',roughness:.4,metalness:.2}));g.add(o);
  const m=new T.Mesh(new T.TorusGeometry(.62,.08,10,40,Math.PI*1.25),E('#c9a8ff','#7b3cff',2));m.rotation.z=Math.PI*.4;g.add(m);
  const mo=new T.Mesh(new T.TorusGeometry(.18,.06,8,24,Math.PI),E('#efe6ff','#b48cff',2.2));mo.position.set(.25,.25,.5);mo.rotation.z=-.6;g.add(mo)}
 else if(key==='roller'){const wood=pbr('planks',.6,.6,{color:'#8a5a32'});const lg=new T.Mesh(new T.CylinderGeometry(.42,.42,1.9,18),wood);lg.rotation.z=Math.PI/2;g.add(lg);
  for(const s of[-1,1]){const cap=new T.Mesh(new T.CircleGeometry(.42,18),new T.MeshStandardMaterial({color:'#e2b77a',roughness:.8}));cap.position.x=s*.951;cap.rotation.y=s*Math.PI/2;g.add(cap)}
  for(let i=0;i<6;i++){const sp=new T.Mesh(new T.ConeGeometry(.08,.3,6),new T.MeshStandardMaterial({color:'#cfd3da',metalness:.8,roughness:.3}));const a=i*1.05;sp.position.set(-.6+i*.24,Math.cos(a)*.5,Math.sin(a)*.5);sp.rotation.x=a;g.add(sp)}}
 else if(key==='grave'){const st=pbr('wall',1,.6,{color:'#9a96a8'});const t=new T.Mesh(new T.BoxGeometry(.8,1.1,.22),st);t.position.y=.1;g.add(t);const top=new T.Mesh(new T.CylinderGeometry(.4,.4,.22,18,1,false,0,Math.PI),st);top.rotation.x=Math.PI/2;top.rotation.z=Math.PI/2;top.position.y=.65;g.add(top);
  const cr=new T.Mesh(new T.BoxGeometry(.1,.45,.05),E('#d7b8ff','#8a4cff',1.6));cr.position.set(0,.3,.13);g.add(cr);const cr2=new T.Mesh(new T.BoxGeometry(.3,.1,.05),cr.material);cr2.position.set(0,.4,.13);g.add(cr2);
  const sk=new T.Mesh(new T.SphereGeometry(.2,12,10),new T.MeshStandardMaterial({color:'#f2ecdc',roughness:.6}));sk.position.set(.55,-.4,.2);g.add(sk)}
 else if(key==='vortex'){for(let i=0;i<5;i++){const t=new T.Mesh(new T.TorusGeometry(.25+i*.14,.05,8,32,Math.PI*1.6),E('#d8f0ff','#6ab8ff',1.2,{transparent:true,opacity:.85}));t.rotation.set(Math.PI/2,0,i*1.1);t.position.y=-.5+i*.25;g.add(t)}}
 else if(key==='mend'){const gold=new T.MeshStandardMaterial({color:'#ffe08a',metalness:.7,roughness:.25});const b=new T.Mesh(new T.CylinderGeometry(.18,.5,.75,20,1,true),gold);b.material.side=T.DoubleSide;g.add(b);
  const k=new T.Mesh(new T.SphereGeometry(.12,10,8),gold);k.position.y=-.42;g.add(k);for(let i=0;i<4;i++){const h=new T.Mesh(new T.TorusGeometry(.12,.035,6,16),E('#9fffb0','#2ad45a',2));h.position.set(-.6+i*.4,.55+(i%2)*.2,.2);g.add(h)}}
 return g}
async function r3Icons(){if(A3.iconsDone||!R3.ready)return;A3.iconsDone=1;
 const S=qualKey()==='eco'?256:384,cv=document.createElement('canvas');cv.width=cv.height=S;let IR;
 try{IR=new T.WebGLRenderer({canvas:cv,alpha:true,antialias:true,preserveDrawingBuffer:true})}catch(e){return}
 IR.outputColorSpace=T.SRGBColorSpace;IR.toneMapping=T.ACESFilmicToneMapping;IR.toneMappingExposure=1.1;
 const sc=new T.Scene(),pm=new T.PMREMGenerator(IR);sc.environment=pm.fromEquirectangular(A3.hdr).texture;sc.environmentIntensity=.9;
 const key=new T.DirectionalLight('#fff4e0',2.6);key.position.set(-2,4,5);sc.add(key);const rim=new T.DirectionalLight('#9fd0ff',1.6);rim.position.set(3,2,-4);sc.add(rim);
 const cam=new T.PerspectiveCamera(28,1,.05,60);
 const BGC={common:'#4a5d96',rare:'#7a5a3a',epic:'#5d3f8a',legendary:'#2c6e6a',champion:'#7a6420'};
 let made=0;for(const k of CARD_IDS){if(made++%4===3)await new Promise(r=>setTimeout(r));const c=CARDS[k];let obj=new T.Group();
  try{if(c.type==='spell')obj.add(spellModel(k));
   else{const vk=c.unit||k,n=c.count>=3?3:c.count===2?2:1;
    for(let i=0;i<n;i++){let m;if(PROC[vk]){m=procModel(vk,0)}else{const I=r3Inst(vk,0);I.play(I.V.idle||'Idle');I.mixer.update(.35+i*.3);m=I.root}
     const w=new T.Group();w.add(m);w.position.set(n===1?0:(i-(n-1)/2)*.95,0,n>1&&i%2?-.5:0);w.rotation.y=-.35+(i-1)*.15;obj.add(w)}}
   sc.add(obj);obj.updateMatrixWorld(true);
   const box=new T.Box3().setFromObject(obj),ctr=box.getCenter(new T.Vector3()),sz=box.getSize(new T.Vector3()),R=Math.max(sz.x,sz.y*1.05,sz.z*.6)*.62+.05;
   const dist=R/Math.tan(cam.fov*Math.PI/360);cam.position.set(ctr.x+dist*.18,ctr.y+dist*.32,ctr.z+dist*.93);cam.lookAt(ctr);
   IR.setClearColor(0,0);IR.render(sc,cam);
   const out=document.createElement('canvas');out.width=out.height=S;const g=out.getContext('2d');
   const bg=g.createRadialGradient(S/2,S*.4,S*.07,S/2,S/2,S*.75);bg.addColorStop(0,BGC[c.rar]);bg.addColorStop(1,'#141c38');g.fillStyle=bg;g.fillRect(0,0,S,S);
   g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(S/2,S*.84,S*.34,S*.07,0,0,7);g.fill();
   g.drawImage(cv,0,0);g.strokeStyle=RAR[c.rar].c;g.lineWidth=8;g.strokeRect(4,4,S-8,S-8);IC[k]=out}
  catch(e){console.warn('иконка',k,e&&e.message)}
  sc.remove(obj);await new Promise(r=>setTimeout(r,0))}
 // портреты для витрины башни: король и башенные бойцы
 for(const[ik,mk]of[['tt_king',()=>{const I=r3Inst('king',0);I.play('Idle');I.mixer.update(.4);return I.root}],['tt_archer',()=>{const I=r3Inst('archer',0);I.play(I.V.idle||'Idle');I.mixer.update(.4);return I.root}],
   ['tt_dagger',()=>{const I=r3Inst('dagger',0);I.play(I.V.idle||'Idle');I.mixer.update(.4);return I.root}],['tt_cannoneer',()=>{const g=new T.Group(),c=cannonModel(0,1);g.add(c);const I=r3Inst('archer',0);I.play('Idle');I.mixer.update(.4);I.root.position.set(-.55,0,-.35);g.add(I.root);return g}]]){
  try{const obj=mk();sc.add(obj);obj.updateMatrixWorld(true);const box=new T.Box3().setFromObject(obj),ctr=box.getCenter(new T.Vector3()),sz=box.getSize(new T.Vector3()),R=Math.max(sz.x,sz.y*1.05,sz.z*.6)*.6+.05;
   const dist=R/Math.tan(cam.fov*Math.PI/360);cam.position.set(ctr.x+dist*.18,ctr.y+dist*.28,ctr.z+dist*.94);cam.lookAt(ctr);IR.setClearColor(0,0);IR.render(sc,cam);
   const out=document.createElement('canvas');out.width=out.height=S;out.getContext('2d').drawImage(cv,0,0);IC[ik]=out;sc.remove(obj)}catch(e){console.warn('портрет',ik,e&&e.message)}}
 pm.dispose();IR.dispose();A3.iconsReady=1;
 if(!$('#home').hidden)renderHome();if(G&&!$('#battle').hidden){hs.sig='';renderHand()}}

/* ---------- спецэффекты этапа Б ---------- */
function explosion(x,y,r){const X=W3(x),Z=Z3(y),R=r/TILE,A=S3.parts.add,N=S3.parts.norm;
 for(let i=0;i<46;i++){const a=Math.random()*6.28,s=Math.random()*R*2.4;A.emit(X+Math.cos(a)*.2,.3+Math.random()*.6,Z+Math.sin(a)*.2,Math.cos(a)*s,1.2+Math.random()*2.6,Math.sin(a)*s,['#fff3c0','#ffc83d','#ff8a2a','#ff5a10'][i%4],.5+Math.random()*.7,.45+Math.random()*.5)}
 for(let i=0;i<26;i++){const a=Math.random()*6.28,s=Math.random()*R*1.4;N.emit(X+Math.cos(a)*R*.5,.4+Math.random(),Z+Math.sin(a)*R*.5,Math.cos(a)*s,1+Math.random()*1.6,Math.sin(a)*s,['#3b302a','#5a4a40','#2a2420'][i%3],.7+Math.random()*.8,1.2+Math.random()*1)}
 for(let i=0;i<18;i++){const a=Math.random()*6.28,s=3+Math.random()*4;A.emit(X,.4,Z,Math.cos(a)*s,2+Math.random()*3,Math.sin(a)*s,'#ffe9a8',.12,.5+Math.random()*.4)}
 flash(X,1.2,Z,'#ff9a3a',9,.5)}
function flash(X,Y,Z,col,I,t){if(!S3.lights){S3.lights=[];for(let i=0;i<3;i++){const l=new T.PointLight('#fff',0,9,1.6);S3.scene.add(l);S3.lights.push({l,t:0,m:1,I:0})}}
 const L=S3.lights.sort((a,b)=>a.t-b.t)[0];L.l.color.set(col);L.l.position.set(X,Y,Z);L.t=t;L.m=t;L.I=I}
/* ночь: сцена синеет и темнеет, у источников света — тёплые пятна и точечные огни, враги вне света — силуэты */
let NIGHT=null;
function nightSetup(){if(S3.pools)return;NIGHT={sun:new T.Color('#8ea6ff'),hemi:new T.Color('#4a5c9a'),gnd:new T.Color('#141a2a'),sky:new T.Color('#0b1230'),pool:new T.Color('#ffb35a'),flash:new T.Color('#fff2b0')};const N=48,m=new T.InstancedMesh(new T.CircleGeometry(1,32),new T.MeshBasicMaterial({map:S3.soft,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:'#ffffff'}),N);
 m.rotation.x=-Math.PI/2;m.count=0;m.frustumCulled=false;m.renderOrder=2;S3.scene.add(m);S3.pools=m;
 S3.pl=[];for(let i=0;i<6;i++){const l=new T.PointLight('#ffb060',0,8,1.3);l.position.y=2;S3.scene.add(l);S3.pl.push(l)}
 S3.silMat=new T.MeshBasicMaterial({color:'#121a38'});
 const moon=new T.DirectionalLight('#a8bcff',0);moon.position.set(9,22,-8);S3.scene.add(moon,moon.target);S3.moon=moon}
function stepTorches(now){if(!S3.torches||qualKey()==='eco')return;const v=new T.Vector3();for(const f of S3.torches){if(Math.random()<.55){f.getWorldPosition(v);S3.parts.add.emit(v.x+rndV(-.04,.04),v.y+.1,v.z+rndV(-.04,.04),rndV(-.1,.1),.7+Math.random()*.5,rndV(-.1,.1),Math.random()<.5?'#ffb040':'#ff7a1a',.2,.4)}f.scale.y=1+Math.sin(now/70+f.id)*.18}}
function stepNight(now){stepTorches(now);nightSetup();const k=nightK(),L=S3.pal,sc=S3.scene;if(!L)return;
 if(Math.abs(k-S3.nk)>.002){S3.nk=k;const c=new T.Color();
  S3.sun.intensity=L.sun[1]*(1-.85*k);S3.moon.intensity=1.5*k;S3.sun.color.copy(c.set(L.sun[0]).lerp(NIGHT.sun,k));
  S3.hemi.color.copy(c.set(L.hemi[0]).lerp(NIGHT.hemi,k));S3.hemi.groundColor.copy(c.set(L.hemi[1]).lerp(NIGHT.gnd,k));S3.hemi.userData.base=L.hemi[2]*.6*(1-.3*k);S3.hemi.intensity=S3.hemi.userData.base;
  sc.background=c.set(L.sky).lerp(NIGHT.sky,k).clone();if(sc.fog)sc.fog.density=.012*k;sc.environmentIntensity=S3.envI*(1-.5*k);for(const m of S3.gmats||[])if(m.userData.c0)m.color.copy(m.userData.c0).multiply(c.setRGB(1-.66*k,1-.62*k,1-.45*k));if(S3.chk)S3.chk.material.color.setRGB(1-.72*k,1-.68*k,1-.5*k);S3.R.toneMappingExposure=L.exp*.86*(1-.08*k)}
 // пятна света и огни
 const P=S3.pools,M=new T.Matrix4(),Q=new T.Quaternion(),V=new T.Vector3(),Sc=new T.Vector3();let n=0;
 const src=k>0?lightSources():[];
 if(k>0){src.sort((a,b)=>b.r-a.r);for(const s of src){if(n>=P.instanceMatrix.count)break;if(inShade(s))continue;const r=s.r/TILE*1.05;V.set(W3(s.x),Z3(s.y)*-1,.05);M.compose(V,Q,Sc.set(r,r,1));P.setMatrixAt(n,M);
   const fl=G.Z.some(z=>z.k==='flash'&&z.x===s.x&&z.y===s.y);P.setColorAt(n,fl?NIGHT.flash:NIGHT.pool);n++}}
 P.count=n;P.instanceMatrix.needsUpdate=true;if(P.instanceColor)P.instanceColor.needsUpdate=true;P.material.opacity=.2*k;
 const fl=1+Math.sin(now/110)*.06+Math.sin(now/47)*.04;
 S3.pl.forEach((l,i)=>{const s=src[i];if(!s||k<=0){l.intensity=0;return}l.position.set(W3(s.x),1.6,Z3(s.y));l.distance=s.r/TILE*1.15;l.intensity=3.2*k*fl})}
/* мосты: рушатся с обломками и брызгами, отстраиваются, вздрагивают от ударов */
function stepBridges(dt){if(!S3.bridgeG||!G.bridges)return;G.bridges.forEach((b,i)=>{const v=S3.bridgeG[i];if(!v)return;const down=b.down>0;
 if(down&&v.visible){v.visible=false;explosion(b.x,RY,44);burst(b.x,RY,1.2,'#8a5a32',36,2.4,1.6,0);burst(b.x,RY,1,'#cfefff',30,2.2,1.2,0)}
 if(!down&&!v.visible){v.visible=true;v.userData.rise=1}
 if(v.userData.rise>0){v.userData.rise=Math.max(0,v.userData.rise-dt*1.5);v.position.y=-.5*v.userData.rise**2}else v.position.y=b.fl>0?-.04:0})}
function stepLights(dt){if(S3.lights)for(const L of S3.lights){L.t=Math.max(0,L.t-dt);L.l.intensity=L.I*(L.t/L.m)**1.5}}
function debris(t){S3.hype=3;const k=t.kind==='k',wall=pbr('wall',1,1,{color:'#d8cfbe'}),X=W3(t.x),Z=Z3(t.y);S3.deb=S3.deb||[];
 for(let i=0;i<(k?26:18);i++){const s=.14+Math.random()*.26,m=new T.Mesh(new T.DodecahedronGeometry(s,0),wall);m.castShadow=true;m.position.set(X+rndV(-.8,.8),1+Math.random()*2.4,Z+rndV(-.8,.8));
  const a=Math.random()*6.28,sp=2+Math.random()*4;S3.dyn.add(m);S3.deb.push({m,vx:Math.cos(a)*sp,vy:3+Math.random()*5,vz:Math.sin(a)*sp,rx:rndV(-6,6),rz:rndV(-6,6),l:0,s})}
 explosion(t.x,t.y,k?60:46);burst(t.x,t.y,2.2,'#a89c88',50,2.6,1.8,0)}
function stepDebris(dt){if(!S3.deb)return;for(const d of S3.deb){d.l+=dt;if(d.m.position.y>d.s*.6||d.vy>0){d.vy-=14*dt;d.m.position.x+=d.vx*dt;d.m.position.y+=d.vy*dt;d.m.position.z+=d.vz*dt;d.m.rotation.x+=d.rx*dt;d.m.rotation.z+=d.rz*dt;
  if(d.m.position.y<d.s*.6){d.m.position.y=d.s*.6;d.vy=-d.vy*.3;d.vx*=.5;d.vz*=.5;d.rx*=.5;d.rz*=.5;if(Math.abs(d.vy)<1)d.vy=0}}
  if(d.l>9){d.m.position.y-=dt*.3;if(d.l>11){S3.dyn.remove(d.m);d.gone=1}}}S3.deb=S3.deb.filter(d=>!d.gone)}
function towerSmoke(){for(const v of S3.towers){const t=v.t;if(t.hp<=0||t.hp>t.mx*.5)continue;const X=W3(t.x),Z=Z3(t.y),h=v.k?2.1:2.0;
  if(Math.random()<.25)S3.parts.norm.emit(X+rndV(-.6,.6),h,Z+rndV(-.6,.6),rndV(-.1,.1),.9,rndV(-.1,.1),'#4a4440',.6,1.6);
  if(t.hp<t.mx*.25&&Math.random()<.35)S3.parts.add.emit(X+rndV(-.5,.5),h-.2,Z+rndV(-.5,.5),0,1.2,0,['#ff8a2a','#ffc83d'][Math.random()*2|0],.35,.5)}}
function iceCrystals(z){const g=new T.Group(),ice=new T.MeshStandardMaterial({color:'#dcf6ff',emissive:'#3fa8ff',emissiveIntensity:.35,roughness:.06,metalness:.1,transparent:true,opacity:.82});
 const r=z.r/TILE;for(let i=0;i<16;i++){const a=Math.random()*6.28,d=Math.sqrt(Math.random())*r*.9,c=new T.Mesh(new T.OctahedronGeometry(.12+Math.random()*.18),ice);c.scale.y=2+Math.random()*1.5;
  c.position.set(Math.cos(a)*d,.15,Math.sin(a)*d);c.rotation.set(rndV(-.4,.4),Math.random()*6,rndV(-.4,.4));c.castShadow=true;g.add(c)}
 g.position.set(W3(z.x),0,Z3(z.y));return g}

/* ---------- облик арен: земля, свет, вода, окружение, погода ---------- */
const ATH=[
 {g:'grass',c1:'#5fbf3f',c2:'#3f9a2a',c3:'#a8e86a',path:'#f0d9a4',stone:'#ffffff',sky:'#8fd0ff',sun:['#fff6e6',2.6],hemi:['#ffffff','#7a9a5a',1.0],exp:1.12,trees:1,w:'',water:{color:'#1aa8e0'}},
 {g:'grass',c1:'#c2b04a',c2:'#9a8a34',c3:'#efe39a',path:'#f2e2c2',stone:'#f2e6d6',sky:'#f2d9a8',sun:['#fff0d0',2.6],hemi:['#fff4e0','#8a7a4a',1.0],exp:1.1,trees:0,w:'dust',water:{color:'#5fb8b0'}},
 {g:'grass',c1:'#4fae3a',c2:'#2f7a22',c3:'#8fd860',path:'#e6e2dc',stone:'#ece6de',sky:'#9cc8f0',sun:['#fff4e0',2.4],hemi:['#f4f8ff','#5a7a3a',1.0],exp:1.1,trees:1,w:'sparks',water:{color:'#36b4e0'}},
 {g:'snow',c1:'#eef6ff',c2:'#b9d4ee',path:'#e6f0fa',stone:'#eef2f8',sky:'#cfe6ff',sun:['#ffffff',2.2],hemi:['#ffffff','#a8c0d8',1.1],exp:1.05,trees:1,treeTint:'#eaf4fa',w:'snow',water:{color:'#7fd4f2'}},
 {g:'ash',c1:'#8a4a34',c2:'#4a2418',path:'#d8a890',stone:'#d8c0b4',sky:'#e0805a',sun:['#ffcc99',2.5],hemi:['#ffd0b0','#5a2a1a',1.0],exp:1.12,trees:0,w:'embers',water:{color:'#ff6a1a',emissive:'#ff3a00',emissiveIntensity:.9}},
 {g:'swamp',c1:'#5a8a3a',c2:'#3a5a22',c3:'#9ac86a',path:'#c8b890',stone:'#d0d4c0',sky:'#9ab894',sun:['#f0f8d8',2.2],hemi:['#e8f4d8','#3a5a2a',1.0],exp:1.08,trees:1,treeTint:'#8fb06a',w:'flies',water:{color:'#5a9a4a'}},
 {g:'tile',c1:'#8a90a8',c2:'#5a6078',path:'#d0d4e4',stone:'#d8dcea',sky:'#5a6290',sun:['#dfe4ff',2.0],hemi:['#c8d0ff','#3a3e5a',1.1],exp:1.12,trees:0,w:'rain',water:{color:'#6a5ae0'}},
 {g:'sand',c1:'#f0d494',c2:'#c8a860',path:'#fff0d0',stone:'#fff2dc',sky:'#ffe2a8',sun:['#fff8e0',2.8],hemi:['#fffaf0','#a88a50',1.0],exp:1.05,trees:0,w:'sand',water:{color:'#2ad0c8'}}];
function applyLook(L){const sc=S3.scene;S3.pal=L;sc.background=new T.Color(L.sky);sc.fog=null;S3.sun.color.set(L.sun[0]);S3.sun.intensity=L.sun[1];
 S3.hemi.color.set(L.hemi[0]);S3.hemi.groundColor.set(L.hemi[1]);S3.hemi.intensity=L.hemi[2]*.6;S3.hemi.userData.base=L.hemi[2]*.6;S3.R.toneMappingExposure=L.exp*.86;
 sc.fog=new T.FogExp2('#0b1230',0);S3.nk=-1;S3.envI=sc.environmentIntensity??1}
const r3HasTheme=a=>true;
function r3LoadTheme(a){return Promise.resolve()}
function weather(dt){const w=S3.weather;if(!w||REDUCE||SET.fx==='low')return;const A=S3.parts.add,N=S3.parts.norm,rx=()=>rndV(-11,11),rz=()=>rndV(-17,17);
 if(w==='snow')for(let i=0;i<3;i++)N.emit(rx(),9,rz(),rndV(-.3,.3),-1.4,rndV(-.3,.3),'#ffffff',.14,7);
 else if(w==='embers'){if(Math.random()<.7)A.emit(rx(),.1,(Math.random()<.5?-1:1)*rndV(0,1),rndV(-.2,.2),1.2+Math.random(),rndV(-.2,.2),['#ffb347','#ff6a1a'][Math.random()*2|0],.14,2.5);if(Math.random()<.4)A.emit(rx(),.2,rz(),0,.8,0,'#ff8a2a',.1,2)}
 else if(w==='flies'){if(Math.random()<.35)A.emit(rx(),.5+Math.random()*2,rz(),rndV(-.4,.4),rndV(-.1,.3),rndV(-.4,.4),'#d8ff7a',.12,3.5)}
 else if(w==='rain'){for(let i=0;i<5;i++)N.emit(rx(),8,rz(),.6,-16,0,'#b8c8ff',.07,.55);S3.thT=(S3.thT||0)-dt;if(S3.thT<=0){S3.thT=5+Math.random()*7;S3.flashT=.35;AU.sfx('boom')}
  if(S3.flashT>0){S3.flashT-=dt;S3.hemi.intensity=S3.hemi.userData.base+(S3.flashT>.2||S3.flashT<.1?3:0)}else S3.hemi.intensity=S3.hemi.userData.base}
 else if(w==='sand'){if(Math.random()<.8)N.emit(-12,.3+Math.random()*2,rz(),4+Math.random()*3,.1,rndV(-.3,.3),'#e8cf98',.35,4)}
 else if(w==='dust'){if(Math.random()<.3)N.emit(rx(),.2,rz(),rndV(-.3,.3),.25,rndV(-.3,.3),'#cdb48c',.5,3)}
 else if(w==='sparks'){if(Math.random()<.3){const x=Math.random()<.5?-11.5:11.5;A.emit(x,1,rndV(-8,8),rndV(-1,1),2.5,rndV(-1,1),'#ffd27a',.1,.9)}}}
/* картинка арены для главного экрана */
function r3Thumb(cv,a){if(!R3.ready||!r3HasTheme(a))return false;if(S3.theme!==a)buildArena(a);
 S3.dyn.clear();const keep=[];for(const t of demoTowers().filter(t=>t.tm===1||true)){t.hp=t.mx=1;keep.push(towerView(t))}
 const cam=new T.PerspectiveCamera(42,cv.width/cv.height,1,160);cam.position.set(0,11.5,7.5);cam.lookAt(0,0,-8.5);
 const R=S3.R,old=new T.Vector2();R.getSize(old);const pr=R.getPixelRatio();R.setPixelRatio(1);R.setSize(cv.width,cv.height,false);
 for(const v of keep){v.unit.mixer.update(.5)}R.render(S3.scene,cam);const g=cv.getContext('2d');g.drawImage(R.domElement,0,0,cv.width,cv.height);
 R.setPixelRatio(pr);R.setSize(old.x,old.y,false);S3.dyn.clear();return true}

/* если кадров мало — по шагам убираем свечение, снижаем чёткость, потом тени */
/* качество: чёткость, сглаживание, тени. Ручной выбор в настройках; авто-подстройка только в бою и только на этот бой */
const QUAL={hi:{n:'Высокое',dpr:3,sh:2048},mid:{n:'Среднее',dpr:2,sh:1024},eco:{n:'Экономия',dpr:1.5,sh:0}};
const qualKey=()=>{const k=store.get('ac.qual','hi');return QUAL[k]?k:'hi'};
function setShadows(on){const R=S3.R;if(!R||R.shadowMap.enabled===on)return;R.shadowMap.enabled=on;if(S3.scene)S3.scene.traverse(o=>{if(o.material){const m=Array.isArray(o.material)?o.material:[o.material];m.forEach(x=>x.needsUpdate=true)}})}
function applyQual(){const Q=QUAL[qualKey()];S3.q.dpr=Q.dpr;S3.comp=qualKey()==='hi'&&S3.scene&&!S3.noComp?(S3.compHi||(S3.compHi=makeComp())):null;S3.ql=0;S3.fa=1/60;S3.qt=-6;if(S3.R)setShadows(!!Q.sh);if(R3.ready||S3.R)fit()}
function autoQ(dt){S3.fa=(S3.fa||0)*.97+dt*.03;S3.qt=(S3.qt||0)+dt;if(S3.qt<4)return;S3.qt=0;if(S3.fa<.030||S3.ql>=3)return;
 // сначала тени, потом постобработка, и только в самом конце — разрешение (не ниже 2)
 const q=S3.ql=(S3.ql||0)+1;if(q===1)setShadows(false);else if(q===2)S3.comp=null;else{S3.q.dpr=Math.max(2,S3.q.dpr-.5);fit()}S3.fa=1/60}

/* пена: рваная белая кромка, по краю гуще */
function foamTex(){const c=document.createElement('canvas');c.width=256;c.height=32;const g=c.getContext('2d');const r=mul(91);
 for(let i=0;i<260;i++){const x=r()*256,y=Math.pow(r(),1.8)*30,s=1+r()*3.5;g.fillStyle=`rgba(255,255,255,${.35+r()*.6})`;g.beginPath();g.ellipse(x,y,s*1.6,s,0,0,7);g.fill()}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;return t}
/* пучки травы вдоль бортика и берегов, колышутся от ветра (сдвиг вершин по высоте в шейдере) */
function grassTufts(rng,TH3){if(!TH3||TH3.g!=='grass')return new T.Group();
 const blade=new T.ConeGeometry(.075,.36,4);blade.translate(0,.21,0);
 const m=new T.MeshLambertMaterial({color:TH3.c3||'#9ed86a',emissive:TH3.c1||'#5fbf3f',emissiveIntensity:.45});m.onBeforeCompile=sh=>{sh.uniforms.uT=S3.windU;sh.vertexShader='uniform float uT;\n'+sh.vertexShader.replace('#include <begin_vertex>',
  'vec3 transformed=vec3(position);float h=max(position.y,0.);vec4 wp=instanceMatrix*vec4(0.,0.,0.,1.);transformed.x+=sin(uT*2.2+wp.x*.8+wp.z*.6)*.09*h*h*6.;transformed.z+=cos(uT*1.7+wp.z*.9)*.05*h*h*6.;')};
 const pts=[];for(let i=0;i<300;i++){const side=rng();let x,z;if(side<.5){x=(rng()<.5?-1:1)*(8.4+rng()*.6);z=rng()*31-15.5}else{x=rng()*18-9;z=(rng()<.5?-1:1)*(1.25+rng()*.35);if(BR.some(b=>Math.abs(W3(b)-x)<1.1))continue}pts.push([x,z])}
 const im=new T.InstancedMesh(blade,m,pts.length*3),M=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler();let n=0;
 for(const[x,z]of pts)for(let k=0;k<3;k++){e.set((rng()-.5)*.5,rng()*6.28,(rng()-.5)*.5);q.setFromEuler(e);const s=.6+rng()*.7;M.compose(new T.Vector3(x+(rng()-.5)*.25,0,z+(rng()-.5)*.25),q,new T.Vector3(s,s,s));im.setMatrixAt(n++,M)}
 im.count=n;im.receiveShadow=true;return im}
/* блики на воде */
function waveLines(){const c=document.createElement('canvas');c.width=256;c.height=128;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,256,128);
 g.strokeStyle='#fff';g.lineCap='round';for(let i=0;i<9;i++){g.lineWidth=2+(i%3);g.globalAlpha=.35+(i%2)*.3;const y=8+i*13,x=(i*53)%256;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+18,y-5,x+40,y);g.stroke();g.beginPath();g.moveTo(x-256,y);g.quadraticCurveTo(x-238,y-5,x-216,y);g.stroke()}
 g.globalAlpha=.55;g.fillStyle='#fff';g.fillRect(0,0,256,5);g.fillRect(0,123,256,5);
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;return t}
/* трибуны со зрителями по бокам арены */
function stands(A,P){const st=pbr('wall',6,.8,{color:P.stone}),rng=mul(99);
 for(const s of[-1,1]){for(let i=0;i<3;i++){const m=new T.Mesh(new T.BoxGeometry(1.4,.55+i*.55,30),st);m.position.set(s*(10.4+i*1.35),(.55+i*.55)/2,0);m.receiveShadow=m.castShadow=true;A.add(m)}}
 const N=240,body=new T.InstancedMesh(new T.CylinderGeometry(.22,.28,.55,8),new T.MeshStandardMaterial({roughness:.85}),N),head=new T.InstancedMesh(new T.SphereGeometry(.2,10,8),new T.MeshStandardMaterial({color:'#f2c9a0',roughness:.8}),N);
 const M=new T.Matrix4(),C=new T.Color(),cols=['#3da5ff','#ff5c4d','#ffc83d','#5ef2d0','#c77dff','#ffffff','#4cd37a','#ff8ad1'];
 for(let i=0;i<N;i++){const s=i%2?1:-1,row=i/2%3|0,z=-14+((i/6|0)%28)+rng()*.5,x=s*(10.4+row*1.35)+rng()*.3,y=.55+row*.55;
  M.makeTranslation(x,y+.28,z);body.setMatrixAt(i,M);C.set(cols[(rng()*cols.length)|0]);body.setColorAt(i,C);M.makeTranslation(x,y+.72,z);head.setMatrixAt(i,M)}
 body.castShadow=true;A.add(body,head);S3.crowd={body,head,N,base:[]};
 for(let i=0;i<N;i++){const m=new T.Matrix4();head.getMatrixAt(i,m);S3.crowd.base.push(m.elements[13])}}
function crowdStep(now){const c=S3.crowd;if(!c)return;const M=new T.Matrix4(),hype=S3.hype>0?1:0;c.k=(c.k||0)+1;if(c.k%3)return;
 for(let i=0;i<c.N;i++){c.head.getMatrixAt(i,M);const by=c.base[i],j=Math.max(0,Math.sin(now/(hype?120:400)+i*1.7))*(hype?.35:.06);M.elements[13]=by+j;c.head.setMatrixAt(i,M);c.body.getMatrixAt(i,M);M.elements[13]=by-.44+j;c.body.setMatrixAt(i,M)}
 c.head.instanceMatrix.needsUpdate=c.body.instanceMatrix.needsUpdate=true}
