import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld, DECK} from './harness.mjs';
import {series} from '../tools/tournament.mjs';

function world() {
  const w = makeWorld();
  w.run(`newMatch({decks:[${JSON.stringify(DECK)},${JSON.stringify(DECK)}],lv:[{},{}],kl:[11,11],bots:[null,null],seed:3})`);
  return w;
}
const run = (w, sec) => w.run(`for(let i=0;i<Math.round(${sec}*CFG.sim.hz);i++)step(TICK)`);

test('танк «только здания» сворачивает к зданию-приманке в центре', () => {
  const w = world();
  w.run(`spawn(1,'giant',70,280,11);spawn(0,'cannon',180,420,11);globalThis.g=G.U.find(u=>u.key==='giant');globalThis.c=G.B[0];c.dmg=0`);
  run(w, 8);
  assert.equal(w.run('g.tg===c'), true, 'цель — приманка');
  assert.ok(w.run('g.x') > 110, 'ушёл с дорожки к центру');
});

test('стрелок за танком не выходит вперёд: останавливается на своей дальности', () => {
  const w = world();
  w.run(`G.T.forEach(t=>{if(t.tm===1){t.dmg=0;t.hp=t.mx=1e7}});spawn(0,'giant',70,420,11);spawn(0,'crossbow',70,470,11);globalThis.g=G.U.find(u=>u.key==='giant');globalThis.x=G.U.find(u=>u.key==='crossbow')`);
  run(w, 30);
  const tw = 'G.T.find(t=>t.tm===1&&t.kind==="p"&&t.x<W/2)';
  assert.ok(w.run(`g.tg===${tw}&&g.lock`), 'танк бьёт башню');
  const dg = w.run(`dist(g,${tw})`), dx = w.run(`dist(x,${tw})`);
  assert.ok(dx > dg + 20, `стрелок дальше танка: ${dx.toFixed(0)} против ${dg.toFixed(0)}`);
  assert.ok(dx - w.run(`${tw}.r`) <= 6 * 20 + 12, 'стоит на своей дальности');
});

test('оглушение сбрасывает разогрев луча', () => {
  const w = world();
  w.run(`spawn(0,'scorch',180,420,11);spawn(1,'giant',180,330,11);globalThis.s=G.U.find(u=>u.key==='scorch');globalThis.g=G.U.find(u=>u.key==='giant');g.frozenT=999;g.hp=g.mx=1e7`);
  run(w, 6);
  assert.equal(w.run('s.beamSt'), 2, 'разогрелся до третьей ступени');
  w.run('stunObj(s,.5)'); run(w, 1.2);
  assert.equal(w.run('s.beamSt'), 0, 'после оглушения снова первая ступень');
});

test('замах: если цель умерла до удара, удар пропадает', () => {
  const w = world();
  w.run(`G.T.forEach(t=>{t.dmg=0});spawn(0,'hammer',180,420,11);spawn(1,'bones',180,395,11);globalThis.h=G.U.find(u=>u.key==='hammer');G.U.filter(u=>u.key==='bones').forEach(u=>u.frozenT=999)`);
  let wound = false;
  for (let i = 0; i < 90 && !wound; i++) { run(w, 1 / 30); wound = w.run('h.wu>0'); }
  assert.ok(wound, 'начал замах');
  w.run(`globalThis.t0=h.tg;t0.hp=0;globalThis.others=G.U.filter(u=>u.tm===1&&u!==t0).map(u=>u.hp).join()`);
  run(w, 0.5);
  assert.equal(w.run(`G.U.filter(u=>u.tm===1).map(u=>u.hp).join()`), w.run('others'), 'удар никого не задел');
});

test('путь по тайлам: обход здания и переход реки только по мостам', () => {
  const w = world();
  w.run(`G.T.forEach(t=>{t.dmg=0});spawn(0,'cannon',120,420,11);G.B[0].dmg=0;spawn(0,'guard',125,480,11);globalThis.u=G.U[0];globalThis.bad=0;globalThis.river=[]`);
  for (let i = 0; i < 30 * 12; i++) {
    run(w, 1 / 30);
    w.run(`if(alive(u)){if(dist(u,G.B[0])<G.B[0].r+u.r*.6-2)bad++;if(Math.abs(u.y-RY)<RIV)river.push(Math.min(...BR.map(b=>Math.abs(u.x-b))))}`);
  }
  assert.equal(w.run('bad'), 0, 'не лез сквозь здание');
  assert.ok(w.run('river.length') > 0, 'перешёл реку');
  assert.ok(w.run('Math.max(...river)') <= 20, 'только по мосту');
  assert.ok(w.run('u.y') < 300, 'на вражеской половине');
});

test('летуны летят напрямую над рекой', () => {
  const w = world();
  w.run(`spawn(0,'drake',180,420,11);globalThis.d=G.U[0]`);
  run(w, 3);
  assert.ok(Math.abs(w.run('d.x') - 180) < 60 && w.run('d.y') < 400);
});

test('обзор: дальнобойный = дальность + 0,5; «только здания» — 7,5; остальные — 5,5', () => {
  const w = world();
  assert.equal(w.run('sightOf(CARDS.crossbow)'), 6.5);
  assert.equal(w.run('sightOf(CARDS.giant)'), 7.5);
  assert.equal(w.run('sightOf(CARDS.guard)'), 5.5);
});

test('бот: 5 уровней из конфига, HP башен и уровень карт по таблице', () => {
  const w = world();
  assert.equal(w.run('Object.keys(CFG.bot.levels).join()'), 'novice,easy,normal,hard,expert');
  w.run(`newMatch({decks:[${JSON.stringify(DECK)},${JSON.stringify(DECK)}],lv:[{},{}],kl:[11,11],bots:[null,'novice'],thp:[1,.4],seed:1})`);
  assert.equal(w.run('G.T.find(t=>t.tm===1&&t.kind==="p").mx'), Math.round(3052 * .4));
});

test('турнир (малый): эксперт > 90% против новичка, средний > 80% против случайного, простой < 3 с', () => {
  const a = series('expert', 'novice', 10, 101), b = series('normal', 'random', 10, 201);
  assert.ok(a.winA > 0.9, `эксперт ${a.winA}`);
  assert.ok(b.winA >= 0.8, `средний ${b.winA}`);
  assert.ok(a.fullAvg < 3 && b.fullAvg < 3);
});

test('здание в чужой дорожке за пределами обзора не тянет танка', () => {
  const w = world();
  w.run(`G.T.forEach(t=>t.dmg=0);spawn(1,'giant',290,280,11);spawn(0,'cannon',60,520,11);globalThis.g=G.U.find(u=>u.key==='giant');G.B[0].dmg=0`);
  run(w, 6);
  assert.equal(w.run('g.tg&&g.tg.obj'), 't', 'идёт к башне своей дорожки');
  assert.ok(w.run('g.x') > 200, 'не ушёл в другую дорожку');
});
