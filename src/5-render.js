/* ================= ОТРИСОВКА ================= */
const C=$('#c'),X=C.getContext('2d');
let K=1,dpr=1,BG=null,sel=null,gx=-1,gy=-1,paused=false,mode='home';
const FONT='Nunito,system-ui,sans-serif';

/* оформление восьми арен: земля, дорожки, площадки, вода, мосты, украшения */
const THEMES=[
 {g0:'#3a8637',g1:'#4c9b44',tile:'rgba(255,255,255,.045)',blade:'rgba(20,70,25,.4)',path:'rgba(160,126,82,.6)',path2:'rgba(214,182,130,.5)',pad:['#d4cab2','#a09883'],grout:'rgba(70,58,40,.3)',bank:'#d6c18f',bank2:'#9c855c',w0:'#226db3',w1:'#4dade8',wave:'255,255,255',dots:['#fff','#ffe36b','#ff9fd2','#b9a4ff'],deco:'bush',wood:['#a8773e','#cf9a5a']},
 {g0:'#857537',g1:'#a08e4c',tile:'rgba(255,255,255,.05)',blade:'rgba(80,60,20,.4)',path:'rgba(118,88,58,.6)',path2:'rgba(190,160,120,.5)',pad:['#d8cfbd','#a49c8a'],grout:'rgba(70,58,40,.3)',bank:'#cbb68a',bank2:'#8c7650',w0:'#2d5f86',w1:'#4f8fb8',wave:'235,245,255',dots:['#efe9d6','#d8d3c4','#c9b99a'],deco:'bones',wood:['#8a6a3e','#ad8a5a']},
 {g0:'#2f6e3a',g1:'#3f8446',tile:'rgba(0,0,0,.05)',blade:'rgba(10,50,20,.4)',path:'rgba(108,108,118,.65)',path2:'rgba(170,170,180,.55)',pad:['#b9b4aa','#8c877d'],grout:'rgba(40,40,40,.35)',bank:'#b5a98c',bank2:'#7d725a',w0:'#1f5f9a',w1:'#3f93d0',wave:'255,255,255',dots:['#ffb347','#ffe36b'],deco:'barrels',wood:['#8a5a2e','#b07a3c']},
 {g0:'#c9d6e4',g1:'#e3ecf5',tile:'rgba(110,140,185,.07)',blade:'rgba(130,160,195,.45)',path:'rgba(145,165,192,.55)',path2:'rgba(205,220,236,.6)',pad:['#e3e8ef','#aab4c3'],grout:'rgba(90,110,140,.3)',bank:'#f4f8fc',bank2:'#a9bed3',w0:'#5fa8d8',w1:'#a9dcf5',wave:'255,255,255',dots:['#ffffff','#d9ecff'],deco:'pines',wood:['#8a6a4e','#a9876a']},
 {g0:'#74402e',g1:'#8f553c',tile:'rgba(255,200,150,.05)',blade:'rgba(60,20,10,.35)',path:'rgba(58,40,35,.55)',path2:'rgba(120,85,70,.5)',pad:['#b39a8c','#7f6a5f'],grout:'rgba(40,20,10,.35)',bank:'#4a3a35',bank2:'#2c201d',w0:'#c23e14',w1:'#ff9a2a',wave:'255,230,120',dots:['#ffb347','#ff6a1a'],deco:'rocks',wood:['#5a4a44','#7a6a62']},
 {g0:'#2c4a2c',g1:'#395c35',tile:'rgba(180,255,150,.04)',blade:'rgba(10,30,10,.45)',path:'rgba(70,60,40,.6)',path2:'rgba(120,105,70,.5)',pad:['#9fa48a','#6d725c'],grout:'rgba(20,30,20,.35)',bank:'#5d6b3f',bank2:'#36402a',w0:'#3c5a2a',w1:'#6f9240',wave:'200,255,150',dots:['#c7ff7a','#e0ff9a','#ff6ad5'],deco:'shrooms',wood:['#6a5a3a','#8a7a52']},
 {g0:'#3e4660',g1:'#4e5876',tile:'rgba(160,190,255,.05)',blade:'rgba(20,25,45,.4)',path:'rgba(90,100,130,.6)',path2:'rgba(150,160,195,.45)',pad:['#a8adbd','#737889'],grout:'rgba(20,25,45,.35)',bank:'#8a90a8',bank2:'#555b72',w0:'#3a2f8a',w1:'#6a5ad8',wave:'200,210,255',dots:['#9fd3ff','#c9a8ff'],deco:'runes',wood:['#5a5f72','#7a8096']},
 {g0:'#b39552',g1:'#cdb06c',tile:'rgba(255,255,255,.06)',blade:'rgba(120,90,40,.35)',path:'rgba(150,120,70,.55)',path2:'rgba(230,205,150,.5)',pad:['#e8dcc0','#b5a47f'],grout:'rgba(90,70,40,.3)',bank:'#e8d5a5',bank2:'#a88f5e',w0:'#1e8a8a',w1:'#4fd0c8',wave:'255,255,255',dots:['#fff3c0','#ffd84d'],deco:'pillars',wood:['#9a7a4a','#c09a5e']}];
let TH=THEMES[0];

