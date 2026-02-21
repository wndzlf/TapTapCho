const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const btnStart = document.getElementById('btnStart');

const W = canvas.width, H = canvas.height;
let running=false, score=0, t=0;
let best = Number(localStorage.getItem('bounce-best')||0);
bestEl.textContent = best;

const paddle = { x: W/2, y: H-60, w: 110, h: 16, vx: 0, speed: 7 };
const ball = { x: W/2, y: H/2, r: 10, vx: 3, vy: -4 };

function reset(){
  running=false; score=0; t=0;
  paddle.x = W/2; paddle.vx=0;
  ball.x=W/2; ball.y=H/2; ball.vx=3; ball.vy=-4;
  scoreEl.textContent = score;
}

function update(){
  if(!running) return;
  t++;

  paddle.x += paddle.vx;
  paddle.x = Math.max(paddle.w/2, Math.min(W - paddle.w/2, paddle.x));

  ball.x += ball.vx; ball.y += ball.vy;

  if(ball.x - ball.r < 0 || ball.x + ball.r > W) ball.vx *= -1;
  if(ball.y - ball.r < 0) ball.vy *= -1;

  // paddle bounce
  if(ball.y + ball.r >= paddle.y - paddle.h/2 &&
     ball.y + ball.r <= paddle.y + paddle.h/2 &&
     ball.x >= paddle.x - paddle.w/2 &&
     ball.x <= paddle.x + paddle.w/2){
    ball.vy = -Math.abs(ball.vy) - 0.1;
    const dx = (ball.x - paddle.x) / (paddle.w/2);
    ball.vx = 4 * dx;
    score += 5;
    scoreEl.textContent = score;
  }

  if(ball.y - ball.r > H){
    running=false;
    best = Math.max(best, score);
    localStorage.setItem('bounce-best', best);
    bestEl.textContent = best;
  }
}

function render(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0,0,W,H);

  // ball
  ctx.fillStyle = '#7cff7c';
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fill();

  // paddle
  ctx.fillStyle = '#66f0ff';
  ctx.fillRect(paddle.x - paddle.w/2, paddle.y - paddle.h/2, paddle.w, paddle.h);

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

let left=false,right=false;
function setVel(){
  if(left && !right) paddle.vx = -paddle.speed;
  else if(right && !left) paddle.vx = paddle.speed;
  else paddle.vx = 0;
}

window.addEventListener('keydown', (e)=>{
  if(e.key==='ArrowLeft' || e.key==='a') { left=true; setVel(); }
  if(e.key==='ArrowRight' || e.key==='d') { right=true; setVel(); }
  if(e.key===' ') { if(!running){ reset(); running=true; } }
});
window.addEventListener('keyup', (e)=>{
  if(e.key==='ArrowLeft' || e.key==='a') { left=false; setVel(); }
  if(e.key==='ArrowRight' || e.key==='d') { right=false; setVel(); }
});

canvas.addEventListener('pointerdown', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if(!running){ reset(); running=true; return; }
  if(x < rect.width/2) { left=true; right=false; }
  else { right=true; left=false; }
  setVel();
});
canvas.addEventListener('pointerup', ()=>{ left=false; right=false; setVel(); });
