/* ================= ПРОГРЕСС: ПРОФИЛЬ, КАРТЫ, СУНДУКИ, ДОРОГА, МАГАЗИН ================= */
const ARENAS=[
 {n:'Тренировочный лагерь',tr:0},{n:'Костяной овраг',tr:200},{n:'Кузнечная слобода',tr:450},{n:'Морозный перевал',tr:750},
 {n:'Драконьи скалы',tr:1100},{n:'Ядовитая топь',tr:1500},{n:'Грозовая цитадель',tr:1950},{n:'Каменный трон',tr:2450}];
const ARENA_OF={guard:0,shooters:0,bones:0,imps:0,slingers:0,bomber:0,cannon:0,volley:0,giant:0,crossbow:0,axe:0,fireball:0,
 lair:1,legion:1,wisp:1,spark:1,hammer:2,militia:2,ram:2,bats:3,freeze:3,frostsage:3,drake:4,airship:4,sorcerer:4,
 poison:5,mole:5,cry:5,thunder:6,knightrider:6,colossus:7,warlord:7};
const arenaOf=tr=>{let a=0;ARENAS.forEach((x,i)=>{if(tr>=x.tr)a=i});return a};
const MAXLV=9;
/* копии для перехода на следующий уровень (со 2-го по 9-й) */
const COPIES={common:[2,4,10,20,50,100,200,400],rare:[1,2,4,10,20,50,100,200],epic:[1,1,2,4,10,20,40,80],legendary:[1,1,1,2,4,8,12,20],champion:[1,1,1,2,3,5,8,12]};
const UPGOLD=[10,30,70,150,300,600,1200,2400],RMUL={common:1,rare:1.5,epic:2.5,legendary:4,champion:5};
const UPXP=[4,6,10,20,40,80,150,300];
const KL_XP=[0,20,60,140,300,600,1100,2000,3500];
const CHESTS={
 silver:{n:'Серебряный',time:60,gold:[18,30],cards:5,col:['#dfe6f1','#8a96ab','#5b6579']},
 gold:{n:'Золотой',time:180,gold:[55,85],cards:14,rare:1,col:['#ffe08a','#d99a1e','#8a5a00']},
 magic:{n:'Волшебный',time:480,gold:[140,200],cards:32,rare:4,epic:1,gems:5,col:['#e5b8ff','#9b3fd6','#4e1a7a']},
 giant:{n:'Гигантский',time:480,gold:[260,340],cards:72,rare:6,col:['#ffb27a','#d9622a','#7a2e0a']},
 legend:{n:'Легендарный',time:900,gold:[150,200],cards:1,leg:1,col:['#a8fff0','#2bbfa6','#0d5c50']}};
const CHEST_CYCLE=['silver','silver','gold','silver','silver','gold','silver','magic','silver','gold','silver','silver','gold','giant','silver','gold','silver','magic','silver','gold','silver','silver','gold','legend'];
const ROAD=[{tr:40,g:60},{tr:90,ch:'silver'},{tr:140,gm:10,sh:2},{tr:200,ar:1,ch:'gold'},{tr:260,g:120},{tr:330,cd:['rare',6]},{tr:390,gm:15,sh:3},{tr:450,ar:2,ch:'magic'},
 {tr:530,g:200},{tr:610,ch:'gold'},{tr:680,gm:20,sh:3},{tr:750,ar:3,ch:'giant'},{tr:850,g:300},{tr:950,cd:['epic',2]},{tr:1030,gm:25,sh:4},{tr:1100,ar:4,ch:'magic'},
 {tr:1200,g:400},{tr:1300,ch:'giant'},{tr:1400,gm:30,sh:4},{tr:1500,ar:5,ch:'legend'},{tr:1620,g:500},{tr:1740,cd:['epic',3]},{tr:1850,gm:40,sh:5},{tr:1950,ar:6,ch:'magic'},
 {tr:2080,g:700},{tr:2200,ch:'giant'},{tr:2330,gm:50,sh:6},{tr:2450,ar:7,ch:'legend'},{tr:2600,g:1000},{tr:2800,ch:'magic'},{tr:3000,gm:100}];