/* ---------- фон арены: нижний слой (трава, дорожки, площадки), верхний (мосты, рамка), затемнение краёв ---------- */
function buildBG(k){const w=Math.round(W*k),h=Math.round(H*k),mk=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
 const b=mk(),a=mk(),v=mk(),g=b.getContext('2d'),r=mul(7);g.scale(k,k);
 const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,TH.g0);gr.addColorStop(.5,TH.g1);gr.addColorStop(1,TH.g0);g.fillStyle=gr;g.fillRect(0,0,W,H);
 g.fillStyle=TH.tile;for(let ty=0;ty<32;ty++)for(let tx=0;tx<18;tx++)if((tx+ty)&1)g.fillRect(tx*TILE,ty*TILE,TILE,TILE);
 for(let i=0;i<520;i++){const x=r()*W,y=r()*H,s=3+r()*14;g.fillStyle=r()<.5?'rgba(255,255,255,.035)':'rgba(0,30,0,.06)';g.beginPath();g.ellipse(x,y,s,s*.6,r()*3,0,7);g.fill()}
 g.strokeStyle=TH.blade;g.lineWidth=1;for(let i=0;i<520;i++){const x=r()*W,y=r()*H;g.beginPath();g.moveTo(x,y);g.lineTo(x-1.4,y-3.4);g.moveTo(x+1.4,y);g.lineTo(x+2.2,y-2.8);g.stroke()}
 g.lineCap='round';g.lineJoin='round';
 for(const[col,wd]of[[TH.path,24],[TH.path2,11]]){g.strokeStyle=col;g.lineWidth=wd;
  for(const tm of[0,1]){const f=y=>tm?H-y:y;for(const px of BR){g.beginPath();g.moveTo(180,f(580));g.quadraticCurveTo(px,f(580),px,f(515));g.lineTo(px,f(RY+RIV+2));g.stroke()}}}
 for(const tm of[0,1])for(const[x,y0,s]of[[70,515,60],[290,515,60],[180,580,80]])pad(g,x,tm?H-y0:y0,s);
 for(const s of[-1,1]){const y=RY+s*RIV;g.fillStyle=TH.bank;g.fillRect(0,s<0?y-5:y,W,5);g.fillStyle=TH.bank2;g.fillRect(0,s<0?y-6.5:y+4.5,W,1.5)}
 for(let i=0;i<90;i++){const x=r()*W,y=r()*H;if(Math.abs(y-RY)<RIV+8)continue;g.fillStyle=TH.dots[i%TH.dots.length];g.beginPath();g.arc(x,y,1.2,0,7);g.fill()}
 for(let i=0;i<18;i++){const L=r()<.5,x=L?7+r()*12:W-7-r()*12,y=12+r()*(H-24);if(Math.abs(y-RY)<RIV+10)continue;oc(g,x,y,2.4+r()*2.6,'#8e9097','#5c5f68')}
 for(const[x,y]of[[16,RY-34],[W-16,RY+34],[18,RY+38],[W-18,RY-38],[14,186],[W-14,454],[W-15,190],[15,452]])deco(g,TH.deco,x,y,r);
 const A=a.getContext('2d');A.scale(k,k);
 for(const bx of BR){A.fillStyle='rgba(0,0,0,.28)';A.fillRect(bx-21,RY-RIV+3,45,2*RIV+2);
  const bg=A.createLinearGradient(bx-20,0,bx+20,0);bg.addColorStop(0,TH.wood[0]);bg.addColorStop(.5,TH.wood[1]);bg.addColorStop(1,TH.wood[0]);A.fillStyle=bg;A.fillRect(bx-20,RY-RIV-6,40,2*RIV+12);
  A.strokeStyle='rgba(70,40,15,.55)';A.lineWidth=1;for(let y=RY-RIV-4;y<RY+RIV+6;y+=6){A.beginPath();A.moveTo(bx-20,y);A.lineTo(bx+20,y);A.stroke()}
  for(const sx of[bx-23,bx+20]){rr(A,sx,RY-RIV-8,3.4,2*RIV+16,1.5,'#5a3818');for(let y=RY-RIV-6;y<=RY+RIV+6;y+=13)oc(A,sx+1.7,y,2.8,'#7a5028','#3d250f')}}
 A.lineWidth=6;A.strokeStyle='#26304a';A.strokeRect(0,0,W,H);A.lineWidth=1.5;A.strokeStyle='rgba(255,255,255,.12)';A.strokeRect(3.5,3.5,W-7,H-7);
 const V=v.getContext('2d'),vg=V.createRadialGradient(w/2,h/2,w*.4,w/2,h/2,h*.72);vg.addColorStop(0,'rgba(8,10,30,0)');vg.addColorStop(1,'rgba(8,10,30,.42)');V.fillStyle=vg;V.fillRect(0,0,w,h);
 return{b,a,v}}
function pad(g,x,y,s){g.fillStyle='rgba(0,0,0,.2)';g.fillRect(x-s/2+3,y-s/2+4,s,s);
 const pg=g.createLinearGradient(x-s/2,y-s/2,x+s/2,y+s/2);pg.addColorStop(0,TH.pad[0]);pg.addColorStop(1,TH.pad[1]);g.fillStyle=pg;g.fillRect(x-s/2,y-s/2,s,s);
 g.strokeStyle=TH.grout;g.lineWidth=1;g.beginPath();for(let i=1;i<s/10;i++){g.moveTo(x-s/2+i*10,y-s/2);g.lineTo(x-s/2+i*10,y+s/2);g.moveTo(x-s/2,y-s/2+i*10);g.lineTo(x+s/2,y-s/2+i*10)}g.stroke();
 g.strokeStyle='rgba(255,255,255,.28)';g.strokeRect(x-s/2+.5,y-s/2+.5,s-1,s-1)}
function deco(g,kind,x,y,r){
 g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(x+2,y+5,10,3.6,0,0,7);g.fill();
 switch(kind){
  case 'bones':g.strokeStyle='#efe9d6';g.lineWidth=2.2;g.lineCap='round';g.beginPath();g.moveTo(x-7,y+2);g.lineTo(x+5,y-3);g.moveTo(x-5,y-4);g.lineTo(x+6,y+3);g.stroke();oc(g,x+1,y-6,4.2,'#f4efdf','#b9b29c');g.fillStyle='#222';g.fillRect(x-1,y-7,1.6,1.6);g.fillRect(x+1.6,y-7,1.6,1.6);break;
  case 'barrels':rr(g,x-6,y-9,12,13,3,'#8a5a2e');g.fillStyle='#4a5062';g.fillRect(x-6,y-6,12,1.6);g.fillRect(x-6,y,12,1.6);oc(g,x,y-9,5.6,'#a8773e','#5a3818');break;
  case 'pines':poly(g,[[x,y-20],[x-8,y-4],[x+8,y-4]],'#2f6b4a');poly(g,[[x,y-26],[x-6,y-12],[x+6,y-12]],'#3d8a5c');poly(g,[[x,y-26],[x-3,y-19],[x+3,y-19]],'#ffffff');rr(g,x-1.5,y-4,3,5,1,'#6a4a2e');break;
  case 'rocks':oc(g,x-3,y-3,6,'#4a3a35','#2a201d');oc(g,x+4,y-1,4,'#5a4a44','#2a201d');oc(g,x-2,y-4,1.3,'#ff9a2a');break;
  case 'shrooms':rr(g,x-1.3,y-6,2.6,7,1,'#efe2c8');g.beginPath();g.ellipse(x,y-6,6,3.6,0,Math.PI,0);g.fillStyle='#c84bd6';g.fill();oc(g,x-2,y-7.4,1,'#fff');oc(g,x+2.4,y-7,.9,'#fff');rr(g,x+5,y-3,1.8,4,1,'#efe2c8');g.beginPath();g.ellipse(x+5.9,y-3,3,2,0,Math.PI,0);g.fillStyle='#ff6ad5';g.fill();break;
  case 'runes':rr(g,x-5,y-14,10,16,3,'#5a5f72');g.strokeStyle='#8fd0ff';g.lineWidth=1.4;g.beginPath();g.moveTo(x-2,y-10);g.lineTo(x+2,y-6);g.lineTo(x-2,y-2);g.stroke();oc(g,x,y-6,7,'rgba(140,200,255,.12)');break;
  case 'pillars':rr(g,x-4,y-18,8,20,1.5,'#e3d4b0');g.fillStyle='rgba(0,0,0,.12)';g.fillRect(x-1,y-18,1.5,20);rr(g,x-6,y-20,12,3,1,'#cbb98f');rr(g,x-6,y,12,3,1,'#cbb98f');break;
  default:bush(g,x,y)}}
