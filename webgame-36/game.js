const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const foundEl = document.getElementById('found');
const listEl = document.getElementById('list');
const btnNew = document.getElementById('btnNew');

let items = [];
let found = new Set();

function init() {
  items = [
    { name: 'Key', x: 60, y: 120, w: 40, h: 16, color: '#ffd86d' },
    { name: 'Gem', x: 300, y: 180, w: 24, h: 24, color: '#7cffc5' },
    { name: 'Scroll', x: 120, y: 300, w: 50, h: 18, color: '#6df3ff' },
    { name: 'Potion', x: 260, y: 360, w: 20, h: 32, color: '#ff7bd0' }
  ];
  found = new Set();
  renderList();
  foundEl.textContent = '0';
}

function renderList() {
  listEl.innerHTML = items.map(i => `<div>${found.has(i.name) ? '✅' : '⬜'} ${i.name}</div>`).join('');
}

function handleClick(x, y) {
  items.forEach((i) => {
    if (found.has(i.name)) return;
    if (x >= i.x && x <= i.x + i.w && y >= i.y && y <= i.y + i.h) {
      found.add(i.name);
      foundEl.textContent = String(found.size);
      renderList();
    }
  });
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // background clutter
  ctx.fillStyle = '#0f1d35';
  ctx.fillRect(40, 80, 340, 380);
  ctx.fillStyle = '#1f2a44';
  for (let i = 0; i < 8; i++) ctx.fillRect(60 + i*40, 260, 18, 70);

  items.forEach((i) => {
    if (found.has(i.name)) return;
    ctx.fillStyle = i.color;
    ctx.fillRect(i.x, i.y, i.w, i.h);
  });

  if (found.size === items.length) {
    ctx.fillStyle = 'rgba(5,8,15,0.6)';
    ctx.fillRect(40, 80, 340, 380);
    ctx.fillStyle = '#7cffc5';
    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('All Found!', canvas.width/2, canvas.height/2);
  }
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  handleClick(e.clientX - rect.left, e.clientY - rect.top);
});

btnNew.addEventListener('click', init);

init();
(function loop(){ draw(); requestAnimationFrame(loop); })();