const ARENA_LV=[1,1,2,2,3,4,5,6];
const EVO_COST=6,HERO_COST=10;
/* сундук удачи после победы: прокрутка редкости, без таймеров */
const LUCKY=[{t:'silver',p:.5},{t:'gold',p:.3},{t:'magic',p:.13},{t:'giant',p:.05},{t:'legend',p:.02}];
const NDECKS=5;
/* события: особые режимы без кубков */
const EVENTS=[{id:'triple',n:'Тройной эликсир',d:'Эликсир копится втрое быстрее весь бой. Успевай тратить!',c:'#c77dff'},
 {id:'sudden',n:'Внезапная смерть',d:'Кто первым сломает любую башню, тот победил. Эликсир ×2, в последнюю минуту ×3.',c:'#ff5c4d'},
 {id:'draft',n:'Драфт',d:'Колоды собираются прямо перед боем: из каждой пары карт одну берёшь ты, другая уходит сопернику. Уровни карт равные.',c:'#3da5ff'},
 {id:'train',n:'Тренировка',d:'Обычный бой без кубков с ботом выбранной силы.',c:'#5fe08f'}];
/* клан: соклановцы-боты */
const CLAN_NAME='Дубовый щит';
const CLAN_MATES=[['Варвара Клин',1],['Сыч',2],['Мирон Пушка',0],['Лада Ветер',0],['Кощей-Внук',0],['Гусляр',0],['Полкан',0],['Ёжик в броне',0],['Тихоня',0]];

/* ---------- профиль ---------- */
const SAVE_KEY='ac3.save';
const okDeck=d=>Array.isArray(d)&&d.length===8&&new Set(d).size===8&&d.every(k=>CARD_IDS.includes(k))&&d.filter(k=>CARDS[k].rar==='champion').length<=1;
function freshProfile(){const cards={};for(const k of CARD_IDS)if(ARENA_OF[k]===0)cards[k]={lv:1,n:0};
 return{v:1,name:'Игрок',kl:1,xp:0,gold:150,gems:30,tr:0,best:0,cards,decks:Array.from({length:NDECKS},()=>DEF_DECK.slice()),slot:0,shards:EVO_COST,evo:[],heroes:[],tt:'archer',luck:[],clan:{req:null,next:0,don:{}},ev:{day:'',won:[]},
  chests:[null,null,null,null],cyc:0,rc:[],shop:null,st:{w:0,l:0,d:0,cr:0,three:0,games:0},tut:0,train:'normal',arSeen:0,fresh:[],hints:[]}}
