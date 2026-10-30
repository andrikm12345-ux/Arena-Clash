/* ================= ИНТЕРФЕЙС ================= */
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
const paintIcons=root=>{root.querySelectorAll('canvas[data-ic]').forEach(cv=>{const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);g.drawImage(icon(cv.dataset.ic),0,0,cv.width,cv.height)});
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
let tab='play',repl=null;
const TABS=[['shop','Магазин',ICO.shop],['cards','Карты',ICO.cards],['play','Бой',ICO.swords],['clan','Клан',ICO.clan],['events','События',ICO.events]];
function renderHeader(){const nx=P.kl<KL_MAX?KL_XP[P.kl]:1,pv=P.kl>1?KL_XP[P.kl-1]:0,x=P.kl<KL_MAX?clamp((P.xp-pv)/(nx-pv),0,1):1;
 $('#hh').innerHTML=`<div class="prof"><button class="kb" id="kb" aria-label="Уровень короля ${P.kl}${P.kl<KL_MAX?`, опыт ${P.xp} из ${nx}`:''}"><b>${P.kl}</b><i style="--x:${x.toFixed(3)}"></i></button><div class="who"><b>${esc(P.name)}</b><small>${ICO.trophy.replace('<svg','<svg style="width:12px;height:12px;vertical-align:-2px"')} ${fmtN(P.tr)} · ${ARENAS[curArena()].n}</small></div></div>
  <div class="res"><span class="pill" title="Золото">${ICO.gold}<b>${fmtN(P.gold)}</b></span><span class="pill" title="Кристаллы">${ICO.gem}<b>${fmtN(P.gems)}</b></span><span class="pill" title="Осколки эволюции">${ICO.shard}<b>${P.shards}</b></span><button class="gear" id="gear" aria-label="Настройки и сохранение">${ICO.gear}</button></div>`;
 $('#gear').onclick=()=>{AU.init();AU.sfx('ui');openSettings()};
 $('#kb').onclick=()=>{AU.init();toast(P.kl<KL_MAX?`Уровень короля ${P.kl}: опыт ${P.xp} из ${nx}. Опыт дают улучшения карт`:'Уровень короля максимальный')}}
function renderNav(){const n=$('#nav');n.style.setProperty('--tabs',TABS.length);
 const rs=reqState(),dots={play:ROAD.some((_,i)=>roadReady(i))||P.luck.length>0||P.chests.some(c=>c),clan:!!rs&&rs.got>rs.q.taken||canRequest(),events:EVENTS.some(e=>!evDay().won.includes(e.id)&&e.id!=='train'),cards:CARD_IDS.some(k=>canUp(k)&&P.gold>=upCost(k))||P.fresh.length>0,shop:!!(P.shop&&P.shop.day===dayKey()?!P.shop.bought.includes(0):true)};
 n.innerHTML=TABS.map(([id,t,ic])=>`<button data-t="${id}"${(tab==='road'?'play':tab)===id?' aria-current="page"':''}>${ic}<span>${t}</span>${dots[id]?'<i class="dot" aria-hidden="true"></i>':''}</button>`).join('');
 n.querySelectorAll('button').forEach(b=>b.onclick=()=>{AU.init();AU.sfx('ui');tab=b.dataset.t;repl=null;renderHome()})}
let shownTab='';
function renderHome(){renderHeader();renderNav();const m=$('#hm'),y=m.scrollTop,same=shownTab===tab;shownTab=tab;({play:renderPlay,cards:renderCards,shop:renderShop,road:renderRoad,clan:renderClan,events:renderEvents})[tab](m);if(tab!=='road')m.scrollTop=same?y:0}

