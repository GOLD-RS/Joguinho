// @ts-nocheck
/* ============================================================
   FLAPPY AURORA — v3.0
   Base v2.1 + melhorias:
   - física em passo fixo (120 Hz): mesma dificuldade em 60/90/120/144 Hz
   - colisão círculo × retângulo (justa nos cantos dos tubos)
   - faixa PERFEITO desenhada com o tamanho REAL do acerto (antes 0.44 vs 0.36)
   - tubos móveis a partir do nível 3, anúncio de nível a cada 10 tubos
   - "RASPANDO!" (near-miss) dá +1 ponto bônus
   - novo power-up: ÍMÃ DE FRESTA (puxa suavemente para o centro)
   - medalhas (bronze/prata/ouro/platina), vibração, botão de pausa
   - gradiente de tubo em cache (antes 6 gradientes por tubo por frame)
   - partículas com remoção O(1) (swap-pop) no lugar de splice
   - crescente da lua com a cor real do céu naquela altura
   - integração com ranking global via hooks
   ============================================================ */

export type GameOverStats = { score: number; best: number; perfects: number; maxCombo: number; pipes: number; newBest: boolean };
export type Hooks = { onGameOver: (s: GameOverStats) => void; onRestart: () => void };

export function startGame(cv: HTMLCanvasElement, hooks: Hooks) {
const ctx = cv.getContext('2d');
const H=1280,GROUND=150,PLAY_BOT=H-GROUND,PW=92,PERFECT=0.18,STEP=1/120;
let S=1,W=720,DPR=1,alive=true;

let RS=1,perfEma=0.016,lastPerfAdj=0,noiseBuf=null;
const skyCache=new Map();
const offVign=document.createElement('canvas');
const offAura=document.createElement('canvas');
const offGlow=document.createElement('canvas');
let sunGrad=null,moonGrad=null,pipeG=null,shTop=null,shBot=null,puAura={};
function buildCaches(){
  const k=cv.height/H;
  offVign.width=cv.width;offVign.height=cv.height;
  const vc=offVign.getContext('2d');
  const vg=vc.createRadialGradient(cv.width/2,cv.height/2,cv.width*0.25,cv.width/2,cv.height/2,Math.max(cv.width,cv.height)*0.78);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.32)');
  vc.clearRect(0,0,cv.width,cv.height);vc.fillStyle=vg;vc.fillRect(0,0,cv.width,cv.height);
  offAura.width=Math.max(2,Math.ceil(cv.width*0.5));
  offAura.height=Math.max(2,Math.ceil(340*k*0.5));
  offGlow.width=offGlow.height=96;
  const gc=offGlow.getContext('2d');
  gc.clearRect(0,0,96,96);
  const gg=gc.createRadialGradient(48,48,2,48,48,48);
  gg.addColorStop(0,'rgba(255,250,190,0.95)');gg.addColorStop(0.25,'rgba(255,246,160,0.35)');
  gg.addColorStop(0.6,'rgba(255,240,140,0.08)');gg.addColorStop(1,'rgba(255,240,140,0)');
  gc.fillStyle=gg;gc.fillRect(0,0,96,96);
  sunGrad=ctx.createRadialGradient(W-170,190,10,W-170,190,165);
  sunGrad.addColorStop(0,'rgba(255,247,190,0.95)');sunGrad.addColorStop(0.2,'rgba(255,236,150,0.5)');sunGrad.addColorStop(1,'rgba(255,236,150,0)');
  moonGrad=ctx.createRadialGradient(W-170,190,8,W-170,190,135);
  moonGrad.addColorStop(0,'rgba(220,230,255,0.55)');moonGrad.addColorStop(0.3,'rgba(180,200,255,0.18)');moonGrad.addColorStop(1,'rgba(180,200,255,0)');
  /* gradientes locais (usados com translate) */
  pipeG=ctx.createLinearGradient(0,0,PW,0);
  pipeG.addColorStop(0,'#2a8535');pipeG.addColorStop(0.15,'#58bd5e');
  pipeG.addColorStop(0.45,'#93e58d');pipeG.addColorStop(0.8,'#48b452');pipeG.addColorStop(1,'#236629');
  shTop=ctx.createLinearGradient(0,0,0,38);shTop.addColorStop(0,'rgba(0,22,5,0.22)');shTop.addColorStop(1,'rgba(0,22,5,0)');
  shBot=ctx.createLinearGradient(0,0,0,-38);shBot.addColorStop(0,'rgba(0,22,5,0.22)');shBot.addColorStop(1,'rgba(0,22,5,0)');
  for(const [kname,c] of [['shield','110,242,255'],['slow','255,207,94'],['magnet','255,120,200']]){
    const g=ctx.createRadialGradient(0,0,4,0,0,52);g.addColorStop(0,`rgba(${c},0.4)`);g.addColorStop(1,'rgba(0,0,0,0)');puAura[kname]=g;
  }
}
function resize(){
  DPR=Math.min(1.5,window.devicePixelRatio||1);
  const cw=innerWidth,ch=innerHeight;
  cv.width=Math.ceil(cw*DPR*RS);cv.height=Math.ceil(ch*DPR*RS);
  S=ch/H;W=cw/S;
  buildCaches();
}
addEventListener('resize',resize);resize();

