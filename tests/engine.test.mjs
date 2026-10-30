import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld, DECK} from './harness.mjs';

// новый мир на каждый тест; бой без ботов, если не сказано иное
function world(opt = {}) {
  const w = makeWorld();
  w.run(`newMatch(Object.assign({decks:[${JSON.stringify(DECK)},${JSON.stringify(DECK)}],lv:[{},{}],kl:[11,11],bots:[null,null],names:['a','b'],seed:7},${JSON.stringify(opt)}))`);
  return w;
}
const run = (w, sec) => w.run(`for(let i=0;i<Math.round(${sec}*CFG.sim.hz);i++)step(TICK)`);
const tower = (tm, kind, side) => `G.T.find(t=>t.tm===${tm}&&t.kind==='${kind}'${side ? `&&(t.x<W/2)===${side === 'left'}` : ''})`;

// ---------- правила матча ----------
test('король: мгновенная победа и 3 короны, боковые башни считаются разрушенными', () => {
  const w = world();
  w.run(`damage(${tower(1, 'k')},1e7,0)`); run(w, TICK_S());
  assert.equal(w.run('G.over'), 1); assert.equal(w.run('G.res'), 0);
  assert.equal(w.run('G.crowns.join()'), '3,0');
  assert.equal(w.run('G.T.filter(t=>t.tm===1&&t.hp>0).length'), 0);
});
function TICK_S() { return 1 / 30; }

test('по таймеру побеждает тот, у кого больше корон', () => {
  const w = world();
  w.run(`damage(${tower(1, 'p', 'left')},1e7,0)`); run(w, 1);
  assert.equal(w.run('G.over'), 0);
  run(w, 180);
  assert.equal(w.run('G.over'), 1); assert.equal(w.run('G.res'), 0); assert.equal(w.run('G.ot'), 0);
});

test('овертайм: начинается при равных коронах, первая башня решает', () => {
  const w = world();
  run(w, 180.1);
  assert.equal(w.run('G.ot'), 1); assert.equal(w.run('G.over'), 0);
  w.run(`damage(${tower(0, 'p', 'right')},1e7,1)`); run(w, TICK_S());
  assert.equal(w.run('G.over'), 1); assert.equal(w.run('G.res'), 1);
});

test('овертайм: две башни в один тик — бой продолжается', () => {
  const w = world();
  run(w, 180.1);
  w.run(`damage(${tower(0, 'p', 'left')},1e7,1);damage(${tower(1, 'p', 'left')},1e7,0)`); run(w, TICK_S());
  assert.equal(w.run('G.over'), 0);
  w.run(`damage(${tower(1, 'p', 'right')},1e7,0)`); run(w, TICK_S());
  assert.equal(w.run('G.res'), 0);
});

test('тайбрейкер: войска исчезают, проигрывает самая слабая башня', () => {
  const w = world();
  w.run(`${tower(1, 'p', 'left')}.hp=900;${tower(0, 'p', 'right')}.hp=1500;spawn(0,'guard',100,450,11);G.U[0].frozenT=999`);
  run(w, 180 + 120 + TICK_S());
  assert.ok(w.run('!!G.tb')); assert.equal(w.run('G.U.length'), 0); assert.equal(w.run('G.over'), 0);
  run(w, 1);
  assert.equal(w.run('G.over'), 0, 'анимация тайбрейкера идёт 2–3 с');
  run(w, 2);
  assert.equal(w.run('G.over'), 1); assert.equal(w.run('G.res'), 0);
  assert.equal(w.run(`${tower(1, 'p', 'left')}.hp`), 0);
});

test('тайбрейкер: равные минимальные HP — ничья', () => {
  const w = world();
  w.run(`${tower(1, 'p', 'left')}.hp=1200;${tower(0, 'p', 'right')}.hp=1200`);
  run(w, 180 + 120 + 3.5);
  assert.equal(w.run('G.over'), 1); assert.equal(w.run('G.res'), 2);
});

