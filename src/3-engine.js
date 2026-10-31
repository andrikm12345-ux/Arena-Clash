/* ================= БОЙ: ДВИЖОК ================= */
let G=null,uid=0;
const PSPD={shell:170,arrow:300,stone:260,bolt:340,orb:220,flame:200,bomb:150,ball:280,ice:230,tower:320,king:300};
/* o: decks, lv, kl, bots, names, train, mode, ex (эво/герой), tt (башенные бойцы), thp (множитель HP башен), seed */
/* случайность: у боя свой поток (G.simR), у каждого бота — свой, чтобы повтор по журналу команд без ботов совпадал точно */
function newMatch(o){uid=0;const seed=Number.isInteger(o.seed)?o.seed:(Math.random()*2147483647|0);const simR=mul(seed);RNG=simR;
 const T=[],tt=o.tt||['archer','archer'],A=CFG.arena,mc=CFG.modes[o.mode]||CFG.modes.normal;
 for(const tm of[0,1]){const kl=o.kl[tm],thp=o.thp?o.thp[tm]:1;
  for(const [kind,x,y] of[['p',A.princess[0]*TILE,A.princess[1]*TILE],['p',W-A.princess[0]*TILE,A.princess[1]*TILE],['k',A.king[0]*TILE,A.king[1]*TILE]]){const d=TOWER[kind],hp=Math.round(LV(d.hp,kl)*thp);
   T.push({id:++uid,obj:'t',kind,tm,x,y:tm?H-y:y,r:d.r,hp,mx:hp,dmg:LV(d.dmg,kl),hit:d.hit,rng:d.rng*TILE,cd:rnd(0,.4),fl:0,act:kind==='p'?1:0,wake:0,ang:tm?Math.PI/2:-Math.PI/2,frozenT:0,stunT:0,lvl:kl,fly:false,tg:null});
   if(kind==='p'){const q=TT[tt[tm]]||TT.archer,t=T[T.length-1];t.hp=t.mx=Math.round(hp*q.hp);t.dmg=Math.round(t.dmg*q.dmg);t.hit*=q.hit;t.pk=q.pk;t.tt=tt[tm];if(q.mag){t.mag=t.ammo=q.mag;t.reload=q.reload}}}}
 G={seed,simR,log:[],replay:o.replay||null,rpi:0,setup:null,mc,tick:0,downs:[],tb:null,t:0,ot:0,otT:0,over:0,res:-1,endAt:0,crowns:[0,0],U:[],B:[],T,PR:[],FX:[],Z:[],D:[],S:[],PT:[],TX:[],DEC:[],EM:[],CF:[],shake:0,
  side:[0,1].map(tm=>mkSide(tm,o.decks[tm],o.lv[tm],o.kl[tm],o.ex&&o.ex[tm],mc.elStart)),mode:o.mode||'normal',bots:[0,1].map(tm=>o.bots[tm]?mkBot(tm,o.bots[tm]):null),
  names:o.names||['Ты','Соперник'],train:!!o.train,tl:[0],tlEv:[],force:null,rules:Object.assign({},CFG.arenaRules[o.arena||0]),stormT:0,bridges:BR.map(x=>({x,hp:CFG.bridge.hp*((CFG.arenaRules[o.arena||0]||{}).brHp||1),mx:CFG.bridge.hp*((CFG.arenaRules[o.arena||0]||{}).brHp||1),down:0})),riv:RIVER.slice(),cyc:CFG.cycle.on&&mc.cycle!==0?1:0,night:0,vis:null,stats:[0,1].map(()=>({bridges:0,night:0,lost:0,trade:0,dmg:0,spent:0,played:0,spells:0,leak:0,fullCur:0,fullN:0,fullSum:0,fullMax:0}))};
 G.side.forEach((S,tm)=>{S.elMul=o.elMul?o.elMul[tm]:G.bots[tm]?G.bots[tm].s.el:1});
 G.bots.forEach((b,tm)=>{if(b){b.r=mul(seed*31+tm+7);b.think=1.2+b.r()*1.3;b.lane=b.r()<.5?0:1}});
 G.setup={arena:o.arena||0,elMul:G.side.map(S=>S.elMul),decks:o.decks,lv:o.lv,kl:o.kl,mode:o.mode||'normal',ex:o.ex||null,tt:o.tt||null,thp:o.thp||null,seed,names:G.names,train:G.train};
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
function blocked(x,y,r){for(const t of G.T)if(t.hp>0&&hy(t.x-x,t.y-y)<t.r+r)return true;for(const b of G.B)if(alive(b)&&hy(b.x-x,b.y-y)<b.r+r)return true;return false}
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
/* все розыгрыши и способности идут журналом команд: tk — тик, ph — 0 до тика (игрок), 1 — в фазе ботов */
function playCard(tm,i,x,y){const R0=RNG;RNG=G.simR;let ok;try{ok=doPlay(tm,i,x,y)}finally{RNG=R0}if(ok)G.log.push({k:'p',tk:G.tick,ph:G.inBots?1:0,tm,i,x,y});return ok}
function doPlay(tm,i,x,y){const S=G.side[tm],key=S.hand[i],c=CARDS[key];if(G.tb||G.over||!key||S.el<c.cost||cardBlocked(tm,key)||!canPlace(tm,key,x,y))return false;
 S.el-=c.cost;G.stats[tm].spent+=c.cost;G.stats[tm].played++;if(G.night)G.stats[tm].night++;if(c.type==='spell')G.stats[tm].spells++;S.hand[i]=null;S.pend.push({i,key:S.queue.shift(),t:CFG.hand.delay[elRate()]||CFG.hand.delay[1]});if(isAb(S,key))S.champCard=key;else S.queue.push(key);S.last={x,y,key,t:G.t};
 let fl=null;if(key===S.evo){if(S.evoN>=EVO[key].cyc){fl={evo:1};S.evoN=0}else S.evoN++}else if(key===S.hero)fl={hero:1};
 deploy(tm,key,x,y,fl);return true}
function deploy(tm,key,x,y,fl){const c=CARDS[key],lvl=G.side[tm].lv[key]||1;fl=fl||null;
 if(c.type==='spell'){castSpell(tm,key,x,y,lvl);return}
 const dep=c.dep??1;
 if(c.tunnel){const k=G.T.find(t=>t.tm===tm&&t.kind==='k');const tt=hy(x-k.x,y-k.y)/120;G.D.push({key,tm,x,y,lvl,fl,t:tt+dep,tot:tt+dep,tun:tt,sx:k.x,sy:k.y});AU.sfx('dep');return}
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
  const u=mkUnit(tm,uk,ux,uy,lvl,uc);if(uc.shield){u.shield=u.smx=LV(uc.shield,lvl)}if(u.mass>=CFG.phys.deployPushMass&&!u.fly)for(const v of G.U)if(alive(v)&&!v.fly&&v.mass<u.mass){const d=dist(u,v);if(d<u.r+v.r+12&&d>.1)impulse(v,(v.x-u.x)/d,(v.y-u.y)/d,CFG.phys.deployPush*Math.min(1,u.mass/(v.mass*3)))}if(c.evo){u.evo=1;if(EVO[key].shield){u.shield=u.smx=LV(EVO[key].shield,lvl)}}if(c.hero)u.hero=1;G.U.push(u);if(uc.ability)G.side[tm].champ=u}
 if(c.zap){const z=LV(c.zap,lvl);areaHit(tm,x,y,2*TILE,z,z,'ga',{stun:.5});G.FX.push({k:'zapring',x,y,r:2*TILE,l:0,m:.35});AU.sfx('zap')}
 puff(x,y,'#d9cfb4',6,40,2.4);ring(x,y,22,TEAM[tm].m)}