function bush(g,x,y){g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(x+2,y+5,11,4,0,0,7);g.fill();[['#2f7a35',0,0,8],['#3b9141',-5,2,6],['#43a34a',5,1,6],['#59bb5c',-1,-4,4.5]].forEach(([c,dx,dy,rad])=>oc(g,x+dx,y+dy,rad,c))}
function drawRiver(g,now){const y0=RY-RIV,h=2*RIV,rg=g.createLinearGradient(0,y0,0,y0+h);rg.addColorStop(0,TH.w0);rg.addColorStop(.5,TH.w1);rg.addColorStop(1,TH.w0);g.fillStyle=rg;g.fillRect(0,y0,W,h);
 g.lineWidth=1.3;for(let i=0;i<6;i++){g.strokeStyle=`rgba(${TH.wave},${.13+(i%2)*.1})`;g.beginPath();for(let x=0;x<=W;x+=6){const y=y0+5+i*6+Math.sin(x/17+now/650+i*1.7)*1.8;x?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}}

/* ---------- башни ---------- */
function drawTower(g,t,now){const T=TEAM[t.tm],x=t.x,y=t.y,r=t.r,k=t.kind==='k';
 if(t.hp<=0){g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x,y+3,r+4,r*.7,0,0,7);g.fill();
  const rg=mul(t.id*13);for(let i=0;i<10;i++)oc(g,x+(rg()-.5)*r*1.6,y+(rg()-.5)*r*1.1,3+rg()*5,['#6f6a60','#8d8577','#4c4841'][i%3]);
  g.fillStyle='#2f2b26';g.beginPath();g.ellipse(x,y,r*.55,r*.35,0,0,7);g.fill();return}
 g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x+5,y+r*.6,r+4,r*.6,0,0,7);g.fill();
 const body=g.createLinearGradient(x-r,0,x+r,0);body.addColorStop(0,'#928c7c');body.addColorStop(.45,'#dad4c2');body.addColorStop(1,'#857f70');
 if(k){rr(g,x-r,y-r*.8,r*2,r*1.55,7,body);
  for(const[dx,dy]of[[-1,-1],[1,-1],[-1,1],[1,1]]){oc(g,x+dx*r,y+dy*r*.7,7,'#bdb7a5','#6f6a5c',1.2);rr(g,x+dx*r-4,y+dy*r*.7-11,8,5,1,'#8c8676')}
  rr(g,x-r+4,y-r*.8-2,r*2-8,6,2,T.d);for(let i=0;i<5;i++)rr(g,x-r+5+i*10.5,y-r*.8-6,6,5,1,'#cfc9b7');
  rr(g,x-9,y-2,18,16,5,'#2a2e3c');rr(g,x-7,y,14,12,4,'#161925');
  const by=y-r*.55;g.fillStyle=T.m;g.beginPath();g.moveTo(x-12,by);g.lineTo(x+12,by);g.lineTo(x+12,by+16);g.lineTo(x,by+22);g.lineTo(x-12,by+16);g.closePath();g.fill();
  g.fillStyle='#ffc83d';g.beginPath();g.moveTo(x-6,by+14);g.lineTo(x-7,by+5);g.lineTo(x-3,by+9);g.lineTo(x,by+3);g.lineTo(x+3,by+9);g.lineTo(x+7,by+5);g.lineTo(x+6,by+14);g.closePath();g.fill();
  if(t.act){const rec=t.cd>t.hit-.15?3:0;g.save();g.translate(x,y-r*.8-4);g.rotate(t.ang);g.translate(-rec,0);rr(g,0,-4,20,8,3,'#3a3f4c');rr(g,16,-5,6,10,2,'#59607a');g.restore();oc(g,x,y-r*.8-4,6,'#4a5062','#2b2f3a')}
  else{g.fillStyle='#fff';g.font=`800 11px ${FONT}`;g.textAlign='center';g.fillText('z',x+14,y-r+4-Math.sin(now/500)*2);g.font=`800 8px ${FONT}`;g.fillText('z',x+20,y-r-3-Math.sin(now/500+1)*2)}}
 else{const bw=r*1.8,top=y-r*.95;
  rr(g,x-bw/2,top,bw,r*1.8,6,body);g.fillStyle='rgba(0,0,0,.1)';for(let i=1;i<4;i++)g.fillRect(x-bw/2,top+i*9,bw,1.2);
  g.fillStyle='#2a2e3c';g.beginPath();g.roundRect(x-6,y+3,12,12,[6,6,0,0]);g.fill();
  g.fillStyle=T.m;g.beginPath();g.moveTo(x-7,top+5);g.lineTo(x+7,top+5);g.lineTo(x+7,top+18);g.lineTo(x,top+23);g.lineTo(x-7,top+18);g.closePath();g.fill();oc(g,x,top+12,2.8,'#ffc83d');
  rr(g,x-r,top-6,2*r,8,3,'#bdb7a5');for(let i=0;i<5;i++)rr(g,x-r+1+i*(2*r-8)/4,top-12,6,7,1.5,'#cfc9b7');
  archer(g,x,top-3,T,t.ang,t.cd>t.hit-.2)}
 if(t.hp<t.mx*.6){g.strokeStyle='rgba(30,25,20,.6)';g.lineWidth=1.2;g.beginPath();g.moveTo(x-r*.4,y-r*.3);g.lineTo(x-r*.2,y+3);g.lineTo(x-r*.45,y+9);g.stroke()}
 if(t.hp<t.mx*.3){g.beginPath();g.moveTo(x+r*.35,y-r*.35);g.lineTo(x+r*.15,y+2);g.lineTo(x+r*.4,y+8);g.stroke()}
 if(t.fl>0){g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.ellipse(x,y-r*.2,r*1.05,r*.95,0,0,7);g.fill()}
 if(t.frozenT>0)iceBox(g,x-r,y-r*1.25,2*r,r*2.1);
 if(t.stunT>0)stars(g,x,y-r*1.4,now)}
