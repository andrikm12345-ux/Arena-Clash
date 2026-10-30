/* ================= БОЙ: ДВИЖОК ================= */
let G=null,uid=0;
const PSPD={arrow:300,stone:260,bolt:340,orb:220,flame:200,bomb:150,ball:280,ice:230,tower:320,king:300};
/* o: decks, lv, kl, bots, names, train, mode, ex (эво/герой), tt (башенные бойцы), thp (множитель HP башен), seed */
function newMatch(o){uid=0;const seed=Number.isInteger(o.seed)?o.seed:(Math.random()*2147483647|0);RNG=mul(seed);
 const T=[],tt=o.tt||['archer','archer'],A=CFG.arena,mc=CFG.modes[o.mode]||CFG.modes.normal;
 for(const tm of[0,1]){const kl=o.kl[tm],thp=o.thp?o.thp[tm]:1;
  for(const [kind,x,y] of[['p',A.princess[0]*TILE,A.princess[1]*TILE],['p',W-A.princess[0]*TILE,A.princess[1]*TILE],['k',A.king[0]*TILE,A.king[1]*TILE]]){const d=TOWER[kind],hp=Math.round(LV(d.hp,kl)*thp);
   T.push({id:++uid,obj:'t',kind,tm,x,y:tm?H-y:y,r:d.r,hp,mx:hp,dmg:LV(d.dmg,kl),hit:d.hit,rng:d.rng*TILE,cd:rnd(0,.4),fl:0,act:kind==='p'?1:0,wake:0,ang:tm?Math.PI/2:-Math.PI/2,frozenT:0,stunT:0,lvl:kl,fly:false,tg:null});
   if(kind==='p'){const q=TT[tt[tm]]||TT.archer,t=T[T.length-1];t.hp=t.mx=Math.round(hp*q.hp);t.dmg=Math.round(t.dmg*q.dmg);t.hit*=q.hit;t.pk=q.pk;t.tt=tt[tm];if(q.mag){t.mag=t.ammo=q.mag;t.reload=q.reload}}}}
 G={seed,mc,tick:0,downs:[],tb:null,t:0,ot:0,otT:0,over:0,res:-1,endAt:0,crowns:[0,0],U:[],B:[],T,PR:[],FX:[],Z:[],D:[],S:[],PT:[],TX:[],DEC:[],EM:[],CF:[],shake:0,
  side:[0,1].map(tm=>mkSide(tm,o.decks[tm],o.lv[tm],o.kl[tm],o.ex&&o.ex[tm],mc.elStart)),mode:o.mode||'normal',bots:[0,1].map(tm=>o.bots[tm]?mkBot(tm,o.bots[tm]):null),
  names:o.names||['Ты','Соперник'],train:!!o.train,stats:[{dmg:0,spent:0,played:0,leak:0},{dmg:0,spent:0,played:0,leak:0}]};
 return G}
/* стартовая рука — первые карты перемешанной по seed колоды, кроме помеченных noStart */
function mkSide(tm,deck,lv,kl,ex,el0){const sh=shuffle(deck),n=CFG.hand.size,hand=[];for(const k of sh)if(hand.length<n&&!CARDS[k].noStart)hand.push(k);
 for(const k of sh)if(hand.length<n&&!hand.includes(k))hand.push(k);const d=hand.concat(sh.filter(k=>!hand.includes(k)));ex=ex||{};const evo=EVO[ex.evo]&&deck.includes(ex.evo)?ex.evo:null,hero=HERO[ex.hero]&&deck.includes(ex.hero)&&!deck.some(k=>CARDS[k].ability)?ex.hero:null;
 return{tm,deck:deck.slice(),hand:d.splice(0,n),queue:d,pend:[],el:el0??CFG.elixir.start,lv:lv||{},kl,champ:null,abCd:0,last:null,evo,evoN:0,hero}}
const evoReady=(S,k)=>!!S.evo&&k===S.evo&&S.evoN>=EVO[k].cyc;
const isAb=(S,k)=>!!k&&(!!CARDS[k].ability||k===S.hero);
const jumpH=u=>u.c.jump&&Math.abs(u.y-RY)<RIV+8?Math.cos((u.y-RY)/(RIV+8)*Math.PI/2)*26:0;
const alive=o=>!!o&&o.hp>0&&!o.gone;
const aliveT=o=>!!o&&(o.obj==='t'?o.hp>0:alive(o));
/* множитель эликсира по фазам режима (CFG.modes) */
function elRate(){const ph=G.ot?G.mc.ot:G.mc.phases,t=G.ot?G.otT:G.t;let m=1;for(const[a,k]of ph)if(t>=a)m=k;return m}

/* ---------- выставление ---------- */
const POCKET_Y=RY-RIV-CFG.arena.pocket*TILE; // карман: столько тайлов вглубь от реки
function formation(key,x,y,cc){const c=cc||CARDS[key],uc=CARDS[c.unit||key],n=c.count||1,cols=n<=3?n:4,rows=Math.ceil(n/cols),sp=uc.r*2+3,P=[];
 for(let i=0;i<n;i++){const col=i%cols,row=i/cols|0,inRow=Math.min(cols,n-row*cols);P.push([x+(col-(inRow-1)/2)*sp,y+(row-(rows-1)/2)*sp])}
 return P}