/* ---------- заклинания ---------- */
/* размен: сколько эликсира врага убило заклинание; выгода от +1 всплывает над полем и копится в статистике */
function withTrade(tr,fn){const p=G.tr;G.tr=tr;try{fn()}finally{G.tr=p}}
function tradeReport(tr,x,y){if(!tr||tr.done)return;tr.done=1;const g=Math.floor(tr.val-tr.cost+.2);if(g>=1){floatText(x,y-30,`+${g} эликсира`,tr.tm?'#ff9a8a':'#ffd84d',13);G.stats[tr.tm].trade+=g}}
function castSpell(tm,key,x,y,lvl){const c=CARDS[key],tr={tm,cost:c.cost,val:0};withTrade(tr,()=>castSpell0(tm,key,x,y,lvl,tr));if(!G.Z.some(z=>z.tr===tr)&&!G.S.some(s=>s.tr===tr))tradeReport(tr,x,y)}
/* эффекты заклинаний — таблица: первый подходящий по полям карты (when) накладывает эффект (cast).
   Новое заклинание = новая строка здесь или готовое поле карты; движок не трогаем */
const SPELL_FX={
 fireball:{when:(c,k)=>k==='fireball',cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){const k=G.T.find(t=>t.tm===tm&&t.kind==='k'),tt=Math.max(.35,hy(x-k.x,y-k.y)/300);
  G.FX.push({k:'meteor',x:k.x,y:k.y-30,x2:x,y2:y,l:0,m:tt});G.S.push({t:G.t+tt,tr,fn:()=>{withTrade(tr,()=>areaHit(tm,x,y,r,dmg,tdmg,'ga',{knock:c.knock,br:tdmg,crater:1}));boomFx(x,y,r);G.Z.push({k:'glow',tm,x,y,r,t:CFG.cycle.light.boomT,tot:CFG.cycle.light.boomT,light:CFG.cycle.light.boom*TILE});tradeReport(tr,x,y)}});AU.sfx('shot');return}},
 waves:{when:(c,k)=>c.waves,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){for(let w=0;w<c.waves;w++)G.S.push({t:G.t+.45+w*.3,tr,fn:()=>{withTrade(tr,()=>areaHit(tm,x,y,r,dmg/c.waves,tdmg/c.waves,'ga'));if(w===c.waves-1)tradeReport(tr,x,y);ring(x,y,r,'#ffffff');AU.sfx('hit');for(let i=0;i<8;i++){const a=rnd(0,6.28),d=Math.sqrt(RNG())*r;puff(x+Math.cos(a)*d,y+Math.sin(a)*d,'#e9eef7',2,20,1.6)}}});
  for(let i=0;i<28;i++){const a=rnd(0,6.28),d=Math.sqrt(RNG())*r;G.FX.push({k:'rain',x:x+Math.cos(a)*d+16,y:y+Math.sin(a)*d-80,x2:x+Math.cos(a)*d,y2:y+Math.sin(a)*d,l:-rnd(0,.95),m:.3})}AU.sfx('shot');return}},
 freeze:{when:(c,k)=>c.freeze,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){areaHit(tm,x,y,r,dmg,tdmg,'ga',{freeze:c.freeze});G.Z.push({k:'freeze',tm,x,y,r,t:c.freeze,tot:c.freeze});AU.sfx('freeze');return}},
 stun:{when:(c,k)=>c.stun,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){areaHit(tm,x,y,r,dmg,tdmg,'ga',{stun:c.stun});G.FX.push({k:'zapring',x,y,r,l:0,m:.35});AU.sfx('zap');return}},
 rage:{when:(c,k)=>c.rage,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){G.Z.push({k:'rage',tm,x,y,r,t:c.rage,tot:c.rage});AU.sfx('rage');return}},
 pull:{when:(c,k)=>c.pull,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){G.Z.push({k:'pull',tr,tm,x,y,r,t:c.pull,tot:c.pull,tick:0,dmg:dmg/4,tdmg:tdmg/4,spd:c.pullSpd});AU.sfx('poison');return}},
 bdmg:{when:(c,k)=>c.bdmg,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){const k=G.T.find(t=>t.tm===tm&&t.kind==='k'),tt=Math.max(.35,hy(x-k.x,y-k.y)/320);G.FX.push({k:'meteor',x:k.x,y:k.y-30,x2:x,y2:y,l:0,m:tt});G.S.push({t:G.t+tt,tr,fn:()=>{withTrade(tr,()=>areaHit(tm,x,y,r,dmg,tdmg,'ga',{br:c.bdmg,crater:1}));boomFx(x,y,r);tradeReport(tr,x,y)}});AU.sfx('shot');return}},
 force:{when:(c,k)=>c.force,cast(c,tm){G.force={k:c.force.k,t:c.force.t,tot:c.force.t};banner(c.force.k?'Затмение!':'Рассвет!',c.force.k?'#9fb4ff':'#ffd27a');G.FX.push({k:'sky',n:c.force.k,l:0,m:c.force.t});AU.sfx(c.force.k?'eclipse':'dawn')}},
 flash:{when:(c,k)=>c.flash,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){G.Z.push({k:'flash',tm,x,y,r,t:c.flash.t,tot:c.flash.t,light:c.flash.light*TILE});G.FX.push({k:'flashfx',x,y,r,l:0,m:.7});areaHit(tm,x,y,r,dmg,tdmg,'ga',{stun:c.blind});AU.sfx('flash');return}},
 shade:{when:(c,k)=>c.shade,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){G.Z.push({k:'shade',tm,x,y,r,t:c.shade,tot:c.shade});AU.sfx('shade');return}},
 roll:{when:(c,k)=>c.roll,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){const dir=tm?1:-1;G.Z.push({k:'roll',tr,tm,x,y,r,t:99,tot:99,dir,left:c.roll.len*TILE,spd:c.roll.spd,dmg,tdmg,knock:c.knock,hit:new Set(),ang:0});AU.sfx('hit');return}},
 grave:{when:(c,k)=>c.grave,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){const g=c.grave;G.Z.push({k:'grave',tm,x,y,r,t:g.t,tot:g.t,every:g.t/g.n,tick:.5,id:g.id,lvl,cc:g.td?Object.assign({},CARDS[g.id],{td:g.td}):null});AU.sfx('grave');return}},
 heal:{when:(c,k)=>c.heal,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){G.Z.push({k:'heal',tm,x,y,r,t:c.healT,tot:c.healT,hps:LV(c.heal,lvl)/c.healT});AU.sfx('ability');return}},
 poison:{when:(c,k)=>c.poison,cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr){G.Z.push({k:'poison',tr,tm,x,y,r,t:c.poison,tot:c.poison,tick:.5,dps:dmg/c.poison,tdps:tdmg/c.poison});AU.sfx('poison')}}};
const SPELL_ORDER=Object.keys(SPELL_FX);
function castSpell0(tm,key,x,y,lvl,tr){const c=CARDS[key],r=c.rad*TILE,dmg=LV(c.dmg||0,lvl),tdmg=LV(c.tdmg||0,lvl);
 for(const n of SPELL_ORDER){const f=SPELL_FX[n];if(f.when(c,key)){f.cast(c,tm,key,x,y,r,dmg,tdmg,lvl,tr);return}}}
function updZones(dt){for(const z of G.Z){const p0=G.tr;if(z.tr)G.tr=z.tr;try{updZone(z,dt)}finally{G.tr=p0}if(z.t<=0&&z.tr)tradeReport(z.tr,z.x,z.y)}
 G.Z=G.Z.filter(z=>z.t>0)}
