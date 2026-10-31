/* ================= ДАННЫЕ И ОБЩЕЕ ================= */
const TILE=CFG.arena.tile,W=CFG.arena.tilesW*TILE,H=CFG.arena.tilesH*TILE,RY=H/2,RIV=CFG.arena.river*TILE/2,BR=[3.5*TILE,W-3.5*TILE];
const $=s=>document.querySelector(s);
/* случайность боя — только через RNG: в бою это генератор с seed (повторы и тесты), вне боя — Math.random.
   Оформление и меню берут rndV/pickV/shuffleV, чтобы не сбивать поток боя */
function mul(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let RNG=Math.random;
const rndV=(a,b)=>a+Math.random()*(b-a),pickV=a=>a[Math.random()*a.length|0],shuffleV=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const rnd=(a,b)=>a+RNG()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
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
 crossbow:{n:'Арбалетчица',rar:'rare',type:'troop',cost:4,hp:700,dmg:200,hit:1.1,rng:6,spd:'med',tg:'ga',r:8,proj:'bolt',tip:'Сильный одиночный стрелок с большой дальностью.'},
 axe:{n:'Секира',rar:'rare',type:'troop',cost:4,hp:1908,dmg:267,hit:1.5,rng:1,spd:'med',tg:'g',r:9,spin:1,splash:2,tip:'Крутит топор вокруг себя: гроза стай на земле.'},
 fireball:{n:'Огненный шар',rar:'rare',type:'spell',cost:4,rad:2.5,dmg:730,tdmg:220,knock:16,tip:'Большой урон по площади и отбрасывание лёгких.'},
 hammer:{n:'Молотобоец',rar:'rare',type:'troop',cost:4,hp:1300,dmg:640,hit:1.7,rng:.8,spd:'fast',tg:'g',r:9,tip:'Огромный урон по одной цели. Ломает танков.'},
 ram:{n:'Тачка-таран',rar:'rare',type:'troop',cost:4,hp:1679,dmg:320,hit:1.6,rng:.8,spd:'vfast',tg:'b',r:11,mass:10,jump:1,tip:'Очень быстро катится к строениям и перепрыгивает реку. Главная угроза для башен.'},
 lair:{n:'Логово',rar:'rare',type:'building',cost:3,hp:794,tg:'g',r:14,life:30,spawn:{id:'bones',every:3.5,n:1},dspawn:{id:'bones',n:3},tip:'Выпускает костяшек, пока стоит, и ещё троих, когда рушится.'},
 sorcerer:{aff:'day',n:'Чародей',rar:'rare',type:'troop',cost:5,hp:690,dmg:250,hit:1.45,rng:5.5,spd:'med',tg:'ga',r:8,proj:'orb',splash:1.5,tip:'Огненные шары по площади, достаёт воздух. Хрупкий.'},
 drake:{n:'Дракончик',rar:'epic',type:'troop',cost:4,hp:1080,dmg:150,hit:1.5,rng:3.5,spd:'fast',fly:1,tg:'ga',r:10,proj:'flame',splash:1.5,tip:'Летит над рекой и дышит огнём по площади.'},
 freeze:{n:'Заморозка',rar:'epic',type:'spell',cost:4,rad:3,dmg:114,tdmg:38,freeze:4,tip:'Всё вражеское в круге замирает на 4 секунды, даже башни.'},
 cry:{n:'Боевой клич',rar:'epic',type:'spell',cost:2,rad:4.5,rage:9,tip:'Свои в круге на 9 секунд двигаются и бьют на 35% быстрее.'},
 vortex:{n:'Вихрь',rar:'epic',type:'spell',cost:3,rad:5.5,dmg:160,tdmg:50,pull:1.1,pullSpd:150,tip:'Затягивает всех врагов к центру и слегка ранит. Сбивает в кучу под удар и задевает королевскую башню — она проснётся.'},
 spring:{n:'Родник',rar:'rare',type:'building',cost:6,hp:1070,tg:'g',r:13,life:70,elx:{every:9,n:1},noStart:1,tip:'Добывает эликсир: +1 каждые 9 секунд, пока стоит. Окупается, если его не сломают. Не бывает в стартовой руке.'},
 raider:{aff:'night',n:'Налётчица',rar:'legendary',type:'troop',cost:3,hp:906,dmg:193,hit:1,rng:.75,spd:'fast',tg:'g',r:8,dash:{min:3.5,max:6,spd:500,mul:2},tip:'Рывком сокращает дистанцию до цели в 3,5–6 клеток. Во время рывка неуязвима, первый удар — двойной.'},
 mend:{n:'Целебный звон',rar:'rare',type:'spell',cost:2,rad:3,heal:540,healT:2,tip:'Две секунды лечит своих бойцов в круге. Спасает пуш, который вот-вот развалится.'},
 sapper:{n:'Подрыв',rar:'epic',type:'spell',cost:2,rad:2,dmg:190,tdmg:55,bdmg:2000,crater:1,tip:'Взрыв обрушивает мост, если попасть по нему: 20 с наземные идут через другой. Юниты на мосту падают на берег и оглушены. По юнитам — 150 урона.'},
 shadowblade:{aff:'night',n:'Тень',rar:'epic',type:'troop',cost:3,hp:690,dmg:230,hit:1,rng:.7,spd:'fast',tg:'g',r:7,stealth:1,tip:'Ночью её видно, только вблизи 2,5 клеток: свет не помогает. Днём обычная ловкая убийца.'},
 priest:{aff:'day',n:'Страж рассвета',rar:'rare',type:'troop',cost:4,hp:900,dmg:150,hit:1.2,rng:5,spd:'med',tg:'ga',r:8,proj:'orb',light:4,tip:'Дальний боец с собственным светом на 4 клетки. Днём бьёт сильнее; ночью освещает стрелков и открывает врагов.'},
 eclipse:{n:'Затмение',rar:'legendary',type:'spell',cost:3,rad:0,force:{k:1,t:14},tip:'14 секунд — ночь для всех, где бы ты ни был. Ночные карты и Тени сильнее, дневные слабее, дальний бой слепнет.'},
 dawn:{n:'Рассвет',rar:'epic',type:'spell',cost:2,rad:0,force:{k:0,t:12},tip:'12 секунд — день для всех. Ночь отменяется, дальний бой снова видит поле, дневные карты сильнее.'},
 torchman:{n:'Факелоносец',rar:'common',type:'troop',cost:2,hp:720,dmg:145,hit:1.1,rng:.7,spd:'fast',tg:'g',r:7,light:3.5,tip:'Несёт факел: свет 3,5 клетки вокруг себя. Ночью — глаза для твоих стрелков и башен.'},
 lantern:{n:'Фонарь',rar:'common',type:'building',cost:1,hp:520,tg:'g',r:10,life:55,light:6,tip:'Свет 6 клеток на 55 с. Сам не бьёт, но ночью открывает врагов у моста и притягивает «только здания».'},
 flash:{n:'Вспышка',rar:'rare',type:'spell',cost:1,rad:2.5,dmg:96,tdmg:29,blind:1,flash:{light:5,t:6},tip:'Яркий свет на 5 клеток на 6 с; враги в центре (2,5 клетки) обожжены и ослеплены: 1 с не двигаются и не атакуют.'},
 shade:{n:'Сумрак',rar:'epic',type:'spell',cost:2,rad:4,shade:8,tip:'8 с внутри круга не действует никакой свет — даже днём. Враг видит там только тех, кто ближе 2,5 клетки. Укрой стрелков у вражеской башни.'},
 roller:{n:'Каток',rar:'legendary',type:'spell',cost:2,rad:2,dmg:300,tdmg:60,roll:{len:10,spd:220},knock:28,tip:'Бревно катится вперёд на 10 клеток: бьёт и отталкивает наземных врагов, задевает башни. Летающих не трогает.'},
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