function blocked(x,y,r){for(const t of G.T)if(t.hp>0&&Math.hypot(t.x-x,t.y-y)<t.r+r)return true;for(const b of G.B)if(alive(b)&&Math.hypot(b.x-x,b.y-y)<b.r+r)return true;return false}
function pocketOpen(tm,x){const left=x<W/2;const pt=G.T.find(t=>t.tm!==tm&&t.kind==='p'&&(t.x<W/2)===left);return!!pt&&pt.hp<=0}
function canPlace(tm,key,x,y){const c=CARDS[key];if(x<8||x>W-8||y<8||y>H-8)return false;
 if(c.type==='spell')return true;
 if(Math.abs(y-RY)<RIV+3)return false;
 const py=tm?H-y:y;
 if(c.tunnel)return!blocked(x,y,8);
 let ok=py>=RY+RIV+3;
 if(!ok&&py>=POCKET_Y&&pocketOpen(tm,x))ok=true;
 if(!ok)return false;
 if(c.type==='building'&&blocked(x,y,c.r))return false;
 // внутрь башни (3×3 клетки у принцессы, 4×4 у короля) ставить нельзя
 for(const t of G.T)if(t.hp>0){const h=t.kind==='k'?40:30;if(Math.abs(x-t.x)<h&&Math.abs(y-t.y)<h)return false}
 return true}
function cardBlocked(tm,key){const S=G.side[tm];if(!key)return true;return!!(isAb(S,key)&&S.champ&&alive(S.champ))}
function playCard(tm,i,x,y){const S=G.side[tm],key=S.hand[i],c=CARDS[key];if(G.tb||G.over||!key||S.el<c.cost||cardBlocked(tm,key)||!canPlace(tm,key,x,y))return false;
 S.el-=c.cost;G.stats[tm].spent+=c.cost;G.stats[tm].played++;S.hand[i]=null;S.pend.push({i,key:S.queue.shift(),t:CFG.hand.delay[elRate()]||CFG.hand.delay[1]});if(isAb(S,key))S.champCard=key;else S.queue.push(key);S.last={x,y,key,t:G.t};
 let fl=null;if(key===S.evo){if(S.evoN>=EVO[key].cyc){fl={evo:1};S.evoN=0}else S.evoN++}else if(key===S.hero)fl={hero:1};
 deploy(tm,key,x,y,fl);return true}
function deploy(tm,key,x,y,fl){const c=CARDS[key],lvl=G.side[tm].lv[key]||1;fl=fl||null;
 if(c.type==='spell'){castSpell(tm,key,x,y,lvl);return}
 const dep=c.dep??1;
 if(c.tunnel){const k=G.T.find(t=>t.tm===tm&&t.kind==='k');const tt=Math.hypot(x-k.x,y-k.y)/120;G.D.push({key,tm,x,y,lvl,fl,t:tt+dep,tot:tt+dep,tun:tt,sx:k.x,sy:k.y});AU.sfx('dep');return}
 G.D.push({key,tm,x,y,lvl,fl,t:dep,tot:dep});AU.sfx('dep')}
function updDeploys(dt){for(const d of G.D){d.t-=dt;if(d.t<=0){d.done=1;spawn(d.tm,d.key,d.x,d.y,d.lvl,d.fl)}}G.D=G.D.filter(d=>!d.done)}
function mkUnit(tm,key,x,y,lvl,cc){const c=cc||CARDS[key],hp=LV(c.hp,lvl);
 return{id:++uid,obj:'u',key,c,tm,x,y,r:c.r,hp,mx:hp,dmg:LV(c.dmg||0,lvl),shield:0,smx:0,cd:.4,fl:0,sw:0,ph:rnd(0,6),face:tm?-1:1,tg:null,lock:0,rt:0,fly:!!c.fly,lvl,
  slowT:0,slowF:0,stunT:0,frozenT:0,rageT:0,run:0,charging:0,mass:c.mass||Math.max(1,hp/250),born:G.t,bx:null,spawnT:.3}}
function spawn(tm,key,x,y,lvl,fl){const c=fl&&fl.evo&&EVO[key]?evoCard(key):fl&&fl.hero&&HERO[key]?heroCard(key):CARDS[key];
 if(c.evo){ring(x,y,34,'#c77dff');floatText(x,y-34,'ЭВОЛЮЦИЯ','#e3b6ff',12)}if(c.hero){ring(x,y,34,'#ffd84d');floatText(x,y-34,'ГЕРОЙ','#ffd84d',12)}
 if(c.type==='building'){const hp=LV(c.hp,lvl);G.B.push({id:++uid,obj:'b',key,c,evo:c.evo,tm,x,y,r:c.r,hp,mx:hp,dmg:LV(c.dmg||0,lvl),hit:c.hit,cd:.6,fl:0,spT:c.spawn?c.spawn.every*.6:0,ang:tm?Math.PI/2:-Math.PI/2,at:0,lvl,frozenT:0,stunT:0,fly:false,spawnT:.3});
  ring(x,y,26,'#ffffff');puff(x,y,'#c9b99a',10,40,3);return}
 const uk=c.unit||key,uc=c.unit?CARDS[uk]:c;
 for(const[fx,fy]of formation(key,x,y,c)){
  let ux=clamp(fx+rnd(-1.5,1.5),10,W-10),uy=clamp(fy+rnd(-1.5,1.5),10,H-10);
  if(!uc.fly&&Math.abs(uy-RY)<RIV+4)uy=RY+(uy<RY?-(RIV+5):RIV+5);
  const u=mkUnit(tm,uk,ux,uy,lvl,uc);if(c.evo){u.evo=1;if(EVO[key].shield){u.shield=u.smx=LV(EVO[key].shield,lvl)}}if(c.hero)u.hero=1;G.U.push(u);if(uc.ability)G.side[tm].champ=u}
 if(c.zap){const z=LV(c.zap,lvl);areaHit(tm,x,y,2*TILE,z,z,'ga',{stun:.5});G.FX.push({k:'zapring',x,y,r:2*TILE,l:0,m:.35});AU.sfx('zap')}
 puff(x,y,'#d9cfb4',6,40,2.4);ring(x,y,22,TEAM[tm].m)}

