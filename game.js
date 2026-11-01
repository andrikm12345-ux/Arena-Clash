'use strict';
/* совместимость со старыми iOS (до 16): нет roundRect у 2D-холста — делаем сами через arcTo */
if(typeof CanvasRenderingContext2D!=='undefined'&&!CanvasRenderingContext2D.prototype.roundRect){
 CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){let a=Array.isArray(r)?r.slice():[r||0];a=a.map(v=>Math.max(0,+v||0));
  const[tl,tr,br,bl]=a.length===1?[a[0],a[0],a[0],a[0]]:a.length===2?[a[0],a[1],a[0],a[1]]:a.length===3?[a[0],a[1],a[2],a[1]]:a;
  const k=Math.min(1,w/Math.max(1e-6,Math.max(tl+tr,bl+br)),h/Math.max(1e-6,Math.max(tl+bl,tr+br))),T=tl*k,R=tr*k,B=br*k,L=bl*k;
  this.moveTo(x+T,y);this.lineTo(x+w-R,y);this.arcTo(x+w,y,x+w,y+R,R);this.lineTo(x+w,y+h-B);this.arcTo(x+w,y+h,x+w-B,y+h,B);
  this.lineTo(x+L,y+h);this.arcTo(x,y+h,x,y+h-L,L);this.lineTo(x,y+T);this.arcTo(x,y,x+T,y,T);this.closePath()}}
/* любой необработанный сбой — коротким сообщением на экране, чтобы причину было видно со скриншота */
if(typeof addEventListener==='function'&&typeof document!=='undefined'){let n=0;addEventListener('error',e=>{if(n++>=2||!document.body)return;const d=document.createElement('div');d.textContent='Сбой: '+(e.message||'ошибка')+' ('+(String(e.filename||'').split('/').pop()||'')+':'+(e.lineno||0)+')';d.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:99;background:#6a1414f0;color:#fff;font:12px/1.3 sans-serif;padding:6px 8px;border-radius:8px;pointer-events:none';document.body.appendChild(d);setTimeout(()=>d.remove(),9000)})}
/* ================= КОНФИГ: числа правил, арены, башен и режимов =================
   Все времена — в секундах, расстояния — в тайлах, если не сказано иное.
   Характеристики карт — в таблице CARDS (1-data.js), прогресс — в 7-meta.js. */
const CFG={
 sim:{hz:30},                              // фиксированный тик симуляции, отдельно от кадров
 match:{len:180,dblAt:120,ot:120,otTripleAt:60,tiebreak:2.5,endDelay:1.5},
 elixir:{start:5,max:10,period:2.8},       // 1 эликсир за period секунд при x1
 hand:{size:4,delay:{1:1,2:.5,3:.35}},     // задержка входа новой карты по множителю эликсира
 arena:{tile:20,tilesW:18,tilesH:32,river:2,pocket:4,bridgeHalf:1.1,  // pocket — глубина кармана; bridgeHalf — полуширина моста (тайлы)
  princess:[3.5,25.75],king:[9,29]},       // центры своих башен (x, y в тайлах; у соперника зеркально)
 speed:{slow:45,med:60,fast:90,vfast:120,tile:60}, // классы скорости карт; tile — сколько единиц = 1 тайл/с
 sight:{def:5.5,ranged:.5,building:7.5},   // обзор: по умолчанию; у дальнобойных = дальность + ranged; у «только здания»
 retarget:.15,                             // как часто юнит без цели ищет новую
 unit:{fh:.35,wind:.3,windMax:.4,          // первый удар после захвата цели = hit×fh; замах = min(hit×wind, windMax), удар отменяется, если цель умерла
  replan:.5},                              // как часто пересчитывать путь по тайлам
 tower:{baseLevel:11,lvMul:1.1,            // цифры ниже — для уровня 11, +10% за уровень
  p:{hp:3052,dmg:109,hit:.8,rng:7.5,r:24},
  k:{hp:4824,dmg:109,hit:1,rng:7,r:32,wakeAim:3.3,wakeShot:.7}},
 phys:{knockDamp:12,knockMinMass:10,deployPushMass:8,deployPush:90,pullMass:8}, // отбрасывание — скоростью с затуханием; толчок при высадке тяжёлых; вихрь тянет в полную силу юнитов до pullMass
 bridge:{hp:2000,down:20,stun:1},          // прочность моста, сколько секунд он лежит, оглушение упавших
 crater:{t:8,slow:.3,k:.7},                // воронка от больших взрывов: время, замедление, радиус как доля взрыва
 /* погода арен: правила боя по номеру арены. cyc — длительность дня и ночи; spd — множитель скорости наземных;
    crT, crSlow — время и замедление воронок; brHp — множитель прочности мостов; storm — молния раз в N секунд бьёт по центру поля */
 arenaRules:[{},{cyc:[40,50]},{},{spd:.92},{crT:14},{crSlow:.5,crT:12},{storm:22},{brHp:1.6}],
 /* день и ночь: day/night — длительность фаз (с), fade — переход; ночью враг виден, только если в свете или ближе near клеток.
    light — радиусы света (клетки); aff — бонус карт в «своё» время суток */
 cycle:{on:1,day:50,night:40,fade:3,near:2.5,light:{p:5,k:6,bld:2,boom:3,boomT:2},aff:{dmg:.25,spd:.15}},
 juice:{heavyHit:500,hitStop:.05,kingSlow:.5,slowScale:.25,shakeDecay:60}, // хит-стоп на ударах от heavyHit урона; замедление при падении короля
 music:{battle:{bpm:134,key:0},night:{bpm:118,key:-3},ot:{bpm:156,key:2},menu:{bpm:104,key:-5}},    // темп и сдвиг тональности (полутоны от ля минора)
 /* бот: think — пауза между решениями; react — задержка реакции на угрозу; mist — доля ошибок;
    el — множитель эликсира; thp — HP его башен (по просьбе игрока у всех 1 — башни равные); lvOff — сдвиг уровня карт; countEl — считает эликсир соперника;
    acc — разброс позиции (точки); spell — готовность к заклинаниям; push — эликсир для атаки; abil — активность способностей */
 bot:{levels:{
  novice:{n:'Новичок',think:1.6,react:1.5,mist:.25,el:.8,thp:1,lvOff:-2,acc:20,spell:.35,push:10,abil:.3},
  easy:{n:'Лёгкий',think:1.2,react:1.1,mist:.15,el:.9,thp:1,lvOff:-1,acc:16,spell:.55,push:9.5,abil:.5},
  normal:{n:'Средний',think:.9,react:.8,mist:.07,el:1,thp:1,lvOff:0,acc:12,spell:.75,push:9,abil:.7},
  hard:{n:'Сложный',think:.6,react:.5,mist:.02,el:1,thp:1,lvOff:1,acc:8,spell:.95,push:8.5,abil:.9},
  expert:{n:'Эксперт',think:.4,react:.4,mist:0,el:1.1,thp:1,lvOff:1,acc:5,spell:1,push:8,abil:1,countEl:1}},
  byArena:['novice','easy','easy','normal','normal','hard','hard','expert'], // уровень бота по арене игрока
  leakAt:10},                              // на полном эликсире бот обязан что-то сыграть
 /* режимы: elStart — стартовый эликсир; phases — [с какой секунды, множитель]; ot — то же в овертайме;
    sudden — первая сломанная башня решает весь бой */
 modes:{
  normal:{elStart:5,phases:[[0,1],[120,2]],ot:[[0,2],[60,3]]},
  draft:{elStart:5,phases:[[0,1],[120,2]],ot:[[0,2],[60,3]]},
  double:{elStart:0,phases:[[0,2]],ot:[[0,2],[60,3]]},
  triple:{elStart:0,phases:[[0,3]],ot:[[0,3]]},
  midnight:{elStart:5,phases:[[0,1],[120,2]],ot:[[0,2],[60,3]],night:1},          // «Полночь»: весь бой — ночь
  sudden:{elStart:0,phases:[[0,2],[120,3]],ot:[[0,3]],sudden:1},
  tutor:{elStart:7,phases:[[0,1.5]],ot:[[0,2]],cycle:0}},             // обучение: ускоренный эликсир
 tutor:{battles:3,thp:[.2,.3,.4],bot:'novice',gold:50}
};
/* ================= ДАННЫЕ И ОБЩЕЕ ================= */
const TILE=CFG.arena.tile,W=CFG.arena.tilesW*TILE,H=CFG.arena.tilesH*TILE,RY=H/2,RIV=CFG.arena.river*TILE/2,BR=[3.5*TILE,W-3.5*TILE];
const $=s=>document.querySelector(s);
/* случайность боя — только через RNG: в бою это генератор с seed (повторы и тесты), вне боя — Math.random.
   Оформление и меню берут rndV/pickV/shuffleV, чтобы не сбивать поток боя */
function mul(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let RNG=Math.random;
const rndV=(a,b)=>a+Math.random()*(b-a),pickV=a=>a[Math.random()*a.length|0],shuffleV=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
/* математика симуляции одинакова в любом браузере: Math.hypot/sin/cos/exp/pow в V8 и JavaScriptCore могут отличаться на последний бит,
   а для игры по сети (одна симуляция у двух игроков) любое расхождение накапливается. Здесь только + − × ÷ и sqrt, они точны по стандарту */
const hy=(a,b)=>Math.sqrt(a*a+b*b);
const PI2=6.283185307179586,dsin=x=>{x=x-PI2*Math.floor(x/PI2+.5);const x2=x*x;return x*(1+x2*(-1/6+x2*(1/120+x2*(-1/5040+x2*(1/362880+x2*(-1/39916800+x2*(1/6227020800)))))))},dcos=x=>dsin(x+1.5707963267948966);
const rnd=(a,b)=>a+RNG()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>hy(a.x-b.x,a.y-b.y);
const pickR=a=>a[RNG()*a.length|0],shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=RNG()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const REDUCE=matchMedia('(prefers-reduced-motion:reduce)').matches;
/* настройки игрока: громкость звуков и музыки (0–1), тряска, эффекты, режим отладки */
const SET=Object.assign({sfx:.8,music:.5,shake:'full',fx:'full',debug:false},store.get('ac.set',{}));
const saveSet=()=>store.set('ac.set',SET);
const SHAKE_K={full:1,low:.4,off:0};
/* плавность: бой идёт тиками 30 Гц, а кадры чаще — позиция рисуется между прошлым и текущим тиком */
let ALPHA=1;
const IX=o=>o.px==null?o.x:o.px+(o.x-o.px)*ALPHA,IY=o=>o.py==null?o.y:o.py+(o.y-o.py)*ALPHA;
const TEAM=[{m:'#3da5ff',d:'#1b5ca3',l:'#a6d6ff'},{m:'#ff5c4d',d:'#9e2a20',l:'#ffb8ae'}];
/* скорость в точках арены в секунду (клетка = 20 точек) */
const SPD=Object.fromEntries(['slow','med','fast','vfast'].map(k=>[k,CFG.speed[k]/CFG.speed.tile*TILE]));
const SPDN={slow:'Медленная',med:'Средняя',fast:'Быстрая',vfast:'Очень быстрая'};
const TGN={g:'Наземные',ga:'Земля и воздух',b:'Только строения'};
const RAR={common:{n:'Обычная',c:'#9fb4d8'},rare:{n:'Редкая',c:'#ffa63d'},epic:{n:'Эпическая',c:'#c77dff'},legendary:{n:'Легендарная',c:'#5ef2d0'},champion:{n:'Чемпион',c:'#ffd84d'}};
const RAR_ORDER=['common','rare','epic','legendary','champion'];
/* Числа карт и башен заданы для уровня 11 (CFG.tower.baseLevel); каждый уровень ±10% к здоровью и урону */
const LV=(base,lvl)=>Math.round(base*Math.pow(CFG.tower.lvMul,(lvl||1)-CFG.tower.baseLevel));
const START_LV={common:1,rare:3,epic:6,legendary:9,champion:11};

/* Карты. rng, splash, rad — в клетках. tg: g — земля, ga — земля и воздух, b — только строения */
const CARDS={
 guard:{n:'Страж',rar:'common',type:'troop',cost:3,hp:1755,dmg:198,hit:1.2,rng:.8,spd:'med',tg:'g',r:9,tip:'Надёжный боец ближнего боя. Держит удар и дёшево закрывает дыры в обороне.'},
 shooters:{n:'Стрелки',rar:'common',type:'troop',cost:3,count:2,hp:290,dmg:100,hit:1,rng:5,spd:'med',tg:'ga',r:7,proj:'arrow',tip:'Двое стреляют издалека, в том числе по воздуху.'},
 bones:{aff:'night',n:'Костяшки',rar:'common',type:'troop',cost:1,count:3,hp:84,dmg:84,hit:1,rng:.5,spd:'fast',tg:'g',r:5,tip:'Три костяшки за один эликсир. Отвлекают тяжёлых и рвут одиночек.'},
 imps:{n:'Шныри',rar:'common',type:'troop',cost:2,count:3,hp:206,dmg:122,hit:1.1,rng:.5,spd:'vfast',tg:'g',r:6,tip:'Очень быстрые. Если их не встретить, сносят башню за секунды.'},
 slingers:{n:'Пращники',rar:'common',type:'troop',cost:2,count:3,hp:118,dmg:78,hit:1.6,rng:5,spd:'vfast',tg:'ga',r:6,proj:'stone',tip:'Три стрелка с пращами. Дёшево сбивают летунов.'},
 bomber:{aff:'night',n:'Бомбардир',rar:'common',type:'troop',cost:2,hp:320,dmg:195,hit:1.9,rng:4.5,spd:'med',tg:'g',r:7,proj:'bomb',splash:1.5,tip:'Бомбы по площади. Против стай на земле, но не достаёт воздух.'},
 cannon:{n:'Пушка',rar:'common',type:'building',cost:3,hp:950,dmg:214,hit:.9,rng:5.5,tg:'g',r:13,life:35,proj:'ball',tip:'Строение на 35 секунд. Поставь в центр — и любители строений свернут к ней.'},
 volley:{n:'Залп',rar:'common',type:'spell',cost:3,rad:3.5,dmg:366,tdmg:95,waves:3,tip:'Три волны стрел по большой площади. Чистит стаи.'},
 spark:{n:'Искра',rar:'common',type:'spell',cost:2,rad:2.5,dmg:260,tdmg:78,stun:.7,tip:'Мгновенный разряд: оглушает на полсекунды и сбивает разгон.'},
 bats:{n:'Нетопыри',rar:'common',type:'troop',cost:2,count:4,hp:84,dmg:84,hit:1.1,rng:.5,spd:'vfast',fly:1,tg:'ga',r:5,tip:'Четыре летучие твари. Хрупкие, но больно кусают.'},
 militia:{n:'Дружина',rar:'common',type:'troop',cost:5,count:4,hp:717,dmg:198,hit:1.4,rng:.8,spd:'med',tg:'g',r:8,tip:'Четверо крепких бойцов. Перемалывают танков, боятся урона по площади.'},
 wisp:{aff:'night',n:'Огонёк',rar:'common',type:'troop',cost:1,hp:229,dmg:214,hit:1,rng:2,spd:'vfast',tg:'ga',r:6,kami:1,splash:2.3,tip:'Прыгает на врага и взрывается по площади. Один эликсир.'},
 giant:{n:'Великан',rar:'rare',type:'troop',cost:5,hp:4400,dmg:270,hit:1.5,rng:1,spd:'slow',tg:'b',r:15,mass:18,tip:'Идёт только на строения и держит всё. Нужна поддержка сзади.'},
 crossbow:{n:'Арбалетчица',rar:'rare',type:'troop',cost:4,hp:700,dmg:185,hit:1.1,rng:6,spd:'med',tg:'ga',r:8,proj:'bolt',tip:'Сильный одиночный стрелок с большой дальностью.'},
 axe:{n:'Секира',rar:'rare',type:'troop',cost:4,hp:1908,dmg:267,hit:1.5,rng:1,spd:'med',tg:'g',r:9,spin:1,splash:2,tip:'Крутит топор вокруг себя: гроза стай на земле.'},
 fireball:{n:'Огненный шар',rar:'rare',type:'spell',cost:4,rad:2.5,dmg:730,tdmg:220,knock:16,tip:'Большой урон по площади и отбрасывание лёгких.'},
 hammer:{n:'Молотобоец',rar:'rare',type:'troop',cost:4,hp:1300,dmg:640,hit:1.7,rng:.8,spd:'fast',tg:'g',r:9,tip:'Огромный урон по одной цели. Ломает танков.'},
 ram:{n:'Тачка-таран',rar:'rare',type:'troop',cost:4,hp:1679,dmg:320,hit:1.6,rng:.8,spd:'vfast',tg:'b',r:11,mass:10,jump:1,tip:'Очень быстро катится к строениям и перепрыгивает реку. Главная угроза для башен.'},
 lair:{n:'Логово',rar:'rare',type:'building',cost:3,hp:794,tg:'g',r:14,life:30,spawn:{id:'bones',every:3.5,n:1},dspawn:{id:'bones',n:3},tip:'Выпускает костяшек, пока стоит, и ещё троих, когда рушится.'},
 sorcerer:{aff:'day',n:'Чародей',rar:'rare',type:'troop',cost:5,hp:690,dmg:250,hit:1.45,rng:5.5,spd:'med',tg:'ga',r:8,proj:'orb',splash:1.5,tip:'Огненные шары по площади, достаёт воздух. Хрупкий.'},
 drake:{n:'Дракончик',rar:'epic',type:'troop',cost:4,hp:1020,dmg:150,hit:1.5,rng:3.5,spd:'fast',fly:1,tg:'ga',r:10,proj:'flame',splash:1.5,tip:'Летит над рекой и дышит огнём по площади.'},
 freeze:{n:'Заморозка',rar:'epic',type:'spell',cost:4,rad:3,dmg:114,tdmg:38,freeze:4,tip:'Всё вражеское в круге замирает на 4 секунды, даже башни.'},
 cry:{n:'Боевой клич',rar:'epic',type:'spell',cost:2,rad:4.5,rage:10.5,tip:'Свои в круге на 10,5 секунды двигаются и бьют на 35% быстрее.'},
 vortex:{n:'Вихрь',rar:'epic',type:'spell',cost:3,rad:5.5,dmg:160,tdmg:50,pull:1.1,pullSpd:150,tip:'Затягивает всех врагов к центру и слегка ранит. Сбивает в кучу под удар и задевает королевскую башню — она проснётся.'},
 spring:{n:'Родник',rar:'rare',type:'building',cost:6,hp:1070,tg:'g',r:13,life:70,elx:{every:9,n:1},noStart:1,tip:'Добывает эликсир: +1 каждые 9 секунд, пока стоит. Окупается, если его не сломают. Не бывает в стартовой руке.'},
 raider:{aff:'night',n:'Налётчица',rar:'legendary',type:'troop',cost:3,hp:906,dmg:193,hit:1,rng:.75,spd:'fast',tg:'g',r:8,dash:{min:3.5,max:6,spd:500,mul:2},tip:'Рывком сокращает дистанцию до цели в 3,5–6 клеток. Во время рывка неуязвима, первый удар — двойной.'},
 mend:{n:'Целебный звон',rar:'rare',type:'spell',cost:2,rad:3,heal:540,healT:2,tip:'Две секунды лечит своих бойцов в круге. Спасает пуш, который вот-вот развалится.'},
 sapper:{n:'Подрыв',rar:'epic',type:'spell',cost:2,rad:2,dmg:250,tdmg:80,bdmg:2000,crater:1,tip:'Взрыв обрушивает мост, если попасть по нему: 20 с наземные идут через другой. Юниты на мосту падают на берег и оглушены. По юнитам — 150 урона.'},
 shadowblade:{aff:'night',n:'Тень',rar:'epic',type:'troop',cost:3,hp:690,dmg:230,hit:1,rng:.7,spd:'fast',tg:'g',r:7,stealth:1,tip:'Ночью её видно, только вблизи 2,5 клеток: свет не помогает. Днём обычная ловкая убийца.'},
 priest:{aff:'day',n:'Страж рассвета',rar:'rare',type:'troop',cost:4,hp:900,dmg:150,hit:1.2,rng:5,spd:'med',tg:'ga',r:8,proj:'orb',light:4,tip:'Дальний боец с собственным светом на 4 клетки. Днём бьёт сильнее; ночью освещает стрелков и открывает врагов.'},
 eclipse:{n:'Затмение',rar:'legendary',type:'spell',cost:3,rad:0,force:{k:1,t:14},tip:'14 секунд — ночь для всех, где бы ты ни был. Ночные карты и Тени сильнее, дневные слабее, дальний бой слепнет.'},
 dawn:{n:'Рассвет',rar:'epic',type:'spell',cost:2,rad:0,force:{k:0,t:12},tip:'12 секунд — день для всех. Ночь отменяется, дальний бой снова видит поле, дневные карты сильнее.'},
 torchman:{n:'Факелоносец',rar:'common',type:'troop',cost:2,hp:720,dmg:145,hit:1.1,rng:.7,spd:'fast',tg:'g',r:7,light:3.5,tip:'Несёт факел: свет 3,5 клетки вокруг себя. Ночью — глаза для твоих стрелков и башен.'},
 lantern:{n:'Фонарь',rar:'common',type:'building',cost:1,hp:520,tg:'g',r:10,life:55,light:6,tip:'Свет 6 клеток на 55 с. Сам не бьёт, но ночью открывает врагов у моста и притягивает «только здания».'},
 flash:{n:'Вспышка',rar:'rare',type:'spell',cost:1,rad:2.5,dmg:96,tdmg:29,blind:1,flash:{light:5,t:6},tip:'Яркий свет на 5 клеток на 6 с; враги в центре (2,5 клетки) обожжены и ослеплены: 1 с не двигаются и не атакуют.'},
 shade:{n:'Сумрак',rar:'epic',type:'spell',cost:2,rad:4,shade:8,tip:'8 с внутри круга не действует никакой свет — даже днём. Враг видит там только тех, кто ближе 2,5 клетки. Укрой стрелков у вражеской башни.'},
 roller:{n:'Каток',rar:'legendary',type:'spell',cost:2,rad:2,dmg:340,tdmg:70,roll:{len:10,spd:220},knock:28,tip:'Бревно катится вперёд на 10 клеток: бьёт и отталкивает наземных врагов, задевает башни. Летающих не трогает.'},
 shieldman:{aff:'day',n:'Щитоносец',rar:'rare',type:'troop',cost:3,hp:850,shield:560,dmg:180,hit:1.1,rng:.8,spd:'med',tg:'g',r:9,tip:'Щит принимает урон первым. Пока щит цел, отбрасывание и оглушение ему не страшны.'},
 mortar:{n:'Мортира',rar:'common',type:'building',cost:4,hp:1600,dmg:290,hit:4,rng:11.5,minRng:3.5,splash:1,tg:'g',r:13,life:30,siege:1,tip:'Бьёт навесом на 11,5 клетки по площади, достаёт башни. Вблизи (3,5 клетки) стрелять не может.'},
 grave:{aff:'night',n:'Погост',rar:'legendary',type:'spell',cost:5,rad:4,grave:{t:9.5,n:15,id:'bones',td:.8},tip:'9,5 с поднимает скелетов в круге: всего 15, по башням они бьют на 25% слабее. Против башни, которую некому защищать, — смертельно.'},
 scorch:{n:'Жаровщица',rar:'epic',type:'troop',cost:4,hp:950,dmg:40,hit:.4,rng:4,spd:'med',tg:'ga',r:8,beam:{dmg:[40,110,360],t:[2,2]},tip:'Луч жара: чем дольше держит цель, тем сильнее жжёт. Оглушение и смена цели сбрасывают разогрев.'},
 poison:{n:'Ядовитое облако',rar:'epic',type:'spell',cost:4,rad:3.5,dmg:680,tdmg:190,poison:8,tip:'Облако на 8 секунд: медленно жжёт и замедляет всё внутри.'},
 legion:{n:'Легион костей',rar:'epic',type:'troop',cost:3,count:11,unit:'bones',hp:84,dmg:84,hit:1,rng:.5,spd:'fast',tg:'g',r:5,tip:'Одиннадцать костяшек. Сносят любого одиночку, если нет урона по площади.'},
 knightrider:{aff:'day',n:'Витязь',rar:'epic',type:'troop',cost:5,hp:1908,dmg:389,hit:1.4,rng:1,spd:'med',tg:'g',r:12,mass:9,charge:1,tip:'Разгоняется на прямой: вдвое быстрее и первый удар вдвое сильнее.'},
 airship:{n:'Дирижабль',rar:'epic',type:'troop',cost:5,hp:1297,dmg:488,hit:2,rng:.5,spd:'med',fly:1,tg:'b',r:13,mass:8,death:{dmg:275,r:2},tip:'Летит к строениям и сбрасывает бомбы. При падении взрывается.'},
 colossus:{n:'Колосс',rar:'epic',type:'troop',cost:8,hp:5112,dmg:313,hit:2.5,rng:.8,spd:'slow',tg:'b',r:18,mass:30,dep:3,death:{dmg:313,r:2},dspawn:{id:'pebble',n:2},tip:'Каменная гора на строения. Падая, распадается на два камешка.'},
 pebble:{n:'Камешек',token:1,rar:'epic',type:'troop',cost:0,hp:1038,dmg:64,hit:2.5,rng:.8,spd:'med',tg:'b',r:10,mass:8,death:{dmg:107,r:1.5}},
 frostsage:{aff:'day',n:'Морозный мудрец',rar:'legendary',type:'troop',cost:3,hp:760,dmg:120,hit:1.7,rng:5.5,spd:'med',tg:'ga',r:8,proj:'ice',splash:1.5,slow:{f:.3,t:2.5},tip:'Слабый урон, зато замедляет всех, в кого попадает.'},
 thunder:{aff:'day',n:'Громовержец',rar:'legendary',type:'troop',cost:4,hp:640,dmg:150,hit:1.9,rng:5,spd:'med',tg:'ga',r:8,chain:2,stun:.5,zap:110,tip:'Бьёт молнией сразу двоих и оглушает. При выходе бьёт разрядом вокруг.'},
 mole:{aff:'night',n:'Крот',rar:'legendary',type:'troop',cost:3,hp:1300,dmg:215,hit:1.2,rng:.8,spd:'fast',tg:'g',r:9,tunnel:1,td:.5,tip:'Роет ход и вылезает где угодно, даже у вражеской башни. По башням бьёт слабо.'},
 warlord:{n:'Вожак',rar:'champion',type:'troop',cost:4,hp:2289,dmg:244,hit:1.2,rng:1,spd:'med',tg:'g',r:11,mass:10,spin:1,splash:1.2,ability:{k:'horn',n:'Боевой рог',cost:2,cd:14,shield:763,rage:4,r:4},tip:'Чемпион. Способность «Боевой рог»: щит и ярость себе и соседям на 4 секунды.'}
};
const CARD_IDS=Object.keys(CARDS).filter(k=>!CARDS[k].token);
const TOWER=CFG.tower;
/* башенные бойцы: кто стреляет с башен принцесс */
const TT={archer:{n:'Лучница',d:'Ровная стрельба по земле и воздуху. Надёжный выбор.',hp:1,dmg:1,hit:1,pk:'tower'},
 cannoneer:{n:'Пушкарь',d:'Тяжёлые ядра: урон ×2,2, но стреляет вдвое реже, а башня чуть слабее.',hp:.92,dmg:2.2,hit:2.1,pk:'tball'},
 dagger:{n:'Метательница',d:'Очередь из шести кинжалов, затем перезарядка. Сильна против быстрых атак.',hp:.95,dmg:.62,hit:.3,mag:6,reload:2.6,pk:'dagger'}};
/* эволюции: стоят в первом слоте колоды; первый розыгрыш и каждый (cyc+1)-й выходит усиленным */
const EVO={guard:{cyc:2,d:'Выходит со щитом на 687 здоровья',shield:687},
 shooters:{cyc:2,d:'Дальность +1,5 клетки, урон +25%',rng:1.5,dmg:1.25},
 bones:{cyc:2,d:'Шесть костяшек вместо трёх',count:6},
 bomber:{cyc:2,d:'Бомба крупнее: радиус +1 клетка, урон +20%',splash:1,dmg:1.2},
 cannon:{cyc:2,d:'Стоит 45 секунд, здоровье +30%',life:45,hp:1.3},
 militia:{cyc:1,d:'Здоровье +25%, бьют на 15% чаще',hp:1.25,hit:.85}};
/* герои: золотой второй слот, способность по кнопке; делят место с чемпионом */
const HERO={guard:{d:'«Вызов»: враги рядом бьют только его, а он получает щит',ability:{k:'taunt',n:'Вызов',cost:2,cd:15,shield:794,r:5,t:3}},
 giant:{d:'«Топот»: удар по земле оглушает и отбрасывает всех вокруг',ability:{k:'stomp',n:'Топот',cost:2,cd:14,dmg:336,r:3,stun:1.5}},
 hammer:{d:'«Ярость»: щит и ускорение на 5 секунд',ability:{k:'fury',n:'Ярость',cost:1,cd:12,rage:5,shield:382}}};
function evoCard(k){const e=EVO[k],c=Object.assign({},CARDS[k],{evo:1});if(e.rng)c.rng+=e.rng;if(e.dmg)c.dmg=Math.round(c.dmg*e.dmg);if(e.splash)c.splash=(c.splash||0)+e.splash;
 if(e.hp)c.hp=Math.round(c.hp*e.hp);if(e.hit)c.hit*=e.hit;if(e.life)c.life=e.life;if(e.count)c.count=e.count;return c}
function heroCard(k){return Object.assign({},CARDS[k],{hp:Math.round(CARDS[k].hp*1.15),ability:HERO[k].ability,hero:1})}

/* роли карт для бота и подсказок */
const ROLE={};
for(const k of Object.keys(CARDS)){const c=CARDS[k];ROLE[k]={
 spell:c.type==='spell',bld:c.type==='building',win:c.tg==='b'||c.tunnel===1||!!c.grave,tank:(c.hp||0)*(c.count||1)>=1100&&c.type==='troop',
 swarm:(c.count||1)>=3,splash:!!(c.splash||c.spin),aa:c.tg==='ga'||(c.type==='building'&&c.tg==='ga'),air:!!c.fly,ranged:(c.rng||0)>=3,eco:!!c.elx,heal:!!c.heal,
 dps:c.type==='troop'&&c.dmg?c.dmg*(c.count||1)/c.hit:0}}

const DEF_DECK=['giant','crossbow','axe','bones','imps','fireball','volley','cannon'];
const BOT_DECKS=[
 ['colossus','sorcerer','drake','bones','spark','imps','hammer','poison'],
 ['ram','wisp','bones','spark','cannon','crossbow','imps','fireball'],
 ['airship','freeze','militia','slingers','bats','volley','guard','axe'],
 ['knightrider','ram','thunder','bats','slingers','fireball','guard','lair'],
 ['mole','poison','frostsage','hammer','slingers','bats','cannon','wisp'],
 ['giant','shooters','bomber','hammer','fireball','spark','bats','lair'],
 ['warlord','axe','crossbow','wisp','bones','spark','ram','cry'],
 ['giant','sorcerer','legion','frostsage','volley','imps','fireball','cannon']];
const BOT_NAMES=['Ржавый Шлем','Барон Пепел','Кузнец Гром','Тётя Буря','Сэр Носок','Лорд Ватрушка','Капитан Сухарь','Граф Сквозняк','Дед Мороз-Младший','Мадам Кочерга'];
const EMOTES=['Привет!','Хорошо сыграно','Ой-ой!','Ха-ха-ха!','Грр!','Спасибо'];

/* ================= ЗВУК ================= */
/* какие файлы играет каждое событие (варианты выбираются случайно; у «tower» звучат все сразу) и их громкость */
const SFX={hit:['hit1','hit2','hit3'],shot:['shot'],boom:['boom'],tower:['tower','boom'],dep:['dep'],pop:['pop'],wake:['wake'],freeze:['freeze'],chest:['chest'],ui:['ui'],deny:['deny'],emote:['emote'],charge:['swing']};
const SFX_VOL={hit:.45,shot:.35,boom:.9,tower:1,dep:.6,pop:.35,wake:.7,freeze:.7,chest:.8,ui:.5,deny:.6,emote:.6,charge:.5};
const AU={c:null,mute:!!store.get('ac.mute',false),nb:null,last:{},
 init(){if(!this.c){try{this.c=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}if(this.c)this.loadFiles()}if(this.c&&this.c.state==='suspended')this.c.resume()},
 /* звуки из файлов (CC0, assets/s); пока файл не загружен или не декодирован — синтез ниже */
 buf:{},
 loadFiles(){const names=[...new Set(Object.values(SFX).flat())];
  for(const n of names){const get=window.AC_SITE?fetch('assets/s/'+n+'.mp3').then(r=>r.ok?r.arrayBuffer():null):(typeof payload==='function'?payload('s_'+n).then(b=>{const s=atob(b),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a.buffer}):Promise.resolve(null));
   get.then(ab=>ab&&new Promise((ok,no)=>this.c.decodeAudioData(ab,ok,no))).then(b=>{if(b)this.buf[n]=b}).catch(()=>{})}},
 file(n,v){const b=this.buf[n];if(!b)return false;const c=this.c,s=c.createBufferSource(),g=c.createGain();s.buffer=b;s.playbackRate.value=.93+Math.random()*.14;g.gain.value=(v||.8)*SET.sfx;s.connect(g);g.connect(c.destination);s.start();return true},
 t(f,d,type,v,sl,dl){if(!this.c||this.mute||!SET.sfx)return;v=(v||.1)*SET.sfx;const c=this.c,t0=c.currentTime+(dl||0),o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t0);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+sl),t0+d);g.gain.setValueAtTime(v||.1,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+d);o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+d+.02)},
 n(d,v,fc,dl){if(!this.c||this.mute||!SET.sfx)return;v=(v||.1)*SET.sfx;const c=this.c;if(!this.nb){this.nb=c.createBuffer(1,c.sampleRate,c.sampleRate);const a=this.nb.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
  const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),t0=c.currentTime+(dl||0);s.buffer=this.nb;s.loop=true;f.type='lowpass';f.frequency.value=fc||800;g.gain.setValueAtTime(v||.1,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+d);s.connect(f);f.connect(g);g.connect(c.destination);s.start(t0);s.stop(t0+d+.02)},
 sfx(k){const now=performance.now(),gap={hit:60,shot:80,zap:80}[k]||30;if(this.last[k]&&now-this.last[k]<gap)return;this.last[k]=now;
  if(this.c&&!this.mute&&SET.sfx&&SFX[k]){const f=SFX[k],all=k==='tower';let ok=false;for(const n of all?f:[f[Math.random()*f.length|0]])ok=this.file(n,SFX_VOL[k])||ok;if(ok)return}
  switch(k){
   case 'dep':this.t(260,.14,'triangle',.1,260);this.n(.12,.05,2000);break;
   case 'hit':this.t(420+Math.random()*120,.05,'triangle',.035);break;
   case 'shot':this.t(780,.05,'square',.02,-300);break;
   case 'boom':this.n(.5,.2,700);this.t(90,.4,'sine',.22,-50);break;
   case 'zap':this.n(.15,.08,5000);this.t(1400,.12,'sawtooth',.03,-900);break;
   case 'freeze':this.n(.6,.06,6000);this.t(1700,.5,'sine',.04,-1100);break;
   case 'rage':this.t(200,.4,'sawtooth',.06,180);this.t(300,.4,'square',.03,240,.05);break;
   case 'poison':this.n(.8,.05,900);this.t(160,.6,'sine',.05,-60);break;
   case 'tower':this.n(.8,.28,500);this.t(70,.8,'sawtooth',.16,-35);break;
   case 'charge':this.t(300,.25,'sawtooth',.04,400);break;
   case 'ability':[392,523,659].forEach((f,i)=>this.t(f,.22,'square',.05,0,i*.06));break;
   case 'emote':this.t(880,.07,'triangle',.05);this.t(1100,.09,'triangle',.04,0,.06);break;
   case 'deny':this.t(130,.1,'square',.05);break;
   case 'win':[523,659,784,1046].forEach((f,i)=>this.t(f,.28,'triangle',.1,0,i*.11));break;
   case 'lose':[392,330,262,196].forEach((f,i)=>this.t(f,.34,'triangle',.1,0,i*.15));break;
   case 'ui':this.t(600,.06,'triangle',.06);break;
   case 'wake':this.t(220,.3,'triangle',.08,120);break;
   case 'tick':this.t(1200,.05,'square',.03);break;
   case 'phase':[440,554,659].forEach((f,i)=>this.t(f,.18,'triangle',.07,0,i*.08));break;
   case 'eclipse':this.t(110,1.4,'sawtooth',.09,-50);this.t(55,1.6,'sine',.14,-20);this.n(1.2,.05,300);this.t(330,1.2,'triangle',.03,-120,.1);break;
   case 'dawn':[523,659,784,988,1318].forEach((f,i)=>this.t(f,.5,'triangle',.06,0,i*.09));this.n(.6,.03,7000,.1);break;
   case 'flash':this.n(.2,.12,9000);this.t(1800,.28,'sine',.07,-600);this.t(2600,.2,'triangle',.03,-900,.03);break;
   case 'grave':this.t(70,.7,'sawtooth',.09,-20);this.n(.5,.08,350);[300,240,190].forEach((f,i)=>this.t(f,.1,'square',.025,-60,.15+i*.1));break;
   case 'bridge':this.n(.7,.3,600);this.t(80,.5,'sine',.2,-40);for(let i=0;i<5;i++)this.t(200+Math.random()*300,.06,'square',.04,-100,.05+i*.07);this.n(.5,.1,4000,.2);break;
   case 'shade':this.t(240,.8,'sine',.06,-150);this.n(.7,.04,900);break;
   case 'crown':[659,784,988,1318].forEach((f,i)=>this.t(f,.22,'triangle',.08,0,i*.07));break;
   case 'crownLose':this.t(180,.5,'sawtooth',.06,-80);this.t(120,.6,'triangle',.08,-40,.1);break;
   case 'pop':this.t(520+Math.random()*200,.07,'sine',.04,-300);break;
   case 'chest':this.n(.25,.12,1200);this.t(150,.25,'triangle',.1,60);break}}};