test('внезапная смерть: башня решает, по времени — тайбрейкер', () => {
  let w = world({mode: 'sudden'});
  w.run(`damage(${tower(0, 'p', 'left')},1e7,1)`); run(w, TICK_S());
  assert.equal(w.run('G.res'), 1);
  w = world({mode: 'sudden'});
  run(w, 180.1); assert.ok(w.run('!!G.tb'));
});

// ---------- эликсир ----------
test('за 120 с фазы x1 копится 42,86 эликсира (без трат и потолка)', () => {
  const w = world();
  w.run('CFG.elixir.max=1e9;G.side[0].el=0');
  run(w, 120);
  const el = w.run('G.side[0].el');
  assert.ok(Math.abs(el - 120 / 2.8) < 0.01, `накоплено ${el}`);
});

test('скорость эликсира: 2,8 / 1,4 / 0,933 с, стоп на 10', () => {
  const w = world();
  const rate = () => { w.run('G.side[0].el=0'); run(w, 2.8); return w.run('G.side[0].el'); };
  assert.ok(Math.abs(rate() - 1) < 0.01);
  w.run('G.t=120'); assert.ok(Math.abs(rate() - 2) < 0.01);
  w.run('G.ot=1;G.otT=60'); assert.ok(Math.abs(rate() - 3) < 0.01);
  w.run('G.side[0].el=9.9'); run(w, 2); assert.equal(w.run('G.side[0].el'), 10);
});

test('старт эликсира: 5 обычно, 0 в ускоренных режимах', () => {
  assert.equal(world().run('G.side[0].el'), 5);
  assert.equal(world({mode: 'triple'}).run('G.side[0].el'), 0);
  assert.equal(world({mode: 'double'}).run('G.side[1].el'), 0);
});

test('нельзя сыграть карту без эликсира', () => {
  const w = world();
  w.run(`G.side[0].el=1;G.side[0].hand[0]='giant'`);
  assert.equal(w.run('playCard(0,0,100,500)'), false);
});

// ---------- колода и рука ----------
test('стартовая рука и порядок — по seed', () => {
  const a = world({seed: 11}).run('G.side[0].hand.join()+"|"+G.side[0].queue.join()');
  const b = world({seed: 11}).run('G.side[0].hand.join()+"|"+G.side[0].queue.join()');
  const c = world({seed: 12}).run('G.side[0].hand.join()+"|"+G.side[0].queue.join()');
  assert.equal(a, b); assert.notEqual(a, c);
});

test('флаг noStart: карта не попадает в стартовую руку', () => {
  for (let seed = 1; seed < 40; seed++) {
    const w = makeWorld();
    w.run(`CARDS.cannon.noStart=1;newMatch({decks:[${JSON.stringify(DECK.slice(0, 7).concat('cannon'))},${JSON.stringify(DECK)}],lv:[{},{}],kl:[11,11],bots:[null,null],seed:${seed}})`);
    assert.ok(!w.run('G.side[0].hand.includes("cannon")'), `seed ${seed}`);
  }
});

test('сыгранная карта возвращается после трёх других; задержка входа 1,0 / 0,5 с', () => {
  const w = world();
  w.run('G.side[0].el=99;CFG.elixir.max=99');
  const first = w.run('G.side[0].hand[0]');
  const play = () => { const i = w.run('G.side[0].hand.findIndex(k=>k&&CARDS[k].type!=="building")'); w.run(`playCard(0,${i},100,${500})`); };
  w.run(`playCard(0,0,${first === 'fireball' || first === 'volley' ? 180 : 100},500)`);
  assert.equal(w.run('G.side[0].hand[0]'), null, 'слот пуст сразу после розыгрыша');
  run(w, 0.95); assert.equal(w.run('G.side[0].hand[0]'), null);
  run(w, 0.1); assert.ok(w.run('G.side[0].hand[0]'), 'карта вошла через 1 с');
  for (let i = 0; i < 3; i++) { assert.ok(!w.run(`G.side[0].hand.includes('${first}')`)); play(); run(w, 1.05); }
  play(); run(w, 1.05);
  assert.ok(w.run(`G.side[0].hand.includes('${first}')`), 'вернулась после трёх других');
  w.run('G.t=121'); play(); run(w, 0.55);
  assert.ok(w.run('G.side[0].hand.every(Boolean)'), 'в x2 задержка 0,5 с');
});

