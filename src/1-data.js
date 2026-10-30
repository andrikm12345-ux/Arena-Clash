/* ================= ДАННЫЕ И ОБЩЕЕ ================= */
const TILE=20,W=360,H=640,RY=320,RIV=20,BR=[70,290];
const $=s=>document.querySelector(s);
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pickR=a=>a[Math.random()*a.length|0],shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const REDUCE=matchMedia('(prefers-reduced-motion:reduce)').matches;
const TEAM=[{m:'#3da5ff',d:'#1b5ca3',l:'#a6d6ff'},{m:'#ff5c4d',d:'#9e2a20',l:'#ffb8ae'}];
/* скорость в точках арены в секунду (клетка = 20 точек) */
const SPD={slow:22,med:30,fast:42,vfast:56};
const SPDN={slow:'Медленная',med:'Средняя',fast:'Быстрая',vfast:'Очень быстрая'};
const TGN={g:'Наземные',ga:'Земля и воздух',b:'Только строения'};
const RAR={common:{n:'Обычная',c:'#9fb4d8'},rare:{n:'Редкая',c:'#ffa63d'},epic:{n:'Эпическая',c:'#c77dff'},legendary:{n:'Легендарная',c:'#5ef2d0'},champion:{n:'Чемпион',c:'#ffd84d'}};
const RAR_ORDER=['common','rare','epic','legendary','champion'];
/* Уровень 1 — базовые числа; каждый следующий уровень +10% к здоровью и урону */
const LV=(base,lvl)=>Math.round(base*Math.pow(1.1,(lvl||1)-1));