function sanitize(o){const f=freshProfile();if(!o||typeof o!=='object')return f;
 const num=(v,d,a,b)=>Number.isFinite(v)?clamp(Math.floor(v),a,b):d;
 const P2=Object.assign(f,{name:typeof o.name==='string'&&o.name.trim()?o.name.trim().slice(0,16):'Игрок',kl:num(o.kl,1,1,9),xp:num(o.xp,0,0,1e7),gold:num(o.gold,150,0,1e8),gems:num(o.gems,30,0,1e6),
  tr:num(o.tr,0,0,1e5),best:num(o.best,0,0,1e5),slot:num(o.slot,0,0,NDECKS-1),shards:num(o.shards,EVO_COST,0,1e5),tt:TT[o.tt]?o.tt:'archer',cyc:num(o.cyc,0,0,1e6),tut:num(o.tut,0,0,9),arSeen:num(o.arSeen,0,0,7),train:SKILL[o.train]?o.train:'normal'});
 P2.cards={};if(o.cards&&typeof o.cards==='object')for(const k of CARD_IDS){const c=o.cards[k];if(c&&typeof c==='object')P2.cards[k]={lv:num(c.lv,1,1,MAXLV),n:num(c.n,0,0,1e6)}}
 for(const k of CARD_IDS)if(ARENA_OF[k]===0&&!P2.cards[k])P2.cards[k]={lv:1,n:0};
 P2.decks=Array.from({length:NDECKS},(_,i)=>{const d=o.decks&&o.decks[i];return okDeck(d)&&d.every(k=>P2.cards[k])?d.slice():DEF_DECK.slice()});
 // старые сундуки из слотов открываются сразу: таймеров больше нет
 P2.chests=[0,1,2,3].map(i=>{const c=o.chests&&o.chests[i];return c&&CHESTS[c.t]?{t:c.t,a:num(c.a,0,0,7),st:'ready',end:0}:null});
 P2.evo=Array.isArray(o.evo)?[...new Set(o.evo.filter(k=>EVO[k]&&P2.cards[k]))]:[];
 P2.heroes=Array.isArray(o.heroes)?[...new Set(o.heroes.filter(k=>HERO[k]&&P2.cards[k]))]:[];
 P2.luck=Array.isArray(o.luck)?o.luck.filter(a=>Number.isInteger(a)&&a>=0&&a<8).slice(0,6):[];
 const cl=o.clan&&typeof o.clan==='object'?o.clan:{};const rq=cl.req;
 P2.clan={req:rq&&P2.cards[rq.k]&&['common','rare'].includes(CARDS[rq.k].rar)?{k:rq.k,t0:num(rq.t0,0,0,1e15),got:num(rq.got,0,0,40),taken:num(rq.taken,0,0,40),fights:num(rq.fights,0,0,1e4)}:null,next:num(cl.next,0,0,1e15),don:{}};
 if(cl.don&&typeof cl.don==='object')for(const k in cl.don)if(/^\d+:\d$/.test(k))P2.clan.don[k]=num(cl.don[k],0,0,40);
 P2.ev=o.ev&&typeof o.ev.day==='string'?{day:o.ev.day,won:Array.isArray(o.ev.won)?o.ev.won.filter(x=>EVENTS.some(e=>e.id===x)):[]}:{day:'',won:[]};
 P2.rc=Array.isArray(o.rc)?[...new Set(o.rc.filter(i=>Number.isInteger(i)&&i>=0&&i<ROAD.length))]:[];
 if(o.st&&typeof o.st==='object')for(const k in P2.st)P2.st[k]=num(o.st[k],0,0,1e7);
 P2.shop=o.shop&&typeof o.shop.day==='string'?{day:o.shop.day,bought:Array.isArray(o.shop.bought)?o.shop.bought.filter(Number.isInteger):[]}:null;
 P2.fresh=Array.isArray(o.fresh)?o.fresh.filter(k=>CARD_IDS.includes(k)&&P2.cards[k]):[];
 P2.hints=Array.isArray(o.hints)?o.hints.filter(k=>typeof k==='string'&&k.length<20).slice(0,40):[];
 return P2}
let P=sanitize(store.get(SAVE_KEY,null));
const saveP=()=>store.set(SAVE_KEY,P);
const curDeck=()=>P.decks[P.slot];
const curArena=()=>arenaOf(P.tr);
/* особые слоты колоды: первый — эволюция, второй — герой (если в колоде нет чемпиона) */
function deckSpecial(d){d=d||curDeck();return{evo:EVO[d[0]]&&P.evo.includes(d[0])?d[0]:null,hero:HERO[d[1]]&&P.heroes.includes(d[1])&&!d.some(k=>CARDS[k].ability)?d[1]:null}}
const collLevel=()=>CARD_IDS.reduce((s,k)=>s+(P.cards[k]?P.cards[k].lv:0),0)+P.evo.length*3+P.heroes.length*5;
function unlockEvo(k){if(!EVO[k]||!P.cards[k]||P.evo.includes(k)||P.shards<EVO_COST)return false;P.shards-=EVO_COST;P.evo.push(k);saveP();return true}
function unlockHero(k){if(!HERO[k]||!P.cards[k]||P.heroes.includes(k)||P.shards<HERO_COST)return false;P.shards-=HERO_COST;P.heroes.push(k);saveP();return true}
/* поставить карту в особый слот: меняется местами с тем, что там стоит */
function toSlot(k,i){const d=curDeck().slice(),j=d.indexOf(k);if(j<0)return false;[d[i],d[j]]=[d[j],d[i]];P.decks[P.slot]=d;saveP();return true}