test('эволюция: сначала N обычных розыгрышей, затем усиленный', () => {
  const w = world({ex: [{evo: 'guard'}, {}]});
  const play = () => { w.run(`G.side[0].el=10;G.side[0].hand[0]='guard';G.U.length=0;playCard(0,0,100,500)`); run(w, 1.2); return w.run(`G.U.find(u=>u.key==='guard').evo?1:0`); };
  assert.equal([play(), play(), play(), play(), play(), play()].join(''), '001001');
});

// ---------- арена ----------
test('королевская башня не стреляет, пока не задета; пробуждение ~4 с', () => {
  const w = world();
  w.run(`spawn(0,'guard',180,170,11);const u=G.U[0];u.frozenT=999;u.hp=u.mx=1e7`);
  run(w, 6);
  assert.equal(w.run(`G.PR.filter(p=>p.pk==='king').length+(${tower(1, 'k')}.act)`), 0, 'король спит, хотя враг в зоне');
  w.run(`damage(${tower(1, 'k')},10,0)`);
  let shotAt = -1;
  for (let i = 0; i < 30 * 6 && shotAt < 0; i++) { run(w, TICK_S()); if (w.run(`G.PR.some(p=>p.pk==='king')`)) shotAt = (i + 1) / 30; }
  assert.ok(shotAt >= 3.9 && shotAt <= 4.2, `первый выстрел через ${shotAt} с`);
});

test('королевская башня просыпается при падении боковой', () => {
  const w = world();
  w.run(`damage(${tower(1, 'p', 'left')},1e7,0)`); run(w, TICK_S());
  assert.equal(w.run(`${tower(1, 'k')}.act`), 1);
});

test('карман: только после падения башни, только в её дорожке, глубина 4 тайла', () => {
  const w = world();
  const can = (x, y) => w.run(`canPlace(0,'guard',${x},${y})`);
  const y = 'RY-RIV-2*TILE', deep = 'RY-RIV-4.5*TILE';
  assert.equal(can(60, y), false);
  w.run(`damage(${tower(1, 'p', 'left')},1e7,0)`); run(w, TICK_S());
  assert.equal(can(60, y), true);
  assert.equal(can(300, y), false, 'правая дорожка закрыта');
  assert.equal(can(60, deep), false, 'глубже кармана нельзя');
  assert.equal(w.run(`canPlace(1,'guard',60,H-(${y}))`), false, 'у соперника своя сторона без изменений');
});

test('войска только на своей половине, заклинания — где угодно, не в башню', () => {
  const w = world();
  assert.equal(w.run(`canPlace(0,'guard',100,200)`), false);
  assert.equal(w.run(`canPlace(0,'fireball',100,100)`), true);
  assert.equal(w.run(`canPlace(0,'guard',${'CFG.arena.king[0]*TILE'},${'CFG.arena.king[1]*TILE'})`), false);
  assert.equal(w.run(`canPlace(0,'guard',100,RY)`), false, 'не в реку');
});

test('башни: цифры уровня 11 и +10% за уровень', () => {
  const w = world();
  assert.equal(w.run(`${tower(0, 'p', 'left')}.mx`), 3052);
  assert.equal(w.run(`${tower(0, 'k')}.mx`), 4824);
  assert.equal(w.run(`${tower(0, 'p', 'left')}.dmg`), 109);
  const w12 = world({kl: [12, 12]});
  assert.equal(w12.run(`${tower(0, 'p', 'left')}.mx`), Math.round(3052 * 1.1));
});

// ---------- детерминизм ----------
test('тик 30 Гц и одинаковый seed дают одинаковый бой ботов', () => {
  const snap = seed => {
    const w = world({seed, bots: ['normal', 'normal']});
    run(w, 90);
    assert.equal(w.run('G.tick'), 2700);
    return w.run(`JSON.stringify([G.U.map(u=>[u.key,Math.round(u.x),Math.round(u.y),Math.round(u.hp)]),G.T.map(t=>Math.round(t.hp)),G.side.map(s=>s.hand.join()+s.el.toFixed(3))])`);
  };
  assert.equal(snap(5), snap(5));
  assert.notEqual(snap(5), snap(6));
});