function archer(g,x,y,T,ang,shoot){const dir=Math.cos(ang)<0?-1:1;g.save();g.translate(x,y);g.scale(dir,1);
 rr(g,-4,-10,8,9,3,T.d);oc(g,0,-13,3.6,'#f0c9a0');g.beginPath();g.arc(0,-13.6,4.2,Math.PI*.85,Math.PI*2.15);g.fillStyle=T.m;g.fill();
 g.strokeStyle='#7a4e22';g.lineWidth=1.3;g.beginPath();g.arc(4,-8,6,-1.2,1.2);g.stroke();g.strokeStyle='#ffffffaa';g.lineWidth=.6;g.beginPath();g.moveTo(4+Math.cos(-1.2)*6,-8+Math.sin(-1.2)*6);g.lineTo(shoot?6:2,-8);g.lineTo(4+Math.cos(1.2)*6,-8+Math.sin(1.2)*6);g.stroke();g.restore()}
function iceBox(g,x,y,w,h){g.fillStyle='rgba(175,228,255,.42)';g.strokeStyle='rgba(235,250,255,.9)';g.lineWidth=1.2;g.beginPath();g.roundRect(x,y,w,h,4);g.fill();g.stroke();
 g.strokeStyle='rgba(255,255,255,.7)';g.beginPath();g.moveTo(x+3,y+5);g.lineTo(x+w*.35,y+3);g.moveTo(x+4,y+9);g.lineTo(x+w*.2,y+7);g.stroke()}