/* ---------- карты и уровни ---------- */
const lvOf=k=>P.cards[k]?P.cards[k].lv:1;
const needOf=k=>{const c=P.cards[k];return c&&c.lv<MAXLV?COPIES[CARDS[k].rar][c.lv-1]:0};
const upCost=k=>{const c=P.cards[k];return c&&c.lv<MAXLV?Math.round(UPGOLD[c.lv-1]*RMUL[CARDS[k].rar]):0};
const canUp=k=>{const c=P.cards[k];return!!c&&c.lv<MAXLV&&c.n>=needOf(k)};
function upgrade(k){if(!canUp(k)||P.gold<upCost(k))return false;const c=P.cards[k];P.gold-=upCost(k);c.n-=needOf(k);c.lv++;addXP(Math.round(UPXP[c.lv-2]*RMUL[CARDS[k].rar]));saveP();return true}
function addXP(x){P.xp+=x;let up=false;while(P.kl<9&&P.xp>=KL_XP[P.kl]){P.kl++;up=true}if(up)toast(`Уровень короля ${P.kl}! Башни стали крепче`)}
function giveCard(k,n){if(!P.cards[k]){P.cards[k]={lv:1,n:n-1};if(!P.fresh.includes(k))P.fresh.push(k);return true}P.cards[k].n+=n;return false}
const levelsMap=()=>{const m={};for(const k of CARD_IDS)m[k]=lvOf(k);return m};

/* ---------- сундуки ---------- */
function rollChest(t,a){const C=CHESTS[t],m=1+.35*a,gold=Math.round(rnd(C.gold[0],C.gold[1])*(1+.3*a)),out=[];
 const pool=r=>CARD_IDS.filter(k=>CARDS[k].rar===r&&ARENA_OF[k]<=a);
 const add=(r,n)=>{const p=pool(r);if(!p.length||n<=0)return 0;const k=pickR(p),e=out.find(x=>x.k===k);if(e)e.n+=n;else out.push({k,n});return n};
 if(C.leg){const L=pool('legendary').concat(a>=7?pool('champion'):[]);if(L.length)out.push({k:pickR(L),n:1});else add('epic',2);return{gold,gems:0,cards:out}}
 let total=Math.round(C.cards*m);
 if(Math.random()<.008*m&&pool('legendary').length){out.push({k:pickR(pool('legendary')),n:1});total--}
 total-=add('epic',(C.epic||0)+(Math.random()<.06*m?1:0));
 const rr=Math.round((C.rare||0)*m)+(Math.random()<.5?1:0),r1=Math.ceil(rr/2);total-=add('rare',r1);total-=add('rare',rr-r1);
 total=Math.max(1,total);const parts=total>=6?3:total>=3?2:1;for(let i=0;i<parts;i++){const n=i===parts-1?total:Math.round(total/parts);total-=add('common',n)}
 return{gold,gems:C.gems||0,cards:out}}
