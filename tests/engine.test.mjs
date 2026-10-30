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