/* ==================== ÁUDIO ==================== */
let AC=null,master=null,muted=localStorage.getItem('faMute')==='1';
function resumeAudio(){
  try{if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=0.9;master.connect(AC.destination);}
    if(AC.state==='suspended')AC.resume();}catch(e){}
}
function setMuted(m){muted=m;try{localStorage.setItem('faMute',m?'1':'0');}catch(e){}}
function beep(f0,f1,dur,type,vol,delay){
  if(muted||!AC)return;
  try{
    const t=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();
    o.type=type||'sine';o.frequency.setValueAtTime(f0,t);
    if(f1)o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
    g.gain.setValueAtTime(vol||0.12,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+0.02);
  }catch(e){}
}
function noiseBurst(dur,vol,delay){
  if(muted||!AC)return;
  try{
    if(!noiseBuf){noiseBuf=AC.createBuffer(1,AC.sampleRate*0.5|0,AC.sampleRate);
      const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
    const t=AC.currentTime+(delay||0),s=AC.createBufferSource();s.buffer=noiseBuf;
    const g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    s.connect(g);g.connect(master);s.start(t,0,Math.min(dur,0.5));
  }catch(e){}
}
const vib=(p)=>{try{if(!muted&&navigator.vibrate)navigator.vibrate(p);}catch(e){}};
const sFlap=()=>{beep(420+Math.random()*40,880,0.08,'triangle',0.09);noiseBurst(0.03,0.03);};
const sScore=(c)=>{const b=600+c*80;beep(b,0,0.07,'sine',0.08);beep(b*1.5,0,0.09,'sine',0.07,0.05);};
const sPerfect=(c)=>{
  const b=660+c*60;
  beep(b,0,0.07,'sine',0.09);beep(b*1.33,0,0.07,'sine',0.09,0.05);beep(b*2,0,0.14,'sine',0.1,0.1);
  if(c>=3)beep(b*3,0,0.18,'sine',0.09,0.18);
  if(c>=5)beep(b*4,0,0.22,'sine',0.08,0.26);
};
const sNear=()=>{beep(1400,2200,0.06,'square',0.04);};
const sLevel=()=>{[523,659,784,1046].forEach((f,i)=>beep(f,0,0.14,'triangle',0.08,i*0.08));};
const sPU=()=>{beep(500,1500,0.2,'sine',0.11);beep(800,1800,0.15,'sine',0.06,0.08);};
const sShield=()=>{beep(1200,300,0.18,'square',0.09);noiseBurst(0.06,0.07,0.04);beep(180,60,0.3,'sawtooth',0.08,0.02);};
const sHit=()=>{beep(350,30,0.25,'sawtooth',0.16);noiseBurst(0.1,0.14);beep(140,15,0.45,'square',0.1,0.04);};

/* ==================== ESTADO ==================== */
const bird={x:210,y:H/2,vy:0,r:22,rot:0,squash:1,wing:0,blink:0,nextBlink:2};
let pipes=[],parts=[],pops=[];
let state='menu',score=0,displayScore=0,combo=1,best=+(localStorage.getItem('faBest')||0);
let shieldOn=false,slowT=0,magnetT=0,invuln=0,deadT=0,newBest=false,pipesPassed=0,lastGapY=H*0.45;
let shakeT=0,groundOff=0,tGlobal=0,scrollT=0;
let held=false,hitstop=0,flashT=0,flashColor='#fff';
let trailT=0,glideT=0,scorePulse=0,reported=false,levelBanner=0,level=1;
let statPerfects=0,statMaxCombo=0,statPipes=0,statNear=0;
let tutorialDone=localStorage.getItem('faT')==='1';

const clouds=[];for(let i=0;i<10;i++)clouds.push({f:Math.random(),y:50+Math.random()*530,sp:0.006+Math.random()*0.016,sz:0.6+Math.random()*0.7});
const stars=[];for(let i=0;i<110;i++)stars.push({x:Math.random(),y:Math.random()*0.52,tw:Math.random()*6,sz:0.8+Math.random()*2.2});
const fireflies=[];for(let i=0;i<22;i++)fireflies.push({bx:Math.random(),by:0.18+Math.random()*0.52,ph:Math.random()*6.28,sp:0.12+Math.random()*0.38,sz:1.2+Math.random()*2.5});

/* ==================== UTILITÁRIOS ==================== */
function pipeSpeed(){return 300+Math.min(240,pipesPassed*3);}
function nightVal(){const p=(pipesPassed%16)/16;return 0.5-0.5*Math.cos(p*6.2832);}
function mixC(a,b,t){return 'rgb('+Math.round(a[0]+(b[0]-a[0])*t)+','+Math.round(a[1]+(b[1]-a[1])*t)+','+Math.round(a[2]+(b[2]-a[2])*t)+')';}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function addP(o){if(parts.length<400)parts.push(o);}
function circRect(cx,cy,r,x,y,w,h){const nx=Math.max(x,Math.min(cx,x+w)),ny=Math.max(y,Math.min(cy,y+h));const dx=cx-nx,dy=cy-ny;return dx*dx+dy*dy<r*r;}
function medal(s){return s>=100?['PLATINA','#e5f4ff','#9fc6e8']:s>=50?['OURO','#ffd23e','#c98d12']:s>=25?['PRATA','#e8ecf2','#9aa3b0']:s>=10?['BRONZE','#e59a5c','#9a5a2a']:null;}

/* ==================== SPAWN ==================== */
function spawnPipe(x){
  const gapH=430-Math.min(120,Math.floor(pipesPassed/10)*14);
  const raw=240+Math.random()*(PLAY_BOT-280-240);
  const gapY=Math.max(240,Math.min(850,Math.max(lastGapY-280,Math.min(lastGapY+280,raw))));
  lastGapY=gapY;
  /* tubos móveis a partir do nível 3 (20+ tubos), com amplitude crescente */
  let amp=0;
  if(pipesPassed>=20&&Math.random()<Math.min(0.55,0.2+(pipesPassed-20)*0.01))amp=Math.min(110,40+(pipesPassed-20)*1.5);
  amp=Math.min(amp,gapY-200,860-gapY);if(amp<0)amp=0;
  const p={x,baseY:gapY,gapY,gapH,amp,ph:Math.random()*6.28,scored:false,dead:false,pu:null};
  const nPU=pipes.reduce((a,q)=>a+(q.pu?1:0),0);
  if(Math.random()<0.2&&nPU<2){
    const r=Math.random();
    p.pu={kind:r<0.4?'shield':r<0.75?'slow':'magnet',off:(Math.random()*2-1)*gapH*0.3};
  }
  pipes.push(p);
}
function resetGame(){
  pipes.length=0;parts.length=0;pops.length=0;
  score=0;displayScore=0;combo=1;
  shieldOn=false;slowT=0;magnetT=0;invuln=0;deadT=0;newBest=false;reported=false;
  pipesPassed=0;lastGapY=H*0.45;
  hitstop=0;flashT=0;scorePulse=0;trailT=0;glideT=0;levelBanner=0;level=1;
  statPerfects=0;statMaxCombo=0;statPipes=0;statNear=0;
  bird.x=Math.min(210,W*0.3);bird.y=H*0.45;bird.vy=0;bird.rot=0;bird.squash=1;bird.wing=0;
  spawnPipe(W+120);spawnPipe(W+480);
  state='playing';hooks.onRestart();
}

/* ==================== MORTE ==================== */
function die(){
  if(state!=='playing')return;
  state='dead';deadT=0;
  hitstop=0.075;shakeT=0.55;flashT=0.25;flashColor='#ff2222';
  held=false;
  newBest=score>best;
  if(newBest){best=score;try{localStorage.setItem('faBest',String(best));}catch(e){}}
  sHit();vib([40,30,80]);
  for(let i=0;i<40;i++){
    const a=Math.random()*6.283,sp=100+Math.random()*420;
    addP({x:bird.x,y:bird.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-140,life:1.3,max:1.3,size:4+Math.random()*7,
      color:['#ffd23e','#ff8c42','#ffe873','#fff5c0','#ffb347'][i%5],grav:850,type:'feather',spin:Math.random()*8});
  }
  for(let i=0;i<20;i++){
    const a=Math.random()*6.283;
    addP({x:bird.x,y:bird.y,vx:Math.cos(a)*(180+Math.random()*350),vy:Math.sin(a)*(180+Math.random()*350)-120,
      life:0.7,max:0.7,size:2+Math.random()*3,color:'rgba(255,255,255,0.8)',grav:600,type:'circle'});
  }
  if(newBest)for(let i=0;i<40;i++){
    addP({x:W*0.1+Math.random()*W*0.8,y:-10-Math.random()*120,vx:(Math.random()-0.5)*120,vy:80+Math.random()*180,
      life:3,max:3,size:4+Math.random()*6,color:['#ff6b6b','#ffd23e','#6ef2ff','#7dff9a','#ff8cc8','#b88cff'][i%6],
      grav:40,type:'confetti',spin:Math.random()*10});
  }
}

/* ==================== ENTRADA ==================== */
function hitBtn(mx,my,x,y){return mx!==undefined&&Math.hypot(mx-x,my-y)<52;}
function flap(){
  bird.vy=-620;bird.squash=1.22;bird.wing=1;sFlap();
  for(let i=0;i<5;i++)addP({x:bird.x-16+Math.random()*10,y:bird.y+14+Math.random()*8,vx:-55-Math.random()*85,vy:35+Math.random()*65,
    life:0.38,max:0.38,size:2.5+Math.random()*3,color:'rgba(255,255,255,0.65)',grav:90,type:'circle'});
}
function pressLogic(mx,my){
  resumeAudio();
  if(hitBtn(mx,my,W-64,64)){setMuted(!muted);held=false;return;}
  if(state==='playing'&&hitBtn(mx,my,64,64)){state='paused';held=false;return;}
  if(state==='menu'){resetGame();flap();return;}
  if(state==='paused'){state='playing';held=false;return;}
  if(state==='dead'){
    if(deadT>1.0){
      if(!tutorialDone){tutorialDone=true;try{localStorage.setItem('faT','1');}catch(e){}}
      resetGame();flap();
    }return;
  }
  if(state==='playing')flap();
}
const onDown=(e)=>{e.preventDefault();held=true;pressLogic(e.clientX/S,e.clientY/S);};
const onUp=()=>{held=false;};
const onKey=(e)=>{
  if(e.target&&(e.target.tagName==='INPUT'))return;
  if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW'){if(!e.repeat){held=true;pressLogic(undefined,undefined);}e.preventDefault();}
  else if(e.code==='KeyM')setMuted(!muted);
  else if(e.code==='KeyP'||e.code==='Escape'){if(state==='playing'){state='paused';held=false;}else if(state==='paused')state='playing';}
};
const onKeyUp=(e)=>{if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW')held=false;};
const onVis=()=>{if(document.hidden&&state==='playing'){state='paused';held=false;}};
cv.addEventListener('pointerdown',onDown,{passive:false});
addEventListener('pointerup',onUp);addEventListener('pointercancel',onUp);
addEventListener('keydown',onKey);addEventListener('keyup',onKeyUp);
document.addEventListener('visibilitychange',onVis);
addEventListener('blur',onVis);

/* ==================== ATUALIZAÇÃO (passo fixo) ==================== */
function update(dt){
  tGlobal+=dt;
  if(hitstop>0){hitstop-=dt;if(flashT>0)flashT-=dt;return;}
  if(shakeT>0)shakeT-=dt;
  if(flashT>0)flashT-=dt;
  if(scorePulse>0)scorePulse-=dt*5;
  if(levelBanner>0)levelBanner-=dt;

  if(displayScore<score){
    displayScore+=(score-displayScore)*Math.min(1,dt*12)+dt*2;
    if(score-displayScore<0.3||displayScore>score)displayScore=score;
  }

  bird.nextBlink-=dt;
  if(bird.nextBlink<0){bird.blink=0.14;bird.nextBlink=2+Math.random()*3;}
  if(bird.blink>0)bird.blink-=dt;
  bird.squash+=(1-bird.squash)*Math.min(1,dt*10);
  bird.wing=Math.max(0,bird.wing-dt*2.2);

  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.life-=dt;
    if(p.life<=0){parts[i]=parts[parts.length-1];parts.pop();continue;}
    p.vy+=(p.grav||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.type==='feather'||p.type==='confetti')p.spin=(p.spin||0)+dt*6;
    if(p.type==='confetti')p.vx+=(Math.sin(tGlobal*3+p.spin)*20)*dt;
  }
  for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t-=dt;p.y+=(p.vy||-55)*dt;if(p.t<=0)pops.splice(i,1);}

  if(state==='playing'){
    const ts=slowT>0?0.55:1;
    if(slowT>0)slowT-=dt;
    if(magnetT>0)magnetT-=dt;
    if(invuln>0)invuln-=dt;
    const d=dt*ts,sp=pipeSpeed();
    scrollT+=d;

    /* tubos móveis */
    for(const p of pipes)if(p.amp>0)p.gapY=p.baseY+Math.sin(tGlobal*1.6*ts+p.ph)*p.amp;

    const grav=held?420:1750;
    bird.vy=Math.min(bird.vy+grav*d,900);
    /* ímã: puxa suavemente para o centro da próxima fresta */
    if(magnetT>0){
      const nx=pipes.find(p=>!p.scored&&p.x+PW>bird.x-bird.r);
      if(nx&&nx.x-bird.x<420){const dy=nx.gapY-bird.y;bird.vy+=dy*5*d;bird.vy*=1-1.5*d;}
    }
    bird.y+=bird.vy*d;
    const targ=Math.max(-0.42,Math.min(1.35,bird.vy/650));
    bird.rot+=(targ-bird.rot)*Math.min(1,dt*9);
    if(bird.y<bird.r){bird.y=bird.r;bird.vy=Math.max(bird.vy,0);}

    trailT+=d;
    if(trailT>0.025){trailT=0;
      addP({x:bird.x-18+Math.random()*6,y:bird.y+8+Math.random()*6-3,vx:-45-Math.random()*55,vy:bird.vy*0.04+Math.random()*18-9,
        life:0.35,max:0.35,size:1.5+Math.random()*2,color:magnetT>0?'rgba(255,140,210,0.5)':'rgba(255,225,160,0.45)',grav:12,type:'circle'});
    }
    glideT+=dt;
    if(glideT>0.07&&held){glideT=0;
      addP({x:bird.x-16,y:bird.y+10,vx:-75,vy:28,life:0.4,max:0.4,size:4.5,color:'rgba(255,255,255,0.35)',grav:0,type:'circle'});}

    for(let i=0;i<pipes.length;i++)pipes[i].x-=sp*d;
    groundOff=(groundOff+sp*d)%48;
    while(pipes.length>0&&pipes[0].x<-180)pipes.shift();

    const lastP=pipes[pipes.length-1];
    if(!lastP||lastP.x<W-380)spawnPipe(lastP?Math.max(lastP.x+360,W+40):W+60);

    /* Itens */
    for(let i=0;i<pipes.length;i++){
      const p=pipes[i];if(!p.pu)continue;
      const px=p.x+PW/2,py=p.gapY+p.pu.off+Math.sin(tGlobal*3+p.x*0.01)*8;
      if(Math.hypot(bird.x-px,bird.y-py)<50){
        const k=p.pu.kind;
        const cfg=k==='shield'?['ESCUDO!','#6ef2ff']:k==='slow'?['CÂMERA LENTA!','#ffcf5e']:['ÍMÃ!','#ff8cd2'];
        if(k==='shield')shieldOn=true;else if(k==='slow')slowT=4;else magnetT=5;
        pops.push({x:bird.x+30,y:bird.y-60,text:cfg[0],color:cfg[1],size:42,t:1,max:1,vy:-42});
        flashT=0.15;flashColor=cfg[1];
        sPU();vib(20);
        for(let q=0;q<14;q++){const a=Math.random()*6.283;
          addP({x:px,y:py,vx:Math.cos(a)*230,vy:Math.sin(a)*230,life:0.5,max:0.5,size:2.5+Math.random()*3,color:cfg[1],grav:0,type:'circle'});}
        p.pu=null;
      }
    }

    /* Pontuação */
    for(let i=0;i<pipes.length;i++){
      const p=pipes[i];
      if(!p.scored&&p.x+PW<bird.x-bird.r){
        p.scored=true;pipesPassed++;statPipes++;
        const perfect=Math.abs(bird.y-p.gapY)<p.gapH*PERFECT;
        if(perfect){
          combo=Math.min(5,combo+1);
          statMaxCombo=Math.max(statMaxCombo,combo);statPerfects++;
          sPerfect(combo);vib(12);
          flashT=0.1;flashColor='#fff6a8';scorePulse=1;
          for(let k=0;k<14;k++){const a=Math.random()*6.283;
            addP({x:bird.x+15,y:bird.y,vx:Math.cos(a)*185,vy:Math.sin(a)*185,life:0.65,max:0.65,size:2.5+Math.random()*4,
              color:['#fff6a8','#ffe873','#fff','#ffd23e'][k%4],grav:0,type:'sparkle'});}
          addP({x:p.x+PW/2,y:p.gapY,vx:0,vy:0,life:0.5,max:0.5,size:5,color:'rgba(255,246,168,0.6)',grav:0,type:'ring',targetSize:90});
          pops.push({x:bird.x,y:bird.y-56,text:'PERFEITO',color:'#fff6a8',size:34,t:0.9,max:0.9,vy:-48});
          if(combo>1)pops.push({x:bird.x,y:bird.y-104,text:'x'+combo,color:'#ffd23e',size:50,t:0.9,max:0.9,vy:-48});
        }else{
          combo=1;sScore(combo);scorePulse=0.6;
          addP({x:p.x+PW/2,y:p.gapY,vx:0,vy:0,life:0.35,max:0.35,size:3,color:'rgba(255,255,255,0.3)',grav:0,type:'ring',targetSize:60});
        }
        let pts=combo;
        /* near-miss: passou colado na borda */
        const edge=p.gapH/2-Math.abs(bird.y-p.gapY)-bird.r;
        if(!perfect&&edge<14){pts+=1;statNear++;sNear();
          pops.push({x:bird.x,y:bird.y+(bird.y<p.gapY?60:-60),text:'RASPANDO! +1',color:'#ff9df0',size:28,t:0.8,max:0.8,vy:-30});}
        score+=pts;
        pops.push({x:Math.max(60,Math.min(W-60,bird.x+38)),y:bird.y-22,text:'+'+pts,color:perfect?'#ffd23e':'#fff',size:34,t:0.7,max:0.7,vy:-65});
        const nl=1+Math.floor(pipesPassed/10);
        if(nl>level){level=nl;levelBanner=2;sLevel();}
      }
    }

    /* Colisão círculo × retângulo (hitbox levemente perdoadora) */
    if(invuln<=0){
      const r=bird.r-3;
      for(let i=0;i<pipes.length;i++){
        const p=pipes[i];if(p.dead)continue;
        const topH=p.gapY-p.gapH/2,botY=p.gapY+p.gapH/2;
        const hit=circRect(bird.x,bird.y,r,p.x+7,-200,PW-14,topH+200)||circRect(bird.x,bird.y,r,p.x,topH-34,PW,34)||
                  circRect(bird.x,bird.y,r,p.x+7,botY,PW-14,PLAY_BOT-botY)||circRect(bird.x,bird.y,r,p.x,botY,PW,34);
        if(hit){
          if(shieldOn){
            shieldOn=false;invuln=1.1;p.dead=true;p.pu=null;
            bird.vy=-480;shakeT=0.3;flashT=0.2;flashColor='#6ef2ff';
            sShield();vib(30);
            for(let k=0;k<8;k++){const a=Math.random()*6.283;
              addP({x:bird.x,y:bird.y,vx:Math.cos(a)*250,vy:Math.sin(a)*250,life:0.4,max:0.4,size:3,color:'rgba(110,242,255,0.8)',grav:0,type:'circle'});}
            pops.push({x:bird.x+30,y:bird.y-60,text:'Escudo quebrou!',color:'#6ef2ff',size:38,t:1,max:1,vy:-42});
          }else die();
          break;
        }
      }
    }
    /* tubo destruído pelo escudo: ainda conta ao passar, some com fade */
    for(const p of pipes)if(p.dead){p.fade=(p.fade||1)-dt*3;}
    for(let i=pipes.length-1;i>=0;i--)if(pipes[i].dead&&pipes[i].fade<=0){if(!pipes[i].scored){pipesPassed++;statPipes++;score+=1;}pipes.splice(i,1);}

    if(state==='playing'&&bird.y+bird.r>=PLAY_BOT){bird.y=PLAY_BOT-bird.r;bird.vy=0;die();}
  }
  else if(state==='menu'){
    scrollT+=dt*0.4;groundOff=(groundOff+120*dt)%48;
    bird.x=Math.min(210,W*0.3);
    bird.y=H*0.45+Math.sin(tGlobal*2)*16;
    bird.rot=Math.sin(tGlobal*2+1)*0.08;
  }
  else if(state==='dead'){
    deadT+=dt;
    const sdt=dt*Math.max(0.18,Math.min(1,1-deadT*1.4));
    bird.vy=Math.min(bird.vy+1800*sdt,850);
    bird.y=Math.min(bird.y+bird.vy*sdt,PLAY_BOT-bird.r);
    bird.rot=Math.min(bird.rot+sdt*3.5,1.5);
    if(deadT>1.0&&!reported){reported=true;
      hooks.onGameOver({score,best,perfects:statPerfects,maxCombo:Math.max(1,statMaxCombo),pipes:statPipes,newBest});}
  }
}

