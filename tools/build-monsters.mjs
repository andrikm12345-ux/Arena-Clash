// Сборка монстров и декора: node tools/build-monsters.mjs
// Quaternius Ultimate Monsters (CC0) — свои скелеты и анимации; KayKit Dungeon/Halloween (CC0) — склеп, знамёна, факелы.
// Всё в один assets/m/monsters.glb: каждая модель — узел верхнего уровня со своим именем,
// узлы называются «M_Модель» (чтобы не совпасть с деталями внутри моделей), анимации — «Модель/Клип», атлас хранится один раз.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune, dedup, resample, mergeDocuments, unpartition, weld} from '@gltf-transform/functions';
import path from 'node:path';
import fs from 'node:fs';

const Q = process.env.QUAT || '/tmp/claude-0/assets/qsmall';
const KK = process.env.KAYKIT || '/home/user/kaykit-game-assets';
const DUN = `${KK}/KayKit-Dungeon-Remastered-1.0/addons/kaykit_dungeon_remastered/Assets/gltf`;
const HAL = `${KK}/KayKit-Halloween-Bits-1.0/addons/kaykit_halloween_bits/Assets/gltf`;
const OUT = path.resolve(process.argv[2] || 'assets/m/monsters.glb');
const MONSTERS = ['Orc', 'Yeti', 'GreenSpikyBlob', 'Dragon_Evolved', 'Dragon', 'Ghost'];
const PROPS = {crypt: `${HAL}/crypt.gltf`, lantern: `${HAL}/lantern_standing.gltf`, grave: `${HAL}/gravestone.gltf`,
  banner_red: `${DUN}/banner_shield_red.gltf.glb`, banner_blue: `${DUN}/banner_shield_blue.gltf.glb`,
  torch: `${DUN}/torch_mounted.gltf.glb`, barrel: `${DUN}/barrel_large.gltf.glb`};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const lib = await io.read(`${Q}/${MONSTERS[0]}.gltf`);
const scene = lib.getRoot().listScenes()[0];
const wrap = (doc, sc, name) => { const g = doc.createNode(name); for (const n of sc.listChildren()) g.addChild(n); sc.addChild(g); return g; };
for (const a of lib.getRoot().listAnimations()) a.setName(`${MONSTERS[0]}/${a.getName()}`);
wrap(lib, scene, 'M_' + MONSTERS[0]);
const add = async (name, file, anim) => {
  const d = await io.read(file);
  if (anim) for (const a of d.getRoot().listAnimations()) a.setName(`${name}/${a.getName()}`);
  else for (const a of d.getRoot().listAnimations()) a.dispose();
  const map = mergeDocuments(lib, d), sc = d.getRoot().listScenes()[0], grp = lib.createNode('M_' + name);
  for (const n of sc.listChildren()) grp.addChild(map.get(n));
  scene.addChild(grp);
  for (const s of d.getRoot().listScenes()) map.get(s).dispose();
};
for (const m of MONSTERS.slice(1)) await add(m, `${Q}/${m}.gltf`, true);
for (const [n, f] of Object.entries(PROPS)) await add(n, f, false);
await lib.transform(unpartition(), dedup(), prune({keepLeaves: true}), resample({tolerance: 1e-4}));
fs.mkdirSync(path.dirname(OUT), {recursive: true});
await io.write(OUT, lib);
console.log(`${OUT}: ${(fs.statSync(OUT).size / 1024).toFixed(0)} КБ, узлов ${scene.listChildren().map(n => n.getName()).join(', ')}, анимаций ${lib.getRoot().listAnimations().length}, текстур ${lib.getRoot().listTextures().length}`);
