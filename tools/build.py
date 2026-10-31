"""Сборка Arena Clash.
python3 tools/build.py            — сайт: index.html + game.js (для Vercel)
python3 tools/build.py --artifact OUT.html [--test TEST.html THREE_DIR]
                                  — одна страница со всеми моделями внутри (артефакт Claude)
"""
import base64, hashlib, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
ORDER = ['0-config.js', '1-data.js', '2-sprites.js', '3-engine.js', '4-ai.js', '5-render.js', '6-render3d.js', '7-meta.js', '8-ui.js']
ADDONS = [('GLTFLoader', 'loaders/GLTFLoader.js'), ('RGBELoader', 'loaders/RGBELoader.js'), ('SkeletonUtils', 'utils/SkeletonUtils.js', 1),
          ('BufferGeometryUtils', 'utils/BufferGeometryUtils.js', 1), ('EffectComposer', 'postprocessing/EffectComposer.js'),
          ('RenderPass', 'postprocessing/RenderPass.js'), ('UnrealBloomPass', 'postprocessing/UnrealBloomPass.js'), ('OutputPass', 'postprocessing/OutputPass.js'), ('ShaderPass', 'postprocessing/ShaderPass.js')]

def js():
    return "'use strict';\n" + ''.join((SRC / f).read_text() for f in ORDER)

def three_loader(core, addons):
    imps = ','.join('import("three/addons/%s")' % a[1] for a in ADDONS)
    sets = ';'.join(('T3.%s=m[%d]' % (a[0], i + 1)) if len(a) > 2 else ('T3.%s=m[%d].%s' % (a[0], i + 1, a[0])) for i, a in enumerate(ADDONS))
    return ('<script type="importmap">{"imports":{"three":"%s","three/addons/":"%s"}}</script>\n'
            '<script type="module">\nconst T3={};Promise.all([import("three"),%s]).then(m=>{%s;window.T3=T3;window.THREE=m[0];dispatchEvent(new Event("three-ready"))})'
            '.catch(e=>dispatchEvent(new CustomEvent("three-fail",{detail:String(e&&e.message||e)})));\n</script>\n') % (core, addons, imps, sets)

def site():
    code = js()
    ver = hashlib.sha1(code.encode()).hexdigest()[:10]
    (ROOT / 'game.js').write_text(code)
    head = '''<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0c1220"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Arena Clash">
<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">
<meta name="description" content="Карточная 3D-стратегия против бота">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.4 system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
'''
    body = head + (SRC / 'ui.html').read_text() + '<script>window.AC_SITE=1</script>\n<script src="game.js?v=%s"></script>\n' % ver
    body += three_loader('./vendor/three/build/three.module.min.js', './vendor/three/addons/') + '</body></html>\n'
    (ROOT / 'index.html').write_text(body)
    print('сайт: index.html + game.js', ver, len(code), 'байт кода')

def payloads():
    out = [(f.stem, f.read_bytes()) for f in sorted((ROOT / 'assets/m').glob('*.glb'))]
    out.append(('sky', (ROOT / 'assets/t/sky.hdr').read_bytes()))
    out += [('s_' + f.stem, f.read_bytes()) for f in sorted((ROOT / 'assets/s').glob('*.mp3'))]
    return ''.join('<script type="text/plain" id="p-%s">%s</script>\n' % (n, base64.b64encode(d).decode()) for n, d in out)

def artifact(out, test=None, three_dir=None):
    pay = payloads(); body = "\n<script>\n" + js() + "</script>\n"; ui = (SRC / 'ui.html').read_text()
    src = ui + pay + body + three_loader('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js', 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/')
    pathlib.Path(out).write_text(src)
    if test:
        t = ui + pay + body + three_loader(three_dir + 'build/three.module.min.js', three_dir + 'examples/jsm/')
        pathlib.Path(test).write_text('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + t + '</body></html>')
    print('артефакт:', out, len(src), 'байт')

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['--artifact']:
        artifact(a[1], *(a[3:5] if a[2:3] == ['--test'] else []))
    else:
        site()