/* поведение зон по типу z.k: вызывается каждый тик, пока зона жива */
const ZONE_FX={
 rage(z,dt){for(const u of G.U)if(u.tm===z.tm&&alive(u)&&dist(u,z)<z.r+u.r)u.rageT=Math.max(u.rageT,.6)},
 poison(z,dt){for(const u of G.U)if(u.tm!==z.tm&&alive(u)&&dist(u,z)<z.r+u.r*.5){u.slowT=Math.max(u.slowT,.3);u.slowF=Math.max(u.slowF,.15)}
   z.tick-=dt;if(z.tick<=0){z.tick+=1;areaHit(z.tm,z.x,z.y,z.r,z.dps,z.tdps,'ga')}},
 pull(z,dt){ // вихрь тянет к центру; чем тяжелее юнит, тем медленнее
   for(const u of G.U)if(u.tm!==z.tm&&alive(u)&&!u.dashing){const d=dist(u,z);if(d<z.r+u.r&&d>1){const s=Math.min(d,z.spd*Math.min(1,(m=>m*Math.sqrt(Math.sqrt(m)))(CFG.phys.pullMass/u.mass))*dt);u.x+=(z.x-u.x)/d*s;u.y+=(z.y-u.y)/d*s;u.lock=0;u.wu=0}}
   z.tick-=dt;if(z.tick<=0){z.tick+=z.tot/4;areaHit(z.tm,z.x,z.y,z.r,z.dmg,z.tdmg,'ga')}},
 roll(z,dt){ // каток: катится по полю, каждого бьёт один раз и толкает вперёд по ходу
   const s=Math.min(z.left,z.spd*dt);z.y+=z.dir*s;z.left-=s;z.ang+=s/12;if(z.left<=0||z.y<8||z.y>H-8)z.t=0;
   for(const v of G.U)if(v.tm!==z.tm&&alive(v)&&!v.fly&&!z.hit.has(v)&&Math.abs(v.x-z.x)<z.r+v.r*.5&&Math.abs(v.y-z.y)<10+v.r){z.hit.add(v);damage(v,z.dmg,z.tm);
    if(v.mass<CFG.phys.knockMinMass&&!v.dashing&&!(v.shield>0)){impulse(v,0,z.dir,z.knock*CFG.phys.knockDamp);v.wu=0;v.lock=0;v.rt=0;v.beamT=0}}
   for(const o of[...G.B,...G.T])if(o.tm!==z.tm&&!z.hit.has(o)&&(o.obj==='t'?o.hp>0:alive(o))&&Math.abs(o.x-z.x)<z.r+o.r*.6&&Math.abs(o.y-z.y)<10+o.r*.6){z.hit.add(o);damage(o,o.obj==='t'?z.tdmg:z.dmg,z.tm)}
   if(G.tick%3===0)puff(z.x+rnd(-z.r,z.r),z.y,'#c9b99a',1,30,2)},
 grave(z,dt){z.tick-=dt;if(z.tick<=0&&z.t>.3){z.tick+=z.every;for(let n=0;n<8;n++){const a=rnd(0,6.28),d=Math.sqrt(RNG())*z.r*.9,px=clamp(z.x+dcos(a)*d,10,W-10),py=z.y+dsin(a)*d;
     if(Math.abs(py-RY)<RIV+4||G.T.some(t=>t.hp>0&&dist(t,{x:px,y:py})<t.r+TILE))continue;const u=mkUnit(z.tm,z.id,px,py,z.lvl,z.cc);G.U.push(u);G.FX.push({k:'gravefx',x:px,y:py,l:0,m:.8});puff(px,py,'#6b5a7a',6,30,2.2);break}}},
 crater(z,dt){for(const u of G.U)if(alive(u)&&!u.fly&&dist(u,z)<z.r+u.r*.3)u.mudT=.2},
 heal(z,dt){for(const u of G.U)if(u.tm===z.tm&&alive(u)&&dist(u,z)<z.r+u.r*.5)u.hp=Math.min(u.mx,u.hp+z.hps*dt)},
 aura(z,dt){if(alive(z.u)){z.x=z.u.x;z.y=z.u.y}for(const u of G.U)if(u.tm===z.tm&&alive(u)&&dist(u,z)<z.r)u.rageT=Math.max(u.rageT,.5)}};
function updZone(z,dt){z.t-=dt;const f=ZONE_FX[z.k];if(f)f(z,dt)}
function useAbility(tm){const R0=RNG;RNG=G.simR;let ok;try{ok=doAbility(tm)}finally{RNG=R0}if(ok)G.log.push({k:'a',tk:G.tick,ph:G.inBots?1:0,tm});return ok}
function applyReplay(ph){const L=G.replay;while(G.rpi<L.length&&L[G.rpi].tk===G.tick&&L[G.rpi].ph===ph){const c=L[G.rpi++];if(c.k==='p')doPlay(c.tm,c.i,c.x,c.y);else doAbility(c.tm)}}
function doAbility(tm){const S=G.side[tm],u=S.champ;if(!alive(u))return false;const a=u.c.ability;if(S.abCd>0||S.el<a.cost)return false;
 S.el-=a.cost;S.abCd=a.cd;const k=a.k||'horn';
 if(k==='horn'){u.shield=u.smx=LV(a.shield,u.lvl);G.Z.push({k:'aura',tm,u,x:u.x,y:u.y,r:a.r*TILE,t:a.rage,tot:a.rage});ring(u.x,u.y,a.r*TILE,'#ffd84d')}
 else if(k==='taunt'){u.shield=u.smx=LV(a.shield,u.lvl);for(const v of G.U)if(v.tm!==tm&&alive(v)&&canHit(v.c,u)&&dist(u,v)<a.r*TILE){v.tg=u;v.lock=0;v.rt=a.t}ring(u.x,u.y,a.r*TILE,'#ff7a5a');ring(u.x,u.y,a.r*TILE*.6,'#ffd84d')}
 else if(k==='stomp'){const d=LV(a.dmg,u.lvl);areaHit(tm,u.x,u.y,a.r*TILE,d,Math.round(d*.35),'g',{stun:a.stun,knock:14});ring(u.x,u.y,a.r*TILE,'#ffd84d');puff(u.x,u.y,'#c9b99a',16,80,3.4);G.shake=Math.max(G.shake,7)}
 else if(k==='fury'){u.rageT=a.rage;u.shield=u.smx=LV(a.shield,u.lvl);ring(u.x,u.y,30,'#ff5a8a')}
 floatText(u.x,u.y-40,a.n,'#ffd84d',12);AU.sfx('ability');return true}

/* ---------- цели и движение ---------- */
/* ---------- день и ночь ----------
   nightK — плавная доля ночи 0…1 (для отрисовки), isNight — ночь ли сейчас для правил */
function cycOf(){const C=CFG.cycle,c=G.rules&&G.rules.cyc;return c?Object.assign({},C,{day:c[0],night:c[1]}):C}
function nightK(t){if(!G||!G.cyc)return 0;const C=cycOf(),per=C.day+C.night,ph=(t??G.t)%per,f=C.fade;
 let b=G.mc.night?1:ph<C.day-f?0:ph<C.day?(ph-(C.day-f))/f:ph<per-f?1:1-(ph-(per-f))/f;
 // принудительное время суток (Затмение, Рассвет): плавный вход и выход за 2 с
 if(t===undefined&&G.force){const F=G.force,k=clamp(Math.min(F.tot-F.t,F.t)/2,0,1);b+=(F.k-b)*k}
 return b}
function isNight(){return nightK()>=.5}
/* источники света: башни, здания, юниты и зоны со светом; в зоне «Сумрака» свет не действует */
function lightSources(){const L=CFG.cycle.light,S=[];
 for(const t of G.T)if(t.hp>0)S.push({x:t.x,y:t.y,r:(t.kind==='k'?L.k:L.p)*TILE});
 for(const b of G.B)if(alive(b))S.push({x:b.x,y:b.y,r:(b.c.light||L.bld)*TILE});
 for(const u of G.U)if(alive(u)&&u.c.light)S.push({x:u.x,y:u.y,r:u.c.light*TILE});
 for(const z of G.Z)if(z.light)S.push({x:z.x,y:z.y,r:z.light});
 return S}