function stars(g,x,y,now){for(let i=0;i<3;i++){const a=now/180+i*2.1;star(g,x+Math.cos(a)*8,y+Math.sin(a)*3,2.6)}}
function star(g,x,y,s){g.fillStyle='#ffe066';g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr2=i%2?s*.45:s;g.lineTo(x+Math.cos(a)*rr2,y+Math.sin(a)*rr2)}g.closePath();g.fill()}
function towerBar(g,t){const k=t.kind==='k',by=t.tm?t.y+t.r+12:t.y-t.r-(k?20:30),bw=k?52:44;
 if(t.hp<t.mx*.3){g.strokeStyle=`rgba(255,90,80,${.45+.45*Math.sin(performance.now()/140)})`;g.lineWidth=2;g.beginPath();g.roundRect(t.x-bw/2-3,by-6.5,bw+6,13,6.5);g.stroke()}
 rr(g,t.x-bw/2-1.5,by-5,bw+3,10,5,'rgba(5,8,20,.8)');rr(g,t.x-bw/2,by-3.5,Math.max(0,bw*t.hp/t.mx),7,3.5,t.tm?'#ff6a5a':'#4cc3ff');
 g.fillStyle='#fff';g.font=`800 8.5px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(Math.ceil(t.hp),t.x,by+.5);
 const lx=t.x-bw/2-8;rr(g,lx-6,by-6,12,12,3,t.tm?'#9e2a20':'#1b5ca3');g.fillStyle='#fff';g.font=`800 8px ${FONT}`;g.fillText(G?G.side[t.tm].kl:1,lx,by+.5)}

/* ---------- бойцы, строения, снаряды ---------- */
const US=1.15,topOf=u=>((u.c.fly?FLYOFF:0)+24*(u.c.r>=15?u.c.r/11:1))*US;
function hpBar(g,x,y,w,p,tm,gold){rr(g,x-w/2-1,y-3,w+2,6,3,gold?'#ffd84d':'rgba(5,8,20,.8)');rr(g,x-w/2,y-2,Math.max(0,w*p),4,2,tm?'#ff6a5a':'#4cd37a')}
function drawUnit(g,u,now){if(G.vis&&u.tm===1&&!G.vis[0].has(u)){g.save();g.filter='brightness(0.12)';g.globalAlpha=.8;drawUnit0(g,u,now);g.restore();return}drawUnit0(g,u,now)}
function drawUnit0(g,u,now){const c=u.c,sp=u.spawnT>0?u.spawnT/.3:0,s=US*(1-sp*.4),fy=u.y+(u.fly?8:2);
 if(u.rageT>0){const p=.5+.5*Math.sin(now/110+u.id);g.fillStyle=`rgba(255,70,120,${.2+p*.14})`;g.beginPath();g.ellipse(u.x,fy,u.r+5,(u.r+5)*.5,0,0,7);g.fill()}
 if(u.slowT>0){g.strokeStyle='rgba(150,215,255,.85)';g.lineWidth=1.5;g.beginPath();g.ellipse(u.x,fy,u.r+3,(u.r+3)*.45,0,0,7);g.stroke()}
 if(u.charging){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.4;for(let i=0;i<3;i++){const yy=u.y-6-i*6,x0=u.x-u.face*(u.r+4+i*2);g.beginPath();g.moveTo(x0,yy);g.lineTo(x0-u.face*(8+((now/40+i*7)%6)),yy);g.stroke()}}
 g.globalAlpha=1-sp*.7;
 if(u.evo||u.hero){g.strokeStyle=u.evo?'rgba(199,125,255,.9)':'rgba(255,216,77,.95)';g.lineWidth=2.4;g.beginPath();g.ellipse(u.x,fy,u.r+5,(u.r+5)*.45,0,0,7);g.stroke()}
 const jh=jumpH(u),still=u.frozenT>0||u.stunT>0,drop=(REDUCE||c.fly?0:sp*sp*18)+jh;
 if(drop){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(u.x,u.y+2,c.r*s*1.05,c.r*s*.46,0,0,7);g.fill()}
 drawChar(g,u.key,u.tm,u.x,u.y-drop,{s,dir:u.face||1,ph:still?0:u.ph,at:still?0:u.sw>0?1-u.sw/.28:0,noShadow:!!drop});
 g.globalAlpha=1;
 const top=topOf(u);
 if(u.fl>0){g.fillStyle='rgba(255,255,255,.38)';g.beginPath();g.arc(u.x,u.y-top*.55,u.r+3,0,7);g.fill()}
 if(u.frozenT>0)iceBox(g,u.x-u.r-2,u.y-top-2,2*u.r+4,top+4-(u.fly?FLYOFF-6:0));
 if(u.stunT>0)stars(g,u.x,u.y-top-4,now);
 if(u.shield>0){g.strokeStyle=`rgba(255,216,77,${.45+.4*u.shield/u.smx})`;g.lineWidth=2;g.beginPath();g.ellipse(u.x,u.y-top*.5,u.r+7,top*.62,0,0,7);g.stroke()}}
function drawBuilding(g,b,now){const sp=b.spawnT>0?b.spawnT/.3:0;g.globalAlpha=1-sp*.6;drawChar(g,b.key,b.tm,b.x,b.y,{s:1.1*(1-sp*.3),at:b.at,ang:b.ang});g.globalAlpha=1;
 if(b.fl>0){g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(b.x,b.y-10,14,0,7);g.fill()}
 if(b.frozenT>0)iceBox(g,b.x-15,b.y-26,30,30);if(b.stunT>0)stars(g,b.x,b.y-30,now)}
function drawProj(g,p){const a=Math.atan2(p.ly-p.y,p.lx-p.x);
 switch(p.pk){
  case 'arrow':case 'tower':case 'dagger':g.save();g.translate(p.x,p.y);g.rotate(a);g.strokeStyle='#f1f5fb';g.lineWidth=1.6;g.beginPath();g.moveTo(-9,0);g.lineTo(2,0);g.stroke();poly(g,[[2,-2.2],[6,0],[2,2.2]],'#f1f5fb');g.fillStyle=TEAM[p.tm].m;g.fillRect(-10,-1.8,3,3.6);g.restore();break;
  case 'bolt':g.save();g.translate(p.x,p.y);g.rotate(a);g.strokeStyle='#3a2a1a';g.lineWidth=2;g.beginPath();g.moveTo(-10,0);g.lineTo(3,0);g.stroke();poly(g,[[3,-2.6],[8,0],[3,2.6]],'#c9d2e3');g.restore();break;
  case 'stone':oc(g,p.x,p.y,2.4,'#9a9ca3','#5c5f68');break;
  case 'orb':oc(g,p.x,p.y,8,'rgba(255,120,30,.32)');oc(g,p.x,p.y,4.6,'#ff9a2a');oc(g,p.x,p.y,2.2,'#fff2b0');break;
  case 'flame':for(let i=0;i<3;i++)oc(g,p.x-Math.cos(a)*i*4,p.y-Math.sin(a)*i*4,5-i*1.3,['#ffe27a','#ff9a2a','#ff5a1a'][i]);break;
  case 'ice':oc(g,p.x,p.y,7,'rgba(160,220,255,.35)');g.save();g.translate(p.x,p.y);g.rotate(a);poly(g,[[-6,0],[0,-3],[6,0],[0,3]],'#dff4ff','#8fd0ff');g.restore();break;
  case 'ball':case 'king':case 'tball':oc(g,p.x,p.y,p.pk==='king'||p.pk==='tball'?4.4:3.6,'#2c3040','#8b93a8');break;
  case 'bomb':{const f=p.from,tot=Math.hypot(p.lx-f.x,p.ly-f.y)||1,done=clamp(1-Math.hypot(p.lx-p.x,p.ly-p.y)/tot,0,1),h=Math.sin(done*Math.PI)*(p.hi?70:24);
   g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(p.x,p.y+4,4,2,0,0,7);g.fill();oc(g,p.x,p.y-h,4.4,'#23262e','#697088');oc(g,p.x+3,p.y-h-4,1.3,'#ffcf5a');break}}}
function zig(g,x1,y1,x2,y2,n,amp){g.beginPath();g.moveTo(x1,y1);for(let i=1;i<n;i++){const t=i/n;g.lineTo(x1+(x2-x1)*t+rndV(-amp,amp),y1+(y2-y1)*t+rndV(-amp,amp))}g.lineTo(x2,y2);g.stroke()}
function drawFX(g,f){const t=clamp(f.l/f.m,0,1);
 switch(f.k){
  case 'ring':g.strokeStyle=f.c;g.globalAlpha=1-t;g.lineWidth=3*(1-t)+1;g.beginPath();g.ellipse(f.x,f.y,f.r*(.25+.75*t),f.r*(.25+.75*t)*.75,0,0,7);g.stroke();g.globalAlpha=1;break;
  case 'meteor':{const x=f.x+(f.x2-f.x)*t,y=f.y+(f.y2-f.y)*t-Math.sin(t*Math.PI)*40;g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(f.x2,f.y2,18*t,9*t,0,0,7);g.fill();
   for(let i=6;i>0;i--){const tt=Math.max(0,t-i*.03),xx=f.x+(f.x2-f.x)*tt,yy=f.y+(f.y2-f.y)*tt-Math.sin(tt*Math.PI)*40;g.fillStyle=`rgba(255,${120+i*15},40,${.5-i*.07})`;g.beginPath();g.arc(xx,yy,9-i,0,7);g.fill()}
   oc(g,x,y,9,'#ff8a1f');oc(g,x,y,5,'#fff0b0');break}
  case 'rain':if(f.l>=0){const x=f.x+(f.x2-f.x)*t,y=f.y+(f.y2-f.y)*t;g.strokeStyle='#eef2fa';g.lineWidth=1.6;g.beginPath();g.moveTo(x,y);g.lineTo(x-3,y-9);g.stroke()}break;
  case 'zapring':g.strokeStyle=`rgba(190,230,255,${1-t})`;g.lineWidth=2;for(let i=0;i<8;i++){const a1=i/8*6.28,a2=a1+.7,rr2=f.r*(.6+.4*t);zig(g,f.x+Math.cos(a1)*rr2,f.y+Math.sin(a1)*rr2*.75,f.x+Math.cos(a2)*rr2,f.y+Math.sin(a2)*rr2*.75,3,3)}
   g.fillStyle=`rgba(150,210,255,${.25*(1-t)})`;g.beginPath();g.ellipse(f.x,f.y,f.r,f.r*.75,0,0,7);g.fill();break;
  case 'swirl':g.strokeStyle=`rgba(255,255,255,${.75*(1-t)})`;g.lineWidth=3;g.beginPath();g.ellipse(f.x,f.y-6,f.r*.9,f.r*.6,0,t*6,t*6+3.4);g.stroke();break;
  case 'bolt':g.strokeStyle=`rgba(200,235,255,${1-t})`;g.lineWidth=2.4;zig(g,f.x,f.y,f.x2,f.y2,6,5);g.strokeStyle=`rgba(255,255,255,${1-t})`;g.lineWidth=1;zig(g,f.x,f.y,f.x2,f.y2,6,3);break;
  case 'slash':g.save();g.translate(f.x,f.y);g.rotate(f.a);g.scale(f.s,f.s);g.strokeStyle=`rgba(255,255,255,${.9*(1-t)})`;g.lineWidth=2.6*(1-t)+.6;g.beginPath();g.arc(0,0,9,-2.3+t*1.2,-.6+t*1.2);g.stroke();g.restore();break;
  case 'soul':{const y=f.y-t*26,a=(1-t)*.75;g.fillStyle=`rgba(255,255,255,${a*.5})`;g.beginPath();g.arc(f.x,f.y,(6+t*10)*f.s,0,7);g.fill();
   g.globalAlpha=a;g.fillStyle=f.c;g.beginPath();g.moveTo(f.x-5*f.s,y);g.quadraticCurveTo(f.x,y-14*f.s,f.x+5*f.s,y);g.quadraticCurveTo(f.x+2,y+6+Math.sin(t*20)*2,f.x,y+9*f.s);g.quadraticCurveTo(f.x-2,y+6,f.x-5*f.s,y);g.fill();
   g.fillStyle='#1b2644';g.beginPath();g.arc(f.x-1.6*f.s,y-3*f.s,1*f.s,0,7);g.arc(f.x+1.6*f.s,y-3*f.s,1*f.s,0,7);g.fill();g.globalAlpha=1;break}
  case 'crown':{const p1=Math.min(1,f.l/.45),p2=clamp((f.l-.55)/(f.m-.55),0,1),tx=f.tm?24:W-24,ty=8,e=p2*p2*(3-2*p2),
    x=f.x+(tx-f.x)*e,y=f.y-26*p1+(ty-(f.y-26))*e,sc=(p1<1?p1*1.4:1.4-p2*.6)*(f.n>1?1.3:1);
   g.save();g.translate(x,y);g.scale(sc,sc);g.globalAlpha=p2>.92?(1-p2)/.08:1;
   g.fillStyle=f.tm?'#ff7b6b':'#ffc83d';g.strokeStyle=f.tm?'#7a1a10':'#8a5a00';g.lineWidth=1.6;
   g.beginPath();g.moveTo(-11,9);g.lineTo(-12,-5);g.lineTo(-6,0);g.lineTo(0,-10);g.lineTo(6,0);g.lineTo(12,-5);g.lineTo(11,9);g.closePath();g.fill();g.stroke();
   oc(g,0,-10,2,'#fff');g.restore();g.globalAlpha=1;break}}}
function drawZone(g,z,now){const a=Math.min(1,z.t/.4,(z.tot-z.t)/.2+.2);g.globalAlpha=a;
 if(z.k==='freeze'){g.fillStyle='rgba(170,225,255,.26)';g.strokeStyle='rgba(230,248,255,.85)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke();
  const rg=mul(z.x*7+z.y|0);for(let i=0;i<12;i++){const an=rg()*6.28,d=Math.sqrt(rg())*z.r*.9;star(g,z.x+Math.cos(an)*d,z.y+Math.sin(an)*d*.78,1.6+Math.sin(now/300+i)*.6)}}
 else if(z.k==='rage'){const p=.5+.5*Math.sin(now/150);g.fillStyle=`rgba(255,60,120,${.13+p*.07})`;g.strokeStyle=`rgba(255,120,160,${.6+p*.3})`;g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke()}
 else if(z.k==='poison'){g.fillStyle='rgba(110,210,80,.22)';g.strokeStyle='rgba(150,240,110,.7)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke();
  for(let i=0;i<10;i++){const an=i*2.4+now/1600,d=z.r*(.2+((i*37)%70)/100),ph=(now/900+i*.37)%1;oc(g,z.x+Math.cos(an)*d,z.y+Math.sin(an)*d*.78-ph*8,2+ph*2.5,`rgba(170,255,130,${.6*(1-ph)})`)}}
 else if(z.k==='pull'){g.strokeStyle='rgba(180,220,255,.8)';g.lineWidth=2;for(let i=0;i<3;i++){g.beginPath();g.ellipse(z.x,z.y,z.r*(.35+i*.3),z.r*(.35+i*.3)*.78,now/300+i,0,4.5);g.stroke()}}
 else if(z.k==='roll'){g.fillStyle='#8a5a32';g.strokeStyle='#4a2e18';g.lineWidth=2;rr(g,z.x-z.r,z.y-9,z.r*2,18,8,'#8a5a32');g.stroke();g.fillStyle='#e2b77a';for(const s of[-1,1]){g.beginPath();g.ellipse(z.x+s*z.r,z.y,4,9,0,0,7);g.fill()}
  g.strokeStyle='#5c3a1e';for(let i=0;i<4;i++){const yy=z.y-9+((z.ang*6+i*4.5)%18);g.beginPath();g.moveTo(z.x-z.r+4,yy);g.lineTo(z.x+z.r-4,yy);g.stroke()}}
 else if(z.k==='flash'){g.fillStyle='rgba(255,246,190,.25)';g.strokeStyle='rgba(255,236,150,.85)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.light,z.light*.78,0,0,7);g.fill();g.stroke()}
 else if(z.k==='shade'){g.fillStyle='rgba(16,8,34,.55)';g.strokeStyle='rgba(150,110,230,.7)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke()}
 else if(z.k==='grave'){g.fillStyle='rgba(70,40,100,.28)';g.strokeStyle='rgba(180,140,255,.7)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke()}
 else if(z.k==='heal'){g.fillStyle='rgba(120,255,160,.2)';g.strokeStyle='rgba(150,255,180,.8)';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.fill();g.stroke()}
 else if(z.k==='aura'){const p=.5+.5*Math.sin(now/120);g.strokeStyle=`rgba(255,216,77,${.5+p*.4})`;g.lineWidth=2.5;g.setLineDash([6,5]);g.beginPath();g.ellipse(z.x,z.y,z.r,z.r*.78,0,0,7);g.stroke();g.setLineDash([])}
 g.globalAlpha=1}
function drawPending(g,d){const c=CARDS[d.key],tun=d.tun||0,el=d.tot-d.t;
 if(tun&&el<tun){const p=el/tun,x=d.sx+(d.x-d.sx)*p,y=d.sy+(d.y-d.sy)*p;for(let i=0;i<4;i++){const q=Math.max(0,p-i*.04);oc(g,d.sx+(d.x-d.sx)*q,d.sy+(d.y-d.sy)*q,5-i,['#7a5a3c','#6a4a2c','#5a3a1c','#4a2a10'][i])}oc(g,x,y,6.5,'#8a6a4c','#5a3a1c');return}
 const dep=d.tot-tun,left=Math.max(0,d.t),pr=1-left/dep;
 g.globalAlpha=.4;
 if(c.type==='building')drawChar(g,d.key,d.tm,d.x,d.y,{s:1.1,noShadow:1});
 else for(const[px,py]of formation(d.key,d.x,d.y))drawChar(g,c.unit||d.key,d.tm,px,py,{s:US*.95,noShadow:1});
 g.globalAlpha=1;g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=4;g.beginPath();g.arc(d.x,d.y,11,0,7);g.stroke();
 g.strokeStyle=TEAM[d.tm].l;g.lineWidth=3;g.beginPath();g.arc(d.x,d.y,11,-Math.PI/2,-Math.PI/2+pr*Math.PI*2);g.stroke();
 if(dep>=2){g.fillStyle='#fff';g.font=`800 10px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(Math.ceil(left),d.x,d.y+.5)}}
