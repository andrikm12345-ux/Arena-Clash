/* ================= БОТ ================= */
/* Бот смотрит на поле «сверху»: своя половина у него всегда вверху (fy<320), поэтому один и тот же код играет за любую сторону */
const SKILL={
 easy:{n:'Новичок',think:2.6,react:1.3,mist:.38,spell:.35,push:10,el:.75,acc:22,abil:.3},
 normal:{n:'Боец',think:1.2,react:.55,mist:.12,spell:.75,push:9,el:1,acc:10,abil:.7},
 hard:{n:'Легенда',think:.55,react:.22,mist:.03,spell:1,push:8,el:1,acc:4,abil:1}};
function mkBot(tm,cfg){const s=typeof cfg==='string'?SKILL[cfg]:Object.assign({},SKILL.normal,cfg);return{tm,s,think:rnd(1.2,2.5),seen:{},plan:[],lane:Math.random()<.5?0:1,lastPush:-99,cleanT:0}}
const fyOf=(b,y)=>b.tm?y:H-y;
const laneOf=x=>x<W/2?0:1;
function uval(u){const c=u.c;return(c.token?1.5:c.cost/(c.count||1))*(u.hp/u.mx)}
function botPlay(b,key,fx,fy,exact){const S=G.side[b.tm],i=S.hand.indexOf(key);if(i<0||S.el<CARDS[key].cost)return false;
 const a=exact?0:b.s.acc,x=clamp(fx+rnd(-a,a),12,W-12),y=fy+rnd(-a,a)*.6;
 if(playCard(b.tm,i,x,fyOf(b,y)))return true;
 if(CARDS[key].type==='spell')return false;
 for(let k=1;k<=8;k++){const y2=y-k*10,x2=clamp(x+(k%2?1:-1)*k*4,12,W-12);if(playCard(b.tm,i,x2,fyOf(b,y2)))return true}
 return false}
function laneThreats(b){const L=[0,1].map(()=>({v:0,air:0,gnd:0,n:0,small:0,tank:0,bt:0,spl:0,fy:1e9,x:0,age:0,units:[]}));
 for(const u of G.U){if(u.tm===b.tm||!alive(u))continue;const fy=fyOf(b,u.y);if(fy>345)continue;
  const T=L[laneOf(u.x)],v=uval(u);T.v+=v;T.n++;T.units.push(u);if(u.fly)T.air+=v;else T.gnd+=v;
  if(u.hp>=1000)T.tank=1;if(u.c.tg==='b')T.bt=1;if(u.mx<=260)T.small++;if(u.c.splash||u.c.spin)T.spl=1;
  if(fy<T.fy){T.fy=fy;T.x=u.x}
  if(b.seen[u.id]==null)b.seen[u.id]=G.t;T.age=Math.max(T.age,G.t-b.seen[u.id])}
 return L}
function laneDef(b,lane){let d=0;
 for(const u of G.U)if(u.tm===b.tm&&alive(u)&&laneOf(u.x)===lane&&fyOf(b,u.y)<360&&u.c.tg!=='b')d+=uval(u);
 for(const o of G.B)if(o.tm===b.tm&&alive(o))d+=(o.c.dmg?1.6:1)*o.hp/o.mx;
 const pt=G.T.find(t=>t.tm===b.tm&&t.kind==='p'&&laneOf(t.x)===lane);if(pt&&pt.hp>0)d+=2.2;
 const k=G.T.find(t=>t.tm===b.tm&&t.kind==='k');if(k.act)d+=1;
 return d}
function enemyDef(b,lane){let d=0;for(const u of G.U)if(u.tm!==b.tm&&alive(u)&&laneOf(u.x)===lane&&fyOf(b,u.y)>300)d+=uval(u);for(const o of G.B)if(o.tm!==b.tm&&alive(o))d+=1.5;return d}
function dpsOf(c){return c.dmg?c.dmg/c.hit*(c.count||1):0}
function counterScore(key,T){const c=CARDS[key],R=ROLE[key];if(c.type==='spell')return-99;if(R.win&&!c.tunnel)return-99;
 let s=4;const airShare=T.air/(T.v||1);
 if(T.air>0)s+=c.tg==='ga'?2*airShare+1:(airShare>.5?-12:-3);
 if(T.small>=3)s+=R.splash||c.kami?4:R.swarm?-1:-2;
 if(T.tank)s+=(dpsOf(c)>=180?3:0)+(R.swarm&&!T.spl?2:0)+(R.bld?1:0);
 if(T.bt&&R.bld)s+=4;
 if(T.spl&&R.swarm)s-=3;
 if(R.ranged)s+=1;
 if(c.kami&&T.small<2)s-=3;
 if(c.tunnel)s-=2;
 s-=Math.max(0,c.cost-T.v-1)*1.3+c.cost*.35;
 return s}