/* ---------- вкладка «Бой» ---------- */
function renderPlay(m){const a=curArena(),A=ARENAS[a],nx=ARENAS[a+1],d=curDeck(),st=P.st,pr=nx?(P.tr-A.tr)/(nx.tr-A.tr):1,sp=deckSpecial(d),road=ROAD.filter((_,i)=>roadReady(i)).length;
 m.innerHTML=`<button class="arena-card" id="ac" aria-label="Арена ${a+1}: ${A.n}. Открыть дорогу кубков"><canvas id="thumb" role="img" aria-hidden="true"></canvas><div class="cap"><div><small>АРЕНА ${a+1}</small><b>${A.n}</b></div><small class="tr">${ICO.trophy}${fmtN(P.tr)}</small></div>${road?`<span class="badge">Награды: ${road}</span>`:''}</button>
 <button class="aprog" id="rd"><i style="width:${(pr*100).toFixed(1)}%"></i><span>${nx?`До арены «${nx.n}» — ${nx.tr-P.tr} кубков · дорога ›`:'Последняя арена · дорога кубков ›'}</span></button>
 <div class="playrow"><button class="big" id="play">БОЙ</button><button class="modes" id="modes" aria-label="Режимы и события">${ICO.events}<span>Режимы</span></button></div>
 <div class="chests" id="chests"></div>
 <button class="deckrow" id="dr" aria-label="Колода ${P.slot+1}. Открыть карты">${d.map((k,i)=>`<canvas width="60" height="60" data-ic="${k}" class="${i===0&&sp.evo?'evo':i===1&&sp.hero?'hero':''}"></canvas>`).join('')}<span><small>КОЛОДА ${P.slot+1}</small><b>${avgCost(d)}</b></span></button>
 <div class="row2"><button class="ghost" id="rules">Как играть</button><button class="ghost" id="ttb">Башня: ${TT[P.tt].n}</button></div>
 <div class="stats"><div><small>Победы</small><b>${st.w}</b></div><div><small>3 короны</small><b>${st.three}</b></div><div><small>Коллекция</small><b>${collLevel()}</b></div></div>`;
 if(!(R3.want&&r3Thumb(Object.assign($('#thumb'),{width:720,height:632}),a)))drawThumb($('#thumb'),a);paintIcons(m);renderChests();
 $('#play').onclick=()=>startBattle(false);$('#dr').onclick=()=>{AU.init();AU.sfx('ui');tab='cards';renderHome()};
 $('#ac').onclick=$('#rd').onclick=()=>{AU.init();AU.sfx('ui');tab='road';renderHome()};
 $('#modes').onclick=()=>{AU.init();AU.sfx('ui');tab='events';renderHome()};$('#ttb').onclick=openTT;$('#rules').onclick=openRules}
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
  <p class="note"><b>Овертайм.</b> Если короны равны — ещё две минуты, эликсир ×2, в последнюю минуту ×3. Первая сломанная башня решает бой; если обе пали одновременно — играем дальше.</p>
  <p class="note"><b>Тайбрейкер.</b> Если и в овертайме ничья: войска исчезают, все башни теряют здоровье, и проигрывает владелец самой слабой башни. Равны — ничья.</p>
  <p class="note"><b>Эволюции и герои.</b> Первый слот колоды — для эволюции: она выходит усиленной сразу и потом через несколько розыгрышей. Второй — для героя со способностью по кнопке (если в колоде нет чемпиона). Открываются за осколки.</p>
  <p class="note"><b>Башня и режимы.</b> Перед боем выбери, кто стоит на башнях: лучница, пушкарь или метательница кинжалов. Во вкладке «События» — тройной эликсир, внезапная смерть и драфт.</p>
  <p class="note"><b>Прогресс.</b> За победы — кубки и сундук удачи. Карты из сундуков улучшают уровни, улучшения дают опыт короля, а он укрепляет башни. Кубки открывают новые арены и карты.</p>
  <p class="note" style="font-size:11.5px"><b>Авторы.</b> 3D-персонажи, оружие и окружение — наборы KayKit, Kay Lousberg (kaylousberg.com, CC0). Текстуры и небо — Poly Haven (polyhaven.com, CC0). 3D-движок — Three.js (MIT).</p>
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
function renderCards(m){const d=curDeck(),found=CARD_IDS.filter(k=>P.cards[k]).length,sp=deckSpecial(d),champ=d.some(k=>CARDS[k].ability);
 const list=CARD_IDS.filter(k=>cfil==='all'||cfil==='evo'?(cfil!=='evo'||EVO[k]||HERO[k]):CARDS[k].type===cfil).sort(CSORT[csort]);
 m.innerHTML=`<div class="decktop"><span>Средняя цена <b>${avgCost(d)}</b></span><div class="dslots" role="group" aria-label="Колоды">${[...Array(NDECKS).keys()].map(i=>`<button aria-pressed="${P.slot===i}" data-s="${i}" aria-label="Колода ${i+1}">${i+1}</button>`).join('')}</div></div>
 ${repl?`<p class="note hl">Нажми на карту в колоде, вместо которой встанет «${CARDS[repl].n}». <button class="link" id="rc">Отмена</button></p>`:''}
 <div class="cardgrid deck">${d.map((k,i)=>cc(k,'d',(repl?'pick ':'')+(i===0?'slot-evo'+(sp.evo?' on':''):i===1&&!champ?'slot-hero'+(sp.hero?' on':''):''),i===0?(sp.evo?'ЭВО':'слот эво'):i===1&&!champ?(sp.hero?'ГЕРОЙ':'слот героя'):'')).join('')}</div>
 <p class="note small">Первый слот — для эволюции, второй — для героя. Открой их в карточке карты за осколки ${ICO.shard.replace('<svg','<svg style="width:14px;height:14px;vertical-align:-2px"')} (у тебя ${P.shards}).</p>
 <button class="ghost" id="ttb">Башенный боец: ${TT[P.tt].n}</button>
 <h2 class="sec">КОЛЛЕКЦИЯ · ${found} ИЗ ${CARD_IDS.length} · УРОВЕНЬ КОЛЛЕКЦИИ ${collLevel()}</h2>
 <div class="filt"><div class="chips" role="group" aria-label="Фильтр">${[['all','Все'],['troop','Бойцы'],['spell','Заклинания'],['building','Строения'],['evo','Эво и герои']].map(([v,t])=>`<button data-f="${v}" aria-pressed="${cfil===v}">${t}</button>`).join('')}</div>
  <label class="sortl">Порядок <select id="cso"><option value="rar"${csort==='rar'?' selected':''}>по редкости</option><option value="cost"${csort==='cost'?' selected':''}>по цене</option><option value="lv"${csort==='lv'?' selected':''}>по уровню</option></select></label></div>
 <div class="cardgrid">${list.map(k=>cc(k,'c',d.includes(k)?'indeck':'')).join('')}</div>`;
 paintIcons(m);
 m.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{AU.sfx('ui');P.slot=+b.dataset.s;repl=null;saveP();renderHome()});
 m.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{AU.sfx('ui');cfil=b.dataset.f;renderHome()});
 $('#cso').onchange=()=>{csort=$('#cso').value;renderHome()};$('#ttb').onclick=openTT;
 if(repl)$('#rc').onclick=()=>{repl=null;renderHome()};
 m.querySelectorAll('.cc').forEach(b=>b.onclick=()=>{AU.init();const k=b.dataset.k;
  if(repl&&b.dataset.src==='d'){const nd=d.slice();nd[nd.indexOf(k)]=repl;if(!okDeck(nd)){AU.sfx('deny');return}P.decks[P.slot]=nd;repl=null;saveP();AU.sfx('dep');renderHome();return}
  AU.sfx('ui');openSheet(k)})}