function drawDeployZones(g,key,now){const c=CARDS[key];if(c.type==='spell')return;const p=.5+.5*Math.sin(now/260);
 g.fillStyle=`rgba(255,70,60,${.12+p*.05})`;
 if(c.tunnel){g.fillRect(0,RY-RIV-3,W,2*RIV+6);return}
 g.strokeStyle=`rgba(255,235,150,${.55+p*.3})`;g.setLineDash([7,6]);g.lineWidth=2;
 for(const left of[1,0]){const x0=left?0:W/2,open=pocketOpen(0,left?10:W-10);
  if(open){g.fillRect(x0,0,W/2,POCKET_Y);g.fillRect(x0,RY-RIV-3,W/2,2*RIV+6);g.beginPath();g.moveTo(x0,POCKET_Y);g.lineTo(x0+W/2,POCKET_Y);g.stroke()}
  else{g.fillRect(x0,0,W/2,RY+RIV+3);g.beginPath();g.moveTo(x0,RY+RIV+3);g.lineTo(x0+W/2,RY+RIV+3);g.stroke()}}
 g.setLineDash([])}
function drawGhost(g,now){if(!G||G.over||sel==null||gx<0||mode!=='play')return;const S=G.side[0],key=S.hand[sel];if(!key)return;
 const c=CARDS[key],ok=canPlace(0,key,gx,gy)&&!cardBlocked(0,key)&&S.el>=c.cost,p=.5+.5*Math.sin(now/200);
 if(c.type==='spell'&&c.roll){const r=c.rad*TILE,L=c.roll.len*TILE;g.fillStyle=`rgba(255,240,200,${.14+p*.08})`;g.strokeStyle='#ffe9a8';g.lineWidth=2;g.setLineDash([6,5]);g.beginPath();g.rect(gx-r,gy-L,r*2,L);g.fill();g.stroke();g.setLineDash([]);return}
 if(c.type==='spell'){const r=c.rad*TILE;g.fillStyle=`rgba(255,240,200,${.14+p*.08})`;g.strokeStyle='#ffe9a8';g.lineWidth=2;g.setLineDash([6,5]);g.beginPath();g.arc(gx,gy,r,0,7);g.fill();g.stroke();g.setLineDash([]);return}
 g.globalAlpha=ok?.62:.3;
 if(c.type==='building')drawChar(g,key,0,gx,gy,{s:1.1});
 else for(const[px,py]of formation(key,gx,gy))drawChar(g,c.unit||key,0,px,py,{s:US});
 g.globalAlpha=1;
 if(c.rng>=3){g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1.2;g.setLineDash([5,5]);g.beginPath();g.arc(gx,gy,c.rng*TILE,0,7);g.stroke();g.setLineDash([])}
 g.strokeStyle=ok?'#9cffb8':'#ff8a7d';g.lineWidth=2;g.beginPath();g.ellipse(gx,gy+3,18,9,0,0,7);g.stroke()}