function inShade(p){for(const z of G.Z)if(z.k==='shade'&&dist(p,z)<z.r)return true;return false}
function litBy(S,p){if(inShade(p))return false;for(const l of S)if(dist(p,l)<l.r)return true;return false}
/* раз в тик: кого из врагов видит каждая сторона (null — день, видно всех) */
function computeVis(){const n=isNight();if(n!==!!G.night){G.night=n;if(G.t>1)banner(n?'Наступает ночь':'Рассвет',n?'#9fb4ff':'#ffd27a')}
 const sh=G.Z.some(z=>z.k==='shade');if(!n&&!sh){G.vis=null;return}const S=n?lightSources():[],near=CFG.cycle.near*TILE,V=[new Set(),new Set()];
 const ents=tm=>[...G.U.filter(u=>u.tm===tm&&alive(u)),...G.B.filter(b=>b.tm===tm&&alive(b)),...G.T.filter(t=>t.tm===tm&&t.hp>0)];
 const E=[ents(0),ents(1)];
 for(const tm of[0,1])for(const o of E[1-tm]){if(o.obj==='t'||(n?litBy(S,o)&&!(o.c&&o.c.stealth):!inShade(o))){V[tm].add(o);continue}
  for(const e of E[tm])if(dist(e,o)<near+o.r+e.r){V[tm].add(o);break}}
 G.vis=V}
/* видит ли сторона tm объект o (башни видно всегда) */
function seen(tm,o){return!G.vis||o.obj==='t'||G.vis[tm].has(o)}
/* сродство: дневные и ночные карты сильнее в своё время суток */
function affOn(c){return c.aff&&G.cyc&&(c.aff==='night')===isNight()}
function canHit(c,o){if(o.fly&&c.tg==='g')return false;if(c.tg==='b'&&o.obj==='u')return false;return true}
function pathDist(u,o){if(u.fly||u.c.jump)return dist(u,o);if((u.y-RY)*(o.y-RY)>0)return dist(u,o);let m=1e9;BR.forEach((bx,i)=>{if(G.bridges[i].down>0)return;const d=hy(u.x-bx,u.y-RY)+hy(o.x-bx,o.y-RY);if(d<m)m=d});return m<1e9?m:dist(u,o)*3}
/* обзор: явный у карты; у «только здания» — CFG.sight.building; у дальнобойных — дальность + CFG.sight.ranged; иначе по умолчанию */
function sightOf(c){return c.sight||(c.tg==='b'?CFG.sight.building:c.rng>=2?c.rng+CFG.sight.ranged:CFG.sight.def)}
function findTarget(u){const c=u.c,sight=sightOf(c)*TILE;let best=null,bd=1e9;
 if(c.tg!=='b'){for(const v of G.U)if(v.tm!==u.tm&&alive(v)&&canHit(c,v)&&seen(u.tm,v)){const d=dist(u,v)-v.r;if(d<sight&&d<bd){bd=d;best=v}}
  for(const o of G.B)if(o.tm!==u.tm&&alive(o)&&seen(u.tm,o)){const d=dist(u,o)-o.r;if(d<sight&&d<bd){bd=d;best=o}}
  for(const o of G.T)if(o.tm!==u.tm&&o.hp>0){const d=dist(u,o)-o.r;if(d<sight&&d<bd){bd=d;best=o}}
  if(best)return best}
 // здания притягивают только в пределах обзора (у «только здания» — 7,5 тайла); иначе — ближайшая башня по пути через мост
 for(const o of G.B)if(o.tm!==u.tm&&alive(o)&&seen(u.tm,o)){const d=dist(u,o)-o.r;if(d<sight&&d<bd){bd=d;best=o}}
 if(best)return best;
 // дорожка юнита (с гистерезисом у середины поля): башня своей дорожки, если нет — король, и только потом чужая дорожка
 if(u.ln==null||Math.abs(u.x-W/2)>TILE)u.ln=u.x<W/2?0:1;
 const foe=G.T.filter(o=>o.tm!==u.tm&&o.hp>0),mine=foe.filter(o=>o.kind==='p'&&(o.x<W/2?0:1)===u.ln),pool=mine.length?mine:foe.filter(o=>o.kind==='k').length?foe.filter(o=>o.kind==='k'):foe;
 for(const o of pool){const d=pathDist(u,o);if(d<bd){bd=d;best=o}}
 return best}
/* ---------- поиск пути по тайлам: поля расстояний ----------
   Непроходимы: река (кроме мостов; прыгунам — проходима), живые башни и здания, кроме самой цели.
   Для каждой цели (башня, здание или тайл, где стоит юнит) строится поле расстояний алгоритмом Дейкстры
   по 8 направлениям без срезания углов. Поля общие для всех юнитов и живут, пока не изменился набор препятствий. */
const GW=CFG.arena.tilesW,GH=CFG.arena.tilesH,GN=GW*GH;
const RIVER=(()=>{const m=new Uint8Array(GN);for(let ty=0;ty<GH;ty++)for(let tx=0;tx<GW;tx++){const cy=(ty+.5)*TILE,cx=(tx+.5)*TILE;
 m[ty*GW+tx]=Math.abs(cy-RY)<RIV&&!BR.some(b=>Math.abs(cx-b)<=CFG.arena.bridgeHalf*TILE)?1:0}return m})();
function obstacleGrid(){if(G.grid&&G.gridTick===G.tick)return G.grid;const g=new Int32Array(GN);let sig='';
 for(const o of G.T)if(o.hp>0){markObs(g,o);sig+=o.id+','}for(const o of G.B)if(alive(o)){markObs(g,o);sig+=o.id+','}
 if(sig!==G.gridSig){G.gridSig=sig;G.fields=new Map()}G.grid=g;G.gridTick=G.tick;return g}
function markObs(g,o){const r=o.r+6;for(let ty=Math.max(0,Math.floor((o.y-r)/TILE));ty<=Math.min(GH-1,Math.floor((o.y+r)/TILE));ty++)
 for(let tx=Math.max(0,Math.floor((o.x-r)/TILE));tx<=Math.min(GW-1,Math.floor((o.x+r)/TILE));tx++){const cx=(tx+.5)*TILE,cy=(ty+.5)*TILE;if(Math.abs(cx-o.x)<r&&Math.abs(cy-o.y)<r)g[ty*GW+tx]=o.id}}
const riverTile=(tx,ty)=>(G?G.riv:RIVER)[ty*GW+tx]===1;
const onBridge=x=>BR.some((b,i)=>Math.abs(x-b)<=CFG.arena.bridgeHalf*TILE&&!(G&&G.bridges[i].down>0));
/* ---------- разрушаемые мосты ----------
   по мосту бьют только заклинания, снаряды мортиры и взрывы при гибели (opt.br); рухнувший мост — река на bridge.down секунд */
function bridgeHit(x,y,r,d,tm){if(!d)return;G.bridges.forEach((b,i)=>{if(b.down>0)return;const h=CFG.arena.bridgeHalf*TILE;
 if(Math.abs(x-b.x)<h+r&&Math.abs(y-RY)<RIV+r){b.hp-=d;b.fl=.15;if(b.hp<=0){bridgeDown(i);if(tm===0||tm===1)G.stats[tm].bridges++}}})}
function bridgeDown(i){const b=G.bridges[i],h=CFG.arena.bridgeHalf*TILE;b.hp=0;b.down=CFG.bridge.down;setRiver(i,1);
 for(const u of G.U)if(alive(u)&&!u.fly&&!u.c.jump&&Math.abs(u.x-b.x)<=h+u.r&&Math.abs(u.y-RY)<RIV+u.r){u.y=RY+(u.y<RY?-(RIV+u.r+2):RIV+u.r+2);stunObj(u,CFG.bridge.stun);puff(u.x,u.y,'#9fd8ff',6,50,2.4)}
 puff(b.x,RY,'#8a6a44',26,90,4);puff(b.x,RY,'#bfe6ff',18,70,3);G.shake=Math.max(G.shake,8);AU.sfx('bridge');floatText(b.x,RY-26,'Мост рухнул!','#ffb38a',13);G.FX.push({k:'bridge',i,l:0,m:1})}