/* музыка без файлов, боевая: прямая бочка, хлопки, хэты шестнадцатыми, качающий бас восьмыми,
   арпеджио и «мощные» аккорды. Гармония ля минор: Am – F – C – G. Овертайм быстрее и выше, меню легче.
   Планировщик ставит ноты на 0,3 с вперёд */
const MUS={theme:null,step:0,next:0,timer:null,g:null,
 PROG:[[0,3,7],[-4,0,3],[3,7,10],[-2,2,5]],
 ARP:[0,1,2,1,2,1,0,2,0,1,2,2,1,2,0,1],
 play(th){if(this.theme===th)return;this.theme=th;AU.init();const c=AU.c;if(!c)return;
  if(!this.g){this.g=c.createGain();const comp=c.createDynamicsCompressor();this.g.connect(comp);comp.connect(c.destination)}this.vol();
  this.step=0;this.next=c.currentTime+.1;if(!this.timer)this.timer=setInterval(()=>this.tick(),90)},
 stop(){this.theme=null;if(this.timer){clearInterval(this.timer);this.timer=null}},
 vol(){if(this.g)this.g.gain.value=AU.mute?0:SET.music*.32},
 note(f,t,d,type,v,cut){const c=AU.c,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;let out=o;
  if(cut){const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(cut*2.5,t);fl.frequency.exponentialRampToValueAtTime(cut,t+d*.6);o.connect(fl);out=fl}
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+d);out.connect(g);g.connect(this.g);o.start(t);o.stop(t+d+.02)},
 noise(t,d,v,type,f){const c=AU.c;if(!AU.nb)AU.nb=(()=>{const b=c.createBuffer(1,c.sampleRate,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;return b})();
  const s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();s.buffer=AU.nb;fl.type=type;fl.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(fl);fl.connect(g);g.connect(this.g);s.start(t,Math.random()*.5);s.stop(t+d+.02)},
 kick(t){const c=AU.c,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);
  g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.0001,t+.28);o.connect(g);g.connect(this.g);o.start(t);o.stop(t+.3)},
 tick(){const c=AU.c,th=this.theme,T=CFG.music[th];if(!c||!T)return;const s16=60/T.bpm/4,hz=n=>110*Math.pow(2,(n+T.key)/12),menu=th==='menu',ot=th==='ot';
  while(this.next<c.currentTime+.3){const st=this.step++,t=this.next,b=st%16,bar=(st>>4)%4,ch=this.PROG[bar],root=ch[0],big=(st>>6)%2;
   // ударные
   if(menu?b%8===0:b%4===0)this.kick(t);
   if(!menu&&ot&&b===14)this.kick(t);
   if(b%8===4){this.noise(t,.16,menu?.18:.32,'bandpass',1800);this.noise(t+.012,.1,menu?.1:.2,'highpass',3000)}
   if(ot||(!menu&&b%2===0)||(menu&&b%4===2))this.noise(t,b%4===2?.09:.035,b%4===2?.09:.05,'highpass',8000);
   // бас: восьмые, «качает» октавой
   if(b%2===0)this.note(hz(root-12+(b%4===2&&!menu?12:0)),t,s16*1.8,'sawtooth',menu?.16:.24,menu?500:700);
   // мощный аккорд на сильную долю такта и перед сменой
   if(!menu&&(b===0||b===10))for(const n of[root,root+7,root+12])this.note(hz(n),t,s16*(b===0?6:3),'sawtooth',.05,1800);
   // арпеджио шестнадцатыми (в меню — восьмыми), во второй половине куплета на октаву выше
   if(!menu||b%2===0){const n=ch[this.ARP[b]]+24+(big&&!menu?12:0)+(ot?12:0);this.note(hz(n),t,s16*.9,menu?'triangle':'square',menu?.06:.045)}
   // разгон в конце каждых 4 тактов
   if(!menu&&bar===3&&b>=12)this.noise(t,s16,.04+.03*(b-12),'highpass',2000+600*(b-12));
   this.next+=s16}}};
/* ================= ПЕРСОНАЖИ (свои, без чужих рисунков). Начало координат у ног ================= */
const oc=(g,x,y,r,f,s,lw)=>{g.beginPath();g.arc(x,y,r,0,7);if(f){g.fillStyle=f;g.fill()}if(s){g.strokeStyle=s;g.lineWidth=lw||1;g.stroke()}};
const rr=(g,x,y,w,h,r,f)=>{g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=f;g.fill()};
const poly=(g,pts,f,s)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();if(f){g.fillStyle=f;g.fill()}if(s){g.strokeStyle=s;g.lineWidth=1;g.stroke()}};
const feet=(g,ph,c)=>{const a=Math.sin(ph)*1.6;g.fillStyle=c;g.beginPath();g.ellipse(-3,-1+a*.5,2.6,1.7,0,0,7);g.ellipse(3,-1-a*.5,2.6,1.7,0,0,7);g.fill()};
const CH={
 guard(g,T,ph,at){feet(g,ph,'#323a4b');
  poly(g,[[-11,-15],[-4,-15],[-4,-6],[-7.5,-1.5],[-11,-6]],T.m,'#eef2fa');
  rr(g,-5.5,-16,11,12,3,'#c3cde0');rr(g,-3,-15,6,10,2,T.m);
  oc(g,0,-19.5,5.4,'#d9e0ee','#8794ad');g.fillStyle='#202636';g.fillRect(-3.4,-20.4,6.8,1.9);
  g.beginPath();g.moveTo(-1,-24.5);g.quadraticCurveTo(5,-32,9,-23+Math.sin(ph*2));g.quadraticCurveTo(4,-25,1,-23);g.fillStyle=T.m;g.fill();
  g.save();g.translate(7,-11);g.rotate(-.8+at*2.4);g.fillStyle='#eef2fa';g.fillRect(-1,-15,2,15);g.fillStyle='#b8862b';g.fillRect(-3.5,-1,7,2);g.restore()},
 shooters(g,T,ph,at){feet(g,ph,'#4a3524');
  poly(g,[[-6,-3],[6,-3],[4,-15],[-4,-15]],T.m);rr(g,-1.5,-13,3,9,1,T.d);
  oc(g,0,-18,5,'#f0c9a0');g.beginPath();g.arc(0,-18.8,5.7,Math.PI,0);g.lineTo(5.7,-15);g.lineTo(-5.7,-15);g.closePath();g.fillStyle=T.d;g.fill();
  oc(g,-1.8,-17.6,.9,'#222');oc(g,1.8,-17.6,.9,'#222');
  g.strokeStyle='#7a4e22';g.lineWidth=1.6;g.beginPath();g.arc(8,-11,8,-1.2,1.2);g.stroke();
  g.strokeStyle='#ffffffcc';g.lineWidth=.6;g.beginPath();g.moveTo(8+Math.cos(-1.2)*8,-11+Math.sin(-1.2)*8);g.lineTo(8-at*5,-11);g.lineTo(8+Math.cos(1.2)*8,-11+Math.sin(1.2)*8);g.stroke();
  rr(g,-8,-13,3,9,1,'#6a4a28')},
 giant(g,T,ph,at){feet(g,ph,'#4b3a2a');
  rr(g,-9,-18,18,16,5,'#c98e5d');rr(g,-9,-8,18,4,1,T.m);rr(g,-2,-9,4,5,1,T.l);
  oc(g,0,-23,6,'#d9a173');oc(g,-2.2,-24,.9,'#222');oc(g,2.2,-24,.9,'#222');
  g.beginPath();g.arc(0,-20.5,5,.15,Math.PI-.15);g.fillStyle='#7a4a24';g.fill();
  const l=Math.sin(ph)*1.2;oc(g,-12,-9+l,5,'#d9a173','#9a6a3f');oc(g,12+at*4,-9-l-at*3,5.6,'#d9a173','#9a6a3f');
  g.fillStyle=T.d;g.fillRect(-9,-17,18,2.5)},
 imps(g,T,ph,at){feet(g,ph,'#31451f');
  rr(g,-4.5,-11,9,8,3,T.m);
  poly(g,[[-4,-17],[-11,-20],[-4,-14]],'#7ccd50');poly(g,[[4,-17],[11,-20],[4,-14]],'#7ccd50');
  oc(g,0,-16,5,'#7ccd50','#4d8f2f');oc(g,-1.9,-16.5,1.2,'#fff');oc(g,1.9,-16.5,1.2,'#fff');oc(g,-1.9,-16.5,.5,'#111');oc(g,1.9,-16.5,.5,'#111');
  g.fillStyle='#4d8f2f';g.fillRect(-2,-13.3,4,1);
  g.save();g.translate(5.5,-8);g.rotate(-.5+at*2);g.fillStyle='#dfe6ee';g.fillRect(-.8,-8,1.6,8);g.restore()},
 bones(g,T,ph,at){feet(g,ph,'#d8d3c4');
  g.strokeStyle='#efe9d6';g.lineWidth=1.3;for(let i=0;i<3;i++){g.beginPath();g.moveTo(-3.5,-10+i*2.6);g.lineTo(3.5,-10+i*2.6);g.stroke()}g.beginPath();g.moveTo(0,-12);g.lineTo(0,-4);g.stroke();
  oc(g,0,-15.5,4.8,'#f4efdf','#b9b29c');g.fillStyle='#222';g.beginPath();g.arc(-1.9,-16,1.3,0,7);g.arc(1.9,-16,1.3,0,7);g.fill();g.fillRect(-1.3,-12.5,2.6,1);
  rr(g,-8,-11,2.4,3,1,T.m);g.save();g.translate(6,-9);g.rotate(-.4+at*2);g.fillStyle='#efe9d6';g.fillRect(-.7,-7,1.4,7);g.restore()},
 slingers(g,T,ph,at){feet(g,ph,'#3d2b1a');
  poly(g,[[-5,-2],[5,-2],[3.5,-12],[-3.5,-12]],T.m);
  oc(g,0,-15,4.4,'#e9b98a');g.beginPath();g.arc(0,-15.6,4.8,Math.PI*1.05,-.05);g.fillStyle='#6b8f3a';g.fill();
  oc(g,-1.6,-14.8,.8,'#222');oc(g,1.6,-14.8,.8,'#222');
  const a=ph*3+at*8,sx=5+Math.cos(a)*6,sy=-14+Math.sin(a)*4;g.strokeStyle='#7a5a32';g.lineWidth=1;g.beginPath();g.moveTo(5,-10);g.lineTo(sx,sy);g.stroke();oc(g,sx,sy,1.6,'#8d8f96')},
 bomber(g,T,ph,at){feet(g,ph,'#3a2c20');
  rr(g,-5.5,-12,11,10,4,T.m);rr(g,-5.5,-8,11,2,0,T.d);
  oc(g,0,-16,5.2,'#e2b48a');rr(g,-5.6,-19,11.2,3.6,2,'#4a4f5c');oc(g,-2.6,-17.4,2,'#8fd0ff');oc(g,2.6,-17.4,2,'#8fd0ff');
  g.beginPath();g.arc(0,-19.4,5.8,Math.PI,0);g.fillStyle='#7b4a23';g.fill();
  const b=-5-at*8;oc(g,8,-11+b*.3,4.4,'#23262e','#555b6a');g.strokeStyle='#caa24a';g.lineWidth=1;g.beginPath();g.moveTo(8,-15.4+b*.3);g.quadraticCurveTo(10,-19,12,-18);g.stroke();oc(g,12,-18,1.3,Math.sin(ph*9)>0?'#ffe27a':'#ff8a2a')},
 bats(g,T,ph){const w=Math.sin(ph*4)*4;
  poly(g,[[-2,-10],[-11,-14-w],[-8,-8],[-12,-6+w*.3],[-3,-6]],'#4a3a66');poly(g,[[2,-10],[11,-14-w],[8,-8],[12,-6+w*.3],[3,-6]],'#4a3a66');
  g.beginPath();g.ellipse(0,-9,4,4.6,0,0,7);g.fillStyle='#5d4a80';g.fill();poly(g,[[-3,-12],[-2,-16],[-1,-12.5]],'#5d4a80');poly(g,[[3,-12],[2,-16],[1,-12.5]],'#5d4a80');
  oc(g,-1.5,-9.5,1,'#ffde59');oc(g,1.5,-9.5,1,'#ffde59');rr(g,-3,-6.4,6,1.6,1,T.m)},
 militia(g,T,ph,at){feet(g,ph,'#3a2a1c');
  rr(g,-6,-15,12,12,4,'#8a5a32');rr(g,-6,-9,12,3,1,T.m);
  oc(g,0,-19,5,'#e8b48a');g.beginPath();g.arc(0,-17,4.6,.2,Math.PI-.2);g.fillStyle='#b5651d';g.fill();
  g.beginPath();g.arc(0,-20.2,5.4,Math.PI,0);g.fillStyle='#9aa3b5';g.fill();g.fillRect(-.8,-20,1.6,4);
  oc(g,-8,-10,5.2,T.m,'#5a3a1a',1.5);oc(g,-8,-10,1.6,'#d8c070');
  g.save();g.translate(7,-10);g.rotate(-.7+at*2.2);g.fillStyle='#dfe6ee';g.fillRect(-1,-12,2,12);g.fillStyle='#6a4a28';g.fillRect(-2.5,-1,5,2);g.restore()},
 wisp(g,T,ph){const f=Math.sin(ph*5)*1.5;
  g.beginPath();g.moveTo(0,-22-f);g.bezierCurveTo(6,-16,8,-8,4,-3);g.bezierCurveTo(2,-1,-2,-1,-4,-3);g.bezierCurveTo(-8,-8,-6,-16,0,-22-f);g.fillStyle='#ff8a2a';g.fill();
  g.beginPath();g.moveTo(0,-17);g.bezierCurveTo(3,-13,4,-8,2,-5);g.lineTo(-2,-5);g.bezierCurveTo(-4,-8,-3,-13,0,-17);g.fillStyle='#ffe27a';g.fill();
  oc(g,-1.6,-10,1,'#3a1a00');oc(g,1.6,-10,1,'#3a1a00');oc(g,0,-3.5,2,T.m)},
 crossbow(g,T,ph,at){feet(g,ph,'#3d2a1a');
  poly(g,[[-6,-2],[6,-2],[4,-14],[-4,-14]],T.m);rr(g,-4,-9,8,2,1,T.d);
  oc(g,0,-17.5,4.8,'#f0c9a0');g.beginPath();g.arc(0,-18.4,5.2,Math.PI,0);g.fillStyle='#5a3220';g.fill();oc(g,0,-23.5,2.6,'#5a3220');
  oc(g,-1.7,-17.2,.8,'#222');oc(g,1.7,-17.2,.8,'#222');
  g.save();g.translate(6,-11);g.rotate(-.15);rr(g,-2,-1.2,12,2.4,1,'#6a4a28');g.strokeStyle='#3a3f4c';g.lineWidth=1.5;g.beginPath();g.moveTo(9,-5);g.quadraticCurveTo(7,0,9,5);g.stroke();g.strokeStyle='#ffffffaa';g.lineWidth=.6;g.beginPath();g.moveTo(9,-5);g.lineTo(5-at*3,0);g.lineTo(9,5);g.stroke();g.restore()},
 axe(g,T,ph,at){feet(g,ph,'#4a3a2a');
  poly(g,[[-8,-2],[8,-2],[5,-9],[-5,-9]],T.d);rr(g,-5,-16,10,9,3,'#d7dde8');rr(g,-3,-15,6,6,2,T.m);
  oc(g,0,-20,5,'#f2cfa8');g.beginPath();g.arc(0,-21,5.6,Math.PI,0);g.fillStyle='#e8c14a';g.fill();
  g.fillStyle='#e8c14a';g.fillRect(-5.6,-21,2.2,9);g.fillRect(3.4,-21,2.2,9);
  poly(g,[[-5,-25],[-13,-30],[-6,-22]],'#f4f6fb');poly(g,[[5,-25],[13,-30],[6,-22]],'#f4f6fb');
  const a=at*6.28+ph;[-1,1].forEach(s=>{g.save();g.translate(s*10,-10);g.rotate(s*(.5+Math.sin(a)*.6));g.fillStyle='#8a5a2a';g.fillRect(-.8,-8,1.6,9);poly(g,[[0,-9],[5,-6],[0,-3]],'#e9eef7');g.restore()})},
 hammer(g,T,ph,at){feet(g,ph,'#22252f');
  rr(g,-7,-17,14,14,4,'#3d4252');rr(g,-7,-17,14,3,2,'#555c6e');rr(g,-3,-14,6,9,2,T.m);
  rr(g,-6,-26,12,10,4,'#4a5062');rr(g,-4.5,-22.5,9,2.2,1,T.l);
  g.save();g.translate(7,-10);g.rotate(-1.1+at*2.4);g.fillStyle='#6a4a28';g.fillRect(-1,-16,2,16);rr(g,-5,-21,10,6,1.5,'#7c8496');g.restore();
  oc(g,-8,-10,3,'#3d4252')},
 ram(g,T,ph,at){
  rr(g,-11,-14,18,10,2,'#8a5a2a');rr(g,-11,-14,18,2.5,1,'#b07a3c');g.fillStyle='rgba(60,35,15,.6)';g.fillRect(-11,-9.5,18,1);
  const wr=ph*2;[-7,4].forEach(x=>{oc(g,x,-3,4,'#4a3018','#2a1a0c');g.strokeStyle='#2a1a0c';g.lineWidth=1;g.beginPath();g.moveTo(x+Math.cos(wr)*3.5,-3+Math.sin(wr)*3.5);g.lineTo(x-Math.cos(wr)*3.5,-3-Math.sin(wr)*3.5);g.stroke()});
  const push=at>0?Math.sin(at*Math.PI)*4:0;rr(g,2+push,-12,14,5,2.5,'#7a4e22');rr(g,13+push,-13,4,7,1.5,'#59607a');
  oc(g,-9,-18,4,'#7ccd50');rr(g,-13,-23,8,4,2,T.m);oc(g,-7.6,-18.4,.8,'#111')},
 sorcerer(g,T,ph,at){feet(g,ph,'#2f2640');
  poly(g,[[-7,-2],[7,-2],[4,-16],[-4,-16]],T.m);rr(g,-7,-5,14,2.2,1,T.l);
  oc(g,0,-18.4,4.6,'#f0c9a0');g.beginPath();g.moveTo(-3,-15);g.quadraticCurveTo(0,-9,3,-15);g.fillStyle='#f2f2f2';g.fill();
  poly(g,[[-8,-21],[8,-21],[1.5,-34]],T.d);rr(g,-9,-22.5,18,2.5,1,T.d);oc(g,1,-27,1.2,'#ffd54a');
  g.strokeStyle='#7a4e22';g.lineWidth=1.8;g.beginPath();g.moveTo(10,-3);g.lineTo(10,-24);g.stroke();
  oc(g,10,-26,3.2,`rgba(255,150,60,${.6+at*.4})`);oc(g,10,-26,1.6,'#fff')},
 drake(g,T,ph,at){const w=Math.sin(ph*2.2)*7;
  poly(g,[[-3,-12],[-17,-20-w],[-12,-8]],T.l,T.d);poly(g,[[3,-12],[17,-20-w],[12,-8]],T.l,T.d);
  g.beginPath();g.moveTo(-3,-5);g.quadraticCurveTo(-9,2,-16,-3);g.lineWidth=2.4;g.strokeStyle=T.d;g.stroke();
  g.beginPath();g.ellipse(0,-9,7,8.5,0,0,7);g.fillStyle=T.m;g.fill();g.beginPath();g.ellipse(0,-6,4.2,5,0,0,7);g.fillStyle='#ffe2a0';g.fill();
  oc(g,0,-19,5.4,T.m);poly(g,[[-3,-23],[-5,-30],[-.5,-24]],'#ffe2a0');poly(g,[[3,-23],[5,-30],[.5,-24]],'#ffe2a0');
  oc(g,-2.2,-19.5,1.2,'#fff');oc(g,2.2,-19.5,1.2,'#fff');oc(g,-2.2,-19.5,.5,'#111');oc(g,2.2,-19.5,.5,'#111');
  if(at>0)oc(g,0,-14,3+at*4,`rgba(255,170,40,${.9-at*.3})`)},
 knightrider(g,T,ph,at){const l=Math.sin(ph*1.6)*3;
  g.strokeStyle='#5a3a1a';g.lineWidth=2.2;[[-7,l],[-3,-l],[5,l],[9,-l]].forEach(([x,o])=>{g.beginPath();g.moveTo(x,-8);g.lineTo(x+o*.6,0);g.stroke()});
  g.beginPath();g.ellipse(1,-11,11,5.5,0,0,7);g.fillStyle='#8a5a32';g.fill();
  g.save();g.translate(11,-15);g.rotate(-.5);rr(g,-2,-3,9,5,2.5,'#8a5a32');g.restore();oc(g,15.5,-19,1,'#111');
  g.strokeStyle='#3a2210';g.lineWidth=2;g.beginPath();g.moveTo(-10,-12);g.quadraticCurveTo(-15,-10,-14,-5);g.stroke();
  rr(g,-6,-14,12,3,1,T.m);
  rr(g,-3.5,-24,7,9,2.5,'#c5cfe0');oc(g,0,-27,4,'#d9e0ee','#8794ad');g.fillStyle='#202636';g.fillRect(-2.4,-27.6,4.8,1.4);
  g.save();g.translate(3,-20);g.rotate(-.25+at*.6);g.fillStyle='#d8c39a';g.fillRect(0,-1,20,2);poly(g,[[20,-2.5],[25,0],[20,2.5]],'#eef2fa');poly(g,[[4,-1],[9,-5],[9,-1]],T.m);g.restore()},
 airship(g,T,ph,at){
  g.beginPath();g.ellipse(0,-22,12,10,0,0,7);g.fillStyle=T.m;g.fill();
  g.strokeStyle=T.d;g.lineWidth=1.4;g.beginPath();g.ellipse(0,-22,5.5,10,0,0,7);g.stroke();g.beginPath();g.moveTo(0,-32);g.lineTo(0,-12);g.stroke();
  oc(g,-4,-26,2.5,'rgba(255,255,255,.35)');
  g.strokeStyle='#5a3a1a';g.lineWidth=.8;g.beginPath();g.moveTo(-8,-15);g.lineTo(-5,-8);g.moveTo(8,-15);g.lineTo(5,-8);g.stroke();
  rr(g,-6,-9,12,5,2,'#8a5a2a');oc(g,0,-2+(at>0?at*3:0),2.6,'#23262e','#555b6a')},
 colossus(g,T,ph,at){feet(g,ph,'#4a463e');
  oc(g,-10,-12,7,'#7a756a','#4f4a40');oc(g,10,-12-(at>0?at*3:0),7.5,'#7a756a','#4f4a40');
  oc(g,0,-15,11,'#8d887c','#57524a');oc(g,-3,-18,3,'#a39e90');
  oc(g,0,-28,7,'#8d887c','#57524a');
  g.fillStyle=T.l;g.fillRect(-4,-29.5,3,2);g.fillRect(1,-29.5,3,2);
  g.strokeStyle=T.m;g.lineWidth=1.4;g.beginPath();g.moveTo(-4,-12);g.lineTo(0,-16);g.lineTo(4,-12);g.stroke()},
 pebble(g,T,ph){feet(g,ph,'#4a463e');oc(g,-6,-7,4,'#7a756a','#4f4a40');oc(g,6,-7,4,'#7a756a','#4f4a40');oc(g,0,-9,6.5,'#8d887c','#57524a');oc(g,0,-17,4.4,'#8d887c','#57524a');g.fillStyle=T.l;g.fillRect(-2.6,-18,2,1.6);g.fillRect(.6,-18,2,1.6)},
 frostsage(g,T,ph,at){feet(g,ph,'#2a3a50');
  poly(g,[[-7,-2],[7,-2],[4,-16],[-4,-16]],'#9fd3f0');rr(g,-7,-6,14,2.2,1,T.m);
  oc(g,0,-18.5,4.6,'#f0d2b0');g.beginPath();g.moveTo(-3.6,-16);g.quadraticCurveTo(0,-7,3.6,-16);g.fillStyle='#f4f8ff';g.fill();
  g.beginPath();g.arc(0,-19.6,5.2,Math.PI,0);g.fillStyle='#cfe9ff';g.fill();
  g.strokeStyle='#c8e6ff';g.lineWidth=1.8;g.beginPath();g.moveTo(10,-2);g.lineTo(10,-22);g.stroke();
  poly(g,[[10,-30],[13,-25],[10,-20],[7,-25]],`rgba(170,230,255,${.7+at*.3})`,'#e8f8ff')},
 thunder(g,T,ph,at){feet(g,ph,'#2a2440');
  poly(g,[[-7,-2],[7,-2],[4,-15],[-4,-15]],T.d);rr(g,-3,-14,6,10,2,T.m);
  oc(g,0,-18.5,4.6,'#f0c9a0');
  poly(g,[[-5,-21],[-7,-27],[-2,-23],[0,-29],[2,-23],[7,-27],[5,-21]],'#e8f1ff');
  oc(g,-1.6,-18.4,.8,'#39f');oc(g,1.6,-18.4,.8,'#39f');
  const s=.6+at*.4+Math.sin(ph*9)*.15;for(const x of[-9,9]){oc(g,x,-11,3.4,`rgba(120,200,255,${s*.6})`);oc(g,x,-11,1.6,'#fff')}},
 mole(g,T,ph,at){feet(g,ph,'#3a2a1c');
  g.beginPath();g.ellipse(0,-10,7,8,0,0,7);g.fillStyle='#7a5a3c';g.fill();g.beginPath();g.ellipse(0,-8,4.2,5,0,0,7);g.fillStyle='#b08a64';g.fill();
  oc(g,0,-19,5.4,'#7a5a3c');oc(g,0,-16.4,2,'#f2a6a6');oc(g,-2,-19.5,.9,'#111');oc(g,2,-19.5,.9,'#111');
  g.beginPath();g.arc(0,-21,5.8,Math.PI,0);g.fillStyle=T.m;g.fill();oc(g,0,-25,1.8,'#ffe27a');
  g.save();g.translate(7,-10);g.rotate(-.8+at*2.2);g.fillStyle='#6a4a28';g.fillRect(-.8,-11,1.6,11);g.beginPath();g.moveTo(-5,-11);g.quadraticCurveTo(0,-14,5,-11);g.lineWidth=2;g.strokeStyle='#9aa3b5';g.stroke();g.restore()},
 warlord(g,T,ph,at){feet(g,ph,'#2c2218');
  poly(g,[[-9,-4],[9,-4],[8,-20],[-8,-20]],T.d);
  rr(g,-6.5,-19,13,14,4,'#b9a27a');rr(g,-6.5,-12,13,3,1,'#ffd84d');rr(g,-2.5,-18,5,6,1.5,T.m);
  oc(g,0,-23,5.6,'#e8b48a');g.beginPath();g.arc(0,-20.6,5,.2,Math.PI-.2);g.fillStyle='#5a3220';g.fill();
  g.beginPath();g.arc(0,-24.5,6,Math.PI,0);g.fillStyle='#8d97ab';g.fill();poly(g,[[-6,-25],[-11,-33],[-4,-27]],'#f4efdf');poly(g,[[6,-25],[11,-33],[4,-27]],'#f4efdf');oc(g,0,-27,1.4,'#ffd84d');
  g.save();g.translate(9,-12);g.rotate(-.8+at*2.6);g.fillStyle='#6a4a28';g.fillRect(-1,-16,2,18);poly(g,[[0,-16],[7,-13],[7,-7],[0,-10]],'#e9eef7');poly(g,[[0,-16],[-7,-13],[-7,-7],[0,-10]],'#e9eef7');g.restore()},
 cannon(g,T,ph,at,ang){
  rr(g,-12,-9,24,11,4,'#8a5a2a');rr(g,-12,-9,24,3,2,'#b07a3c');
  oc(g,-9,3,4.6,'#4a3018','#2a1a0c');oc(g,9,3,4.6,'#4a3018','#2a1a0c');
  g.save();g.translate(0,-10);g.rotate(ang??-1.57);g.translate(-at*3,0);rr(g,-3,-5,22,10,4,'#3a3f4c');rr(g,14,-6,6,12,2,'#555c6e');g.restore();
  oc(g,0,-10,6,'#4a5062','#2b2f3a');rr(g,-5,-18,10,5,2,T.m)},
 lair(g,T,ph,at){
  g.beginPath();g.moveTo(-14,0);g.quadraticCurveTo(-14,-22,0,-24);g.quadraticCurveTo(14,-22,14,0);g.closePath();g.fillStyle='#6f6a60';g.fill();
  g.beginPath();g.moveTo(-8,0);g.quadraticCurveTo(-8,-12,0,-13);g.quadraticCurveTo(8,-12,8,0);g.closePath();g.fillStyle='#1a1710';g.fill();
  g.strokeStyle='#efe9d6';g.lineWidth=1.6;g.stroke();
  oc(g,0,-19,3.4,'#f4efdf');g.fillStyle='#222';g.fillRect(-1.6,-19.6,1.2,1.2);g.fillRect(.4,-19.6,1.2,1.2);
  rr(g,10,-30,1.4,16,.5,'#4a3a28');poly(g,[[11.4,-30],[18,-27],[11.4,-24]],T.m);
  if(at>0)oc(g,0,-6,4+at*4,`rgba(180,255,180,${.5*at})`)}
};
const FLYOFF=15;
CH.scorch=CH.sorcerer||CH.frostsage;CH.raider=CH.imps||CH.guard;CH.spring=CH.lair||CH.cannon;CH.shieldman=CH.guard;CH.mortar=CH.cannon;CH.torchman=CH.militia||CH.guard;CH.lantern=CH.cannon;
function drawChar(g,key,tm,x,y,o){const T=TEAM[tm],c=CARDS[key],s=o.s||1,dir=o.dir||1,ph=o.ph||0,at=o.at||0;
 g.save();g.translate(x,y);
 if(!o.noShadow){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(0,c.fly?8:2,c.r*s*1.05,c.r*s*.46,0,0,7);g.fill()}
 g.scale(s*dir,s);const bob=c.type==='building'?0:Math.abs(Math.sin(ph))*1.4;
 g.translate(at>0&&c.type!=='building'?Math.sin(at*Math.PI)*2.5:0,c.fly?-FLYOFF-Math.sin(ph*1.3)*2.4:-bob);
 const sc=c.r>=15?c.r/11:1;if(sc!==1)g.scale(sc,sc);
 (CH[key]||CH.guard)(g,T,ph,at,o.ang);g.restore()}