function drawTexts(g){g.textAlign='center';g.textBaseline='middle';
 for(const x of G.TX){const a=1-x.l/x.m;
  if(x.big){const sc=Math.min(1,x.l/.18),al=Math.min(1,(x.m-x.l)/.4);g.save();g.globalAlpha=al;g.translate(x.x,x.y);g.scale(.6+.4*sc,.6+.4*sc);g.font=`400 ${x.s+8}px 'Lilita One','Russo One',${FONT}`;g.lineWidth=6;g.strokeStyle='rgba(10,12,30,.85)';g.strokeText(x.t,0,0);g.fillStyle=x.c;g.fillText(x.t,0,0);g.restore();continue}
  g.globalAlpha=Math.max(0,a);g.font=`800 ${x.s}px ${FONT}`;g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.7)';g.strokeText(x.t,x.x,x.y);g.fillStyle=x.c;g.fillText(x.t,x.x,x.y)}
 g.globalAlpha=1}
function drawEmotes(g){for(const e of G.EM){const a=Math.min(1,e.l/.15,(e.m-e.l)/.3),bx=e.tm?262:98,by=e.tm?34:604;
 g.globalAlpha=Math.max(0,a);g.font=`800 12px ${FONT}`;const w=g.measureText(e.txt).width+20;
 rr(g,bx-w/2,by-13,w,26,13,e.tm?'#ffe9e6':'#e6f3ff');g.fillStyle=e.tm?'#ffe9e6':'#e6f3ff';g.beginPath();g.moveTo(bx-6,by+(e.tm?-12:12));g.lineTo(bx+(e.tm?-14:14),by+(e.tm?-22:22));g.lineTo(bx+6,by+(e.tm?-12:12));g.fill();
 g.fillStyle='#1b2644';g.textAlign='center';g.textBaseline='middle';g.fillText(e.txt,bx,by+.5);g.globalAlpha=1}}