/* Карты. rng, splash, rad — в клетках. tg: g — земля, ga — земля и воздух, b — только строения */
const CARDS={
 guard:{n:'Страж',rar:'common',type:'troop',cost:3,hp:1150,dmg:130,hit:1.2,rng:.8,spd:'med',tg:'g',r:9,tip:'Надёжный боец ближнего боя. Держит удар и дёшево закрывает дыры в обороне.'},
 shooters:{n:'Стрелки',rar:'common',type:'troop',cost:3,count:2,hp:200,dmg:70,hit:1,rng:5,spd:'med',tg:'ga',r:7,proj:'arrow',tip:'Двое стреляют издалека, в том числе по воздуху.'},
 bones:{n:'Костяшки',rar:'common',type:'troop',cost:1,count:3,hp:55,dmg:55,hit:1,rng:.5,spd:'fast',tg:'g',r:5,tip:'Три костяшки за один эликсир. Отвлекают тяжёлых и рвут одиночек.'},
 imps:{n:'Шныри',rar:'common',type:'troop',cost:2,count:3,hp:135,dmg:80,hit:1.1,rng:.5,spd:'vfast',tg:'g',r:6,tip:'Очень быстрые. Если их не встретить, сносят башню за секунды.'},
 slingers:{n:'Пращники',rar:'common',type:'troop',cost:2,count:3,hp:90,dmg:55,hit:1.6,rng:5,spd:'vfast',tg:'ga',r:6,proj:'stone',tip:'Три стрелка с пращами. Дёшево сбивают летунов.'},
 bomber:{n:'Бомбардир',rar:'common',type:'troop',cost:2,hp:220,dmg:150,hit:1.8,rng:4.5,spd:'med',tg:'g',r:7,proj:'bomb',splash:1.5,tip:'Бомбы по площади. Против стай на земле, но не достаёт воздух.'},
 cannon:{n:'Пушка',rar:'common',type:'building',cost:3,hp:560,dmg:140,hit:.9,rng:5.5,tg:'g',r:13,life:30,proj:'ball',tip:'Строение на 30 секунд. Поставь в центр — и любители строений свернут к ней.'},
 volley:{n:'Залп',rar:'common',type:'spell',cost:3,rad:3.5,dmg:240,tdmg:62,waves:3,tip:'Три волны стрел по большой площади. Чистит стаи.'},
 spark:{n:'Искра',rar:'common',type:'spell',cost:2,rad:2.5,dmg:130,tdmg:40,stun:.5,tip:'Мгновенный разряд: оглушает на полсекунды и сбивает разгон.'},
 bats:{n:'Нетопыри',rar:'common',type:'troop',cost:2,count:4,hp:55,dmg:55,hit:1.1,rng:.5,spd:'vfast',fly:1,tg:'ga',r:5,tip:'Четыре летучие твари. Хрупкие, но больно кусают.'},
 militia:{n:'Дружина',rar:'common',type:'troop',cost:5,count:4,hp:470,dmg:130,hit:1.4,rng:.8,spd:'med',tg:'g',r:8,tip:'Четверо крепких бойцов. Перемалывают танков, боятся урона по площади.'},
 wisp:{n:'Огонёк',rar:'common',type:'troop',cost:1,hp:150,dmg:140,hit:1,rng:2,spd:'vfast',tg:'ga',r:6,kami:1,splash:2.3,tip:'Прыгает на врага и взрывается по площади. Один эликсир.'},
 giant:{n:'Великан',rar:'rare',type:'troop',cost:5,hp:2700,dmg:170,hit:1.5,rng:1,spd:'slow',tg:'b',r:15,mass:18,tip:'Идёт только на строения и держит всё. Нужна поддержка сзади.'},
 crossbow:{n:'Арбалетчица',rar:'rare',type:'troop',cost:4,hp:480,dmg:145,hit:1,rng:6,spd:'med',tg:'ga',r:8,proj:'bolt',tip:'Сильный одиночный стрелок с большой дальностью.'},
 axe:{n:'Секира',rar:'rare',type:'troop',cost:4,hp:1250,dmg:175,hit:1.5,rng:1,spd:'med',tg:'g',r:9,spin:1,splash:2,tip:'Крутит топор вокруг себя: гроза стай на земле.'},
 fireball:{n:'Огненный шар',rar:'rare',type:'spell',cost:4,rad:2.5,dmg:450,tdmg:135,knock:16,tip:'Большой урон по площади и отбрасывание лёгких.'},
 hammer:{n:'Молотобоец',rar:'rare',type:'troop',cost:4,hp:900,dmg:470,hit:1.6,rng:.8,spd:'fast',tg:'g',r:9,tip:'Огромный урон по одной цели. Ломает танков.'},
 ram:{n:'Тачка-таран',rar:'rare',type:'troop',cost:4,hp:1100,dmg:210,hit:1.6,rng:.8,spd:'vfast',tg:'b',r:11,mass:10,jump:1,tip:'Очень быстро катится к строениям и перепрыгивает реку. Главная угроза для башен.'},
 lair:{n:'Логово',rar:'rare',type:'building',cost:3,hp:520,tg:'g',r:14,life:30,spawn:{id:'bones',every:3.5,n:1},dspawn:{id:'bones',n:3},tip:'Выпускает костяшек, пока стоит, и ещё троих, когда рушится.'},
 sorcerer:{n:'Чародей',rar:'rare',type:'troop',cost:5,hp:470,dmg:185,hit:1.4,rng:5.5,spd:'med',tg:'ga',r:8,proj:'orb',splash:1.5,tip:'Огненные шары по площади, достаёт воздух. Хрупкий.'},
 drake:{n:'Дракончик',rar:'epic',type:'troop',cost:4,hp:760,dmg:105,hit:1.5,rng:3.5,spd:'fast',fly:1,tg:'ga',r:10,proj:'flame',splash:1.5,tip:'Летит над рекой и дышит огнём по площади.'},
 freeze:{n:'Заморозка',rar:'epic',type:'spell',cost:4,rad:3,dmg:75,tdmg:25,freeze:4,tip:'Всё вражеское в круге замирает на 4 секунды, даже башни.'},
 cry:{n:'Боевой клич',rar:'epic',type:'spell',cost:2,rad:3.5,rage:6,tip:'Свои в круге на 6 секунд двигаются и бьют на 35% быстрее.'},
 poison:{n:'Ядовитое облако',rar:'epic',type:'spell',cost:4,rad:3.5,dmg:380,tdmg:110,poison:8,tip:'Облако на 8 секунд: медленно жжёт и замедляет всё внутри.'},
 legion:{n:'Легион костей',rar:'epic',type:'troop',cost:3,count:14,unit:'bones',hp:55,dmg:55,hit:1,rng:.5,spd:'fast',tg:'g',r:5,tip:'Четырнадцать костяшек. Сносят любого одиночку, если нет урона по площади.'},
 knightrider:{n:'Витязь',rar:'epic',type:'troop',cost:5,hp:1250,dmg:255,hit:1.4,rng:1,spd:'med',tg:'g',r:12,mass:9,charge:1,tip:'Разгоняется на прямой: вдвое быстрее и первый удар вдвое сильнее.'},
 airship:{n:'Дирижабль',rar:'epic',type:'troop',cost:5,hp:850,dmg:320,hit:2,rng:.5,spd:'med',fly:1,tg:'b',r:13,mass:8,death:{dmg:180,r:2},tip:'Летит к строениям и сбрасывает бомбы. При падении взрывается.'},
 colossus:{n:'Колосс',rar:'epic',type:'troop',cost:8,hp:3350,dmg:205,hit:2.5,rng:.8,spd:'slow',tg:'b',r:18,mass:30,dep:3,death:{dmg:205,r:2},dspawn:{id:'pebble',n:2},tip:'Каменная гора на строения. Падая, распадается на два камешка.'},
 pebble:{n:'Камешек',token:1,rar:'epic',type:'troop',cost:0,hp:680,dmg:42,hit:2.5,rng:.8,spd:'med',tg:'b',r:10,mass:8,death:{dmg:70,r:1.5}},
 frostsage:{n:'Морозный мудрец',rar:'legendary',type:'troop',cost:3,hp:600,dmg:90,hit:1.7,rng:5.5,spd:'med',tg:'ga',r:8,proj:'ice',splash:1.5,slow:{f:.35,t:2.5},tip:'Слабый урон, зато замедляет всех, в кого попадает.'},
 thunder:{n:'Громовержец',rar:'legendary',type:'troop',cost:4,hp:470,dmg:125,hit:1.8,rng:5,spd:'med',tg:'ga',r:8,chain:2,stun:.5,zap:100,tip:'Бьёт молнией сразу двоих и оглушает. При выходе бьёт разрядом вокруг.'},
 mole:{n:'Крот',rar:'legendary',type:'troop',cost:3,hp:790,dmg:125,hit:1.2,rng:.8,spd:'fast',tg:'g',r:9,tunnel:1,td:.35,tip:'Роет ход и вылезает где угодно, даже у вражеской башни. По башням бьёт слабо.'},
 warlord:{n:'Вожак',rar:'champion',type:'troop',cost:4,hp:1500,dmg:160,hit:1.2,rng:1,spd:'med',tg:'g',r:11,mass:10,spin:1,splash:1.2,ability:{k:'horn',n:'Боевой рог',cost:2,cd:14,shield:500,rage:4,r:4},tip:'Чемпион. Способность «Боевой рог»: щит и ярость себе и соседям на 4 секунды.'}
};
const CARD_IDS=Object.keys(CARDS).filter(k=>!CARDS[k].token);
const TOWER={p:{hp:2000,dmg:70,hit:.8,rng:150,r:24},k:{hp:3200,dmg:75,hit:1,rng:140,r:32}};
/* башенные бойцы: кто стреляет с башен принцесс */
const TT={archer:{n:'Лучница',d:'Ровная стрельба по земле и воздуху. Надёжный выбор.',hp:1,dmg:1,hit:1,pk:'tower'},
 cannoneer:{n:'Пушкарь',d:'Тяжёлые ядра: урон ×2,2, но стреляет вдвое реже, а башня чуть слабее.',hp:.92,dmg:2.2,hit:2.1,pk:'tball'},
 dagger:{n:'Метательница',d:'Очередь из шести кинжалов, затем перезарядка. Сильна против быстрых атак.',hp:.95,dmg:.62,hit:.3,mag:6,reload:2.6,pk:'dagger'}};
