const state = {
  area: "all",
  industry: "all",
  data: null,
  selectedStoreId: null,
};

const refs = {
  heroStatus: document.getElementById("hero-status"),
  snapshotChip: document.getElementById("snapshot-chip"),
  endpointGrid: document.getElementById("endpoint-grid"),
  areaFilter: document.getElementById("area-filter"),
  industryFilter: document.getElementById("industry-filter"),
  statsGrid: document.getElementById("stats-grid"),
  categoryNote: document.getElementById("category-note"),
  categoryList: document.getElementById("category-list"),
  storeNote: document.getElementById("store-note"),
  storeList: document.getElementById("store-list"),
  rawCaption: document.getElementById("raw-caption"),
  requestPreview: document.getElementById("request-preview"),
  responsePreview: document.getElementById("response-preview"),
};

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

function countUnique(items, selector) {
  return new Set(items.map(selector).filter(Boolean)).size;
}

function groupBy(items, selector) {
  return items.reduce((accumulator, item) => {
    const key = selector(item);
    if (!key) {
      return accumulator;
    }

    accumulator.set(key, [...(accumulator.get(key) || []), item]);
    return accumulator;
  }, new Map());
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

function getAreaOptions() {
  const locations = state.data?.hierarchy?.locations || [];
  return [
    { id: "all", label: "전체 동네" },
    ...locations.map((location) => ({
      id: location.adongCd,
      label: `${location.signguNm} ${location.adongNm}`,
    })),
  ];
}

function getIndustryOptions() {
  const largeCategories = state.data?.hierarchy?.largeCategories || [];
  return [
    { id: "all", label: "전체 업종" },
    ...largeCategories.map((category) => ({
      id: category.indsLclsCd,
      label: category.indsLclsNm,
    })),
  ];
}

function getFilteredItems() {
  if (!state.data) {
    return [];
  }

  return state.data.items.filter((item) => {
    const areaMatched = state.area === "all" ? true : item.adongCd === state.area;
    const industryMatched = state.industry === "all" ? true : item.indsLclsCd === state.industry;
    return areaMatched && industryMatched;
  });
}

function ensureSelectedStore(items) {
  if (!items.length) {
    state.selectedStoreId = null;
    return;
  }

  const hasSelectedStore = items.some((item) => item.bizesId === state.selectedStoreId);
  if (!hasSelectedStore) {
    state.selectedStoreId = items[0].bizesId;
  }
}

function renderEndpoints() {
  refs.endpointGrid.innerHTML = (state.data?.endpoints || [])
    .map((endpoint, index) => {
      return `
        <article class="endpoint-card">
          <span class="endpoint-step">STEP ${String(index + 1).padStart(2, "0")}</span>
          <h3>${endpoint.label}</h3>
          <p>${endpoint.summary}</p>
          <code>${endpoint.path}${endpoint.requestHint ? ` · ${endpoint.requestHint}` : ""}</code>
        </article>
      `;
    })
    .join("");
}

function renderStats(items) {
  if (!items.length) {
    refs.statsGrid.innerHTML = `
      <article class="stat-card">
        <div class="stat-label">상태</div>
        <div class="stat-value">0건</div>
        <div class="stat-foot">현재 조건에 맞는 샘플 점포가 없습니다.</div>
      </article>
    `;
    return;
  }

  const totalFields = countUnique(
    items.flatMap((item) => Object.keys(item)),
    (key) => key,
  );
  const uniqueDongs = countUnique(items, (item) => item.adongCd);
  const uniqueMiddleCategories = countUnique(items, (item) => item.indsMclsCd);
  const uniqueSmallCategories = countUnique(items, (item) => item.indsSclsCd);

  refs.statsGrid.innerHTML = `
    <article class="stat-card">
      <div class="stat-label">점포 샘플</div>
      <div class="stat-value">${items.length}건</div>
      <div class="stat-foot">문서 기반 스냅샷</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">행정동 범위</div>
      <div class="stat-value">${uniqueDongs}곳</div>
      <div class="stat-foot">선택 조건 기준</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">중분류 업종</div>
      <div class="stat-value">${uniqueMiddleCategories}개</div>
      <div class="stat-foot">소분류 ${uniqueSmallCategories}개 포함</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">응답 필드</div>
      <div class="stat-value">${totalFields}개</div>
      <div class="stat-foot">storeListInDong item 기준</div>
    </article>
  `;
}

function renderCategoryList(items) {
  const grouped = Array.from(groupBy(items, (item) => item.indsSclsNm).entries())
    .map(([name, groupedItems]) => ({
      name,
      count: groupedItems.length,
      category: groupedItems[0].indsMclsNm,
      share: groupedItems.length / items.length,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.name.localeCompare(right.name, "ko");
    });

  refs.categoryNote.textContent = `현재 조건 ${items.length}건 기준 상위 ${Math.min(grouped.length, 6)}개 소분류`;

  if (!grouped.length) {
    refs.categoryList.innerHTML = `
      <article class="placeholder-card">업종 분포를 계산할 샘플이 없습니다.</article>
    `;
    return;
  }

  refs.categoryList.innerHTML = grouped
    .slice(0, 6)
    .map((entry) => {
      return `
        <article class="category-card">
          <div class="category-line">
            <h3>${entry.name}</h3>
            <strong>${entry.count}건</strong>
          </div>
          <p class="category-meta">${entry.category}</p>
          <div class="meter">
            <div class="meter-fill" style="width: ${(entry.share * 100).toFixed(1)}%"></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function buildStoreCards(items) {
  return items
    .map((item) => {
      const cardClassName = `store-card${item.bizesId === state.selectedStoreId ? " is-selected" : ""}`;
      return `
        <article class="${cardClassName}" data-store-id="${item.bizesId}">
          <div class="store-top">
            <div class="store-badges">
              <span class="badge area">${item.signguNm} ${item.adongNm}</span>
              <span class="badge industry">${item.indsLclsNm}</span>
            </div>
            <span class="badge area">${item.stdrYm}</span>
          </div>
          <h3 class="store-title">${item.bizesNm}</h3>
          <p class="store-subtitle">${item.indsMclsNm} · ${item.indsSclsNm}</p>
          <p class="store-address">${item.rdnmAdr || item.lnoAdr}</p>
          <p class="store-micro">${item.bizesId} · ${item.lon}, ${item.lat}</p>
        </article>
      `;
    })
    .join("");
}

function renderStoreList(items) {
  refs.storeNote.textContent = `현재 조건 ${items.length}건 · 카드를 누르면 raw preview가 바뀝니다.`;

  if (!items.length) {
    refs.storeList.innerHTML = `
      <article class="placeholder-card">점포 샘플이 없습니다.</article>
    `;
    return;
  }

  const sortedItems = [...items].sort((left, right) => {
    const areaCompared = `${left.signguNm} ${left.adongNm}`.localeCompare(
      `${right.signguNm} ${right.adongNm}`,
      "ko",
    );
    if (areaCompared !== 0) {
      return areaCompared;
    }

    return left.bizesNm.localeCompare(right.bizesNm, "ko");
  });

  refs.storeList.innerHTML = buildStoreCards(sortedItems);
  refs.storeList.querySelectorAll("[data-store-id]").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedStoreId = card.getAttribute("data-store-id");
      render();
    });
  });
}

function renderRawPreview(items) {
  const selectedStore = items.find((item) => item.bizesId === state.selectedStoreId) || null;
  const baseQuery = state.data?.queryExamples?.storeListInDong || {};
  const selectedAreaLabel = selectedStore ? `${selectedStore.signguNm} ${selectedStore.adongNm}` : "선택 없음";

  refs.rawCaption.textContent = selectedStore
    ? `${selectedAreaLabel} 기준으로 storeListInDong 요청 예시와 item 응답 구조를 보여줍니다.`
    : "선택한 점포가 없습니다.";

  refs.requestPreview.textContent = JSON.stringify(
    {
      ...baseQuery,
      key: selectedStore?.adongCd || baseQuery.key,
      indsLclsCd: selectedStore?.indsLclsCd || baseQuery.indsLclsCd,
    },
    null,
    2,
  );

  refs.responsePreview.textContent = JSON.stringify(
    selectedStore || state.data?.rawSamples?.storeItem || {},
    null,
    2,
  );
}

function render() {
  renderEndpoints();
  renderFilters(refs.areaFilter, getAreaOptions(), state.area, (areaId) => {
    state.area = areaId;
    render();
  });
  renderFilters(refs.industryFilter, getIndustryOptions(), state.industry, (industryId) => {
    state.industry = industryId;
    render();
  });

  const items = getFilteredItems();
  ensureSelectedStore(items);
  renderStats(items);
  renderCategoryList(items);
  renderStoreList(items);
  renderRawPreview(items);
}

async function init() {
  try {
    const response = await fetch("./latest-commercial-area-snapshot.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load JSON: ${response.status}`);
    }

    state.data = await response.json();
    refs.snapshotChip.textContent =
      state.data.snapshotMode === "live" ? "실 API 스냅샷" : "문서 기반 데모";
    refs.heroStatus.textContent = `${formatDateTime(state.data.updatedAt)} · ${
      state.data.snapshotMode === "live" ? "라이브 수집본" : "문서 기반 샘플"
    }`;
    render();
  } catch (error) {
    console.error(error);
    refs.heroStatus.textContent = "스냅샷을 불러오지 못했습니다.";
    refs.endpointGrid.innerHTML = `
      <article class="placeholder-card">commercial-area-radar/latest-commercial-area-snapshot.json 파일을 확인해 주세요.</article>
    `;
    refs.statsGrid.innerHTML = "";
    refs.categoryList.innerHTML = `
      <article class="placeholder-card">스냅샷이 없어 업종 분포를 렌더링하지 못했습니다.</article>
    `;
    refs.storeList.innerHTML = `
      <article class="placeholder-card">스냅샷이 없어 점포 목록을 렌더링하지 못했습니다.</article>
    `;
  }
}

init();
