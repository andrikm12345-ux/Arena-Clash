# Arena Clash

Карточная 3D-стратегия против бота: две башни принцесс и король с каждой стороны, колода из восьми карт, эликсир.
Всё своё: карты, правила и интерфейс. Модели и анимации — CC0-наборы, 3D — Three.js.

## Как устроено

- `src/` — исходники: `ui.html` (разметка и стили) и скрипты `1-data.js` … `8-ui.js` (данные, движок боя, бот, 2D и 3D отрисовка, прогресс, интерфейс).
- `assets/` — модели (`.glb`) и небо (`.hdr`).
- `vendor/three/` — Three.js 0.170 и нужные дополнения.
- `index.html` и `game.js` собираются командой `python3 tools/build.py`. Их и отдаёт Vercel как статический сайт.

## Авторы ресурсов

- 3D-персонажи, оружие и окружение — KayKit, Kay Lousberg (kaylousberg.com), CC0.
- Монстры — Ultimate Monsters, Quaternius (quaternius.com), CC0. Склеп, знамёна, факелы — KayKit Dungeon Remastered и Halloween Bits, CC0.
- Небо — Poly Haven (polyhaven.com), CC0.
- Three.js — MIT, см. `vendor/three/LICENSE`.
