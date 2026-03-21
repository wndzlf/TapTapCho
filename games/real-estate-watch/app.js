const state = {
  region: "all",
  data: null,
  snapshotSource: "",
};

const regionOptions = [
  { id: "all", label: "전체" },
  { id: "seoul", label: "서울" },
  { id: "gyeonggi", label: "경기" },
];

const statsGrid = document.getElementById("stats-grid");
const priceFeedList = document.getElementById("price-feed-list");
const priceFeedNote = document.getElementById("price-feed-note");
const contractFeedList = document.getElementById("contract-feed-list");
const contractFeedNote = document.getElementById("contract-feed-note");
const snapshotChip = document.getElementById("snapshot-chip");
const heroStatus = document.getElementById("hero-status");
const regionFilter = document.getElementById("region-filter");

function getMetaContent(name) {
  return document
    .querySelector(`meta[name="${name}"]`)
    ?.getAttribute("content")
    ?.trim();
}

function getSnapshotCandidates() {
  const candidates = [
    { url: getMetaContent("live-snapshot-url"), label: "Vercel" },
    { url: getMetaContent("backup-snapshot-url"), label: "GitHub Raw" },
    { url: getMetaContent("snapshot-path"), label: "번들 JSON" },
    { url: "./latest-transactions.json", label: "번들 JSON" },
    { url: "../latest-transactions.json", label: "번들 JSON" },
  ].filter((candidate) => candidate.url);

  return candidates.filter((candidate, index, array) => {
    return array.findIndex((entry) => entry.url === candidate.url) === index;
  });
}

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

function getFilteredItems() {
  if (!state.data) {
    return [];
  }

  return (state.data.items || []).filter((item) => {
    return state.region === "all" ? true : item.region === state.region;
  });
}

function rankItems(items, mode) {
  const ranked = [...items];

  ranked.sort((left, right) => {
    if (mode === "price") {
      if (right.priceManwon !== left.priceManwon) {
        return right.priceManwon - left.priceManwon;
      }
      return new Date(right.contractDate) - new Date(left.contractDate);
    }

    if (mode === "contract") {
      const rightContract = new Date(right.contractDate).getTime();
      const leftContract = new Date(left.contractDate).getTime();
      if (rightContract !== leftContract) {
        return rightContract - leftContract;
      }
      return right.priceManwon - left.priceManwon;
    }

    const rightSeen = new Date(right.firstSeenAt || right.officialCheckedAt).getTime();
    const leftSeen = new Date(left.firstSeenAt || left.officialCheckedAt).getTime();
    return rightSeen - leftSeen;
  });

  return ranked;
}

function getRegionLabel(regionId) {
  if (regionId === "seoul") {
    return "서울";
  }

  if (regionId === "gyeonggi") {
    return "경기";
  }

  return "서울·경기 전체";
}

function buildViewFromItems(items, regionId) {
  const safeItems = Array.isArray(items) ? items : [];
  const priceTop10 = rankItems(safeItems, "price").slice(0, 10);
  const contractTop10 = rankItems(safeItems, "contract").slice(0, 10);

  return {
    label: getRegionLabel(regionId),
    itemCount: safeItems.length,
    averagePriceManwon: safeItems.length
      ? Math.round(safeItems.reduce((total, item) => total + item.priceManwon, 0) / safeItems.length)
      : 0,
    highestPriceItem: priceTop10[0] || null,
    latestContractItem: contractTop10[0] || null,
    priceTop10,
    contractTop10,
  };
}

function getRegionView() {
  if (!state.data) {
    return null;
  }

  if (state.data.views?.[state.region]) {
    return state.data.views[state.region];
  }

  return buildViewFromItems(getFilteredItems(), state.region);
}