/* эволюции: стоят в первом слоте колоды; первый розыгрыш и каждый (cyc+1)-й выходит усиленным */
const EVO={guard:{cyc:2,d:'Выходит со щитом на 450 здоровья',shield:450},
 shooters:{cyc:2,d:'Дальность +1,5 клетки, урон +25%',rng:1.5,dmg:1.25},
 bones:{cyc:2,d:'Шесть костяшек вместо трёх',count:6},
 bomber:{cyc:2,d:'Бомба крупнее: радиус +1 клетка, урон +20%',splash:1,dmg:1.2},
 cannon:{cyc:2,d:'Стоит 45 секунд, здоровье +30%',life:45,hp:1.3},
 militia:{cyc:1,d:'Здоровье +25%, бьют на 15% чаще',hp:1.25,hit:.85}};
/* герои: золотой второй слот, способность по кнопке; делят место с чемпионом */
const HERO={guard:{d:'«Вызов»: враги рядом бьют только его, а он получает щит',ability:{k:'taunt',n:'Вызов',cost:2,cd:15,shield:520,r:5,t:3}},
 giant:{d:'«Топот»: удар по земле оглушает и отбрасывает всех вокруг',ability:{k:'stomp',n:'Топот',cost:2,cd:14,dmg:220,r:3,stun:1.5}},
 hammer:{d:'«Ярость»: щит и ускорение на 5 секунд',ability:{k:'fury',n:'Ярость',cost:1,cd:12,rage:5,shield:250}}};