function setRiver(i,v){const h=CFG.arena.bridgeHalf*TILE,bx=BR[i];for(let ty=0;ty<GH;ty++)for(let tx=0;tx<GW;tx++){const cy=(ty+.5)*TILE,cx=(tx+.5)*TILE;if(Math.abs(cy-RY)<RIV&&Math.abs(cx-bx)<=h)G.riv[ty*GW+tx]=v}
 G.gridSig='';G.fields=new Map();G.grid=null}
function updBridges(dt){G.bridges.forEach((b,i)=>{b.fl=Math.max(0,(b.fl||0)-dt);if(b.down>0){b.down-=dt;if(b.down<=0){b.down=0;b.hp=b.mx;setRiver(i,0);floatText(b.x,RY-26,'Мост восстановлен','#bfe6ff',12);puff(b.x,RY,'#c69a6a',12,50,3)}}})}
function passable(g,u,tx,ty,tid){if(tx<0||ty<0||tx>=GW||ty>=GH)return false;const i=ty*GW+tx,o=g[i];if(o&&o!==tid)return false;return!!u.c.jump||!G.riv[i]}
const tileOf=o=>clamp(Math.floor(o.y/TILE),0,GH-1)*GW+clamp(Math.floor(o.x/TILE),0,GW-1);
/* поле расстояний до цели t (для прыгунов — отдельное, река им не мешает) */
function fieldFor(u,t){const g=obstacleGrid(),stat=t.obj!=='u',key=(stat?'o'+t.id:'t'+tileOf(t))+(u.c.jump?'j':'');let F=G.fields.get(key);if(F)return F;
 F=new Float32Array(GN).fill(1e9);const heap=[],push=(i,d)=>{heap.push([d,i]);let k=heap.length-1;while(k){const p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p}},
  pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m}}return top};
 const tid=stat?t.id:-1,pu={c:{jump:u.c.jump}};
 if(stat){for(let i=0;i<GN;i++)if(g[i]===t.id){F[i]=0;push(i,0)}}
 if(!heap.length){const i=tileOf(t);F[i]=0;push(i,0)}
 while(heap.length){const[d,c]=pop();if(d>F[c])continue;const cx=c%GW,cy=c/GW|0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;
   if(!passable(g,pu,nx,ny,tid))continue;if(dx&&dy&&(!passable(g,pu,cx+dx,cy,tid)||!passable(g,pu,cx,cy+dy,tid)))continue;
   const ni=ny*GW+nx,nd=d+(dx&&dy?1.414:1);if(nd<F[ni]){F[ni]=nd;push(ni,F[ni])}}}  // в куче — то же округлённое значение, что в поле (Float32), иначе клетка пропускается
 G.fields.set(key,F);return F}
/* следующая точка пути: спуск по полю на несколько шагов (для отладки путь сохраняется в u.path) */
function findPath(u,t){const F=fieldFor(u,t),g=obstacleGrid(),tid=t.obj!=='u'?t.id:-1,P=[];let c=tileOf(u);
 for(let n=0;n<6;n++){const cx=c%GW,cy=c/GW|0;let best=-1,bd=F[c];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=GW||ny>=GH)continue;const ni=ny*GW+nx;
   if(F[ni]>=bd)continue;if(dx&&dy&&(!passable(g,u,cx+dx,cy,tid)||!passable(g,u,cx,cy+dy,tid)))continue;bd=F[ni];best=ni}
  if(best<0||F[best]>=1e9)break;c=best;P.push({x:(c%GW+.5)*TILE,y:((c/GW|0)+.5)*TILE});if(F[c]===0)break}
 return P.length?P:null}
/* прямая видимость по сетке: можно ли идти по отрезку, не задевая препятствий */
function clearLine(u,a,b,tid){const g=obstacleGrid(),n=Math.ceil(hy(b.x-a.x,b.y-a.y)/(TILE*.4));
 for(let i=1;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;if(!passable(g,u,Math.floor(x/TILE),Math.floor(y/TILE),tid))return false}return true}
function bestBridge(u,t){let bx=BR[0],m=1e9;for(const b of BR){const d=hy(u.x-b,u.y-RY)+hy(t.x-b,t.y-RY);if(d<m){m=d;bx=b}}return bx}
/* куда идти сейчас: летуны — прямо; наземные — по пути из тайлов, срезая видимые участки */
function goal(u,t){if(u.fly)return t;
 if(clearLine(u,u,t,t.id)){u.path=null;return t}
 const P=findPath(u,t);u.path=P;if(!P)return goalLane(u,t);
 let k=0;while(k<P.length-1&&clearLine(u,u,P[k+1],t.id))k++;return P[k]}
function goalLane(u,t){if(u.c.jump){if(Math.abs(u.y-RY)<RIV+8&&!u.jmp){u.jmp=1;AU.sfx('charge')}if(Math.abs(u.y-RY)>=RIV+8)u.jmp=0;return t}const dy=u.y-RY,s=Math.sign(dy)||1,s2=Math.sign(t.y-RY)||s;
 if(Math.abs(dy)>RIV+6&&s===s2){u.bx=null;return t}
 if(u.bx==null)u.bx=bestBridge(u,t);const bx=u.bx;
 if(Math.abs(dy)<=RIV+6){if(Math.abs(u.x-bx)>5&&Math.abs(dy)>RIV-3)return{x:bx,y:u.y};return{x:bx,y:RY+s2*(RIV+16)}}
 return{x:bx,y:RY+s*(RIV+4)}}
function spdOf(u){let s=SPD[u.c.spd]||30;if(G.rules.spd&&!u.fly)s*=G.rules.spd;if(affOn(u.c))s*=1+CFG.cycle.aff.spd;if(u.rageT>0)s*=1.35;if(u.slowT>0)s*=1-u.slowF;if(u.mudT>0)s*=1-(G.rules.crSlow||CFG.crater.slow);if(u.charging)s*=2;return s}
function hitOf(u){let h=u.c.hit;if(u.rageT>0)h/=1.35;if(u.slowT>0)h/=1-u.slowF;return h}
function updUnit(u,dt){if(!alive(u))return;const c=u.c;stepImpulse(u,dt);if(u.dashCd>0)u.dashCd-=dt;if(u.dashing&&(u.frozenT>0||u.stunT>0||!u.tg||!aliveT(u.tg))){u.dashing=0;u.dashCd=.4}
 u.fl=Math.max(0,u.fl-dt);u.sw=Math.max(0,u.sw-dt);u.spawnT=Math.max(0,u.spawnT-dt);
 if(u.slowT>0){u.slowT-=dt;if(u.slowT<=0)u.slowF=0}if(u.rageT>0)u.rageT-=dt;if(u.mudT>0)u.mudT-=dt;
 if(u.frozenT>0||u.stunT>0){u.frozenT=Math.max(0,u.frozenT-dt);u.stunT=Math.max(0,u.stunT-dt);u.run=0;u.charging=0;return}
 u.cd-=dt;
 if(u.tg&&(!aliveT(u.tg)||!seen(u.tm,u.tg))){u.tg=null;u.lock=0;u.wu=0;u.rt=0}
 u.rt-=dt;
 if(!u.lock&&u.rt<=0){const nt=findTarget(u);if(nt&&nt!==u.tg){u.tg=nt;u.wu=0;u.beamT=0;u.cd=Math.max(u.cd,c.fh??hitOf(u)*CFG.unit.fh)}u.rt=CFG.retarget}
 const t=u.tg;if(!t)return;
 const d=dist(u,t),reach=c.rng*TILE+t.r+u.r*.6;
 if(Math.abs(t.x-u.x)>1)u.face=t.x<u.x?-1:1;
 if(u.dashing){const dd=dist(u,t);if(!aliveT(t)){u.dashing=0;u.dashCd=.4;return}const s=c.dash.spd*dt;if(dd-t.r-u.r*.6<=s+2){u.dashing=0;u.dashCd=.8;u.x=t.x+(u.x-t.x)/dd*(t.r+u.r*.6);u.y=t.y+(u.y-t.y)/dd*(t.r+u.r*.6);attack(u,t,c.dash.mul);u.cd=hitOf(u);u.sw=.28;return}u.x+=(t.x-u.x)/dd*s;u.y+=(t.y-u.y)/dd*s;if(RNG()<.6)puff(u.x,u.y,'#d9cfb4',1,20,1.6);return}
 if(c.dash&&!(u.dashCd>0)&&!u.lock&&t.obj!=='t'){const dd=dist(u,t)-t.r;if(dd>=c.dash.min*TILE&&dd<=c.dash.max*TILE&&clearLine(u,u,t,t.id)){u.dashing=1;u.lock=1;u.wu=0;AU.sfx('charge');return}}
 if(u.wu>0){u.wu-=dt;if(u.wu<=0){u.wu=0;if(aliveT(t)&&d<=reach+6){attack(u,t);u.cd=Math.max(0,hitOf(u)-windOf(u))}}return}
 if(d<=reach){u.lock=1;
  if(c.kami){explode(u,t);return}
  if(u.cd<=0){const w=windOf(u);u.sw=.28;if(w>0)u.wu=w;else{attack(u,t);u.cd=hitOf(u)}}}
 else{if(u.lock&&d>reach+12)u.lock=0;
  const g2=goal(u,t),gx=g2.x-u.x,gy=g2.y-u.y,gd=hy(gx,gy)||1,s=spdOf(u)*dt,m=Math.min(s,gd);
  u.x+=gx/gd*m;u.y+=gy/gd*m;u.ph+=dt*(spdOf(u)/5);
  if(c.charge){u.run+=m;if(!u.charging&&u.run>60){u.charging=1;AU.sfx('charge')}}}}