/* ==================== RENDER ==================== */
const SKY_TOP=[[116,190,255],[8,16,42]],SKY_MID=[[180,225,255],[22,32,72]];
function drawSky(){
  const key=nightVal()*40|0;
  let g=skyCache.get(key);
  if(!g){const q=key/40;
    g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,mixC(SKY_TOP[0],SKY_TOP[1],q));
    g.addColorStop(0.5,mixC(SKY_MID[0],SKY_MID[1],q));
    g.addColorStop(1,mixC([208,240,255],[44,60,112],q));
    skyCache.set(key,g);}
  ctx.fillStyle=g;ctx.fillRect(-60,-60,W+120,H+120);
}
function drawStars(n){
  if(n<0.04)return;
  ctx.fillStyle='#fff';
  for(const s of stars){
    ctx.globalAlpha=n*(0.25+0.75*Math.abs(Math.sin(tGlobal*1.5+s.tw)));
    ctx.fillRect(s.x*W-s.sz*0.8,s.y*H-s.sz*0.8,s.sz*1.6,s.sz*1.6);
  }
  ctx.globalAlpha=1;
}
const AURORA_L=[
  {y:45,amp:65,f1:.003,f2:.007,s1:.3,s2:.2,c:'0,255,136',a:.10},
  {y:85,amp:55,f1:.004,f2:.006,s1:.35,s2:.25,c:'0,180,255',a:.08},
  {y:30,amp:50,f1:.002,f2:.009,s1:.2,s2:.15,c:'120,60,255',a:.07},
  {y:105,amp:60,f1:.005,f2:.003,s1:.4,s2:.3,c:'255,50,150',a:.06},
  {y:65,amp:45,f1:.006,f2:.004,s1:.25,s2:.35,c:'0,255,200',a:.05}
];
function drawAurora(n){
  if(n<0.08)return;
  const ac=offAura.getContext('2d');
  const ak=offAura.width/W;
  ac.setTransform(ak,0,0,ak,0,0);
  ac.clearRect(0,0,W,340);
  ac.globalCompositeOperation='lighter';
  for(const l of AURORA_L){
    const a=l.a*n;
    ac.beginPath();
    for(let x=0;x<=W+10;x+=12){
      const y=l.y+Math.sin(x*l.f1+tGlobal*l.s1)*l.amp+Math.sin(x*l.f2+tGlobal*l.s2)*l.amp*.4;
      x===0?ac.moveTo(x,y):ac.lineTo(x,y);
    }
    ac.lineTo(W+10,330);ac.lineTo(0,330);ac.closePath();
    const g=ac.createLinearGradient(0,l.y-l.amp,0,330);
    g.addColorStop(0,`rgba(${l.c},${a})`);g.addColorStop(0.45,`rgba(${l.c},${(a*.5).toFixed(3)})`);g.addColorStop(1,`rgba(${l.c},0)`);
    ac.fillStyle=g;ac.fill();
  }
  ac.globalCompositeOperation='source-over';
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.drawImage(offAura,0,0,offAura.width,offAura.height,0,0,W,offAura.height/ak);
  ctx.restore();
}
function drawCelestial(n){
  const cxp=W-170,cyp=190;
  if(n<0.98){
    ctx.globalAlpha=1-n;
    ctx.fillStyle=sunGrad;ctx.beginPath();ctx.arc(cxp,cyp,165,0,6.283);ctx.fill();
    ctx.fillStyle='#fff3b0';ctx.beginPath();ctx.arc(cxp,cyp,52,0,6.283);ctx.fill();
  }
  if(n>0.02){
    ctx.globalAlpha=n;
    ctx.fillStyle=moonGrad;ctx.beginPath();ctx.arc(cxp,cyp,135,0,6.283);ctx.fill();
    ctx.fillStyle='#f2efdc';ctx.beginPath();ctx.arc(cxp,cyp,46,0,6.283);ctx.fill();
    ctx.fillStyle='rgba(200,195,175,0.25)';
    for(const [dx,dy,r] of [[-12,-8,10],[15,12,7],[5,-18,5],[-20,15,6]]){ctx.beginPath();ctx.arc(cxp+dx,cyp+dy,r,0,6.283);ctx.fill();}
    /* crescente com a cor exata do céu na altura da lua (≈15% do gradiente) */
    const q=(nightVal()*40|0)/40,t=cyp/(H*0.5);
    const top=SKY_TOP.map(c=>c),a=[0,1,2].map(i=>top[0][i]+(top[1][i]-top[0][i])*q),b=[0,1,2].map(i=>SKY_MID[0][i]+(SKY_MID[1][i]-SKY_MID[0][i])*q);
    ctx.fillStyle=mixC(a,b,t);
    ctx.beginPath();ctx.arc(cxp-16,cyp-8,38,0,6.283);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function drawFireflies(n){
  if(n<0.2)return;
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const f of fireflies){
    const x=((f.bx+Math.sin(tGlobal*f.sp+f.ph)*0.04)*W+W)%W;
    const y=f.by*H+Math.cos(tGlobal*f.sp*0.7+f.ph)*28;
    const glow=(0.3+0.7*Math.sin(tGlobal*2.5+f.ph))*n;
    if(glow<=0.02)continue;
    const r=f.sz*5;ctx.globalAlpha=Math.min(1,glow*1.4);
    ctx.drawImage(offGlow,x-r,y-r,r*2,r*2);
  }
  ctx.restore();
}
function drawClouds(n){
  ctx.fillStyle=n>0.5?'rgba(190,200,230,0.35)':'rgba(255,255,255,0.82)';
  ctx.beginPath();
  for(const c of clouds){
    const m=W+560,x=(((c.f-scrollT*c.sp)%1)+1)%1*m-280;
    ctx.moveTo(x+34*c.sz,c.y);ctx.arc(x,c.y,34*c.sz,0,6.283);
    ctx.moveTo(x+58*c.sz,c.y-14*c.sz);ctx.arc(x+30*c.sz,c.y-14*c.sz,28*c.sz,0,6.283);
    ctx.moveTo(x+92*c.sz,c.y);ctx.arc(x+62*c.sz,c.y,30*c.sz,0,6.283);
    ctx.moveTo(x+62*c.sz,c.y+12*c.sz);ctx.arc(x+32*c.sz,c.y+12*c.sz,30*c.sz,0,6.283);
  }
  ctx.fill();
}
function hill(amp,base,sp,ph,color){
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,PLAY_BOT+10);
  const off=scrollT*sp;
  for(let x=0;x<=W+28;x+=28)ctx.lineTo(x,PLAY_BOT-base-amp*(0.5+0.5*Math.sin((x+off)*0.006+ph)));
  ctx.lineTo(W+28,PLAY_BOT+10);ctx.closePath();ctx.fill();
}
function drawHills(){
  hill(85,55,16,0.5,'rgba(155,195,218,0.65)');
  hill(105,35,26,1.3,'rgba(135,178,198,0.85)');
  hill(75,12,42,4.1,'rgba(105,158,138,0.92)');
}
function drawPipe(p){
  const topH=p.gapY-p.gapH/2,botY=p.gapY+p.gapH/2;
  ctx.save();ctx.translate(p.x,0);
  if(p.dead)ctx.globalAlpha=Math.max(0,p.fade);
  /* faixa PERFEITO com tamanho real */
  const lh=p.gapH*PERFECT*2;
  ctx.fillStyle=p.scored?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.13)';ctx.fillRect(2,p.gapY-lh/2,PW-4,lh);
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(2,p.gapY-2,PW-4,4);
  ctx.strokeStyle='rgba(12,55,18,0.5)';ctx.lineWidth=2;
  if(topH>2){
    ctx.fillStyle=pipeG;ctx.fillRect(7,-60,PW-14,topH+60);
    ctx.fillStyle='rgba(255,255,255,0.13)';ctx.fillRect(14,-60,7,topH+60);
    ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fillRect(PW-18,-60,7,topH+60);
    ctx.strokeRect(7,-60,PW-14,topH+60);
  }
  if(PLAY_BOT-botY>2){
    ctx.fillStyle=pipeG;ctx.fillRect(7,botY,PW-14,PLAY_BOT-botY);
    ctx.fillStyle='rgba(255,255,255,0.13)';ctx.fillRect(14,botY,7,PLAY_BOT-botY);
    ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fillRect(PW-18,botY,7,PLAY_BOT-botY);
    ctx.strokeRect(7,botY,PW-14,PLAY_BOT-botY);
  }
  for(const y of [topH-34,botY]){
    ctx.fillStyle=pipeG;rr(0,y,PW,34,7);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.12)';rr(5,y+4,PW-10,7,3);ctx.fill();
  }
  if(p.amp>0){/* marca de tubo móvel */
    ctx.fillStyle='rgba(255,210,62,0.9)';
    for(const y of [topH-17,botY+17]){ctx.beginPath();ctx.moveTo(PW/2-8,y-4);ctx.lineTo(PW/2,y-10);ctx.lineTo(PW/2+8,y-4);ctx.moveTo(PW/2-8,y+4);ctx.lineTo(PW/2,y+10);ctx.lineTo(PW/2+8,y+4);ctx.fill();}
  }
  if(botY-topH>92){
    ctx.translate(0,topH);ctx.fillStyle=shTop;ctx.fillRect(2,0,PW-4,38);
    ctx.translate(0,botY-topH);ctx.fillStyle=shBot;ctx.fillRect(2,-38,PW-4,38);
  }
  ctx.restore();
}
function drawPU(x,y,kind){
  const bob=Math.sin(tGlobal*3+x*0.01)*8;
  ctx.save();ctx.translate(x,y+bob);
  const col=kind==='shield'?'#6ef2ff':kind==='slow'?'#ffcf5e':'#ff8cd2';
  const pul=1+Math.sin(tGlobal*5)*0.08;
  ctx.globalCompositeOperation='lighter';
  ctx.scale(pul,pul);ctx.fillStyle=puAura[kind];ctx.beginPath();ctx.arc(0,0,52,0,6.283);ctx.fill();
  ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='rgba(10,30,50,0.85)';ctx.beginPath();ctx.arc(0,0,30,0,6.283);ctx.fill();
  ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,30,0,6.283);ctx.stroke();
  if(kind==='shield'){
    ctx.fillStyle='#eafcff';ctx.beginPath();
    ctx.moveTo(-11,-14);ctx.lineTo(11,-14);ctx.lineTo(11,2);ctx.quadraticCurveTo(11,12,0,16);ctx.quadraticCurveTo(-11,12,-11,2);
    ctx.closePath();ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=2;ctx.stroke();
  }else if(kind==='slow'){
    ctx.strokeStyle='#fff';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,0,15,0,6.283);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-9);ctx.moveTo(0,0);ctx.lineTo(8,4);ctx.stroke();
  }else{
    ctx.lineWidth=7;ctx.lineCap='butt';ctx.strokeStyle='#ff5a7a';
    ctx.beginPath();ctx.arc(0,-2,11,Math.PI,0);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-11,-2);ctx.lineTo(-11,10);ctx.moveTo(11,-2);ctx.lineTo(11,10);ctx.stroke();
    ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(-11,8);ctx.lineTo(-11,14);ctx.moveTo(11,8);ctx.lineTo(11,14);ctx.stroke();
  }
  ctx.restore();
}
function birdShape(){
  ctx.fillStyle='#ffc93e';ctx.beginPath();ctx.ellipse(0,0,30,24,0,0,6.283);ctx.fill();
  ctx.fillStyle='#ffb32e';ctx.beginPath();ctx.ellipse(-6,4,15,9,0.3,0,6.283);ctx.fill();
  ctx.fillStyle='#f26522';ctx.beginPath();ctx.moveTo(16,-2);ctx.lineTo(30,1);ctx.lineTo(16,6);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(9,-8,6,0,6.283);ctx.fill();
  ctx.fillStyle='#232430';ctx.beginPath();ctx.arc(11,-8,3,0,6.283);ctx.fill();
}
let bodyG=null;
function drawBird(){
  const b=bird;
  ctx.save();ctx.translate(b.x,b.y);
  if(invuln>0)ctx.globalAlpha=0.45+0.55*Math.sin(tGlobal*24);
  ctx.rotate(b.rot);
  const sq=b.squash;ctx.scale(2-sq,sq);
  const wingA=-0.6+Math.sin(tGlobal*22)*0.6*(0.35+0.65*b.wing);
  ctx.save();ctx.translate(-28,-2);
  const tw=Math.sin(tGlobal*15)*0.15;ctx.rotate(wingA*0.25+tw);
  ctx.fillStyle='#e8a020';ctx.beginPath();ctx.moveTo(0,-2);ctx.lineTo(-17,-10+tw*4);ctx.lineTo(-14,1);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d4891a';ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(-14,11+tw*3);ctx.lineTo(-11,-1);ctx.closePath();ctx.fill();
  ctx.fillStyle='#c07a14';ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(-11,17+tw*2);ctx.lineTo(-8,5);ctx.closePath();ctx.fill();
  ctx.restore();
  if(!bodyG){bodyG=ctx.createRadialGradient(-8,-10,6,0,0,34);bodyG.addColorStop(0,'#ffe873');bodyG.addColorStop(0.5,'#ffc93e');bodyG.addColorStop(1,'#f0a020');}
  ctx.fillStyle=bodyG;ctx.beginPath();ctx.ellipse(0,0,30,24,0,0,6.283);ctx.fill();
  ctx.strokeStyle='rgba(150,80,10,0.28)';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.82)';ctx.beginPath();ctx.ellipse(2,10,17,10,0,0,6.283);ctx.fill();
  ctx.fillStyle='rgba(255,130,80,0.18)';ctx.beginPath();ctx.arc(8,4,8,0,6.283);ctx.fill();
  ctx.save();ctx.translate(-6,4);ctx.rotate(wingA);
  ctx.fillStyle='#ffb32e';ctx.beginPath();ctx.ellipse(-10,0,16,10,0,0,6.283);ctx.fill();
  ctx.strokeStyle='rgba(150,80,10,0.3)';ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='#e8a020';ctx.beginPath();ctx.ellipse(-18,2,10,5,0.2,0,6.283);ctx.fill();
  ctx.fillStyle='#d4891a';ctx.beginPath();ctx.ellipse(-23,5,7,3.5,0.3,0,6.283);ctx.fill();
  ctx.restore();
  ctx.fillStyle='#f26522';ctx.beginPath();ctx.moveTo(16,-2);ctx.lineTo(34,2);ctx.lineTo(16,8);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e85510';ctx.beginPath();ctx.moveTo(16,2);ctx.lineTo(32,3);ctx.lineTo(16,8);ctx.closePath();ctx.fill();
  const dead=state==='dead';
  const bl=b.blink>0?0.12:1;
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(9,-8,8,8*(dead?1:bl),0,0,6.283);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=1;ctx.stroke();
  if(dead){/* olhos em X */
    ctx.strokeStyle='#232430';ctx.lineWidth=2.5;ctx.beginPath();
    ctx.moveTo(5,-12);ctx.lineTo(13,-4);ctx.moveTo(13,-12);ctx.lineTo(5,-4);ctx.stroke();
  }else if(bl>0.5){
    ctx.fillStyle='#232430';ctx.beginPath();ctx.arc(11.5,-8+Math.max(-2,Math.min(2,b.vy/300)),3.8,0,6.283);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(13,-9.5,1.5,0,6.283);ctx.fill();
  }
  if(shieldOn){
    const sa=ctx.globalAlpha,pr=42+Math.sin(tGlobal*6)*2;
    ctx.strokeStyle='rgba(110,242,255,0.22)';ctx.lineWidth=12;ctx.beginPath();ctx.arc(0,0,pr,0,6.283);ctx.stroke();
    ctx.strokeStyle='rgba(110,242,255,0.85)';ctx.lineWidth=4;ctx.stroke();
    ctx.globalAlpha=0.12*sa;ctx.fillStyle='#6ef2ff';ctx.fill();ctx.globalAlpha=sa;
  }
  if(magnetT>0){
    ctx.strokeStyle='rgba(255,140,210,'+(0.3+0.3*Math.sin(tGlobal*10)).toFixed(2)+')';ctx.lineWidth=2;
    ctx.setLineDash([6,8]);ctx.lineDashOffset=-tGlobal*40;ctx.beginPath();ctx.arc(0,0,50,0,6.283);ctx.stroke();ctx.setLineDash([]);
  }
  ctx.restore();
}
function drawParticles(){
  for(const p of parts){
    ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;
    if(p.type==='feather'||p.type==='confetti'){
      const c=Math.cos(p.spin||0),s=Math.sin(p.spin||0);
      ctx.save();
      ctx.transform(c,s,-s,c,p.x,p.y);
      if(p.type==='feather'){ctx.beginPath();ctx.ellipse(0,0,p.size,p.size*0.4,0,0,6.283);ctx.fill();}
      else ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
      ctx.restore();
    }else if(p.type==='sparkle'){
      const s=p.size*2.5,a=tGlobal*5;
      ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.beginPath();
      for(let j=0;j<4;j++){const aa=a+j*1.571;ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(aa)*s,p.y+Math.sin(aa)*s);}
      ctx.stroke();
    }else if(p.type==='ring'){
      const prog=1-p.life/p.max;
      ctx.strokeStyle=p.color;ctx.lineWidth=3*(1-prog)+0.5;
      ctx.beginPath();ctx.arc(p.x,p.y,p.targetSize*prog,0,6.283);ctx.stroke();
    }else{
      ctx.fillRect(p.x-p.size,p.y-p.size,p.size*2,p.size*2);
    }
  }
  ctx.globalAlpha=1;
}
function drawPops(){
  ctx.textAlign='center';ctx.lineJoin='round';
  for(const p of pops){
    const progress=1-p.t/p.max;
    const scale=progress<0.15?0.5+progress/0.15*0.7:1.2-(progress-0.15)/0.85*0.2;
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(scale,scale);ctx.globalAlpha=Math.min(1,p.t*3);
    ctx.font='900 '+p.size+'px system-ui,Arial';
    ctx.lineWidth=6;ctx.strokeStyle='rgba(0,0,0,0.55)';ctx.strokeText(p.text,0,0);
    ctx.fillStyle=p.color;ctx.fillText(p.text,0,0);
    ctx.restore();
  }
}
function drawGround(){
  ctx.fillStyle='#5eb83e';ctx.fillRect(-60,PLAY_BOT,W+120,42);
  ctx.fillStyle='#82d85e';ctx.fillRect(-60,PLAY_BOT,W+120,12);
  ctx.fillStyle='#4a9e32';ctx.fillRect(-60,PLAY_BOT+32,W+120,10);
  ctx.fillStyle='#4aaa30';
  for(let x=-(groundOff%22)-22;x<W+22;x+=22){const h=3+Math.sin((x+groundOff)*0.4)*2;ctx.fillRect(x,PLAY_BOT-h,4,h+2);}
  ctx.fillStyle='#dcb478';ctx.fillRect(-60,PLAY_BOT+42,W+120,GROUND+60);
  ctx.fillStyle='#cf9f58';
  for(let i=-2;i*48-groundOff<W+48;i++)if(i&1)ctx.fillRect(i*48-groundOff,PLAY_BOT+42,48,GROUND+60);
}
function btnBg(x,y){ctx.fillStyle='rgba(0,0,0,0.35)';ctx.beginPath();ctx.arc(x,y,40,0,6.283);ctx.fill();}
function drawHUD(){
  ctx.textAlign='center';ctx.lineJoin='round';
  if(state!=='menu'){
    const ds=Math.round(displayScore),sp=1+scorePulse*0.08;
    ctx.save();ctx.translate(W/2,120);ctx.scale(sp,sp);
    ctx.font='900 88px system-ui,Arial';
    ctx.lineWidth=8;ctx.strokeStyle='rgba(0,0,0,0.45)';ctx.strokeText(String(ds),0,0);
    ctx.fillStyle='#fff';ctx.fillText(String(ds),0,0);
    ctx.restore();
    if(combo>1){
      const pu=1+0.12*Math.sin(tGlobal*8);
      ctx.font='900 34px system-ui,Arial';
      ctx.save();ctx.translate(W/2,172);ctx.scale(pu,pu);
      ctx.lineWidth=5;ctx.strokeStyle='rgba(0,0,0,0.45)';ctx.strokeText('COMBO x'+combo,0,0);
      ctx.fillStyle='#ffd23e';ctx.fillText('COMBO x'+combo,0,0);
      ctx.restore();
    }
    /* barras de power-ups */
    let by=200;
    const bar=(v,col,label)=>{
      ctx.fillStyle='rgba(10,25,40,0.55)';rr(W/2-140,by,280,12,6);ctx.fill();
      ctx.fillStyle=col;rr(W/2-140,by,Math.max(12,280*v),12,6);ctx.fill();
      ctx.font='700 16px system-ui,Arial';ctx.fillStyle=col;ctx.fillText(label,W/2,by+32);by+=46;
    };
    if(slowT>0)bar(slowT/4,'#41c7ff','CÂMERA LENTA');
    if(magnetT>0)bar(magnetT/5,'#ff8cd2','ÍMÃ');
    if(shieldOn){ctx.font='700 22px system-ui,Arial';ctx.fillStyle='#6ef2ff';ctx.fillText('🛡 ESCUDO',W/2,by+16);}
    if(state==='playing'){/* botão pausa */
      btnBg(64,64);ctx.fillStyle='#fff';ctx.fillRect(50,46,10,36);ctx.fillRect(68,46,10,36);
    }
    if(levelBanner>0){
      const a=Math.min(1,levelBanner*2,(2-levelBanner)*4);
      ctx.globalAlpha=a;ctx.font='900 64px system-ui,Arial';
      ctx.lineWidth=8;ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.strokeText('NÍVEL '+level,W/2,H*0.36);
      ctx.fillStyle='#7dff9a';ctx.fillText('NÍVEL '+level,W/2,H*0.36);
      if(level===3){ctx.font='700 26px system-ui,Arial';ctx.fillStyle='#fff';ctx.fillText('tubos começam a se mover!',W/2,H*0.36+44);}
      ctx.globalAlpha=1;
    }
  }
  const mx=W-64,my=64;
  btnBg(mx,my);
  ctx.fillStyle=muted?'#ff7b7b':'#fff';
  ctx.beginPath();ctx.moveTo(mx-16,my-8);ctx.lineTo(mx-6,my-8);ctx.lineTo(mx+6,my-18);
  ctx.lineTo(mx+6,my+18);ctx.lineTo(mx-6,my+8);ctx.lineTo(mx-16,my+8);ctx.closePath();ctx.fill();
  ctx.lineWidth=3;
  if(!muted){ctx.strokeStyle='#fff';
    ctx.beginPath();ctx.arc(mx+10,my,9,-0.9,0.9);ctx.stroke();
    ctx.beginPath();ctx.arc(mx+10,my,16,-0.9,0.9);ctx.stroke();
  }else{ctx.strokeStyle='#ff7b7b';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(mx+10,my-10);ctx.lineTo(mx+26,my+10);ctx.moveTo(mx+26,my-10);ctx.lineTo(mx+10,my+10);ctx.stroke();}
}
let titleG=null;
function drawMenu(){
  ctx.textAlign='center';ctx.lineJoin='round';
  const ty=H*0.21,ts=Math.min(100,Math.floor(W*0.12));
  ctx.font='900 '+ts+'px system-ui,Arial';
  if(!titleG){titleG=ctx.createLinearGradient(0,ty-80,0,ty+20);titleG.addColorStop(0,'#fff6b0');titleG.addColorStop(0.5,'#ffd23e');titleG.addColorStop(1,'#ff9d3d');}
  const bob=Math.sin(tGlobal*2)*6;
  ctx.lineWidth=10;ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.strokeText('FLAPPY AURORA',W/2,ty+bob);
  ctx.fillStyle=titleG;ctx.fillText('FLAPPY AURORA',W/2,ty+bob);
  ctx.font='600 26px system-ui,Arial';ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.fillText('combos · escudos · câmera lenta · ímã',W/2,ty+50);
  const fs=Math.min(21,W/26);
  ctx.font='500 '+fs+'px system-ui,Arial';ctx.fillStyle='rgba(255,255,255,0.8)';
  const ly=ty+110;
  ['Toque / Espaço voa · Segure para deslizar','Faixa branca = PERFEITO (combo até x5)','Raspar na borda = +1 bônus','Escudo · Relógio = câmera lenta · Ímã = guia'].forEach((t,i)=>ctx.fillText(t,W/2,ly+i*34));
  if(best>0){ctx.font='700 28px system-ui,Arial';ctx.fillStyle='#ffd23e';ctx.fillText('RECORDE: '+best,W/2,ly+170);}
  ctx.globalAlpha=0.45+0.55*Math.sin(tGlobal*3);
  ctx.font='800 42px system-ui,Arial';ctx.fillStyle='#fff';ctx.fillText('Toque para começar',W/2,H*0.85);
  ctx.globalAlpha=1;
  ctx.save();ctx.translate(W*0.12,H*0.33+Math.sin(tGlobal*1.5)*30);ctx.scale(0.5,0.5);ctx.rotate(-0.2+Math.sin(tGlobal*2)*0.1);birdShape();ctx.restore();
  ctx.save();ctx.translate(W*0.88,H*0.36+Math.cos(tGlobal*1.2)*25);ctx.scale(0.38,0.38);ctx.rotate(0.15+Math.cos(tGlobal*1.8)*0.1);birdShape();ctx.restore();
}
function drawDead(){
  const cw2=Math.min(600,W-50),ch2=500,cx=W/2-cw2/2,cy=H*0.08;
  const e=Math.min(1,(deadT-1)*4),ease=1-Math.pow(1-e,3);
  ctx.save();ctx.globalAlpha=e;ctx.translate(0,(1-ease)*60);
  ctx.fillStyle='rgba(12,20,35,0.9)';rr(cx,cy,cw2,ch2,24);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=2;ctx.stroke();
  ctx.textAlign='center';
  ctx.font='900 58px system-ui,Arial';ctx.fillStyle='#fff';ctx.fillText('FIM DE JOGO',W/2,cy+78);
  const md=medal(score);
  const scx=md?W/2+70:W/2;
  if(md){/* medalha */
    const mx=W/2-110,my=cy+180;
    ctx.fillStyle=md[2];ctx.beginPath();ctx.arc(mx,my,48,0,6.283);ctx.fill();
    ctx.fillStyle=md[1];ctx.beginPath();ctx.arc(mx,my,40,0,6.283);ctx.fill();
    ctx.fillStyle=md[2];ctx.font='900 34px system-ui,Arial';ctx.fillText('★',mx,my+12);
    ctx.font='800 16px system-ui,Arial';ctx.fillStyle=md[1];ctx.fillText(md[0],mx,my+72);
  }
  ctx.font='700 22px system-ui,Arial';ctx.fillStyle='rgba(255,255,255,0.5)';ctx.fillText('PONTUAÇÃO',scx,cy+130);
  ctx.font='900 76px system-ui,Arial';ctx.fillStyle='#ffd23e';ctx.fillText(String(score),scx,cy+206);
  if(newBest){
    ctx.globalAlpha=e*(0.7+0.3*Math.sin(tGlobal*5));
    ctx.font='800 28px system-ui,Arial';ctx.fillStyle='#7dff9a';ctx.fillText('NOVO RECORDE!',scx,cy+246);
    ctx.globalAlpha=e;
  }else{ctx.font='700 24px system-ui,Arial';ctx.fillStyle='rgba(255,255,255,0.55)';ctx.fillText('RECORDE: '+best,scx,cy+246);}
  const sy=cy+310,cols=[['Perfeitos',String(statPerfects),'#fff6a8'],['Combo Máx','x'+Math.max(1,statMaxCombo),'#ffd23e'],['Tubos',String(statPipes),'#6ef2ff'],['Raspadas',String(statNear),'#ff9df0']];
  const colW=cw2/4;
  cols.forEach((c,i)=>{const x=cx+colW*(i+0.5);
    ctx.font='600 18px system-ui,Arial';ctx.fillStyle='rgba(255,255,255,0.45)';ctx.fillText(c[0],x,sy);
    ctx.font='800 34px system-ui,Arial';ctx.fillStyle=c[2];ctx.fillText(c[1],x,sy+40);});
  ctx.globalAlpha=e*(0.5+0.5*Math.sin(tGlobal*3));
  ctx.font='700 30px system-ui,Arial';ctx.fillStyle='#fff';ctx.fillText('Toque para jogar de novo',W/2,cy+ch2-40);
  ctx.restore();
}
function drawPaused(){
  ctx.fillStyle='rgba(8,14,28,0.6)';ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.font='900 72px system-ui,Arial';ctx.fillStyle='#fff';ctx.fillText('PAUSADO',W/2,H*0.42);
  ctx.font='600 28px system-ui,Arial';ctx.fillStyle='rgba(255,255,255,0.75)';ctx.fillText('Toque ou P para continuar',W/2,H*0.42+56);
}
function drawTutorial(){
  ctx.globalAlpha=0.85;
  ctx.fillStyle='rgba(0,0,0,0.45)';rr(W/2-230,H*0.55,460,110,18);ctx.fill();
  ctx.textAlign='center';
  ctx.font='700 26px system-ui,Arial';ctx.fillStyle='#fff';ctx.fillText('Toque para voar!',W/2,H*0.55+38);
  ctx.font='500 19px system-ui,Arial';ctx.fillStyle='rgba(255,255,255,0.8)';ctx.fillText('Segure para deslizar suavemente',W/2,H*0.55+72);
  ctx.font='500 17px system-ui,Arial';ctx.fillStyle='rgba(255,246,168,0.9)';ctx.fillText('Mire na faixa branca para PERFEITO!',W/2,H*0.55+96);
  ctx.globalAlpha=1;
}
function render(){
  const k=cv.height/H;
  ctx.setTransform(k,0,0,k,0,0);
  const n=nightVal();
  if(shakeT>0){const m=shakeT*28;ctx.translate((Math.random()*2-1)*m,(Math.random()*2-1)*m);}
  ctx.save();
  drawSky();drawStars(n);drawAurora(n);drawCelestial(n);drawClouds(n);drawFireflies(n);drawHills();
  for(const p of pipes)drawPipe(p);
  for(const p of pipes)if(p.pu)drawPU(p.x+PW/2,p.gapY+p.pu.off,p.pu.kind);
  drawGround();drawParticles();drawBird();drawPops();
  ctx.restore();
  ctx.drawImage(offVign,0,0,offVign.width,offVign.height,0,0,W,H);
  if(n>0){ctx.fillStyle='rgba(8,12,40,'+(n*0.28).toFixed(3)+')';ctx.fillRect(-60,-60,W+120,H+120);}
  if(slowT>0){ctx.fillStyle='rgba(80,200,255,0.06)';ctx.fillRect(-60,-60,W+120,H+120);}
  if(flashT>0){ctx.globalAlpha=Math.min(1,flashT*5);ctx.fillStyle=flashColor;ctx.fillRect(-60,-60,W+120,H+120);ctx.globalAlpha=1;}
  ctx.setTransform(k,0,0,k,0,0);
  drawHUD();
  if(state==='menu')drawMenu();
  if(state==='paused')drawPaused();
  if(state==='dead'&&deadT>1.0)drawDead();
  if(!tutorialDone&&state==='playing'&&pipesPassed<3)drawTutorial();
}