function applyLoot(L){P.gold+=L.gold;P.gems+=L.gems;if(L.shards)P.shards+=L.shards;return{gold:L.gold,gems:L.gems,shards:L.shards||0,cards:L.cards.map(x=>({k:x.k,n:x.n,isNew:giveCard(x.k,x.n)}))}}
function luckyRoll(){let r=Math.random(),i=0;for(;i<LUCKY.length-1;i++){if(r<LUCKY[i].p)break;r-=LUCKY[i].p}return i}
function openLucky(tier,a){const t=LUCKY[tier].t,L=rollChest(t,a);L.shards=tier>=3?2:tier>=2?1:0;const R=applyLoot(L);saveP();return Object.assign({t},R)}
function awardChest(){const i=P.chests.findIndex(c=>!c);if(i<0)return null;const t=CHEST_CYCLE[P.cyc++%CHEST_CYCLE.length];P.chests[i]={t,a:curArena(),st:'locked',end:0};return{i,t}}
const chestLeft=c=>Math.max(0,(c.end-Date.now())/1000);
const gemsFor=sec=>Math.max(1,Math.ceil(sec/20));
const opening=()=>P.chests.some(c=>c&&c.st==='opening');
function tickChests(){let ch=false;for(const c of P.chests)if(c&&c.st==='opening'&&Date.now()>=c.end){c.st='ready';ch=true}if(ch)saveP();return ch}
function startUnlock(i){const c=P.chests[i];if(!c||c.st!=='locked'||opening())return false;c.st='opening';c.end=Date.now()+CHESTS[c.t].time*1000;saveP();return true}
function rushCost(i){const c=P.chests[i];return gemsFor(c.st==='opening'?chestLeft(c):CHESTS[c.t].time)}
function rushChest(i){const c=P.chests[i];if(!c||c.st==='ready')return false;const cost=rushCost(i);if(P.gems<cost)return false;P.gems-=cost;c.st='ready';saveP();return true}
function openChest(i){const c=P.chests[i];if(!c||c.st!=='ready')return null;P.chests[i]=null;const R=applyLoot(rollChest(c.t,c.a));saveP();return Object.assign({t:c.t},R)}

/* ---------- дорога кубков ---------- */
const roadReady=i=>P.tr>=ROAD[i].tr&&!P.rc.includes(i);
function claimRoad(i){if(!roadReady(i))return null;const r=ROAD[i],a=curArena();P.rc.push(i);
 const res={t:r.ch||null,gold:r.g||0,gems:r.gm||0,shards:r.sh||0,cards:[]};P.gold+=res.gold;P.gems+=res.gems;P.shards+=res.shards;
 if(r.cd){const p=CARD_IDS.filter(k=>CARDS[k].rar===r.cd[0]&&ARENA_OF[k]<=a);if(p.length){const k=pickR(p);res.cards.push({k,n:r.cd[1],isNew:giveCard(k,r.cd[1])})}}
 if(r.ch){const L=applyLoot(rollChest(r.ch,a));res.gold+=L.gold;res.gems+=L.gems;res.cards.push(...L.cards)}
 saveP();return res}

/* ---------- магазин на день ---------- */
const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
function shopOffers(){const day=dayKey();if(!P.shop||P.shop.day!==day){P.shop={day,bought:[]};saveP()}
 const r=mul(fnv(day+'|arena-clash')),a=curArena();
 const pk=rar=>{const p=CARD_IDS.filter(k=>CARDS[k].rar===rar&&ARENA_OF[k]<=a&&P.cards[k]);return p.length?p[Math.floor(r()*p.length)]:null};
 return[{id:0,kind:'card',k:pk('common'),n:5,cost:0,cur:'gold',free:1},{id:1,kind:'card',k:pk('common'),n:10,cost:80,cur:'gold'},{id:2,kind:'card',k:pk('rare'),n:3,cost:180,cur:'gold'},
  {id:3,kind:'card',k:pk('epic'),n:1,cost:450,cur:'gold'},{id:4,kind:'chest',t:'gold',cost:25,cur:'gems'},{id:5,kind:'chest',t:'magic',cost:70,cur:'gems'},
  {id:8,kind:'shard',n:2,cost:60,cur:'gems'},{id:6,kind:'gold',n:400,cost:30,cur:'gems',many:1},{id:7,kind:'gold',n:1800,cost:110,cur:'gems',many:1}].filter(o=>o.kind!=='card'||o.k)}