/* иконки карт */
const IC={};
function icon(key){if(IC[key])return IC[key];const cv=document.createElement('canvas');cv.width=cv.height=240;const g=cv.getContext('2d');g.scale(4,4);
 if(!CARDS[key]){g.fillStyle='#2b4f9a';g.beginPath();g.arc(30,30,22,0,7);g.fill();g.fillStyle='#fff';g.font='900 22px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(key==='tt_king'?'♔':'⚑',30,31);return cv}
 const c=CARDS[key],rc=RAR[c.rar].c;
 const bgc=g.createRadialGradient(30,24,4,30,30,44);bgc.addColorStop(0,c.rar==='common'?'#4a5d96':c.rar==='rare'?'#7a5a3a':c.rar==='epic'?'#5d3f8a':c.rar==='legendary'?'#2c6e6a':'#7a6420');bgc.addColorStop(1,'#141c38');g.fillStyle=bgc;g.fillRect(0,0,60,60);
 g.fillStyle='rgba(255,255,255,.07)';g.beginPath();g.ellipse(30,50,22,6,0,0,7);g.fill();
 if(key==='fireball'){const gr=g.createRadialGradient(30,32,2,30,32,22);gr.addColorStop(0,'#fff6c2');gr.addColorStop(.35,'#ffc83d');gr.addColorStop(.75,'#ff6a1a');gr.addColorStop(1,'#b3200a');
  g.beginPath();g.moveTo(30,6);g.bezierCurveTo(38,16,50,22,46,34);g.bezierCurveTo(44,46,36,52,30,52);g.bezierCurveTo(22,52,14,46,14,36);g.bezierCurveTo(14,24,24,18,30,6);g.fillStyle=gr;g.fill();oc(g,30,36,7,'#fff8d8')}
 else if(key==='volley'){g.strokeStyle='#ffffff55';g.lineWidth=1.2;g.setLineDash([3,3]);g.beginPath();g.arc(30,32,17,0,7);g.stroke();g.setLineDash([]);
  [[18,12],[30,8],[42,12]].forEach(([x,y],i)=>{g.save();g.translate(x,y+i%2*4);g.rotate(.75);g.fillStyle='#e9eef7';g.fillRect(-1,0,2,24);poly(g,[[-3,24],[3,24],[0,31]],'#e9eef7');g.fillStyle='#ff5c4d';g.fillRect(-3,-1,6,4);g.restore()})}
 else if(key==='spark'){oc(g,30,30,18,'rgba(120,200,255,.25)');poly(g,[[33,6],[20,32],[29,32],[24,54],[42,24],[32,24],[38,6]],'#bfe6ff','#fff')}
 else if(key==='freeze'){oc(g,30,30,19,'rgba(150,220,255,.25)');g.strokeStyle='#e8f8ff';g.lineWidth=3;g.lineCap='round';for(let i=0;i<3;i++){const a=i*Math.PI/3;g.beginPath();g.moveTo(30+Math.cos(a)*17,30+Math.sin(a)*17);g.lineTo(30-Math.cos(a)*17,30-Math.sin(a)*17);g.stroke();for(const s of[1,-1]){const ex=30+Math.cos(a)*11*s,ey=30+Math.sin(a)*11*s;g.beginPath();g.moveTo(ex,ey);g.lineTo(ex+Math.cos(a+.8*s)*5*s,ey+Math.sin(a+.8*s)*5*s);g.stroke()}}}
 else if(key==='cry'){oc(g,30,30,19,'rgba(255,80,120,.22)');g.save();g.translate(30,32);g.rotate(-.5);g.beginPath();g.moveTo(-16,-3);g.lineTo(8,-9);g.quadraticCurveTo(16,-10,17,0);g.quadraticCurveTo(16,10,8,9);g.lineTo(-16,3);g.closePath();g.fillStyle='#e6c27a';g.fill();g.strokeStyle='#8a6420';g.lineWidth=1.5;g.stroke();g.restore();for(let i=0;i<3;i++){g.strokeStyle='#ff8aa6';g.lineWidth=2;g.beginPath();g.arc(30,32,22+i*4,-1.9,-1.1);g.stroke()}}
 else if(key==='poison'){for(let i=0;i<7;i++)oc(g,18+Math.cos(i*.9)*10+i*2,30+Math.sin(i*1.7)*8,8,'rgba(120,220,90,.55)');oc(g,30,30,8,'#e9f5d0');g.fillStyle='#1d2a12';g.beginPath();g.arc(27,29,2,0,7);g.arc(33,29,2,0,7);g.fill();g.fillRect(28,33,4,2)}
 else if(key==='legion'){for(let i=0;i<6;i++)drawChar(g,'bones',0,12+(i%3)*18,32+(i/3|0)*16,{s:1.15,ph:i})}
 else{const n=c.count>=3?3:c.count===2?2:1,sc=c.type==='building'?1.55:c.r>=15?1.05:n>1?1.35:1.6;
  for(let i=0;i<n;i++){const ox=n===1?0:(i-(n-1)/2)*15;drawChar(g,key,0,30+ox,(c.fly?54:48)-(n>1&&i%2?4:0),{s:sc,ph:1+i,ang:-1.1})}}
 g.strokeStyle=rc;g.lineWidth=2;g.strokeRect(1,1,58,58);
 return IC[key]=cv}
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
/* ================= БОТ ================= */
/* Бот смотрит на поле «сверху»: своя половина у него всегда вверху (fy<320), поэтому один и тот же код играет за любую сторону */
const SKILL=CFG.bot.levels;
function mkBot(tm,cfg){const s=typeof cfg==='string'?(cfg==='random'?{n:'Случайный',random:1,think:1,el:1,react:1,mist:1,acc:0,spell:0,push:10,abil:0}:SKILL[cfg]):Object.assign({},SKILL.normal,cfg);return{tm,s,oppEl:CFG.elixir.start,oppSpent:0,fullT:0,think:1.5,seen:{},plan:[],lane:0,lastPush:-99,cleanT:0}}
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
function counterScore(key,T){const c=CARDS[key],R=ROLE[key];if(c.type==='spell')return-99;if(R.eco||c.light&&!c.dmg)return T.bt?2:-99;if(R.win&&!c.tunnel)return-99;
 let s=4+(affOn(CARDS[c.unit]||c)?1:0);const airShare=T.air/(T.v||1);
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
function spellTarget(b,key,units){const c=CARDS[key],lvl=G.side[b.tm].lv[key]||1;if(!c.dmg||c.freeze)return null;units=c.roll?units.filter(u=>!u.fly):units;
 const r=c.rad*TILE,dm=LV(c.dmg,lvl)*(c.poison?.75:1);let best=null;
 for(const u of units){let val=0,n=0,sx=0,sy=0;for(const v of units)if(hy(v.x-u.x,v.y-u.y)<r*.8){n++;sx+=v.x;sy+=v.y;val+=v.hp<=dm?uval(v):uval(v)*dm/v.hp*.5}
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
/* «эксперт» считает эликсир соперника: копит по тем же фазам и вычитает увиденные розыгрыши */
function trackOppEl(b,dt){const st=G.stats[1-b.tm],spent=st.spent-b.oppSpent;b.oppSpent=st.spent;b.oppEl=clamp(b.oppEl+dt/CFG.elixir.period*elRate()-spent,0,CFG.elixir.max)}
/* «случайный» бот для турниров: любая доступная карта в любую разрешённую точку */
function randomThink(b){const S=G.side[b.tm],ok=S.hand.map((k,i)=>[k,i]).filter(([k])=>k&&S.el>=CARDS[k].cost&&!cardBlocked(b.tm,k));if(!ok.length)return;
 const[k,i]=pickR(ok);for(let n=0;n<12;n++){const x=rnd(20,W-20),y=CARDS[k].type==='spell'?rnd(40,H-40):fyOf(b,rnd(30,290));if(playCard(b.tm,i,x,y))return}}
/* на полном эликсире обязательно сыграть: самая дешёвая карта в своём тылу (координаты бота: y от своего края) */
function dumpElixir(b){const S=G.side[b.tm],ks=S.hand.map((k,i)=>[k,i]).filter(([k])=>k&&S.el>=CARDS[k].cost&&!cardBlocked(b.tm,k)).sort((x,y)=>CARDS[x[0]].cost-CARDS[y[0]].cost);
 for(const[k,i]of ks){const c=CARDS[k];if(c.heal)continue;if(c.type==='spell'){const t=G.T.filter(t=>t.tm!==b.tm&&t.hp>0).sort((x,y)=>x.hp-y.hp)[0];if(t&&playCard(b.tm,i,t.x,t.y))return true;continue}
  for(const[dx,dy]of[[0,100],[-60,110],[60,110],[0,140],[0,200]]){if(playCard(b.tm,i,W/2+dx,fyOf(b,dy)))return true}}
 return false}
function botThink(b,dt){const S=G.side[b.tm],s=b.s;
 if(s.countEl)trackOppEl(b,dt);
 b.fullT=S.el>=CFG.bot.leakAt?b.fullT+dt:0;
 if(b.fullT>1.2&&dumpElixir(b)){b.fullT=0;return}
 if(s.random){b.think-=dt;if(b.think<=0){b.think=rnd(.5,1.5);randomThink(b)}return}
 // способность чемпиона
 if(S.champ&&alive(S.champ)&&S.abCd<=0&&S.el>=S.champ.c.ability.cost){const u=S.champ;let n=0;for(const v of G.U)if(v.tm!==b.tm&&alive(v)&&dist(u,v)<90)n++;
  const nearT=G.T.some(t=>t.tm!==b.tm&&t.hp>0&&dist(u,t)<t.r+40);
  if((n>=2||nearT||u.hp<u.mx*.45)&&RNG()<s.abil*dt*3)useAbility(b.tm)}
 // запланированная поддержка
 for(const p of b.plan)if(!p.done&&G.t>=p.t){p.done=1;botSupport(b,p)}
 b.plan=b.plan.filter(p=>!p.done);
 b.think-=dt;if(b.think>0)return;b.think=s.think*rnd(.7,1.3);
 b.cleanT+=1;if(b.cleanT>40){b.cleanT=0;const ids=new Set(G.U.map(u=>u.id));for(const k in b.seen)if(!ids.has(+k))delete b.seen[k]}
 const L=laneThreats(b),hand=S.hand.filter(k=>k&&S.el>=CARDS[k].cost&&!cardBlocked(b.tm,k));
 // добить башню заклинанием
 if(RNG()<s.spell)for(const k of hand){const c=CARDS[k];if(c.type!=='spell'||!c.tdmg||c.freeze)continue;const td=LV(c.tdmg,S.lv[k]||1);
  for(const t of G.T)if(t.tm!==b.tm&&t.hp>0&&t.hp<=td*(c.poison?.9:1)){if(botPlay(b,k,t.x,fyOf(b,t.y),true))return}}
 // Затмение / Рассвет: когда на поле больше своих карт нужной стороны, чем врага
 const fc=hand.find(k=>CARDS[k].force);
 if(fc&&!G.force){const want=CARDS[fc].force.k?'night':'day',cur=isNight()?'night':'day';
  if(want!==cur){const mine=G.U.filter(u=>u.tm===b.tm&&alive(u)&&u.c.aff===want).reduce((a,u)=>a+uval(u),0),theirs=G.U.filter(u=>u.tm!==b.tm&&alive(u)&&u.c.aff===want).reduce((a,u)=>a+uval(u),0);
   if(mine>=5&&mine>theirs+2&&botPlay(b,fc,W/2,fyOf(b,RY),true))return}}
 // Подрыв: большой пуш врага на его стороне идёт к мосту — обрушить мост перед ним
 const sp=hand.find(k=>CARDS[k].bdmg);
 if(sp&&RNG()<s.spell)for(const lane of[0,1]){const br=G.bridges[lane];if(br.down>0)continue;const bx=BR[lane];
  const near=G.U.filter(u=>u.tm!==b.tm&&alive(u)&&!u.fly&&!u.c.jump&&!u.c.tunnel&&Math.abs(u.x-bx)<70&&fyOf(b,u.y)>345&&fyOf(b,u.y)<470);
  if(near.reduce((a,u)=>a+uval(u),0)>=5&&botPlay(b,sp,bx,fyOf(b,RY),true))return}
 // оборона: самая опасная линия
 let need=null;
 for(const lane of[0,1]){const T=L[lane];if(!T.n||T.age<s.react)continue;const n=T.v-laneDef(b,lane)+(T.bt?1:0)+(T.fy<200?1:0);if(n>.6&&(!need||n>need.n))need={lane,n,T}}
 if(need&&RNG()>s.mist*.5){const T=need.T;
  // заклинание по скоплению, если размен выгоден
  if(RNG()<s.spell){let best=null;for(const k of hand){const c=CARDS[k];if(c.type!=='spell')continue;const p=spellTarget(b,k,T.units);if(p&&p.val>=c.cost+.4&&(!best||p.val-c.cost>best.gain))best={k,p,gain:p.val-c.cost}}
   if(best&&T.small>=2){const lead=CARDS[best.k].poison?0:CARDS[best.k].roll?-55:-10;if(botPlay(b,best.k,best.p.x,fyOf(b,best.p.y)+lead,true))return}}
  // клич в обороне, когда свои уже дерутся
  const rg=hand.find(k=>CARDS[k].rage);
  if(rg&&T.v>=4){const own=G.U.filter(u=>u.tm===b.tm&&alive(u)&&laneOf(u.x)===need.lane&&fyOf(b,u.y)<360);const ov=own.reduce((a,u)=>a+uval(u),0);
   if(ov>=4){const cx=own.reduce((a,u)=>a+u.x,0)/own.length,cy=own.reduce((a,u)=>a+u.y,0)/own.length;if(botPlay(b,rg,cx,fyOf(b,cy),true))return}}
 // ночью — вспышка по угрозе, чтобы башня и стрелки её увидели
  const fl=hand.find(k=>CARDS[k].flash);
  if(fl&&isNight()&&T.fy<230&&T.units.some(u=>!seen(b.tm,u))){const cx=T.units.reduce((a,u)=>a+u.x,0)/T.units.length,cy=T.units.reduce((a,u)=>a+u.y,0)/T.units.length;if(botPlay(b,fl,cx,fyOf(b,cy),true))return}
  // звон лечит своих, если они в обороне уже потрёпаны
  const md=hand.find(k=>CARDS[k].heal);
  if(md){const own=G.U.filter(u=>u.tm===b.tm&&alive(u)&&laneOf(u.x)===need.lane&&fyOf(b,u.y)<360&&!u.c.token),miss=own.reduce((a,u)=>a+u.mx-u.hp,0);
   if(own.length>=2&&miss>=LV(CARDS[md].heal,S.lv[md]||1)*1.2){const cx=own.reduce((a,u)=>a+u.x,0)/own.length,cy=own.reduce((a,u)=>a+u.y,0)/own.length;if(botPlay(b,md,cx,fyOf(b,cy),true))return}}
  let pick=null,ps=-1e9;
  for(const k of hand){let sc=counterScore(k,T);if(RNG()<s.mist)sc+=rnd(-4,4);if(sc>ps){ps=sc;pick=k}}
  if(pick&&ps>0){const[px,py]=placeDefense(b,pick,T,need.lane);if(botPlay(b,pick,px,py))return}
  if(T.fy<130&&T.v>=3){for(const k of hand){const c=CARDS[k];if(c.type!=='spell')continue;const p=spellTarget(b,k,T.units);if(p&&p.val>=c.cost*.6&&botPlay(b,k,p.x,fyOf(b,p.y),true))return}}}
 // родник: ставить в тылу, когда угроз нет и эликсир не нужен прямо сейчас
 const eco=hand.find(k=>ROLE[k].eco);
 if(eco&&!need&&S.el>=(b.s.countEl&&b.oppEl<4?6:8)&&!G.B.some(o=>o.tm===b.tm&&o.key===eco)&&RNG()>s.mist){if(botPlay(b,eco,W/2,112))return}
 // поддержка своей контратаки
 botOffenseSpells(b,hand);
 // атака
 const dbl=elRate()>1,thr=s.push-(dbl?1.5:0)-(G.ot?.5:0);
 const other=G.side[1-b.tm],ol=other.last,punish=ol&&G.t-ol.t<4&&CARDS[ol.key].cost>=5&&fyOf(b,ol.y)>520||s.countEl&&b.oppEl<2.5&&S.el>=5;
 // ночью перед атакой — фонарь у моста своей дорожки
 const ln=hand.find(k=>CARDS[k].light&&CARDS[k].type==='building');
 if(ln&&isNight()&&!need&&S.el>=thr-1&&!G.B.some(o=>o.tm===b.tm&&o.key===ln)){const lane=pushLane(b);if(botPlay(b,ln,BR[lane],262)){b.lane=lane;return}}
 const gv=hand.find(k=>CARDS[k].grave);
 if(gv&&S.el>=thr&&G.t-b.lastPush>4){const lane=pushLane(b),t=enemyTowerIn(b,lane),tt=t.hp>0?t:G.T.find(t=>t.tm!==b.tm&&t.kind==='k');
  if(botPlay(b,gv,tt.x+(lane?-1:1)*10,fyOf(b,tt.y)-30,true)){b.lane=lane;b.lastPush=G.t;b.plan.push({t:G.t+rnd(.5,1.2),lane,k:'sup'});return}}
 const wins=hand.filter(k=>ROLE[k].win&&!ROLE[k].spell);
 if(wins.length&&(S.el>=thr||punish&&S.el>=CARDS[wins[0]].cost+1)&&G.t-b.lastPush>4){
  const lane=punish&&ol?1-laneOf(ol.x):pushLane(b);let k=wins[0];
  if(punish&&ol){const f=wins.find(x=>CARDS[x].spd==='vfast'||CARDS[x].tunnel);if(f)k=f}
  else if(wins.length>1&&ol)k=wins.sort((x,y)=>(CARDS[y].spd==='slow')-(CARDS[x].spd==='slow'))[S.el>=9.5?0:wins.length-1];
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
 if(RNG()<.004&&G.crowns[b.tm]>G.crowns[1-b.tm])emote(b.tm,pickR([3,4]))}
function botSupport(b,p){const S=G.side[b.tm];
 const lead=G.U.filter(u=>u.tm===b.tm&&alive(u)&&ROLE[u.key]?.win&&laneOf(u.x)===p.lane).sort((x,y)=>fyOf(b,y.y)-fyOf(b,x.y))[0];
 if(!lead)return;
 const hand=S.hand.filter(k=>k&&S.el>=CARDS[k].cost&&!cardBlocked(b.tm,k)&&CARDS[k].type==='troop'&&!ROLE[k].win);
 if(!hand.length)return;
 const k=hand.sort((x,y)=>(ROLE[y].ranged+ROLE[y].splash*.7+ROLE[y].aa*.5-CARDS[y].cost*.15)-(ROLE[x].ranged+ROLE[x].splash*.7+ROLE[x].aa*.5-CARDS[x].cost*.15))[0];
 const lf=fyOf(b,lead.y);
 if(lf<290)botPlay(b,k,lead.x,Math.max(30,lf-38));else botPlay(b,k,BR[p.lane],286)}
function botOffenseSpells(b,hand){const s=b.s;if(RNG()>s.spell)return;
 for(const t of G.T){if(t.tm===b.tm||t.hp<=0)continue;
  let own=0;for(const u of G.U)if(u.tm===b.tm&&alive(u)&&dist(u,t)<t.r+70)own+=uval(u);
  if(own<4)continue;
  const def=G.U.filter(u=>u.tm!==b.tm&&alive(u)&&dist(u,t)<130);
  for(const k of hand){const c=CARDS[k];if(c.type!=='spell')continue;
   if(c.freeze&&own>=6){if(botPlay(b,k,t.x,fyOf(b,t.y)+(fyOf(b,t.y)>320?-20:20),true))return}
   else if(c.shade){const rs=G.U.filter(u=>u.tm===b.tm&&alive(u)&&ROLE[u.key]?.ranged&&dist(u,t)<t.r+c.rad*TILE*2);if(rs.length>=1&&own>=4){const cx=rs.reduce((a,u)=>a+u.x,0)/rs.length,cy=rs.reduce((a,u)=>a+u.y,0)/rs.length;if(botPlay(b,k,cx,fyOf(b,cy),true))return}}
   else if((c.rage||c.heal)&&own>=4){const near=G.U.filter(u=>u.tm===b.tm&&alive(u)&&dist(u,t)<t.r+70);const cx=near.reduce((a,u)=>a+u.x,0)/near.length,cy=near.reduce((a,u)=>a+u.y,0)/near.length;if(botPlay(b,k,cx,fyOf(b,cy),true))return}
   else if(c.dmg&&def.length){const p=spellTarget(b,k,def);if(p&&p.val+(dist(p,t)<c.rad*TILE+t.r?c.tdmg/300:0)>=c.cost&&botPlay(b,k,p.x,fyOf(b,p.y),true))return}}}}
/* ================= ОТРИСОВКА ================= */
const C=$('#c'),X=C.getContext('2d');
let K=1,dpr=1,BG=null,sel=null,gx=-1,gy=-1,paused=false,mode='home';
const FONT='Nunito,system-ui,sans-serif';

/* оформление восьми арен: земля, дорожки, площадки, вода, мосты, украшения */
const THEMES=[
 {g0:'#3a8637',g1:'#4c9b44',tile:'rgba(255,255,255,.045)',blade:'rgba(20,70,25,.4)',path:'rgba(160,126,82,.6)',path2:'rgba(214,182,130,.5)',pad:['#d4cab2','#a09883'],grout:'rgba(70,58,40,.3)',bank:'#d6c18f',bank2:'#9c855c',w0:'#226db3',w1:'#4dade8',wave:'255,255,255',dots:['#fff','#ffe36b','#ff9fd2','#b9a4ff'],deco:'bush',wood:['#a8773e','#cf9a5a']},
 {g0:'#857537',g1:'#a08e4c',tile:'rgba(255,255,255,.05)',blade:'rgba(80,60,20,.4)',path:'rgba(118,88,58,.6)',path2:'rgba(190,160,120,.5)',pad:['#d8cfbd','#a49c8a'],grout:'rgba(70,58,40,.3)',bank:'#cbb68a',bank2:'#8c7650',w0:'#2d5f86',w1:'#4f8fb8',wave:'235,245,255',dots:['#efe9d6','#d8d3c4','#c9b99a'],deco:'bones',wood:['#8a6a3e','#ad8a5a']},
 {g0:'#2f6e3a',g1:'#3f8446',tile:'rgba(0,0,0,.05)',blade:'rgba(10,50,20,.4)',path:'rgba(108,108,118,.65)',path2:'rgba(170,170,180,.55)',pad:['#b9b4aa','#8c877d'],grout:'rgba(40,40,40,.35)',bank:'#b5a98c',bank2:'#7d725a',w0:'#1f5f9a',w1:'#3f93d0',wave:'255,255,255',dots:['#ffb347','#ffe36b'],deco:'barrels',wood:['#8a5a2e','#b07a3c']},
 {g0:'#c9d6e4',g1:'#e3ecf5',tile:'rgba(110,140,185,.07)',blade:'rgba(130,160,195,.45)',path:'rgba(145,165,192,.55)',path2:'rgba(205,220,236,.6)',pad:['#e3e8ef','#aab4c3'],grout:'rgba(90,110,140,.3)',bank:'#f4f8fc',bank2:'#a9bed3',w0:'#5fa8d8',w1:'#a9dcf5',wave:'255,255,255',dots:['#ffffff','#d9ecff'],deco:'pines',wood:['#8a6a4e','#a9876a']},
 {g0:'#74402e',g1:'#8f553c',tile:'rgba(255,200,150,.05)',blade:'rgba(60,20,10,.35)',path:'rgba(58,40,35,.55)',path2:'rgba(120,85,70,.5)',pad:['#b39a8c','#7f6a5f'],grout:'rgba(40,20,10,.35)',bank:'#4a3a35',bank2:'#2c201d',w0:'#c23e14',w1:'#ff9a2a',wave:'255,230,120',dots:['#ffb347','#ff6a1a'],deco:'rocks',wood:['#5a4a44','#7a6a62']},
 {g0:'#2c4a2c',g1:'#395c35',tile:'rgba(180,255,150,.04)',blade:'rgba(10,30,10,.45)',path:'rgba(70,60,40,.6)',path2:'rgba(120,105,70,.5)',pad:['#9fa48a','#6d725c'],grout:'rgba(20,30,20,.35)',bank:'#5d6b3f',bank2:'#36402a',w0:'#3c5a2a',w1:'#6f9240',wave:'200,255,150',dots:['#c7ff7a','#e0ff9a','#ff6ad5'],deco:'shrooms',wood:['#6a5a3a','#8a7a52']},
 {g0:'#3e4660',g1:'#4e5876',tile:'rgba(160,190,255,.05)',blade:'rgba(20,25,45,.4)',path:'rgba(90,100,130,.6)',path2:'rgba(150,160,195,.45)',pad:['#a8adbd','#737889'],grout:'rgba(20,25,45,.35)',bank:'#8a90a8',bank2:'#555b72',w0:'#3a2f8a',w1:'#6a5ad8',wave:'200,210,255',dots:['#9fd3ff','#c9a8ff'],deco:'runes',wood:['#5a5f72','#7a8096']},
 {g0:'#b39552',g1:'#cdb06c',tile:'rgba(255,255,255,.06)',blade:'rgba(120,90,40,.35)',path:'rgba(150,120,70,.55)',path2:'rgba(230,205,150,.5)',pad:['#e8dcc0','#b5a47f'],grout:'rgba(90,70,40,.3)',bank:'#e8d5a5',bank2:'#a88f5e',w0:'#1e8a8a',w1:'#4fd0c8',wave:'255,255,255',dots:['#fff3c0','#ffd84d'],deco:'pillars',wood:['#9a7a4a','#c09a5e']}];
let TH=THEMES[0];

/* ---------- фон арены: нижний слой (трава, дорожки, площадки), верхний (мосты, рамка), затемнение краёв ---------- */
function buildBG(k){const w=Math.round(W*k),h=Math.round(H*k),mk=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
 const b=mk(),a=mk(),v=mk(),g=b.getContext('2d'),r=mul(7);g.scale(k,k);
 const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,TH.g0);gr.addColorStop(.5,TH.g1);gr.addColorStop(1,TH.g0);g.fillStyle=gr;g.fillRect(0,0,W,H);
 g.fillStyle=TH.tile;for(let ty=0;ty<32;ty++)for(let tx=0;tx<18;tx++)if((tx+ty)&1)g.fillRect(tx*TILE,ty*TILE,TILE,TILE);
 for(let i=0;i<520;i++){const x=r()*W,y=r()*H,s=3+r()*14;g.fillStyle=r()<.5?'rgba(255,255,255,.035)':'rgba(0,30,0,.06)';g.beginPath();g.ellipse(x,y,s,s*.6,r()*3,0,7);g.fill()}
 g.strokeStyle=TH.blade;g.lineWidth=1;for(let i=0;i<520;i++){const x=r()*W,y=r()*H;g.beginPath();g.moveTo(x,y);g.lineTo(x-1.4,y-3.4);g.moveTo(x+1.4,y);g.lineTo(x+2.2,y-2.8);g.stroke()}
 g.lineCap='round';g.lineJoin='round';
 for(const[col,wd]of[[TH.path,24],[TH.path2,11]]){g.strokeStyle=col;g.lineWidth=wd;
  for(const tm of[0,1]){const f=y=>tm?H-y:y;for(const px of BR){g.beginPath();g.moveTo(180,f(580));g.quadraticCurveTo(px,f(580),px,f(515));g.lineTo(px,f(RY+RIV+2));g.stroke()}}}
 for(const tm of[0,1])for(const[x,y0,s]of[[70,515,60],[290,515,60],[180,580,80]])pad(g,x,tm?H-y0:y0,s);
 for(const s of[-1,1]){const y=RY+s*RIV;g.fillStyle=TH.bank;g.fillRect(0,s<0?y-5:y,W,5);g.fillStyle=TH.bank2;g.fillRect(0,s<0?y-6.5:y+4.5,W,1.5)}
 for(let i=0;i<90;i++){const x=r()*W,y=r()*H;if(Math.abs(y-RY)<RIV+8)continue;g.fillStyle=TH.dots[i%TH.dots.length];g.beginPath();g.arc(x,y,1.2,0,7);g.fill()}
 for(let i=0;i<18;i++){const L=r()<.5,x=L?7+r()*12:W-7-r()*12,y=12+r()*(H-24);if(Math.abs(y-RY)<RIV+10)continue;oc(g,x,y,2.4+r()*2.6,'#8e9097','#5c5f68')}
 for(const[x,y]of[[16,RY-34],[W-16,RY+34],[18,RY+38],[W-18,RY-38],[14,186],[W-14,454],[W-15,190],[15,452]])deco(g,TH.deco,x,y,r);
 const A=a.getContext('2d');A.scale(k,k);
 for(const bx of BR){A.fillStyle='rgba(0,0,0,.28)';A.fillRect(bx-21,RY-RIV+3,45,2*RIV+2);
  const bg=A.createLinearGradient(bx-20,0,bx+20,0);bg.addColorStop(0,TH.wood[0]);bg.addColorStop(.5,TH.wood[1]);bg.addColorStop(1,TH.wood[0]);A.fillStyle=bg;A.fillRect(bx-20,RY-RIV-6,40,2*RIV+12);
  A.strokeStyle='rgba(70,40,15,.55)';A.lineWidth=1;for(let y=RY-RIV-4;y<RY+RIV+6;y+=6){A.beginPath();A.moveTo(bx-20,y);A.lineTo(bx+20,y);A.stroke()}
  for(const sx of[bx-23,bx+20]){rr(A,sx,RY-RIV-8,3.4,2*RIV+16,1.5,'#5a3818');for(let y=RY-RIV-6;y<=RY+RIV+6;y+=13)oc(A,sx+1.7,y,2.8,'#7a5028','#3d250f')}}
 A.lineWidth=6;A.strokeStyle='#26304a';A.strokeRect(0,0,W,H);A.lineWidth=1.5;A.strokeStyle='rgba(255,255,255,.12)';A.strokeRect(3.5,3.5,W-7,H-7);
 const V=v.getContext('2d'),vg=V.createRadialGradient(w/2,h/2,w*.4,w/2,h/2,h*.72);vg.addColorStop(0,'rgba(8,10,30,0)');vg.addColorStop(1,'rgba(8,10,30,.42)');V.fillStyle=vg;V.fillRect(0,0,w,h);
 return{b,a,v}}
function pad(g,x,y,s){g.fillStyle='rgba(0,0,0,.2)';g.fillRect(x-s/2+3,y-s/2+4,s,s);
 const pg=g.createLinearGradient(x-s/2,y-s/2,x+s/2,y+s/2);pg.addColorStop(0,TH.pad[0]);pg.addColorStop(1,TH.pad[1]);g.fillStyle=pg;g.fillRect(x-s/2,y-s/2,s,s);
 g.strokeStyle=TH.grout;g.lineWidth=1;g.beginPath();for(let i=1;i<s/10;i++){g.moveTo(x-s/2+i*10,y-s/2);g.lineTo(x-s/2+i*10,y+s/2);g.moveTo(x-s/2,y-s/2+i*10);g.lineTo(x+s/2,y-s/2+i*10)}g.stroke();
 g.strokeStyle='rgba(255,255,255,.28)';g.strokeRect(x-s/2+.5,y-s/2+.5,s-1,s-1)}
function deco(g,kind,x,y,r){
 g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(x+2,y+5,10,3.6,0,0,7);g.fill();
 switch(kind){
  case 'bones':g.strokeStyle='#efe9d6';g.lineWidth=2.2;g.lineCap='round';g.beginPath();g.moveTo(x-7,y+2);g.lineTo(x+5,y-3);g.moveTo(x-5,y-4);g.lineTo(x+6,y+3);g.stroke();oc(g,x+1,y-6,4.2,'#f4efdf','#b9b29c');g.fillStyle='#222';g.fillRect(x-1,y-7,1.6,1.6);g.fillRect(x+1.6,y-7,1.6,1.6);break;
  case 'barrels':rr(g,x-6,y-9,12,13,3,'#8a5a2e');g.fillStyle='#4a5062';g.fillRect(x-6,y-6,12,1.6);g.fillRect(x-6,y,12,1.6);oc(g,x,y-9,5.6,'#a8773e','#5a3818');break;
  case 'pines':poly(g,[[x,y-20],[x-8,y-4],[x+8,y-4]],'#2f6b4a');poly(g,[[x,y-26],[x-6,y-12],[x+6,y-12]],'#3d8a5c');poly(g,[[x,y-26],[x-3,y-19],[x+3,y-19]],'#ffffff');rr(g,x-1.5,y-4,3,5,1,'#6a4a2e');break;
  case 'rocks':oc(g,x-3,y-3,6,'#4a3a35','#2a201d');oc(g,x+4,y-1,4,'#5a4a44','#2a201d');oc(g,x-2,y-4,1.3,'#ff9a2a');break;
  case 'shrooms':rr(g,x-1.3,y-6,2.6,7,1,'#efe2c8');g.beginPath();g.ellipse(x,y-6,6,3.6,0,Math.PI,0);g.fillStyle='#c84bd6';g.fill();oc(g,x-2,y-7.4,1,'#fff');oc(g,x+2.4,y-7,.9,'#fff');rr(g,x+5,y-3,1.8,4,1,'#efe2c8');g.beginPath();g.ellipse(x+5.9,y-3,3,2,0,Math.PI,0);g.fillStyle='#ff6ad5';g.fill();break;
  case 'runes':rr(g,x-5,y-14,10,16,3,'#5a5f72');g.strokeStyle='#8fd0ff';g.lineWidth=1.4;g.beginPath();g.moveTo(x-2,y-10);g.lineTo(x+2,y-6);g.lineTo(x-2,y-2);g.stroke();oc(g,x,y-6,7,'rgba(140,200,255,.12)');break;
  case 'pillars':rr(g,x-4,y-18,8,20,1.5,'#e3d4b0');g.fillStyle='rgba(0,0,0,.12)';g.fillRect(x-1,y-18,1.5,20);rr(g,x-6,y-20,12,3,1,'#cbb98f');rr(g,x-6,y,12,3,1,'#cbb98f');break;
  default:bush(g,x,y)}}
function bush(g,x,y){g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(x+2,y+5,11,4,0,0,7);g.fill();[['#2f7a35',0,0,8],['#3b9141',-5,2,6],['#43a34a',5,1,6],['#59bb5c',-1,-4,4.5]].forEach(([c,dx,dy,rad])=>oc(g,x+dx,y+dy,rad,c))}
function drawRiver(g,now){const y0=RY-RIV,h=2*RIV,rg=g.createLinearGradient(0,y0,0,y0+h);rg.addColorStop(0,TH.w0);rg.addColorStop(.5,TH.w1);rg.addColorStop(1,TH.w0);g.fillStyle=rg;g.fillRect(0,y0,W,h);
 g.lineWidth=1.3;for(let i=0;i<6;i++){g.strokeStyle=`rgba(${TH.wave},${.13+(i%2)*.1})`;g.beginPath();for(let x=0;x<=W;x+=6){const y=y0+5+i*6+Math.sin(x/17+now/650+i*1.7)*1.8;x?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}}

/* мосты: рухнувший закрыт водой с обломками и полосой восстановления, повреждённый — с полосой прочности */
function drawBridges(g,now){const h=CFG.arena.bridgeHalf*TILE;G.bridges.forEach(b=>{
 if(b.down>0){const rg=g.createLinearGradient(0,RY-RIV,0,RY+RIV);rg.addColorStop(0,TH.w0);rg.addColorStop(.5,TH.w1);rg.addColorStop(1,TH.w0);g.fillStyle=rg;g.fillRect(b.x-h-3,RY-RIV,2*h+6,2*RIV);
  g.fillStyle='#7a5232';for(let i=0;i<5;i++){const x=b.x-h+((i*37)%(2*h)),y=RY-RIV+6+((i*23)%(2*RIV-12));g.save();g.translate(x,y+Math.sin(now/500+i)*1.5);g.rotate(i*1.3);g.fillRect(-7,-2,14,4);g.restore()}
  const p=1-b.down/CFG.bridge.down;rr(g,b.x-16,RY-RIV-9,32,5,2.5,'rgba(5,8,20,.75)');rr(g,b.x-15,RY-RIV-8,30*p,3,1.5,'#9fd8ff')}
 else if(b.hp<b.mx){rr(g,b.x-16,RY-RIV-9,32,5,2.5,'rgba(5,8,20,.75)');rr(g,b.x-15,RY-RIV-8,30*b.hp/b.mx,3,1.5,b.fl>0?'#fff':'#ffc83d')}})}
/* ---------- башни ---------- */
function drawTower(g,t,now){const T=TEAM[t.tm],x=t.x,y=t.y,r=t.r,k=t.kind==='k';
 if(t.hp<=0){g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x,y+3,r+4,r*.7,0,0,7);g.fill();
  const rg=mul(t.id*13);for(let i=0;i<10;i++)oc(g,x+(rg()-.5)*r*1.6,y+(rg()-.5)*r*1.1,3+rg()*5,['#6f6a60','#8d8577','#4c4841'][i%3]);
  g.fillStyle='#2f2b26';g.beginPath();g.ellipse(x,y,r*.55,r*.35,0,0,7);g.fill();return}
 g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x+5,y+r*.6,r+4,r*.6,0,0,7);g.fill();
 const body=g.createLinearGradient(x-r,0,x+r,0);body.addColorStop(0,'#928c7c');body.addColorStop(.45,'#dad4c2');body.addColorStop(1,'#857f70');
 if(k){rr(g,x-r,y-r*.8,r*2,r*1.55,7,body);
  for(const[dx,dy]of[[-1,-1],[1,-1],[-1,1],[1,1]]){oc(g,x+dx*r,y+dy*r*.7,7,'#bdb7a5','#6f6a5c',1.2);rr(g,x+dx*r-4,y+dy*r*.7-11,8,5,1,'#8c8676')}
  rr(g,x-r+4,y-r*.8-2,r*2-8,6,2,T.d);for(let i=0;i<5;i++)rr(g,x-r+5+i*10.5,y-r*.8-6,6,5,1,'#cfc9b7');
  rr(g,x-9,y-2,18,16,5,'#2a2e3c');rr(g,x-7,y,14,12,4,'#161925');
  const by=y-r*.55;g.fillStyle=T.m;g.beginPath();g.moveTo(x-12,by);g.lineTo(x+12,by);g.lineTo(x+12,by+16);g.lineTo(x,by+22);g.lineTo(x-12,by+16);g.closePath();g.fill();
  g.fillStyle='#ffc83d';g.beginPath();g.moveTo(x-6,by+14);g.lineTo(x-7,by+5);g.lineTo(x-3,by+9);g.lineTo(x,by+3);g.lineTo(x+3,by+9);g.lineTo(x+7,by+5);g.lineTo(x+6,by+14);g.closePath();g.fill();
  if(t.act){const rec=t.cd>t.hit-.15?3:0;g.save();g.translate(x,y-r*.8-4);g.rotate(t.ang);g.translate(-rec,0);rr(g,0,-4,20,8,3,'#3a3f4c');rr(g,16,-5,6,10,2,'#59607a');g.restore();oc(g,x,y-r*.8-4,6,'#4a5062','#2b2f3a')}
  else{g.fillStyle='#fff';g.font=`800 11px ${FONT}`;g.textAlign='center';g.fillText('z',x+14,y-r+4-Math.sin(now/500)*2);g.font=`800 8px ${FONT}`;g.fillText('z',x+20,y-r-3-Math.sin(now/500+1)*2)}}
 else{const bw=r*1.8,top=y-r*.95;
  rr(g,x-bw/2,top,bw,r*1.8,6,body);g.fillStyle='rgba(0,0,0,.1)';for(let i=1;i<4;i++)g.fillRect(x-bw/2,top+i*9,bw,1.2);
  g.fillStyle='#2a2e3c';g.beginPath();g.roundRect(x-6,y+3,12,12,[6,6,0,0]);g.fill();
  g.fillStyle=T.m;g.beginPath();g.moveTo(x-7,top+5);g.lineTo(x+7,top+5);g.lineTo(x+7,top+18);g.lineTo(x,top+23);g.lineTo(x-7,top+18);g.closePath();g.fill();oc(g,x,top+12,2.8,'#ffc83d');
  rr(g,x-r,top-6,2*r,8,3,'#bdb7a5');for(let i=0;i<5;i++)rr(g,x-r+1+i*(2*r-8)/4,top-12,6,7,1.5,'#cfc9b7');
  archer(g,x,top-3,T,t.ang,t.cd>t.hit-.2)}
 if(t.hp<t.mx*.6){g.strokeStyle='rgba(30,25,20,.6)';g.lineWidth=1.2;g.beginPath();g.moveTo(x-r*.4,y-r*.3);g.lineTo(x-r*.2,y+3);g.lineTo(x-r*.45,y+9);g.stroke()}
 if(t.hp<t.mx*.3){g.beginPath();g.moveTo(x+r*.35,y-r*.35);g.lineTo(x+r*.15,y+2);g.lineTo(x+r*.4,y+8);g.stroke()}
 if(t.fl>0){g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.ellipse(x,y-r*.2,r*1.05,r*.95,0,0,7);g.fill()}
 if(t.frozenT>0)iceBox(g,x-r,y-r*1.25,2*r,r*2.1);
 if(t.stunT>0)stars(g,x,y-r*1.4,now)}
function archer(g,x,y,T,ang,shoot){const dir=Math.cos(ang)<0?-1:1;g.save();g.translate(x,y);g.scale(dir,1);
 rr(g,-4,-10,8,9,3,T.d);oc(g,0,-13,3.6,'#f0c9a0');g.beginPath();g.arc(0,-13.6,4.2,Math.PI*.85,Math.PI*2.15);g.fillStyle=T.m;g.fill();
 g.strokeStyle='#7a4e22';g.lineWidth=1.3;g.beginPath();g.arc(4,-8,6,-1.2,1.2);g.stroke();g.strokeStyle='#ffffffaa';g.lineWidth=.6;g.beginPath();g.moveTo(4+Math.cos(-1.2)*6,-8+Math.sin(-1.2)*6);g.lineTo(shoot?6:2,-8);g.lineTo(4+Math.cos(1.2)*6,-8+Math.sin(1.2)*6);g.stroke();g.restore()}
function iceBox(g,x,y,w,h){g.fillStyle='rgba(175,228,255,.42)';g.strokeStyle='rgba(235,250,255,.9)';g.lineWidth=1.2;g.beginPath();g.roundRect(x,y,w,h,4);g.fill();g.stroke();
 g.strokeStyle='rgba(255,255,255,.7)';g.beginPath();g.moveTo(x+3,y+5);g.lineTo(x+w*.35,y+3);g.moveTo(x+4,y+9);g.lineTo(x+w*.2,y+7);g.stroke()}
function stars(g,x,y,now){for(let i=0;i<3;i++){const a=now/180+i*2.1;star(g,x+Math.cos(a)*8,y+Math.sin(a)*3,2.6)}}
function star(g,x,y,s){g.fillStyle='#ffe066';g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr2=i%2?s*.45:s;g.lineTo(x+Math.cos(a)*rr2,y+Math.sin(a)*rr2)}g.closePath();g.fill()}
function towerBar(g,t){const k=t.kind==='k',by=t.tm?t.y+t.r+12:t.y-t.r-(k?20:30),bw=k?52:44;
 if(t.hp<t.mx*.3){g.strokeStyle=`rgba(255,90,80,${.45+.45*Math.sin(performance.now()/140)})`;g.lineWidth=2;g.beginPath();g.roundRect(t.x-bw/2-3,by-6.5,bw+6,13,6.5);g.stroke()}
 rr(g,t.x-bw/2-1.5,by-5,bw+3,10,5,'rgba(5,8,20,.8)');rr(g,t.x-bw/2,by-3.5,Math.max(0,bw*t.hp/t.mx),7,3.5,t.tm?'#ff6a5a':'#4cc3ff');
 g.fillStyle='#fff';g.font=`800 8.5px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(Math.ceil(t.hp),t.x,by+.5);
 const lx=t.x-bw/2-8;rr(g,lx-6,by-6,12,12,3,t.tm?'#9e2a20':'#1b5ca3');g.fillStyle='#fff';g.font=`800 8px ${FONT}`;g.fillText(G?G.side[t.tm].kl:1,lx,by+.5)}

/* ---------- бойцы, строения, снаряды ---------- */
const US=1.15,topOf=u=>((u.c.fly?FLYOFF:0)+24*(u.c.r>=15?u.c.r/11:1))*US;
function hpBar(g,x,y,w,p,tm,gold){rr(g,x-w/2-1,y-3,w+2,6,3,gold?'#ffd84d':'rgba(5,8,20,.8)');rr(g,x-w/2,y-2,Math.max(0,w*p),4,2,tm?'#ff6a5a':'#4cd37a')}
function drawUnit(g,u,now){if(G.vis&&u.tm===1&&!G.vis[0].has(u)){g.save();g.filter='brightness(0.12)';g.globalAlpha=.8;drawUnit0(g,u,now);g.restore();return}drawUnit0(g,u,now)}
function drawUnit0(g,u,now){const c=u.c,sp=u.spawnT>0?u.spawnT/.3:0,s=US*(1-sp*.4),fy=u.y+(u.fly?8:2);
 if(u.rageT>0){const p=.5+.5*Math.sin(now/110+u.id);g.fillStyle=`rgba(255,70,120,${.2+p*.14})`;g.beginPath();g.ellipse(u.x,fy,u.r+5,(u.r+5)*.5,0,0,7);g.fill()}
 if(u.slowT>0){g.strokeStyle='rgba(150,215,255,.85)';g.lineWidth=1.5;g.beginPath();g.ellipse(u.x,fy,u.r+3,(u.r+3)*.45,0,0,7);g.stroke()}
 if(u.charging){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.4;for(let i=0;i<3;i++){const yy=u.y-6-i*6,x0=u.x-u.face*(u.r+4+i*2);g.beginPath();g.moveTo(x0,yy);g.lineTo(x0-u.face*(8+((now/40+i*7)%6)),yy);g.stroke()}}
 g.globalAlpha=1-sp*.7;
 if(u.evo||u.hero){g.strokeStyle=u.evo?'rgba(199,125,255,.9)':'rgba(255,216,77,.95)';g.lineWidth=2.4;g.beginPath();g.ellipse(u.x,fy,u.r+5,(u.r+5)*.45,0,0,7);g.stroke()}
 const jh=jumpH(u),still=u.frozenT>0||u.stunT>0,drop=(REDUCE||c.fly?0:sp*sp*18)+jh;
 if(drop){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(u.x,u.y+2,c.r*s*1.05,c.r*s*.46,0,0,7);g.fill()}
 drawChar(g,u.key,u.tm,u.x,u.y-drop,{s,dir:u.face||1,ph:still?0:u.ph,at:still?0:u.sw>0?1-u.sw/.28:0,noShadow:!!drop});
 g.globalAlpha=1;
 const top=topOf(u);
 if(u.fl>0){g.fillStyle='rgba(255,255,255,.38)';g.beginPath();g.arc(u.x,u.y-top*.55,u.r+3,0,7);g.fill()}
 if(u.frozenT>0)iceBox(g,u.x-u.r-2,u.y-top-2,2*u.r+4,top+4-(u.fly?FLYOFF-6:0));
 if(u.stunT>0)stars(g,u.x,u.y-top-4,now);
 if(u.shield>0){g.strokeStyle=`rgba(255,216,77,${.45+.4*u.shield/u.smx})`;g.lineWidth=2;g.beginPath();g.ellipse(u.x,u.y-top*.5,u.r+7,top*.62,0,0,7);g.stroke()}}
function drawBuilding(g,b,now){const sp=b.spawnT>0?b.spawnT/.3:0;g.globalAlpha=1-sp*.6;drawChar(g,b.key,b.tm,b.x,b.y,{s:1.1*(1-sp*.3),at:b.at,ang:b.ang});g.globalAlpha=1;
 if(b.fl>0){g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(b.x,b.y-10,14,0,7);g.fill()}
 if(b.frozenT>0)iceBox(g,b.x-15,b.y-26,30,30);if(b.stunT>0)stars(g,b.x,b.y-30,now)}
function drawProj(g,p){const a=Math.atan2(p.ly-p.y,p.lx-p.x);
 switch(p.pk){
  case 'arrow':case 'tower':case 'dagger':g.save();g.translate(p.x,p.y);g.rotate(a);g.strokeStyle='#f1f5fb';g.lineWidth=1.6;g.beginPath();g.moveTo(-9,0);g.lineTo(2,0);g.stroke();poly(g,[[2,-2.2],[6,0],[2,2.2]],'#f1f5fb');g.fillStyle=TEAM[p.tm].m;g.fillRect(-10,-1.8,3,3.6);g.restore();break;
  case 'bolt':g.save();g.translate(p.x,p.y);g.rotate(a);g.strokeStyle='#3a2a1a';g.lineWidth=2;g.beginPath();g.moveTo(-10,0);g.lineTo(3,0);g.stroke();poly(g,[[3,-2.6],[8,0],[3,2.6]],'#c9d2e3');g.restore();break;
  case 'stone':oc(g,p.x,p.y,2.4,'#9a9ca3','#5c5f68');break;
  case 'orb':oc(g,p.x,p.y,8,'rgba(255,120,30,.32)');oc(g,p.x,p.y,4.6,'#ff9a2a');oc(g,p.x,p.y,2.2,'#fff2b0');break;
  case 'flame':for(let i=0;i<3;i++)oc(g,p.x-Math.cos(a)*i*4,p.y-Math.sin(a)*i*4,5-i*1.3,['#ffe27a','#ff9a2a','#ff5a1a'][i]);break;
  case 'ice':oc(g,p.x,p.y,7,'rgba(160,220,255,.35)');g.save();g.translate(p.x,p.y);g.rotate(a);poly(g,[[-6,0],[0,-3],[6,0],[0,3]],'#dff4ff','#8fd0ff');g.restore();break;
  case 'ball':case 'king':case 'tball':oc(g,p.x,p.y,p.pk==='king'||p.pk==='tball'?4.4:3.6,'#2c3040','#8b93a8');break;
  case 'bomb':{const f=p.from,tot=Math.hypot(p.lx-f.x,p.ly-f.y)||1,done=clamp(1-Math.hypot(p.lx-p.x,p.ly-p.y)/tot,0,1),h=Math.sin(done*Math.PI)*(p.hi?70:24);
   g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(p.x,p.y+4,4,2,0,0,7);g.fill();oc(g,p.x,p.y-h,4.4,'#23262e','#697088');oc(g,p.x+3,p.y-h-4,1.3,'#ffcf5a');break}}}
function zig(g,x1,y1,x2,y2,n,amp){g.beginPath();g.moveTo(x1,y1);for(let i=1;i<n;i++){const t=i/n;g.lineTo(x1+(x2-x1)*t+rndV(-amp,amp),y1+(y2-y1)*t+rndV(-amp,amp))}g.lineTo(x2,y2);g.stroke()}
function drawFX(g,f){const t=clamp(f.l/f.m,0,1);
 switch(f.k){
  case 'ring':g.strokeStyle=f.c;g.globalAlpha=1-t;g.lineWidth=3*(1-t)+1;g.beginPath();g.ellipse(f.x,f.y,f.r*(.25+.75*t),f.r*(.25+.75*t)*.75,0,0,7);g.stroke();g.globalAlpha=1;break;
  case 'meteor':{const x=f.x+(f.x2-f.x)*t,y=f.y+(f.y2-f.y)*t-Math.sin(t*Math.PI)*40;g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(f.x2,f.y2,18*t,9*t,0,0,7);g.fill();
   for(let i=6;i>0;i--){const tt=Math.max(0,t-i*.03),xx=f.x+(f.x2-f.x)*tt,yy=f.y+(f.y2-f.y)*tt-Math.sin(tt*Math.PI)*40;g.fillStyle=`rgba(255,${120+i*15},40,${.5-i*.07})`;g.beginPath();g.arc(xx,yy,9-i,0,7);g.fill()}
   oc(g,x,y,9,'#ff8a1f');oc(g,x,y,5,'#fff0b0');break}
  case 'rain':if(f.l>=0){const x=f.x+(f.x2-f.x)*t,y=f.y+(f.y2-f.y)*t;g.strokeStyle='#eef2fa';g.lineWidth=1.6;g.beginPath();g.moveTo(x,y);g.lineTo(x-3,y-9);g.stroke()}break;
  case 'zapring':g.strokeStyle=`rgba(190,230,255,${1-t})`;g.lineWidth=2;for(let i=0;i<8;i++){const a1=i/8*6.28,a2=a1+.7,rr2=f.r*(.6+.4*t);zig(g,f.x+Math.cos(a1)*rr2,f.y+Math.sin(a1)*rr2*.75,f.x+Math.cos(a2)*rr2,f.y+Math.sin(a2)*rr2*.75,3,3)}
   g.fillStyle=`rgba(150,210,255,${.25*(1-t)})`;g.beginPath();g.ellipse(f.x,f.y,f.r,f.r*.75,0,0,7);g.fill();break;
  case 'swirl':g.strokeStyle=`rgba(255,255,255,${.75*(1-t)})`;g.lineWidth=3;g.beginPath();g.ellipse(f.x,f.y-6,f.r*.9,f.r*.6,0,t*6,t*6+3.4);g.stroke();break;
  case 'bolt':g.strokeStyle=`rgba(200,235,255,${1-t})`;g.lineWidth=2.4;zig(g,f.x,f.y,f.x2,f.y2,6,5);g.strokeStyle=`rgba(255,255,255,${1-t})`;g.lineWidth=1;zig(g,f.x,f.y,f.x2,f.y2,6,3);break;
  case 'slash':g.save();g.translate(f.x,f.y);g.rotate(f.a);g.scale(f.s,f.s);g.strokeStyle=`rgba(255,255,255,${.9*(1-t)})`;g.lineWidth=2.6*(1-t)+.6;g.beginPath();g.arc(0,0,9,-2.3+t*1.2,-.6+t*1.2);g.stroke();g.restore();break;
  case 'soul':{const y=f.y-t*26,a=(1-t)*.75;g.fillStyle=`rgba(255,255,255,${a*.5})`;g.beginPath();g.arc(f.x,f.y,(6+t*10)*f.s,0,7);g.fill();
   g.globalAlpha=a;g.fillStyle=f.c;g.beginPath();g.moveTo(f.x-5*f.s,y);g.quadraticCurveTo(f.x,y-14*f.s,f.x+5*f.s,y);g.quadraticCurveTo(f.x+2,y+6+Math.sin(t*20)*2,f.x,y+9*f.s);g.quadraticCurveTo(f.x-2,y+6,f.x-5*f.s,y);g.fill();
   g.fillStyle='#1b2644';g.beginPath();g.arc(f.x-1.6*f.s,y-3*f.s,1*f.s,0,7);g.arc(f.x+1.6*f.s,y-3*f.s,1*f.s,0,7);g.fill();g.globalAlpha=1;break}
  case 'crown':{const p1=Math.min(1,f.l/.45),p2=clamp((f.l-.55)/(f.m-.55),0,1),tx=f.tm?24:W-24,ty=8,e=p2*p2*(3-2*p2),
    x=f.x+(tx-f.x)*e,y=f.y-26*p1+(ty-(f.y-26))*e,sc=(p1<1?p1*1.4:1.4-p2*.6)*(f.n>1?1.3:1);
   g.save();g.translate(x,y);g.scale(sc,sc);g.globalAlpha=p2>.92?(1-p2)/.08:1;
   g.fillStyle=f.tm?'#ff7b6b':'#ffc83d';g.strokeStyle=f.tm?'#7a1a10':'#8a5a00';g.lineWidth=1.6;
   g.beginPath();g.moveTo(-11,9);g.lineTo(-12,-5);g.lineTo(-6,0);g.lineTo(0,-10);g.lineTo(6,0);g.lineTo(12,-5);g.lineTo(11,9);g.closePath();g.fill();g.stroke();
   oc(g,0,-10,2,'#fff');g.restore();g.globalAlpha=1;break}}}
function drawZone(g,z,now){const a=Math.min(1,z.t/.4,(z.tot-z.t)/.2+.2);g.globalAlpha=a;
 if(z.k==='freeze'){g.fillStyle='rgba(170,225,255,.26)';g.strokeStyle='rgba(230,248,255,.85)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke();
  const rg=mul(z.x*7+z.y|0);for(let i=0;i<12;i++){const an=rg()*6.28,d=Math.sqrt(rg())*z.r*.9;star(g,z.x+Math.cos(an)*d,z.y+Math.sin(an)*d*.78,1.6+Math.sin(now/300+i)*.6)}}
 else if(z.k==='rage'){const p=.5+.5*Math.sin(now/150);g.fillStyle=`rgba(255,60,120,${.13+p*.07})`;g.strokeStyle=`rgba(255,120,160,${.6+p*.3})`;g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke()}
 else if(z.k==='poison'){g.fillStyle='rgba(110,210,80,.22)';g.strokeStyle='rgba(150,240,110,.7)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke();
  for(let i=0;i<10;i++){const an=i*2.4+now/1600,d=z.r*(.2+((i*37)%70)/100),ph=(now/900+i*.37)%1;oc(g,z.x+Math.cos(an)*d,z.y+Math.sin(an)*d*.78-ph*8,2+ph*2.5,`rgba(170,255,130,${.6*(1-ph)})`)}}
 else if(z.k==='pull'){g.strokeStyle='rgba(180,220,255,.8)';g.lineWidth=2;for(let i=0;i<3;i++){g.beginPath();g.ellipse(z.x,z.y,z.r*(.35+i*.3),z.r*(.35+i*.3)*.78,now/300+i,0,4.5);g.stroke()}}
 else if(z.k==='roll'){g.fillStyle='#8a5a32';g.strokeStyle='#4a2e18';g.lineWidth=2;rr(g,z.x-z.r,z.y-9,z.r*2,18,8,'#8a5a32');g.stroke();g.fillStyle='#e2b77a';for(const s of[-1,1]){g.beginPath();g.ellipse(z.x+s*z.r,z.y,4,9,0,0,7);g.fill()}
  g.strokeStyle='#5c3a1e';for(let i=0;i<4;i++){const yy=z.y-9+((z.ang*6+i*4.5)%18);g.beginPath();g.moveTo(z.x-z.r+4,yy);g.lineTo(z.x+z.r-4,yy);g.stroke()}}
 else if(z.k==='crater'){g.fillStyle='rgba(60,40,22,.45)';g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.7,0,0,7);g.fill();g.strokeStyle='rgba(30,20,10,.5)';g.lineWidth=1.5;g.stroke()}
 else if(z.k==='flash'){g.fillStyle='rgba(255,246,190,.25)';g.strokeStyle='rgba(255,236,150,.85)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.light,z.light*.78,0,0,7);g.fill();g.stroke()}
 else if(z.k==='shade'){g.fillStyle='rgba(16,8,34,.55)';g.strokeStyle='rgba(150,110,230,.7)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke()}
 else if(z.k==='grave'){g.fillStyle='rgba(70,40,100,.28)';g.strokeStyle='rgba(180,140,255,.7)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke()}
 else if(z.k==='heal'){g.fillStyle='rgba(120,255,160,.2)';g.strokeStyle='rgba(150,255,180,.8)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke()}
 else if(z.k==='aura'){const p=.5+.5*Math.sin(now/120);g.strokeStyle=`rgba(255,216,77,${.5+p*.4})`;g.lineWidth=2.5;g.setLineDash([6,5]);g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.stroke();g.setLineDash([])}
 g.globalAlpha=1}
function drawPending(g,d){const c=CARDS[d.key],tun=d.tun||0,el=d.tot-d.t;
 if(tun&&el<tun){const p=el/tun,x=d.sx+(d.x-d.sx)*p,y=d.sy+(d.y-d.sy)*p;for(let i=0;i<4;i++){const q=Math.max(0,p-i*.04);oc(g,d.sx+(d.x-d.sx)*q,d.sy+(d.y-d.sy)*q,5-i,['#7a5a3c','#6a4a2c','#5a3a1c','#4a2a10'][i])}oc(g,x,y,6.5,'#8a6a4c','#5a3a1c');return}
 const dep=d.tot-tun,left=Math.max(0,d.t),pr=1-left/dep;
 g.globalAlpha=.4;
 if(c.type==='building')drawChar(g,d.key,d.tm,d.x,d.y,{s:1.1,noShadow:1});
 else for(const[px,py]of formation(d.key,d.x,d.y))drawChar(g,c.unit||d.key,d.tm,px,py,{s:US*.95,noShadow:1});
 g.globalAlpha=1;g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=4;g.beginPath();g.arc(d.x,d.y,11,0,7);g.stroke();
 g.strokeStyle=TEAM[d.tm].l;g.lineWidth=3;g.beginPath();g.arc(d.x,d.y,11,-Math.PI/2,-Math.PI/2+pr*Math.PI*2);g.stroke();
 if(dep>=2){g.fillStyle='#fff';g.font=`800 10px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(Math.ceil(left),d.x,d.y+.5)}}
function drawDeployZones(g,key,now){const c=CARDS[key];if(c.type==='spell')return;const p=.5+.5*Math.sin(now/260);
 g.fillStyle=`rgba(255,70,60,${.12+p*.05})`;
 if(c.tunnel){g.fillRect(0,RY-RIV-3,W,2*RIV+6);return}
 g.strokeStyle=`rgba(255,235,150,${.55+p*.3})`;g.setLineDash([7,6]);g.lineWidth=2;
 for(const left of[1,0]){const x0=left?0:W/2,open=pocketOpen(ME,left?10:W-10);
  if(open){g.fillRect(x0,0,W/2,POCKET_Y);g.fillRect(x0,RY-RIV-3,W/2,2*RIV+6);g.beginPath();g.moveTo(x0,POCKET_Y);g.lineTo(x0+W/2,POCKET_Y);g.stroke()}
  else{g.fillRect(x0,0,W/2,RY+RIV+3);g.beginPath();g.moveTo(x0,RY+RIV+3);g.lineTo(x0+W/2,RY+RIV+3);g.stroke()}}
 g.setLineDash([])}
function drawGhost(g,now){if(!G||G.over||sel==null||gx<0||mode!=='play')return;const S=G.side[ME],key=S.hand[sel];if(!key)return;
 const c=CARDS[key],ok=canPlace(ME,key,gx,gy)&&!cardBlocked(ME,key)&&S.el>=c.cost,p=.5+.5*Math.sin(now/200);
 if(c.type==='spell'&&c.roll){const r=c.rad*TILE,L=c.roll.len*TILE;g.fillStyle=`rgba(255,240,200,${.14+p*.08})`;g.strokeStyle='#ffe9a8';g.lineWidth=2;g.setLineDash([6,5]);g.beginPath();g.rect(gx-r,gy-L,r*2,L);g.fill();g.stroke();g.setLineDash([]);return}
 if(c.type==='spell'){const r=c.rad*TILE;g.fillStyle=`rgba(255,240,200,${.14+p*.08})`;g.strokeStyle='#ffe9a8';g.lineWidth=2;g.setLineDash([6,5]);g.beginPath();g.arc(gx,gy,r,0,7);g.fill();g.stroke();g.setLineDash([]);return}
 g.globalAlpha=ok?.62:.3;
 if(c.type==='building')drawChar(g,key,0,gx,gy,{s:1.1});
 else for(const[px,py]of formation(key,gx,gy))drawChar(g,c.unit||key,0,px,py,{s:US});
 g.globalAlpha=1;
 if(c.rng>=3){g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1.2;g.setLineDash([5,5]);g.beginPath();g.arc(gx,gy,c.rng*TILE,0,7);g.stroke();g.setLineDash([])}
 g.strokeStyle=ok?'#9cffb8':'#ff8a7d';g.lineWidth=2;g.beginPath();g.ellipse(gx,gy+3,18,9,0,0,7);g.stroke()}
function drawTexts(g){g.textAlign='center';g.textBaseline='middle';
 for(const x of G.TX){const a=1-x.l/x.m;
  if(x.big){const sc=Math.min(1,x.l/.18),al=Math.min(1,(x.m-x.l)/.4);g.save();g.globalAlpha=al;g.translate(x.x,x.y);g.scale(.6+.4*sc,.6+.4*sc);g.font=`400 ${x.s+8}px 'Lilita One','Russo One',${FONT}`;g.lineWidth=6;g.strokeStyle='rgba(10,12,30,.85)';g.strokeText(x.t,0,0);g.fillStyle=x.c;g.fillText(x.t,0,0);g.restore();continue}
  g.globalAlpha=Math.max(0,a);g.font=`800 ${x.s}px ${FONT}`;g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.7)';g.strokeText(x.t,x.x,x.y);g.fillStyle=x.c;g.fillText(x.t,x.x,x.y)}
 g.globalAlpha=1}
function drawEmotes(g){for(const e of G.EM){const a=Math.min(1,e.l/.15,(e.m-e.l)/.3),bx=e.tm?262:98,by=e.tm?34:604;
 g.globalAlpha=Math.max(0,a);g.font=`800 12px ${FONT}`;const w=g.measureText(e.txt).width+20;
 rr(g,bx-w/2,by-13,w,26,13,e.tm?'#ffe9e6':'#e6f3ff');g.fillStyle=e.tm?'#ffe9e6':'#e6f3ff';g.beginPath();g.moveTo(bx-6,by+(e.tm?-12:12));g.lineTo(bx+(e.tm?-14:14),by+(e.tm?-22:22));g.lineTo(bx+6,by+(e.tm?-12:12));g.fill();
 g.fillStyle='#1b2644';g.textAlign='center';g.textBaseline='middle';g.fillText(e.txt,bx,by+.5);g.globalAlpha=1}}

/* ---------- кадр ---------- */
function draw(now){const g=X;g.setTransform(1,0,0,1,0,0);if(!BG||!G)return;
 g.drawImage(BG.b,0,0);
 let sx=0,sy=0;const shk=G.shake*SHAKE_K[SET.shake];if(shk>0&&!REDUCE){sx=rndV(-1,1)*shk*.5;sy=rndV(-1,1)*shk*.5}
 g.setTransform(K,0,0,K,sx*K,sy*K);
 for(const d of G.DEC){g.fillStyle=`rgba(20,12,6,${Math.min(.42,d.l*.15)})`;g.beginPath();g.ellipse(d.x,d.y,d.r,d.r*.7,0,0,7);g.fill()}
 drawRiver(g,now);
 g.setTransform(1,0,0,1,0,0);g.drawImage(BG.a,sx*K,sy*K);g.setTransform(K,0,0,K,sx*K,sy*K);
 drawBridges(g,now);
 if(sel!=null&&mode==='play'&&!G.over){const key=G.side[ME].hand[sel];if(key)drawDeployZones(g,key,now)}
 for(const z of G.Z)drawZone(g,z,now);
 for(const d of G.D)drawPending(g,d);
 const L=[];for(const t of G.T)L.push([t.y+(t.kind==='k'?10:4),0,t]);for(const b of G.B)L.push([b.y,1,b]);for(const u of G.U)if(!u.fly)L.push([u.y,2,u]);
 L.sort((a,b)=>a[0]-b[0]);for(const[,k,o]of L)k===0?drawTower(g,o,now):k===1?drawBuilding(g,o,now):drawUnit(g,o,now);
 for(const u of G.U.filter(u=>u.fly).sort((a,b)=>a.y-b.y))drawUnit(g,u,now);
 for(const p of G.PR)drawProj(g,p);
 for(const f of G.FX)drawFX(g,f);
 for(const p of G.PT){const a=1-p.l/p.m;g.globalAlpha=Math.max(0,a);g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.s*(.6+a*.5),0,7);g.fill()}g.globalAlpha=1;
 for(const b of G.B)hpBar(g,b.x,b.y-30,28,b.hp/b.mx,b.tm);
 for(const u of G.U){if(u.spawnT>0||G.vis&&u.tm===1&&!G.vis[0].has(u))continue;const y=u.y-topOf(u)-8,w=Math.max(16,u.r*2.2);if(u.hp<u.mx||u.c.ability)hpBar(g,u.x,y,w,u.hp/u.mx,u.tm,!!u.c.ability);if(u.shield>0)rr(g,u.x-w/2,y-6,w*u.shield/u.smx,3,1.5,'#ffd84d')}
 for(const t of G.T)if(t.hp>0)towerBar(g,t);
 for(const f of G.CF){g.save();g.translate(f.x,f.y);g.rotate(f.r);g.globalAlpha=Math.min(1,(f.m-f.l)/.5);g.fillStyle=f.c;g.fillRect(-f.w/2,-f.w/4,f.w,f.w/2);g.restore()}g.globalAlpha=1;
 drawNight(g);
 drawTexts(g);drawEmotes(g);drawAids(g,(x,y)=>[x,y],1,now);drawGhost(g,now);
 g.setTransform(1,0,0,1,0,0);g.drawImage(BG.v,0,0)}

