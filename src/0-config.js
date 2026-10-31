/* ================= КОНФИГ: числа правил, арены, башен и режимов =================
   Все времена — в секундах, расстояния — в тайлах, если не сказано иное.
   Характеристики карт — в таблице CARDS (1-data.js), прогресс — в 7-meta.js. */
const CFG={
 sim:{hz:30},                              // фиксированный тик симуляции, отдельно от кадров
 match:{len:180,dblAt:120,ot:120,otTripleAt:60,tiebreak:2.5,endDelay:1.5},
 elixir:{start:5,max:10,period:2.8},       // 1 эликсир за period секунд при x1
 hand:{size:4,delay:{1:1,2:.5,3:.35}},     // задержка входа новой карты по множителю эликсира
 arena:{tile:20,tilesW:18,tilesH:32,river:2,pocket:4,bridgeHalf:1.1,  // pocket — глубина кармана; bridgeHalf — полуширина моста (тайлы)
  princess:[3.5,25.75],king:[9,29]},       // центры своих башен (x, y в тайлах; у соперника зеркально)
 speed:{slow:45,med:60,fast:90,vfast:120,tile:60}, // классы скорости карт; tile — сколько единиц = 1 тайл/с
 sight:{def:5.5,ranged:.5,building:7.5},   // обзор: по умолчанию; у дальнобойных = дальность + ranged; у «только здания»
 retarget:.15,                             // как часто юнит без цели ищет новую
 unit:{fh:.35,wind:.3,windMax:.4,          // первый удар после захвата цели = hit×fh; замах = min(hit×wind, windMax), удар отменяется, если цель умерла
  replan:.5},                              // как часто пересчитывать путь по тайлам
 tower:{baseLevel:11,lvMul:1.1,            // цифры ниже — для уровня 11, +10% за уровень
  p:{hp:3052,dmg:109,hit:.8,rng:7.5,r:24},
  k:{hp:4824,dmg:109,hit:1,rng:7,r:32,wakeAim:3.3,wakeShot:.7}},
 phys:{knockDamp:12,knockMinMass:10,deployPushMass:8,deployPush:90,pullMass:8}, // отбрасывание — скоростью с затуханием; толчок при высадке тяжёлых; вихрь тянет в полную силу юнитов до pullMass
 bridge:{hp:2000,down:20,stun:1},          // прочность моста, сколько секунд он лежит, оглушение упавших
 crater:{t:8,slow:.3,k:.7},                // воронка от больших взрывов: время, замедление, радиус как доля взрыва
 /* погода арен: правила боя по номеру арены. cyc — длительность дня и ночи; spd — множитель скорости наземных;
    crT, crSlow — время и замедление воронок; brHp — множитель прочности мостов; storm — молния раз в N секунд бьёт по центру поля */
 arenaRules:[{},{cyc:[40,50]},{},{spd:.92},{crT:14},{crSlow:.5,crT:12},{storm:22},{brHp:1.6}],
 /* день и ночь: day/night — длительность фаз (с), fade — переход; ночью враг виден, только если в свете или ближе near клеток.
    light — радиусы света (клетки); aff — бонус карт в «своё» время суток */
 cycle:{on:1,day:50,night:40,fade:3,near:2.5,light:{p:5,k:6,bld:2,boom:3,boomT:2},aff:{dmg:.25,spd:.15}},
 juice:{heavyHit:500,hitStop:.05,kingSlow:.5,slowScale:.25,shakeDecay:60}, // хит-стоп на ударах от heavyHit урона; замедление при падении короля
 music:{battle:{bpm:134,key:0},night:{bpm:118,key:-3},ot:{bpm:156,key:2},menu:{bpm:104,key:-5}},    // темп и сдвиг тональности (полутоны от ля минора)
 /* бот: think — пауза между решениями; react — задержка реакции на угрозу; mist — доля ошибок;
    el — множитель эликсира; thp — HP его башен (по просьбе игрока у всех 1 — башни равные); lvOff — сдвиг уровня карт; countEl — считает эликсир соперника;
    acc — разброс позиции (точки); spell — готовность к заклинаниям; push — эликсир для атаки; abil — активность способностей */
 bot:{levels:{
  novice:{n:'Новичок',think:1.6,react:1.5,mist:.25,el:.8,thp:1,lvOff:-2,acc:20,spell:.35,push:10,abil:.3},
  easy:{n:'Лёгкий',think:1.2,react:1.1,mist:.15,el:.9,thp:1,lvOff:-1,acc:16,spell:.55,push:9.5,abil:.5},
  normal:{n:'Средний',think:.9,react:.8,mist:.07,el:1,thp:1,lvOff:0,acc:12,spell:.75,push:9,abil:.7},
  hard:{n:'Сложный',think:.6,react:.5,mist:.02,el:1,thp:1,lvOff:1,acc:8,spell:.95,push:8.5,abil:.9},
  expert:{n:'Эксперт',think:.4,react:.4,mist:0,el:1.1,thp:1,lvOff:1,acc:5,spell:1,push:8,abil:1,countEl:1}},
  byArena:['novice','easy','easy','normal','normal','hard','hard','expert'], // уровень бота по арене игрока
  leakAt:10},                              // на полном эликсире бот обязан что-то сыграть
 /* режимы: elStart — стартовый эликсир; phases — [с какой секунды, множитель]; ot — то же в овертайме;
    sudden — первая сломанная башня решает весь бой */
 modes:{
  normal:{elStart:5,phases:[[0,1],[120,2]],ot:[[0,2],[60,3]]},
  draft:{elStart:5,phases:[[0,1],[120,2]],ot:[[0,2],[60,3]]},
  double:{elStart:0,phases:[[0,2]],ot:[[0,2],[60,3]]},
  triple:{elStart:0,phases:[[0,3]],ot:[[0,3]]},
  midnight:{elStart:5,phases:[[0,1],[120,2]],ot:[[0,2],[60,3]],night:1},          // «Полночь»: весь бой — ночь
  sudden:{elStart:0,phases:[[0,2],[120,3]],ot:[[0,3]],sudden:1},
  tutor:{elStart:7,phases:[[0,1.5]],ot:[[0,2]],cycle:0}},             // обучение: ускоренный эликсир
 tutor:{battles:3,thp:[.2,.3,.4],bot:'novice',gold:50}
};