/* замах: удар наносится в конце; если цель умерла или ушла — удар пропадает */
function windOf(u){const c=u.c;if(c.wind!=null)return c.wind;if(c.beam||c.kami||u.obj!=='u')return 0;return Math.min(hitOf(u)*CFG.unit.wind,CFG.unit.windMax)}
function attack(u,t,mul){const c=u.c,am=affOn(c)?1+CFG.cycle.aff.dmg:1;let dmg=u.dmg*(mul||1)*am;
 if(c.beam){if(u.beamTg!==t){u.beamTg=t;u.beamT=0}const b=c.beam;let st=0,acc=0;for(const x of b.t){acc+=x;if(u.beamT>=acc)st++}u.beamT+=hitOf(u);
  hitTarget(u,t,LV(b.dmg[Math.min(st,b.dmg.length-1)],u.lvl)*am);u.beamSt=st;G.FX.push({k:'bolt',x:u.x,y:u.y-12,x2:t.x,y2:t.y-8-(t.fly?FLYOFF:0),l:0,m:hitOf(u)*.9,beam:st});return}
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
function areaHit(tm,x,y,r,dmg,tdmg,tg,opt){opt=opt||{};const p={x,y};if(opt.br)bridgeHit(x,y,r,opt.br,tm);if(opt.crater)crater(x,y,r);
 if(tg!=='b')for(const v of G.U)if(v.tm!==tm&&v!==opt.skip&&alive(v)&&!(v.fly&&tg==='g')&&dist(v,p)<r+v.r*.5){damage(v,dmg,tm);
  if(opt.stun)stunObj(v,opt.stun);if(opt.slow)slowObj(v,opt.slow);if(opt.freeze){v.frozenT=Math.max(v.frozenT,opt.freeze);v.wu=0;v.beamT=0}
  if(opt.knock&&v.mass<CFG.phys.knockMinMass&&!v.fly&&!v.dashing&&!(v.shield>0)){const d=dist(v,p)||1;impulse(v,(v.x-x)/d,(v.y-y)/d,opt.knock*CFG.phys.knockDamp);v.wu=0;v.lock=0;v.rt=0;v.beamT=0}}
 for(const o of G.B)if(o.tm!==tm&&o!==opt.skip&&alive(o)&&dist(o,p)<r+o.r*.6){damage(o,tdmg,tm);if(opt.stun)stunObj(o,opt.stun);if(opt.freeze)o.frozenT=Math.max(o.frozenT,opt.freeze)}
 for(const o of G.T)if(o.tm!==tm&&o!==opt.skip&&o.hp>0&&dist(o,p)<r+o.r*.6){damage(o,tdmg,tm);if(opt.stun)stunObj(o,opt.stun);if(opt.freeze)o.frozenT=Math.max(o.frozenT,opt.freeze)}}
/* физика толчков: скорость, которая плавно гаснет (CFG.phys.knockDamp), путь ≈ скорость / затухание */
/* воронка: наземные обеих сторон в ней медленнее */
function crater(x,y,r){const C=CFG.crater,t=G.rules.crT||C.t;G.Z.push({k:'crater',tm:-1,x,y,r:r*C.k,t,tot:t})}
function impulse(u,nx,ny,v){u.kx=(u.kx||0)+nx*v;u.ky=(u.ky||0)+ny*v}
function stepImpulse(u,dt){if(!u.kx&&!u.ky)return;u.x+=u.kx*dt;u.y+=u.ky*dt;const hh=CFG.phys.knockDamp*dt/2,f=(1-hh)/(1+hh);u.kx*=f;u.ky*=f;if(hy(u.kx,u.ky)<3){u.kx=u.ky=0}}
function stunObj(o,t){if(o.shield>0)return;o.stunT=Math.max(o.stunT||0,t);if(o.obj==='u'){o.charging=0;o.run=0;o.wu=0;o.beamT=0;o.beamTg=null;o.cd=Math.max(o.cd,hitOf(o)*.5)}else o.cd=Math.max(o.cd||0,(o.hit||1)*.5)}
function slowObj(o,s){if(o.obj!=='u')return;o.slowT=Math.max(o.slowT,s.t);o.slowF=Math.max(o.slowF||0,s.f)}
function damage(o,d,fromTm){if(G.over||d<=0)return;if(!aliveT(o))return;if(o.dashing)return;
 if(o.shield>0){const a=Math.min(o.shield,d);o.shield-=a;d-=a;if(o.shield<=0)puff(o.x,o.y-12,'#ffe9a8',8,40,2);if(d<=0){o.fl=.08;return}}
 if(o.obj==='t')G.stats[fromTm].dmg+=Math.min(d,o.hp);
 o.hp-=d;o.fl=.1;if(G.tr&&o.obj==='u'&&o.hp<=0&&!o.counted){o.counted=1;G.tr.val+=unitVal(o)}if(d>=CFG.juice.heavyHit&&o.obj!=='b')G.hitstop=CFG.juice.hitStop;
 if(o.obj==='t'){if(d>=25)floatText(o.x+rnd(-8,8),o.y-o.r-8,Math.round(d),o.tm?'#fff':'#ffd2cc');if(o.kind==='k')wakeKing(o);if(o.hp<=0){o.hp=0;towerDown(o)}}}
function wakeKing(k){if(k.act)return;k.act=1;k.wake=CFG.tower.k.wakeAim;AU.sfx('wake');floatText(k.x,k.y+(k.tm?k.r+16:-k.r-16),'Король проснулся!','#ffd27a',12)}
function crownsOf(tm){let c=0;for(const t of G.T)if(t.tm!==tm&&t.hp<=0)c+=t.kind==='k'?3:1;return Math.min(3,c)}
function towerDown(t){if(t.dead)return;t.dead=1;t.hp=0;G.tlEv.push({t:G.t,tm:t.tm,kind:t.kind});
 puff(t.x,t.y,'#8d8577',34,110,5);puff(t.x,t.y,'#3b3730',18,70,4);ring(t.x,t.y,70,'#ffd27a');G.shake=12;G.DEC.push({x:t.x,y:t.y,r:t.r+8,l:999});AU.sfx('tower');
 G.FX.push({k:'crown',x:t.x,y:t.y-24,tm:1-t.tm,n:t.kind==='k'?3:1,l:0,m:1.6});setTimeout(()=>AU.sfx(t.tm?'crown':'crownLose'),250);
 if(t.kind==='p')for(const k of G.T)if(k.tm===t.tm&&k.kind==='k')wakeKing(k);
 G.crowns=[crownsOf(0),crownsOf(1)];const win=1-t.tm;
 for(const b of G.bots)if(b&&b.r()<.55)emote(b.tm,b.tm===t.tm?2:3);
 G.downs.push({tm:t.tm,kind:t.kind})}
function finish(res){if(G.over)return;G.over=1;G.res=res;G.endAt=(typeof performance!=='undefined'?performance.now():0)+CFG.match.endDelay*1000;
 if(res===0&&!G.bots[0]&&!REDUCE)for(let i=0;i<110;i++)G.CF.push({x:rnd(0,W),y:rnd(-120,-5),vx:rnd(-25,25),vy:rnd(50,130),r:rnd(0,6.28),vr:rnd(-9,9),w:rnd(3,6),c:pickR(['#ffc83d','#3da5ff','#ff5c4d','#5ef2d0','#c77dff','#ffffff']),l:0,m:rnd(2.2,3.4)});for(const b of G.bots)if(b&&b.r()<.7)emote(b.tm,G.res===b.tm?3:1)}
/* исход по упавшим за тик башням: король — сразу победа и 3 короны (оба короля — ничья);
   в овертайме и «внезапной смерти» первая башня решает, но если обе стороны потеряли башню в один тик — бой продолжается */
function resolveDowns(){if(!G.downs.length||G.over)return;const d=G.downs;G.downs=[];
 const kings=[0,1].filter(tm=>d.some(x=>x.tm===tm&&x.kind==='k'));
 if(kings.length===2)return finish(2);
 if(kings.length===1){const lose=kings[0],win=1-lose;for(const t of G.T)if(t.tm===lose&&t.hp>0){t.hp=0;t.dead=1;puff(t.x,t.y,'#8d8577',24,90,4)}G.crowns[win]=3;G.slowmo=CFG.juice.kingSlow;return finish(win)}
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
 if(t.tg&&alive(t.tg)&&dist(t,t.tg)-t.tg.r<=t.rng&&seen(t.tm,t.tg))best=t.tg;
 else{let bd=t.rng;for(const u of G.U)if(u.tm!==t.tm&&alive(u)&&seen(t.tm,u)){const d=dist(t,u)-u.r;if(d<bd){bd=d;best=u}}
  if(!best)for(const b of G.B)if(b.tm!==t.tm&&alive(b)&&seen(t.tm,b)){const d=dist(t,b)-b.r;if(d<bd){bd=d;best=b}}}
 t.tg=best;
 if(!best&&t.mag&&t.ammo<t.mag){t.rl=(t.rl||0)+dt;if(t.rl>.45){t.rl=0;t.ammo++}}
 if(best){t.ang=Math.atan2(best.y-t.y,best.x-t.x);if(t.cd<=0){if(t.mag){t.ammo--;t.cd=t.ammo>0?t.hit:t.reload;if(t.ammo<=0)t.ammo=t.mag}else t.cd=t.hit;G.PR.push({pk:t.kind==='k'?'king':t.pk||'tower',tw:1,x:t.x,y:t.y-(t.kind==='k'?26:30),tg:best,lx:best.x,ly:best.y,dmg:t.dmg,tm:t.tm,spl:0,sp:PSPD.tower,fly:best.fly,l:0});AU.sfx('shot')}}}
function updBuilding(b,dt){b.fl=Math.max(0,b.fl-dt);b.spawnT=Math.max(0,b.spawnT-dt);if(!alive(b))return;b.hp-=b.mx/b.c.life*dt;if(b.hp<=0){b.hp=0;return}
 if(b.frozenT>0){b.frozenT-=dt;return}if(b.stunT>0){b.stunT-=dt;return}
 b.at=Math.max(0,b.at-dt*3);
 if(b.c.elx){b.ex=(b.ex??b.c.elx.every)-dt;if(b.ex<=0){b.ex+=b.c.elx.every;const S=G.side[b.tm];S.el=Math.min(CFG.elixir.max,S.el+b.c.elx.n);b.at=1;floatText(b.x,b.y-24,'+'+b.c.elx.n,'#e08bff',13)}}
 if(b.c.spawn){b.spT-=dt;if(b.spT<=0){b.spT=b.c.spawn.every;b.at=1;for(let i=0;i<b.c.spawn.n;i++)G.U.push(mkUnit(b.tm,b.c.spawn.id,b.x+rnd(-8,8),b.y+(b.tm?16:-16)+rnd(-3,3),b.lvl));puff(b.x,b.y-6,'#cfe8c0',5,30,2)}}
 if(b.c.dmg){b.cd-=dt;const mn=(b.c.minRng||0)*TILE;let best=null,bd=b.c.rng*TILE;const ok=(o,d)=>d<bd&&dist(b,o)>=mn;
  if(b.tg&&(b.tg.obj==='t'?b.tg.hp>0:alive(b.tg))&&seen(b.tm,b.tg)){const d=dist(b,b.tg)-b.tg.r;if(ok(b.tg,d+.01))best=b.tg}
  if(!best){for(const u of G.U)if(u.tm!==b.tm&&alive(u)&&canHit(b.c,u)&&seen(b.tm,u)){const d=dist(b,u)-u.r;if(ok(u,d)){bd=d;best=u}}
   if(b.c.siege){for(const o of G.B)if(o.tm!==b.tm&&alive(o)&&seen(b.tm,o)){const d=dist(b,o)-o.r;if(ok(o,d)){bd=d;best=o}}for(const t of G.T)if(t.tm!==b.tm&&t.hp>0){const d=dist(b,t)-t.r;if(ok(t,d)){bd=d;best=t}}}}
  b.tg=best;
  if(best){b.ang=Math.atan2(best.y-(b.y-10),best.x-b.x);if(b.cd<=0){b.cd=b.c.hit;b.at=1;const sh=!!b.c.splash;G.PR.push({pk:sh?'bomb':'ball',hi:sh?1:0,x:b.x,y:b.y-12,tg:best,lx:best.x,ly:best.y,dmg:b.dmg,tm:b.tm,spl:(b.c.splash||0)*TILE,tgf:b.c.tg,sp:sh?PSPD.shell:PSPD.ball,from:{x:b.x,y:b.y},fly:best.fly,l:0});AU.sfx(sh?'boom':'shot')}}}}
function updProj(p,dt){p.l+=dt;
 if(p.pk!=='bomb'&&p.tg&&aliveT(p.tg)){p.lx=p.tg.x;p.ly=p.tg.y}
 const dx=p.lx-p.x,dy=p.ly-p.y,d=hy(dx,dy),s=p.sp*dt;
 if(d<=s+3||p.l>3){p.done=1;impact(p);return}p.x+=dx/d*s;p.y+=dy/d*s}
function impact(p){const x=p.lx,y=p.ly;
 if(p.spl>0){areaHit(p.tm,x,y,p.spl,p.dmg,p.dmg*(p.td||1),p.tgf||'ga',{slow:p.slow,stun:p.stun,br:p.hi?p.dmg:0});ring(x,y,p.spl,p.pk==='ice'?'#bfe6ff':'#ffb347');puff(x,y,p.pk==='ice'?'#d8f2ff':p.pk==='bomb'?'#666':'#ffb347',8,60,2.6);if(p.pk==='bomb'||p.pk==='orb')AU.sfx('boom')}
 else{const t=p.tg;if(aliveT(t)){let d=p.dmg;if((t.obj==='t'||t.obj==='b')&&p.td)d*=p.td;damage(t,d,p.tm);if(p.slow)slowObj(t,p.slow);if(p.stun)stunObj(t,p.stun)}puff(x,y-4,'#fff',3,34,1.6)}}
/* сколько эликсира стоит один юнит (для размена и графика перевеса) */
function unitVal(o){const c=CARDS[o.key]||o.c;return c.token?.5:(c.cost||0)/(c.count||1)}
function onDeath(o){const c=o.c;if(o.obj==='u')G.stats[o.tm].lost+=unitVal(o);if(o.nodeath)return;
 puff(o.x,o.y,o.obj==='b'?'#9a8f7a':'#e8e0cb',8,50,2.6);if(o.obj==='u'){G.FX.push({k:'soul',x:o.x,y:o.y-(o.fly?FLYOFF:0),c:TEAM[o.tm].l,s:Math.min(1.6,o.r/8),l:0,m:.8});AU.sfx('pop')}
 if(c.death){const d=LV(c.death.dmg,o.lvl);areaHit(o.tm,o.x,o.y,c.death.r*TILE,d,d,'g',{br:d,crater:c.death.r>=2});ring(o.x,o.y,c.death.r*TILE,'#ffb347');puff(o.x,o.y,'#ffb347',12,80,3);AU.sfx('boom');G.shake=Math.max(G.shake,3)}
 if(c.dspawn)for(let i=0;i<c.dspawn.n;i++){const a=i/c.dspawn.n*6.28+rnd(0,1);G.U.push(mkUnit(o.tm,c.dspawn.id,clamp(o.x+dcos(a)*10,10,W-10),o.y+dsin(a)*10,o.lvl))}
 if(o.obj==='b')ring(o.x,o.y,28,'#ffffff')}
function separate(){const L=G.U;
 for(let i=0;i<L.length;i++){const a=L[i];if(!alive(a))continue;
  for(let j=i+1;j<L.length;j++){const b=L[j];if(!alive(b)||a.fly!==b.fly)continue;const dx=a.x-b.x,dy=a.y-b.y,m=a.r+b.r-1,d2=dx*dx+dy*dy;
   if(d2<m*m&&d2>1e-4){const d=Math.sqrt(d2),f=m-d,wa=b.mass/(a.mass+b.mass),wb=1-wa;a.x+=dx/d*f*wa;a.y+=dy/d*f*wa;b.x-=dx/d*f*wb;b.y-=dy/d*f*wb}}
  if(!a.fly){for(const t of G.T)if(t.hp>0)pushOut(a,t);for(const o of G.B)if(alive(o))pushOut(a,o);
   if(Math.abs(a.y-RY)<RIV&&!a.c.jump&&!onBridge(a.x)){let bx=BR[0];for(const b of BR)if(Math.abs(a.x-b)<Math.abs(a.x-bx))bx=b;const h=CFG.arena.bridgeHalf*TILE,ex=bx+Math.sign(a.x-bx)*h;if(Math.abs(a.x-ex)<6)a.x=ex;else a.y=RY+(a.y<RY?-RIV:RIV)}}
  a.x=clamp(a.x,8,W-8);a.y=clamp(a.y,8,H-8)}}
function pushOut(a,o){const dx=a.x-o.x,dy=a.y-o.y,d=hy(dx,dy),m=o.r+a.r*.6;if(d<m&&d>.01){a.x+=dx/d*(m-d);a.y+=dy/d*(m-d)}}

/* ---------- эффекты ---------- */
function puff(x,y,col,n,sp,size){if(!G)return;if(REDUCE||SET.fx==='low')n=Math.ceil(n/3);for(let i=0;i<n;i++){const a=rnd(0,6.28),s=rnd(.3,1)*sp;G.PT.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-sp*.15,l:0,m:rnd(.35,.8),c:col,s:size*rnd(.6,1.2)})}if(G.PT.length>500)G.PT.splice(0,G.PT.length-500)}
function ring(x,y,r,col){G.FX.push({k:'ring',x,y,r,l:0,m:.4,c:col})}
function boomFx(x,y,r){ring(x,y,r*1.3,'#ffb347');ring(x,y,r*.7,'#fff3c0');G.DEC.push({x,y,r:r*.7,l:6});for(let i=0;i<24;i++)puff(x,y,['#ffb347','#ff6a1a','#fff3c0','#6a3b22'][i%4],1,rnd(40,120),rnd(2,4.5));G.shake=Math.max(G.shake,6);AU.sfx('boom')}
function floatText(x,y,txt,col,size){G.TX.push({x,y,t:txt,c:col||'#fff',l:0,m:1,s:size||11})}
function banner(txt,col){G.TX.push({x:W/2,y:RY-40,t:txt,c:col||'#fff',l:0,m:2.2,s:18,big:1});AU.sfx('phase')}
function emote(tm,i){if(!G||G.over&&G.endAt<performance.now())return;const last=G.EM.find(e=>e.tm===tm);if(last&&last.l<1)return;G.EM=G.EM.filter(e=>e.tm!==tm);G.EM.push({tm,txt:EMOTES[i],l:0,m:2.4});AU.sfx('emote')}