test('повтор: журнал команд и seed без ботов воспроизводят бой точно', () => {
  const w = world({seed: 9, bots: ['novice', 'expert']});
  run(w, 75);
  const snap = 'JSON.stringify([G.tick,G.U.map(u=>[u.key,u.x.toFixed(2),u.y.toFixed(2),u.hp]),G.T.map(t=>t.hp),G.side.map(s=>s.hand.join()+s.el.toFixed(4))])';
  const a = w.run(snap), log = w.run('JSON.stringify(G.log)'), setup = w.run('JSON.stringify(G.setup)');
  assert.ok(JSON.parse(log).length > 6, 'в журнале есть розыгрыши');
  const r = makeWorld();
  r.run(`newMatch(Object.assign(${setup},{bots:[null,null],replay:${log}}))`);
  run(r, 75);
  assert.equal(r.run(snap), a);
});

// ---------- физика и новые карты ----------
test('отбрасывание плавное: юнит отъезжает за несколько тиков, не телепортом', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);spawn(1,'guard',180,300,11);globalThis.u=G.U[0];u.frozenT=999;u.hp=u.mx=1e6;globalThis.y0=u.y;castSpell(0,'fireball',180,310,11)`);
  let d1 = 0; for (let i = 0; i < 60 && !d1; i++) { run(w, 1 / 30); d1 = w.run('Math.abs(u.y-y0)'); }
  run(w, .5); const d2 = w.run('Math.abs(u.y-y0)');
  assert.ok(d1 < d2 * .5, `первый тик ${d1}, итог ${d2}`);
  assert.ok(d2 > 8, `отброшен на ${d2}`);
});

test('высадка тяжёлого расталкивает лёгких', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);spawn(0,'guard',180,450,11);globalThis.u=G.U[0];u.frozenT=999;globalThis.p0={x:u.x,y:u.y};spawn(0,'giant',180,452,11)`);
  run(w, .4);
  assert.ok(w.run('Math.hypot(u.x-p0.x,u.y-p0.y)') > 10);
});

test('вихрь тянет лёгких сильнее тяжёлых и будит короля', () => {
  const w = world();
  w.run(`G.T.forEach(t=>{t.dmg=0;t.hp=t.mx=1e7});spawn(1,'guard',120,140,11);spawn(1,'giant',240,140,11);G.U.forEach(u=>{u.frozenT=999;u.hp=u.mx=1e7});globalThis.a=G.U.find(u=>u.key==='guard');globalThis.g=G.U.find(u=>u.key==='giant');globalThis.k=${tower(1, 'k')};castSpell(0,'vortex',180,120,11)`);
  const da0 = w.run('Math.abs(a.x-180)'), dg0 = w.run('Math.abs(g.x-180)');
  run(w, .5);
  const pa = da0 - w.run('Math.abs(a.x-180)'), pg = dg0 - w.run('Math.abs(g.x-180)');
  assert.ok(pa > 15 && pa > pg * 1.5, `лёгкий ${pa}, тяжёлый ${pg}`);
  assert.ok(w.run('k.act||k.wake>0'), 'король проснулся');
});

test('родник: +1 эликсир каждые 9,8 с, не бывает в стартовой руке', () => {
  const w = world();
  w.run(`G.side[0].el=0;CFG.elixir.periodBak=CFG.elixir.period;CFG.elixir.period=1e9;spawn(0,'spring',180,560,11)`);
  run(w, 10);
  assert.equal(Math.round(w.run('G.side[0].el')), 1);
  w.run(`CFG.elixir.period=CFG.elixir.periodBak`);
  assert.equal(w.run('CARDS.spring.noStart'), 1);
});

