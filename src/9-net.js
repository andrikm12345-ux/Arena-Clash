/* ================= ИГРА ПО СЕТИ: синхронный ход (lockstep) =================
   У обоих игроков идёт одна и та же детерминированная симуляция. Между ними летают только команды:
   «карта i в точку x,y» или «способность». Команда, нажатая на тике t, выполняется у обоих на тике t+NET_D+1,
   поэтому оба успевают её получить. Симуляция делает шаг, только когда есть команды (пусть пустые) обеих сторон на этот тик;
   иначе ждёт («Ждём соперника»). Раз в NET_HASH_EVERY тиков стороны сверяют контрольную сумму состояния: расхождение — бой останавливается.
   Транспорт — любой объект {send(msg), close()}, у которого мы ставим onmsg/onclose (PeerJS в игре, заглушка в тестах). */
let ME=0;                       // какая сторона моя: 0 — внизу, 1 — гость сети (камера развёрнута)
const NET_BUILD='__BUILD__';    // версия игры: у друзей должна совпадать, иначе бой разойдётся
const NET_D=8,NET_HASH_EVERY=60;
const NET={on:false,tr:null,me:0,in:[new Map(),new Map()],out:[],mine:new Map(),theirs:new Map(),fail:null,gone:false,waitT:0};
/* контрольная сумма состояния: всё, что влияет на исход боя, округлено до 1e-4 */
function stateHash(){let h=2166136261>>>0;const mix=v=>{h=Math.imul(h^(Math.round(v*1e4)|0),16777619)>>>0};
 mix(G.tick);for(const S of G.side){mix(S.el);mix(S.abCd||0);for(const k of S.hand)mix(k?k.length:0)}
 for(const u of G.U){mix(u.id);mix(u.x);mix(u.y);mix(u.hp);mix(u.shield||0)}
 for(const b of G.B){mix(b.id);mix(b.x);mix(b.hp)}for(const t of G.T)mix(t.hp);
 for(const z of G.Z){mix(z.x);mix(z.y);mix(z.t)}for(const p of G.PR){mix(p.x);mix(p.y)}
 mix(G.crowns[0]*3+G.crowns[1]);return h>>>0}