/* ---------- заклинания ---------- */
function castSpell(tm,key,x,y,lvl){const c=CARDS[key],r=c.rad*TILE,dmg=LV(c.dmg||0,lvl),tdmg=LV(c.tdmg||0,lvl);
 if(key==='fireball'){const k=G.T.find(t=>t.tm===tm&&t.kind==='k'),tt=Math.max(.35,Math.hypot(x-k.x,y-k.y)/300);
  G.FX.push({k:'meteor',x:k.x,y:k.y-30,x2:x,y2:y,l:0,m:tt});G.S.push({t:G.t+tt,fn:()=>{areaHit(tm,x,y,r,dmg,tdmg,'ga',{knock:c.knock});boomFx(x,y,r)}});AU.sfx('shot');return}
 if(c.waves){for(let w=0;w<c.waves;w++)G.S.push({t:G.t+.45+w*.3,fn:()=>{areaHit(tm,x,y,r,dmg/c.waves,tdmg/c.waves,'ga');ring(x,y,r,'#ffffff');AU.sfx('hit');for(let i=0;i<8;i++){const a=rnd(0,6.28),d=Math.sqrt(RNG())*r;puff(x+Math.cos(a)*d,y+Math.sin(a)*d,'#e9eef7',2,20,1.6)}}});
  for(let i=0;i<28;i++){const a=rnd(0,6.28),d=Math.sqrt(RNG())*r;G.FX.push({k:'rain',x:x+Math.cos(a)*d+16,y:y+Math.sin(a)*d-80,x2:x+Math.cos(a)*d,y2:y+Math.sin(a)*d,l:-rnd(0,.95),m:.3})}AU.sfx('shot');return}
 if(c.freeze){areaHit(tm,x,y,r,dmg,tdmg,'ga',{freeze:c.freeze});G.Z.push({k:'freeze',tm,x,y,r,t:c.freeze,tot:c.freeze});AU.sfx('freeze');return}
 if(c.stun){areaHit(tm,x,y,r,dmg,tdmg,'ga',{stun:c.stun});G.FX.push({k:'zapring',x,y,r,l:0,m:.35});AU.sfx('zap');return}
 if(c.rage){G.Z.push({k:'rage',tm,x,y,r,t:c.rage,tot:c.rage});AU.sfx('rage');return}
 if(c.poison){G.Z.push({k:'poison',tm,x,y,r,t:c.poison,tot:c.poison,tick:.5,dps:dmg/c.poison,tdps:tdmg/c.poison});AU.sfx('poison')}}
function updZones(dt){for(const z of G.Z){z.t-=dt;
  if(z.k==='rage'){for(const u of G.U)if(u.tm===z.tm&&alive(u)&&dist(u,z)<z.r+u.r)u.rageT=Math.max(u.rageT,.6)}
  else if(z.k==='poison'){for(const u of G.U)if(u.tm!==z.tm&&alive(u)&&dist(u,z)<z.r+u.r*.5){u.slowT=Math.max(u.slowT,.3);u.slowF=Math.max(u.slowF,.15)}
   z.tick-=dt;if(z.tick<=0){z.tick+=1;areaHit(z.tm,z.x,z.y,z.r,z.dps,z.tdps,'ga')}}
  else if(z.k==='aura'){if(alive(z.u)){z.x=z.u.x;z.y=z.u.y}for(const u of G.U)if(u.tm===z.tm&&alive(u)&&dist(u,z)<z.r)u.rageT=Math.max(u.rageT,.5)}}
 G.Z=G.Z.filter(z=>z.t>0)}
function useAbility(tm){const S=G.side[tm],u=S.champ;if(!alive(u))return false;const a=u.c.ability;if(S.abCd>0||S.el<a.cost)return false;
 S.el-=a.cost;S.abCd=a.cd;const k=a.k||'horn';
 if(k==='horn'){u.shield=u.smx=LV(a.shield,u.lvl);G.Z.push({k:'aura',tm,u,x:u.x,y:u.y,r:a.r*TILE,t:a.rage,tot:a.rage});ring(u.x,u.y,a.r*TILE,'#ffd84d')}
 else if(k==='taunt'){u.shield=u.smx=LV(a.shield,u.lvl);for(const v of G.U)if(v.tm!==tm&&alive(v)&&canHit(v.c,u)&&dist(u,v)<a.r*TILE){v.tg=u;v.lock=0;v.rt=a.t}ring(u.x,u.y,a.r*TILE,'#ff7a5a');ring(u.x,u.y,a.r*TILE*.6,'#ffd84d')}
 else if(k==='stomp'){const d=LV(a.dmg,u.lvl);areaHit(tm,u.x,u.y,a.r*TILE,d,Math.round(d*.35),'g',{stun:a.stun,knock:14});ring(u.x,u.y,a.r*TILE,'#ffd84d');puff(u.x,u.y,'#c9b99a',16,80,3.4);G.shake=Math.max(G.shake,7)}
 else if(k==='fury'){u.rageT=a.rage;u.shield=u.smx=LV(a.shield,u.lvl);ring(u.x,u.y,30,'#ff5a8a')}
 floatText(u.x,u.y-40,a.n,'#ffd84d',12);AU.sfx('ability');return true}