const bought=o=>!o.many&&P.shop.bought.includes(o.id);
function buy(o){if(bought(o))return null;const have=o.cur==='gold'?P.gold:P.gems;if(have<o.cost)return null;
 if(o.cur==='gold')P.gold-=o.cost;else P.gems-=o.cost;if(!o.many)P.shop.bought.push(o.id);
 let res;if(o.kind==='card')res={gold:0,gems:0,cards:[{k:o.k,n:o.n,isNew:giveCard(o.k,o.n)}]};else if(o.kind==='chest')res=Object.assign({t:o.t},applyLoot(rollChest(o.t,curArena())));else if(o.kind==='shard'){P.shards+=o.n;res={gold:0,gems:0,shards:o.n,cards:[]}}else{P.gold+=o.n;res={gold:o.n,gems:0,cards:[]}}
 saveP();return res}

/* ---------- подбор соперника ---------- */
function skillFor(a){const mix=(x,y,f)=>{const o={};for(const k in x)o[k]=typeof x[k]==='number'?x[k]+(y[k]-x[k])*f:y[k];return o};
 return a<=3?mix(SKILL.easy,SKILL.normal,a/3):mix(SKILL.normal,SKILL.hard,(a-3)/4)}
function genBotDeck(a){const ok=k=>ARENA_OF[k]<=a,pre=BOT_DECKS.filter(d=>d.every(ok));if(pre.length&&Math.random()<.55)return pickR(pre).slice();
 const pool=CARD_IDS.filter(ok),R=k=>ROLE[k],d=[];
 const put=k=>{if(k&&!d.includes(k)&&d.length<8&&!(CARDS[k].rar==='champion'&&d.some(x=>CARDS[x].rar==='champion')))d.push(k)};
 put(pickR(pool.filter(k=>R(k).win)));
 const sp=pool.filter(k=>R(k).spell&&CARDS[k].dmg);put(pickR(sp.filter(k=>CARDS[k].cost<=3)));put(pickR(sp.filter(k=>CARDS[k].cost>=4)));
 for(const k of shuffle(pool.filter(k=>CARDS[k].type==='troop'&&CARDS[k].tg==='ga')).slice(0,2))put(k);
 if(Math.random()<.6)put(pickR(pool.filter(k=>R(k).bld)));
 for(const k of shuffle(pool.filter(k=>!R(k).spell&&!R(k).win)))put(k);
 for(const k of shuffle(pool))put(k);
 return d}
function botExtras(deck,a){const ex={evo:null,hero:null};
 if(a>=2&&Math.random()<.6){const i=deck.findIndex(k=>EVO[k]);if(i>=0)ex.evo=deck[i]}
 if(a>=4&&Math.random()<.5&&!deck.some(k=>CARDS[k].ability)){const i=deck.findIndex(k=>HERO[k]);if(i>=0)ex.hero=deck[i]}
 return ex}
const botTT=a=>a<1?'archer':pickR(Object.keys(TT));
function botSetup(a,train){const deck=genBotDeck(a),my=curDeck().map(lvOf),avg=my.reduce((s,x)=>s+x,0)/8,lv={};
 const base=train?avg:(ARENA_LV[a]+avg)/2;for(const k of deck)lv[k]=clamp(Math.round(base+(train?0:rnd(-.6,.6))),1,MAXLV);
 const kl=train?P.kl:clamp(Math.round((ARENA_LV[a]+P.kl)/2),1,9);
 return{deck,lv,kl,skill:train?P.train:skillFor(a),ex:botExtras(deck,a),tt:botTT(a)}}
function trophyDelta(res){const a=curArena();if(res===0)return 30+(Math.random()*3|0);if(res===1)return a===0?0:-(a<=3?12:a<=5?16:20);return 0}

