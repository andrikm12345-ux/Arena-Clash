/* ================= ПЕРСОНАЖИ (свои, без чужих рисунков). Начало координат у ног ================= */
const oc=(g,x,y,r,f,s,lw)=>{g.beginPath();g.arc(x,y,r,0,7);if(f){g.fillStyle=f;g.fill()}if(s){g.strokeStyle=s;g.lineWidth=lw||1;g.stroke()}};
const rr=(g,x,y,w,h,r,f)=>{g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=f;g.fill()};
const poly=(g,pts,f,s)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();if(f){g.fillStyle=f;g.fill()}if(s){g.strokeStyle=s;g.lineWidth=1;g.stroke()}};
const feet=(g,ph,c)=>{const a=Math.sin(ph)*1.6;g.fillStyle=c;g.beginPath();g.ellipse(-3,-1+a*.5,2.6,1.7,0,0,7);g.ellipse(3,-1-a*.5,2.6,1.7,0,0,7);g.fill()};
const CH={
 guard(g,T,ph,at){feet(g,ph,'#323a4b');
  poly(g,[[-11,-15],[-4,-15],[-4,-6],[-7.5,-1.5],[-11,-6]],T.m,'#eef2fa');
  rr(g,-5.5,-16,11,12,3,'#c3cde0');rr(g,-3,-15,6,10,2,T.m);
  oc(g,0,-19.5,5.4,'#d9e0ee','#8794ad');g.fillStyle='#202636';g.fillRect(-3.4,-20.4,6.8,1.9);
  g.beginPath();g.moveTo(-1,-24.5);g.quadraticCurveTo(5,-32,9,-23+Math.sin(ph*2));g.quadraticCurveTo(4,-25,1,-23);g.fillStyle=T.m;g.fill();
  g.save();g.translate(7,-11);g.rotate(-.8+at*2.4);g.fillStyle='#eef2fa';g.fillRect(-1,-15,2,15);g.fillStyle='#b8862b';g.fillRect(-3.5,-1,7,2);g.restore()},
 shooters(g,T,ph,at){feet(g,ph,'#4a3524');
  poly(g,[[-6,-3],[6,-3],[4,-15],[-4,-15]],T.m);rr(g,-1.5,-13,3,9,1,T.d);
  oc(g,0,-18,5,'#f0c9a0');g.beginPath();g.arc(0,-18.8,5.7,Math.PI,0);g.lineTo(5.7,-15);g.lineTo(-5.7,-15);g.closePath();g.fillStyle=T.d;g.fill();
  oc(g,-1.8,-17.6,.9,'#222');oc(g,1.8,-17.6,.9,'#222');
  g.strokeStyle='#7a4e22';g.lineWidth=1.6;g.beginPath();g.arc(8,-11,8,-1.2,1.2);g.stroke();
  g.strokeStyle='#ffffffcc';g.lineWidth=.6;g.beginPath();g.moveTo(8+Math.cos(-1.2)*8,-11+Math.sin(-1.2)*8);g.lineTo(8-at*5,-11);g.lineTo(8+Math.cos(1.2)*8,-11+Math.sin(1.2)*8);g.stroke();
  rr(g,-8,-13,3,9,1,'#6a4a28')},
 giant(g,T,ph,at){feet(g,ph,'#4b3a2a');
  rr(g,-9,-18,18,16,5,'#c98e5d');rr(g,-9,-8,18,4,1,T.m);rr(g,-2,-9,4,5,1,T.l);
  oc(g,0,-23,6,'#d9a173');oc(g,-2.2,-24,.9,'#222');oc(g,2.2,-24,.9,'#222');
  g.beginPath();g.arc(0,-20.5,5,.15,Math.PI-.15);g.fillStyle='#7a4a24';g.fill();
  const l=Math.sin(ph)*1.2;oc(g,-12,-9+l,5,'#d9a173','#9a6a3f');oc(g,12+at*4,-9-l-at*3,5.6,'#d9a173','#9a6a3f');
  g.fillStyle=T.d;g.fillRect(-9,-17,18,2.5)},
 imps(g,T,ph,at){feet(g,ph,'#31451f');
  rr(g,-4.5,-11,9,8,3,T.m);
  poly(g,[[-4,-17],[-11,-20],[-4,-14]],'#7ccd50');poly(g,[[4,-17],[11,-20],[4,-14]],'#7ccd50');
  oc(g,0,-16,5,'#7ccd50','#4d8f2f');oc(g,-1.9,-16.5,1.2,'#fff');oc(g,1.9,-16.5,1.2,'#fff');oc(g,-1.9,-16.5,.5,'#111');oc(g,1.9,-16.5,.5,'#111');
  g.fillStyle='#4d8f2f';g.fillRect(-2,-13.3,4,1);
  g.save();g.translate(5.5,-8);g.rotate(-.5+at*2);g.fillStyle='#dfe6ee';g.fillRect(-.8,-8,1.6,8);g.restore()},
 bones(g,T,ph,at){feet(g,ph,'#d8d3c4');
  g.strokeStyle='#efe9d6';g.lineWidth=1.3;for(let i=0;i<3;i++){g.beginPath();g.moveTo(-3.5,-10+i*2.6);g.lineTo(3.5,-10+i*2.6);g.stroke()}g.beginPath();g.moveTo(0,-12);g.lineTo(0,-4);g.stroke();
  oc(g,0,-15.5,4.8,'#f4efdf','#b9b29c');g.fillStyle='#222';g.beginPath();g.arc(-1.9,-16,1.3,0,7);g.arc(1.9,-16,1.3,0,7);g.fill();g.fillRect(-1.3,-12.5,2.6,1);
  rr(g,-8,-11,2.4,3,1,T.m);g.save();g.translate(6,-9);g.rotate(-.4+at*2);g.fillStyle='#efe9d6';g.fillRect(-.7,-7,1.4,7);g.restore()},
 slingers(g,T,ph,at){feet(g,ph,'#3d2b1a');
  poly(g,[[-5,-2],[5,-2],[3.5,-12],[-3.5,-12]],T.m);
  oc(g,0,-15,4.4,'#e9b98a');g.beginPath();g.arc(0,-15.6,4.8,Math.PI*1.05,-.05);g.fillStyle='#6b8f3a';g.fill();
  oc(g,-1.6,-14.8,.8,'#222');oc(g,1.6,-14.8,.8,'#222');
  const a=ph*3+at*8,sx=5+Math.cos(a)*6,sy=-14+Math.sin(a)*4;g.strokeStyle='#7a5a32';g.lineWidth=1;g.beginPath();g.moveTo(5,-10);g.lineTo(sx,sy);g.stroke();oc(g,sx,sy,1.6,'#8d8f96')},
 bomber(g,T,ph,at){feet(g,ph,'#3a2c20');
  rr(g,-5.5,-12,11,10,4,T.m);rr(g,-5.5,-8,11,2,0,T.d);
  oc(g,0,-16,5.2,'#e2b48a');rr(g,-5.6,-19,11.2,3.6,2,'#4a4f5c');oc(g,-2.6,-17.4,2,'#8fd0ff');oc(g,2.6,-17.4,2,'#8fd0ff');
  g.beginPath();g.arc(0,-19.4,5.8,Math.PI,0);g.fillStyle='#7b4a23';g.fill();
  const b=-5-at*8;oc(g,8,-11+b*.3,4.4,'#23262e','#555b6a');g.strokeStyle='#caa24a';g.lineWidth=1;g.beginPath();g.moveTo(8,-15.4+b*.3);g.quadraticCurveTo(10,-19,12,-18);g.stroke();oc(g,12,-18,1.3,Math.sin(ph*9)>0?'#ffe27a':'#ff8a2a')},
 bats(g,T,ph){const w=Math.sin(ph*4)*4;
  poly(g,[[-2,-10],[-11,-14-w],[-8,-8],[-12,-6+w*.3],[-3,-6]],'#4a3a66');poly(g,[[2,-10],[11,-14-w],[8,-8],[12,-6+w*.3],[3,-6]],'#4a3a66');
  g.beginPath();g.ellipse(0,-9,4,4.6,0,0,7);g.fillStyle='#5d4a80';g.fill();poly(g,[[-3,-12],[-2,-16],[-1,-12.5]],'#5d4a80');poly(g,[[3,-12],[2,-16],[1,-12.5]],'#5d4a80');
  oc(g,-1.5,-9.5,1,'#ffde59');oc(g,1.5,-9.5,1,'#ffde59');rr(g,-3,-6.4,6,1.6,1,T.m)},
 militia(g,T,ph,at){feet(g,ph,'#3a2a1c');
  rr(g,-6,-15,12,12,4,'#8a5a32');rr(g,-6,-9,12,3,1,T.m);
  oc(g,0,-19,5,'#e8b48a');g.beginPath();g.arc(0,-17,4.6,.2,Math.PI-.2);g.fillStyle='#b5651d';g.fill();
  g.beginPath();g.arc(0,-20.2,5.4,Math.PI,0);g.fillStyle='#9aa3b5';g.fill();g.fillRect(-.8,-20,1.6,4);
  oc(g,-8,-10,5.2,T.m,'#5a3a1a',1.5);oc(g,-8,-10,1.6,'#d8c070');
  g.save();g.translate(7,-10);g.rotate(-.7+at*2.2);g.fillStyle='#dfe6ee';g.fillRect(-1,-12,2,12);g.fillStyle='#6a4a28';g.fillRect(-2.5,-1,5,2);g.restore()},
 wisp(g,T,ph){const f=Math.sin(ph*5)*1.5;
  g.beginPath();g.moveTo(0,-22-f);g.bezierCurveTo(6,-16,8,-8,4,-3);g.bezierCurveTo(2,-1,-2,-1,-4,-3);g.bezierCurveTo(-8,-8,-6,-16,0,-22-f);g.fillStyle='#ff8a2a';g.fill();
  g.beginPath();g.moveTo(0,-17);g.bezierCurveTo(3,-13,4,-8,2,-5);g.lineTo(-2,-5);g.bezierCurveTo(-4,-8,-3,-13,0,-17);g.fillStyle='#ffe27a';g.fill();
  oc(g,-1.6,-10,1,'#3a1a00');oc(g,1.6,-10,1,'#3a1a00');oc(g,0,-3.5,2,T.m)},
 crossbow(g,T,ph,at){feet(g,ph,'#3d2a1a');
  poly(g,[[-6,-2],[6,-2],[4,-14],[-4,-14]],T.m);rr(g,-4,-9,8,2,1,T.d);
  oc(g,0,-17.5,4.8,'#f0c9a0');g.beginPath();g.arc(0,-18.4,5.2,Math.PI,0);g.fillStyle='#5a3220';g.fill();oc(g,0,-23.5,2.6,'#5a3220');
  oc(g,-1.7,-17.2,.8,'#222');oc(g,1.7,-17.2,.8,'#222');
  g.save();g.translate(6,-11);g.rotate(-.15);rr(g,-2,-1.2,12,2.4,1,'#6a4a28');g.strokeStyle='#3a3f4c';g.lineWidth=1.5;g.beginPath();g.moveTo(9,-5);g.quadraticCurveTo(7,0,9,5);g.stroke();g.strokeStyle='#ffffffaa';g.lineWidth=.6;g.beginPath();g.moveTo(9,-5);g.lineTo(5-at*3,0);g.lineTo(9,5);g.stroke();g.restore()},
 axe(g,T,ph,at){feet(g,ph,'#4a3a2a');
  poly(g,[[-8,-2],[8,-2],[5,-9],[-5,-9]],T.d);rr(g,-5,-16,10,9,3,'#d7dde8');rr(g,-3,-15,6,6,2,T.m);
  oc(g,0,-20,5,'#f2cfa8');g.beginPath();g.arc(0,-21,5.6,Math.PI,0);g.fillStyle='#e8c14a';g.fill();
  g.fillStyle='#e8c14a';g.fillRect(-5.6,-21,2.2,9);g.fillRect(3.4,-21,2.2,9);
  poly(g,[[-5,-25],[-13,-30],[-6,-22]],'#f4f6fb');poly(g,[[5,-25],[13,-30],[6,-22]],'#f4f6fb');
  const a=at*6.28+ph;[-1,1].forEach(s=>{g.save();g.translate(s*10,-10);g.rotate(s*(.5+Math.sin(a)*.6));g.fillStyle='#8a5a2a';g.fillRect(-.8,-8,1.6,9);poly(g,[[0,-9],[5,-6],[0,-3]],'#e9eef7');g.restore()})},
 hammer(g,T,ph,at){feet(g,ph,'#22252f');
  rr(g,-7,-17,14,14,4,'#3d4252');rr(g,-7,-17,14,3,2,'#555c6e');rr(g,-3,-14,6,9,2,T.m);
  rr(g,-6,-26,12,10,4,'#4a5062');rr(g,-4.5,-22.5,9,2.2,1,T.l);
  g.save();g.translate(7,-10);g.rotate(-1.1+at*2.4);g.fillStyle='#6a4a28';g.fillRect(-1,-16,2,16);rr(g,-5,-21,10,6,1.5,'#7c8496');g.restore();
  oc(g,-8,-10,3,'#3d4252')},
 ram(g,T,ph,at){
  rr(g,-11,-14,18,10,2,'#8a5a2a');rr(g,-11,-14,18,2.5,1,'#b07a3c');g.fillStyle='rgba(60,35,15,.6)';g.fillRect(-11,-9.5,18,1);
  const wr=ph*2;[-7,4].forEach(x=>{oc(g,x,-3,4,'#4a3018','#2a1a0c');g.strokeStyle='#2a1a0c';g.lineWidth=1;g.beginPath();g.moveTo(x+Math.cos(wr)*3.5,-3+Math.sin(wr)*3.5);g.lineTo(x-Math.cos(wr)*3.5,-3-Math.sin(wr)*3.5);g.stroke()});
  const push=at>0?Math.sin(at*Math.PI)*4:0;rr(g,2+push,-12,14,5,2.5,'#7a4e22');rr(g,13+push,-13,4,7,1.5,'#59607a');
  oc(g,-9,-18,4,'#7ccd50');rr(g,-13,-23,8,4,2,T.m);oc(g,-7.6,-18.4,.8,'#111')},
 sorcerer(g,T,ph,at){feet(g,ph,'#2f2640');
  poly(g,[[-7,-2],[7,-2],[4,-16],[-4,-16]],T.m);rr(g,-7,-5,14,2.2,1,T.l);
  oc(g,0,-18.4,4.6,'#f0c9a0');g.beginPath();g.moveTo(-3,-15);g.quadraticCurveTo(0,-9,3,-15);g.fillStyle='#f2f2f2';g.fill();
  poly(g,[[-8,-21],[8,-21],[1.5,-34]],T.d);rr(g,-9,-22.5,18,2.5,1,T.d);oc(g,1,-27,1.2,'#ffd54a');
  g.strokeStyle='#7a4e22';g.lineWidth=1.8;g.beginPath();g.moveTo(10,-3);g.lineTo(10,-24);g.stroke();
  oc(g,10,-26,3.2,`rgba(255,150,60,${.6+at*.4})`);oc(g,10,-26,1.6,'#fff')},
 drake(g,T,ph,at){const w=Math.sin(ph*2.2)*7;
  poly(g,[[-3,-12],[-17,-20-w],[-12,-8]],T.l,T.d);poly(g,[[3,-12],[17,-20-w],[12,-8]],T.l,T.d);
  g.beginPath();g.moveTo(-3,-5);g.quadraticCurveTo(-9,2,-16,-3);g.lineWidth=2.4;g.strokeStyle=T.d;g.stroke();
  g.beginPath();g.ellipse(0,-9,7,8.5,0,0,7);g.fillStyle=T.m;g.fill();g.beginPath();g.ellipse(0,-6,4.2,5,0,0,7);g.fillStyle='#ffe2a0';g.fill();
  oc(g,0,-19,5.4,T.m);poly(g,[[-3,-23],[-5,-30],[-.5,-24]],'#ffe2a0');poly(g,[[3,-23],[5,-30],[.5,-24]],'#ffe2a0');
  oc(g,-2.2,-19.5,1.2,'#fff');oc(g,2.2,-19.5,1.2,'#fff');oc(g,-2.2,-19.5,.5,'#111');oc(g,2.2,-19.5,.5,'#111');
  if(at>0)oc(g,0,-14,3+at*4,`rgba(255,170,40,${.9-at*.3})`)},
 knightrider(g,T,ph,at){const l=Math.sin(ph*1.6)*3;
  g.strokeStyle='#5a3a1a';g.lineWidth=2.2;[[-7,l],[-3,-l],[5,l],[9,-l]].forEach(([x,o])=>{g.beginPath();g.moveTo(x,-8);g.lineTo(x+o*.6,0);g.stroke()});
  g.beginPath();g.ellipse(1,-11,11,5.5,0,0,7);g.fillStyle='#8a5a32';g.fill();
  g.save();g.translate(11,-15);g.rotate(-.5);rr(g,-2,-3,9,5,2.5,'#8a5a32');g.restore();oc(g,15.5,-19,1,'#111');
  g.strokeStyle='#3a2210';g.lineWidth=2;g.beginPath();g.moveTo(-10,-12);g.quadraticCurveTo(-15,-10,-14,-5);g.stroke();
  rr(g,-6,-14,12,3,1,T.m);
  rr(g,-3.5,-24,7,9,2.5,'#c5cfe0');oc(g,0,-27,4,'#d9e0ee','#8794ad');g.fillStyle='#202636';g.fillRect(-2.4,-27.6,4.8,1.4);
  g.save();g.translate(3,-20);g.rotate(-.25+at*.6);g.fillStyle='#d8c39a';g.fillRect(0,-1,20,2);poly(g,[[20,-2.5],[25,0],[20,2.5]],'#eef2fa');poly(g,[[4,-1],[9,-5],[9,-1]],T.m);g.restore()},
 airship(g,T,ph,at){
  g.beginPath();g.ellipse(0,-22,12,10,0,0,7);g.fillStyle=T.m;g.fill();
  g.strokeStyle=T.d;g.lineWidth=1.4;g.beginPath();g.ellipse(0,-22,5.5,10,0,0,7);g.stroke();g.beginPath();g.moveTo(0,-32);g.lineTo(0,-12);g.stroke();
  oc(g,-4,-26,2.5,'rgba(255,255,255,.35)');
  g.strokeStyle='#5a3a1a';g.lineWidth=.8;g.beginPath();g.moveTo(-8,-15);g.lineTo(-5,-8);g.moveTo(8,-15);g.lineTo(5,-8);g.stroke();
  rr(g,-6,-9,12,5,2,'#8a5a2a');oc(g,0,-2+(at>0?at*3:0),2.6,'#23262e','#555b6a')},
 colossus(g,T,ph,at){feet(g,ph,'#4a463e');
  oc(g,-10,-12,7,'#7a756a','#4f4a40');oc(g,10,-12-(at>0?at*3:0),7.5,'#7a756a','#4f4a40');
  oc(g,0,-15,11,'#8d887c','#57524a');oc(g,-3,-18,3,'#a39e90');
  oc(g,0,-28,7,'#8d887c','#57524a');
  g.fillStyle=T.l;g.fillRect(-4,-29.5,3,2);g.fillRect(1,-29.5,3,2);
  g.strokeStyle=T.m;g.lineWidth=1.4;g.beginPath();g.moveTo(-4,-12);g.lineTo(0,-16);g.lineTo(4,-12);g.stroke()},
 pebble(g,T,ph){feet(g,ph,'#4a463e');oc(g,-6,-7,4,'#7a756a','#4f4a40');oc(g,6,-7,4,'#7a756a','#4f4a40');oc(g,0,-9,6.5,'#8d887c','#57524a');oc(g,0,-17,4.4,'#8d887c','#57524a');g.fillStyle=T.l;g.fillRect(-2.6,-18,2,1.6);g.fillRect(.6,-18,2,1.6)},
 frostsage(g,T,ph,at){feet(g,ph,'#2a3a50');
  poly(g,[[-7,-2],[7,-2],[4,-16],[-4,-16]],'#9fd3f0');rr(g,-7,-6,14,2.2,1,T.m);
  oc(g,0,-18.5,4.6,'#f0d2b0');g.beginPath();g.moveTo(-3.6,-16);g.quadraticCurveTo(0,-7,3.6,-16);g.fillStyle='#f4f8ff';g.fill();
  g.beginPath();g.arc(0,-19.6,5.2,Math.PI,0);g.fillStyle='#cfe9ff';g.fill();
  g.strokeStyle='#c8e6ff';g.lineWidth=1.8;g.beginPath();g.moveTo(10,-2);g.lineTo(10,-22);g.stroke();
  poly(g,[[10,-30],[13,-25],[10,-20],[7,-25]],`rgba(170,230,255,${.7+at*.3})`,'#e8f8ff')},
 thunder(g,T,ph,at){feet(g,ph,'#2a2440');
  poly(g,[[-7,-2],[7,-2],[4,-15],[-4,-15]],T.d);rr(g,-3,-14,6,10,2,T.m);
  oc(g,0,-18.5,4.6,'#f0c9a0');
  poly(g,[[-5,-21],[-7,-27],[-2,-23],[0,-29],[2,-23],[7,-27],[5,-21]],'#e8f1ff');
  oc(g,-1.6,-18.4,.8,'#39f');oc(g,1.6,-18.4,.8,'#39f');
  const s=.6+at*.4+Math.sin(ph*9)*.15;for(const x of[-9,9]){oc(g,x,-11,3.4,`rgba(120,200,255,${s*.6})`);oc(g,x,-11,1.6,'#fff')}},
 mole(g,T,ph,at){feet(g,ph,'#3a2a1c');
  g.beginPath();g.ellipse(0,-10,7,8,0,0,7);g.fillStyle='#7a5a3c';g.fill();g.beginPath();g.ellipse(0,-8,4.2,5,0,0,7);g.fillStyle='#b08a64';g.fill();
  oc(g,0,-19,5.4,'#7a5a3c');oc(g,0,-16.4,2,'#f2a6a6');oc(g,-2,-19.5,.9,'#111');oc(g,2,-19.5,.9,'#111');
  g.beginPath();g.arc(0,-21,5.8,Math.PI,0);g.fillStyle=T.m;g.fill();oc(g,0,-25,1.8,'#ffe27a');
  g.save();g.translate(7,-10);g.rotate(-.8+at*2.2);g.fillStyle='#6a4a28';g.fillRect(-.8,-11,1.6,11);g.beginPath();g.moveTo(-5,-11);g.quadraticCurveTo(0,-14,5,-11);g.lineWidth=2;g.strokeStyle='#9aa3b5';g.stroke();g.restore()},
 warlord(g,T,ph,at){feet(g,ph,'#2c2218');
  poly(g,[[-9,-4],[9,-4],[8,-20],[-8,-20]],T.d);
  rr(g,-6.5,-19,13,14,4,'#b9a27a');rr(g,-6.5,-12,13,3,1,'#ffd84d');rr(g,-2.5,-18,5,6,1.5,T.m);
  oc(g,0,-23,5.6,'#e8b48a');g.beginPath();g.arc(0,-20.6,5,.2,Math.PI-.2);g.fillStyle='#5a3220';g.fill();
  g.beginPath();g.arc(0,-24.5,6,Math.PI,0);g.fillStyle='#8d97ab';g.fill();poly(g,[[-6,-25],[-11,-33],[-4,-27]],'#f4efdf');poly(g,[[6,-25],[11,-33],[4,-27]],'#f4efdf');oc(g,0,-27,1.4,'#ffd84d');
  g.save();g.translate(9,-12);g.rotate(-.8+at*2.6);g.fillStyle='#6a4a28';g.fillRect(-1,-16,2,18);poly(g,[[0,-16],[7,-13],[7,-7],[0,-10]],'#e9eef7');poly(g,[[0,-16],[-7,-13],[-7,-7],[0,-10]],'#e9eef7');g.restore()},
 cannon(g,T,ph,at,ang){
  rr(g,-12,-9,24,11,4,'#8a5a2a');rr(g,-12,-9,24,3,2,'#b07a3c');
  oc(g,-9,3,4.6,'#4a3018','#2a1a0c');oc(g,9,3,4.6,'#4a3018','#2a1a0c');
  g.save();g.translate(0,-10);g.rotate(ang??-1.57);g.translate(-at*3,0);rr(g,-3,-5,22,10,4,'#3a3f4c');rr(g,14,-6,6,12,2,'#555c6e');g.restore();
  oc(g,0,-10,6,'#4a5062','#2b2f3a');rr(g,-5,-18,10,5,2,T.m)},
 lair(g,T,ph,at){
  g.beginPath();g.moveTo(-14,0);g.quadraticCurveTo(-14,-22,0,-24);g.quadraticCurveTo(14,-22,14,0);g.closePath();g.fillStyle='#6f6a60';g.fill();
  g.beginPath();g.moveTo(-8,0);g.quadraticCurveTo(-8,-12,0,-13);g.quadraticCurveTo(8,-12,8,0);g.closePath();g.fillStyle='#1a1710';g.fill();
  g.strokeStyle='#efe9d6';g.lineWidth=1.6;g.stroke();
  oc(g,0,-19,3.4,'#f4efdf');g.fillStyle='#222';g.fillRect(-1.6,-19.6,1.2,1.2);g.fillRect(.4,-19.6,1.2,1.2);
  rr(g,10,-30,1.4,16,.5,'#4a3a28');poly(g,[[11.4,-30],[18,-27],[11.4,-24]],T.m);
  if(at>0)oc(g,0,-6,4+at*4,`rgba(180,255,180,${.5*at})`)}
};
const FLYOFF=15;
CH.scorch=CH.sorcerer||CH.frostsage;CH.raider=CH.imps||CH.guard;CH.spring=CH.lair||CH.cannon;CH.shieldman=CH.guard;CH.mortar=CH.cannon;CH.torchman=CH.militia||CH.guard;CH.lantern=CH.cannon;
function drawChar(g,key,tm,x,y,o){const T=TEAM[tm],c=CARDS[key],s=o.s||1,dir=o.dir||1,ph=o.ph||0,at=o.at||0;
 g.save();g.translate(x,y);
 if(!o.noShadow){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(0,c.fly?8:2,c.r*s*1.05,c.r*s*.46,0,0,7);g.fill()}
 g.scale(s*dir,s);const bob=c.type==='building'?0:Math.abs(Math.sin(ph))*1.4;
 g.translate(at>0&&c.type!=='building'?Math.sin(at*Math.PI)*2.5:0,c.fly?-FLYOFF-Math.sin(ph*1.3)*2.4:-bob);
 const sc=c.r>=15?c.r/11:1;if(sc!==1)g.scale(sc,sc);
 (CH[key]||CH.guard)(g,T,ph,at,o.ang);g.restore()}