/* ---------- цели и движение ---------- */
function canHit(c,o){if(o.fly&&c.tg==='g')return false;if(c.tg==='b'&&o.obj==='u')return false;return true}
function pathDist(u,o){if(u.fly||u.c.jump)return dist(u,o);if((u.y-RY)*(o.y-RY)>0)return dist(u,o);let m=1e9;for(const bx of BR){const d=Math.hypot(u.x-bx,u.y-RY)+Math.hypot(o.x-bx,o.y-RY);if(d<m)m=d}return m}
function findTarget(u){const c=u.c,sight=(c.sight||5.5)*TILE;let best=null,bd=1e9;
 if(c.tg!=='b'){for(const v of G.U)if(v.tm!==u.tm&&alive(v)&&canHit(c,v)){const d=dist(u,v)-v.r;if(d<sight&&d<bd){bd=d;best=v}}
  for(const o of G.B)if(o.tm!==u.tm&&alive(o)){const d=dist(u,o)-o.r;if(d<sight&&d<bd){bd=d;best=o}}
  for(const o of G.T)if(o.tm!==u.tm&&o.hp>0){const d=dist(u,o)-o.r;if(d<sight&&d<bd){bd=d;best=o}}
  if(best)return best}
 for(const o of G.B)if(o.tm!==u.tm&&alive(o)){const d=pathDist(u,o);if(d<bd){bd=d;best=o}}
 for(const o of G.T)if(o.tm!==u.tm&&o.hp>0){const d=pathDist(u,o);if(d<bd){bd=d;best=o}}
 return best}
function bestBridge(u,t){let bx=BR[0],m=1e9;for(const b of BR){const d=Math.hypot(u.x-b,u.y-RY)+Math.hypot(t.x-b,t.y-RY);if(d<m){m=d;bx=b}}return bx}
function goal(u,t){if(u.fly)return t;if(u.c.jump){if(Math.abs(u.y-RY)<RIV+8&&!u.jmp){u.jmp=1;AU.sfx('charge')}if(Math.abs(u.y-RY)>=RIV+8)u.jmp=0;return t}const dy=u.y-RY,s=Math.sign(dy)||1,s2=Math.sign(t.y-RY)||s;
 if(Math.abs(dy)>RIV+6&&s===s2){u.bx=null;return t}
 if(u.bx==null)u.bx=bestBridge(u,t);const bx=u.bx;
 if(Math.abs(dy)<=RIV+6){if(Math.abs(u.x-bx)>5&&Math.abs(dy)>RIV-3)return{x:bx,y:u.y};return{x:bx,y:RY+s2*(RIV+16)}}
 return{x:bx,y:RY+s*(RIV+4)}}
function spdOf(u){let s=SPD[u.c.spd]||30;if(u.rageT>0)s*=1.35;if(u.slowT>0)s*=1-u.slowF;if(u.charging)s*=2;return s}
function hitOf(u){let h=u.c.hit;if(u.rageT>0)h/=1.35;if(u.slowT>0)h/=1-u.slowF;return h}
function updUnit(u,dt){if(!alive(u))return;const c=u.c;
 u.fl=Math.max(0,u.fl-dt);u.sw=Math.max(0,u.sw-dt);u.spawnT=Math.max(0,u.spawnT-dt);
 if(u.slowT>0){u.slowT-=dt;if(u.slowT<=0)u.slowF=0}if(u.rageT>0)u.rageT-=dt;
 if(u.frozenT>0||u.stunT>0){u.frozenT=Math.max(0,u.frozenT-dt);u.stunT=Math.max(0,u.stunT-dt);u.run=0;u.charging=0;return}
 u.cd-=dt;
 if(u.tg&&!aliveT(u.tg)){u.tg=null;u.lock=0}
 u.rt-=dt;
 if(!u.lock&&u.rt<=0){const nt=findTarget(u);if(nt&&nt!==u.tg){u.tg=nt;u.cd=Math.max(u.cd,hitOf(u)*.35)}u.rt=CFG.retarget}
 const t=u.tg;if(!t)return;
 const d=dist(u,t),reach=c.rng*TILE+t.r+u.r*.6;
 if(Math.abs(t.x-u.x)>1)u.face=t.x<u.x?-1:1;
 if(d<=reach){u.lock=1;
  if(c.kami){explode(u,t);return}
  if(u.cd<=0){attack(u,t);u.cd=hitOf(u);u.sw=.28}}
 else{if(u.lock&&d>reach+12)u.lock=0;
  const g2=goal(u,t),gx=g2.x-u.x,gy=g2.y-u.y,gd=Math.hypot(gx,gy)||1,s=spdOf(u)*dt,m=Math.min(s,gd);
  u.x+=gx/gd*m;u.y+=gy/gd*m;u.ph+=dt*(spdOf(u)/5);
  if(c.charge){u.run+=m;if(!u.charging&&u.run>60){u.charging=1;AU.sfx('charge')}}}}