/* ---------- клан ---------- */
const REQ_N={common:10,rare:2},REQ_GAP=60*60*1000,REQ_FILL=5*60*1000;
/* соклановцы присылают по карте раз в 5 минут и по одной за каждый бой */
function reqState(){const q=P.clan.req;if(!q)return null;const cap=REQ_N[CARDS[q.k].rar];return{q,cap,got:Math.min(cap,Math.floor((Date.now()-q.t0)/REQ_FILL)+q.fights)}}
const canRequest=()=>!P.clan.req&&Date.now()>=P.clan.next;
function makeRequest(k){if(!canRequest()||!P.cards[k]||!REQ_N[CARDS[k].rar])return false;P.clan.req={k,t0:Date.now(),got:0,taken:0,fights:0};saveP();return true}
function collectReq(){const s=reqState();if(!s)return 0;const n=s.got-s.q.taken;if(n>0){giveCard(s.q.k,n);s.q.taken=s.got}
 if(s.got>=s.cap){P.clan.req=null;P.clan.next=Date.now()+REQ_GAP}saveP();return n}
/* просьбы соклановцев меняются каждый час */
function mateRequests(){const h=Math.floor(Date.now()/36e5),r=mul(h*7+3),a=curArena(),out=[];
 const pool=CARD_IDS.filter(k=>REQ_N[CARDS[k].rar]&&ARENA_OF[k]<=a);
 for(let i=0;i<3;i++){const m=CLAN_MATES[(h+i*3)%CLAN_MATES.length],k=pool[Math.floor(r()*pool.length)],cap=CARDS[k].rar==='rare'?1:4,id=h+':'+i;
  out.push({id,who:m[0],k,cap,done:P.clan.don[id]||0})}
 return out}
function donate(o){if(o.done>=o.cap||!P.cards[o.k]||P.cards[o.k].n<1)return false;P.cards[o.k].n--;const g=CARDS[o.k].rar==='rare'?50:5;P.gold+=g;addXP(CARDS[o.k].rar==='rare'?5:1);
 P.clan.don[o.id]=(P.clan.don[o.id]||0)+1;const keep={};for(const k in P.clan.don)if(+k.split(':')[0]>=Math.floor(Date.now()/36e5)-1)keep[k]=P.clan.don[k];P.clan.don=keep;saveP();return g}
function clanFight(){if(P.clan.req){P.clan.req.fights++;saveP()}}

/* ---------- события ---------- */
function evDay(){const d=dayKey();if(P.ev.day!==d)P.ev={day:d,won:[]};return P.ev}
function eventReward(id){const e=evDay(),first=!e.won.includes(id),a=curArena(),g=first?40+15*a:10+3*a;P.gold+=g;let sh=0;if(first){e.won.push(id);sh=1;P.shards+=1}saveP();return{gold:g,shards:sh,first}}
/* драфт: восемь пар карт; одну берёт игрок, другую соперник */
function draftPairs(){const a=curArena(),pool=shuffle(CARD_IDS.filter(k=>ARENA_OF[k]<=Math.max(a,2)&&!CARDS[k].ability)),pairs=[];for(let i=0;i<8;i++)pairs.push([pool[i*2],pool[i*2+1]]);return pairs}

/* ---------- сохранение кодом ---------- */
function exportCode(){const b=new TextEncoder().encode(JSON.stringify(P));let bin='';for(const x of b)bin+=String.fromCharCode(x);const c=btoa(bin);return'AC3-'+fnv(c).toString(36)+'-'+c}
function importCode(code){const m=/^AC3-([0-9a-z]+)-([A-Za-z0-9+/=]+)$/.exec((code||'').replace(/\s+/g,''));
 if(!m)return'Это не похоже на код сохранения Arena Clash';if(fnv(m[2]).toString(36)!==m[1])return'Код повреждён: скопируй его целиком';
 let o;try{const bin=atob(m[2]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);o=JSON.parse(new TextDecoder().decode(u))}catch(e){return'Не удалось прочитать код'}
 P=sanitize(o);saveP();return null}