function statRows(k,lv){const c=CARDS[k],n=c.count||1,R=[];
 if(c.type==='spell'){if(c.dmg)R.push(['Урон',LV(c.dmg,lv)]);if(c.tdmg)R.push(['Урон по башням',LV(c.tdmg,lv)]);R.push(['Радиус',c.rad+' кл.']);
  if(c.freeze)R.push(['Заморозка',c.freeze+' с']);if(c.rage)R.push(['Ярость',c.rage+' с, +35%']);if(c.poison)R.push(['Длится',c.poison+' с']);if(c.stun)R.push(['Оглушение',c.stun+' с']);if(c.waves)R.push(['Волн',c.waves]);return R}
 const u=CARDS[c.unit||k];
 R.push(['Здоровье',LV(u.hp,lv),n>1?' ×'+n:'']);
 if(u.dmg){R.push(['Урон',LV(u.dmg,lv),c.splash||c.spin?', по площади':'']);R.push(['Удар раз в',u.hit+' с']);R.push(['Урон в секунду',Math.round(LV(u.dmg,lv)/u.hit*n)])}
 if(c.death)R.push(['Урон при гибели',LV(c.death.dmg,lv)]);
 if(c.type==='building')R.push(['Стоит',c.life+' с']);else R.push(['Скорость',SPDN[u.spd]]);
 if(u.dmg)R.push(['Дальность',u.rng>=2?u.rng+' кл.':'Ближний бой']);
 R.push(['Цели',TGN[u.tg]]);R.push(['Выход',(c.dep??1)+' с']);
 if(c.ability)R.push(['Способность',`${c.ability.n}: щит ${LV(c.ability.shield,lv)}`,`, ${c.ability.cost} эликсира`]);
 return R}
function tagsOf(k){const c=CARDS[k],T=[];
 if(c.fly)T.push('Летает');if(c.splash||c.spin)T.push('Урон по площади');if(c.charge)T.push('Рывок: удар ×2');if(c.stun)T.push('Оглушает');if(c.slow)T.push('Замедляет');
 if(c.chain)T.push('Бьёт сразу двоих');if(c.kami)T.push('Взрывается');if(c.death)T.push('Урон при гибели');if(c.dspawn)T.push(c.type==='building'?'При разрушении — ещё костяшки':'Распадается на камешки');
 if(c.spawn)T.push('Выпускает костяшек');if(c.tunnel)T.push('Роет ход куда угодно');if(c.zap)T.push('Разряд при выходе');if(c.td)T.push('По башням бьёт слабо');if(c.knock)T.push('Отбрасывает');if(c.ability)T.push('Один чемпион в колоде');
 return T}