/* ---------- картинка арены для главного экрана ---------- */
function demoTowers(){const T=[];let id=900;for(const tm of[0,1])for(const[kind,x,y]of[['p',70,515],['p',290,515],['k',180,580]]){const d=TOWER[kind];T.push({id:++id,obj:'t',kind,tm,x,y:tm?H-y:y,r:d.r,hp:1,mx:1,hit:d.hit,cd:0,fl:0,act:0,ang:tm?Math.PI/2:-Math.PI/2,frozenT:0,stunT:0})}return T}
function drawThumb(cv,ar){const k=2,y0=22,h=316;cv.width=W*k;cv.height=h*k;const g=cv.getContext('2d'),keep=TH;TH=THEMES[ar||0];const L=buildBG(k);
 g.drawImage(L.b,0,-y0*k);g.setTransform(k,0,0,k,0,-y0*k);drawRiver(g,0);g.setTransform(1,0,0,1,0,0);g.drawImage(L.a,0,-y0*k);g.setTransform(k,0,0,k,0,-y0*k);
 for(const t of demoTowers().filter(t=>t.tm===1))drawTower(g,t,0);
 drawChar(g,'guard',1,96,206,{ph:3,dir:-1});drawChar(g,'sorcerer',1,252,186,{ph:1,dir:-1,at:.6});
 drawChar(g,'giant',0,72,252,{ph:1});drawChar(g,'shooters',0,46,276,{ph:2});drawChar(g,'knightrider',0,288,262,{ph:2,dir:-1});drawChar(g,'drake',0,186,232,{ph:1});
 g.setTransform(1,0,0,1,0,0);g.drawImage(L.v,0,-y0*k);TH=keep}

/* подсказка обучения и режим отладки поверх боя. P(x,y) → точка на холсте, k — масштаб линий */
/* ночь в 2D: темнота поверх поля, в ней вырезаны круги света */
let NC=null;function drawNight(g){const k=nightK();if(k<=0)return;if(!NC){NC=document.createElement('canvas');NC.width=W;NC.height=H}
 const n=NC.getContext('2d');n.globalCompositeOperation='source-over';n.clearRect(0,0,W,H);n.fillStyle=`rgba(6,10,32,${.62*k})`;n.fillRect(0,0,W,H);
 n.globalCompositeOperation='destination-out';for(const s of lightSources()){if(inShade(s))continue;const gr=n.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.7,'rgba(0,0,0,.8)');gr.addColorStop(1,'rgba(0,0,0,0)');n.fillStyle=gr;n.beginPath();n.arc(s.x,s.y,s.r,0,7);n.fill()}
 g.drawImage(NC,0,0)}
function drawAids(g,P,k,now){
 if(G.tutor&&!G.over&&G.t<60&&!G.U.some(u=>u.tm===0)){const[x,y]=P(G.tutor.pt.x,G.tutor.pt.y),r=(16+Math.sin(now/180)*4)*k;
  g.strokeStyle='#ffe066';g.lineWidth=3*k;g.beginPath();g.arc(x,y,r,0,7);g.stroke();g.fillStyle='rgba(255,224,102,.22)';g.beginPath();g.arc(x,y,r,0,7);g.fill()}
 if(!SET.debug)return;
 const circ=(cx,cy,r,col)=>{g.strokeStyle=col;g.beginPath();for(let i=0;i<=28;i++){const a=i/28*6.283,[x,y]=P(cx+Math.cos(a)*r,cy+Math.sin(a)*r);i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()};
 g.lineWidth=1*k;g.font=`700 ${8*k}px sans-serif`;g.textAlign='center';
 for(const t of G.T)if(t.hp>0)circ(t.x,t.y,t.rng,'rgba(255,255,255,.25)');
 for(const u of G.U){const c=u.c;circ(u.x,u.y,sightOf(c)*TILE,'rgba(120,200,255,.35)');circ(u.x,u.y,c.rng*TILE+u.r*.6,'rgba(255,120,90,.6)');
  const[ux,uy]=P(u.x,u.y);
  if(u.tg&&aliveT(u.tg)){const[tx,ty]=P(u.tg.x,u.tg.y);g.strokeStyle=u.tm?'rgba(255,90,80,.8)':'rgba(80,170,255,.8)';g.beginPath();g.moveTo(ux,uy);g.lineTo(tx,ty);g.stroke()}
  if(u.path&&u.path.length){g.strokeStyle='rgba(255,230,90,.85)';g.setLineDash([3*k,3*k]);g.beginPath();g.moveTo(ux,uy);for(const q of u.path){const[x,y]=P(q.x,q.y);g.lineTo(x,y)}g.stroke();g.setLineDash([])}
  g.fillStyle='#fff';g.fillText('m'+Math.round(u.mass)+(u.wu>0?' замах':''),ux,uy+12*k)}}
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
 S3.ghostKey=null;S3.zoneKey='';S3.last=performance.now();R3.on=true;document.body.classList.add('full3d');requestAnimationFrame(()=>{if(typeof fit==='function')fit()});return true}