/* иконки карт */
const IC={};
function icon(key){if(IC[key])return IC[key];const cv=document.createElement('canvas');cv.width=cv.height=120;const g=cv.getContext('2d');g.scale(2,2);
 if(!CARDS[key]){g.fillStyle='#2b4f9a';g.beginPath();g.arc(30,30,22,0,7);g.fill();g.fillStyle='#fff';g.font='900 22px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(key==='tt_king'?'♔':'⚑',30,31);return cv}
 const c=CARDS[key],rc=RAR[c.rar].c;
 const bgc=g.createRadialGradient(30,24,4,30,30,44);bgc.addColorStop(0,c.rar==='common'?'#4a5d96':c.rar==='rare'?'#7a5a3a':c.rar==='epic'?'#5d3f8a':c.rar==='legendary'?'#2c6e6a':'#7a6420');bgc.addColorStop(1,'#141c38');g.fillStyle=bgc;g.fillRect(0,0,60,60);
 g.fillStyle='rgba(255,255,255,.07)';g.beginPath();g.ellipse(30,50,22,6,0,0,7);g.fill();
 if(key==='fireball'){const gr=g.createRadialGradient(30,32,2,30,32,22);gr.addColorStop(0,'#fff6c2');gr.addColorStop(.35,'#ffc83d');gr.addColorStop(.75,'#ff6a1a');gr.addColorStop(1,'#b3200a');
  g.beginPath();g.moveTo(30,6);g.bezierCurveTo(38,16,50,22,46,34);g.bezierCurveTo(44,46,36,52,30,52);g.bezierCurveTo(22,52,14,46,14,36);g.bezierCurveTo(14,24,24,18,30,6);g.fillStyle=gr;g.fill();oc(g,30,36,7,'#fff8d8')}
 else if(key==='volley'){g.strokeStyle='#ffffff55';g.lineWidth=1.2;g.setLineDash([3,3]);g.beginPath();g.arc(30,32,17,0,7);g.stroke();g.setLineDash([]);
  [[18,12],[30,8],[42,12]].forEach(([x,y],i)=>{g.save();g.translate(x,y+i%2*4);g.rotate(.75);g.fillStyle='#e9eef7';g.fillRect(-1,0,2,24);poly(g,[[-3,24],[3,24],[0,31]],'#e9eef7');g.fillStyle='#ff5c4d';g.fillRect(-3,-1,6,4);g.restore()})}
 else if(key==='spark'){oc(g,30,30,18,'rgba(120,200,255,.25)');poly(g,[[33,6],[20,32],[29,32],[24,54],[42,24],[32,24],[38,6]],'#bfe6ff','#fff')}
 else if(key==='freeze'){oc(g,30,30,19,'rgba(150,220,255,.25)');g.strokeStyle='#e8f8ff';g.lineWidth=3;g.lineCap='round';for(let i=0;i<3;i++){const a=i*Math.PI/3;g.beginPath();g.moveTo(30+Math.cos(a)*17,30+Math.sin(a)*17);g.lineTo(30-Math.cos(a)*17,30-Math.sin(a)*17);g.stroke();for(const s of[1,-1]){const ex=30+Math.cos(a)*11*s,ey=30+Math.sin(a)*11*s;g.beginPath();g.moveTo(ex,ey);g.lineTo(ex+Math.cos(a+.8*s)*5*s,ey+Math.sin(a+.8*s)*5*s);g.stroke()}}}
 else if(key==='cry'){oc(g,30,30,19,'rgba(255,80,120,.22)');g.save();g.translate(30,32);g.rotate(-.5);g.beginPath();g.moveTo(-16,-3);g.lineTo(8,-9);g.quadraticCurveTo(16,-10,17,0);g.quadraticCurveTo(16,10,8,9);g.lineTo(-16,3);g.closePath();g.fillStyle='#e6c27a';g.fill();g.strokeStyle='#8a6420';g.lineWidth=1.5;g.stroke();g.restore();for(let i=0;i<3;i++){g.strokeStyle='#ff8aa6';g.lineWidth=2;g.beginPath();g.arc(30,32,22+i*4,-1.9,-1.1);g.stroke()}}
 else if(key==='poison'){for(let i=0;i<7;i++)oc(g,18+Math.cos(i*.9)*10+i*2,30+Math.sin(i*1.7)*8,8,'rgba(120,220,90,.55)');oc(g,30,30,8,'#e9f5d0');g.fillStyle='#1d2a12';g.beginPath();g.arc(27,29,2,0,7);g.arc(33,29,2,0,7);g.fill();g.fillRect(28,33,4,2)}
 else if(key==='legion'){for(let i=0;i<6;i++)drawChar(g,'bones',0,12+(i%3)*18,32+(i/3|0)*16,{s:1.15,ph:i})}
 else{const n=c.count>=3?3:c.count===2?2:1,sc=c.type==='building'?1.55:c.r>=15?1.05:n>1?1.35:1.6;
  for(let i=0;i<n;i++){const ox=n===1?0:(i-(n-1)/2)*15;drawChar(g,key,0,30+ox,(c.fly?54:48)-(n>1&&i%2?4:0),{s:sc,ph:1+i,ang:-1.1})}}
 g.strokeStyle=rc;g.lineWidth=2;g.strokeRect(1,1,58,58);
 return IC[key]=cv}