function netInit(tr,me){NET.on=true;NET.tr=tr;NET.me=me;NET.in=[new Map(),new Map()];NET.out=[];NET.mine=new Map();NET.theirs=new Map();NET.fail=null;NET.gone=false;NET.waitT=0;NET.rx=0;NET.lastRx=Date.now();
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
function netRecv(m){if(!NET.on||!m)return;NET.lastRx=Date.now();NET.rx=(NET.rx||0)+1;
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
let NETT0=0;function netLog(t){if(!NETL.log)NETL.log=[];if(!NETT0||NETL.log.length===0)NETT0=Date.now();NETL.log.push(((Date.now()-NETT0)/1000).toFixed(1)+'с '+t);if(NETL.log.length>14)NETL.log.shift()}
function netLobbyState(st,msg){NETL.st=st;NETL.msg=msg||'';if(NETL.ui)NETL.ui()}
const NET_ICE=[{urls:['stun:stun.relay.metered.ca:80','stun:stun.l.google.com:19302','stun:stun.cloudflare.com:3478']},
 {urls:['turn:global.relay.metered.ca:80','turn:global.relay.metered.ca:80?transport=tcp','turn:global.relay.metered.ca:443','turns:global.relay.metered.ca:443?transport=tcp'],username:'55cf966f97f9e774fe6a3602',credential:'b5nL82IAkI/x4Sof'}];
function netPeerOpts(){const q=typeof location!=='undefined'?new URLSearchParams(location.search):null,h=q&&q.get('peerhost')||'';
 const config={iceServers:NET_ICE,iceCandidatePoolSize:4};if(q&&q.get('relay'))config.iceTransportPolicy='relay';
 if(h){const[a,b]=h.split(':');return{host:a,port:+b||9000,path:'/',secure:false,debug:0,config}}return{debug:0,config}}
const NET_FAIL='Не вышло соединиться. Откройте игру в Safari или Chrome (не во встроенном браузере Telegram), включите мобильный интернет или Wi‑Fi у обоих и попробуйте снова';
/* следим за поиском пути: показываем этап и сдаёмся через 25 с */
function netWatch2(conn,t){let on=false;const hook=()=>{const pc=conn.peerConnection;if(!pc||on)return;on=true;const n={};
  netLog('канал создан');
  pc.addEventListener('icecandidate',e=>{const m=e.candidate&&/ typ (\w+)/.exec(e.candidate.candidate);if(m){n[m[1]]=(n[m[1]]||0)+1;NETL.cand=Object.keys(n).map(k=>k+n[k]).join(' ')}});
  pc.addEventListener('iceconnectionstatechange',()=>{const s=pc.iceConnectionState;netLog('ICE '+s+(NETL.cand?' ['+NETL.cand+']':''));if(NETL.st!=='hand')return;if(s==='checking')netLobbyState('hand','Ищу путь к другу…');else if(s==='failed'){clearTimeout(t);netLobbyState('err',NET_FAIL)}});
  pc.addEventListener('icegatheringstatechange',()=>netLog('сбор путей: '+pc.iceGatheringState));
  pc.addEventListener('icecandidateerror',e=>netLog('ошибка пути '+(e.errorCode||'')+' '+String(e.url||'').slice(0,40)))};
 NETL.diag=()=>'ICE '+((conn.peerConnection&&conn.peerConnection.iceConnectionState)||'нет канала')+(NETL.cand?', пути: '+NETL.cand:', путей нет');
 try{hook()}catch(e){}setTimeout(()=>{try{hook()}catch(e){}},500);conn.on('open',()=>netLog('канал данных открыт'));conn.on('error',e=>netLog('ошибка канала: '+(e&&e.type||e)))}
function netErr(e){const t=e&&e.type;return t==='peer-unavailable'?'Комната не найдена. Проверь код':t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed'?'Нет связи с сервером комнат. Проверь интернет':t==='browser-incompatible'?'Этот браузер не поддерживает игру по сети':'Не удалось соединиться'}
function netCancel(){NETL.log=[];NETL.diag=null;try{if(NETL.tr){NETL.tr.onmsg=null;NETL.tr.onclose=null;NETL.tr.close()}}catch(e){}try{if(NETL.peer)NETL.peer.destroy()}catch(e){}NETL.peer=null;NETL.tr=null;NETL.onx=null;NETL.st='idle'}
function wrapConn(conn){const tr={onmsg:null,onclose:null,send:m=>{try{conn.send(m)}catch(e){}},close:()=>{try{conn.close()}catch(e){}}};
 conn.on('data',m=>{if(tr.onmsg)tr.onmsg(m)});
 try{const pc=conn.peerConnection;if(pc)pc.addEventListener('connectionstatechange',()=>{if(pc.connectionState==='failed'||pc.connectionState==='closed'){if(tr.onclose)tr.onclose()}})}catch(e){}conn.on('close',()=>{if(tr.onclose)tr.onclose()});conn.on('error',()=>{if(tr.onclose)tr.onclose()});return tr}
const netConnOpts={reliable:true,serialization:'json'};
/* честные уровни для дружеского боя: у всех карт стартовый уровень арены */
function netEqLv(a){const eq={};for(const k of CARD_IDS)eq[k]=START_LV[CARDS[k].rar]+ARENA_LV[a];return eq}
function netHost(){netCancel();
 if(typeof Peer==='undefined'){netLobbyState('err','Игра по сети работает только на сайте, в браузере');return}
 const code=Array.from({length:5},()=>ROOM_CH[Math.random()*ROOM_CH.length|0]).join('');NETL.code=code;netLobbyState('wait','Создаю комнату…');
 netLog('создаю комнату');const peer=NETL.peer=new Peer(roomId(code),netPeerOpts());
 peer.on('open',()=>netLog('сервер комнат ответил')||netLobbyState('wait','Жду друга. Отправь ему код или ссылку'));
 peer.on('error',e=>{netLog('ошибка сервера: '+(e&&e.type||e));if(e&&e.type==='unavailable-id'){netHost();return}netLobbyState('err',netErr(e))});
 peer.on('connection',conn=>{if(NETL.tr){conn.close();return}const tr=NETL.tr=wrapConn(conn);netLog('друг постучался');netLobbyState('hand','Друг подключается…');const th=setTimeout(()=>{if(NETL.st==='hand'){netLog('таймаут 25 с');netLobbyState('err',NET_FAIL+(NETL.diag?' ('+NETL.diag()+')':''))}},25000);netWatch2(conn,th);
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
 netLog('вхожу в комнату '+code);netLobbyState('hand','Подключаюсь…');const peer=NETL.peer=new Peer(netPeerOpts()),t0=setTimeout(()=>{if(NETL.st==='hand')netLog('таймаут 25 с');netLobbyState('err',NET_FAIL+(NETL.diag?' ('+NETL.diag()+')':''))},25000);
 peer.on('error',e=>{clearTimeout(t0);netLog('ошибка сервера: '+(e&&e.type||e));netLobbyState('err',netErr(e))});
 const to=setTimeout(()=>{if(NETL.st==='hand'&&!peer.open){netLog('сервер комнат молчит');clearTimeout(t0);netLobbyState('err','Нет связи с сервером комнат (оператор мог его заблокировать)')}},10000);
 peer.on('open',()=>{clearTimeout(to);netLog('сервер комнат ответил');const conn=peer.connect(roomId(code),netConnOpts),tr=NETL.tr=wrapConn(conn);netWatch2(conn,t0);
  conn.on('open',()=>tr.send({k:'hello',build:NET_BUILD,name:P.name,deck:curDeck(),tt:P.tt}));
  tr.onmsg=m=>{if(m.k==='go'){clearTimeout(t0);NETL.setup=m.setup;netGo(m.setup,1,tr)}else if(m.k==='bad'){clearTimeout(t0);netLobbyState('err',m.why||'Хозяин отказал')}};
  tr.onclose=()=>{clearTimeout(t0);if(NETL.st!=='play')netLobbyState('err','Соединение закрыто')}})}
function netGo(setup,me,tr){NETL.st='play';NETL.rm={me:false,they:false};NETL.onx=m=>{if(m.k==='rm'){NETL.rm.they=true;netRematchCheck()}else if(m.k==='go'&&me===1){NETL.setup=m.setup;netGo(m.setup,1,tr)}};
 startNetBattle(setup,me,tr)}
/* «Реванш»: когда нажали оба, хозяин присылает новый seed */
function netRematch(){NETL.rm.me=true;NET.tr.send({k:'rm'});netRematchCheck()}
function netRematchCheck(){if(NETL.rm.me&&NETL.rm.they&&NET.me===0){NETL.rm={me:false,they:false};netHostGo(NET.tr,null,true)}}
