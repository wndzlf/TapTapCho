const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

const W = canvas.width, H = canvas.height;
let running=false, score=0, t=0;
let best = Number(localStorage.getItem('lane-best')||0);
bestEl.textContent = best;

const lanes = [W*0.25, W*0.5, W*0.75];
const player = { lane: 1, y: H-90, w: 36, h: 36 };
let obstacles = [];

function reset(){
  running=false; score=0; t=0; obstacles=[]; player.lane=1;
  scoreEl.textContent = score;
}

function spawn(){
  const lane = Math.floor(Math.random()*3);
  obstacles.push({ lane, y: -40, w: 40, h: 40, v: 3.0 + Math.min(2, score/350) });
}

function collide(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function update(){
  if(!running) return;
  t++;
  if(t % 40 === 0) spawn();

  for(const o of obstacles) o.y += o.v;
  obstacles = obstacles.filter(o => o.y < H+50);

  const pBox = { x: lanes[player.lane]-player.w/2, y: player.y-player.h/2, w: player.w, h: player.h };
  for(const o of obstacles){
    const oBox = { x: lanes[o.lane]-o.w/2, y: o.y, w: o.w, h: o.h };
    if(collide(pBox, oBox)){
      running=false;
      best = Math.max(best, score);
      localStorage.setItem('lane-best', best);
      bestEl.textContent = best;
    }
  }

  score += 1;
  scoreEl.textContent = score;
}

function render(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0,0,W,H);

  // lanes
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  for(let i=1;i<3;i++){
    ctx.beginPath();
    ctx.moveTo(W*i/3, 0);
    ctx.lineTo(W*i/3, H);
    ctx.stroke();
  }

  // player
  ctx.fillStyle = '#ff5f9e';
  ctx.fillRect(lanes[player.lane]-player.w/2, player.y-player.h/2, player.w, player.h);

  // obstacles
  ctx.fillStyle = '#66f0ff';
  for(const o of obstacles){
    ctx.fillRect(lanes[o.lane]-o.w/2, o.y, o.w, o.h);
  }

  if(!running){
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Tap / Click to Start', W/2, H/2 - 8);
  }
}

function loop(){ update(); render(); requestAnimationFrame(loop); }
loop();

function moveLeft(){ player.lane = Math.max(0, player.lane-1); }
function moveRight(){ player.lane = Math.min(2, player.lane+1); }

window.addEventListener('keydown', (e)=>{
  if(e.key==='ArrowLeft' || e.key==='a') moveLeft();
  if(e.key==='ArrowRight' || e.key==='d') moveRight();
  if(e.key===' ') { if(!running){ reset(); running=true; } }
});

canvas.addEventListener('pointerdown', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if(!running){ reset(); running=true; return; }
  if(x < rect.width/2) moveLeft(); else moveRight();
});