function evoCard(k){const e=EVO[k],c=Object.assign({},CARDS[k],{evo:1});if(e.rng)c.rng+=e.rng;if(e.dmg)c.dmg=Math.round(c.dmg*e.dmg);if(e.splash)c.splash=(c.splash||0)+e.splash;
 if(e.hp)c.hp=Math.round(c.hp*e.hp);if(e.hit)c.hit*=e.hit;if(e.life)c.life=e.life;if(e.count)c.count=e.count;return c}
function heroCard(k){return Object.assign({},CARDS[k],{hp:Math.round(CARDS[k].hp*1.15),ability:HERO[k].ability,hero:1})}

/* роли карт для бота и подсказок */
const ROLE={};
for(const k of Object.keys(CARDS)){const c=CARDS[k];ROLE[k]={
 spell:c.type==='spell',bld:c.type==='building',win:c.tg==='b'||c.tunnel===1,tank:(c.hp||0)*(c.count||1)>=1100&&c.type==='troop',
 swarm:(c.count||1)>=3,splash:!!(c.splash||c.spin),aa:c.tg==='ga'||(c.type==='building'&&c.tg==='ga'),air:!!c.fly,ranged:(c.rng||0)>=3,
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

/* ================= ЗВУК БЕЗ ФАЙЛОВ ================= */
const AU={c:null,mute:!!store.get('ac.mute',false),nb:null,last:{},
 init(){if(!this.c){try{this.c=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(this.c&&this.c.state==='suspended')this.c.resume()},
 t(f,d,type,v,sl,dl){if(!this.c||this.mute)return;const c=this.c,t0=c.currentTime+(dl||0),o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t0);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+sl),t0+d);g.gain.setValueAtTime(v||.1,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+d);o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+d+.02)},
 n(d,v,fc,dl){if(!this.c||this.mute)return;const c=this.c;if(!this.nb){this.nb=c.createBuffer(1,c.sampleRate,c.sampleRate);const a=this.nb.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
  const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),t0=c.currentTime+(dl||0);s.buffer=this.nb;s.loop=true;f.type='lowpass';f.frequency.value=fc||800;g.gain.setValueAtTime(v||.1,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+d);s.connect(f);f.connect(g);g.connect(c.destination);s.start(t0);s.stop(t0+d+.02)},
 sfx(k){const now=performance.now(),gap={hit:60,shot:80,zap:80}[k]||30;if(this.last[k]&&now-this.last[k]<gap)return;this.last[k]=now;
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
   case 'crown':[659,784,988,1318].forEach((f,i)=>this.t(f,.22,'triangle',.08,0,i*.07));break;
   case 'crownLose':this.t(180,.5,'sawtooth',.06,-80);this.t(120,.6,'triangle',.08,-40,.1);break;
   case 'pop':this.t(520+Math.random()*200,.07,'sine',.04,-300);break;
   case 'chest':this.n(.25,.12,1200);this.t(150,.25,'triangle',.1,60);break}}};