function buildTransactionCards(items) {
  return items
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
              <span class="key">실거래가</span>
              <span class="value">${formatManwon(item.priceManwon)}</span>
            </div>
          </div>

        </article>
      `;
    })
    .join("");
}

function renderStats(view) {
  if (!view || !view.itemCount) {
    statsGrid.innerHTML = `
      <article class="stat-card">
        <div class="stat-label">상태</div>
        <div class="stat-value">0건</div>
        <div class="stat-foot">조건에 맞는 거래가 없습니다.</div>
      </article>
    `;
    heroStatus.textContent = "조건에 맞는 거래가 없습니다.";
    return;
  }

  const average = view.averagePriceManwon;
  const highest = view.highestPriceItem;
  const latestContract = view.latestContractItem;
  const regionLabel = view.label || getRegionLabel(state.region);

  statsGrid.innerHTML = `
    <article class="stat-card">
      <div class="stat-label">수집 거래</div>
      <div class="stat-value">${view.itemCount}건</div>
      <div class="stat-foot">${regionLabel} 기준</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">평균 거래금액</div>
      <div class="stat-value">${formatEok(average)}</div>
      <div class="stat-foot">${formatManwon(average)}</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">최고 거래</div>
      <div class="stat-value">${highest ? formatEok(highest.priceManwon) : "-"}</div>
      <div class="stat-foot">${highest ? `${highest.district} · ${highest.apartmentName}` : "-"}</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">최근 계약일</div>
      <div class="stat-value">${latestContract ? formatDate(latestContract.contractDate) : "-"}</div>
      <div class="stat-foot">${latestContract ? latestContract.apartmentName : "조건에 맞는 거래 없음"}</div>
    </article>
  `;

  heroStatus.textContent = `${formatDateTime(state.data.updatedAt)} 스냅샷 업데이트${state.snapshotSource ? ` · ${state.snapshotSource}` : ""}`;
}

function renderRankedFeed(target, noteTarget, view, mode) {
  const visibleItems = mode === "price" ? (view?.priceTop10 || []) : (view?.contractTop10 || []);
  const totalCount = view?.itemCount || 0;

  if (mode === "price") {
    noteTarget.textContent = `총 ${totalCount}건 중 상위 ${visibleItems.length}건 · 거래금액순`;
  } else {
    noteTarget.textContent = `총 ${totalCount}건 중 상위 ${visibleItems.length}건 · 계약일 최신순`;
  }

  if (!visibleItems.length) {
    target.innerHTML = `
      <article class="placeholder-card">조건에 맞는 거래가 없습니다.</article>
    `;
    return;
  }

  target.innerHTML = buildTransactionCards(visibleItems);
}

function render() {
  const view = getRegionView();
  renderStats(view);
  renderRankedFeed(priceFeedList, priceFeedNote, view, "price");
  renderRankedFeed(contractFeedList, contractFeedNote, view, "contract");
  renderFilters(regionFilter, regionOptions, state.region, (regionId) => {
    state.region = regionId;
    render();
  });
}

async function fetchSnapshotCandidate(candidate) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    return await fetch(candidate.url, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function init() {
  try {
    let response = null;
    let snapshotSource = "";

    for (const candidate of getSnapshotCandidates()) {
      try {
        const candidateResponse = await fetchSnapshotCandidate(candidate);
        if (candidateResponse.ok) {
          response = candidateResponse;
          snapshotSource = candidate.label;
          break;
        }
      } catch (error) {
        console.warn(`[real-estate-watch] Failed to fetch ${candidate.label}: ${candidate.url}`, error);
      }
    }

    if (!response) {
      throw new Error("Failed to load JSON snapshot.");
    }

    state.data = await response.json();
    state.snapshotSource = snapshotSource;
    snapshotChip.textContent = state.data.snapshotMode === "demo"
      ? `예시 스냅샷${snapshotSource ? ` · ${snapshotSource}` : ""}`
      : `자동 스냅샷${snapshotSource ? ` · ${snapshotSource}` : ""}`;
    render();
  } catch (error) {
    console.error(error);
    heroStatus.textContent = "데이터를 불러오지 못했습니다.";
    priceFeedNote.textContent = "JSON 스냅샷을 확인해 주세요.";
    contractFeedNote.textContent = "JSON 스냅샷을 확인해 주세요.";
    const placeholder = `
      <article class="placeholder-card">
        정적 데이터를 불러오지 못했습니다. <br />
        <code>real-estate-watch/latest-transactions.json</code> 파일을 확인해 주세요.
      </article>
    `;
    priceFeedList.innerHTML = placeholder;
    contractFeedList.innerHTML = placeholder;
  }
}

init();
