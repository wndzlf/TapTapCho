const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const itemsEl = document.getElementById('items');
const btnSpin = document.getElementById('btnSpin');
const btnShuffle = document.getElementById('btnShuffle');
const resultEl = document.getElementById('result');

let angle = 0;
let spinning = false;
let speed = 0;

function parseItems(){
  return itemsEl.value.split(',').map(s=>s.trim()).filter(Boolean);
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}

function draw(){
  const items = parseItems();
  const n = Math.max(2, items.length);
  const cx = canvas.width/2, cy = canvas.height/2;
  const r = Math.min(cx, cy) - 20;

  ctx.clearRect(0,0,canvas.width, canvas.height);
  for(let i=0;i<n;i++){
    const a0 = angle + (i * 2*Math.PI / n);
    const a1 = angle + ((i+1) * 2*Math.PI / n);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a0, a1);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#66f0ff' : '#ff5f9e';
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((a0+a1)/2);
    ctx.fillStyle = '#0b0f19';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(items[i] || 'Item', r-10, 5);
    ctx.restore();
  }

  // pointer
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r - 5);
  ctx.lineTo(cx - 10, cy - r - 25);
  ctx.lineTo(cx + 10, cy - r - 25);
  ctx.closePath();
  ctx.fill();
}

function update(){
  if(spinning){
    angle += speed;
    speed *= 0.985;
    if(speed < 0.002){
      spinning = false;
      speed = 0;
      pickResult();
    }
  }
}

function pickResult(){
  const items = parseItems();
  const n = Math.max(2, items.length);
  const idx = (n - Math.floor(((angle % (2*Math.PI)) / (2*Math.PI)) * n) - 1 + n) % n;
  resultEl.textContent = `Result: ${items[idx] || 'Item'}`;
}

function loop(){ update(); draw(); requestAnimationFrame(loop); }
loop();

btnSpin.addEventListener('click', ()=>{
  if(spinning) return;
  spinning = true;
  speed = 0.35 + Math.random()*0.25;
  resultEl.textContent = 'Spinning...';
});

btnShuffle.addEventListener('click', ()=>{
  const items = parseItems();
  shuffle(items);
  itemsEl.value = items.join(', ');
  resultEl.textContent = 'Ready';
});