function spellTarget(b,key,units){const c=CARDS[key],lvl=G.side[b.tm].lv[key]||1;if(!c.dmg||c.freeze)return null;
 const r=c.rad*TILE,dm=LV(c.dmg,lvl)*(c.poison?.75:1);let best=null;
 for(const u of units){let val=0,n=0,sx=0,sy=0;for(const v of units)if(Math.hypot(v.x-u.x,v.y-u.y)<r*.8){n++;sx+=v.x;sy+=v.y;val+=v.hp<=dm?uval(v):uval(v)*dm/v.hp*.5}
  if(!best||val>best.val)best={x:sx/n,y:sy/n,val,n}}
 return best}
function placeDefense(b,key,T,lane){const c=CARDS[key],R=ROLE[key],lx=BR[lane],ins=lane?-1:1;
 if(R.bld)return[W/2-ins*18,215];
 if(c.tunnel)return[T.x,Math.max(70,Math.min(T.fy,290)-30)];
 const onSide=T.fy<300;
 if(c.kami)return onSide?[T.x,T.fy-8]:[lx+ins*20,250];
 if(R.ranged)return[lx+ins*26,82];
 if(R.swarm&&T.tank&&onSide)return[T.x,Math.max(60,T.fy-18)];
 if(onSide)return[T.x+ins*14,Math.max(60,T.fy-46)];
 return[lx+ins*34,232]}
function enemyTowerIn(b,lane){return G.T.find(t=>t.tm!==b.tm&&t.kind==='p'&&laneOf(t.x)===lane)}
function pushLane(b){let best=b.lane,bv=-1e9;
 for(const lane of[0,1]){const t=enemyTowerIn(b,lane);let v=-(t.hp/t.mx)*3+(t.hp<=0?2:0)+rnd(0,1.2)-enemyDef(b,lane)*.4;if(v>bv){bv=v;best=lane}}
 return best}
function placeWin(b,key,lane){const c=CARDS[key],lx=BR[lane],ins=lane?-1:1,pocket=enemyTowerIn(b,lane).hp<=0;
 if(c.tunnel){const t=pocket?G.T.find(t=>t.tm!==b.tm&&t.kind==='k'):enemyTowerIn(b,lane);return[pocket?W/2-ins*40:lx+ins*16,fyOf(b,t.y)-(pocket?44:34)]}
 if(pocket&&!c.fly)return[lx,468];
 if(c.spd==='slow')return[lx+ins*12,70];
 if(c.fly)return[lx,240];
 return[lx,288]}