/* ---------- кадр ---------- */
function r3Frame(now){const dt=Math.min(.05,(now-S3.last)/1000||0);S3.last=now;const sc=S3.scene,cam=S3.cam;
 // тряска камеры
 // конец боя: камера плавно подлетает к упавшему королю (только при победе или поражении башней)
 const kd=G.over&&G.res!==2&&!REDUCE?G.T.find(t=>t.kind==='k'&&t.hp<=0):null;S3.zk=kd?Math.min(1,(S3.zk||0)+dt/.9):Math.max(0,(S3.zk||0)-dt*3);
 const zk=S3.zk*S3.zk*(3-2*S3.zk),kx=kd?W3(kd.x):0,kz=kd?Z3(kd.y):0;
 const sh=G.shake>0&&!REDUCE?G.shake*SHAKE_K[SET.shake]*.02:0;const fl=S3.flip?-1:1,c0x=S3.cam0.x*fl,c0z=S3.cam0.z*fl,lkx=S3.look.x*fl,lkz=S3.look.z*fl;
 cam.position.set(c0x+(kx*.55-c0x)*zk+rndV(-1,1)*sh,S3.cam0.y*(1-.4*zk)+rndV(-1,1)*sh,c0z+(kz*.4+12*fl-c0z)*zk);if(zk>0)cam.lookAt(lkx+(kx-lkx)*zk,0,lkz+(kz-lkz)*zk);else cam.lookAt(lkx,S3.look.y,lkz);
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
function syncGhost(now){const key=sel!=null&&mode==='play'&&G&&!G.over?G.side[ME].hand[sel]:null;
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
 const zk=key&&CARDS[key].type!=='spell'?key+'|'+ME+(CARDS[key].tunnel?1:0)+pocketOpen(ME,10)+pocketOpen(ME,W-10):'';
 if(zk!==S3.zoneKey){S3.zoneKey=zk;if(S3.zoneMesh){S3.dyn.remove(S3.zoneMesh);S3.zoneMesh=null}
  if(zk){const cv=document.createElement('canvas');cv.width=180;cv.height=320;const g=cv.getContext('2d');g.scale(.5,.5);if(ME===1){g.translate(W,H);g.scale(-1,-1)}g.fillStyle='rgba(255,70,60,.38)';const c=CARDS[key];
   if(c.tunnel)g.fillRect(0,RY-RIV-3,W,2*RIV+6);else for(const left of[1,0]){const x0=left?0:W/2,open=pocketOpen(ME,ME===1?(left?W-10:10):(left?10:W-10));if(open){g.fillRect(x0,0,W/2,POCKET_Y);g.fillRect(x0,RY-RIV-3,W/2,2*RIV+6)}else g.fillRect(x0,0,W/2,RY+RIV+3)}
   const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(18,32),new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.1;S3.zoneMesh=m;S3.dyn.add(m)}}
 if(S3.zoneMesh)S3.zoneMesh.material.opacity=.75+.25*Math.sin(now/260);
 if(S3.ghost){const vis=gx>=0;S3.ghost.visible=vis;if(vis){const c=CARDS[key],okk=canPlace(ME,key,gx,gy)&&!cardBlocked(ME,key)&&G.side[ME].el>=c.cost;S3.ghost.position.set(W3(gx),HEIGHT[c.unit||key]&&c.type!=='spell'?0:0,Z3(gy));
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
function overlay(now){const g=X,k=S3.ak||C.height/640;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,C.width,C.height);
 const bar=(sx,sy,w,p,tm,gold)=>{w*=k;rr(g,sx-w/2-k,sy-3*k,w+2*k,6*k,3*k,gold?'#ffd84d':'rgba(5,8,20,.8)');rr(g,sx-w/2,sy-2*k,Math.max(0,w*p),4*k,2*k,tm!==ME?'#ff6a5a':'#4cd37a')};
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
function drawEmotes3(g){const k=S3.ak||C.height/640;for(const e of G.EM){const kt=G.T.find(t=>t.tm===e.tm&&t.kind==='k'),[sx,sy]=proj(kt.x+(e.tm?70:-70),kt.y,e.tm?3:2.4),bx=sx/k,by=sy/k,a=Math.min(1,e.l/.15,(e.m-e.l)/.3);
 g.globalAlpha=Math.max(0,a);g.font=`800 12px ${FONT}`;const w=g.measureText(e.txt).width+20;rr(g,bx-w/2,by-13,w,26,13,e.tm?'#ffe9e6':'#e6f3ff');
 g.fillStyle='#1b2644';g.textAlign='center';g.textBaseline='middle';g.fillText(e.txt,bx,by+.5);g.globalAlpha=1}}
function drawCrown3(g,f,x0,y0){const p1=Math.min(1,f.l/.45),p2=clamp((f.l-.55)/(f.m-.55),0,1),tx=f.tm?24:W-24,ty=8,e=p2*p2*(3-2*p2),x=x0+(tx-x0)*e,y=y0-26*p1+(ty-(y0-26))*e,sc=(p1<1?p1*1.4:1.4-p2*.6)*(f.n>1?1.3:1);
 g.save();g.translate(x,y);g.scale(sc,sc);g.globalAlpha=p2>.92?(1-p2)/.08:1;g.fillStyle=f.tm?'#ff7b6b':'#ffc83d';g.strokeStyle=f.tm?'#7a1a10':'#8a5a00';g.lineWidth=1.6;
 g.beginPath();g.moveTo(-11,9);g.lineTo(-12,-5);g.lineTo(-6,0);g.lineTo(0,-10);g.lineTo(6,0);g.lineTo(12,-5);g.lineTo(11,9);g.closePath();g.fill();g.stroke();oc(g,0,-10,2,'#fff');g.restore();g.globalAlpha=1}

/* ---------- касание: луч из камеры на землю ---------- */
function r3Pick(cx,cy){const r=S3.cv.getBoundingClientRect(),nx=(cx-r.left)/r.width*2-1,ny=-((cy-r.top)/r.height*2-1);if(nx<-1||nx>1||ny<-1||ny>1)return null;
 S3.ray.setFromCamera({x:nx,y:ny},S3.cam);const p=new T.Vector3();if(!S3.ray.ray.intersectPlane(S3.plane,p))return null;
 const x=p.x*TILE+180,y=p.z*TILE+320;return x<0||x>W||y<0||y>H?null:{x,y}}
function r3Resize(cw,ch,ins){if(!R3.ready)return;const d=Math.min(S3.q.dpr,devicePixelRatio||1,S3.q.coarse&&S3.comp?2:9);S3.R.setPixelRatio(d);S3.R.setSize(cw,ch,false);S3.cv.style.width=cw+'px';S3.cv.style.height=ch+'px';S3.cam.aspect=cw/ch;if(ins){const Ae=Math.min(ins.A*1.2,Math.max(ins.A,cw/.5625*.97)),f=2*Math.atan(Math.tan(36.5*Math.PI/360)*ch/Ae)*180/Math.PI;S3.cam.fov=f;S3.cam.setViewOffset(cw,ch,0,-(ins.top-ins.bot)/2,cw,ch)}else{S3.cam.fov=36.5;S3.cam.clearViewOffset()}S3.cam.updateProjectionMatrix();if(S3.comp){S3.comp.setPixelRatio(d);S3.comp.setSize(cw,ch)}if(S3.sharp)S3.sharp.uniforms.px.value.set(1/(cw*d),1/(ch*d))}
/* 3D сломалось на этом устройстве: дальше только 2D, бой продолжается */
function r3Fail(why){if(R3.failed)return;R3.failed=true;R3.why=why;R3.on=false;R3.want=false;r3Stop();console.warn('3D отключено:',why);if(typeof fit==='function')fit();if(typeof toast==='function')toast('3D отключено на этом устройстве — включена упрощённая графика')}
function r3Stop(){R3.on=false;document.body.classList.remove('full3d');if(S3.cv)S3.cv.style.visibility='hidden'}
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
/* ================= ПРОГРЕСС: ПРОФИЛЬ, КАРТЫ, СУНДУКИ, ДОРОГА, МАГАЗИН ================= */
const ARENAS=[
 {n:'Тренировочный лагерь',tr:0},{n:'Костяной овраг',tr:300},{n:'Кузнечная слобода',tr:650},{n:'Морозный перевал',tr:1000},
 {n:'Драконьи скалы',tr:1400},{n:'Ядовитая топь',tr:1800},{n:'Грозовая цитадель',tr:2250},{n:'Каменный трон',tr:2750}];
const ARENA_RULE=['','Ночь длиннее дня','Наземные медленнее на 8%','','Воронки держатся дольше','Воронки тормозят сильнее','Молния бьёт по центру','Мосты прочнее в 1,6 раза'];
const ARENA_OF={shadowblade:5,priest:2,eclipse:7,dawn:4,sapper:4,torchman:0,lantern:1,flash:2,shade:3,roller:4,shieldman:1,mortar:2,grave:6,guard:0,shooters:0,bones:0,imps:0,slingers:0,bomber:0,cannon:0,volley:0,giant:0,crossbow:0,axe:0,fireball:0,
 lair:1,legion:1,wisp:1,spark:1,hammer:2,militia:2,ram:2,bats:3,freeze:3,frostsage:3,drake:4,airship:4,sorcerer:4,
 poison:5,mole:5,scorch:4,vortex:3,spring:2,raider:5,mend:1,cry:5,thunder:6,knightrider:6,colossus:7,warlord:7};
const arenaOf=tr=>{let a=0;ARENAS.forEach((x,i)=>{if(tr>=x.tr)a=i});return a};
const MAXLV=16,KL_MAX=16;
/* уровни карт 1–16; редкость задаёт стартовый уровень (START_LV в 1-data.js).
   Таблицы ниже — по шагу улучшения от стартового уровня: [0] — первое улучшение */
const COPIES={common:[2,4,10,20,50,100,200,400,800,1000,1500,2500,3500,5500,7500],rare:[1,2,4,10,20,50,100,200,300,400,550,750,1000],
 epic:[1,1,2,4,10,20,40,80,120,160],legendary:[1,1,1,2,4,8,12],champion:[1,1,1,2,3]};
const UPGOLD=[10,30,70,150,300,600,1200,2400,4000,6000,9000,13000,18000,25000,35000],RMUL={common:1,rare:1.5,epic:2.5,legendary:4,champion:5};
const UPXP=[4,6,10,20,40,80,150,300,500,800,1200,1700,2300,3000,4000];
const KL_XP=[0,20,60,140,300,600,1100,2000,3500,5500,8000,11000,15000,20000,26000,33000];
const stepOf=k=>P.cards[k].lv-START_LV[CARDS[k].rar];
const CHESTS={
 silver:{n:'Серебряный',time:60,gold:[18,30],cards:5,col:['#dfe6f1','#8a96ab','#5b6579']},
 gold:{n:'Золотой',time:180,gold:[55,85],cards:14,rare:1,col:['#ffe08a','#d99a1e','#8a5a00']},
 magic:{n:'Волшебный',time:480,gold:[140,200],cards:32,rare:4,epic:1,gems:5,col:['#e5b8ff','#9b3fd6','#4e1a7a']},
 giant:{n:'Гигантский',time:480,gold:[260,340],cards:72,rare:6,col:['#ffb27a','#d9622a','#7a2e0a']},
 legend:{n:'Легендарный',time:900,gold:[150,200],cards:1,leg:1,col:['#a8fff0','#2bbfa6','#0d5c50']}};
const CHEST_CYCLE=['silver','silver','gold','silver','silver','gold','silver','magic','silver','gold','silver','silver','gold','giant','silver','gold','silver','magic','silver','gold','silver','silver','gold','legend'];
const ROAD=[{tr:60,g:60},{tr:140,ch:'silver'},{tr:210,gm:10,sh:2},{tr:300,ar:1,ch:'gold'},{tr:380,g:120},{tr:480,cd:['rare',6]},{tr:570,gm:15,sh:3},{tr:650,ar:2,ch:'magic'},
 {tr:740,g:200},{tr:840,ch:'gold'},{tr:920,gm:20,sh:3},{tr:1000,ar:3,ch:'giant'},{tr:1110,g:300},{tr:1230,cd:['epic',2]},{tr:1320,gm:25,sh:4},{tr:1400,ar:4,ch:'magic'},
 {tr:1500,g:400},{tr:1600,ch:'giant'},{tr:1700,gm:30,sh:4},{tr:1800,ar:5,ch:'legend'},{tr:1920,g:500},{tr:2040,cd:['epic',3]},{tr:2150,gm:40,sh:5},{tr:2250,ar:6,ch:'magic'},
 {tr:2380,g:700},{tr:2500,ch:'giant'},{tr:2630,gm:50,sh:6},{tr:2750,ar:7,ch:'legend'},{tr:2900,g:1000},{tr:3100,ch:'magic'},{tr:3300,gm:100}];
const ARENA_LV=[1,1,2,2,3,4,5,6];
const EVO_COST=6,HERO_COST=10;
/* сундук удачи после победы: прокрутка редкости, без таймеров */
const LUCKY=[{t:'silver',p:.5},{t:'gold',p:.3},{t:'magic',p:.13},{t:'giant',p:.05},{t:'legend',p:.02}];
const NDECKS=5;
/* события: особые режимы без кубков */
const EVENTS=[{id:'triple',n:'Тройной эликсир',d:'Эликсир копится втрое быстрее весь бой. Успевай тратить!',c:'#c77dff'},
 {id:'sudden',n:'Внезапная смерть',d:'Кто первым сломает любую башню, тот победил. Эликсир ×2, в последнюю минуту ×3.',c:'#ff5c4d'},
 {id:'draft',n:'Драфт',d:'Колоды собираются прямо перед боем: из каждой пары карт одну берёшь ты, другая уходит сопернику. Уровни карт равные.',c:'#3da5ff'},
 {id:'challenge',n:'Испытание',d:'Играй, пока не проиграешь трижды. Каждая победа поднимает награду (до 12 побед), соперники всё сильнее.',c:'#ffc83d'},
 {id:'midnight',n:'Полночь',d:'Весь бой — ночь. Видно только то, что освещено: берегись теней и бери свет с собой. Награда обычная.',c:'#7a8cff'},
 {id:'double',n:'Двойной эликсир',d:'Эликсир ×2 с первой секунды, старт с нуля.',c:'#e08bff'},
 {id:'random',n:'Случайные колоды',d:'Обе колоды собираются случайно из открытых карт. Уровни карт равные.',c:'#5ec8ff'},
 {id:'train',n:'Тренировка',d:'Обычный бой без кубков с ботом выбранной силы.',c:'#5fe08f'}];
/* ежедневные задания: три на день из пула; stat — что считать после боя */
const QUESTS=[{id:'win',n:'Победи в 2 боях',goal:2,stat:'wins',r:{g:60}},{id:'cards',n:'Сыграй 25 карт',goal:25,stat:'played',r:{g:40}},
 {id:'spells',n:'Сыграй 6 заклинаний',goal:6,stat:'spells',r:{gm:5}},{id:'towers',n:'Сломай 3 башни',goal:3,stat:'towers',r:{g:80}},
 {id:'dmg',n:'Нанеси башням 8000 урона',goal:8000,stat:'dmg',r:{sh:1}},{id:'battles',n:'Сыграй 3 боя',goal:3,stat:'battles',r:{g:40}},
 {id:'three',n:'Победи с тремя коронами',goal:1,stat:'three',r:{gm:10}},
 {id:'bridge',n:'Обрушь вражеский мост',goal:1,stat:'bridges',r:{gm:8}},{id:'night',n:'Сыграй 10 карт ночью',goal:10,stat:'night',r:{g:70}},
 {id:'mid',n:'Победи в режиме «Полночь»',goal:1,stat:'mid',r:{sh:1}}];
/* испытание: награда по числу побед */
const CHAL={maxWins:12,maxLoss:3,bots:['normal','normal','normal','hard','hard','hard','hard','expert','expert','expert','expert','expert'],
 reward:w=>({gold:25*w+3*w*w,gems:w>=6?10+2*(w-6):0,shards:w>=9?2:w>=4?1:0})};
/* клан: соклановцы-боты */
const CLAN_NAME='Дубовый щит';
const CLAN_MATES=[['Варвара Клин',1],['Сыч',2],['Мирон Пушка',0],['Лада Ветер',0],['Кощей-Внук',0],['Гусляр',0],['Полкан',0],['Ёжик в броне',0],['Тихоня',0]];

/* ---------- профиль ---------- */
const SAVE_KEY='ac3.save';
const okDeck=d=>Array.isArray(d)&&d.length===8&&new Set(d).size===8&&d.every(k=>CARD_IDS.includes(k))&&d.filter(k=>CARDS[k].rar==='champion').length<=1;
function freshProfile(){const cards={};for(const k of CARD_IDS)if(ARENA_OF[k]===0)cards[k]={lv:START_LV[CARDS[k].rar],n:0};
 return{q:null,chal:null,tutB:0,v:2,name:'Игрок',kl:1,xp:0,gold:150,gems:30,tr:0,best:0,cards,decks:Array.from({length:NDECKS},()=>DEF_DECK.slice()),slot:0,shards:EVO_COST,evo:[],heroes:[],tt:'archer',luck:[],clan:{req:null,next:0,don:{}},ev:{day:'',won:[]},
  chests:[null,null,null,null],cyc:0,rc:[],shop:null,st:{w:0,l:0,d:0,cr:0,three:0,games:0},tut:0,train:'normal',arSeen:0,fresh:[],hints:[]}}
function sanitize(o){const f=freshProfile();if(!o||typeof o!=='object')return f;
 const num=(v,d,a,b)=>Number.isFinite(v)?clamp(Math.floor(v),a,b):d;
 const P2=Object.assign(f,{name:typeof o.name==='string'&&o.name.trim()?o.name.trim().slice(0,16):'Игрок',kl:num(o.kl,1,1,KL_MAX),xp:num(o.xp,0,0,1e7),gold:num(o.gold,150,0,1e8),gems:num(o.gems,30,0,1e6),
  tr:num(o.tr,0,0,1e5),best:num(o.best,0,0,1e5),slot:num(o.slot,0,0,NDECKS-1),shards:num(o.shards,EVO_COST,0,1e5),tt:TT[o.tt]?o.tt:'archer',cyc:num(o.cyc,0,0,1e6),tut:num(o.tut,0,0,9),arSeen:num(o.arSeen,0,0,7),train:SKILL[o.train]?o.train:'normal'});
 // версия 1 хранила уровни 1–9 от единицы; версия 2 — 1–16 со стартом по редкости
 const old=!(o.v>=2);P2.cards={};
 if(o.cards&&typeof o.cards==='object')for(const k of CARD_IDS){const c=o.cards[k],s0=START_LV[CARDS[k].rar];if(c&&typeof c==='object'){const lv=num(c.lv,1,1,MAXLV);P2.cards[k]={lv:clamp(old?lv-1+s0:lv,s0,MAXLV),n:num(c.n,0,0,1e7)}}}
 for(const k of CARD_IDS)if(ARENA_OF[k]===0&&!P2.cards[k])P2.cards[k]={lv:START_LV[CARDS[k].rar],n:0};
 P2.decks=Array.from({length:NDECKS},(_,i)=>{const d=o.decks&&o.decks[i];return okDeck(d)&&d.every(k=>P2.cards[k])?d.slice():DEF_DECK.slice()});
 // старые сундуки из слотов открываются сразу: таймеров больше нет
 P2.chests=[0,1,2,3].map(i=>{const c=o.chests&&o.chests[i];return c&&CHESTS[c.t]?{t:c.t,a:num(c.a,0,0,7),st:'ready',end:0}:null});
 P2.evo=Array.isArray(o.evo)?[...new Set(o.evo.filter(k=>EVO[k]&&P2.cards[k]))]:[];
 P2.heroes=Array.isArray(o.heroes)?[...new Set(o.heroes.filter(k=>HERO[k]&&P2.cards[k]))]:[];
 P2.luck=Array.isArray(o.luck)?o.luck.filter(a=>Number.isInteger(a)&&a>=0&&a<8).slice(0,6):[];
 const cl=o.clan&&typeof o.clan==='object'?o.clan:{};const rq=cl.req;
 P2.clan={req:rq&&P2.cards[rq.k]&&['common','rare'].includes(CARDS[rq.k].rar)?{k:rq.k,t0:num(rq.t0,0,0,1e15),got:num(rq.got,0,0,40),taken:num(rq.taken,0,0,40),fights:num(rq.fights,0,0,1e4)}:null,next:num(cl.next,0,0,1e15),don:{}};
 if(cl.don&&typeof cl.don==='object')for(const k in cl.don)if(/^\d+:\d$/.test(k))P2.clan.don[k]=num(cl.don[k],0,0,40);
 P2.tutB=num(o.tutB,o.v>=2?0:CFG.tutor.battles,0,CFG.tutor.battles);if(o.st&&o.st.games>0&&!(o.tutB>=0))P2.tutB=CFG.tutor.battles;
 P2.q=o.q&&typeof o.q.day==='string'&&Array.isArray(o.q.list)?{day:o.q.day,list:o.q.list.filter(x=>x&&QUESTS.some(q=>q.id===x.id)).slice(0,3).map(x=>({id:x.id,p:num(x.p,0,0,1e7),got:!!x.got}))}:null;
 P2.chal=o.chal&&typeof o.chal==='object'?{wins:num(o.chal.wins,0,0,CHAL.maxWins),loss:num(o.chal.loss,0,0,CHAL.maxLoss)}:null;
 P2.ev=o.ev&&typeof o.ev.day==='string'?{day:o.ev.day,won:Array.isArray(o.ev.won)?o.ev.won.filter(x=>EVENTS.some(e=>e.id===x)):[]}:{day:'',won:[]};
 P2.rc=Array.isArray(o.rc)?[...new Set(o.rc.filter(i=>Number.isInteger(i)&&i>=0&&i<ROAD.length))]:[];
 if(o.st&&typeof o.st==='object')for(const k in P2.st)P2.st[k]=num(o.st[k],0,0,1e7);
 P2.shop=o.shop&&typeof o.shop.day==='string'?{day:o.shop.day,bought:Array.isArray(o.shop.bought)?o.shop.bought.filter(Number.isInteger):[]}:null;
 P2.fresh=Array.isArray(o.fresh)?o.fresh.filter(k=>CARD_IDS.includes(k)&&P2.cards[k]):[];
 P2.hints=Array.isArray(o.hints)?o.hints.filter(k=>typeof k==='string'&&k.length<20).slice(0,40):[];
 return P2}
/* сохранение с защитой от порчи: сначала копия во временный ключ, потом основной; при загрузке битый основной заменяется копией */
function loadP(){let o=null;try{const raw=localStorage.getItem(SAVE_KEY);o=raw?JSON.parse(raw):null}catch(e){o=null}
 if(!o){try{const t=localStorage.getItem(SAVE_KEY+'.tmp');o=t?JSON.parse(t):null}catch(e){o=null}}return sanitize(o)}
let P=loadP();
function saveP(){const j=JSON.stringify(P);try{localStorage.setItem(SAVE_KEY+'.tmp',j);localStorage.setItem(SAVE_KEY,j);localStorage.removeItem(SAVE_KEY+'.tmp')}catch(e){}}
const curDeck=()=>P.decks[P.slot];
const curArena=()=>arenaOf(P.tr);
/* особые слоты колоды: первый — эволюция, второй — герой (если в колоде нет чемпиона) */
function deckSpecial(d){d=d||curDeck();return{evo:EVO[d[0]]&&P.evo.includes(d[0])?d[0]:null,hero:HERO[d[1]]&&P.heroes.includes(d[1])&&!d.some(k=>CARDS[k].ability)?d[1]:null}}
const collLevel=()=>CARD_IDS.reduce((s,k)=>s+(P.cards[k]?P.cards[k].lv:0),0)+P.evo.length*3+P.heroes.length*5;
function unlockEvo(k){if(!EVO[k]||!P.cards[k]||P.evo.includes(k)||P.shards<EVO_COST)return false;P.shards-=EVO_COST;P.evo.push(k);saveP();return true}
function unlockHero(k){if(!HERO[k]||!P.cards[k]||P.heroes.includes(k)||P.shards<HERO_COST)return false;P.shards-=HERO_COST;P.heroes.push(k);saveP();return true}
/* поставить карту в особый слот: меняется местами с тем, что там стоит */
/* замена карты в колоде: outK — карта колоды; inK — другая карта колоды (меняются местами) или карта коллекции (встаёт вместо неё) */
function trySwap(deck,outK,inK){const d=deck.slice(),i=d.indexOf(outK);if(i<0)return{ok:false,why:'Этой карты нет в колоде'};
 const j=d.indexOf(inK);if(j>=0){[d[i],d[j]]=[d[j],d[i]];return{ok:true,deck:d,swap:1}}
 if(!P.cards[inK])return{ok:false,why:'Эта карта ещё не найдена'};
 d[i]=inK;if(d.filter(k=>CARDS[k].rar==='champion').length>1)return{ok:false,why:'В колоде может быть только один чемпион'};
 if(!okDeck(d))return{ok:false,why:'Такую колоду собрать нельзя'};return{ok:true,deck:d}}
function toSlot(k,i){const d=curDeck().slice(),j=d.indexOf(k);if(j<0)return false;[d[i],d[j]]=[d[j],d[i]];P.decks[P.slot]=d;saveP();return true}

/* ---------- карты и уровни ---------- */
const lvOf=k=>P.cards[k]?P.cards[k].lv:START_LV[CARDS[k].rar];
const needOf=k=>{const c=P.cards[k];return c&&c.lv<MAXLV?COPIES[CARDS[k].rar][stepOf(k)]:0};
const upCost=k=>{const c=P.cards[k];return c&&c.lv<MAXLV?Math.round(UPGOLD[stepOf(k)]*RMUL[CARDS[k].rar]):0};
const canUp=k=>{const c=P.cards[k];return!!c&&c.lv<MAXLV&&c.n>=needOf(k)};
function upgrade(k){if(!canUp(k)||P.gold<upCost(k))return false;const c=P.cards[k];P.gold-=upCost(k);c.n-=needOf(k);c.lv++;addXP(Math.round(UPXP[stepOf(k)-1]*RMUL[CARDS[k].rar]));saveP();return true}
function addXP(x){P.xp+=x;let up=false;while(P.kl<KL_MAX&&P.xp>=KL_XP[P.kl]){P.kl++;up=true}if(up)toast(`Уровень короля ${P.kl}! Башни стали крепче`)}
function giveCard(k,n){if(!P.cards[k]){P.cards[k]={lv:START_LV[CARDS[k].rar],n:n-1};if(!P.fresh.includes(k))P.fresh.push(k);return true}P.cards[k].n+=n;return false}
const levelsMap=()=>{const m={};for(const k of CARD_IDS)m[k]=lvOf(k);return m};

/* ---------- сундуки ---------- */
function rollChest(t,a){const C=CHESTS[t],m=1+.35*a,gold=Math.round(rndV(C.gold[0],C.gold[1])*(1+.3*a)),out=[];
 const pool=r=>CARD_IDS.filter(k=>CARDS[k].rar===r&&ARENA_OF[k]<=a);
 const add=(r,n)=>{const p=pool(r);if(!p.length||n<=0)return 0;const k=pickV(p),e=out.find(x=>x.k===k);if(e)e.n+=n;else out.push({k,n});return n};
 if(C.leg){const L=pool('legendary').concat(a>=7?pool('champion'):[]);if(L.length)out.push({k:pickV(L),n:1});else add('epic',2);return{gold,gems:0,cards:out}}
 let total=Math.round(C.cards*m);
 if(Math.random()<.008*m&&pool('legendary').length){out.push({k:pickV(pool('legendary')),n:1});total--}
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
 if(r.cd){const p=CARD_IDS.filter(k=>CARDS[k].rar===r.cd[0]&&ARENA_OF[k]<=a);if(p.length){const k=pickV(p);res.cards.push({k,n:r.cd[1],isNew:giveCard(k,r.cd[1])})}}
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
/* уровень бота по арене игрока (CFG.bot.byArena) */
const skillFor=a=>CFG.bot.byArena[clamp(a,0,CFG.bot.byArena.length-1)];
function genBotDeck(a){const ok=k=>ARENA_OF[k]<=a,pre=BOT_DECKS.filter(d=>d.every(ok));if(pre.length&&Math.random()<.55)return pickV(pre).slice();
 const pool=CARD_IDS.filter(ok),R=k=>ROLE[k],d=[];
 const put=k=>{if(k&&!d.includes(k)&&d.length<8&&!(CARDS[k].rar==='champion'&&d.some(x=>CARDS[x].rar==='champion')))d.push(k)};
 put(pickV(pool.filter(k=>R(k).win)));
 const sp=pool.filter(k=>R(k).spell&&CARDS[k].dmg);put(pickV(sp.filter(k=>CARDS[k].cost<=3)));put(pickV(sp.filter(k=>CARDS[k].cost>=4)));
 for(const k of shuffleV(pool.filter(k=>CARDS[k].type==='troop'&&CARDS[k].tg==='ga')).slice(0,2))put(k);
 if(Math.random()<.6)put(pickV(pool.filter(k=>R(k).bld)));
 for(const k of shuffleV(pool.filter(k=>!R(k).spell&&!R(k).win)))put(k);
 for(const k of shuffleV(pool))put(k);
 return d}
function botExtras(deck,a){const ex={evo:null,hero:null};
 if(a>=2&&Math.random()<.6){const i=deck.findIndex(k=>EVO[k]);if(i>=0)ex.evo=deck[i]}
 if(a>=4&&Math.random()<.5&&!deck.some(k=>CARDS[k].ability)){const i=deck.findIndex(k=>HERO[k]);if(i>=0)ex.hero=deck[i]}
 return ex}
const botTT=a=>a<1?'archer':pickV(Object.keys(TT));
/* уровни бота считаются «от старта редкости»: rel 0 = стартовый уровень карты */
const relLv=k=>lvOf(k)-START_LV[CARDS[k].rar];
function botSetup(a,train){const deck=genBotDeck(a),avg=curDeck().reduce((s,k)=>s+relLv(k),0)/8,lv={},sk=train?P.train:skillFor(a),L=SKILL[sk];
 const base=(train?avg:(ARENA_LV[a]-1+avg)/2)+L.lvOff;for(const k of deck){const s0=START_LV[CARDS[k].rar];lv[k]=clamp(s0+Math.round(base+(train?0:rndV(-.6,.6))),s0,MAXLV)}
 const kl=P.kl; // башни бота того же уровня, что у игрока
 return{deck,lv,kl,skill:sk,thp:L.thp,ex:botExtras(deck,a),tt:botTT(a)}}
/* трофеи: +30 за победу, −15…−30 за поражение (больше на высоких аренах); первая арена не отнимает */
const TROPHY={win:30,lose:[0,15,18,21,24,26,28,30]};
function trophyDelta(res){const a=curArena();if(res===0)return TROPHY.win;if(res===1)return-TROPHY.lose[a];return 0}

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

/* ---------- задания дня ---------- */
function questsToday(){const d=dayKey();if(!P.q||P.q.day!==d){const r=mul(fnv(d+'|quests')),pool=QUESTS.slice(),list=[];for(let i=0;i<3;i++)list.push({id:pool.splice(Math.floor(r()*pool.length),1)[0].id,p:0,got:false});P.q={day:d,list};saveP()}return P.q.list}
const questOf=x=>QUESTS.find(q=>q.id===x.id);
function questProgress(st){for(const x of questsToday()){const q=questOf(x);if(!x.got)x.p=Math.min(q.goal,x.p+(st[q.stat]||0))}saveP()}
function claimQuest(i){const x=questsToday()[i],q=x&&questOf(x);if(!q||x.got||x.p<q.goal)return null;x.got=true;P.gold+=q.r.g||0;P.gems+=q.r.gm||0;P.shards+=q.r.sh||0;saveP();return q.r}
const questReady=()=>questsToday().some(x=>!x.got&&x.p>=questOf(x).goal);
/* ---------- испытание ---------- */
function chalStart(){if(!P.chal){P.chal={wins:0,loss:0};saveP()}return P.chal}
function chalResult(won){const c=chalStart();if(won)c.wins++;else c.loss++;const end=c.wins>=CHAL.maxWins||c.loss>=CHAL.maxLoss;let R=null;
 if(end){R=CHAL.reward(c.wins);R.wins=c.wins;P.gold+=R.gold;P.gems+=R.gems;P.shards+=R.shards;P.chal=null}saveP();return{c,end,R}}
const chalBot=()=>CHAL.bots[Math.min(CHAL.bots.length-1,(P.chal?P.chal.wins:0))];
/* случайные колоды: 8 карт из открытых на арене, не больше одного чемпиона */
function randomDeck(){const a=curArena(),pool=shuffleV(CARD_IDS.filter(k=>ARENA_OF[k]<=Math.max(a,1))),d=[];for(const k of pool){if(d.length<8&&!(CARDS[k].ability&&d.some(x=>CARDS[x].ability)))d.push(k)}return d}

/* ---------- события ---------- */
function evDay(){const d=dayKey();if(P.ev.day!==d)P.ev={day:d,won:[]};return P.ev}
function eventReward(id){const e=evDay(),first=!e.won.includes(id),a=curArena(),g=first?40+15*a:10+3*a;P.gold+=g;let sh=0;if(first){e.won.push(id);sh=1;P.shards+=1}saveP();return{gold:g,shards:sh,first}}
/* драфт: восемь пар карт; одну берёт игрок, другую соперник */
function draftPairs(){const a=curArena(),pool=shuffleV(CARD_IDS.filter(k=>ARENA_OF[k]<=Math.max(a,2)&&!CARDS[k].ability)),pairs=[];for(let i=0;i<8;i++)pairs.push([pool[i*2],pool[i*2+1]]);return pairs}

/* ---------- сохранение кодом ---------- */
function exportCode(){const b=new TextEncoder().encode(JSON.stringify(P));let bin='';for(const x of b)bin+=String.fromCharCode(x);const c=btoa(bin);return'AC3-'+fnv(c).toString(36)+'-'+c}
function importCode(code){const m=/^AC3-([0-9a-z]+)-([A-Za-z0-9+/=]+)$/.exec((code||'').replace(/\s+/g,''));
 if(!m)return'Это не похоже на код сохранения Arena Clash';if(fnv(m[2]).toString(36)!==m[1])return'Код повреждён: скопируй его целиком';
 let o;try{const bin=atob(m[2]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);o=JSON.parse(new TextDecoder().decode(u))}catch(e){return'Не удалось прочитать код'}
 P=sanitize(o);saveP();return null}
/* ================= ИГРА ПО СЕТИ: синхронный ход (lockstep) =================
   У обоих игроков идёт одна и та же детерминированная симуляция. Между ними летают только команды:
   «карта i в точку x,y» или «способность». Команда, нажатая на тике t, выполняется у обоих на тике t+NET_D+1,
   поэтому оба успевают её получить. Симуляция делает шаг, только когда есть команды (пусть пустые) обеих сторон на этот тик;
   иначе ждёт («Ждём соперника»). Раз в NET_HASH_EVERY тиков стороны сверяют контрольную сумму состояния: расхождение — бой останавливается.
   Транспорт — любой объект {send(msg), close()}, у которого мы ставим onmsg/onclose (PeerJS в игре, заглушка в тестах). */
let ME=0;                       // какая сторона моя: 0 — внизу, 1 — гость сети (камера развёрнута)
const NET_BUILD='f7b280c8ef';    // версия игры: у друзей должна совпадать, иначе бой разойдётся
const NET_D=5,NET_HASH_EVERY=60;
const NET={on:false,tr:null,me:0,in:[new Map(),new Map()],out:[],mine:new Map(),theirs:new Map(),fail:null,gone:false,waitT:0};
/* контрольная сумма состояния: всё, что влияет на исход боя, округлено до 1e-4 */
function stateHash(){let h=2166136261>>>0;const mix=v=>{h=Math.imul(h^(Math.round(v*1e4)|0),16777619)>>>0};
 mix(G.tick);for(const S of G.side){mix(S.el);mix(S.abCd||0);for(const k of S.hand)mix(k?k.length:0)}
 for(const u of G.U){mix(u.id);mix(u.x);mix(u.y);mix(u.hp);mix(u.shield||0)}
 for(const b of G.B){mix(b.id);mix(b.x);mix(b.hp)}for(const t of G.T)mix(t.hp);
 for(const z of G.Z){mix(z.x);mix(z.y);mix(z.t)}for(const p of G.PR){mix(p.x);mix(p.y)}
 mix(G.crowns[0]*3+G.crowns[1]);return h>>>0}
function netInit(tr,me){NET.on=true;NET.tr=tr;NET.me=me;NET.in=[new Map(),new Map()];NET.out=[];NET.mine=new Map();NET.theirs=new Map();NET.fail=null;NET.gone=false;NET.waitT=0;NET.lastRx=Date.now();
 for(let t=1;t<=NET_D;t++){NET.in[0].set(t,[]);NET.in[1].set(t,[])}
 tr.onmsg=netRecv;tr.onclose=()=>{NET.gone=true}}
function netOff(){NET.on=false;if(NET.tr){try{NET.tr.onmsg=null;NET.tr.onclose=null;NET.tr.close()}catch(e){}}NET.tr=null}
/* локальная команда игрока: уйдёт соперникам в ближайшем кадре */
function netCmd(c){if(NET.on&&G&&!G.over&&!NET.fail)NET.out.push(c)}
const netReady=()=>NET.on&&!NET.fail&&NET.in[0].has(G.tick+1)&&NET.in[1].has(G.tick+1);
/* в начале шага: выполнить команды обеих сторон на этот тик, сначала сторона 0 */
function netApply(){const T=G.tick+1;for(const tm of[0,1]){const f=NET.in[tm].get(T);NET.in[tm].delete(T);if(f)for(const c of f){if(c.k==='p')playCard(tm,c.i,c.x,c.y);else if(c.k==='a')useAbility(tm)}}}
/* после шага: отправить свой кадр на tick+NET_D и раз в секунду-две — контрольную сумму */
function netAfterStep(){const t=G.tick,T=t+NET_D,c=NET.out;NET.out=[];NET.in[NET.me].set(T,c);NET.tr.send({k:'f',tk:T,c});
 if(t%NET_HASH_EVERY===0){const h=stateHash();NET.mine.set(t,h);NET.tr.send({k:'h',tk:t,h});netCheck(t)}}
function netRecv(m){if(!NET.on||!m)return;NET.lastRx=Date.now();
 if(m.k==='f')NET.in[1-NET.me].set(m.tk,m.c||[]);
 else if(m.k==='h'){NET.theirs.set(m.tk,m.h);netCheck(m.tk)}
 else if(m.k==='e'&&G&&!G.over)emote(1-NET.me,m.i)
 else if(NETL.onx)NETL.onx(m)}
function netCheck(t){const a=NET.mine.get(t),b=NET.theirs.get(t);if(a==null||b==null)return;NET.mine.delete(t);NET.theirs.delete(t);if(a!==b){if(!NET.fail){NET.fail='desync';NET.failTick=t}}else NET.checked=(NET.checked||0)+1}
/* один шаг в сетевом бою: false, если ждём соперника */
function netStep(){if(!netReady())return false;step(TICK);if(NET.on&&G)netAfterStep();return true}

/* ---------- соединение: комната по коду через PeerJS (WebRTC напрямую между телефонами) ---------- */
const ROOM_CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',roomId=c=>'arenaclash-'+c;
const NETL={peer:null,tr:null,code:'',st:'idle',msg:'',ui:null,onx:null,rm:{me:false,they:false},setup:null};
function netLobbyState(st,msg){NETL.st=st;NETL.msg=msg||'';if(NETL.ui)NETL.ui()}
const NET_ICE=[{urls:['stun:stun.l.google.com:19302','stun:stun.cloudflare.com:3478']},
 {urls:['turn:openrelay.metered.ca:80','turn:openrelay.metered.ca:443','turn:openrelay.metered.ca:443?transport=tcp','turns:openrelay.metered.ca:443?transport=tcp'],username:'openrelayproject',credential:'openrelayproject'}];
function netPeerOpts(){const q=typeof location!=='undefined'?new URLSearchParams(location.search):null,h=q&&q.get('peerhost')||'';
 const config={iceServers:NET_ICE,iceCandidatePoolSize:4};if(q&&q.get('relay'))config.iceTransportPolicy='relay';
 if(h){const[a,b]=h.split(':');return{host:a,port:+b||9000,path:'/',secure:false,debug:0,config}}return{debug:0,config}}
const NET_FAIL='Не вышло соединиться. Откройте игру в Safari или Chrome (не во встроенном браузере Telegram), включите мобильный интернет или Wi‑Fi у обоих и попробуйте снова';
/* следим за поиском пути: показываем этап и сдаёмся через 25 с */
function netWatch2(conn,t){try{const pc=conn.peerConnection;if(pc)pc.addEventListener('iceconnectionstatechange',()=>{if(NETL.st!=='hand')return;const s=pc.iceConnectionState;if(s==='checking')netLobbyState('hand','Ищу путь к другу…');else if(s==='failed'){clearTimeout(t);netLobbyState('err',NET_FAIL)}})}catch(e){}}
function netErr(e){const t=e&&e.type;return t==='peer-unavailable'?'Комната не найдена. Проверь код':t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed'?'Нет связи с сервером комнат. Проверь интернет':t==='browser-incompatible'?'Этот браузер не поддерживает игру по сети':'Не удалось соединиться'}
function netCancel(){try{if(NETL.tr){NETL.tr.onmsg=null;NETL.tr.onclose=null;NETL.tr.close()}}catch(e){}try{if(NETL.peer)NETL.peer.destroy()}catch(e){}NETL.peer=null;NETL.tr=null;NETL.onx=null;NETL.st='idle'}
function wrapConn(conn){const tr={onmsg:null,onclose:null,send:m=>{try{conn.send(m)}catch(e){}},close:()=>{try{conn.close()}catch(e){}}};
 conn.on('data',m=>{if(tr.onmsg)tr.onmsg(m)});
 try{const pc=conn.peerConnection;if(pc)pc.addEventListener('connectionstatechange',()=>{if(pc.connectionState==='failed'||pc.connectionState==='closed'){if(tr.onclose)tr.onclose()}})}catch(e){}conn.on('close',()=>{if(tr.onclose)tr.onclose()});conn.on('error',()=>{if(tr.onclose)tr.onclose()});return tr}
const netConnOpts={reliable:true,serialization:'json'};
/* честные уровни для дружеского боя: у всех карт стартовый уровень арены */
function netEqLv(a){const eq={};for(const k of CARD_IDS)eq[k]=START_LV[CARDS[k].rar]+ARENA_LV[a];return eq}
function netHost(){netCancel();
 if(typeof Peer==='undefined'){netLobbyState('err','Игра по сети работает только на сайте, в браузере');return}
 const code=Array.from({length:5},()=>ROOM_CH[Math.random()*ROOM_CH.length|0]).join('');NETL.code=code;netLobbyState('wait','Создаю комнату…');
 const peer=NETL.peer=new Peer(roomId(code),netPeerOpts());
 peer.on('open',()=>netLobbyState('wait','Жду друга. Отправь ему код или ссылку'));
 peer.on('error',e=>{if(e&&e.type==='unavailable-id'){netHost();return}netLobbyState('err',netErr(e))});
 peer.on('connection',conn=>{if(NETL.tr){conn.close();return}const tr=NETL.tr=wrapConn(conn);netLobbyState('hand','Друг подключается…');const th=setTimeout(()=>{if(NETL.st==='hand'){netLobbyState('err',NET_FAIL)}},25000);netWatch2(conn,th);
  tr.onmsg=m=>{if(m.k!=='hello')return;clearTimeout(th);
   if(m.build!==NET_BUILD){tr.send({k:'bad',why:'У друга другая версия игры: пусть обновит страницу'});netLobbyState('err','У друга другая версия игры: пусть обновит страницу');return}
   if(!okDeck(m.deck)){tr.send({k:'bad',why:'Колода друга не подходит'});netLobbyState('err','Колода друга не подходит');return}
   netHostGo(tr,m)};
  tr.onclose=()=>{clearTimeout(th);if(NETL.st!=='play')netLobbyState('err','Друг отключился')}})}
function netHostGo(tr,hello,again){const a=again?NETL.setup.arena:curArena(),eq=netEqLv(a),
 setup={seed:Math.floor(Math.random()*2147483647),arena:a,names:[again?NETL.setup.names[0]:P.name,again?NETL.setup.names[1]:String(hello.name||'Друг').slice(0,16)],decks:again?NETL.setup.decks:[curDeck(),hello.deck],lv:[eq,eq],kl:[11,11],tt:again?NETL.setup.tt:[P.tt,TT[hello.tt]?hello.tt:'archer'],build:NET_BUILD};
 NETL.setup=setup;tr.send({k:'go',setup});netGo(setup,0,tr)}
function netJoin(code){netCancel();code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(code.length!==5){netLobbyState('err','Код — 5 символов');return}
 if(typeof Peer==='undefined'){netLobbyState('err','Игра по сети работает только на сайте, в браузере');return}
 netLobbyState('hand','Подключаюсь…');const peer=NETL.peer=new Peer(netPeerOpts()),t0=setTimeout(()=>{if(NETL.st==='hand')netLobbyState('err',NET_FAIL)},25000);
 peer.on('error',e=>{clearTimeout(t0);netLobbyState('err',netErr(e))});
 peer.on('open',()=>{const conn=peer.connect(roomId(code),netConnOpts),tr=NETL.tr=wrapConn(conn);netWatch2(conn,t0);
  conn.on('open',()=>tr.send({k:'hello',build:NET_BUILD,name:P.name,deck:curDeck(),tt:P.tt}));
  tr.onmsg=m=>{if(m.k==='go'){clearTimeout(t0);NETL.setup=m.setup;netGo(m.setup,1,tr)}else if(m.k==='bad'){clearTimeout(t0);netLobbyState('err',m.why||'Хозяин отказал')}};
  tr.onclose=()=>{clearTimeout(t0);if(NETL.st!=='play')netLobbyState('err','Соединение закрыто')}})}
function netGo(setup,me,tr){NETL.st='play';NETL.rm={me:false,they:false};NETL.onx=m=>{if(m.k==='rm'){NETL.rm.they=true;netRematchCheck()}else if(m.k==='go'&&me===1){NETL.setup=m.setup;netGo(m.setup,1,tr)}};
 startNetBattle(setup,me,tr)}
/* «Реванш»: когда нажали оба, хозяин присылает новый seed */
function netRematch(){NETL.rm.me=true;NET.tr.send({k:'rm'});netRematchCheck()}
function netRematchCheck(){if(NETL.rm.me&&NETL.rm.they&&NET.me===0){NETL.rm={me:false,they:false};netHostGo(NET.tr,null,true)}}
/* ================= ИНТЕРФЕЙС ================= */
const NAVI={
 shop:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 20h34v19a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z" fill="#b8692c" stroke="#5a2e0e" stroke-width="2.4"/><path d="M7 20c0-8 7-13 17-13s17 5 17 13z" fill="#d98a3a" stroke="#5a2e0e" stroke-width="2.4"/><path d="M7 24h34" stroke="#ffc83d" stroke-width="4"/><rect x="19" y="21" width="10" height="11" rx="2" fill="#ffe08a" stroke="#8a5a00" stroke-width="2"/><path d="M14 9l2 4M34 9l-2 4" stroke="#5ef2d0" stroke-width="3" stroke-linecap="round"/></svg>',
 cards:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="16" y="6" width="22" height="30" rx="4" transform="rotate(14 27 21)" fill="#9b5de5" stroke="#3b1a66" stroke-width="2.4"/><rect x="9" y="11" width="22" height="30" rx="4" fill="#3da5ff" stroke="#123a75" stroke-width="2.4"/><path d="M13 16h14v11H13z" fill="#a6d6ff" opacity=".7"/></svg>',
 play:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 7l23 23-4 4L5 11V7z" fill="#dfe6f1" stroke="#3a4560" stroke-width="2.2"/><path d="M39 7L16 30l4 4L43 11V7z" fill="#dfe6f1" stroke="#3a4560" stroke-width="2.2"/><path d="M12 32l4 4-5 5-4-4zM36 32l-4 4 5 5 4-4z" fill="#ffc83d" stroke="#8a5a00" stroke-width="2"/><path d="M10 29l9 9M38 29l-9 9" stroke="#d98a3a" stroke-width="4" stroke-linecap="round"/></svg>',
 clan:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4l17 6v13c0 10-7 17-17 21C14 40 7 33 7 23V10z" fill="#2f6fd6" stroke="#0e2a5c" stroke-width="2.4"/><circle cx="24" cy="19" r="5" fill="#fff"/><circle cx="15" cy="22" r="3.6" fill="#cfe3ff"/><circle cx="33" cy="22" r="3.6" fill="#cfe3ff"/><path d="M15 33c1-6 17-6 18 0" fill="#fff"/></svg>',
 events:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 5l5.8 11.8 13 1.9-9.4 9.2 2.2 12.9L24 34.7l-11.6 6.1 2.2-12.9-9.4-9.2 13-1.9z" fill="#ffc83d" stroke="#8a5a00" stroke-width="2.4" stroke-linejoin="round"/><circle cx="24" cy="24" r="5" fill="#fff3c0"/></svg>'};
const ICO={
 swords:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 4l11.5 11.5M20 4L8.5 15.5M6 13.5l4.5 4.5M18 13.5L13.5 18M5 19l-1.5 1.5M19 19l1.5 1.5"/></svg>',
 cards:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="11" height="14" rx="2"/><path d="M8 3.5h10.5a2 2 0 0 1 2 2V18"/></svg>',
 shop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h16l-1.4 11.2a1 1 0 0 1-1 .8H6.4a1 1 0 0 1-1-.8z"/><path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2"/></svg>',
 road:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M7 21c0-4.5 10-4 10-8.5S7 8 7 3.5"/><circle cx="17" cy="4" r="2"/></svg>',
 trophy:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffc83d" d="M6 3h12v2h3v3.5a4.5 4.5 0 0 1-4.1 4.5 6 6 0 0 1-3.9 3.4V19h3v2H8v-2h3v-2.6A6 6 0 0 1 7.1 13 4.5 4.5 0 0 1 3 8.5V5h3zm0 4H5v1.5a2.5 2.5 0 0 0 1.4 2.2A6 6 0 0 1 6 9zm12 0v2a6 6 0 0 1-.4 1.7A2.5 2.5 0 0 0 19 8.5V7z"/></svg>',
 gold:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#ffc83d" stroke="#a8730a" stroke-width="1.8"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#c8901a" stroke-width="1.6"/><path d="M8.6 8.2l1.3 1.3" stroke="#fff3c0" stroke-width="1.4" stroke-linecap="round"/></svg>',
 gem:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11l4 5.5L12 21 2.5 9z" fill="#5fe08f" stroke="#1d7a3f" stroke-width="1.5" stroke-linejoin="round"/><path d="M2.5 9h19M8.5 3.5 7 9l5 12 5-12-1.5-5.5" fill="none" stroke="#1d7a3f" stroke-width="1.1" stroke-linejoin="round"/></svg>',
 gear:'<svg viewBox="0 0 24 24" aria-hidden="true"><g>'+[0,45,90,135,180,225,270,315].map(a=>`<rect x="10.4" y="1.6" width="3.2" height="5" rx="1" transform="rotate(${a} 12 12)"/>`).join('')+'<circle cx="12" cy="12" r="6.6"/></g><circle cx="12" cy="12" r="2.7" fill="#1b2644"/></svg>',
 clan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8l7.5 3v6c0 4.6-3.2 8-7.5 9.4C7.7 19.8 4.5 16.4 4.5 11.8v-6z"/><path d="M9 11.5l2.2 2.2L15.5 9"/></svg>',
 events:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6L12 16.4 6.6 19.4l1.2-6-4.5-4.1 6.1-.7z"/></svg>',
 shard:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l6 7-6 13-6-13z" fill="#c77dff" stroke="#5a1f8a" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 9h12M12 2v20" stroke="#e9c8ff" stroke-width="1" fill="none"/></svg>',
 lock:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zm2 0h6V8a3 3 0 0 0-6 0z"/></svg>'};
const crownSVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19l-1-12 5.5 4.5L12 4l4.5 7.5L22 7l-1 12z"/></svg>';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtN=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const fmtT=s=>{s=Math.ceil(s);if(s>=60){const m=s/60|0,r=s%60;return r?`${m} мин ${r} с`:`${m} мин`}return`${s} с`};
const plural=(n,a,b,c)=>{n=Math.abs(n)%100;const d=n%10;return n>10&&n<20?c:d===1?a:d>=2&&d<=4?b:c};
const avgCost=d=>(d.reduce((s,k)=>s+CARDS[k].cost,0)/d.length).toFixed(1);
const paintIcons=root=>{root.querySelectorAll('canvas[data-ic]').forEach(cv=>{const g=cv.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.clearRect(0,0,cv.width,cv.height);g.drawImage(icon(cv.dataset.ic),0,0,cv.width,cv.height)});
 root.querySelectorAll('canvas[data-chest]').forEach(cv=>drawChest(cv.getContext('2d'),cv.dataset.chest,false,cv.width,cv.height))};
const SORTED=CARD_IDS.slice().sort((a,b)=>RAR_ORDER.indexOf(CARDS[a].rar)-RAR_ORDER.indexOf(CARDS[b].rar)||CARDS[a].cost-CARDS[b].cost);
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;$('#toasts').appendChild(d);setTimeout(()=>d.remove(),3300)}

/* сундук: корпус, полосы, крышка и замок; открытый — со светом изнутри */
function drawChest(g,t,open,w,h){const C=CHESTS[t].col,s=Math.min(w/120,h/100);g.clearRect(0,0,w,h);g.save();g.translate(w/2,h*.6);g.scale(s,s);
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(0,34,48,8,0,0,7);g.fill();
 if(open){const gl=g.createRadialGradient(0,-14,4,0,-14,64);gl.addColorStop(0,'rgba(255,244,190,.95)');gl.addColorStop(1,'rgba(255,244,190,0)');g.fillStyle=gl;g.beginPath();g.arc(0,-14,64,0,7);g.fill()}
 const body=g.createLinearGradient(0,-10,0,34);body.addColorStop(0,C[0]);body.addColorStop(1,C[1]);rr(g,-44,-8,88,42,8,body);
 g.fillStyle=C[2];g.fillRect(-44,-8,88,4);
 for(const x of[-28,28]){rr(g,x-5,-8,10,42,2,'#f0dfa2');g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+3,-8,2,42)}
 g.save();if(open){g.translate(0,-26);g.rotate(-.18);g.translate(0,-10)}
 const lid=g.createLinearGradient(0,-44,0,-6);lid.addColorStop(0,C[0]);lid.addColorStop(1,C[1]);
 g.beginPath();g.moveTo(-46,-6);g.lineTo(-46,-18);g.quadraticCurveTo(0,-54,46,-18);g.lineTo(46,-6);g.closePath();g.fillStyle=lid;g.fill();g.strokeStyle=C[2];g.lineWidth=2;g.stroke();
 for(const x of[-28,28]){g.fillStyle='#f0dfa2';g.beginPath();g.moveTo(x-5,-6);g.lineTo(x-5,-26-(x<0?-2:-2));g.quadraticCurveTo(x,-36,x+5,-27);g.lineTo(x+5,-6);g.closePath();g.fill()}
 g.restore();
 if(!open){rr(g,-9,-16,18,20,4,'#f6e7b0');g.strokeStyle='#8a6a20';g.lineWidth=1.5;g.strokeRect(-9,-16,18,20);oc(g,0,-8,3.4,'#5a4a20');g.fillStyle='#5a4a20';g.fillRect(-1.4,-8,2.8,7)}
 else for(let i=0;i<7;i++){const a=-Math.PI/2+(i-3)*.32;g.strokeStyle=`rgba(255,240,170,${.5-Math.abs(i-3)*.1})`;g.lineWidth=3;g.beginPath();g.moveTo(Math.cos(a)*14,-14+Math.sin(a)*14);g.lineTo(Math.cos(a)*58,-14+Math.sin(a)*58);g.stroke()}
 if(t==='magic'||t==='legend')for(let i=0;i<5;i++)star(g,-38+i*19,-46+(i%2)*10,2.2);
 g.restore()}

/* ---------- шапка и вкладки ---------- */
let tab='play',pick=null,lastSwap=null;
const TABS=[['shop','Магазин',NAVI.shop],['cards','Колоды',NAVI.cards],['play','Бой',NAVI.play],['clan','Клан',NAVI.clan],['events','События',NAVI.events]];
function renderHeader(){const nx=P.kl<KL_MAX?KL_XP[P.kl]:1,pv=P.kl>1?KL_XP[P.kl-1]:0,x=P.kl<KL_MAX?clamp((P.xp-pv)/(nx-pv),0,1):1;
 const pill=(id,ic,v,plus,lab)=>`<button class="rp" id="${id}" aria-label="${lab}: ${v}"><span class="ri">${ic}</span><b>${v}</b>${plus?'<i class="plus" aria-hidden="true">+</i>':''}</button>`;
 $('#hh').innerHTML=`${pill('rtr',ICO.trophy,fmtN(P.tr),0,'Кубки')}${pill('rgo',ICO.gold,fmtN(P.gold),1,'Золото')}${pill('rge',ICO.gem,fmtN(P.gems),1,'Кристаллы')}
  <button class="gear" id="gear" aria-label="Настройки и сохранение">${ICO.gear}</button>`;
 $('#gear').onclick=()=>{AU.init();AU.sfx('ui');openSettings()};
 $('#rtr').onclick=()=>{AU.init();AU.sfx('ui');tab='road';renderHome()};
 $('#rgo').onclick=$('#rge').onclick=()=>{AU.init();AU.sfx('ui');tab='shop';renderHome()};
}
/* счётчики на вкладках, как красные кружки с числом */
function navCounts(){const rs=reqState();return{play:ROAD.filter((_,i)=>roadReady(i)).length+P.luck.length+P.chests.filter(c=>c).length,
 clan:(rs&&rs.got>rs.q.taken?1:0)+(canRequest()?1:0),events:questsToday().filter(x=>!x.got&&x.p>=questOf(x).goal).length+EVENTS.filter(e=>e.id!=='train'&&!evDay().won.includes(e.id)).length,
 cards:CARD_IDS.filter(k=>canUp(k)&&P.gold>=upCost(k)).length+P.fresh.length,shop:P.shop&&P.shop.day===dayKey()&&P.shop.bought.includes(0)?0:1}}
function renderNav(){const n=$('#nav'),cnt=navCounts(),cur=tab==='road'?'play':tab;
 n.innerHTML=TABS.map(([id,t,ic])=>`<button data-t="${id}"${cur===id?' aria-current="page"':''} aria-label="${t}">${ic}<span>${t}</span>${cnt[id]?`<i class="dot" aria-hidden="true">${cnt[id]>9?'9+':cnt[id]}</i>`:''}</button>`).join('');
 n.querySelectorAll('button').forEach(b=>b.onclick=()=>{AU.init();if(!G)MUS.play('menu');AU.sfx('ui');tab=b.dataset.t;pick=null;renderHome()})}
let shownTab='';
function renderHome(){renderHeader();renderNav();const m=$('#hm'),y=m.scrollTop,same=shownTab===tab;shownTab=tab;({play:renderPlay,cards:renderCards,shop:renderShop,road:renderRoad,clan:renderClan,events:renderEvents})[tab](m);if(tab!=='road')m.scrollTop=same?y:0}

/* ---------- вкладка «Бой» ---------- */
function renderPlay(m){const a=curArena(),A=ARENAS[a],nx=ARENAS[a+1],d=curDeck(),st=P.st,pr=nx?(P.tr-A.tr)/(nx.tr-A.tr):1,sp=deckSpecial(d),road=ROAD.filter((_,i)=>roadReady(i)).length;
 m.innerHTML=`<button class="arena-card" id="ac" aria-label="Арена ${a+1}: ${A.n}. Открыть дорогу кубков"><canvas id="thumb" role="img" aria-hidden="true"></canvas><div class="cap"><div><small>АРЕНА ${a+1}</small><b>${A.n}</b></div><small class="tr">${ICO.trophy}${fmtN(P.tr)}</small></div>${road?`<span class="badge">Награды: ${road}</span>`:''}</button>
 <button class="aprog" id="rd"><i style="width:${(pr*100).toFixed(1)}%"></i><span>${nx?`До арены «${nx.n}» — ${nx.tr-P.tr} кубков · дорога ›`:'Последняя арена · дорога кубков ›'}</span></button>
 <div class="playrow"><button class="big" id="play">${P.tutB<CFG.tutor.battles?`ОБУЧЕНИЕ ${P.tutB+1}/${CFG.tutor.battles}`:"БОЙ"}</button><button class="modes" id="modes" aria-label="Режимы и события">${ICO.events}<span>Режимы</span></button></div>
 <button class="friendbtn" id="fr">Бой с другом</button>
 ${P.tutB<CFG.tutor.battles?'<button class="link center" id="skt">Пропустить обучение</button>':''}
 <div class="chests" id="chests"></div>
 <button class="deckrow" id="dr" aria-label="Колода ${P.slot+1}. Открыть карты">${d.map((k,i)=>`<canvas width="60" height="60" data-ic="${k}" class="${i===0&&sp.evo?'evo':i===1&&sp.hero?'hero':''}"></canvas>`).join('')}<span><small>КОЛОДА ${P.slot+1}</small><b>${avgCost(d)}</b></span></button>
 <div class="row2"><button class="ghost" id="rules">Как играть</button><button class="ghost" id="ttb">Башня: ${TT[P.tt].n}</button></div>
 <div class="stats"><div><small>Победы</small><b>${st.w}</b></div><div><small>3 короны</small><b>${st.three}</b></div><div><small>Коллекция</small><b>${collLevel()}</b></div></div>`;
 if(!(R3.want&&r3Thumb(Object.assign($('#thumb'),{width:720,height:632}),a)))drawThumb($('#thumb'),a);paintIcons(m);renderChests();
 $('#play').onclick=()=>P.tutB<CFG.tutor.battles?startBattle(false,{mode:'tutor'}):startBattle(false);if($('#skt'))$('#skt').onclick=()=>{P.tutB=CFG.tutor.battles;saveP();renderHome()};$('#dr').onclick=()=>{AU.init();AU.sfx('ui');tab='cards';renderHome()};
 $('#ac').onclick=$('#rd').onclick=()=>{AU.init();AU.sfx('ui');tab='road';renderHome()};
 $('#fr').onclick=()=>openFriend();$('#modes').onclick=()=>{AU.init();AU.sfx('ui');tab='events';renderHome()};$('#ttb').onclick=openTT;$('#rules').onclick=openRules}
/* сундуки удачи, ждущие открытия, и старые сундуки из слотов — открываются сразу */
function renderChests(){const box=$('#chests');if(!box)return;const L=P.luck.map((a,i)=>({lucky:1,a,i})),O=P.chests.map((c,i)=>c?{c,i}:null).filter(Boolean);
 if(!L.length&&!O.length){box.innerHTML='<p class="note center">Побеждай — после каждой победы ждёт сундук удачи</p>';return}
 box.innerHTML=L.map(x=>`<button class="slot ready lucky" data-l="${x.i}" aria-label="Сундук удачи, арена ${x.a+1}"><span class="an">Ар. ${x.a+1}</span><canvas width="140" height="116" data-chest="silver"></canvas><span class="lab"><b>Удача!</b></span></button>`).join('')
  +O.map(x=>`<button class="slot ready" data-i="${x.i}" aria-label="${CHESTS[x.c.t].n} сундук"><span class="an">Ар. ${x.c.a+1}</span><canvas width="140" height="116" data-chest="${x.c.t}"></canvas><span class="lab"><b>Открыть</b></span></button>`).join('');
 paintIcons(box);box.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>chestTap(+b.dataset.i));
 box.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{AU.init();const i=+b.dataset.l,a=P.luck[i];P.luck.splice(i,1);saveP();luckySpin(a)})}
function chestTap(i){AU.init();const c=P.chests[i];if(!c)return;c.st='ready';showLoot(openChest(i),`${CHESTS[c.t].n} сундук`)}
/* сундук удачи: прокрутка по ступеням редкости, затем обычное открытие */
function luckySpin(a){const ov=$('#loot'),fin=luckyRoll();let cur=0,done=false,busy=false;
 const draw=()=>{ov.innerHTML=`<h2>Сундук удачи</h2><div class="ltiers">${LUCKY.map((x,i)=>`<span class="${i===cur?'on':''}${i<cur?' past':''}">${CHESTS[x.t].n}</span>`).join('')}</div>
  <canvas class="cbig" width="440" height="366" data-chest="${LUCKY[cur].t}"></canvas><p class="lhint">${done?'Нажми, чтобы открыть':'Нажми, чтобы крутить удачу'}</p>`;paintIcons(ov)};
 ov.onclick=()=>{if(busy)return;if(done){ov.onclick=null;showLoot(openLucky(fin,a),`${CHESTS[LUCKY[fin].t].n} сундук`);return}
  busy=true;AU.sfx('chest');let n=0;const steps=REDUCE?0:8+fin*3;
  const tick=()=>{if(n<steps){cur=(cur+1)%(fin+2>LUCKY.length?LUCKY.length:fin+2);n++;AU.sfx('tick');draw();setTimeout(tick,60+n*14)}else{cur=fin;done=true;busy=false;AU.sfx(fin>=2?'win':'ability');draw();const cv=ov.querySelector('canvas');cv.classList.add('shake');setTimeout(()=>cv.classList.remove('shake'),450)}};tick()};
 ov.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ov.onclick&&ov.onclick()}};ov.tabIndex=-1;ov.hidden=false;draw();ov.focus()}
function openTT(){AU.init();AU.sfx('ui');const sh=$('#sheet');
 sh.innerHTML=`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shn"><h3 class="t" id="shn">Башенный боец</h3><p class="note">Кто стреляет с твоих башен принцесс. Король всегда остаётся королём.</p>
  <div class="ttl">${Object.entries(TT).map(([k,t])=>`<button class="tto" role="radio" aria-checked="${P.tt===k}" data-tt="${k}"><b>${t.n}</b><small>${t.d}</small><span>Урон ${Math.round(70*t.dmg)} · раз в ${(.8*t.hit).toFixed(1)} с${t.mag?` · очередь ${t.mag}`:''} · башня ${Math.round(2000*t.hp)}</span></button>`).join('')}</div>
  <button class="big blue" id="shx">Готово</button></div>`;
 sh.hidden=false;sh.onclick=e=>{if(e.target===sh)closeSheet()};$('#shx').onclick=()=>{closeSheet();renderHome()};
 sh.querySelectorAll('[data-tt]').forEach(b=>b.onclick=()=>{AU.sfx('ui');P.tt=b.dataset.tt;saveP();sh.querySelectorAll('[data-tt]').forEach(x=>x.setAttribute('aria-checked',x===b))});$('#shx').focus()}
function openTraining(){AU.init();AU.sfx('ui');const sh=$('#sheet');
 sh.innerHTML=`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shn"><h3 class="t" id="shn">Тренировка</h3>
  <p class="note">Бой без кубков и сундуков. Карты бота твоего уровня, колода — случайная из твоей арены.</p>
  <div class="seg" role="radiogroup" aria-label="Сила бота">${Object.keys(SKILL).map(k=>`<button role="radio" aria-checked="${P.train===k}" data-d="${k}">${SKILL[k].n}</button>`).join('')}</div>
  <div class="shb"><button class="ghost" id="shx">Закрыть</button><button class="big blue" id="tgo">Начать</button></div></div>`;
 sh.hidden=false;sh.onclick=e=>{if(e.target===sh)closeSheet()};$('#shx').onclick=closeSheet;
 sh.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{AU.sfx('ui');P.train=b.dataset.d;saveP();sh.querySelectorAll('[data-d]').forEach(x=>x.setAttribute('aria-checked',x===b))});
 $('#tgo').onclick=()=>startBattle(true);$('#tgo').focus()}
function openRules(){AU.init();AU.sfx('ui');const sh=$('#sheet');
 sh.innerHTML=`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shn"><h3 class="t" id="shn">Как играть</h3>
  <p class="note"><b>Бой.</b> Три минуты. Выбери карту внизу и отпусти её на своей половине. Карта стоит эликсир: он копится сам, до 10, с 2:00 — вдвое быстрее. Новая карта входит в руку через секунду после розыгрыша.</p>
  <p class="note"><b>Короны.</b> Башня принцессы — одна корона, королевская башня — сразу победа и три короны. Король спит, пока его не ударят или не сломают боковую башню, и просыпается около 4 секунд.</p>
  <p class="note"><b>Карман.</b> Сломал боковую башню — на её дорожке можно ставить войска на 4 клетки за рекой.</p>
  <p class="note"><b>День и ночь.</b> День длится 50 с, ночь — 40 с: 0:50–1:30 и 2:20–3:00, в овертайме цикл продолжается. Ночью враг виден, только если стоит в свете (башни, здания, факелы, вспышки) или ближе 2,5 клетки к твоим. Невидимых нельзя выбрать целью — даже башне. Ночные карты ночью, а дневные днём бьют на 25% сильнее и ходят на 15% быстрее. Над таймером видно, сколько осталось до смены.</p>
  <p class="note"><b>Погода арен.</b> Овраг: ночь длиннее дня. Перевал: наземные идут медленнее на 8%. Скалы: воронки держатся дольше. Топь: воронки тормозят сильнее. Цитадель: каждые 22 с молния бьёт по центру поля. Трон: мосты прочнее в 1,6 раза.</p>
  <p class="note"><b>Овертайм.</b> Если короны равны — ещё две минуты, эликсир ×2, в последнюю минуту ×3. Первая сломанная башня решает бой; если обе пали одновременно — играем дальше.</p>
  <p class="note"><b>Тайбрейкер.</b> Если и в овертайме ничья: войска исчезают, все башни теряют здоровье, и проигрывает владелец самой слабой башни. Равны — ничья.</p>
  <p class="note"><b>Эволюции и герои.</b> Первый слот колоды — для эволюции: она выходит усиленной сразу и потом через несколько розыгрышей. Второй — для героя со способностью по кнопке (если в колоде нет чемпиона). Открываются за осколки.</p>
  <p class="note"><b>Башня и режимы.</b> Перед боем выбери, кто стоит на башнях: лучница, пушкарь или метательница кинжалов. Во вкладке «События» — тройной эликсир, внезапная смерть и драфт.</p>
  <p class="note"><b>Прогресс.</b> За победы — кубки и сундук удачи. Карты из сундуков улучшают уровни, улучшения дают опыт короля, а он укрепляет башни. Кубки открывают новые арены и карты.</p>
  <p class="note" style="font-size:11.5px"><b>Авторы.</b> 3D-персонажи, оружие и окружение — наборы KayKit, Kay Lousberg (kaylousberg.com, CC0). Монстры — Ultimate Monsters, Quaternius (quaternius.com, CC0). Звуки — Kenney и авторы OpenGameArt (CC0). Склеп, знамёна, факелы — KayKit Dungeon и Halloween (CC0). Небо — Poly Haven (polyhaven.com, CC0). 3D-движок — Three.js (MIT).</p>
  <button class="big blue" id="shx">Понятно</button></div>`;
 sh.hidden=false;sh.onclick=e=>{if(e.target===sh)closeSheet()};$('#shx').onclick=closeSheet;$('#shx').focus()}
setInterval(()=>{if($('#home').hidden||tab!=='clan')return;const e=$('#reqp');if(e)renderHome()},5000);

/* ---------- вкладка «Карты» ---------- */
function cc(k,src,cls,lab){const c=CARDS[k],o=P.cards[k],lock=ARENA_OF[k]>curArena();let foot;
 if(!o)foot=`<span class="tag">${lock?ICO.lock+'Арена '+(ARENA_OF[k]+1):'Не найдена'}</span>`;
 else{const nd=needOf(k),pr=nd?Math.min(1,o.n/nd):1;foot=`<span class="lvb">ур. ${o.lv}</span><span class="bar${canUp(k)?' up':''}"><i style="width:${(pr*100).toFixed(0)}%"></i><em>${o.lv>=MAXLV?'МАКС':o.n+'/'+nd}</em></span>`}
 return`<button class="cc ${cls||''}${o?'':' no'}${P.fresh.includes(k)?' new':''}" data-k="${k}" data-src="${src}" data-r="${c.rar}" aria-label="${c.n}, ${c.cost} эликсира${o?', уровень '+o.lv:', не найдена'}"><canvas width="120" height="120" data-ic="${k}"></canvas><i class="gem">${c.cost}</i>${lab?`<span class="slab">${lab}</span>`:P.evo.includes(k)?'<span class="mini evo">ЭВО</span>':P.heroes.includes(k)?'<span class="mini hero">ГЕРОЙ</span>':''}<span class="nm">${c.n}</span>${foot}</button>`}
let cfil='all',csort='rar';
const CSORT={rar:(a,b)=>RAR_ORDER.indexOf(CARDS[a].rar)-RAR_ORDER.indexOf(CARDS[b].rar)||CARDS[a].cost-CARDS[b].cost,cost:(a,b)=>CARDS[a].cost-CARDS[b].cost||CSORT.rar(a,b),lv:(a,b)=>lvOf(b)*!!P.cards[b]-lvOf(a)*!!P.cards[a]||CSORT.rar(a,b)};
let ctab='deck';
/* большая карта колоды: стоимость, ромб эво/героя, лента уровня и прогресс копий или «Макс.» */
function dk(k,i,sp,cls){const c=CARDS[k],o=P.cards[k],lv=o?o.lv:START_LV[c.rar],nd=o?needOf(k):0,mx=!o||lv>=MAXLV,up=o&&canUp(k);
 const slot=i===0&&sp.evo===k?'s-evo':i===1&&sp.hero===k?'s-hero':'',dia=EVO[k]?(P.evo.includes(k)?'evo on':'evo'):HERO[k]?(P.heroes.includes(k)?'hero on':'hero'):'';
 return`<button class="dk ${slot} ${cls||''}${o?'':' no'}${P.fresh.includes(k)?' new':''}" data-k="${k}" data-src="${cls&&/coll|mini/.test(cls)?'c':'d'}" data-r="${c.rar}" aria-label="${c.n}, ${c.cost} эликсира, уровень ${lv}">
  <span class="art"><canvas width="256" height="256" data-ic="${k}"></canvas></span><i class="gem">${c.cost}</i>${dia?`<i class="dia ${dia}" aria-hidden="true"></i>`:''}
  <span class="lvr">${o?lv+'-й уровень':ARENA_OF[k]>curArena()?'🔒 Арена '+(ARENA_OF[k]+1):'🔒 Не найдена'}</span>
  ${o?mx?'<span class="mxr">Макс.</span>':`<span class="pgr${up?' up':''}"><i style="width:${Math.min(100,o.n/nd*100).toFixed(0)}%"></i>${up?'<b class="arr" aria-hidden="true">▲</b>':''}<em>${fmtN(o.n)}/${fmtN(nd)}</em></span>`:'<span class="mxr no">—</span>'}</button>`}
function renderCards(m){const d=curDeck(),sp=deckSpecial(d),found=CARD_IDS.filter(k=>P.cards[k]).length,ncoll=CARD_IDS.filter(k=>canUp(k)).length+P.fresh.length;
 const top=`<div class="ctabs" role="tablist"><button role="tab" aria-selected="${ctab==='deck'}" data-ct="deck">Колоды</button><button role="tab" aria-selected="${ctab==='coll'}" data-ct="coll">Коллекция${ncoll?`<i class="dot">${ncoll>9?'9+':ncoll}</i>`:''}</button></div>`;
 if(ctab==='deck'){
  m.innerHTML=top+`<div class="dsel"><button class="dbtn menu" id="dmenu" aria-label="Действия с колодой">☰</button>${[...Array(NDECKS).keys()].map(i=>`<button class="dbtn${P.slot===i?' on':''}" data-s="${i}" aria-label="Колода ${i+1}">${i+1}</button>`).join('')}<button class="dbtn menu" id="dcoll" aria-label="Коллекция">${NAVI.cards}</button></div>
   ${pick?`<div class="selbar"><span>Выбрана: <b>${CARDS[pick.k].n}</b>. ${pick.src==='d'?'Нажми другую карту колоды или карту ниже':'Нажми карту в колоде, вместо которой она встанет'}</span><button class="small" id="pinfo">Инфо</button><button class="link" id="rc">Отмена</button></div>`:`<p class="dhint2">Нажми карту, затем вторую: они поменяются. Долгое нажатие — описание</p>`}
   <div class="dgrid">${d.map((k,i)=>dk(k,i,sp,(pick&&pick.k===k?'sel':'')+(lastSwap===k?' swap':''))).join('')}</div>
   <div class="drow"><span class="avg"><i class="drop" aria-hidden="true"></i><b>${avgCost(d)}</b></span><span class="shards" title="Осколки эволюции">${ICO.shard}<b>${P.shards}</b></span><span class="dhint">1-й слот — эволюция, 2-й — герой</span></div>
   <h4 class="lockhd nob">Твои карты</h4>
   <div class="filt"><div class="chips" role="group" aria-label="Фильтр">${[['all','Все'],['troop','Бойцы'],['spell','Заклинания'],['building','Строения'],['evo','Эво и герои']].map(([v,t])=>`<button data-f="${v}" aria-pressed="${cfil===v}">${t}</button>`).join('')}</div></div>
   <div class="dgrid mini">${CARD_IDS.filter(k=>P.cards[k]&&!d.includes(k)&&(cfil==='all'||(cfil==='evo'?EVO[k]||HERO[k]:CARDS[k].type===cfil))).sort(CSORT[csort]).map(k=>dk(k,-1,sp,'mini'+(pick&&pick.k===k?' sel':'')+(lastSwap===k?' swap':''))).join('')}</div>
   <div class="tshow"><div class="tstage"><canvas width="240" height="240" data-ic="tt_king" class="tk"></canvas><button class="lvl11" id="kb" aria-label="Уровень короля ${P.kl}">${P.kl}</button></div>
    <button class="tcard" id="ttb" aria-label="Башенный боец: ${TT[P.tt].n}"><canvas width="240" height="240" data-ic="tt_${P.tt}"></canvas><span class="lvr">${TT[P.tt].n}</span><span class="mxr">Сменить</span></button></div>`}
 else{const list=CARD_IDS.filter(k=>cfil==='all'||cfil==='evo'?(cfil!=='evo'||EVO[k]||HERO[k]):CARDS[k].type===cfil).sort(CSORT[csort]);
  m.innerHTML=top+`<div class="cinfo"><b>Найдено ${found} из ${CARD_IDS.length}</b><span>Уровень коллекции <b>${collLevel()}</b></span></div>
   <div class="filt"><div class="chips" role="group" aria-label="Фильтр">${[['all','Все'],['troop','Бойцы'],['spell','Заклинания'],['building','Строения'],['evo','Эво и герои']].map(([v,t])=>`<button data-f="${v}" aria-pressed="${cfil===v}">${t}</button>`).join('')}</div>
    <label class="sortl">Порядок <select id="cso"><option value="rar"${csort==='rar'?' selected':''}>по редкости</option><option value="cost"${csort==='cost'?' selected':''}>по цене</option><option value="lv"${csort==='lv'?' selected':''}>по уровню</option></select></label></div>
   <div class="dgrid coll">${(()=>{const have=list.filter(k=>P.cards[k]),lost=list.filter(k=>!P.cards[k]);return have.map(k=>dk(k,-1,sp,'coll'+(d.includes(k)?' indeck':''))).join('')+(lost.length?`<h4 class="lockhd">Ещё не найдены · ${lost.length}</h4>`+lost.map(k=>dk(k,-1,sp,'coll')).join(''):'')})()}</div>`}
 paintIcons(m);
 m.querySelectorAll('[data-ct]').forEach(b=>b.onclick=()=>{AU.sfx('ui');ctab=b.dataset.ct;renderHome()});
 m.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{AU.sfx('ui');P.slot=+b.dataset.s;pick=null;saveP();renderHome()});
 m.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{AU.sfx('ui');cfil=b.dataset.f;renderHome()});
 if($('#cso'))$('#cso').onchange=()=>{csort=$('#cso').value;renderHome()};
 if($('#ttb'))$('#ttb').onclick=openTT;if($('#dcoll'))$('#dcoll').onclick=()=>{AU.sfx('ui');ctab='coll';renderHome()};
 if($('#dmenu'))$('#dmenu').onclick=openDeckMenu;
 if($('#kb'))$('#kb').onclick=()=>{AU.init();const nx=P.kl<KL_MAX?KL_XP[P.kl]:0;toast(P.kl<KL_MAX?`Уровень короля ${P.kl}: опыт ${P.xp} из ${nx}. Опыт дают улучшения карт`:'Уровень короля максимальный')};
 if(pick&&$('#rc'))$('#rc').onclick=()=>{pick=null;renderHome()};
 m.querySelectorAll('.dk').forEach(b=>b.onclick=()=>{AU.init();const k=b.dataset.k;AU.sfx('ui');openSheet(k)})
 if(ctab==='deck')m.querySelectorAll('.dk').forEach(b=>{let lp=0,t=0;const stop=()=>clearTimeout(t);
  b.addEventListener('pointerdown',()=>{lp=0;t=setTimeout(()=>{lp=1;AU.sfx('ui');openSheet(b.dataset.k)},450)});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,stop));
  b.onclick=()=>{if(lp){lp=0;return}AU.init();cardTap(b.dataset.k,b.dataset.src)}})
 if($('#pinfo'))$('#pinfo').onclick=()=>{AU.sfx('ui');openSheet(pick.k)}}