/* ==================== LOOP ==================== */
let lastT=performance.now()/1000,acc=0,raf=0;
function adjustPerf(){
  if(perfEma>0.028&&RS>0.6){RS=Math.max(0.6,Math.round((RS-0.1)*10)/10);resize();}
  else if(perfEma<0.015&&RS<1){RS=Math.min(1,Math.round((RS+0.1)*10)/10);resize();}
}
function frame(now){
  if(!alive)return;
  raf=requestAnimationFrame(frame);
  const t=now/1000;
  let raw=t-lastT;lastT=t;if(raw<0)raw=0;
  if(raw<0.25)perfEma=perfEma*0.9+Math.min(raw,0.1)*0.1;
  if(t-lastPerfAdj>0.6&&document.visibilityState==='visible'){lastPerfAdj=t;adjustPerf();}
  acc+=Math.min(0.1,raw);
  let steps=0;
  while(acc>=STEP&&steps<12){update(STEP);acc-=STEP;steps++;}
  if(steps>=12)acc=0;
  render();
}
raf=requestAnimationFrame(frame);

return ()=>{
  alive=false;cancelAnimationFrame(raf);
  cv.removeEventListener('pointerdown',onDown);
  removeEventListener('pointerup',onUp);removeEventListener('pointercancel',onUp);
  removeEventListener('keydown',onKey);removeEventListener('keyup',onKeyUp);
  removeEventListener('resize',resize);removeEventListener('blur',onVis);
  document.removeEventListener('visibilitychange',onVis);
  try{AC&&AC.close();}catch(e){}
};
}
