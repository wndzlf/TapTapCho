const trips = [
  {
    date: '2024-03-18',
    location: '하노이',
    note: '골목 카페 투어 + 야시장',
    photos: [
      { label: '호안끼엠 호수', colors: ['#ffd9e6', '#ff7aa2'], score: 92 },
      { label: '카페 거리', colors: ['#ffc7a1', '#ff9f7a'], score: 88 },
      { label: '야시장', colors: ['#ffd27a', '#ff7a7a'], score: 85 }
    ]
  },
  {
    date: '2024-05-02',
    location: '다낭',
    note: '바다 + 해산물 + 야경',
    photos: [
      { label: '미케 비치', colors: ['#7ad6ff', '#3c7bff'], score: 95 },
      { label: '선셋 브릿지', colors: ['#ffb36b', '#ff5f6b'], score: 90 },
      { label: '해산물', colors: ['#ffda6b', '#ff9b6b'], score: 80 }
    ]
  },
  {
    date: '2024-10-21',
    location: '방콕',
    note: '템플 + 루프탑 바',
    photos: [
      { label: '왓아룬', colors: ['#9df3c4', '#1dd3b0'], score: 93 },
      { label: '루프탑', colors: ['#c7a7ff', '#6a5bff'], score: 89 },
      { label: '툭툭', colors: ['#ffd27a', '#ff9f1c'], score: 84 }
    ]
  }
];

const wishInitial = [
  { name: '오사카', me: 1, partner: 0, best: '봄/가을' },
  { name: '파리', me: 0, partner: 1, best: '초여름' },
  { name: '프라하', me: 1, partner: 1, best: '가을' }
];

const locationGrid = document.getElementById('location-grid');
const timelineEl = document.getElementById('timeline');
const heroTitle = document.getElementById('hero-title');
const heroSub = document.getElementById('hero-sub');
const heroPhoto = document.getElementById('hero-photo');

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function renderTimeline() {
  const sorted = [...trips].sort((a, b) => new Date(b.date) - new Date(a.date));
  timelineEl.innerHTML = '';
  sorted.forEach((trip) => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-dot"></div>
      <div>
        <strong>${formatDate(trip.date)} · ${trip.location}</strong>
        <span>${trip.note}</span>
      </div>
    `;
    timelineEl.appendChild(item);
  });

  const heroTrip = sorted[0];
  const rep = pickRepresentative(heroTrip.photos);
  heroTitle.textContent = `${heroTrip.location} 대표컷`;
  heroSub.textContent = heroTrip.note;
  heroPhoto.style.background = gradientFromColors(rep.colors);
  heroPhoto.innerHTML = `<span>${rep.label}</span>`;
}

function pickRepresentative(photos) {
  return photos.reduce((best, photo) => (photo.score > best.score ? photo : best), photos[0]);
}

function gradientFromColors(colors) {
  return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
}

function renderLocations() {
  locationGrid.innerHTML = '';
  trips.forEach((trip) => {
    const card = document.createElement('div');
    card.className = 'location-card';
    const rep = pickRepresentative(trip.photos);
    const sortedPhotos = [rep, ...trip.photos.filter((p) => p !== rep)];
    card.innerHTML = `
      <div class="location-header">
        <h3>${trip.location}</h3>
        <div class="location-meta">${formatDate(trip.date)} · ${trip.photos.length}장</div>
      </div>
      <div class="photo-stack"></div>
    `;
    const stack = card.querySelector('.photo-stack');
    sortedPhotos.forEach((photo, idx) => {
      const item = document.createElement('div');
      item.className = `photo${idx === 0 ? ' badge' : ''}`;
      item.style.background = gradientFromColors(photo.colors);
      item.innerHTML = `<span>${photo.label}</span>`;
      stack.appendChild(item);
    });
    locationGrid.appendChild(card);
  });
}

const wishInput = document.getElementById('wish-input');
const wishOwner = document.getElementById('wish-owner');
const wishAdd = document.getElementById('wish-add');
const wishItems = document.getElementById('wishlist-items');
const wishReco = document.getElementById('wishlist-reco');

let wishlist = [...wishInitial];

function renderWishlist() {
  wishItems.innerHTML = '';
  wishlist.forEach((item) => {
    const total = item.me + item.partner;
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <div><span>내가 찜 ${item.me} · 상대 찜 ${item.partner}</span></div>
      </div>
      <span>총 ${total}</span>
    `;
    wishItems.appendChild(li);
  });

  if (!wishlist.length) {
    wishReco.textContent = '아직 후보지가 없어요. 위시리스트를 추가해주세요.';
    return;
  }

  const sorted = [...wishlist].sort((a, b) => b.me + b.partner - (a.me + a.partner));
  const best = sorted[0];
  const bestSeason = best.best || '연중';
  wishReco.textContent = `가장 많이 찜한 곳은 ${best.name}. 추천 시즌: ${bestSeason}.`;
}

function addWish() {
  const name = wishInput.value.trim();
  if (!name) return;
  const owner = wishOwner.value;
  let existing = wishlist.find((item) => item.name === name);
  if (!existing) {
    existing = { name, me: 0, partner: 0, best: '연중' };
    wishlist.push(existing);
  }
  existing[owner] += 1;
  wishInput.value = '';
  renderWishlist();
}

wishAdd.addEventListener('click', addWish);
wishInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addWish();
});

renderTimeline();
renderLocations();
renderWishlist();