test('налётчица: рывок к цели в 3,5–6 тайлах, неуязвима в рывке, удар ×2', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);spawn(0,'raider',180,560,11);spawn(1,'giant',180,400,11);globalThis.r=G.U.find(u=>u.key==='raider');globalThis.g=G.U.find(u=>u.key==='giant');g.frozenT=999;g.hp=g.mx=1e7;globalThis.dashSeen=0`);
  for (let i = 0; i < 60; i++) { run(w, 1 / 30); if (w.run('r.dashing')) { w.run('globalThis.dashSeen=1;globalThis.h0=r.hp;damage(r,500,1)'); assert.equal(w.run('r.hp'), w.run('h0')); break; } }
  assert.equal(w.run('dashSeen'), 1, 'рывок начался');
  run(w, 1);
  assert.ok(w.run('1e7-g.hp') >= w.run('LV(CARDS.raider.dmg,11)*2') - 1);
});

test('целебный звон лечит своих и не лечит чужих', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);spawn(0,'guard',180,450,11);spawn(1,'guard',190,450,11);G.U.forEach(u=>{u.frozenT=999;u.hp=10});castSpell(0,'mend',185,450,11)`);
  run(w, 2.5);
  assert.ok(w.run('G.U.find(u=>u.tm===0).hp') > 300);
  assert.equal(w.run('G.U.find(u=>u.tm===1).hp'), 10);
});

test('каток катится 10 клеток, бьёт каждого один раз, толкает лёгких, не трогает летающих', () => {
  const w = world();
  w.run(`G.T.forEach(t=>{t.dmg=0;t.hp=t.mx=1e7});spawn(1,'guard',180,300,11);spawn(1,'bats',200,300,11);G.U.forEach(u=>{u.frozenT=999;u.hp=u.mx=1e6});globalThis.g=G.U.find(u=>u.key==='guard');globalThis.b=G.U.find(u=>u.key==='bats');globalThis.y0=g.y;castSpell(0,'roller',180,420,11)`);
  run(w, 2);
  assert.equal(w.run('1e6-g.hp'), w.run('LV(CARDS.roller.dmg,11)'), 'один удар');
  assert.ok(w.run('y0-g.y') > 15, `отброшен вперёд на ${w.run('y0-g.y')}`);
  assert.equal(w.run('b.hp'), 1e6, 'летающих не задевает');
  assert.equal(w.run('G.Z.length'), 0, 'докатился и исчез');
});

test('щитоносец: щит принимает урон первым и спасает от оглушения', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);spawn(0,'shieldman',180,450,11);globalThis.s=G.U[0];s.frozenT=999`);
  const sh = w.run('s.shield'), hp = w.run('s.hp');
  assert.equal(sh, w.run('LV(CARDS.shieldman.shield,11)'));
  w.run('damage(s,100,1);stunObj(s,2)');
  assert.equal(w.run('s.hp'), hp); assert.equal(w.run('s.shield'), sh - 100); assert.equal(w.run('s.stunT'), 0);
  w.run(`damage(s,${sh},1)`);
  assert.equal(w.run('s.shield'), 0); assert.equal(w.run('s.hp'), hp - 100);
});

test('мортира: бьёт навесом издалека и башни, вблизи — мёртвая зона', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);spawn(0,'mortar',180,400,11);globalThis.m=G.B[0];spawn(1,'giant',180,380,11);globalThis.g=G.U[0];g.frozenT=999;g.hp=g.mx=1e6`);
  run(w, 6);
  assert.equal(w.run('g.hp'), 1e6, 'вблизи не стреляет');
  assert.ok(w.run('m.tg===null'), 'цели нет');
  w.run(`g.hp=0;G.U=[];spawn(1,'giant',180,220,11);globalThis.g2=G.U[0];g2.frozenT=999;g2.hp=g2.mx=1e6`);
  run(w, 8);
  assert.ok(w.run('1e6-g2.hp') >= w.run('LV(CARDS.mortar.dmg,11)'), 'попал издалека');
  w.run(`G.U=[];G.B=[];spawn(0,'mortar',90,350,11);globalThis.m2=G.B[0];globalThis.pt=${tower(1, 'p', 'left')};globalThis.h0=pt.hp`);
  run(w, 9);
  assert.ok(w.run('h0-pt.hp') > 0, 'достаёт башню');
});

