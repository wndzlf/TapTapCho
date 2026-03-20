const state = {
  region: "all",
  sort: "official",
  data: null,
};

const regionOptions = [
  { id: "all", label: "전체" },
  { id: "seoul", label: "서울" },
  { id: "gyeonggi", label: "경기" },
];

const sortOptions = [
  { id: "official", label: "첫 확인순" },
  { id: "price", label: "거래금액순" },
];

const statsGrid = document.getElementById("stats-grid");
const feedList = document.getElementById("feed-list");
const feedNote = document.getElementById("feed-note");
const snapshotChip = document.getElementById("snapshot-chip");
const heroStatus = document.getElementById("hero-status");
const regionFilter = document.getElementById("region-filter");
const sortFilter = document.getElementById("sort-filter");

function formatEok(priceManwon) {
  return `${(priceManwon / 10000).toLocaleString("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}억`;
}

function formatManwon(priceManwon) {
  return `${priceManwon.toLocaleString("ko-KR")}만원`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getFilteredItems() {
  if (!state.data) {
    return [];
  }

  const filtered = state.data.items.filter((item) => {
    return state.region === "all" ? true : item.region === state.region;
  });

  filtered.sort((left, right) => {
    if (state.sort === "price") {
      return right.priceManwon - left.priceManwon;
    }

    const leftSeenAt = new Date(left.firstSeenAt || left.officialCheckedAt).getTime();
    const rightSeenAt = new Date(right.firstSeenAt || right.officialCheckedAt).getTime();
    return rightSeenAt - leftSeenAt;
  });

  return filtered;
}

function renderFilters(target, options, selectedId, onChange) {
  target.innerHTML = "";

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.className = `filter-button${selectedId === option.id ? " is-active" : ""}`;
    button.addEventListener("click", () => onChange(option.id));
    target.appendChild(button);
  });
}

function renderStats(items) {
  const visibleItems = items.slice(0, 10);

  if (!visibleItems.length) {
    statsGrid.innerHTML = `
      <article class="stat-card">
        <div class="stat-label">상태</div>
        <div class="stat-value">0건</div>
        <div class="stat-foot">조건에 맞는 거래가 없습니다.</div>
      </article>
    `;
    return;
  }

  const average = Math.round(
    visibleItems.reduce((total, item) => total + item.priceManwon, 0) / visibleItems.length,
  );
  const highest = visibleItems.reduce((best, item) => {
    return item.priceManwon > best.priceManwon ? item : best;
  }, visibleItems[0]);
  const regionLabel = state.region === "all" ? "서울·경기 전체" : visibleItems[0].regionLabel;

  statsGrid.innerHTML = `
    <article class="stat-card">
      <div class="stat-label">노출 거래</div>
      <div class="stat-value">${visibleItems.length}건</div>
      <div class="stat-foot">${regionLabel} 기준</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">평균 거래금액</div>
      <div class="stat-value">${formatEok(average)}</div>
      <div class="stat-foot">${formatManwon(average)}</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">최고 거래</div>
      <div class="stat-value">${formatEok(highest.priceManwon)}</div>
      <div class="stat-foot">${highest.district} · ${highest.apartmentName}</div>
    </article>
  `;

  heroStatus.textContent = `${formatDateTime(state.data.updatedAt)} 스냅샷 업데이트`;
}

function renderFeed(items) {
  const visibleItems = items.slice(0, 10);
  feedNote.textContent = `총 ${items.length}건 중 상위 ${visibleItems.length}건 · ${
    state.sort === "official" ? "첫 확인순" : "거래금액순"
  }`;

  if (!visibleItems.length) {
    feedList.innerHTML = `
      <article class="placeholder-card">조건에 맞는 거래가 없습니다.</article>
    `;
    return;
  }

  feedList.innerHTML = visibleItems
    .map((item) => {
      return `
        <article class="transaction-card">
          <div class="transaction-top">
            <div class="location-stack">
              <span class="region-badge">${item.regionLabel}</span>
              <span class="district-badge">${item.district}</span>
            </div>
            <div class="price-block">
              <div class="price-label">거래금액</div>
              <div class="price-value">${formatEok(item.priceManwon)}</div>
            </div>
          </div>

          <h3 class="transaction-title">${item.apartmentName}</h3>
          <p class="transaction-meta">${item.neighborhood} · ${item.addressHint}</p>

          <div class="transaction-grid">
            <div class="transaction-kv">
              <span class="key">전용면적</span>
              <span class="value">${item.exclusiveAreaM2.toFixed(2)}㎡</span>
            </div>
            <div class="transaction-kv">
              <span class="key">층</span>
              <span class="value">${item.floor}층</span>
            </div>
            <div class="transaction-kv">
              <span class="key">계약일</span>
              <span class="value">${formatDate(item.contractDate)}</span>
            </div>
            <div class="transaction-kv">
              <span class="key">원문 금액</span>
              <span class="value">${formatManwon(item.priceManwon)}</span>
            </div>
          </div>

          <div class="transaction-foot">
            <div class="checked-at">
              첫 확인: ${formatDateTime(item.firstSeenAt || item.officialCheckedAt)}<br />
              스냅샷 갱신: ${formatDateTime(item.officialCheckedAt)}
            </div>
            <a class="transaction-link" href="${item.sourceUrl}" target="_blank" rel="noreferrer">공식 출처</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function render() {
  const items = getFilteredItems();
  renderStats(items);
  renderFeed(items);
  renderFilters(regionFilter, regionOptions, state.region, (regionId) => {
    state.region = regionId;
    render();
  });
  renderFilters(sortFilter, sortOptions, state.sort, (sortId) => {
    state.sort = sortId;
    render();
  });
}

async function init() {
  try {
    const response = await fetch("./latest-transactions.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load JSON: ${response.status}`);
    }

    state.data = await response.json();
    snapshotChip.textContent = state.data.snapshotMode === "demo" ? "예시 스냅샷" : "자동 스냅샷";
    render();
  } catch (error) {
    console.error(error);
    heroStatus.textContent = "데이터를 불러오지 못했습니다.";
    feedNote.textContent = "JSON 스냅샷을 확인해 주세요.";
    feedList.innerHTML = `
      <article class="placeholder-card">
        정적 데이터를 불러오지 못했습니다. <br />
        <code>real-estate-watch/latest-transactions.json</code> 파일을 확인해 주세요.
      </article>
    `;
  }
}

init();
