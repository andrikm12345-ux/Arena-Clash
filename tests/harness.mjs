// Запуск боевого движка без браузера: конфиг, данные, движок, бот и прогресс в одном контексте.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const FILES = ['0-config.js', '1-data.js', '3-engine.js', '4-ai.js', '7-meta.js', '9-net.js'];

export function makeWorld(extra = {}) {
  const mem = new Map();
  const ctx = vm.createContext({
    console, Math: extra.Math || Math, ...(extra.globals || {}), JSON, Date, Number, Object, Array, Set, Map, String, Promise, Symbol, Error, TextEncoder, TextDecoder,
    btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'),
    matchMedia: () => ({matches: false}),
    document: {querySelector: () => null},
    window: {},
    localStorage: {getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k)},
    setTimeout: () => 0, clearTimeout: () => {},
    performance: {now: () => 0},
  });
  // FLYOFF и toast живут в файлах отрисовки и интерфейса — в тестах заглушки
  const code = "'use strict';\nconst FLYOFF=15;function toast(){}\n" + FILES.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
  vm.runInContext(code, ctx, {filename: 'game.js'});
  return {run: src => vm.runInContext(src, ctx), ctx};
}

export const DECK = ['guard', 'giant', 'crossbow', 'axe', 'bones', 'imps', 'fireball', 'volley'];