function attack(u,t){const c=u.c;let dmg=u.dmg;
 if(u.charging){dmg*=2;u.charging=0;ring(t.x,t.y,18,'#ffe9a8');G.shake=Math.max(G.shake,2)}u.run=0;
 if(c.chain){const ts=[t];for(const v of G.U)if(ts.length<c.chain&&v!==t&&v.tm!==u.tm&&alive(v)&&canHit(c,v)&&dist(u,v)<=c.rng*TILE+v.r+8)ts.push(v);
  for(const x of ts){hitTarget(u,x,dmg);if(c.stun)stunObj(x,c.stun);G.FX.push({k:'bolt',x:u.x,y:u.y-12-(u.fly?FLYOFF:0),x2:x.x,y2:x.y-8-(x.fly?FLYOFF:0),l:0,m:.18})}AU.sfx('zap');return}
 if(c.proj){G.PR.push({pk:c.proj,x:u.x,y:u.y-10-(u.fly?FLYOFF:0),tg:t,lx:t.x,ly:t.y,dmg,tm:u.tm,spl:(c.splash||0)*TILE,tgf:c.tg,slow:c.slow,stun:c.stun,td:c.td,sp:PSPD[c.proj]||250,from:{x:u.x,y:u.y},fly:t.fly,l:0});AU.sfx('shot');return}
 if(c.spin){hitTarget(u,t,dmg);areaHit(u.tm,u.x,u.y,c.splash*TILE+u.r,dmg,dmg,c.tg,{skip:t});G.FX.push({k:'swirl',x:u.x,y:u.y,r:c.splash*TILE,l:0,m:.3});AU.sfx('hit');return}
 if(c.tg==='b'&&c.fly){hitTarget(u,t,dmg);puff(t.x,t.y,'#555',8,50,2.6);ring(t.x,t.y,18,'#ffb347');AU.sfx('boom');return}
 hitTarget(u,t,dmg);if(c.slow)slowObj(t,c.slow);if(c.stun)stunObj(t,c.stun);
 puff(t.x,t.y-6,'#fff',2,30,1.8);G.FX.push({k:'slash',x:t.x,y:t.y-10-(t.fly?FLYOFF:0),a:rnd(-.7,.7),s:u.r>10?1.3:1,l:0,m:.2});AU.sfx('hit')}
function hitTarget(src,o,dmg){if((o.obj==='t'||o.obj==='b')&&src.c&&src.c.td)dmg*=src.c.td;damage(o,dmg,src.tm)}
function explode(u,t){areaHit(u.tm,t.x,t.y,u.c.splash*TILE,u.dmg,u.dmg,'ga');ring(t.x,t.y,u.c.splash*TILE,'#ffb347');puff(t.x,t.y,'#ff8a2a',12,70,3);AU.sfx('boom');u.hp=0;u.nodeath=1}
function areaHit(tm,x,y,r,dmg,tdmg,tg,opt){opt=opt||{};const p={x,y};
 if(tg!=='b')for(const v of G.U)if(v.tm!==tm&&v!==opt.skip&&alive(v)&&!(v.fly&&tg==='g')&&dist(v,p)<r+v.r*.5){damage(v,dmg,tm);
  if(opt.stun)stunObj(v,opt.stun);if(opt.slow)slowObj(v,opt.slow);if(opt.freeze)v.frozenT=Math.max(v.frozenT,opt.freeze);
  if(opt.knock&&v.mass<10&&!v.fly){const d=dist(v,p)||1;v.x+=(v.x-x)/d*opt.knock;v.y+=(v.y-y)/d*opt.knock}}
 for(const o of G.B)if(o.tm!==tm&&o!==opt.skip&&alive(o)&&dist(o,p)<r+o.r*.6){damage(o,tdmg,tm);if(opt.stun)stunObj(o,opt.stun);if(opt.freeze)o.frozenT=Math.max(o.frozenT,opt.freeze)}
 for(const o of G.T)if(o.tm!==tm&&o!==opt.skip&&o.hp>0&&dist(o,p)<r+o.r*.6){damage(o,tdmg,tm);if(opt.stun)stunObj(o,opt.stun);if(opt.freeze)o.frozenT=Math.max(o.frozenT,opt.freeze)}}
function stunObj(o,t){o.stunT=Math.max(o.stunT||0,t);if(o.obj==='u'){o.charging=0;o.run=0;o.cd=Math.max(o.cd,hitOf(o)*.5)}else o.cd=Math.max(o.cd||0,(o.hit||1)*.5)}
function slowObj(o,s){if(o.obj!=='u')return;o.slowT=Math.max(o.slowT,s.t);o.slowF=Math.max(o.slowF||0,s.f)}
function damage(o,d,fromTm){if(G.over||d<=0)return;if(!aliveT(o))return;
 if(o.shield>0){const a=Math.min(o.shield,d);o.shield-=a;d-=a;if(o.shield<=0)puff(o.x,o.y-12,'#ffe9a8',8,40,2);if(d<=0){o.fl=.08;return}}
 if(o.obj==='t')G.stats[fromTm].dmg+=Math.min(d,o.hp);
 o.hp-=d;o.fl=.1;
 if(o.obj==='t'){if(d>=25)floatText(o.x+rnd(-8,8),o.y-o.r-8,Math.round(d),o.tm?'#fff':'#ffd2cc');if(o.kind==='k')wakeKing(o);if(o.hp<=0){o.hp=0;towerDown(o)}}}
function wakeKing(k){if(k.act)return;k.act=1;k.wake=CFG.tower.k.wakeAim;AU.sfx('wake');floatText(k.x,k.y+(k.tm?k.r+16:-k.r-16),'Король проснулся!','#ffd27a',12)}
function crownsOf(tm){let c=0;for(const t of G.T)if(t.tm!==tm&&t.hp<=0)c+=t.kind==='k'?3:1;return Math.min(3,c)}
function towerDown(t){if(t.dead)return;t.dead=1;t.hp=0;
 puff(t.x,t.y,'#8d8577',34,110,5);puff(t.x,t.y,'#3b3730',18,70,4);ring(t.x,t.y,70,'#ffd27a');G.shake=12;G.DEC.push({x:t.x,y:t.y,r:t.r+8,l:999});AU.sfx('tower');
 G.FX.push({k:'crown',x:t.x,y:t.y-24,tm:1-t.tm,n:t.kind==='k'?3:1,l:0,m:1.6});setTimeout(()=>AU.sfx(t.tm?'crown':'crownLose'),250);
 if(t.kind==='p')for(const k of G.T)if(k.tm===t.tm&&k.kind==='k')wakeKing(k);
 G.crowns=[crownsOf(0),crownsOf(1)];const win=1-t.tm;
 for(const b of G.bots)if(b&&RNG()<.55)emote(b.tm,b.tm===t.tm?2:3);
 G.downs.push({tm:t.tm,kind:t.kind})}
