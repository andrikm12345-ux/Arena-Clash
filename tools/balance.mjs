// Балансный симулятор: node tools/balance.mjs [матчей=300] [уровень=normal]
// Боты одного уровня играют случайными колодами, все карты на уровне 11; для каждой карты — доля побед колод, где она была.
import {makeWorld} from '../tests/harness.mjs';

const n = +process.argv[2] || 300, lvl = process.argv[3] || 'normal';
const w = makeWorld(), stat = {};
for (let i = 0; i < n; i++) {
  const r = w.run(`(()=>{const mk=()=>{const d=shuffleV(CARD_IDS.filter(k=>!CARDS[k].ability)).slice(0,7);d.push(pickV(CARD_IDS.filter(k=>CARDS[k].tg==='b'&&!d.includes(k))));const lv={};for(const k of d)lv[k]=11;return{d,lv}};
    const A=mk(),B=mk();newMatch({decks:[A.d,B.d],lv:[A.lv,B.lv],kl:[11,11],bots:['${lvl}','${lvl}'],seed:${i + 1}});
    let t=0;while(!G.over&&t<CFG.sim.hz*400){step(TICK);t++}return{a:A.d,b:B.d,res:G.res}})()`);
  for (const [deck, side] of [[r.a, 0], [r.b, 1]]) for (const k of deck) {
    const s = stat[k] ||= {k, games: 0, wins: 0};
    s.games++; if (r.res === side) s.wins++; else if (r.res === 2) s.wins += .5;
  }
  if ((i + 1) % 50 === 0) console.error(`… ${i + 1} из ${n}`);
}
const names = w.run('Object.fromEntries(CARD_IDS.map(k=>[k,CARDS[k].n]))');
const rows = Object.values(stat).sort((a, b) => b.wins / b.games - a.wins / a.games);
console.log(`Баланс: ${n} боёв ботов «${lvl}», случайные колоды\n`);
console.log('Карта                  Боёв  Побед');
for (const s of rows) console.log(`${names[s.k].padEnd(22)} ${String(s.games).padStart(4)}  ${(s.wins / s.games * 100).toFixed(1).padStart(5)}%`);