/* ---------- кадр ---------- */
function draw(now){const g=X;g.setTransform(1,0,0,1,0,0);if(!BG||!G)return;
 g.drawImage(BG.b,0,0);
 let sx=0,sy=0;const shk=G.shake*SHAKE_K[SET.shake];if(shk>0&&!REDUCE){sx=rndV(-1,1)*shk*.5;sy=rndV(-1,1)*shk*.5}
 g.setTransform(K,0,0,K,sx*K,sy*K);
 for(const d of G.DEC){g.fillStyle=`rgba(20,12,6,${Math.min(.42,d.l*.15)})`;g.beginPath();g.ellipse(d.x,d.y,d.r,d.r*.7,0,0,7);g.fill()}
 drawRiver(g,now);
 g.setTransform(1,0,0,1,0,0);g.drawImage(BG.a,sx*K,sy*K);g.setTransform(K,0,0,K,sx*K,sy*K);
 if(sel!=null&&mode==='play'&&!G.over){const key=G.side[0].hand[sel];if(key)drawDeployZones(g,key,now)}
 for(const z of G.Z)drawZone(g,z,now);
 for(const d of G.D)drawPending(g,d);
 const L=[];for(const t of G.T)L.push([t.y+(t.kind==='k'?10:4),0,t]);for(const b of G.B)L.push([b.y,1,b]);for(const u of G.U)if(!u.fly)L.push([u.y,2,u]);
 L.sort((a,b)=>a[0]-b[0]);for(const[,k,o]of L)k===0?drawTower(g,o,now):k===1?drawBuilding(g,o,now):drawUnit(g,o,now);
 for(const u of G.U.filter(u=>u.fly).sort((a,b)=>a.y-b.y))drawUnit(g,u,now);
 for(const p of G.PR)drawProj(g,p);
 for(const f of G.FX)drawFX(g,f);
 for(const p of G.PT){const a=1-p.l/p.m;g.globalAlpha=Math.max(0,a);g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.s*(.6+a*.5),0,7);g.fill()}g.globalAlpha=1;
 for(const b of G.B)hpBar(g,b.x,b.y-30,28,b.hp/b.mx,b.tm);
 for(const u of G.U){if(u.spawnT>0||G.vis&&u.tm===1&&!G.vis[0].has(u))continue;const y=u.y-topOf(u)-8,w=Math.max(16,u.r*2.2);if(u.hp<u.mx||u.c.ability)hpBar(g,u.x,y,w,u.hp/u.mx,u.tm,!!u.c.ability);if(u.shield>0)rr(g,u.x-w/2,y-6,w*u.shield/u.smx,3,1.5,'#ffd84d')}
 for(const t of G.T)if(t.hp>0)towerBar(g,t);
 for(const f of G.CF){g.save();g.translate(f.x,f.y);g.rotate(f.r);g.globalAlpha=Math.min(1,(f.m-f.l)/.5);g.fillStyle=f.c;g.fillRect(-f.w/2,-f.w/4,f.w,f.w/2);g.restore()}g.globalAlpha=1;
 drawNight(g);
 drawTexts(g);drawEmotes(g);drawAids(g,(x,y)=>[x,y],1,now);drawGhost(g,now);
 g.setTransform(1,0,0,1,0,0);g.drawImage(BG.v,0,0)}

/* ---------- картинка арены для главного экрана ---------- */
function demoTowers(){const T=[];let id=900;for(const tm of[0,1])for(const[kind,x,y]of[['p',70,515],['p',290,515],['k',180,580]]){const d=TOWER[kind];T.push({id:++id,obj:'t',kind,tm,x,y:tm?H-y:y,r:d.r,hp:1,mx:1,hit:d.hit,cd:0,fl:0,act:0,ang:tm?Math.PI/2:-Math.PI/2,frozenT:0,stunT:0})}return T}
function drawThumb(cv,ar){const k=2,y0=22,h=316;cv.width=W*k;cv.height=h*k;const g=cv.getContext('2d'),keep=TH;TH=THEMES[ar||0];const L=buildBG(k);
 g.drawImage(L.b,0,-y0*k);g.setTransform(k,0,0,k,0,-y0*k);drawRiver(g,0);g.setTransform(1,0,0,1,0,0);g.drawImage(L.a,0,-y0*k);g.setTransform(k,0,0,k,0,-y0*k);
 for(const t of demoTowers().filter(t=>t.tm===1))drawTower(g,t,0);
 drawChar(g,'guard',1,96,206,{ph:3,dir:-1});drawChar(g,'sorcerer',1,252,186,{ph:1,dir:-1,at:.6});
 drawChar(g,'giant',0,72,252,{ph:1});drawChar(g,'shooters',0,46,276,{ph:2});drawChar(g,'knightrider',0,288,262,{ph:2,dir:-1});drawChar(g,'drake',0,186,232,{ph:1});
 g.setTransform(1,0,0,1,0,0);g.drawImage(L.v,0,-y0*k);TH=keep}

/* подсказка обучения и режим отладки поверх боя. P(x,y) → точка на холсте, k — масштаб линий */
/* ночь в 2D: темнота поверх поля, в ней вырезаны круги света */
let NC=null;function drawNight(g){const k=nightK();if(k<=0)return;if(!NC){NC=document.createElement('canvas');NC.width=W;NC.height=H}
 const n=NC.getContext('2d');n.globalCompositeOperation='source-over';n.clearRect(0,0,W,H);n.fillStyle=`rgba(6,10,32,${.62*k})`;n.fillRect(0,0,W,H);
 n.globalCompositeOperation='destination-out';for(const s of lightSources()){if(inShade(s))continue;const gr=n.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.7,'rgba(0,0,0,.8)');gr.addColorStop(1,'rgba(0,0,0,0)');n.fillStyle=gr;n.beginPath();n.arc(s.x,s.y,s.r,0,7);n.fill()}
 g.drawImage(NC,0,0)}
function drawAids(g,P,k,now){
 if(G.tutor&&!G.over&&G.t<60&&!G.U.some(u=>u.tm===0)){const[x,y]=P(G.tutor.pt.x,G.tutor.pt.y),r=(16+Math.sin(now/180)*4)*k;
  g.strokeStyle='#ffe066';g.lineWidth=3*k;g.beginPath();g.arc(x,y,r,0,7);g.stroke();g.fillStyle='rgba(255,224,102,.22)';g.beginPath();g.arc(x,y,r,0,7);g.fill()}
 if(!SET.debug)return;
 const circ=(cx,cy,r,col)=>{g.strokeStyle=col;g.beginPath();for(let i=0;i<=28;i++){const a=i/28*6.283,[x,y]=P(cx+Math.cos(a)*r,cy+Math.sin(a)*r);i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()};
 g.lineWidth=1*k;g.font=`700 ${8*k}px sans-serif`;g.textAlign='center';
 for(const t of G.T)if(t.hp>0)circ(t.x,t.y,t.rng,'rgba(255,255,255,.25)');
 for(const u of G.U){const c=u.c;circ(u.x,u.y,sightOf(c)*TILE,'rgba(120,200,255,.35)');circ(u.x,u.y,c.rng*TILE+u.r*.6,'rgba(255,120,90,.6)');
  const[ux,uy]=P(u.x,u.y);
  if(u.tg&&aliveT(u.tg)){const[tx,ty]=P(u.tg.x,u.tg.y);g.strokeStyle=u.tm?'rgba(255,90,80,.8)':'rgba(80,170,255,.8)';g.beginPath();g.moveTo(ux,uy);g.lineTo(tx,ty);g.stroke()}
  if(u.path&&u.path.length){g.strokeStyle='rgba(255,230,90,.85)';g.setLineDash([3*k,3*k]);g.beginPath();g.moveTo(ux,uy);for(const q of u.path){const[x,y]=P(q.x,q.y);g.lineTo(x,y)}g.stroke();g.setLineDash([])}
  g.fillStyle='#fff';g.fillText('m'+Math.round(u.mass)+(u.wu>0?' замах':''),ux,uy+12*k)}}