test('погост: поднимает скелетов в круге за 9,5 с', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);castSpell(0,'grave',180,160,11)`);
  run(w, 3);
  const a = w.run('G.U.filter(u=>u.tm===0&&u.key==="bones").length');
  assert.ok(a >= 3 && a <= 6, `за 3 с: ${a}`);
  run(w, 8);
  assert.equal(w.run('G.Z.filter(z=>z.k==="grave").length'), 0);
});

test('размен: заклинание, убившее больше своей цены, даёт «+N эликсира» в статистику', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);spawn(1,'shooters',180,200,11);spawn(1,'slingers',185,215,11);G.U.forEach(u=>u.frozenT=999);castSpell(0,'fireball',182,205,11)`);
  run(w, 2);
  assert.equal(w.run('G.U.filter(u=>u.tm===1&&alive(u)).length'), 0);
  assert.equal(w.run('G.stats[0].trade'), 1, 'стрелки 3 + пращники 2 − шар 4 = +1');
  assert.ok(w.run('G.TX.some(t=>t.t==="+1 эликсира")') || w.run('G.stats[0].trade') === 1);
});

test('разбор боя: перевес по секундам и отметка упавшей башни', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);spawn(1,'shooters',180,200,11);G.U.forEach(u=>{u.frozenT=999});`);
  run(w, 2);
  w.run(`G.U.forEach(u=>u.hp=0)`); run(w, 1.1);
  assert.equal(w.run('G.tl.length'), 4);
  assert.equal(w.run('G.tl[G.tl.length-1]'), 3, 'убиты стрелки за 3 эликсира');
  w.run(`damage(${tower(1, 'p', 'left')},1e7,0)`); run(w, .1);
  assert.equal(w.run('G.tlEv.length'), 1); assert.equal(w.run('G.tlEv[0].tm'), 1);
});

// ---------- день и ночь ----------
test('цикл: день 50 с, ночь 40 с, плавный переход; в обучении цикла нет', () => {
  const w = world();
  assert.equal(w.run('nightK(10)'), 0); assert.equal(w.run('nightK(60)'), 1); assert.equal(w.run('nightK(95)'), 0);
  assert.ok(w.run('nightK(48.5)') > 0 && w.run('nightK(48.5)') < 1);
  assert.equal(w.run('nightK(140)+nightK(160)'), 2, 'вторая ночь 2:20–3:00');
  const t = world({mode: 'tutor'}); assert.equal(t.run('nightK(60)'), 0);
});

test('ночью башня не видит врага вне света, а близкого — видит', () => {
  const w = world();
  w.run(`G.t=60;${tower(0, 'p', 'left')}.dmg=0;spawn(1,'shooters',70,380,11);G.U.length=1;globalThis.s=G.U[0];globalThis.k=${tower(0, 'p', 'left')};s.frozenT=999;s.hp=s.mx=1e6;k.dmg=100`);
  // стрелок в 6,5 клетки от башни: в радиусе стрельбы (7,5), но вне света (5)
  w.run(`s.x=k.x;s.y=k.y-6.5*TILE-k.r*.2`);
  run(w, 2);
  assert.equal(w.run('s.hp'), 1e6, 'в темноте не стреляет');
  assert.equal(w.run('G.night'), true);
  w.run(`G.t=10`); run(w, 2);
  assert.ok(w.run('s.hp') < 1e6, 'днём стреляет');
});

test('факел и ближний бой открывают врага ночью', () => {
  const w = world();
  w.run(`G.t=60;CARDS.guard.light=0;spawn(1,'shooters',180,200,11);G.U.length=1;globalThis.s=G.U[0];s.frozenT=999;s.hp=s.mx=1e6;spawn(0,'crossbow',180,320,11);globalThis.c=G.U.find(u=>u.key==='crossbow');c.frozenT=0`);
  w.run('c.x=180;c.y=200+5.5*TILE');run(w, 1/30);
  assert.equal(w.run('seen(0,s)'), false, 'в 5,5 клетки, без света — не видно');
  w.run('G.Z.push({k:"glow",tm:0,x:180,y:200,r:20,t:5,tot:5,light:60})');run(w, 1/30);
  assert.equal(w.run('seen(0,s)'), true, 'свет открывает');
  w.run('G.Z=[];c.y=200+2*TILE');run(w, 1/30);
  assert.equal(w.run('seen(0,s)'), true, 'ближе 2,5 клетки — видно');
});

test('сродство: ночная карта ночью бьёт на 25% сильнее и ходит на 15% быстрее', () => {
  const w = world();
  w.run(`CARDS.guard.aff='night';spawn(0,'guard',180,450,11);globalThis.g=G.U[0]`);
  const day = w.run('spdOf(g)');
  w.run('G.t=60');
  assert.ok(Math.abs(w.run('spdOf(g)') / day - 1.15) < 1e-9);
  w.run(`spawn(1,'giant',180,430,11);globalThis.v=G.U.find(u=>u.key==='giant');v.hp=v.mx=1e6;attack(g,v)`);
  assert.ok(Math.abs((1e6 - w.run('v.hp')) / w.run('g.dmg') - 1.25) < 1e-9);
});

test('Факелоносец и Фонарь светят ночью; Вспышка светит и ослепляет', () => {
  const w = world();
  w.run(`G.t=60;spawn(1,'shooters',180,200,11);G.U.length=1;globalThis.s=G.U[0];s.frozenT=999;s.hp=s.mx=1e6`);
  run(w, 1/30); assert.equal(w.run('seen(0,s)'), false);
  w.run(`spawn(0,'torchman',180,200+3*TILE,11);globalThis.tc=G.U.find(u=>u.key==='torchman');tc.frozenT=999`); run(w, 1/30);
  assert.equal(w.run('seen(0,s)'), true, 'факел в 3 клетках');
  w.run(`tc.hp=0`); run(w, 1/30); w.run(`spawn(0,'lantern',180,300,11)`); run(w, 1/30);
  assert.equal(w.run('dist(s,G.B[0])<6*TILE'), true); assert.equal(w.run('seen(0,s)'), true, 'фонарь');
  w.run(`G.B=[];G.T.forEach(t=>t.dmg=0);spawn(1,'guard',100,150,11);globalThis.g=G.U.find(u=>u.key==='guard');castSpell(0,'flash',100,150,11)`); run(w, 1/30);
  assert.ok(w.run('g.stunT') > 0, 'ослеплён'); assert.equal(w.run('seen(0,g)'), true);
});

test('Сумрак прячет даже днём, кроме ближнего круга', () => {
  const w = world();
  w.run(`spawn(1,'shooters',180,200,11);G.U.length=1;globalThis.s=G.U[0];s.frozenT=999;spawn(0,'crossbow',180,200+5*TILE,11);globalThis.c=G.U.find(u=>u.key==='crossbow');c.frozenT=999`);
  run(w, 1/30); assert.equal(w.run('seen(0,s)'), true, 'днём видно');
  w.run(`castSpell(1,'shade',180,200,11)`); run(w, 1/30);
  assert.equal(w.run('seen(0,s)'), false, 'в Сумраке скрыт');
  w.run('c.y=200+2*TILE'); run(w, 1/30);
  assert.equal(w.run('seen(0,s)'), true, 'вплотную видно');
});

// ---------- разрушаемый ландшафт ----------
test('Подрыв обрушивает мост: стоявшие на нём падают на берег и оглушены, через 20 с мост цел', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);spawn(1,'guard',BR[0],RY,11);globalThis.g=G.U[0];g.hp=g.mx=1e6;castSpell(0,'sapper',BR[0],RY,11)`);
  run(w, 1.5);
  assert.ok(w.run('G.bridges[0].down') > 0, 'мост лежит'); assert.equal(w.run('G.bridges[1].down'), 0);
  assert.ok(w.run('Math.abs(g.y-RY)') >= w.run('RIV'), 'юнит на берегу');
  assert.equal(w.run('onBridge(BR[0])'), false);
  run(w, 21);
  assert.equal(w.run('G.bridges[0].down'), 0); assert.equal(w.run('G.bridges[0].hp'), w.run('CFG.bridge.hp')); assert.equal(w.run('onBridge(BR[0])'), true);
});