/* две карты по очереди: колода+колода — меняются местами, колода+коллекция — замена; повторное касание — описание карты */
function cardTap(k,src){
 if(!pick){pick={k,src};AU.sfx('ui');renderHome();return}
 if(pick.k===k){AU.sfx('ui');openSheet(k);return}
 if(pick.src==='c'&&src==='c'){pick={k,src};AU.sfx('ui');renderHome();return}
 const out=pick.src==='d'?pick.k:k,inn=pick.src==='d'?k:pick.k,r=trySwap(curDeck(),out,inn);
 if(!r.ok){AU.sfx('deny');toast(r.why);return}
 P.decks[P.slot]=r.deck;saveP();pick=null;lastSwap=inn;AU.sfx('dep');renderHome();setTimeout(()=>{lastSwap=null},800)}
/* действия с колодой: случайная колода из найденных карт или копия другой колоды */
function openDeckMenu(){AU.init();AU.sfx('ui');const sh=$('#sheet');
 sh.innerHTML=`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shn"><h3 class="t" id="shn">Колода ${P.slot+1}</h3>
  <button class="ghost" id="drnd">Собрать случайно из моих карт</button>
  ${[...Array(NDECKS).keys()].filter(i=>i!==P.slot).map(i=>`<button class="ghost" data-cp="${i}">Скопировать колоду ${i+1}</button>`).join('')}
  <button class="big blue" id="shx">Закрыть</button></div>`;
 sh.hidden=false;sh.onclick=e=>{if(e.target===sh)closeSheet()};$('#shx').onclick=closeSheet;
 $('#drnd').onclick=()=>{const own=shuffleV(CARD_IDS.filter(k=>P.cards[k])),d=[];for(const k of own)if(d.length<8&&!(CARDS[k].ability&&d.some(x=>CARDS[x].ability)))d.push(k);if(d.length<8||!okDeck(d)){AU.sfx('deny');return}P.decks[P.slot]=d;saveP();AU.sfx('dep');closeSheet();renderHome()};
 sh.querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>{P.decks[P.slot]=P.decks[+b.dataset.cp].slice();saveP();AU.sfx('dep');closeSheet();renderHome()})}