function botThink(b,dt){const S=G.side[b.tm],s=b.s;
 // способность чемпиона
 if(S.champ&&alive(S.champ)&&S.abCd<=0&&S.el>=S.champ.c.ability.cost){const u=S.champ;let n=0;for(const v of G.U)if(v.tm!==b.tm&&alive(v)&&dist(u,v)<90)n++;
  const nearT=G.T.some(t=>t.tm!==b.tm&&t.hp>0&&dist(u,t)<t.r+40);
  if((n>=2||nearT||u.hp<u.mx*.45)&&Math.random()<s.abil*dt*3)useAbility(b.tm)}
 // запланированная поддержка
 for(const p of b.plan)if(!p.done&&G.t>=p.t){p.done=1;botSupport(b,p)}
 b.plan=b.plan.filter(p=>!p.done);
 b.think-=dt;if(b.think>0)return;b.think=s.think*rnd(.7,1.3);
 b.cleanT+=1;if(b.cleanT>40){b.cleanT=0;const ids=new Set(G.U.map(u=>u.id));for(const k in b.seen)if(!ids.has(+k))delete b.seen[k]}
 const L=laneThreats(b),hand=S.hand.filter(k=>k&&S.el>=CARDS[k].cost&&!cardBlocked(b.tm,k));
 // добить башню заклинанием
 if(Math.random()<s.spell)for(const k of hand){const c=CARDS[k];if(c.type!=='spell'||!c.tdmg||c.freeze)continue;const td=LV(c.tdmg,S.lv[k]||1);
  for(const t of G.T)if(t.tm!==b.tm&&t.hp>0&&t.hp<=td*(c.poison?.9:1)){if(botPlay(b,k,t.x,fyOf(b,t.y),true))return}}
 // оборона: самая опасная линия
 let need=null;
 for(const lane of[0,1]){const T=L[lane];if(!T.n||T.age<s.react)continue;const n=T.v-laneDef(b,lane)+(T.bt?1:0)+(T.fy<200?1:0);if(n>.6&&(!need||n>need.n))need={lane,n,T}}
 if(need&&Math.random()>s.mist*.5){const T=need.T;
  // заклинание по скоплению, если размен выгоден
  if(Math.random()<s.spell){let best=null;for(const k of hand){const c=CARDS[k];if(c.type!=='spell')continue;const p=spellTarget(b,k,T.units);if(p&&p.val>=c.cost+.4&&(!best||p.val-c.cost>best.gain))best={k,p,gain:p.val-c.cost}}
   if(best&&T.small>=2){const lead=CARDS[best.k].poison?0:-10;if(botPlay(b,best.k,best.p.x,fyOf(b,best.p.y)+lead,true))return}}
  // клич в обороне, когда свои уже дерутся
  const rg=hand.find(k=>CARDS[k].rage);
  if(rg&&T.v>=4){const own=G.U.filter(u=>u.tm===b.tm&&alive(u)&&laneOf(u.x)===need.lane&&fyOf(b,u.y)<360);const ov=own.reduce((a,u)=>a+uval(u),0);
   if(ov>=4){const cx=own.reduce((a,u)=>a+u.x,0)/own.length,cy=own.reduce((a,u)=>a+u.y,0)/own.length;if(botPlay(b,rg,cx,fyOf(b,cy),true))return}}
  let pick=null,ps=-1e9;
  for(const k of hand){let sc=counterScore(k,T);if(Math.random()<s.mist)sc+=rnd(-4,4);if(sc>ps){ps=sc;pick=k}}
  if(pick&&ps>0){const[px,py]=placeDefense(b,pick,T,need.lane);if(botPlay(b,pick,px,py))return}
  if(T.fy<130&&T.v>=3){for(const k of hand){const c=CARDS[k];if(c.type!=='spell')continue;const p=spellTarget(b,k,T.units);if(p&&p.val>=c.cost*.6&&botPlay(b,k,p.x,fyOf(b,p.y),true))return}}}
 // поддержка своей контратаки
 botOffenseSpells(b,hand);
 // атака
 const dbl=elRate()>1,thr=s.push-(dbl?1.5:0)-(G.ot?.5:0);
 const other=G.side[1-b.tm],ol=other.last,punish=ol&&G.t-ol.t<4&&CARDS[ol.key].cost>=5&&fyOf(b,ol.y)>520;
 const wins=hand.filter(k=>ROLE[k].win);
 if(wins.length&&(S.el>=thr||punish&&S.el>=CARDS[wins[0]].cost+1)&&G.t-b.lastPush>4){
  const lane=punish?1-laneOf(ol.x):pushLane(b);let k=wins[0];
  if(punish){const f=wins.find(x=>CARDS[x].spd==='vfast'||CARDS[x].tunnel);if(f)k=f}
  else if(wins.length>1)k=wins.sort((x,y)=>(CARDS[y].spd==='slow')-(CARDS[x].spd==='slow'))[S.el>=9.5?0:wins.length-1];
  const[px,py]=placeWin(b,k,lane);
  if(botPlay(b,k,px,py)){b.lane=lane;b.lastPush=G.t;b.plan.push({t:G.t+(CARDS[k].spd==='slow'?rnd(2.5,4):rnd(.6,1.4))*(1+s.mist),lane,k:'sup'});return}}
 // не терять эликсир
 if(S.el>=9.4){const troops=hand.filter(k=>CARDS[k].type==='troop'&&!ROLE[k].win).sort((a,c)=>CARDS[a].cost-CARDS[c].cost);
  if(troops.length){const k=troops[0],lane=b.lane,lx=BR[lane],ins=lane?-1:1;if(ROLE[k].ranged||CARDS[k].spd==='slow'?botPlay(b,k,lx+ins*20,76):botPlay(b,k,lx,286))return}
  const bl=hand.find(k=>ROLE[k].bld);if(bl&&botPlay(b,bl,W/2,215))return
  // осталось одно заклинание — бросить по башне, чтобы не стоять
  const sp=hand.find(k=>CARDS[k].type==='spell'&&CARDS[k].tdmg&&!CARDS[k].freeze);
  if(sp){const t=G.T.filter(t=>t.tm!==b.tm&&t.hp>0&&t.kind==='p').sort((x,y)=>x.hp-y.hp)[0]||G.T.find(t=>t.tm!==b.tm&&t.kind==='k');if(botPlay(b,sp,t.x,fyOf(b,t.y),true))return}
  const rg=hand.find(k=>CARDS[k].rage);if(rg){const own=G.U.filter(u=>u.tm===b.tm&&alive(u));if(own.length){const u=own.sort((x,y)=>fyOf(b,y.y)-fyOf(b,x.y))[0];if(botPlay(b,rg,u.x,fyOf(b,u.y)-10,true))return}}}
 if(Math.random()<.004&&G.crowns[b.tm]>G.crowns[1-b.tm])emote(b.tm,pickR([3,4]))}
