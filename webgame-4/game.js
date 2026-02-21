const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const playersEl = document.getElementById('players');
const resultsEl = document.getElementById('results');
const rungsEl = document.getElementById('rungs');
const btnDraw = document.getElementById('btnDraw');
const btnShuffle = document.getElementById('btnShuffle');

function parseList(val){
  return val.split(',').map(s=>s.trim()).filter(Boolean);
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}

function generate(){
  let players = parseList(playersEl.value);
  let results = parseList(resultsEl.value);
  const rungs = Math.min(30, Math.max(6, Number(rungsEl.value||12)));

  if(players.length < 2) return;
  if(results.length !== players.length){
    // pad or trim results
    if(results.length < players.length){
      while(results.length < players.length) results.push('Safe');
    } else {
      results = results.slice(0, players.length);
    }
    resultsEl.value = results.join(', ');
  }

  drawLadder(players, results, rungs);
}

function drawLadder(players, results, rungs){
  ctx.clearRect(0,0,canvas.width, canvas.height);
  const W = canvas.width, H = canvas.height;
  const top = 60, bottom = H-60;
  const cols = players.length;
  const gap = (W-120)/(cols-1);
  const x0 = 60;

  // vertical lines
  ctx.strokeStyle = '#66f0ff';
  ctx.lineWidth = 2;
  for(let i=0;i<cols;i++){
    const x = x0 + i*gap;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }

  // horizontal rungs (random)
  const rungYs = [];
  for(let i=0;i<rungs;i++){
    const y = top + ((bottom-top)/(rungs+1))*(i+1);
    rungYs.push(y);
  }

  const connections = []; // {y, i}
  for(const y of rungYs){
    for(let i=0;i<cols-1;i++){
      if(Math.random() < 0.35){
        connections.push({y, i});
      }
    }
  }

  // draw rungs
  ctx.strokeStyle = '#ff7b00';
  ctx.lineWidth = 3;
  for(const c of connections){
    const x1 = x0 + c.i*gap;
    const x2 = x0 + (c.i+1)*gap;
    ctx.beginPath();
    ctx.moveTo(x1, c.y);
    ctx.lineTo(x2, c.y);
    ctx.stroke();
  }

  // labels
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  for(let i=0;i<cols;i++){
    const x = x0 + i*gap;
    ctx.fillText(players[i], x, top-18);
    ctx.fillText(results[i], x, bottom+26);
  }
}

btnDraw.addEventListener('click', generate);
btnShuffle.addEventListener('click', ()=>{
  const players = parseList(playersEl.value);
  const results = parseList(resultsEl.value);
  shuffle(players);
  shuffle(results);
  playersEl.value = players.join(', ');
  resultsEl.value = results.join(', ');
  generate();
});

// initial draw
generate();