function statRows(k,lv){const c=CARDS[k],n=c.count||1,R=[];
 if(c.type==='spell'){if(c.dmg)R.push(['Урон',LV(c.dmg,lv)]);if(c.tdmg)R.push(['Урон по башням',LV(c.tdmg,lv)]);R.push(c.roll?['Ширина',c.rad*2+' кл.']:['Радиус',c.rad+' кл.']);if(c.roll)R.push(['Катится',c.roll.len+' кл.']);if(c.bdmg)R.push(['Урон мосту',c.bdmg]);if(c.force)R.push([c.force.k?'Ночь':'День',c.force.t+' с']);if(c.flash)R.push(['Свет',c.flash.light+' кл.',` на ${c.flash.t} с`]);if(c.blind)R.push(['Ослепление',c.blind+' с']);if(c.shade)R.push(['Тьма',c.shade+' с']);if(c.grave)R.push(['Скелетов',c.grave.n,` за ${c.grave.t} с`]);
  if(c.freeze)R.push(['Заморозка',c.freeze+' с']);if(c.rage)R.push(['Ярость',c.rage+' с, +35%']);if(c.pull)R.push(['Затягивает',c.pull+' с']);if(c.heal)R.push(['Лечит',LV(c.heal,lv),` за ${c.healT} с`]);if(c.poison)R.push(['Длится',c.poison+' с']);if(c.stun)R.push(['Оглушение',c.stun+' с']);if(c.waves)R.push(['Волн',c.waves]);return R}
 const u=CARDS[c.unit||k];
 R.push(['Здоровье',LV(u.hp,lv),n>1?' ×'+n:'']);if(u.light)R.push(['Свет',u.light+' кл.']);if(u.aff)R.push([u.aff==='night'?'Ночью':'Днём',`+${CFG.cycle.aff.dmg*100}% урона, +${CFG.cycle.aff.spd*100}% скорости`]);if(u.shield)R.push(['Щит',LV(u.shield,lv)]);
 if(u.dmg){R.push(['Урон',LV(u.dmg,lv),c.splash||c.spin?', по площади':'']);R.push(['Удар раз в',u.hit+' с']);R.push(['Урон в секунду',Math.round(LV(u.dmg,lv)/u.hit*n)])}
 if(c.death)R.push(['Урон при гибели',LV(c.death.dmg,lv)]);
 if(c.elx)R.push(['Эликсир',`+${c.elx.n} каждые ${c.elx.every} с`]);if(c.type==='building')R.push(['Стоит',c.life+' с']);else R.push(['Скорость',SPDN[u.spd]]);
 if(u.dmg)R.push(['Дальность',u.rng>=2?u.rng+' кл.':'Ближний бой',u.minRng?`, не ближе ${u.minRng}`:'']);
 R.push(['Цели',TGN[u.tg]]);R.push(['Выход',(c.dep??1)+' с']);
 if(c.ability)R.push(['Способность',`${c.ability.n}: щит ${LV(c.ability.shield,lv)}`,`, ${c.ability.cost} эликсира`]);
 return R}
function tagsOf(k){const c=CARDS[k],T=[];
 if(c.fly)T.push('Летает');if(c.splash||c.spin)T.push('Урон по площади');if(c.charge)T.push('Рывок: удар ×2');if(c.stun)T.push('Оглушает');if(c.slow)T.push('Замедляет');
 if(c.chain)T.push('Бьёт сразу двоих');if(c.kami)T.push('Взрывается');if(c.death)T.push('Урон при гибели');if(c.dspawn)T.push(c.type==='building'?'При разрушении — ещё костяшки':'Распадается на камешки');
 if(c.spawn)T.push('Выпускает костяшек');if(c.tunnel)T.push('Роет ход куда угодно');if(c.zap)T.push('Разряд при выходе');if(c.td)T.push('По башням бьёт слабо');if(c.knock)T.push('Отбрасывает');if(c.ability)T.push('Один чемпион в колоде');if(c.dash)T.push('Рывок, во время рывка неуязвима');if(c.pull)T.push('Затягивает к центру');if(c.heal)T.push('Лечит своих');if(c.elx)T.push('Добывает эликсир');if(c.noStart)T.push('Не бывает в стартовой руке');if(c.roll)T.push('Катится и отталкивает');{const a=(CARDS[c.unit]||c).aff;if(a)T.push(a==='night'?'Ночная карта':'Дневная карта')}if((CARDS[c.unit]||c).light||c.flash)T.push('Даёт свет');if(c.shade)T.push('Гасит свет');if(c.bdmg)T.push('Рушит мосты');if(c.force)T.push(c.force.k?'Вызывает ночь':'Вызывает день');if((CARDS[c.unit]||c).stealth)T.push('Невидима ночью');if(c.shield)T.push('Щит');if(c.siege)T.push('Бьёт башни издалека');if(c.minRng)T.push('Мёртвая зона вблизи');if(c.grave)T.push('Поднимает скелетов');
 return T}
function openSheet(k){const c=CARDS[k],o=P.cards[k],lv=o?o.lv:1,inDeck=curDeck().includes(k),sh=$('#sheet'),type=c.type==='spell'?'заклинание':c.type==='building'?'строение':'боец',tags=tagsOf(k);
 if(P.fresh.includes(k)){P.fresh=P.fresh.filter(x=>x!==k);saveP()}
 const rows=statRows(k,lv),nxt=o&&o.lv<MAXLV?statRows(k,lv+1):null,nd=needOf(k),cost=upCost(k);
 const kv=rows.map(([a,b,suf],i)=>{const d=nxt&&typeof b==='number'&&typeof nxt[i][1]==='number'?nxt[i][1]-b:0;return`<div><small>${a}</small><b>${typeof b==='number'?fmtN(b):b}${suf||''}${d>0?`<span class="dl">+${fmtN(d)}</span>`:''}</b></div>`}).join('');
 let act='';
 if(!o)act=`<p class="note">${ARENA_OF[k]>curArena()?`Откроется на арене ${ARENA_OF[k]+1} «${ARENAS[ARENA_OF[k]].n}».`:'Эта карта уже выпадает из сундуков твоей арены.'}</p><div class="shb"><button class="ghost" id="shx">Закрыть</button></div>`;
 else{const up=o.lv<MAXLV?canUp(k)?(P.gold>=cost?`<button class="big" id="shup">Улучшить · ${fmtN(cost)} ${ICO.gold.replace('<svg','<svg style="width:20px;height:20px;vertical-align:-3px"')}</button>`:`<button class="big" disabled>Нужно ${fmtN(cost)} золота</button>`):`<button class="big" disabled>${(m=>`${plural(m,'Нужна','Нужны','Нужно')} ещё ${m} ${plural(m,'карта','карты','карт')}`)(nd-o.n)}</button>`:'';
  act=`<div class="lbar${canUp(k)?' up':''}" style="width:100%"><i style="width:${o.lv>=MAXLV?100:Math.min(100,o.n/nd*100).toFixed(0)}%"></i><em>${o.lv>=MAXLV?'Максимальный уровень':`Карт: ${o.n} из ${nd} для уровня ${o.lv+1}`}</em></div>
   ${up}<div class="shb"><button class="ghost" id="shx">Закрыть</button><button class="big blue" id="shu">${inDeck?'Заменить':'В колоду'}</button></div>`}
 sh.innerHTML=`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shn">
  <div class="shh"><canvas width="120" height="120" data-ic="${k}"></canvas><div><h3 id="shn">${c.n}</h3><div class="rar" style="color:${RAR[c.rar].c}">${RAR[c.rar].n.toUpperCase()} · ${type.toUpperCase()}${o?' · УРОВЕНЬ '+o.lv:''}</div><div class="cost"><i class="gem">${c.cost}</i>эликсира</div></div></div>
  <p class="note">${c.tip}</p>
  <div class="kv">${kv}</div>
  ${tags.length?`<div class="tags">${tags.map(t=>`<span>${t}</span>`).join('')}</div>`:''}
  ${specHTML(k)}
  ${act}</div>`;
 paintIcons(sh);sh.hidden=false;sh.onclick=e=>{if(e.target===sh)closeSheet()};$('#shx').onclick=closeSheet;$('#shx').focus();
 if($('#shu'))$('#shu').onclick=()=>{AU.sfx('ui');pick={k,src:inDeck?'d':'c'};closeSheet();tab='cards';ctab='deck';renderHome()};
 sh.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{AU.init();const[w,x]=b.dataset.sp.split(':');let ok=false;
  if(w==='ue')ok=unlockEvo(k);else if(w==='uh')ok=unlockHero(k);else ok=toSlot(k,+x);
  if(!ok){AU.sfx('deny');return}AU.sfx(w[0]==='u'?'win':'dep');if(w==='ue')toast(`«${c.n}»: эволюция открыта`);if(w==='uh')toast(`«${c.n}»: герой открыт`);renderHeader();openSheet(k)});
 if($('#shup'))$('#shup').onclick=()=>{if(!upgrade(k)){AU.sfx('deny');return}AU.sfx('win');toast(`«${c.n}» — уровень ${P.cards[k].lv}`);renderHome();openSheet(k)}}
function specHTML(k){const c=CARDS[k],o=P.cards[k],d=curDeck(),inD=d.includes(k),out=[];
 if(EVO[k]){const e=EVO[k],have=P.evo.includes(k);out.push(`<div class="spec evo"><b>Эволюция</b><small>${e.d}. Первый розыгрыш в бою и потом каждый ${e.cyc+1}-й выходит усиленным.</small>
  ${!o?'':!have?`<button class="small" data-sp="ue"${P.shards<EVO_COST?' disabled':''}>Открыть · ${EVO_COST} ${ICO.shard.replace('<svg','<svg style="width:15px;height:15px;vertical-align:-2px"')}</button>`:inD&&d[0]!==k?'<button class="small" data-sp="to:0">В слот эво</button>':inD?'<span class="ok2">В слоте эво</span>':'<span class="ok2">Открыта · добавь в колоду</span>'}</div>`)}
 if(HERO[k]){const h=HERO[k],have=P.heroes.includes(k),champ=d.some(x=>CARDS[x].ability);out.push(`<div class="spec hero"><b>Герой</b><small>${h.d}. Цена способности ${h.ability.cost} эликсира. Здоровье +15%. Пока жив, карта не возвращается в руку.</small>
  ${!o?'':!have?`<button class="small" data-sp="uh"${P.shards<HERO_COST?' disabled':''}>Открыть · ${HERO_COST} ${ICO.shard.replace('<svg','<svg style="width:15px;height:15px;vertical-align:-2px"')}</button>`:champ&&inD?'<span class="ok2">В колоде чемпион: слот героя занят</span>':inD&&d[1]!==k?'<button class="small" data-sp="to:1">В слот героя</button>':inD?'<span class="ok2">В слоте героя</span>':'<span class="ok2">Открыт · добавь в колоду</span>'}</div>`)}
 return out.join('')}
function closeSheet(){NETL.ui=null;const sh=$('#sheet'),was=!sh.hidden;sh.hidden=true;sh.innerHTML='';if(was&&!$('#home').hidden&&tab==='cards'&&!pick)renderHome()}

/* ---------- вкладка «Магазин» ---------- */
function priceBtn(o){const done=bought(o),have=o.cur==='gold'?P.gold:P.gems;
 return`<button class="price" data-o="${o.id}"${done||have<o.cost?' disabled':''}>${done?'Куплено':o.cost===0?'Бесплатно':(o.cur==='gold'?ICO.gold:ICO.gem)+fmtN(o.cost)}</button>`}
function renderShop(m){const offs=shopOffers(),cards=offs.filter(o=>o.kind==='card'),chests=offs.filter(o=>o.kind==='chest'),gold=offs.filter(o=>o.kind==='gold'),shard=offs.filter(o=>o.kind==='shard');
 m.innerHTML=`<h2 class="sec">КАРТЫ ДНЯ</h2><div class="offers">${cards.map(o=>`<div class="offer${bought(o)?' done':''}">${o.free?'<span class="ribbon">ПОДАРОК</span>':''}<canvas width="120" height="120" data-ic="${o.k}"></canvas><span class="on">${CARDS[o.k].n}</span><span class="cnt">×${o.n}</span>${priceBtn(o)}</div>`).join('')}</div>
 <h2 class="sec">СУНДУКИ ЗА КРИСТАЛЛЫ</h2><div class="offers">${chests.map(o=>`<div class="offer${bought(o)?' done':''}"><canvas width="168" height="140" data-chest="${o.t}"></canvas><span class="on">${CHESTS[o.t].n}</span>${priceBtn(o)}</div>`).join('')}</div>
 <h2 class="sec">ОСКОЛКИ ЭВОЛЮЦИИ</h2><div class="offers">${shard.map(o=>`<div class="offer${bought(o)?' done':''}">${ICO.shard.replace('<svg','<svg style="width:52px;height:52px;margin:8px 0"')}<span class="cnt">×${o.n}</span>${priceBtn(o)}</div>`).join('')}</div>
 <h2 class="sec">ЗОЛОТО</h2><div class="offers">${gold.map(o=>`<div class="offer">${ICO.gold.replace('<svg','<svg style="width:56px;height:56px;margin:8px 0"')}<span class="cnt">${fmtN(o.n)}</span>${priceBtn(o)}</div>`).join('')}</div>
 <p class="note">Карты дня меняются каждые сутки. Кристаллы выдаёт дорога кубков и волшебные сундуки; их можно тратить на сундуки, золото и ускорение открытия.</p>`;
 paintIcons(m);
 m.querySelectorAll('.price').forEach(b=>b.onclick=()=>{AU.init();const o=offs.find(x=>x.id===+b.dataset.o),r=buy(o);if(!r){AU.sfx('deny');return}
  if(o.kind==='gold'||o.kind==='shard'){AU.sfx('win');toast(o.kind==='gold'?`+${fmtN(o.n)} золота`:`+${o.n} осколка эволюции`);renderHome()}else showLoot(r,o.kind==='chest'?`${CHESTS[o.t].n} сундук`:'Покупка')})}

/* ---------- вкладка «Дорога кубков» ---------- */
function rewardHTML(r){const parts=[];
 if(r.ar!=null)parts.push(`<span><b>Арена ${r.ar+1}: ${ARENAS[r.ar].n}</b><span class="cards">${CARD_IDS.filter(k=>ARENA_OF[k]===r.ar).map(k=>`<canvas width="60" height="60" data-ic="${k}"></canvas>`).join('')}</span></span>`);
 if(r.g)parts.push(`${ICO.gold}<span>${fmtN(r.g)} золота</span>`);
 if(r.gm)parts.push(`${ICO.gem}<span>${r.gm} кристаллов</span>`);
 if(r.sh)parts.push(`${ICO.shard}<span>${r.sh} ${plural(r.sh,'осколок','осколка','осколков')}</span>`);
 if(r.ch)parts.push(`<canvas width="84" height="70" data-chest="${r.ch}"></canvas><span>${CHESTS[r.ch].n} сундук</span>`);
 if(r.cd)parts.push(`<span>${r.cd[1]} ${plural(r.cd[1],...({rare:['редкая','редкие','редких'],epic:['эпическая','эпические','эпических']})[r.cd[0]])} ${plural(r.cd[1],'карта','карты','карт')}</span>`);
 return parts.join('')}
function renderRoad(m){let here=false;const rows=[];
 ROAD.forEach((r,i)=>{if(!here&&P.tr<r.tr){here=true;rows.push(`<div class="here" id="here">ТЫ ЗДЕСЬ · ${fmtN(P.tr)}</div>`)}
  const done=P.rc.includes(i),ready=roadReady(i),cls=done?'done':ready?'ready':'far';
  rows.push(`<div class="ms ${cls}${r.ar!=null?' arena':''}"><span class="t">${ICO.trophy}${fmtN(r.tr)}</span><span class="rw">${rewardHTML(r)}</span>${done?'<span class="ok" aria-label="получено">✓</span>':ready?`<button class="small" data-r="${i}">Забрать</button>`:'<span></span>'}</div>`)});
 if(!here)rows.push(`<div class="here" id="here">ТЫ ЗДЕСЬ · ${fmtN(P.tr)}</div>`);
 m.innerHTML=`<button class="ghost back" id="bk">‹ Назад</button><p class="note">Награды за кубки. Каждая новая арена открывает свои карты — они начнут выпадать из сундуков.</p><div class="road">${rows.join('')}</div>`;
 paintIcons(m);
 m.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{AU.init();const r=claimRoad(+b.dataset.r);if(!r){AU.sfx('deny');return}
  if(r.t||r.cards.length||r.shards&&(r.gold||r.gems))showLoot(r,r.t?`${CHESTS[r.t].n} сундук`:'Награда');else{AU.sfx('win');toast(r.gold?`+${fmtN(r.gold)} золота`:r.gems?`+${r.gems} кристаллов`:`+${r.shards} осколка`);renderHome()}});
 $('#bk').onclick=()=>{AU.sfx('ui');tab='play';renderHome()};
 const h=$('#here');if(h)m.scrollTop=Math.max(0,h.offsetTop-m.clientHeight/2)}

/* ---------- вкладка «Клан» ---------- */
function renderClan(m){const rs=reqState(),mates=mateRequests(),a=curArena();
 const roster=[[P.name+' (ты)',P.tr,'Участник']].concat(CLAN_MATES.map(([n,r],i)=>[n,Math.max(0,ARENAS[clamp(a+(i%3)-1,0,7)].tr+((i*137)%180)),['Участник','Старейшина','Глава'][r]])).sort((x,y)=>y[1]-x[1]);
 let req;
 if(rs){const n=rs.got-rs.q.taken;req=`<div class="req" id="reqp"><canvas width="96" height="96" data-ic="${rs.q.k}"></canvas><div><b>Ты просишь «${CARDS[rs.q.k].n}»</b><div class="lbar"><i style="width:${(rs.got/rs.cap*100).toFixed(0)}%"></i><em>${rs.got} из ${rs.cap}</em></div><small>Соклановцы присылают карту каждые 5 минут и после каждого твоего боя</small></div>${n>0?`<button class="small" id="rqc">Забрать ${n}</button>`:''}</div>`}
 else if(canRequest())req=`<div class="req"><div><b>Попроси карты у клана</b><small>Обычные — до 10 штук, редкие — до 2. Нажми на карту ниже.</small></div></div><div class="cardgrid">${SORTED.filter(k=>P.cards[k]&&REQ_N[CARDS[k].rar]).map(k=>cc(k,'r','')).join('')}</div>`;
 else req=`<div class="req"><div><b>Следующая просьба через ${fmtT((P.clan.next-Date.now())/1000)}</b><small>Пока можно помогать соклановцам</small></div></div>`;
 m.innerHTML=`<div class="clanhd">${ICO.clan}<div><b>${CLAN_NAME}</b><small>${CLAN_MATES.length+1} участников · клан для всех</small></div></div>
 <h2 class="sec">МОЯ ПРОСЬБА</h2>${req}
 <h2 class="sec">ПРОСЯТ СОКЛАНОВЦЫ</h2><div class="dons">${mates.map((o,i)=>{const have=P.cards[o.k]?P.cards[o.k].n:0;return`<div class="don"><canvas width="72" height="72" data-ic="${o.k}"></canvas><div><b>${esc(o.who)}</b><small>«${CARDS[o.k].n}» · ${o.done}/${o.cap} · у тебя ${have}</small></div><button class="small" data-dn="${i}"${o.done>=o.cap||have<1?' disabled':''}>${o.done>=o.cap?'Готово':`Дать · +${CARDS[o.k].rar==='rare'?50:5}`}</button></div>`}).join('')}</div>
 <h2 class="sec">СОСТАВ</h2><ol class="roster">${roster.map(([n,t,r])=>`<li><span>${esc(n)}</span><small>${r}</small><b>${ICO.trophy.replace('<svg','<svg style="width:13px;height:13px;vertical-align:-2px"')}${fmtN(t)}</b></li>`).join('')}</ol>
 <p class="note">Клан — это боты-соклановцы: они дарят карты по просьбе и сами просят помощи. Пожертвования дают золото и опыт короля.</p>`;
 paintIcons(m);
 if($('#rqc'))$('#rqc').onclick=()=>{AU.init();const n=collectReq();if(n){AU.sfx('win');toast(`+${n} × «${CARDS[rs.q.k].n}»`)}renderHome()};
 m.querySelectorAll('.cc[data-src="r"]').forEach(b=>b.onclick=()=>{AU.init();if(!makeRequest(b.dataset.k)){AU.sfx('deny');return}AU.sfx('dep');toast('Просьба отправлена клану');renderHome()});
 m.querySelectorAll('[data-dn]').forEach(b=>b.onclick=()=>{AU.init();const g=donate(mates[+b.dataset.dn]);if(!g){AU.sfx('deny');return}AU.sfx('win');toast(`Спасибо! +${g} золота`);renderHome()})}

/* ---------- вкладка «События» ---------- */
function renderEvents(m){const e=evDay(),Q=questsToday(),ch=P.chal;
 m.innerHTML=`<h2 class="sec">ЗАДАНИЯ ДНЯ</h2><div class="quests">${Q.map((x,i)=>{const q=questOf(x),done=x.p>=q.goal,r=q.r;return`<div class="quest${x.got?' got':''}"><div><b>${q.n}</b><div class="lbar${done?' up':''}"><i style="width:${(x.p/q.goal*100).toFixed(0)}%"></i><em>${fmtN(x.p)} / ${fmtN(q.goal)}</em></div></div>${x.got?'<span class="ok2">Получено</span>':`<button class="small" data-q="${i}"${done?'':' disabled'}>${r.g?`${ICO.gold}${r.g}`:r.gm?`${ICO.gem}${r.gm}`:`${ICO.shard}${r.sh}`}</button>`}</div>`}).join('')}</div>
 <p class="note">Особые режимы без кубков. Первая победа в каждом режиме за день — золото и осколок эволюции ${ICO.shard.replace('<svg','<svg style="width:14px;height:14px;vertical-align:-2px"')}.</p>
 <div class="evs">${EVENTS.map(x=>`<div class="ev" style="--c:${x.c}"><div><b>${x.n}</b><small>${x.d}</small>${x.id==='train'?'':`<span class="evr">${x.id==='challenge'?(ch?`Побед ${ch.wins} из ${CHAL.maxWins} · поражений ${ch.loss} из ${CHAL.maxLoss}`:`Награда за 12 побед: ${fmtN(CHAL.reward(12).gold)} золота, кристаллы и осколки`):e.won.includes(x.id)?'Награда дня получена':'Награда дня ждёт'}</span>`}</div><button class="big" data-ev="${x.id}">${x.id==='challenge'&&ch?'Дальше':'Играть'}</button></div>`).join('')}</div>`;
 m.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{AU.init();const r=claimQuest(+b.dataset.q);if(!r){AU.sfx('deny');return}AU.sfx('win');toast(r.g?`+${r.g} золота`:r.gm?`+${r.gm} кристаллов`:`+${r.sh} осколок`);renderHome()});
 m.querySelectorAll('[data-ev]').forEach(b=>b.onclick=()=>{AU.init();const id=b.dataset.ev;if(id==='challenge')chalStart();if(id==='train')openTraining();else if(id==='draft')openDraft();else startBattle(false,{mode:id})})}
/* драфт: восемь раз выбираешь одну карту из пары */
function openDraft(){AU.init();AU.sfx('ui');const pairs=draftPairs(),mine=[],theirs=[],sh=$('#sheet');let i=0;
 const show=()=>{if(i>=pairs.length){closeSheet();startBattle(false,{mode:'draft',deck:mine,bot:theirs});return}
  sh.innerHTML=`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shn"><h3 class="t" id="shn">Драфт · выбор ${i+1} из 8</h3><p class="note">Выбери карту себе. Вторая уйдёт сопернику.</p>
   <div class="dpair">${pairs[i].map(k=>`<button class="cc" data-k="${k}" data-r="${CARDS[k].rar}"><canvas width="120" height="120" data-ic="${k}"></canvas><i class="gem">${CARDS[k].cost}</i><span class="nm">${CARDS[k].n}</span></button>`).join('')}</div>
   <div class="dmine">${mine.map(k=>`<canvas width="48" height="48" data-ic="${k}"></canvas>`).join('')}</div><button class="ghost" id="shx">Выйти</button></div>`;
  paintIcons(sh);sh.hidden=false;$('#shx').onclick=closeSheet;
  sh.querySelectorAll('.dpair .cc').forEach(b=>b.onclick=()=>{AU.sfx('dep');const k=b.dataset.k;mine.push(k);theirs.push(pairs[i].find(x=>x!==k));i++;show()})};show()}

/* ---------- окно добычи: сундук, затем карты по одной ---------- */
function showLoot(R,title){if(!R)return;const ov=$('#loot'),items=[];
 if(R.gold)items.push({gold:R.gold});if(R.gems)items.push({gems:R.gems});if(R.shards)items.push({shards:R.shards});for(const c of R.cards)items.push(c);
 let i=R.t?-1:0;AU.sfx(R.t?'ui':'win');
 const show=()=>{if(i===-1){ov.innerHTML=`<h2>${title}</h2><canvas class="cbig" width="440" height="366" data-chest="${R.t}"></canvas><p class="lhint">Нажми, чтобы открыть</p>`;paintIcons(ov);return}
  if(i>=items.length){ov.innerHTML=`<h2>Получено</h2><div class="lsum">${items.map(x=>x.k?`<div><canvas width="120" height="120" data-ic="${x.k}"></canvas><span>×${x.n}</span></div>`:`<div>${x.gold?ICO.gold:x.gems?ICO.gem:ICO.shard}<span>+${fmtN(x.gold||x.gems||x.shards)}</span></div>`).join('')}</div><button class="big blue" id="lok">Готово</button>`;
   paintIcons(ov);$('#lok').onclick=e=>{e.stopPropagation();ov.hidden=true;ov.innerHTML='';renderHome()};$('#lok').focus();return}
  const x=items[i],left=items.length-i-1;
  if(x.k){const c=CARDS[x.k],o=P.cards[x.k],nd=needOf(x.k);AU.sfx(x.isNew?'win':c.rar==='common'?'dep':'ability');
   ov.innerHTML=`<div class="lcard"><canvas width="240" height="240" data-ic="${x.k}"></canvas>${x.isNew?'<span class="nw">Новая карта!</span>':''}<h3 style="color:${RAR[c.rar].c}">${c.n}</h3><span class="x">×${x.n}</span>
    <div class="lbar${canUp(x.k)?' up':''}"><i style="width:${o.lv>=MAXLV?100:Math.min(100,o.n/nd*100).toFixed(0)}%"></i><em>${o.lv>=MAXLV?'МАКС':`${o.n}/${nd} · ур. ${o.lv}`}</em></div>${canUp(x.k)?'<span class="lhint" style="color:var(--good)">Можно улучшить!</span>':''}</div><p class="lhint">${left?`Ещё ${left} · нажми`:'Нажми'}</p>`}
  else{AU.sfx('hit');ov.innerHTML=`<div class="lcard">${(x.gold?ICO.gold:x.gems?ICO.gem:ICO.shard).replace('<svg','<svg class="big"')}<span class="x">+${fmtN(x.gold||x.gems||x.shards)}</span><h3>${x.gold?'Золото':x.gems?'Кристаллы':'Осколки эволюции'}</h3></div><p class="lhint">${left?`Ещё ${left} · нажми`:'Нажми'}</p>`}
  paintIcons(ov)};
 let busy=false;
 ov.onclick=()=>{if(i>=items.length||busy)return;if(i===-1){busy=true;const cv=ov.querySelector('canvas');cv.classList.add('shake');AU.sfx('chest');
   setTimeout(()=>{drawChest(cv.getContext('2d'),R.t,true,cv.width,cv.height);cv.classList.remove('shake');AU.sfx('win');setTimeout(()=>{busy=false;i=0;show()},REDUCE?0:380)},REDUCE?0:450);return}i++;show()};
 ov.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ov.onclick()}};
 ov.tabIndex=-1;ov.hidden=false;show();ov.focus()}

/* ---------- настройки и сохранение ---------- */
function openSettings(){const sh=$('#sheet');let armed=false;
 sh.innerHTML=`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shn"><h3 class="t" id="shn">Настройки</h3>
  <label class="fld"><span>Имя игрока</span><input id="nmi" maxlength="16" value="${esc(P.name)}" autocomplete="off"></label>
  <button class="ghost" id="gfx">${R3.want?'Графика: реалистичная 3D':'Графика: простая 2D'}</button>${R3.failed?`<p class="note" style="color:#ff9b8f">3D не запустилось: ${esc(R3.why).slice(0,160)}</p>`:R3.want&&R3.ready?'<p class="note">3D работает</p>':R3.want?`<p class="note">3D загружается: ${Math.round(R3.progress*100)}%</p>`:''}
  <div class="seg" role="radiogroup" aria-label="Качество графики">${Object.entries(QUAL).map(([k,q])=>`<button role="radio" aria-checked="${qualKey()===k}" data-q="${k}">${q.n}</button>`).join('')}</div>
  <p class="note small">Высокое — самая чёткая картинка. Если телефон греется или бой подтормаживает, выбери «Среднее».</p>
  <button class="ghost" id="snd">${AU.mute?'Звук выключен':'Звук включён'}</button>
  <label class="fld rng"><span>Звуки боя</span><input type="range" id="vsfx" min="0" max="1" step=".05" value="${SET.sfx}"></label>
  <label class="fld rng"><span>Музыка</span><input type="range" id="vmus" min="0" max="1" step=".05" value="${SET.music}"></label>
  <h4>ТРЯСКА ЭКРАНА</h4><div class="seg" role="radiogroup" aria-label="Тряска экрана">${[['full','Обычная'],['low','Слабая'],['off','Нет']].map(([k,n])=>`<button role="radio" aria-checked="${SET.shake===k}" data-sh="${k}">${n}</button>`).join('')}</div>
  <h4>ЭФФЕКТЫ</h4><div class="seg" role="radiogroup" aria-label="Эффекты">${[['full','Все'],['low','Меньше']].map(([k,n])=>`<button role="radio" aria-checked="${SET.fx===k}" data-fx="${k}">${n}</button>`).join('')}</div>
  <button class="ghost" id="dbg">${SET.debug?'Отладка в бою: включена':'Отладка в бою: выключена'}</button>
  <h4>СОХРАНЕНИЕ</h4><p class="note">Прогресс хранится в этом браузере и может стереться вместе с его данными. Скопируй код и держи его в заметках: по нему прогресс восстановится на любом устройстве.</p>
  <textarea id="exp" readonly rows="3" aria-label="Код сохранения"></textarea><button class="ghost" id="cpy">Скопировать код</button>
  <textarea id="imp" rows="3" placeholder="Вставь сюда код сохранения" aria-label="Код для загрузки"></textarea><button class="ghost" id="ld">Загрузить прогресс из кода</button><p class="note" id="imsg" role="status"></p>
  <h4>СБРОС</h4><button class="ghost danger" id="rst">Начать заново</button>
  <button class="big blue" id="shx">Готово</button></div>`;
 sh.hidden=false;sh.onclick=e=>{if(e.target===sh)closeSheet()};$('#exp').value=exportCode();
 $('#nmi').onchange=()=>{const v=$('#nmi').value.trim().slice(0,16);P.name=v||'Игрок';saveP();renderHeader()};
 $('#gfx').onclick=()=>{R3.want=!R3.want;store.set('ac.gfx',R3.want?'hi':'lo');$('#gfx').textContent=R3.want?'Графика: реалистичная 3D':'Графика: простая 2D';if(R3.want&&T&&!R3.ready)r3Load()};
 sh.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{AU.sfx('ui');store.set('ac.qual',b.dataset.q);sh.querySelectorAll('[data-q]').forEach(x=>x.setAttribute('aria-checked',x===b));if(R3.ready)applyQual()});
 $('#vsfx').oninput=e=>{SET.sfx=+e.target.value;saveSet()};$('#vsfx').onchange=()=>AU.sfx('hit');
 $('#vmus').oninput=e=>{SET.music=+e.target.value;saveSet();MUS.vol()};
 sh.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>{SET.shake=b.dataset.sh;saveSet();sh.querySelectorAll('[data-sh]').forEach(x=>x.setAttribute('aria-checked',x===b))});
 sh.querySelectorAll('[data-fx]').forEach(b=>b.onclick=()=>{SET.fx=b.dataset.fx;saveSet();sh.querySelectorAll('[data-fx]').forEach(x=>x.setAttribute('aria-checked',x===b))});
 $('#dbg').onclick=()=>{SET.debug=!SET.debug;saveSet();$('#dbg').textContent=SET.debug?'Отладка в бою: включена':'Отладка в бою: выключена'};
 $('#snd').onclick=()=>{AU.init();AU.mute=!AU.mute;store.set('ac.mute',AU.mute);micon();MUS.vol();$('#snd').textContent=AU.mute?'Звук выключен':'Звук включён';AU.sfx('ui')};
 $('#cpy').onclick=()=>{const t=$('#exp');t.value=exportCode();const sel2=()=>{t.focus();t.select();$('#imsg').textContent='Код выделен — скопируй его вручную'};
  try{navigator.clipboard.writeText(t.value).then(()=>{$('#imsg').textContent='Код скопирован'},sel2)}catch(e){sel2()}};
 $('#ld').onclick=()=>{const err=importCode($('#imp').value);if(err){$('#imsg').textContent=err;AU.sfx('deny');return}AU.sfx('win');closeSheet();tab='play';renderHome();toast('Прогресс загружен')};
 $('#rst').onclick=()=>{if(!armed){armed=true;$('#rst').textContent='Точно? Всё пропадёт — нажми ещё раз';return}P=freshProfile();saveP();closeSheet();tab='play';renderHome();toast('Начинаем с нуля')};
 $('#shx').onclick=()=>{$('#nmi').onchange();closeSheet()};$('#shx').focus()}

/* ---------- бой ---------- */
const TIPS={full:'Эликсир полон — трать его, иначе он пропадает',enemy:'Враг перешёл реку — поставь защитника у него на пути',spell:'Заклинание можно бросить в любое место поля',
 tower:'Башня пала! Теперь войска можно ставить и на её стороне реки',king:'Король проснулся — теперь он тоже стреляет',double:'Последняя минута: эликсир копится вдвое быстрее',
 champ:'Чемпион на поле — нажми кнопку способности в гуще боя',ot:'Овертайм: кто первым сломает башню, тот и победил',
 night:'Скоро ночь: видно только то, что освещено. Свет дают башни, факелы и вспышки',dark:'Враг в темноте! Поставь рядом свою карту или кинь Вспышку, чтобы его увидеть',
 light:'У тебя есть карта света: ночью она открывает врагов для твоих стрелков и башен',bridge:'Мост рухнул: наземные войска пойдут через другой. Через 20 секунд он вернётся'};
const NIGHT_TIPS=['night','dark','light','bridge'];
let tipT=0;
function tip(k){if(P.st.games>=(NIGHT_TIPS.includes(k)?6:3)||P.hints.includes(k)||!$('#tip').hidden||!$('#help').hidden)return;P.hints.push(k);saveP();const e=$('#tip');e.querySelector('span').textContent=TIPS[k];e.hidden=false;clearTimeout(tipT);tipT=setTimeout(()=>{e.hidden=true},4200)}
function tips(){if(NET.on||P.st.games>=6||G.over)return;const S=G.side[ME];
 if(G.cyc&&!G.night&&!G.mc.night){const C=cycOf();if((G.t%(C.day+C.night))>C.day-12&&G.t<C.day+C.night)tip('night')}
 if(G.vis&&G.U.some(u=>u.tm===1&&alive(u)&&!G.vis[0].has(u))&&G.U.some(u=>u.tm===0&&alive(u)))tip('dark');
 if(G.cyc&&S.hand.some(k=>k&&((CARDS[CARDS[k].unit||k].light)||CARDS[k].flash)))tip('light');
 if(G.bridges.some(b=>b.down>0))tip('bridge');
 if(P.st.games>=3)return;
 if(S.el>=10)tip('full');if(G.U.some(u=>u.tm===1&&u.y>RY+RIV))tip('enemy');if(sel!=null&&S.hand[sel]&&CARDS[S.hand[sel]].type==='spell')tip('spell');
 if(G.T.some(t=>t.tm===1&&t.kind==='p'&&t.hp<=0))tip('tower');if(G.T.some(t=>t.tm===1&&t.kind==='k'&&t.act))tip('king');
 if(elRate()>=2&&!G.ot)tip('double');if(G.ot)tip('ot');if(S.champ&&alive(S.champ))tip('champ')}
const OV=$('#ov');
function showOv(html){OV.innerHTML=html;OV.classList.add('on')}
function hideOv(){OV.classList.remove('on');OV.innerHTML=''}
function showView(v){if(v!=='battle')document.body.classList.remove('full3d');$('#home').hidden=v==='battle';$('#battle').hidden=v!=='battle';if(v==='battle')requestAnimationFrame(fit)}
let handEls=[],hs={};
function startBattle(train,opt){AU.init();opt=opt||null;
 const A0=curArena();if(R3.want&&!R3.failed&&(!R3.ready||!r3HasTheme(A0))){const sh=$('#sheet');if(T&&!R3.loading&&!R3.ready)r3Load();if(R3.ready)r3LoadTheme(A0);
  sh.innerHTML=`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shn"><h3 class="t" id="shn">Загрузка 3D</h3><p class="note">Модели и текстуры грузятся один раз, потом берутся из кэша.</p><div class="lbar" style="width:100%"><i id="lp" style="width:0%"></i><em id="lpt">0%</em></div><button class="ghost" id="lsk">Играть в простой графике</button></div>`;
  sh.hidden=false;let skip=false;const t0=performance.now();$('#lsk').onclick=()=>{skip=true;closeSheet();startBattle1(train,opt)};
  const w=()=>{if(skip)return;const p=Math.round(R3.progress*100);if($('#lp')){$('#lp').style.width=p+'%';$('#lpt').textContent=T?p+'%':'загружаю 3D-движок…'}
   if(!T&&!R3.failed&&performance.now()-t0>40000){R3.failed=true;R3.why='3D-движок не загрузился за 40 секунд (сеть или запрет загрузки модулей)'}
   if(R3.ready&&r3HasTheme(A0)||R3.failed||!T&&!R3.want){closeSheet();if(R3.failed)toast('3D не запустилось: '+R3.why.slice(0,120));startBattle1(train,opt)}else setTimeout(w,150)};w();return}
 startBattle1(train,opt)}