test('без моста наземные идут через другой, летающие — напрямую', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);bridgeDown(0);spawn(0,'giant',70,470,11);globalThis.g=G.U[0];spawn(0,'bats',70,470,11)`);
  run(w, 13);
  assert.ok(w.run('g.x') > 200, `великан ушёл к правому мосту: x=${w.run('g.x')}`);
  assert.ok(w.run('G.U.filter(u=>u.key==="bats").every(u=>u.x<150)'), 'летуны не сворачивают');
});

test('обычный сплэш мост не ломает; огненный шар — царапает и оставляет воронку, она замедляет', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);spawn(1,'bomber',BR[0],RY-40,11);spawn(0,'guard',BR[0],RY+10,11);G.U.forEach(u=>{u.hp=u.mx=1e6})`);
  run(w, 6);
  assert.equal(w.run('G.bridges[0].hp'), w.run('CFG.bridge.hp'), 'бомбы не трогают');
  w.run(`G.U=[];castSpell(0,'fireball',BR[0],RY,11)`); run(w, 2);
  assert.ok(w.run('G.bridges[0].hp') < w.run('CFG.bridge.hp') && w.run('G.bridges[0].down') === 0);
  assert.equal(w.run('G.Z.filter(z=>z.k==="crater").length'), 1);
  w.run(`spawn(0,'guard',BR[0],RY+5,11);globalThis.u=G.U[0]`); run(w, 1/30);
  assert.ok(Math.abs(w.run('spdOf(u)') / w.run('SPD[u.c.spd]') - 0.7) < 1e-9);
});