/* ---------- шаг ---------- */
/* один тик симуляции (CFG.sim.hz раз в секунду) */
const TICK=1/CFG.sim.hz;
function step(dt){if(!G)return;dt=dt||TICK;if(G.over){fxStep(dt);return}
 if(G.replay)applyReplay(0);else if(NET.on)netApply();
 G.tick++;
 for(const u of G.U){u.px=u.x;u.py=u.y}for(const p of G.PR){p.px=p.x;p.py=p.y}
 if(G.tb){stepTiebreak(dt);fxStep(dt);return}
 const M=CFG.match,m0=elRate();G.t+=dt;
 if(G.tick%CFG.sim.hz===0)G.tl.push(Math.round((G.stats[1].lost-G.stats[0].lost)*10)/10);
 if(G.mc.sudden&&G.t>=M.len)return startTiebreak();
 if(!G.ot&&!G.mc.sudden&&G.t>=M.len){if(G.crowns[0]!==G.crowns[1])return finish(G.crowns[0]>G.crowns[1]?0:1);G.ot=1;G.otT=0;banner('Овертайм','#ffc83d')}
 if(G.ot){G.otT+=dt;if(G.otT>=M.ot)return startTiebreak()}
 const m=elRate();if(m>m0)banner(m===2?'Двойной эликсир!':'Тройной эликсир!','#e08bff');
 const r=dt/CFG.elixir.period*m,mx=CFG.elixir.max;
 for(const S of G.side){const st=G.stats[S.tm];if(S.el>=mx){st.leak+=r;st.fullCur+=dt;st.fullMax=Math.max(st.fullMax,st.fullCur)}else if(st.fullCur>0){st.fullN++;st.fullSum+=st.fullCur;st.fullCur=0}S.el=Math.min(mx,S.el+r*S.elMul);S.abCd=Math.max(0,S.abCd-dt);
  for(const p of S.pend){p.t-=dt;if(p.t<=0){S.hand[p.i]=p.key;p.done=1}}S.pend=S.pend.filter(p=>!p.done)}
 G.inBots=1;for(const b of G.bots)if(b){RNG=b.r;botThink(b,dt);RNG=G.simR}if(G.replay)applyReplay(1);G.inBots=0;
 updDeploys(dt);
 if(G.force){G.force.t-=dt;if(G.force.t<=0)G.force=null}
 computeVis();
 for(const u of G.U)updUnit(u,dt);
 separate();
 for(const b of G.B)updBuilding(b,dt);
 for(const t of G.T)updTower(t,dt);
 for(const p of G.PR)updProj(p,dt);
 updZones(dt);updBridges(dt);
 if(G.rules.storm&&G.t>8){G.stormT+=dt;if(G.stormT>=G.rules.storm){G.stormT=0;const x=rnd(40,W-40),y=rnd(RY-90,RY+90);G.FX.push({k:'rain',x,y:y-120,x2:x,y2:y,l:0,m:.25});G.S.push({t:G.t+.3,fn:()=>{areaHit(-1,x,y,1.5*TILE,260,0,'g');ring(x,y,1.5*TILE,'#bfe6ff');puff(x,y,'#e8f4ff',10,70,3);G.shake=Math.max(G.shake,4);AU.sfx('zap')}})}}
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
 G.shake=Math.max(0,G.shake-dt*CFG.juice.shakeDecay)}
