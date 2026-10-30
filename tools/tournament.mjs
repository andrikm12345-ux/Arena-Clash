// Турнир ботов: node tools/tournament.mjs [матчей=200]
// Пары по спецификации: эксперт против новичка (> 90%), средний против случайного (> 80%);
// плюс средняя длина «простоя» на полном эликсире (должна быть < 3 с).
import {makeWorld} from '../tests/harness.mjs';

export function duel(w, a, b, seed, arena = 7) {
  return w.run(`(()=>{const L=CFG.bot.levels,mk=(k)=>{const d=genBotDeck(${arena}),lv={},o=(L[k]||{lvOff:0}).lvOff;for(const c of d){const s=START_LV[CARDS[c].rar];lv[c]=clamp(s+5+o,s,MAXLV)}return{d,lv,thp:(L[k]||{thp:1}).thp}};
   const A=mk('${a}'),B=mk('${b}');
   newMatch({decks:[A.d,B.d],lv:[A.lv,B.lv],kl:[11,11],bots:['${a}','${b}'],thp:[A.thp,B.thp],seed:${seed}});
   let n=0;while(!G.over&&n<CFG.sim.hz*400){step(TICK);n++}
   const f=st=>{const N=st.fullN+(st.fullCur>0?1:0);return N?(st.fullSum+st.fullCur)/N:0};
   return{res:G.res,t:G.t,full:[f(G.stats[0]),f(G.stats[1])],max:[G.stats[0].fullMax,G.stats[1].fullMax]}})()`);
}

export function series(a, b, n, seed0 = 1) {
  const w = makeWorld();
  let wa = 0, wb = 0, dr = 0, full = 0, fullMax = 0;
  for (let i = 0; i < n; i++) {
    // стороны чередуются, чтобы не было преимущества верхней или нижней половины
    const swap = i % 2 === 1, r = duel(w, swap ? b : a, swap ? a : b, seed0 + i);
    const aWon = r.res === (swap ? 1 : 0), bWon = r.res === (swap ? 0 : 1);
    wa += aWon; wb += bWon; dr += r.res === 2;
    full += (r.full[0] + r.full[1]) / 2; fullMax = Math.max(fullMax, ...r.max);
  }
  return {a, b, n, winA: wa / n, winB: wb / n, draw: dr / n, fullAvg: full / n, fullMax};
}

if (process.argv[1] && process.argv[1].endsWith('tournament.mjs')) {
  const n = +process.argv[2] || 200;
  for (const [a, b] of [['expert', 'novice'], ['normal', 'random'], ['hard', 'normal'], ['normal', 'easy']]) {
    const t0 = Date.now(), r = series(a, b, n);
    console.log(`${a} против ${b}: ${(r.winA * 100).toFixed(1)}% побед, ${(r.winB * 100).toFixed(1)}% поражений, ничьих ${(r.draw * 100).toFixed(1)}%; простой на 10 эликсира в среднем ${r.fullAvg.toFixed(2)} с (максимум ${r.fullMax.toFixed(1)} с); ${((Date.now() - t0) / 1000).toFixed(0)} с`);
  }
}