function finish(res){if(G.over)return;G.over=1;G.res=res;G.endAt=(typeof performance!=='undefined'?performance.now():0)+CFG.match.endDelay*1000;
 if(res===0&&!G.bots[0]&&!REDUCE)for(let i=0;i<110;i++)G.CF.push({x:rnd(0,W),y:rnd(-120,-5),vx:rnd(-25,25),vy:rnd(50,130),r:rnd(0,6.28),vr:rnd(-9,9),w:rnd(3,6),c:pickR(['#ffc83d','#3da5ff','#ff5c4d','#5ef2d0','#c77dff','#ffffff']),l:0,m:rnd(2.2,3.4)});for(const b of G.bots)if(b&&RNG()<.7)emote(b.tm,G.res===b.tm?3:1)}
/* исход по упавшим за тик башням: король — сразу победа и 3 короны (оба короля — ничья);
   в овертайме и «внезапной смерти» первая башня решает, но если обе стороны потеряли башню в один тик — бой продолжается */
function resolveDowns(){if(!G.downs.length||G.over)return;const d=G.downs;G.downs=[];
 const kings=[0,1].filter(tm=>d.some(x=>x.tm===tm&&x.kind==='k'));
 if(kings.length===2)return finish(2);
 if(kings.length===1){const lose=kings[0],win=1-lose;for(const t of G.T)if(t.tm===lose&&t.hp>0){t.hp=0;t.dead=1;puff(t.x,t.y,'#8d8577',24,90,4)}G.crowns[win]=3;return finish(win)}
 if(G.ot||G.mc.sudden){const sides=[...new Set(d.map(x=>x.tm))];if(sides.length===1)finish(1-sides[0])}}
/* тайбрейкер: войска исчезают, все башни синхронно теряют HP; проигрывает владелец самой слабой башни, равные — ничья */
function startTiebreak(){for(const u of G.U)puff(u.x,u.y,'#e8e0cb',6,40,2.4);G.U=[];G.B=[];G.PR=[];G.Z=[];G.D=[];G.S=[];
 for(const S of G.side){S.champ=null;S.pend=[]}
 const low=tm=>Math.min(...G.T.filter(t=>t.tm===tm&&t.hp>0).map(t=>t.hp)),a=Math.round(low(0)),b=Math.round(low(1));
 G.tb={t:0,dur:CFG.match.tiebreak,res:a===b?2:a<b?1:0,drain:Math.min(a,b)};banner('Тайбрейкер','#ffc83d')}
function stepTiebreak(dt){const b=G.tb;b.t=Math.min(b.dur,b.t+dt);const k=dt/b.dur*b.drain;
 for(const t of G.T)if(t.hp>0){t.hp=Math.max(1,t.hp-k);t.fl=.05}
 if(b.t<b.dur)return;
 if(b.res===2)return finish(2);
 const lose=1-b.res,t=G.T.filter(t=>t.tm===lose&&t.hp>0).sort((x,y)=>x.hp-y.hp)[0];t.hp=0;t.dead=1;puff(t.x,t.y,'#8d8577',30,100,5);AU.sfx('tower');
 G.crowns[b.res]=Math.min(3,G.crowns[b.res]+1);finish(b.res)}

/* ---------- строения, башни, снаряды ---------- */
function updTower(t,dt){t.fl=Math.max(0,t.fl-dt);if(t.hp<=0)return;
 if(t.frozenT>0){t.frozenT-=dt;return}if(t.stunT>0){t.stunT-=dt;return}
 if(t.kind==='k'){if(!t.act)return;if(t.wake>0){t.wake-=dt;if(t.wake<=0)t.cd=CFG.tower.k.wakeShot;return}}
 t.cd-=dt;let best=null;
 if(t.tg&&alive(t.tg)&&dist(t,t.tg)-t.tg.r<=t.rng)best=t.tg;
 else{let bd=t.rng;for(const u of G.U)if(u.tm!==t.tm&&alive(u)){const d=dist(t,u)-u.r;if(d<bd){bd=d;best=u}}
  if(!best)for(const b of G.B)if(b.tm!==t.tm&&alive(b)){const d=dist(t,b)-b.r;if(d<bd){bd=d;best=b}}}
 t.tg=best;
 if(!best&&t.mag&&t.ammo<t.mag){t.rl=(t.rl||0)+dt;if(t.rl>.45){t.rl=0;t.ammo++}}
 if(best){t.ang=Math.atan2(best.y-t.y,best.x-t.x);if(t.cd<=0){if(t.mag){t.ammo--;t.cd=t.ammo>0?t.hit:t.reload;if(t.ammo<=0)t.ammo=t.mag}else t.cd=t.hit;G.PR.push({pk:t.kind==='k'?'king':t.pk||'tower',tw:1,x:t.x,y:t.y-(t.kind==='k'?26:30),tg:best,lx:best.x,ly:best.y,dmg:t.dmg,tm:t.tm,spl:0,sp:PSPD.tower,fly:best.fly,l:0});AU.sfx('shot')}}}