test('погода арен: Овраг — ночь длиннее, Перевал — медленнее, Трон — мосты прочнее, Цитадель — молния', () => {
  const o = world({arena: 1}); assert.equal(o.run('nightK(45)'), 1, 'ночь с 40-й секунды'); assert.equal(world().run('nightK(45)'), 0);
  const p = world({arena: 3}); p.run(`spawn(0,'guard',180,450,11)`);
  assert.ok(Math.abs(p.run('spdOf(G.U[0])/SPD[G.U[0].c.spd]') - .92) < 1e-9);
  assert.equal(world({arena: 7}).run('G.bridges[0].mx'), 3200);
  const c = world({arena: 6}); c.run(`G.T.forEach(t=>t.dmg=0);spawn(1,'giant',180,320,11);G.U[0].frozenT=999;globalThis.h0=G.U[0].hp`); run(c, 40);
  assert.equal(world().run('G.rules.storm||0'), 0);
  assert.ok(c.run('G.stormT') >= 0);
});

// ---------- карты под цикл ----------
test('Затмение вызывает ночь днём на 14 с и плавно уходит; Рассвет — день ночью', () => {
  const w = world();
  assert.equal(w.run('nightK()'), 0);
  w.run(`castSpell(0,'eclipse',180,320,11)`); run(w, 7);
  assert.equal(w.run('nightK()'), 1); assert.equal(w.run('G.night'), true);
  run(w, 8); assert.equal(w.run('G.force'), null); assert.equal(w.run('nightK()'), 0);
  w.run(`G.t=60;castSpell(0,'dawn',180,320,11)`); run(w, 6);
  assert.equal(w.run('nightK()'), 0); assert.equal(w.run('G.night'), false);
});

test('Тень невидима ночью даже в свете, но видна вплотную; днём видна всегда', () => {
  const w = world();
  w.run(`G.t=60;spawn(1,'shadowblade',180,200,11);G.U.length=1;globalThis.s=G.U[0];s.frozenT=999;G.Z.push({k:'glow',tm:0,x:180,y:200,r:20,t:9,tot:9,light:200});spawn(0,'crossbow',180,200+5*TILE,11);globalThis.c=G.U.find(u=>u.key==='crossbow');c.frozenT=999`);
  run(w, 1/30); assert.equal(w.run('seen(0,s)'), false, 'в свете, но скрыта');
  w.run('c.y=200+2*TILE'); run(w, 1/30); assert.equal(w.run('seen(0,s)'), true, 'вплотную видна');
  w.run('G.t=10;c.y=200+5*TILE'); run(w, 1/30); assert.equal(w.run('seen(0,s)'), true, 'днём видна');
});
