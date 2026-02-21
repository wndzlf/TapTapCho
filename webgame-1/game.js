const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width;
const H = canvas.height;

let running = false;
let score = 0;
let best = Number(localStorage.getItem('neon-best') || 0);
let t = 0;

const player = {
  x: W/2,
  y: H-90,
  w: 36,
  h: 36,
  vx: 0,
  speed: 5.5,
};

let obstacles = [];

function resetGame() {
  running = false;
  score = 0;
  t = 0;
  obstacles = [];
  player.x = W/2;
  player.vx = 0;
  scoreEl.textContent = score;
}

function spawnObstacle() {
  const size = 26 + Math.random()*28;
  const x = 10 + Math.random()*(W-20-size);
  const speed = 2.2 + Math.random()*2.2 + Math.min(2, score/400);
  obstacles.push({ x, y: -size, w: size, h: size, v: speed });
}

function collide(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function drawPlayer(){
  ctx.fillStyle = '#66f0ff';
  ctx.shadowColor = '#66f0ff';
  ctx.shadowBlur = 18;
  ctx.fillRect(player.x - player.w/2, player.y - player.h/2, player.w, player.h);
  ctx.shadowBlur = 0;
}

function drawObstacle(o){
  ctx.fillStyle = '#ff7b00';
  ctx.shadowColor = '#ff7b00';
  ctx.shadowBlur = 12;
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.shadowBlur = 0;
}

function update(){
  if(!running) return;
  t++;
  if(t % 38 === 0) spawnObstacle();

  // player move
  player.x += player.vx;
  player.x = Math.max(player.w/2, Math.min(W - player.w/2, player.x));

  // obstacles
  for (const o of obstacles) o.y += o.v;
  obstacles = obstacles.filter(o => o.y < H + 40);

  // collision
  for (const o of obstacles){
    const pBox = { x: player.x - player.w/2, y: player.y - player.h/2, w: player.w, h: player.h };
    if(collide(pBox, o)){
      running = false;
      best = Math.max(best, score);
      localStorage.setItem('neon-best', best);
      bestEl.textContent = best;
    }
  }

  // score
  score += 1;
  scoreEl.textContent = score;
}

function render(){
  ctx.clearRect(0,0,W,H);
  // background stars
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0,0,W,H);
  for(let i=0;i<40;i++){
    const y = (i*43 + t*0.7) % H;
    const x = (i*97) % W;
    ctx.fillStyle = 'rgba(180,210,255,0.4)';
    ctx.fillRect(x, y, 2, 2);
  }
  drawPlayer();
  obstacles.forEach(drawObstacle);

  if(!running){
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Tap / Click to Start', W/2, H/2 - 10);
    ctx.font = '16px system-ui';
    ctx.fillText('Space로 재시작 가능', W/2, H/2 + 24);
  }
}

function loop(){
  update();
  render();
  requestAnimationFrame(loop);
}
loop();

// input
let left=false,right=false;
function setVelocity(){
  if(left && !right) player.vx = -player.speed;
  else if(right && !left) player.vx = player.speed;
  else player.vx = 0;
}

window.addEventListener('keydown', (e)=>{
  if(e.key==='ArrowLeft' || e.key==='a') { left=true; setVelocity(); }
  if(e.key==='ArrowRight' || e.key==='d') { right=true; setVelocity(); }
  if(e.key===' ') { if(!running){ resetGame(); running=true; } }
});
window.addEventListener('keyup', (e)=>{
  if(e.key==='ArrowLeft' || e.key==='a') { left=false; setVelocity(); }
  if(e.key==='ArrowRight' || e.key==='d') { right=false; setVelocity(); }
});

canvas.addEventListener('pointerdown', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if(!running){ resetGame(); running=true; return; }
  if(x < rect.width/2) { left=true; right=false; }
  else { right=true; left=false; }
  setVelocity();
});
canvas.addEventListener('pointerup', ()=>{ left=false; right=false; setVelocity(); });