function updBuilding(b,dt){b.fl=Math.max(0,b.fl-dt);b.spawnT=Math.max(0,b.spawnT-dt);if(!alive(b))return;b.hp-=b.mx/b.c.life*dt;if(b.hp<=0){b.hp=0;return}
 if(b.frozenT>0){b.frozenT-=dt;return}if(b.stunT>0){b.stunT-=dt;return}
 b.at=Math.max(0,b.at-dt*3);
 if(b.c.spawn){b.spT-=dt;if(b.spT<=0){b.spT=b.c.spawn.every;b.at=1;for(let i=0;i<b.c.spawn.n;i++)G.U.push(mkUnit(b.tm,b.c.spawn.id,b.x+rnd(-8,8),b.y+(b.tm?16:-16)+rnd(-3,3),b.lvl));puff(b.x,b.y-6,'#cfe8c0',5,30,2)}}
 if(b.c.dmg){b.cd-=dt;let best=null,bd=b.c.rng*TILE;for(const u of G.U)if(u.tm!==b.tm&&alive(u)&&canHit(b.c,u)){const d=dist(b,u)-u.r;if(d<bd){bd=d;best=u}}
  if(best){b.ang=Math.atan2(best.y-(b.y-10),best.x-b.x);if(b.cd<=0){b.cd=b.c.hit;b.at=1;G.PR.push({pk:'ball',x:b.x,y:b.y-12,tg:best,lx:best.x,ly:best.y,dmg:b.dmg,tm:b.tm,spl:0,sp:PSPD.ball,fly:best.fly,l:0});AU.sfx('shot')}}}}
function updProj(p,dt){p.l+=dt;
 if(p.pk!=='bomb'&&p.tg&&aliveT(p.tg)){p.lx=p.tg.x;p.ly=p.tg.y}
 const dx=p.lx-p.x,dy=p.ly-p.y,d=Math.hypot(dx,dy),s=p.sp*dt;
 if(d<=s+3||p.l>3){p.done=1;impact(p);return}p.x+=dx/d*s;p.y+=dy/d*s}
function impact(p){const x=p.lx,y=p.ly;
 if(p.spl>0){areaHit(p.tm,x,y,p.spl,p.dmg,p.dmg*(p.td||1),p.tgf||'ga',{slow:p.slow,stun:p.stun});ring(x,y,p.spl,p.pk==='ice'?'#bfe6ff':'#ffb347');puff(x,y,p.pk==='ice'?'#d8f2ff':p.pk==='bomb'?'#666':'#ffb347',8,60,2.6);if(p.pk==='bomb'||p.pk==='orb')AU.sfx('boom')}
 else{const t=p.tg;if(aliveT(t)){let d=p.dmg;if((t.obj==='t'||t.obj==='b')&&p.td)d*=p.td;damage(t,d,p.tm);if(p.slow)slowObj(t,p.slow);if(p.stun)stunObj(t,p.stun)}puff(x,y-4,'#fff',3,34,1.6)}}
function onDeath(o){const c=o.c;if(o.nodeath)return;
 puff(o.x,o.y,o.obj==='b'?'#9a8f7a':'#e8e0cb',8,50,2.6);if(o.obj==='u'){G.FX.push({k:'soul',x:o.x,y:o.y-(o.fly?FLYOFF:0),c:TEAM[o.tm].l,s:Math.min(1.6,o.r/8),l:0,m:.8});AU.sfx('pop')}
 if(c.death){const d=LV(c.death.dmg,o.lvl);areaHit(o.tm,o.x,o.y,c.death.r*TILE,d,d,'g');ring(o.x,o.y,c.death.r*TILE,'#ffb347');puff(o.x,o.y,'#ffb347',12,80,3);AU.sfx('boom');G.shake=Math.max(G.shake,3)}
 if(c.dspawn)for(let i=0;i<c.dspawn.n;i++){const a=i/c.dspawn.n*6.28+rnd(0,1);G.U.push(mkUnit(o.tm,c.dspawn.id,clamp(o.x+Math.cos(a)*10,10,W-10),o.y+Math.sin(a)*10,o.lvl))}
 if(o.obj==='b')ring(o.x,o.y,28,'#ffffff')}
function separate(){const L=G.U;
 for(let i=0;i<L.length;i++){const a=L[i];if(!alive(a))continue;
  for(let j=i+1;j<L.length;j++){const b=L[j];if(!alive(b)||a.fly!==b.fly)continue;const dx=a.x-b.x,dy=a.y-b.y,m=a.r+b.r-1,d2=dx*dx+dy*dy;
   if(d2<m*m&&d2>1e-4){const d=Math.sqrt(d2),f=m-d,wa=b.mass/(a.mass+b.mass),wb=1-wa;a.x+=dx/d*f*wa;a.y+=dy/d*f*wa;b.x-=dx/d*f*wb;b.y-=dy/d*f*wb}}
  if(!a.fly){for(const t of G.T)if(t.hp>0)pushOut(a,t);for(const o of G.B)if(alive(o))pushOut(a,o);
   if(Math.abs(a.y-RY)<RIV&&!a.c.jump){let nb=1e9;for(const bx of BR)nb=Math.min(nb,Math.abs(a.x-bx));if(nb>19)a.y=RY+(a.y<RY?-RIV:RIV)}}
  a.x=clamp(a.x,8,W-8);a.y=clamp(a.y,8,H-8)}}
function pushOut(a,o){const dx=a.x-o.x,dy=a.y-o.y,d=Math.hypot(dx,dy),m=o.r+a.r*.6;if(d<m&&d>.01){a.x+=dx/d*(m-d);a.y+=dy/d*(m-d)}}