let lastOpt=null,lastReplay=store.get('ac.replay',null),rspeed=1;
const MODE_N={triple:'Тройной эликсир',sudden:'Внезапная смерть',draft:'Драфт',double:'Двойной эликсир',random:'Случайные колоды',challenge:'Испытание',tutor:'Обучение'};
function startBattle1(train,opt){AU.sfx('ui');closeSheet();lastOpt=opt;const a=curArena(),md=opt?opt.mode:'normal',B=botSetup(a,train),nm=pickV(BOT_NAMES);
 let em=md==='challenge'||md==='random'?'normal':md,thp=B.thp;
 if(md==='challenge'){B.skill=chalBot();thp=1}
 if(md==='tutor'){B.skill=CFG.tutor.bot;thp=CFG.tutor.thp[Math.min(P.tutB,CFG.tutor.thp.length-1)];B.deck=['guard','shooters','bones','giant','imps','slingers','cannon','volley'];for(const k of B.deck)B.lv[k]=START_LV[CARDS[k].rar];B.ex={};B.tt='archer'}
 if(TH!==THEMES[a]){TH=THEMES[a];BG=null}
 let decks=[curDeck(),B.deck],lv=[levelsMap(),B.lv],ex=[deckSpecial(),B.ex];
 if(md==='draft'||md==='random'){const eq={};for(const k of CARD_IDS)eq[k]=START_LV[CARDS[k].rar]+ARENA_LV[a];decks=md==='draft'?[opt.deck,opt.bot]:[randomDeck(),randomDeck()];lv=[eq,eq];ex=[{},{}]}
 newMatch({arena:a,decks,lv,kl:[P.kl,B.kl],bots:[null,B.skill],names:['Ты',nm],train:train||!!opt,mode:em,ex,tt:[P.tt,B.tt],thp:[1,thp]});G.event=opt?md:null;
 if(md==='tutor')G.tutor={step:P.tutB,pt:{x:BR[0]+10,y:RY+RIV+70}};
 mode='play';sel=null;gx=-1;paused=false;hideOv();$('#emo').hidden=true;$('#tip').hidden=true;$('#bp').hidden=false;
 $('#enname').textContent=train?`Тренировка · ${SKILL[P.train].n}`:md==='tutor'?`Обучение ${P.tutB+1} из ${CFG.tutor.battles}`:opt?`${MODE_N[md]} · ${nm}`:`${nm} · ур. ${B.kl} · ${SKILL[B.skill]?SKILL[B.skill].n:''}`;
 showView('battle');if(ARENA_RULE[a]&&md!=='tutor')setTimeout(()=>{if(G&&!G.over)banner(ARENA_RULE[a],'#9fd8ff')},2600);R3.on=false;if(R3.want&&R3.ready&&r3Begin(a))r3Show();else r3Stop();hs={};renderHand();$('#help').hidden=P.tut>0&&md!=='tutor';if(md==='tutor')$('#help span').textContent=['Нажми на карту внизу, затем — на светящийся круг','Ставь защитников на пути врага, пока он у твоих башен','Набери эликсир и атакуй вместе с поддержкой'][Math.min(P.tutB,2)];banner(train?'Тренировка':opt?MODE_N[md]:'В бой!','#ffc83d');MUS.play('battle')}
let lpT=0;
function showCardStats(k){const S=G.side[ME],lv=S.lv[k]||START_LV[CARDS[k].rar],c=CARDS[k],e=$('#cstat');
 e.innerHTML=`<b>${c.n}</b><small>${RAR[c.rar].n} · ур. ${lv} · ${c.cost} эликсира${k===S.evo?' · эволюция':k===S.hero?' · герой':''}</small><div>${statRows(k,lv).map(([a,b,suf])=>`<span>${a}<em>${typeof b==='number'?fmtN(b):b}${suf||''}</em></span>`).join('')}</div>`;e.hidden=false}
function hideCardStats(){clearTimeout(lpT);const e=$('#cstat');if(e)e.hidden=true}
function renderHand(){const S=G.side[ME],box=$('#hand');box.innerHTML='';handEls=[];
 S.hand.forEach((k,i)=>{if(!k){const e=document.createElement('div');e.className='card empty';e.setAttribute('aria-hidden','true');box.appendChild(e);handEls.push(e);return}
  const c=CARDS[k],b=document.createElement('button');b.className='card';b.dataset.r=c.rar;b.setAttribute('aria-label',`${c.n}, ${c.cost} эликсира`);
  if(k===S.evo)b.classList.add(evoReady(S,k)?'evo':'evo-wait');if(k===S.hero)b.classList.add('hero');
  b.innerHTML=`<canvas width="256" height="256" data-ic="${k}"></canvas><i class="gem">${c.cost}</i>${k===S.evo?`<span class="eb">${evoReady(S,k)?'ЭВО':'эво '+S.evoN+'/'+EVO[k].cyc}</span>`:k===S.hero?'<span class="eb">ГЕРОЙ</span>':''}<i class="pb"><b></b></i><em class="need"></em><span class="nm">${c.n}</span>`;
  b.addEventListener('pointerdown',e=>{if(!G||G.over||paused||mode!=='play')return;AU.init();sel=sel===i?null:i;AU.sfx('ui');e.preventDefault();clearTimeout(lpT);lpT=setTimeout(()=>showCardStats(k),450)});
  b.addEventListener('pointerup',hideCardStats);b.addEventListener('pointerleave',hideCardStats);b.addEventListener('contextmenu',e=>e.preventDefault());
  if(i===hs.newIdx)b.classList.add('in');box.appendChild(b);handEls.push(b)});hs.newIdx=-1;
 const nx=document.createElement('div');nx.id='nx';nx.innerHTML=`<canvas width="72" height="72" data-ic="${S.queue[0]}"></canvas><span>ДАЛЕЕ</span>`;box.appendChild(nx);
 paintIcons(box);hs.sig=S.hand.join()+'|'+S.queue[0]+'|'+S.evoN}
const fmt=s=>{s=Math.max(0,Math.ceil(s));return(s/60|0)+':'+String(s%60).padStart(2,'0')};
const setPips=(tm,n)=>[...$('#cp'+tm+' .pips').children].forEach((e,i)=>e.classList.toggle('on',i<n));
function hud(){const S=G.side[ME],e=S.el,ei=Math.floor(e);
 $('#ef').style.width=(e*10)+'%';if(ei!==hs.el){hs.el=ei;$('#en').textContent=ei;$('#eb').classList.toggle('full',ei>=10)}
 const M=CFG.match,left=G.tb?0:G.ot?M.ot-G.otT:M.len-G.t,tm=fmt(left);if(tm!==hs.tm){if(hs.tm&&left<=10&&left>0&&!G.over)AU.sfx('tick');hs.tm=tm;$('#tm').textContent=tm;$('#tm').classList.toggle('low',left<=10||!!G.ot)}
 tips();if(G.ot&&MUS.theme!=='ot')MUS.play('ot');else if(!G.ot&&!G.over&&(MUS.theme==='battle'||MUS.theme==='night')){const th=G.night?'night':'battle';if(MUS.theme!==th)MUS.play(th)}
 if(G.cyc&&!G.tb){const C=cycOf(),per=C.day+C.night,p=G.t%per,n=p>=C.day,left=Math.ceil(n?per-p:C.day-p),tx=G.mc.night?'☾ вечная ночь':G.force?(G.force.k?'☾ затмение ещё ':'☀ рассвет ещё ')+Math.ceil(G.force.t):(n?'☾ рассвет через ':'☀ ночь через ')+left;if(tx!==hs.dn){hs.dn=tx;const e=$('#dn');e.textContent=tx;e.classList.toggle('n',n)}}
 else if(hs.dn){hs.dn='';$('#dn').textContent=''}
 const er=elRate(),ph=G.tb?'ТАЙБРЕЙКЕР':G.ot?'ОВЕРТАЙМ · ×'+er:er>1?'ЭЛИКСИР ×'+er:'ОСТАЛОСЬ';if(ph!==hs.ph){hs.ph=ph;$('#ph').textContent=ph}
 const cr=G.crowns.join();if(cr!==hs.cr){hs.cr=cr;setPips(0,G.crowns[ME]);setPips(1,G.crowns[1-ME])}
 if(S.hand.join()+'|'+S.queue[0]+'|'+S.evoN!==hs.sig)renderHand();
 handEls.forEach((b,i)=>{if(!S.hand[i])return;const c=CARDS[S.hand[i]];b.style.setProperty('--p',Math.min(1,e/c.cost).toFixed(3));b.classList.toggle('sel',sel===i);b.classList.toggle('off',cardBlocked(ME,S.hand[i]));const poor=e<c.cost;b.classList.toggle('poor',poor);const nd=b.querySelector('.need');if(nd){const t=poor?'ещё '+Math.ceil(c.cost-e-1e-9):'';if(nd.textContent!==t)nd.textContent=t}});
 const ch=!!S.champ&&alive(S.champ),ab=$('#ab');if(ab.hidden!==!ch)ab.hidden=!ch;
 if(ch){const a=S.champ.c.ability;ab.classList.toggle('cd',S.abCd>0||S.el<a.cost);const t=S.abCd>0?`${a.n} · ${Math.ceil(S.abCd)} с`:a.n;if(t!==hs.ab){hs.ab=t;$('#abn').textContent=t}}}
function tryPlay(){const S=G.side[ME],key=S.hand[sel],c=CARDS[key];if(!key||G.tb){sel=null;return}
 if(cardBlocked(ME,key))return deny(key===S.hero?'Герой уже на поле':'Чемпион уже на поле');
 if(S.el<c.cost)return deny('Мало эликсира');
 if(!canPlace(ME,key,gx,gy))return deny(c.type==='building'&&gy>RY+RIV?'Мешает строение или башня':'Сюда нельзя');
 const idx=sel;if(NET.on){netCmd({k:'p',i:sel,x:gx,y:gy});AU.sfx('dep')}else playCard(0,sel,gx,gy);sel=null;hs.newIdx=idx;renderHand();if(!P.tut){P.tut=1;saveP();$('#help').hidden=true}}
function deny(t){AU.sfx('deny');floatText(clamp(gx,48,W-48),gy-20,t,'#ff9b8f',12)}
function togglePause(){if(NET.on||mode!=='play'||!G||G.over)return;paused=!paused;
 if(paused){showOv(`<div class="scr"><h2>Пауза</h2><button class="big" id="resume">Продолжить</button><button class="ghost" id="quit">Сдаться</button></div>`);$('#resume').onclick=togglePause;$('#quit').onclick=()=>{paused=false;hideOv();G.crowns[1]=3;finish(1)};$('#resume').focus()}
 else hideOv()}
/* разбор боя: перевес по эликсиру (убитые враги минус свои потери) по секундам, отметки упавших башен */
function advChart(){const d=G.tl;if(!d||d.length<6)return'';const N=d.length,W0=300,H0=92,L=6,R=294,T=8,B=74,mid=(T+B)/2;
 const m=Math.max(3,...d.map(Math.abs)),X=i=>L+i/(N-1)*(R-L),Y=v=>mid-v/m*(B-T)/2;
 const pts=d.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' '),area=`M${X(0)},${mid} L${pts.split(' ').join(' L')} L${X(N-1)},${mid}Z`;
 let ticks='';for(let s=0;s<N;s+=60)ticks+=`<text x="${X(s)}" y="${H0-4}" text-anchor="${!s?'start':X(s)>R-14?'end':'middle'}">${fmt(s)}</text>`;
 const ev=G.tlEv.map(e=>{const x=X(Math.min(N-1,e.t));return`<circle cx="${x}" cy="${mid}" r="5" fill="${TEAM[1-e.tm].m}" stroke="var(--panel)" stroke-width="2"><title>${e.tm?'Ты сломал':'Соперник сломал твою'} ${e.kind==='k'?'королевскую башню':'башню'} · ${fmt(e.t)}</title></circle>`}).join('');
 let bi=0;d.forEach((v,i)=>{if(v>d[bi])bi=i});const best=d[bi]>=1?`Лучший момент: +${String(d[bi]).replace('.',',')} эликсира на ${fmt(bi)}`:'';
 const fin=d[N-1],sum=`Перевес по эликсиру за бой, в конце ${fin>0?'+':''}${String(fin).replace('.',',')}`;
 return`<div class="adv" id="adv"><div class="advh"><b>Перевес по эликсиру</b><span><i style="background:${TEAM[0].m}"></i>ты сломал <i style="background:${TEAM[1].m}"></i>он сломал</span></div>
 <svg viewBox="0 0 ${W0} ${H0}" role="img" aria-label="${sum}"><defs><clipPath id="advU"><rect x="0" y="0" width="${W0}" height="${mid}"/></clipPath><clipPath id="advD"><rect x="0" y="${mid}" width="${W0}" height="${H0}"/></clipPath></defs>
 <text class="lb" x="${L}" y="${T+8}">ты впереди</text><text class="lb" x="${L}" y="${B-2}">соперник впереди</text>
 <path d="${area}" fill="${TEAM[0].m}" opacity=".35" clip-path="url(#advU)"/><path d="${area}" fill="${TEAM[1].m}" opacity=".35" clip-path="url(#advD)"/>
 <line x1="${L}" x2="${R}" y1="${mid}" y2="${mid}" stroke="var(--line)" stroke-width="1"/>
 <polyline points="${pts}" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${ev}
 <line id="advX" y1="${T}" y2="${B}" stroke="var(--mute)" stroke-width="1" visibility="hidden"/><circle id="advP" r="4" fill="var(--ink)" stroke="var(--panel)" stroke-width="2" visibility="hidden"/>${ticks}
 <rect x="0" y="0" width="${W0}" height="${B}" fill="transparent" id="advH"/></svg><div class="tip" id="advT" hidden></div>${best?`<small>${best}</small>`:''}</div>`}
function advHover(){const h=$('#advH');if(!h)return;const d=G.tl,N=d.length,svg=h.ownerSVGElement,tip=$('#advT'),L=6,R=294,T=8,B=74,mid=(T+B)/2,m=Math.max(3,...d.map(Math.abs));
 const show=e=>{const r=svg.getBoundingClientRect(),vx=(e.clientX-r.left)/r.width*300,i=clamp(Math.round((vx-L)/(R-L)*(N-1)),0,N-1),x=L+i/(N-1)*(R-L),y=mid-d[i]/m*(B-T)/2,v=d[i];
  $('#advX').setAttribute('x1',x);$('#advX').setAttribute('x2',x);$('#advX').setAttribute('visibility','visible');$('#advP').setAttribute('cx',x);$('#advP').setAttribute('cy',y);$('#advP').setAttribute('visibility','visible');
  tip.hidden=false;tip.textContent=`${fmt(i)} · ${v===0?'поровну':(v>0?'+':'−')+String(Math.abs(v)).replace('.',',')+(v>0?' в твою пользу':' у соперника')}`;
  const px=x/300*r.width;tip.style.left=clamp(px,60,r.width-60)+'px'};
 const hide=()=>{tip.hidden=true;$('#advX').setAttribute('visibility','hidden');$('#advP').setAttribute('visibility','hidden')};
 h.addEventListener('pointermove',show);h.addEventListener('pointerdown',show);h.addEventListener('pointerleave',hide)}
function endScreen(){if(NET.on){netEnd();return}mode='end';sel=null;const r=G.res,cr=G.crowns,S=G.stats[0],train=G.train,ev=G.event;let dtr=0,lucky=-1,gold=0,newA=-1,evr=null,chr=null,tut=null;
 if(ev&&ev!=='challenge'&&ev!=='tutor'&&r===0)evr=eventReward(ev);if(!G.train||ev)clanFight();
 if(ev==='challenge')chr=chalResult(r===0);
 if(ev==='tutor'&&r===0){P.tutB=Math.min(CFG.tutor.battles,P.tutB+1);P.gold+=CFG.tutor.gold;saveP();tut=P.tutB}
 if(!train||ev)questProgress({wins:r===0?1:0,played:S.played,spells:S.spells,towers:cr[0],dmg:Math.round(S.dmg),battles:1,three:r===0&&cr[0]===3?1:0,bridges:S.bridges,night:S.night,mid:G.mode==='midnight'&&r===0?1:0});
 lastReplay={setup:G.setup,log:G.log.slice(),ticks:G.tick};store.set('ac.replay',lastReplay);
 if(!train){const a0=curArena(),before=P.tr;P.tr=Math.max(ARENAS[a0].tr,P.tr+trophyDelta(r));dtr=P.tr-before;P.best=Math.max(P.best,P.tr);
  if(r===0){lucky=a0;gold=8+3*a0;P.gold+=gold}
  const a1=curArena();if(a1>P.arSeen){newA=a1;P.arSeen=a1}
  P.st.games++;if(r===0)P.st.w++;else if(r===1)P.st.l++;else P.st.d++;P.st.cr+=cr[0];if(cr[0]===3)P.st.three++;saveP()}
 MUS.play('menu');AU.sfx(r===0?'win':r===1?'lose':'ui');
 const rw=ev==='tutor'?`<span class="rw">${tut!=null?`Обучение ${tut} из ${CFG.tutor.battles} пройдено · ${ICO.gold}<b>+${CFG.tutor.gold}</b>`:'Попробуй ещё раз — у тебя получится'}</span>`
  :ev==='challenge'?`<span class="rw">Испытание: побед ${chr.c.wins}, поражений ${chr.c.loss} из ${CHAL.maxLoss}</span>${chr.end?`<span class="rw" style="color:var(--gold)">Испытание завершено: ${ICO.gold}<b>+${fmtN(chr.R.gold)}</b>${chr.R.gems?` · ${ICO.gem}<b>+${chr.R.gems}</b>`:''}${chr.R.shards?` · ${ICO.shard}<b>+${chr.R.shards}</b>`:''}</span>`:''}`
  :ev?`<span class="rw">${MODE_N[ev]}: без кубков</span>${evr?`<span class="rw">${ICO.gold}<b>+${evr.gold}</b>${evr.shards?` · ${ICO.shard}<b>+1</b> осколок`:''}</span>`:''}`:train?'<span class="rw">Тренировка: без кубков и наград</span>':`<span class="rw">${ICO.trophy}<b>${dtr>0?'+':''}${dtr}</b> кубков${gold?` · ${ICO.gold}<b>+${gold}</b>`:''}</span>
  ${lucky>=0?`<button class="big lucky" id="luck"><canvas width="84" height="70" data-chest="silver"></canvas>Сундук удачи</button>`:''}
  ${newA>=0?`<span class="rw" style="color:var(--gold)">Новая арена: «${ARENAS[newA].n}»! Открылись новые карты</span>`:''}`;
 showOv(`<div class="scr"><h2 style="color:${r===0?'var(--gold)':r===1?'var(--red)':'var(--ink)'}">${r===0?'Победа!':r===1?'Поражение':'Ничья'}</h2>
  <div class="pips big3">${[0,1,2].map(i=>crownSVG.replace('<svg','<svg class="'+(i<cr[0]?'on':'')+'"')).join('')}</div>
  <p class="sub">Счёт ${cr[0]} : ${cr[1]} против «${esc(G.names[1])}»</p>
  <div class="endrw">${rw}</div>
  <div class="st2"><span>Урон башням <b>${fmtN(S.dmg)}</b></span><span>Эликсир <b>${Math.round(S.spent)}</b></span><span>Пропало <b>${Math.round(S.leak)}</b></span>${S.trade?`<span>Выгодные размены <b>+${S.trade}</b></span>`:''}</div>
  ${advChart()}
  <div class="odeck" aria-label="Колода соперника"><small>КОЛОДА СОПЕРНИКА</small>${G.side[1].deck.map(k=>`<canvas width="60" height="60" data-ic="${k}" title="${CARDS[k].n}"></canvas>`).join('')}<button class="link" id="cpd">Скопировать колоду</button></div>
  ${lastReplay?'<button class="ghost" id="rep">Смотреть повтор</button>':''}<button class="big" id="again">${train?'ЕЩЁ РАЗ':'ЕЩЁ БОЙ'}</button><button class="ghost" id="home2">Домой</button></div>`);
 paintIcons(OV);advHover();
 const od=G.side[1].deck.slice();let luckOpen=false;
 const goHome=()=>{AU.sfx('ui');hideOv();G=null;mode='home';r3Stop();showView('home');tab='play';renderHome();if(newA>=0)toast(`Арена ${newA+1}: «${ARENAS[newA].n}» открыта`)};
 if(lucky>=0){P.luck.push(lucky);if(P.luck.length>6)P.luck.shift();saveP();$('#luck').onclick=()=>{if(luckOpen)return;luckOpen=true;const i=P.luck.lastIndexOf(lucky);if(i>=0)P.luck.splice(i,1);saveP();goHome();luckySpin(lucky)}}
 $('#cpd').onclick=()=>{AU.init();const miss=od.filter(k=>!P.cards[k]);if(miss.length){AU.sfx('deny');toast('Не хватает карт: '+miss.map(k=>CARDS[k].n).join(', '));return}
  if(!okDeck(od)){AU.sfx('deny');toast('Такую колоду собрать нельзя');return}P.decks[P.slot]=od;saveP();AU.sfx('dep');$('#cpd').textContent=`Колода ${P.slot+1} заменена`;$('#cpd').disabled=true};
 $('#again').onclick=()=>{if(ev==='draft'){hideOv();G=null;mode='home';r3Stop();showView('home');openDraft();return}startBattle(train&&!ev,ev?lastOpt:null)};$('#home2').onclick=goHome;if($('#rep'))$('#rep').onclick=()=>{hideOv();playReplay(lastReplay)};$('#again').focus()}

/* ---------- повтор боя: тот же seed и журнал команд, без ботов и без управления ---------- */
function playReplay(R){if(!R)return;AU.init();const a=curArena();if(TH!==THEMES[a]){TH=THEMES[a];BG=null}
 newMatch(Object.assign({},R.setup,{bots:[null,null],replay:R.log}));G.event=null;mode='replay';sel=null;gx=-1;paused=false;rspeed=1;hideOv();
 $('#enname').textContent='Повтор боя';showView('battle');R3.on=false;if(R3.want&&R3.ready&&r3Begin(a))r3Show();else r3Stop();hs={};renderHand();$('#help').hidden=true;
 if($('#rsp'))$('#rsp').remove();const b=document.createElement('button');b.id='rsp';b.className='ib rsp';b.textContent='×1';b.onclick=()=>{rspeed=rspeed===1?2:rspeed===2?4:1;b.textContent='×'+rspeed};$('#wrap').appendChild(b);
 banner('Повтор','#5ec8ff');MUS.play('battle')}
function replayDone(){const r=G.res;showOv(`<div class="scr"><h2>Повтор окончен</h2><p class="sub">${r===0?'Победа':r===1?'Поражение':'Ничья'} · ${G.crowns[0]} : ${G.crowns[1]}</p><button class="big" id="rag">Смотреть снова</button><button class="ghost" id="rhm">Домой</button></div>`);
 $('#rag').onclick=()=>playReplay(lastReplay);$('#rhm').onclick=()=>{$('#rsp')&&$('#rsp').remove();hideOv();G=null;mode='home';r3Stop();showView('home');tab='play';renderHome();MUS.play('menu')}}

/* ---------- ввод ---------- */
/* ткнул чуть дальше своей половины — карта встаёт на ближайший разрешённый край (или в открытый карман) */
function snapPlace(key,x,y){if(!key||canPlace(ME,key,x,y)||ME)return[x,y];const c=CARDS[key];if(c.type==='spell')return[x,y];
 const own=RY+RIV+3,cand=[];x=clamp(x,10,W-10);
 if(c.tunnel){cand.push([x,y<RY?RY-RIV-4:RY+RIV+4])}
 else{if(pocketOpen(ME,x)){if(y<POCKET_Y)cand.push([x,POCKET_Y+1]);else if(Math.abs(y-RY)<RIV+3)cand.push([x,y<RY?RY-RIV-4:own])}cand.push([x,Math.max(y,own)])}
 for(const[cx,cy]of cand)for(const[dx,dy]of[[0,0],[0,8],[0,16],[-14,4],[14,4],[0,26],[-26,10],[26,10]]){const px=clamp(cx+dx,10,W-10),py=cy+dy;if(canPlace(ME,key,px,py))return[px,py]}
 // внутри башни или строения — ближайшая свободная точка вокруг
 for(let r=6;r<=70;r+=4)for(let i=0;i<24;i++){const a=i/24*Math.PI*2,px=clamp(x+Math.cos(a)*r,10,W-10),py=clamp(y+Math.sin(a)*r,10,H-10);if(canPlace(ME,key,px,py))return[px,py]}
 return[x,y]}
function pos(e){let x,y;if(R3.on){const q=r3Pick(e.clientX,e.clientY);if(!q){gx=-1;return}x=q.x;y=q.y}else{const r=C.getBoundingClientRect();x=(e.clientX-r.left)/r.width*W;y=(e.clientY-r.top)/r.height*H;if(x<0||x>W||y<0||y>H){gx=-1;return}}
 [gx,gy]=G&&sel!=null&&mode==='play'?snapPlace(G.side[ME].hand[sel],x,y):[x,y]}
addEventListener('pointermove',e=>{if(mode==='play')pos(e)});
C.addEventListener('pointerdown',pos);
addEventListener('pointerup',e=>{if(mode!=='play'||!G||G.over||paused||sel==null)return;
 if(e.target!==C&&!(e.target.closest&&e.target.closest('.card')))return;pos(e);if(gx>=0)tryPlay()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#sheet').hidden){closeSheet();return}
 if(mode!=='play'||!G)return;
 if(e.key==='Escape')sel=null;
 if(e.key>='1'&&e.key<='4'){const i=+e.key-1;if(G.side[ME].hand[i])sel=sel===i?null:i}
 if(e.key==='p'||e.key==='P'||e.key===' '){e.preventDefault();togglePause()}
 if(e.key==='q'||e.key==='Q'){if(NET.on)netCmd({k:'a'});else useAbility(0)}});
$('#bp').onclick=()=>{AU.init();togglePause()};
function micon(){$('#mi').setAttribute('d',AU.mute?'M3 9v6h4l5 4V5L7 9zM16 9l5 6M21 9l-5 6':'M3 9v6h4l5 4V5L7 9zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14');$('#bm').setAttribute('aria-pressed',AU.mute)}
$('#bm').onclick=()=>{AU.init();AU.mute=!AU.mute;store.set('ac.mute',AU.mute);micon();MUS.vol();AU.sfx('ui')};
$('#ab').onclick=()=>{AU.init();if(NET.on){netCmd({k:'a'});AU.sfx('ui')}else if(G&&!useAbility(0))AU.sfx('deny')};
$('#emo').innerHTML=EMOTES.map((t,i)=>`<button data-e="${i}">${t}</button>`).join('');
$('#be').onclick=()=>{AU.init();$('#emo').hidden=!$('#emo').hidden};
$('#emo').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(!G)return;if(NET.on){NET.tr.send({k:'e',i:+b.dataset.e})}emote(ME,+b.dataset.e);$('#emo').hidden=true;
 if(G.bots[1]&&Math.random()<.4)setTimeout(()=>{if(G&&!G.over)emote(1,pickV([0,3,4,5]))},900+Math.random()*900)});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play'&&!paused&&G&&!G.over)togglePause()});

/* ---------- размеры и цикл ---------- */
function fit(){if($('#battle').hidden)return;const wr=$('#wrap');
 // 3D: арена на весь экран между шапкой и рукой; запасной 2D: поле по пропорции в рамке
 if(R3.on&&document.body.classList.contains('full3d')){
  const w=innerWidth,h=innerHeight,rc=e=>$(e).getBoundingClientRect(),top=Math.ceil(Math.max(rc('#clock').bottom,rc('#cp0').bottom,rc('#cp1').bottom))+4,bot=Math.max(0,Math.round(h-rc('#deck').top)),A=Math.max(240,h-top-bot);
  wr.style.width=w+'px';wr.style.height=h+'px';const rs=document.documentElement.style;rs.setProperty('--ti',top+'px');rs.setProperty('--bi',bot+'px');
  dpr=Math.min(3,window.devicePixelRatio||1);S3.ak=A*dpr/640;C.width=Math.round(w*dpr);C.height=Math.round(h*dpr);
  r3Resize(w,h,{top,bot,A});return}
 const st=$('#stage'),w=st.clientWidth,h=st.clientHeight;if(!w||!h)return;
 const k=Math.min(w/W,h/H),cw=Math.floor(W*k),ch=Math.floor(H*k);S3.ak=0;
 wr.style.width=cw+'px';wr.style.height=ch+'px';document.documentElement.style.setProperty('--cw',Math.max(cw,290)+'px');
 dpr=Math.min(3,window.devicePixelRatio||1);const nk=cw*dpr/W;
 if(!BG||Math.abs(nk-K)>.001){K=nk;C.width=Math.round(cw*dpr);C.height=Math.round(ch*dpr);BG=buildBG(K)}
 r3Resize(cw,ch)}
new ResizeObserver(()=>requestAnimationFrame(fit)).observe($('#stage'));addEventListener('resize',()=>requestAnimationFrame(fit));
let lastT=0,acc=0;
/* ---------- бой с другом по сети ---------- */
function startNetBattle(S,me,tr){
 if(!(R3.want&&R3.ready&&!R3.failed)){toast('Для игры по сети нужна 3D-графика (в настройках)');try{tr.close()}catch(e){}netLobbyState('err','Для игры по сети нужна 3D-графика');return}
 closeSheet();AU.sfx('ui');ME=me;NETL.aborted=0;const a=S.arena;if(TH!==THEMES[a]){TH=THEMES[a];BG=null}
 newMatch({arena:a,decks:S.decks,lv:S.lv,kl:S.kl,bots:[null,null],names:S.names,train:true,mode:'normal',ex:[{},{}],tt:S.tt,thp:[1,1],seed:S.seed});G.event='friend';
 netInit(tr,me);mode='play';sel=null;gx=-1;paused=false;hideOv();$('#emo').hidden=true;$('#tip').hidden=true;$('#bp').hidden=true;$('#enname').textContent=S.names[1-me];
 showView('battle');R3.on=false;S3.flip=me===1;if(r3Begin(a))r3Show();else r3Stop();hs={};renderHand();$('#help').hidden=true;banner('Дружеский бой','#ffc83d');MUS.play('battle')}
function netLeave(){netOff();netCancel();ME=0;if(typeof S3!=='undefined')S3.flip=false;hideOv();G=null;mode='home';r3Stop();$('#bp').hidden=false;showView('home');tab='play';renderHome();MUS.play('menu')}
/* ждём соперника, обрыв связи, расхождение */
function netWatch(){const w=$('#netwait');if(w){const show=NET.waitT>1&&!G.over;if(w.hidden===show)w.hidden=!show}
 if(G.over){const b=$('#nrm');if(NET.gone&&b&&!b.dataset.gone){b.dataset.gone=1;b.disabled=true;b.textContent='Друг вышел'}return}
 if(Date.now()-NET.lastRx>25000)NET.gone=true; // 25 секунд тишины: соперник пропал или телефон уснул
 if(NET.fail||NET.gone)netAbort(NET.fail?'desync':'gone')}
function netAbort(why){if(NETL.aborted)return;NETL.aborted=1;const gone=why==='gone';NET.on=false;mode='end';$('#netwait').hidden=true;AU.sfx('deny');
 showOv(`<div class="scr"><h2>${gone?'Друг вышел из боя':'Бой разошёлся'}</h2><p class="sub">${gone?'Соединение закрыто. Бой остановлен без результата.':'Игры у вас разошлись, и бой остановлен. Обычно так бывает, если у одного из вас другая версия игры: обновите страницу и зайдите снова.'}</p><button class="big" id="nlv">В меню</button></div>`);$('#nlv').onclick=netLeave}
function netEnd(){mode='end';sel=null;$('#netwait').hidden=true;const r=G.res,mine=G.crowns[ME],theirs=G.crowns[1-ME],win=r===ME,dr=r===2;
 MUS.play('menu');AU.sfx(win?'win':dr?'ui':'lose');
 showOv(`<div class="scr"><h2 style="color:${win?'var(--gold)':dr?'var(--ink)':'var(--red)'}">${win?'Победа!':dr?'Ничья':'Поражение'}</h2>
  <div class="pips big3">${[0,1,2].map(i=>crownSVG.replace('<svg','<svg class="'+(i<mine?'on':'')+'"')).join('')}</div>
  <p class="sub">Счёт ${mine} : ${theirs} против «${esc(G.names[1-ME])}»</p><p class="sub">Дружеский бой без наград, уровни карт равные.</p>
  <button class="big" id="nrm">Реванш</button><button class="ghost" id="nlv">Выйти</button></div>`);
 $('#nrm').onclick=()=>{$('#nrm').disabled=true;$('#nrm').textContent='Ждём друга…';netRematch()};$('#nlv').onclick=netLeave}
/* окно «Бой с другом»: создать комнату или войти по коду */
function openFriend(code){AU.init();AU.sfx('ui');const sh=$('#sheet');
 const draw=()=>{const st=NETL.st,m=NETL.msg,host=!!NETL.code,link=location.origin+location.pathname+'?room='+NETL.code;
  sh.innerHTML=`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shn"><h3 class="t" id="shn">Бой с другом</h3>
   ${st==='idle'||st==='err'?`${st==='err'?`<p class="note hl">${esc(m)}</p>`:''}
    <p class="note">Бой идёт по интернету между вашими телефонами. Уровни карт у обоих равные, награды нет. ${window.AC_SITE?'Нужна 3D-графика.':'Откройте игру по ссылке arena-clash-coral.vercel.app: из этой копии играть по сети нельзя.'}</p>
    <button class="big" id="fhost">Создать комнату</button>
    <div class="joinrow"><input id="fcode" maxlength="5" placeholder="КОД" autocapitalize="characters" autocomplete="off" value="${esc(code||'')}"><button class="big blue" id="fjoin">Войти</button></div>
    <button class="ghost" id="fx">Закрыть</button>`
   :`${host?`<div class="roomcode">${NETL.code}</div>`:''}<p class="note">${esc(m)}</p>
    ${host&&st==='wait'?`<button class="big" id="fshare">Отправить другу ссылку</button><button class="ghost" id="fcopy">Скопировать код</button>`:''}
    <button class="ghost" id="fcancel">Отмена</button>`}</div>`;
  const on=(id,f)=>{const e=$('#'+id);if(e)e.onclick=f};
  on('fhost',()=>{AU.sfx('ui');netHost()});on('fjoin',()=>{AU.sfx('ui');netJoin($('#fcode').value)});on('fx',closeSheet);on('fcancel',()=>{netCancel();closeSheet()});
  on('fcopy',()=>{const t=NETL.code;try{navigator.clipboard.writeText(t).then(()=>toast('Код скопирован'),()=>toast('Код: '+t))}catch(e){toast('Код: '+t)}});
  on('fshare',()=>{try{if(navigator.share){navigator.share({title:'Arena Clash',text:'Играем по сети! Код комнаты: '+NETL.code,url:link}).catch(()=>{});return}}catch(e){}try{navigator.clipboard.writeText(link).then(()=>toast('Ссылка скопирована'),()=>toast(link))}catch(e){toast(link)}})};
 NETL.ui=draw;draw();sh.hidden=false;sh.onclick=e=>{if(e.target===sh&&(NETL.st==='idle'||NETL.st==='err'))closeSheet()};
 if(code&&window.AC_SITE){const e=$('#fjoin');if(e)e.focus()}}
/* один сбой в кадре не должен убивать игру: ошибка один раз показывается на экране, цикл идёт дальше */
let loopErr=0;
function loop(ts){try{loopBody(ts)}catch(e){if(loopErr++<2){console.warn('сбой кадра',e);const d=document.createElement('div');d.textContent='Сбой кадра: '+(e&&e.message||e);d.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:99;background:#6a1414f0;color:#fff;font:12px/1.3 sans-serif;padding:6px 8px;border-radius:8px;pointer-events:none';document.body.appendChild(d);setTimeout(()=>d.remove(),9000)}}requestAnimationFrame(loop)}
function loopBody(ts){const dt=Math.min(.05,(ts-lastT)/1000||0);lastT=ts;
 if(G&&(mode==='play'||mode==='end'||mode==='replay')&&!paused){let sd=dt*(mode==='replay'?rspeed:1);if(G.slowmo>0){G.slowmo-=dt;sd*=CFG.juice.slowScale}if(G.hitstop>0){G.hitstop-=dt;sd=0}acc+=sd;let n=0;while(acc>=TICK&&n<4){if(NET.on){if(!netStep())break}else step(TICK);acc-=TICK;n++}
  if(NET.on){acc=Math.min(acc,TICK*3);NET.waitT=n===0&&!G.over?NET.waitT+dt:0;netWatch()}if(n===4)acc=0;ALPHA=clamp(acc/TICK,0,1);
  if(mode==='play'&&G.over&&performance.now()>G.endAt)endScreen();if(mode==='replay'&&G.over&&performance.now()>G.endAt&&!OV.classList.contains('on'))replayDone()}
 if(G&&!$('#battle').hidden&&$('#loot').hidden){if(R3.on){try{r3Frame(ts)}catch(e){r3Fail('ошибка 3D: '+(e&&e.message||e));draw(ts)}}else draw(ts);hud()}}
['#cp0','#cp1'].forEach(s=>{$(s+' .pips').innerHTML=crownSVG.repeat(3)});
TH=THEMES[curArena()];tickChests();micon();renderHome();requestAnimationFrame(loop);
{const q=new URLSearchParams(location.search).get('room');if(q)setTimeout(()=>openFriend(q.slice(0,5).toUpperCase()),700)}