function openSheet(k){const c=CARDS[k],o=P.cards[k],lv=o?o.lv:1,inDeck=curDeck().includes(k),sh=$('#sheet'),type=c.type==='spell'?'заклинание':c.type==='building'?'строение':'боец',tags=tagsOf(k);
 if(P.fresh.includes(k)){P.fresh=P.fresh.filter(x=>x!==k);saveP()}
 const rows=statRows(k,lv),nxt=o&&o.lv<MAXLV?statRows(k,lv+1):null,nd=needOf(k),cost=upCost(k);
 const kv=rows.map(([a,b,suf],i)=>{const d=nxt&&typeof b==='number'&&typeof nxt[i][1]==='number'?nxt[i][1]-b:0;return`<div><small>${a}</small><b>${typeof b==='number'?fmtN(b):b}${suf||''}${d>0?`<span class="dl">+${fmtN(d)}</span>`:''}</b></div>`}).join('');
 let act='';
 if(!o)act=`<p class="note">${ARENA_OF[k]>curArena()?`Откроется на арене ${ARENA_OF[k]+1} «${ARENAS[ARENA_OF[k]].n}».`:'Эта карта уже выпадает из сундуков твоей арены.'}</p><div class="shb"><button class="ghost" id="shx">Закрыть</button></div>`;
 else{const up=o.lv<MAXLV?canUp(k)?(P.gold>=cost?`<button class="big" id="shup">Улучшить · ${fmtN(cost)} ${ICO.gold.replace('<svg','<svg style="width:20px;height:20px;vertical-align:-3px"')}</button>`:`<button class="big" disabled>Нужно ${fmtN(cost)} золота</button>`):`<button class="big" disabled>${(m=>`${plural(m,'Нужна','Нужны','Нужно')} ещё ${m} ${plural(m,'карта','карты','карт')}`)(nd-o.n)}</button>`:'';
  act=`<div class="lbar${canUp(k)?' up':''}" style="width:100%"><i style="width:${o.lv>=MAXLV?100:Math.min(100,o.n/nd*100).toFixed(0)}%"></i><em>${o.lv>=MAXLV?'Максимальный уровень':`Карт: ${o.n} из ${nd} для уровня ${o.lv+1}`}</em></div>
   ${up}<div class="shb"><button class="ghost" id="shx">Закрыть</button><button class="big blue" id="shu"${inDeck?' disabled':''}>${inDeck?'Уже в колоде':'В колоду'}</button></div>`}
 sh.innerHTML=`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shn">
  <div class="shh"><canvas width="120" height="120" data-ic="${k}"></canvas><div><h3 id="shn">${c.n}</h3><div class="rar" style="color:${RAR[c.rar].c}">${RAR[c.rar].n.toUpperCase()} · ${type.toUpperCase()}${o?' · УРОВЕНЬ '+o.lv:''}</div><div class="cost"><i class="gem">${c.cost}</i>эликсира</div></div></div>
  <p class="note">${c.tip}</p>
  <div class="kv">${kv}</div>
  ${tags.length?`<div class="tags">${tags.map(t=>`<span>${t}</span>`).join('')}</div>`:''}
  ${specHTML(k)}
  ${act}</div>`;
 paintIcons(sh);sh.hidden=false;sh.onclick=e=>{if(e.target===sh)closeSheet()};$('#shx').onclick=closeSheet;$('#shx').focus();
 if($('#shu'))$('#shu').onclick=()=>{if(inDeck)return;AU.sfx('ui');repl=k;closeSheet();tab='cards';renderHome()};
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
function closeSheet(){const sh=$('#sheet'),was=!sh.hidden;sh.hidden=true;sh.innerHTML='';if(was&&!$('#home').hidden&&tab==='cards'&&!repl)renderHome()}

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
function renderEvents(m){const e=evDay();
 m.innerHTML=`<p class="note">Особые режимы без кубков. Первая победа в каждом режиме за день — золото и осколок эволюции ${ICO.shard.replace('<svg','<svg style="width:14px;height:14px;vertical-align:-2px"')}.</p>
 <div class="evs">${EVENTS.map(x=>`<div class="ev" style="--c:${x.c}"><div><b>${x.n}</b><small>${x.d}</small>${x.id==='train'?'':`<span class="evr">${e.won.includes(x.id)?'Награда дня получена':'Награда дня ждёт'}</span>`}</div><button class="big" data-ev="${x.id}">Играть</button></div>`).join('')}</div>`;
 m.querySelectorAll('[data-ev]').forEach(b=>b.onclick=()=>{AU.init();const id=b.dataset.ev;if(id==='train')openTraining();else if(id==='draft')openDraft();else startBattle(false,{mode:id})})}
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
  <h4>СОХРАНЕНИЕ</h4><p class="note">Прогресс хранится в этом браузере и может стереться вместе с его данными. Скопируй код и держи его в заметках: по нему прогресс восстановится на любом устройстве.</p>
  <textarea id="exp" readonly rows="3" aria-label="Код сохранения"></textarea><button class="ghost" id="cpy">Скопировать код</button>
  <textarea id="imp" rows="3" placeholder="Вставь сюда код сохранения" aria-label="Код для загрузки"></textarea><button class="ghost" id="ld">Загрузить прогресс из кода</button><p class="note" id="imsg" role="status"></p>
  <h4>СБРОС</h4><button class="ghost danger" id="rst">Начать заново</button>
  <button class="big blue" id="shx">Готово</button></div>`;
 sh.hidden=false;sh.onclick=e=>{if(e.target===sh)closeSheet()};$('#exp').value=exportCode();
 $('#nmi').onchange=()=>{const v=$('#nmi').value.trim().slice(0,16);P.name=v||'Игрок';saveP();renderHeader()};
 $('#gfx').onclick=()=>{R3.want=!R3.want;store.set('ac.gfx',R3.want?'hi':'lo');$('#gfx').textContent=R3.want?'Графика: реалистичная 3D':'Графика: простая 2D';if(R3.want&&T&&!R3.ready)r3Load()};
 sh.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{AU.sfx('ui');store.set('ac.qual',b.dataset.q);sh.querySelectorAll('[data-q]').forEach(x=>x.setAttribute('aria-checked',x===b));if(R3.ready)applyQual()});
 $('#snd').onclick=()=>{AU.init();AU.mute=!AU.mute;store.set('ac.mute',AU.mute);micon();$('#snd').textContent=AU.mute?'Звук выключен':'Звук включён';AU.sfx('ui')};
 $('#cpy').onclick=()=>{const t=$('#exp');t.value=exportCode();const sel2=()=>{t.focus();t.select();$('#imsg').textContent='Код выделен — скопируй его вручную'};
  try{navigator.clipboard.writeText(t.value).then(()=>{$('#imsg').textContent='Код скопирован'},sel2)}catch(e){sel2()}};
 $('#ld').onclick=()=>{const err=importCode($('#imp').value);if(err){$('#imsg').textContent=err;AU.sfx('deny');return}AU.sfx('win');closeSheet();tab='play';renderHome();toast('Прогресс загружен')};
 $('#rst').onclick=()=>{if(!armed){armed=true;$('#rst').textContent='Точно? Всё пропадёт — нажми ещё раз';return}P=freshProfile();saveP();closeSheet();tab='play';renderHome();toast('Начинаем с нуля')};
 $('#shx').onclick=()=>{$('#nmi').onchange();closeSheet()};$('#shx').focus()}

/* ---------- бой ---------- */
const TIPS={full:'Эликсир полон — трать его, иначе он пропадает',enemy:'Враг перешёл реку — поставь защитника у него на пути',spell:'Заклинание можно бросить в любое место поля',
 tower:'Башня пала! Теперь войска можно ставить и на её стороне реки',king:'Король проснулся — теперь он тоже стреляет',double:'Последняя минута: эликсир копится вдвое быстрее',
 champ:'Чемпион на поле — нажми кнопку способности в гуще боя',ot:'Овертайм: кто первым сломает башню, тот и победил'};
let tipT=0;
function tip(k){if(P.st.games>=3||P.hints.includes(k)||!$('#tip').hidden||!$('#help').hidden)return;P.hints.push(k);saveP();const e=$('#tip');e.querySelector('span').textContent=TIPS[k];e.hidden=false;clearTimeout(tipT);tipT=setTimeout(()=>{e.hidden=true},4200)}
function tips(){if(P.st.games>=3||G.over)return;const S=G.side[0];
 if(S.el>=10)tip('full');if(G.U.some(u=>u.tm===1&&u.y>RY+RIV))tip('enemy');if(sel!=null&&S.hand[sel]&&CARDS[S.hand[sel]].type==='spell')tip('spell');
 if(G.T.some(t=>t.tm===1&&t.kind==='p'&&t.hp<=0))tip('tower');if(G.T.some(t=>t.tm===1&&t.kind==='k'&&t.act))tip('king');
 if(elRate()>1&&!G.ot)tip('double');if(G.ot)tip('ot');if(S.champ&&alive(S.champ))tip('champ')}
const OV=$('#ov');
function showOv(html){OV.innerHTML=html;OV.classList.add('on')}
function hideOv(){OV.classList.remove('on');OV.innerHTML=''}
function showView(v){$('#home').hidden=v==='battle';$('#battle').hidden=v!=='battle';if(v==='battle')requestAnimationFrame(fit)}
let handEls=[],hs={};
function startBattle(train,opt){AU.init();opt=opt||null;
 const A0=curArena();if(R3.want&&!R3.failed&&(!R3.ready||!r3HasTheme(A0))){const sh=$('#sheet');if(T&&!R3.loading&&!R3.ready)r3Load();if(R3.ready)r3LoadTheme(A0);
  sh.innerHTML=`<div class="sh" role="dialog" aria-modal="true" aria-labelledby="shn"><h3 class="t" id="shn">Загрузка 3D</h3><p class="note">Модели и текстуры грузятся один раз, потом берутся из кэша.</p><div class="lbar" style="width:100%"><i id="lp" style="width:0%"></i><em id="lpt">0%</em></div><button class="ghost" id="lsk">Играть в простой графике</button></div>`;
  sh.hidden=false;let skip=false;const t0=performance.now();$('#lsk').onclick=()=>{skip=true;closeSheet();startBattle1(train,opt)};
  const w=()=>{if(skip)return;const p=Math.round(R3.progress*100);if($('#lp')){$('#lp').style.width=p+'%';$('#lpt').textContent=T?p+'%':'загружаю 3D-движок…'}
   if(!T&&!R3.failed&&performance.now()-t0>40000){R3.failed=true;R3.why='3D-движок не загрузился за 40 секунд (сеть или запрет загрузки модулей)'}
   if(R3.ready&&r3HasTheme(A0)||R3.failed||!T&&!R3.want){closeSheet();if(R3.failed)toast('3D не запустилось: '+R3.why.slice(0,120));startBattle1(train,opt)}else setTimeout(w,150)};w();return}
 startBattle1(train,opt)}
let lastOpt=null;
const MODE_N={triple:'Тройной эликсир',sudden:'Внезапная смерть',draft:'Драфт'};
function startBattle1(train,opt){AU.sfx('ui');closeSheet();lastOpt=opt;const a=curArena(),B=botSetup(a,train),nm=pickV(BOT_NAMES),md=opt?opt.mode:'normal';
 if(TH!==THEMES[a]){TH=THEMES[a];BG=null}
 let decks=[curDeck(),B.deck],lv=[levelsMap(),B.lv],ex=[deckSpecial(),B.ex];
 if(md==='draft'){const eq={};for(const k of CARD_IDS)eq[k]=START_LV[CARDS[k].rar]+ARENA_LV[a];decks=[opt.deck,opt.bot];lv=[eq,eq];ex=[{},{}]}
 newMatch({decks,lv,kl:[P.kl,B.kl],bots:[null,B.skill],names:['Ты',nm],train:train||!!opt,mode:md,ex,tt:[P.tt,B.tt]});G.event=opt?md:null;
 mode='play';sel=null;gx=-1;paused=false;hideOv();$('#emo').hidden=true;$('#tip').hidden=true;
 $('#enname').textContent=train?`Тренировка · ${SKILL[P.train].n}`:opt?`${MODE_N[md]} · ${nm}`:`${nm} · ур. ${B.kl}`;
 showView('battle');R3.on=false;if(R3.want&&R3.ready&&r3Begin(a))r3Show();else r3Stop();hs={};renderHand();$('#help').hidden=P.tut>0;banner(train?'Тренировка':opt?MODE_N[md]:'В бой!','#ffc83d')}
function renderHand(){const S=G.side[0],box=$('#hand');box.innerHTML='';handEls=[];
 S.hand.forEach((k,i)=>{if(!k){const e=document.createElement('div');e.className='card empty';e.setAttribute('aria-hidden','true');box.appendChild(e);handEls.push(e);return}
  const c=CARDS[k],b=document.createElement('button');b.className='card';b.dataset.r=c.rar;b.setAttribute('aria-label',`${c.n}, ${c.cost} эликсира`);
  if(k===S.evo)b.classList.add(evoReady(S,k)?'evo':'evo-wait');if(k===S.hero)b.classList.add('hero');
  b.innerHTML=`<canvas width="120" height="120" data-ic="${k}"></canvas><i class="gem">${c.cost}</i>${k===S.evo?`<span class="eb">${evoReady(S,k)?'ЭВО':'эво '+S.evoN+'/'+EVO[k].cyc}</span>`:k===S.hero?'<span class="eb">ГЕРОЙ</span>':''}<span class="nm">${c.n}</span>`;
  b.addEventListener('pointerdown',e=>{if(!G||G.over||paused||mode!=='play')return;AU.init();sel=sel===i?null:i;AU.sfx('ui');e.preventDefault()});
  if(i===hs.newIdx)b.classList.add('in');box.appendChild(b);handEls.push(b)});hs.newIdx=-1;
 const nx=document.createElement('div');nx.id='nx';nx.innerHTML=`<canvas width="72" height="72" data-ic="${S.queue[0]}"></canvas><span>ДАЛЕЕ</span>`;box.appendChild(nx);
 paintIcons(box);hs.sig=S.hand.join()+'|'+S.queue[0]+'|'+S.evoN}
const fmt=s=>{s=Math.max(0,Math.ceil(s));return(s/60|0)+':'+String(s%60).padStart(2,'0')};
const setPips=(tm,n)=>[...$('#cp'+tm+' .pips').children].forEach((e,i)=>e.classList.toggle('on',i<n));
function hud(){const S=G.side[0],e=S.el,ei=Math.floor(e);
 $('#ef').style.width=(e*10)+'%';if(ei!==hs.el){hs.el=ei;$('#en').textContent=ei;$('#eb').classList.toggle('full',ei>=10)}
 const M=CFG.match,left=G.tb?0:G.ot?M.ot-G.otT:M.len-G.t,tm=fmt(left);if(tm!==hs.tm){if(hs.tm&&left<=10&&left>0&&!G.over)AU.sfx('tick');hs.tm=tm;$('#tm').textContent=tm;$('#tm').classList.toggle('low',left<=10||!!G.ot)}
 tips();
 const er=elRate(),ph=G.tb?'ТАЙБРЕЙКЕР':G.ot?'ОВЕРТАЙМ · ×'+er:er>1?'ЭЛИКСИР ×'+er:'ОСТАЛОСЬ';if(ph!==hs.ph){hs.ph=ph;$('#ph').textContent=ph}
 const cr=G.crowns.join();if(cr!==hs.cr){hs.cr=cr;setPips(0,G.crowns[0]);setPips(1,G.crowns[1])}
 if(S.hand.join()+'|'+S.queue[0]+'|'+S.evoN!==hs.sig)renderHand();
 handEls.forEach((b,i)=>{if(!S.hand[i])return;const c=CARDS[S.hand[i]];b.style.setProperty('--p',Math.min(1,e/c.cost).toFixed(3));b.classList.toggle('sel',sel===i);b.classList.toggle('off',cardBlocked(0,S.hand[i]))});
 const ch=!!S.champ&&alive(S.champ),ab=$('#ab');if(ab.hidden!==!ch)ab.hidden=!ch;
 if(ch){const a=S.champ.c.ability;ab.classList.toggle('cd',S.abCd>0||S.el<a.cost);const t=S.abCd>0?`${a.n} · ${Math.ceil(S.abCd)} с`:a.n;if(t!==hs.ab){hs.ab=t;$('#abn').textContent=t}}}
function tryPlay(){const S=G.side[0],key=S.hand[sel],c=CARDS[key];if(!key||G.tb){sel=null;return}
 if(cardBlocked(0,key))return deny(key===S.hero?'Герой уже на поле':'Чемпион уже на поле');
 if(S.el<c.cost)return deny('Мало эликсира');
 if(!canPlace(0,key,gx,gy))return deny(c.type==='building'&&gy>RY+RIV?'Мешает строение или башня':'Сюда нельзя');
 const idx=sel;playCard(0,sel,gx,gy);sel=null;hs.newIdx=idx;renderHand();if(!P.tut){P.tut=1;saveP();$('#help').hidden=true}}
function deny(t){AU.sfx('deny');floatText(clamp(gx,48,W-48),gy-20,t,'#ff9b8f',12)}
function togglePause(){if(mode!=='play'||!G||G.over)return;paused=!paused;
 if(paused){showOv(`<div class="scr"><h2>Пауза</h2><button class="big" id="resume">Продолжить</button><button class="ghost" id="quit">Сдаться</button></div>`);$('#resume').onclick=togglePause;$('#quit').onclick=()=>{paused=false;hideOv();G.crowns[1]=3;finish(1)};$('#resume').focus()}
 else hideOv()}
function endScreen(){mode='end';sel=null;const r=G.res,cr=G.crowns,S=G.stats[0],train=G.train,ev=G.event;let dtr=0,lucky=-1,gold=0,newA=-1,evr=null;
 if(ev&&r===0)evr=eventReward(ev);if(!G.train||ev)clanFight();
 if(!train){const a0=curArena(),before=P.tr;P.tr=Math.max(ARENAS[a0].tr,P.tr+trophyDelta(r));dtr=P.tr-before;P.best=Math.max(P.best,P.tr);
  if(r===0){lucky=a0;gold=8+3*a0;P.gold+=gold}
  const a1=curArena();if(a1>P.arSeen){newA=a1;P.arSeen=a1}
  P.st.games++;if(r===0)P.st.w++;else if(r===1)P.st.l++;else P.st.d++;P.st.cr+=cr[0];if(cr[0]===3)P.st.three++;saveP()}
 AU.sfx(r===0?'win':r===1?'lose':'ui');
 const rw=ev?`<span class="rw">${MODE_N[ev]}: без кубков</span>${evr?`<span class="rw">${ICO.gold}<b>+${evr.gold}</b>${evr.shards?` · ${ICO.shard}<b>+1</b> осколок`:''}</span>`:''}`:train?'<span class="rw">Тренировка: без кубков и наград</span>':`<span class="rw">${ICO.trophy}<b>${dtr>0?'+':''}${dtr}</b> кубков${gold?` · ${ICO.gold}<b>+${gold}</b>`:''}</span>
  ${lucky>=0?`<button class="big lucky" id="luck"><canvas width="84" height="70" data-chest="silver"></canvas>Сундук удачи</button>`:''}
  ${newA>=0?`<span class="rw" style="color:var(--gold)">Новая арена: «${ARENAS[newA].n}»! Открылись новые карты</span>`:''}`;
 showOv(`<div class="scr"><h2 style="color:${r===0?'var(--gold)':r===1?'var(--red)':'var(--ink)'}">${r===0?'Победа!':r===1?'Поражение':'Ничья'}</h2>
  <div class="pips big3">${[0,1,2].map(i=>crownSVG.replace('<svg','<svg class="'+(i<cr[0]?'on':'')+'"')).join('')}</div>
  <p class="sub">Счёт ${cr[0]} : ${cr[1]} против «${esc(G.names[1])}»</p>
  <div class="endrw">${rw}</div>
  <div class="st2"><span>Урон башням <b>${fmtN(S.dmg)}</b></span><span>Эликсир <b>${Math.round(S.spent)}</b></span><span>Пропало <b>${Math.round(S.leak)}</b></span></div>
  <div class="odeck" aria-label="Колода соперника"><small>КОЛОДА СОПЕРНИКА</small>${G.side[1].deck.map(k=>`<canvas width="60" height="60" data-ic="${k}" title="${CARDS[k].n}"></canvas>`).join('')}<button class="link" id="cpd">Скопировать колоду</button></div>
  <button class="big" id="again">${train?'ЕЩЁ РАЗ':'ЕЩЁ БОЙ'}</button><button class="ghost" id="home2">Домой</button></div>`);
 paintIcons(OV);
 const od=G.side[1].deck.slice();let luckOpen=false;
 const goHome=()=>{AU.sfx('ui');hideOv();G=null;mode='home';r3Stop();showView('home');tab='play';renderHome();if(newA>=0)toast(`Арена ${newA+1}: «${ARENAS[newA].n}» открыта`)};
 if(lucky>=0){P.luck.push(lucky);if(P.luck.length>6)P.luck.shift();saveP();$('#luck').onclick=()=>{if(luckOpen)return;luckOpen=true;const i=P.luck.lastIndexOf(lucky);if(i>=0)P.luck.splice(i,1);saveP();goHome();luckySpin(lucky)}}
 $('#cpd').onclick=()=>{AU.init();const miss=od.filter(k=>!P.cards[k]);if(miss.length){AU.sfx('deny');toast('Не хватает карт: '+miss.map(k=>CARDS[k].n).join(', '));return}
  if(!okDeck(od)){AU.sfx('deny');toast('Такую колоду собрать нельзя');return}P.decks[P.slot]=od;saveP();AU.sfx('dep');$('#cpd').textContent=`Колода ${P.slot+1} заменена`;$('#cpd').disabled=true};
 $('#again').onclick=()=>{if(ev==='draft'){hideOv();G=null;mode='home';r3Stop();showView('home');openDraft();return}startBattle(train&&!ev,ev?lastOpt:null)};$('#home2').onclick=goHome;$('#again').focus()}

/* ---------- ввод ---------- */
/* ткнул чуть дальше своей половины — карта встаёт на ближайший разрешённый край (или в открытый карман) */
function snapPlace(key,x,y){if(!key||canPlace(0,key,x,y))return[x,y];const c=CARDS[key];if(c.type==='spell')return[x,y];
 const own=RY+RIV+3,cand=[];x=clamp(x,10,W-10);
 if(c.tunnel){cand.push([x,y<RY?RY-RIV-4:RY+RIV+4])}
 else{if(pocketOpen(0,x)){if(y<POCKET_Y)cand.push([x,POCKET_Y+1]);else if(Math.abs(y-RY)<RIV+3)cand.push([x,y<RY?RY-RIV-4:own])}cand.push([x,Math.max(y,own)])}
 for(const[cx,cy]of cand)for(const[dx,dy]of[[0,0],[0,8],[0,16],[-14,4],[14,4],[0,26],[-26,10],[26,10]]){const px=clamp(cx+dx,10,W-10),py=cy+dy;if(canPlace(0,key,px,py))return[px,py]}
 // внутри башни или строения — ближайшая свободная точка вокруг
 for(let r=6;r<=70;r+=4)for(let i=0;i<24;i++){const a=i/24*Math.PI*2,px=clamp(x+Math.cos(a)*r,10,W-10),py=clamp(y+Math.sin(a)*r,10,H-10);if(canPlace(0,key,px,py))return[px,py]}
 return[x,y]}
function pos(e){let x,y;if(R3.on){const q=r3Pick(e.clientX,e.clientY);if(!q){gx=-1;return}x=q.x;y=q.y}else{const r=C.getBoundingClientRect();x=(e.clientX-r.left)/r.width*W;y=(e.clientY-r.top)/r.height*H;if(x<0||x>W||y<0||y>H){gx=-1;return}}
 [gx,gy]=G&&sel!=null&&mode==='play'?snapPlace(G.side[0].hand[sel],x,y):[x,y]}
addEventListener('pointermove',e=>{if(mode==='play')pos(e)});
C.addEventListener('pointerdown',pos);
addEventListener('pointerup',e=>{if(mode!=='play'||!G||G.over||paused||sel==null)return;
 if(e.target!==C&&!(e.target.closest&&e.target.closest('.card')))return;pos(e);if(gx>=0)tryPlay()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#sheet').hidden){closeSheet();return}
 if(mode!=='play'||!G)return;
 if(e.key==='Escape')sel=null;
 if(e.key>='1'&&e.key<='4'){const i=+e.key-1;if(G.side[0].hand[i])sel=sel===i?null:i}
 if(e.key==='p'||e.key==='P'||e.key===' '){e.preventDefault();togglePause()}
 if(e.key==='q'||e.key==='Q')useAbility(0)});
$('#bp').onclick=()=>{AU.init();togglePause()};
function micon(){$('#mi').setAttribute('d',AU.mute?'M3 9v6h4l5 4V5L7 9zM16 9l5 6M21 9l-5 6':'M3 9v6h4l5 4V5L7 9zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14');$('#bm').setAttribute('aria-pressed',AU.mute)}
$('#bm').onclick=()=>{AU.init();AU.mute=!AU.mute;store.set('ac.mute',AU.mute);micon();AU.sfx('ui')};
$('#ab').onclick=()=>{AU.init();if(G&&!useAbility(0))AU.sfx('deny')};
$('#emo').innerHTML=EMOTES.map((t,i)=>`<button data-e="${i}">${t}</button>`).join('');
$('#be').onclick=()=>{AU.init();$('#emo').hidden=!$('#emo').hidden};
$('#emo').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(!G)return;emote(0,+b.dataset.e);$('#emo').hidden=true;
 if(G.bots[1]&&Math.random()<.4)setTimeout(()=>{if(G&&!G.over)emote(1,pickV([0,3,4,5]))},900+Math.random()*900)});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play'&&!paused&&G&&!G.over)togglePause()});

/* ---------- размеры и цикл ---------- */
function fit(){if($('#battle').hidden)return;const st=$('#stage'),w=st.clientWidth,h=st.clientHeight;if(!w||!h)return;
 const k=Math.min(w/W,h/H),cw=Math.floor(W*k),ch=Math.floor(H*k),wr=$('#wrap');
 wr.style.width=cw+'px';wr.style.height=ch+'px';document.documentElement.style.setProperty('--cw',Math.max(cw,290)+'px');
 dpr=Math.min(3,window.devicePixelRatio||1);const nk=cw*dpr/W;
 if(!BG||Math.abs(nk-K)>.001){K=nk;C.width=Math.round(cw*dpr);C.height=Math.round(ch*dpr);BG=buildBG(K)}
 r3Resize(cw,ch)}
new ResizeObserver(()=>requestAnimationFrame(fit)).observe($('#stage'));
let lastT=0,acc=0;
function loop(ts){const dt=Math.min(.05,(ts-lastT)/1000||0);lastT=ts;
 if(G&&(mode==='play'||mode==='end')&&!paused){acc+=dt;let n=0;while(acc>=TICK&&n<4){step(TICK);acc-=TICK;n++}if(n===4)acc=0;
  if(mode==='play'&&G.over&&performance.now()>G.endAt)endScreen()}
 if(G&&!$('#battle').hidden&&$('#loot').hidden){if(R3.on)r3Frame(ts);else draw(ts);hud()}
 requestAnimationFrame(loop)}
['#cp0','#cp1'].forEach(s=>{$(s+' .pips').innerHTML=crownSVG.repeat(3)});
TH=THEMES[curArena()];tickChests();micon();renderHome();requestAnimationFrame(loop);