/* ---------- эффекты ---------- */
function puff(x,y,col,n,sp,size){if(!G)return;if(REDUCE)n=Math.ceil(n/3);for(let i=0;i<n;i++){const a=rnd(0,6.28),s=rnd(.3,1)*sp;G.PT.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-sp*.15,l:0,m:rnd(.35,.8),c:col,s:size*rnd(.6,1.2)})}if(G.PT.length>500)G.PT.splice(0,G.PT.length-500)}
function ring(x,y,r,col){G.FX.push({k:'ring',x,y,r,l:0,m:.4,c:col})}
function boomFx(x,y,r){ring(x,y,r*1.3,'#ffb347');ring(x,y,r*.7,'#fff3c0');G.DEC.push({x,y,r:r*.7,l:6});for(let i=0;i<24;i++)puff(x,y,['#ffb347','#ff6a1a','#fff3c0','#6a3b22'][i%4],1,rnd(40,120),rnd(2,4.5));G.shake=Math.max(G.shake,6);AU.sfx('boom')}
function floatText(x,y,txt,col,size){G.TX.push({x,y,t:txt,c:col||'#fff',l:0,m:1,s:size||11})}
function banner(txt,col){G.TX.push({x:W/2,y:RY-40,t:txt,c:col||'#fff',l:0,m:2.2,s:18,big:1});AU.sfx('phase')}
function emote(tm,i){if(!G||G.over&&G.endAt<performance.now())return;const last=G.EM.find(e=>e.tm===tm);if(last&&last.l<1)return;G.EM=G.EM.filter(e=>e.tm!==tm);G.EM.push({tm,txt:EMOTES[i],l:0,m:2.4});AU.sfx('emote')}

/* ---------- шаг ---------- */
/* один тик симуляции (CFG.sim.hz раз в секунду) */
const TICK=1/CFG.sim.hz;
function step(dt){if(!G)return;dt=dt||TICK;if(G.over){fxStep(dt);return}
 G.tick++;
 if(G.tb){stepTiebreak(dt);fxStep(dt);return}
 const M=CFG.match,m0=elRate();G.t+=dt;
 if(G.mc.sudden&&G.t>=M.len)return startTiebreak();
 if(!G.ot&&!G.mc.sudden&&G.t>=M.len){if(G.crowns[0]!==G.crowns[1])return finish(G.crowns[0]>G.crowns[1]?0:1);G.ot=1;G.otT=0;banner('Овертайм','#ffc83d')}
 if(G.ot){G.otT+=dt;if(G.otT>=M.ot)return startTiebreak()}
 const m=elRate();if(m>m0)banner(m===2?'Двойной эликсир!':'Тройной эликсир!','#e08bff');
 const r=dt/CFG.elixir.period*m,mx=CFG.elixir.max;
 for(const S of G.side){if(S.el>=mx)G.stats[S.tm].leak+=r;const b=G.bots[S.tm];S.el=Math.min(mx,S.el+r*(b?b.s.el:1));S.abCd=Math.max(0,S.abCd-dt);
  for(const p of S.pend){p.t-=dt;if(p.t<=0){S.hand[p.i]=p.key;p.done=1}}S.pend=S.pend.filter(p=>!p.done)}
 for(const b of G.bots)if(b)botThink(b,dt);
 updDeploys(dt);
 for(const u of G.U)updUnit(u,dt);
 separate();
 for(const b of G.B)updBuilding(b,dt);
 for(const t of G.T)updTower(t,dt);
 for(const p of G.PR)updProj(p,dt);
 updZones(dt);
 for(const s of G.S)if(!s.done&&G.t>=s.t){s.done=1;s.fn()}
 for(const t of G.T)if(t.hp>0&&t.hp<t.mx*.4&&RNG()<dt*6)G.PT.push({x:t.x+rnd(-8,8),y:t.y-10,vx:rnd(-6,6),vy:-rnd(14,28),l:0,m:rnd(.6,1.1),c:'#6e6a66',s:rnd(2,4)});
 for(let i=0;i<G.U.length;i++){const u=G.U[i];if(u.hp<=0&&!u.gone){u.gone=1;onDeath(u)}}
 for(const b of G.B)if(b.hp<=0&&!b.gone){b.gone=1;onDeath(b)}
 G.U=G.U.filter(u=>!u.gone);G.B=G.B.filter(b=>!b.gone);G.PR=G.PR.filter(p=>!p.done);G.S=G.S.filter(s=>!s.done);
 // чемпион вне цикла, пока жив: карта возвращается в очередь после его гибели
 for(const S of G.side)if(S.champ&&!alive(S.champ)){S.champ=null;if(S.champCard){S.queue.push(S.champCard);S.champCard=null}}
 resolveDowns();
 fxStep(dt)}
function fxStep(dt){for(const f of G.FX)f.l+=dt;G.FX=G.FX.filter(f=>f.l<f.m);
 for(const p of G.PT){p.l+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=40*dt}G.PT=G.PT.filter(p=>p.l<p.m);
 for(const x of G.TX){x.l+=dt;if(!x.big)x.y-=22*dt}G.TX=G.TX.filter(x=>x.l<x.m);
 for(const d of G.DEC)d.l-=dt;G.DEC=G.DEC.filter(d=>d.l>0);
 for(const e of G.EM)e.l+=dt;G.EM=G.EM.filter(e=>e.l<e.m);
 for(const f of G.CF){f.l+=dt;f.x+=f.vx*dt+Math.sin(f.l*4+f.r)*12*dt;f.y+=f.vy*dt;f.vy+=24*dt;f.r+=f.vr*dt}G.CF=G.CF.filter(f=>f.l<f.m);
 G.shake=Math.max(0,G.shake-dt*28)}