function botSupport(b,p){const S=G.side[b.tm];
 const lead=G.U.filter(u=>u.tm===b.tm&&alive(u)&&ROLE[u.key]?.win&&laneOf(u.x)===p.lane).sort((x,y)=>fyOf(b,y.y)-fyOf(b,x.y))[0];
 if(!lead)return;
 const hand=S.hand.filter(k=>k&&S.el>=CARDS[k].cost&&!cardBlocked(b.tm,k)&&CARDS[k].type==='troop'&&!ROLE[k].win);
 if(!hand.length)return;
 const k=hand.sort((x,y)=>(ROLE[y].ranged+ROLE[y].splash*.7+ROLE[y].aa*.5-CARDS[y].cost*.15)-(ROLE[x].ranged+ROLE[x].splash*.7+ROLE[x].aa*.5-CARDS[x].cost*.15))[0];
 const lf=fyOf(b,lead.y);
 if(lf<290)botPlay(b,k,lead.x,Math.max(30,lf-38));else botPlay(b,k,BR[p.lane],286)}
function botOffenseSpells(b,hand){const s=b.s;if(Math.random()>s.spell)return;
 for(const t of G.T){if(t.tm===b.tm||t.hp<=0)continue;
  let own=0;for(const u of G.U)if(u.tm===b.tm&&alive(u)&&dist(u,t)<t.r+70)own+=uval(u);
  if(own<4)continue;
  const def=G.U.filter(u=>u.tm!==b.tm&&alive(u)&&dist(u,t)<130);
  for(const k of hand){const c=CARDS[k];if(c.type!=='spell')continue;
   if(c.freeze&&own>=6){if(botPlay(b,k,t.x,fyOf(b,t.y)+(fyOf(b,t.y)>320?-20:20),true))return}
   else if(c.rage&&own>=4){const near=G.U.filter(u=>u.tm===b.tm&&alive(u)&&dist(u,t)<t.r+70);const cx=near.reduce((a,u)=>a+u.x,0)/near.length,cy=near.reduce((a,u)=>a+u.y,0)/near.length;if(botPlay(b,k,cx,fyOf(b,cy),true))return}
   else if(c.dmg&&def.length){const p=spellTarget(b,k,def);if(p&&p.val+(dist(p,t)<c.rad*TILE+t.r?c.tdmg/300:0)>=c.cost&&botPlay(b,k,p.x,fyOf(b,p.y),true))return}}}}
