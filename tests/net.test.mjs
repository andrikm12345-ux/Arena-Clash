import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld} from './harness.mjs';

// искажённая математика: каждый вызов чуть-чуть врёт на последний бит — как другой браузер
function wobbly() {
  const M = Object.create(Math), w = f => (...a) => f(...a) * (1 + 3e-16);
  M.hypot = w(Math.hypot); M.sin = w(Math.sin); M.cos = w(Math.cos); M.exp = w(Math.exp); M.pow = w(Math.pow);
  M.atan2 = w(Math.atan2); M.tan = w(Math.tan); M.log = w(Math.log);
  return M;
}
const DECK_A = ['giant', 'fireball', 'vortex', 'grave', 'roller', 'mortar', 'bats', 'spring'];
const DECK_B = ['colossus', 'poison', 'freeze', 'sapper', 'drake', 'legion', 'raider', 'cry'];
const SETUP = {decks: [DECK_A, DECK_B], seed: 4242};

// две симуляции, связанные «сетью» с задержкой доставки в шагах цикла; возвращает оба мира
function duel({ticks = 1800, lat = [0, 4], math2 = null, seed = 1, drop = null} = {}) {
  let rng = seed; const rnd = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const q = [[], []]; // q[i] — сообщения, летящие К миру i: {at, m}
  let it = 0;
  const mk = (me, math) => {
    const w = makeWorld({Math: math || undefined, globals: {__send: m => { if (!drop || !drop(m)) q[1 - me].push({at: it + lat[0] + Math.floor(rnd() * (lat[1] - lat[0] + 1)), m: JSON.parse(JSON.stringify(m))}); }}});
    w.run(`newMatch({decks:${JSON.stringify(SETUP.decks)},lv:[{},{}],kl:[11,11],bots:[null,null],names:['a','b'],seed:${SETUP.seed}});
      netInit({send:__send,close(){}},${me});`);
    return w;
  };
  const W = [mk(0), mk(1, math2)];
  const cmds = [[], []];
  for (let me = 0; me < 2; me++) for (let t = 20; t < ticks; t += 17 + (me * 5)) cmds[me].push(t);
  let stalls = 0;
  const maxIt = ticks * 40;
  while ((W[0].run('G.tick') < ticks || W[1].run('G.tick') < ticks) && it < maxIt) {
    it++;
    for (let me = 0; me < 2; me++) {
      const w = W[me];
      // доставка
      const due = q[me].filter(x => x.at <= it); q[me] = q[me].filter(x => x.at > it);
      for (const x of due) w.run(`netRecv(${JSON.stringify(x.m)})`);
      // игрок нажимает карту или способность
      const tk = w.run('G.tick');
      if (cmds[me].length && tk >= cmds[me][0]) {
        cmds[me].shift();
        const i = Math.floor(rnd() * 4), x = 20 + Math.floor(rnd() * 320), y = me ? 40 + Math.floor(rnd() * 260) : 380 + Math.floor(rnd() * 240);
        w.run(`netCmd({k:'p',i:${i},x:${x},y:${y}})`);
      }
      // скорость устройств разная: иногда шаг пропускается
      if (w.run('G.tick') < ticks && (rnd() < 0.8 || me === 0)) { if (!w.run('netStep()')) stalls++; }
    }
  }
  return {W, stalls, it};
}
const snap = w => w.run(`JSON.stringify({t:G.tick,h:stateHash(),u:G.U.length,c:G.crowns,e:G.side.map(s=>Math.round(s.el*1e4)),log:G.log.length})`);

test('две симуляции по сети дают одинаковое состояние (задержки 0–4 шага, разная скорость)', () => {
  const {W, stalls} = duel({ticks: 1500});
  assert.equal(W[0].run('G.tick'), W[1].run('G.tick'));
  assert.equal(snap(W[0]), snap(W[1]));
  assert.equal(W[0].run('NET.fail'), null); assert.equal(W[1].run('NET.fail'), null);
  assert.ok(W[0].run('G.U.length') + W[0].run('G.B.length') > 0, 'на поле что-то происходит');
  assert.ok(W[0].run('G.log.length') > 8, 'команды выполнялись');
});

test('большие задержки: симуляция ждёт соперника и результат тот же', () => {
  const {W, stalls} = duel({ticks: 900, lat: [3, 12], seed: 7});
  assert.ok(stalls > 0, 'были ожидания');
  assert.equal(snap(W[0]), snap(W[1]));
});

test('математика другого браузера (искажена на последний бит) не меняет бой', () => {
  assert.notEqual(wobbly().hypot(3, 4), 5, 'искажение действительно искажает');
  const {W} = duel({ticks: 2400, math2: wobbly(), seed: 3});
  assert.equal(snap(W[0]), snap(W[1]), 'любое использование hypot/sin/cos/exp/pow/atan2 в симуляции разошлось бы');
  assert.equal(W[1].run('NET.fail'), null);
});

test('расхождение состояния обнаруживается по контрольной сумме', () => {
  const {W} = duel({ticks: 400});
  // портим состояние у одного игрока и дальше идём: на ближайшей сверке будет «desync»
  W[1].run('G.U.forEach(u=>u.x+=3);G.side[1].el+=1');
  // прямой тест сверки: несовпавшие суммы
  W[0].run("NET.mine.set(999,1);netRecv({k:'h',tk:999,h:2})");
  assert.equal(W[0].run('NET.fail'), 'desync'); assert.equal(W[0].run('NET.failTick'), 999);
});

test('потерянный кадр: без кадров соперника симуляция делает ровно NET_D шагов и ждёт', () => {
  const w = makeWorld({globals: {__send: () => {}}});
  w.run(`newMatch({decks:${JSON.stringify([DECK_A, DECK_B])},lv:[{},{}],kl:[11,11],bots:[null,null],seed:1});netInit({send:__send,close(){}},0)`);
  let n = 0; while (w.run('netStep()') && n < 50) n++;
  assert.equal(n, w.run('NET_D')); assert.equal(w.run('G.tick'), n);
  w.run('netRecv({k:"f",tk:'+(w.run('NET_D')+1)+',c:[]})');
  assert.equal(w.run('netStep()'), true, 'пришёл кадр — идём дальше');
});

test('настройки соединения содержат TURN-ретранслятор (мобильные сети без прямого пути)', () => {
  const w = makeWorld();
  const o = JSON.parse(w.run('JSON.stringify(netPeerOpts())'));
  const urls = o.config.iceServers.flatMap(s => [].concat(s.urls));
  assert.ok(urls.some(u => u.startsWith('turn:')) && urls.some(u => u.startsWith('turns:')) && urls.some(u => u.startsWith('stun:')));
});
