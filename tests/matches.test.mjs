import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld} from './harness.mjs';

// полные бои бот против бота во всех режимах: доигрываются без ошибок и за разумное время
for (const mode of ['normal', 'double', 'triple', 'sudden', 'draft']) {
  test(`бои ботов доигрываются: ${mode}`, () => {
    for (let seed = 1; seed <= 4; seed++) {
      const w = makeWorld();
      const r = w.run(`(()=>{const A=botSetup(${seed % 8},false),B=botSetup(${(seed + 3) % 8},false);
        newMatch({decks:[A.deck,B.deck],lv:[A.lv,B.lv],kl:[A.kl,B.kl],bots:[A.skill,B.skill],mode:'${mode}',ex:[A.ex,B.ex],tt:[A.tt,B.tt],seed:${seed}});
        let n=0;while(!G.over&&n<CFG.sim.hz*400){step(TICK);n++}return[G.over,G.res,Math.round(G.t)]})()`);
      assert.equal(r[0], 1, `seed ${seed}: бой не закончился`);
      assert.ok(r[2] <= 300, `seed ${seed}: ${r[2]} с`);
    }
  });
}
