const state = {
  area: "all",
  industry: "all",
  areaQuery: "",
  industryQuery: "",
  data: null,
};

const refs = {
  heroStatus: document.getElementById("hero-status"),
  snapshotChip: document.getElementById("snapshot-chip"),
  areaSearch: document.getElementById("area-search"),
  industrySearch: document.getElementById("industry-search"),
  areaHelper: document.getElementById("area-helper"),
  industryHelper: document.getElementById("industry-helper"),
  areaFilter: document.getElementById("area-filter"),
  industryFilter: document.getElementById("industry-filter"),
  statsGrid: document.getElementById("stats-grid"),
  areaNote: document.getElementById("area-note"),
  areaList: document.getElementById("area-list"),
  categoryNote: document.getElementById("category-note"),
  categoryList: document.getElementById("category-list"),
  storeNote: document.getElementById("store-note"),
  storeList: document.getElementById("store-list"),
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

function getAllItems() {
  return state.data?.items || [];
}

function buildAreaOptions() {
  const options = Array.from(groupBy(getAllItems(), (item) => item.adongCd || item.signguCd).values())
    .map((groupedItems) => {
      const item = groupedItems[0];
      return {
        id: item.adongCd || item.signguCd,
        label: `${item.signguNm} ${item.adongNm}`,
        hint: item.ctprvnNm,
        count: groupedItems.length,
        searchText: `${item.ctprvnNm} ${item.signguNm} ${item.adongNm}`.toLowerCase(),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, "ko"));

  return [
    {
      id: "all",
      label: "전체 동네",
      hint: "전체",
      count: getAllItems().length,
      searchText: "전체 동네",
    },
    ...options,
  ];
}

function buildIndustryOptions() {
  const options = Array.from(groupBy(getAllItems(), (item) => item.indsMclsCd || item.indsLclsCd).values())
    .map((groupedItems) => {
      const item = groupedItems[0];
      return {
        id: item.indsMclsCd || item.indsLclsCd,
        label: item.indsMclsNm || item.indsLclsNm,
        hint: item.indsLclsNm,
        count: groupedItems.length,
        searchText: `${item.indsLclsNm} ${item.indsMclsNm} ${item.indsSclsNm}`.toLowerCase(),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, "ko"));

  return [
    {
      id: "all",
      label: "전체 업종",
      hint: "전체",
      count: getAllItems().length,
      searchText: "전체 업종",
    },
    ...options,
  ];
}

function getVisibleOptions(options, query, selectedId) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return options;
  }

  const [allOption, ...rest] = options;
  const matched = rest.filter((option) => option.searchText.includes(normalizedQuery));
  const selectedOption = rest.find((option) => option.id === selectedId);

  if (selectedOption && !matched.some((option) => option.id === selectedOption.id)) {
    matched.unshift(selectedOption);
  }

  return [allOption, ...matched];
}

function renderFilters(target, options, selectedId, onChange) {
  target.innerHTML = "";

  if (options.length <= 1) {
    const emptyHint = document.createElement("div");
    emptyHint.className = "empty-search";
    emptyHint.textContent = "검색 결과가 없습니다.";
    target.appendChild(emptyHint);
    return;
  }

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-button${selectedId === option.id ? " is-active" : ""}`;
    button.title = option.hint ? `${option.hint} · ${option.count}건` : option.label;
    button.append(option.label);

    if (option.id !== "all") {
      const count = document.createElement("span");
      count.className = "filter-count";
      count.textContent = String(option.count);
      button.appendChild(count);
    }

    button.addEventListener("click", () => onChange(option.id));
    target.appendChild(button);
  });
}

function renderFilterSections() {
  const areaOptions = buildAreaOptions();
  const visibleAreaOptions = getVisibleOptions(areaOptions, state.areaQuery, state.area);
  refs.areaHelper.textContent = `${areaOptions.length - 1}개 행정동 중 ${Math.max(visibleAreaOptions.length - 1, 0)}개 표시`;
  renderFilters(refs.areaFilter, visibleAreaOptions, state.area, (areaId) => {
    state.area = areaId;
    render();
  });

  const industryOptions = buildIndustryOptions();
  const visibleIndustryOptions = getVisibleOptions(industryOptions, state.industryQuery, state.industry);
  refs.industryHelper.textContent = `${industryOptions.length - 1}개 업종 중 ${Math.max(visibleIndustryOptions.length - 1, 0)}개 표시`;
  renderFilters(refs.industryFilter, visibleIndustryOptions, state.industry, (industryId) => {
    state.industry = industryId;
    render();
  });
}

function getFilteredItems() {
  return getAllItems().filter((item) => {
    const areaMatched = state.area === "all" ? true : (item.adongCd || item.signguCd) === state.area;
    const industryMatched = state.industry === "all"
      ? true
      : (item.indsMclsCd || item.indsLclsCd) === state.industry;
    return areaMatched && industryMatched;
  });
}

function renderStats(items) {
  const allItems = getAllItems();

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

  const totalDongs = countUnique(allItems, (item) => item.adongCd || item.signguCd);
  const totalIndustries = countUnique(allItems, (item) => item.indsMclsCd || item.indsLclsCd);
  const visibleDongs = countUnique(items, (item) => item.adongCd || item.signguCd);
  const visibleIndustries = countUnique(items, (item) => item.indsMclsCd || item.indsLclsCd);

  refs.statsGrid.innerHTML = `
    <article class="stat-card">
      <div class="stat-label">전체 행정동</div>
      <div class="stat-value">${totalDongs}곳</div>
      <div class="stat-foot">수집 스냅샷 기준</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">전체 업종</div>
      <div class="stat-value">${totalIndustries}개</div>
      <div class="stat-foot">중분류 업종 기준</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">현재 노출 점포</div>
      <div class="stat-value">${items.length}건</div>
      <div class="stat-foot">필터 결과</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">현재 노출 범위</div>
      <div class="stat-value">${visibleDongs} / ${visibleIndustries}</div>
      <div class="stat-foot">행정동 / 업종</div>
    </article>
  `;
}

function renderAreaSummary(items) {
  const grouped = Array.from(groupBy(items, (item) => item.adongCd || item.signguCd).entries())
    .map(([id, groupedItems]) => ({
      id,
      label: `${groupedItems[0].signguNm} ${groupedItems[0].adongNm}`,
      subtitle: groupedItems[0].ctprvnNm,
      count: groupedItems.length,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label, "ko");
    });

  refs.areaNote.textContent = `현재 조건 ${items.length}건 기준 상위 ${Math.min(grouped.length, 8)}개 행정동`;

  if (!grouped.length) {
    refs.areaList.innerHTML = `
      <article class="placeholder-card">행정동 분포를 계산할 샘플이 없습니다.</article>
    `;
    return;
  }

  refs.areaList.innerHTML = grouped
    .slice(0, 8)
    .map((entry) => {
      return `
        <button type="button" class="summary-card${state.area === entry.id ? " is-active" : ""}" data-area-id="${entry.id}">
          <div class="summary-kicker">${entry.subtitle}</div>
          <div class="summary-head">
            <h3>${entry.label}</h3>
            <strong class="summary-count">${entry.count}건</strong>
          </div>
        </button>
      `;
    })
    .join("");

  refs.areaList.querySelectorAll("[data-area-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.area = button.getAttribute("data-area-id");
      render();
    });
  });
}

function renderCategoryList(items) {
  const grouped = Array.from(groupBy(items, (item) => item.indsMclsCd || item.indsLclsCd).entries())
    .map(([id, groupedItems]) => ({
      id,
      label: groupedItems[0].indsMclsNm || groupedItems[0].indsLclsNm,
      subtitle: groupedItems[0].indsLclsNm,
      count: groupedItems.length,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label, "ko");
    });

  refs.categoryNote.textContent = `현재 조건 ${items.length}건 기준 상위 ${Math.min(grouped.length, 8)}개 업종`;

  if (!grouped.length) {
    refs.categoryList.innerHTML = `
      <article class="placeholder-card">업종 분포를 계산할 샘플이 없습니다.</article>
    `;
    return;
  }

  refs.categoryList.innerHTML = grouped
    .slice(0, 8)
    .map((entry) => {
      return `
        <button type="button" class="summary-card${state.industry === entry.id ? " is-active" : ""}" data-industry-id="${entry.id}">
          <div class="summary-kicker">${entry.subtitle}</div>
          <div class="summary-head">
            <h3>${entry.label}</h3>
            <strong class="summary-count">${entry.count}건</strong>
          </div>
        </button>
      `;
    })
    .join("");

  refs.categoryList.querySelectorAll("[data-industry-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.industry = button.getAttribute("data-industry-id");
      render();
    });
  });
}

function buildStoreCards(items) {
  return items
    .map((item) => {
      return `
        <article class="store-card">
          <div class="store-top">
            <div class="store-badges">
              <span class="badge area">${item.signguNm} ${item.adongNm}</span>
              <span class="badge industry">${item.indsMclsNm || item.indsLclsNm}</span>
            </div>
            <span class="badge area">${item.stdrYm}</span>
          </div>
          <h3 class="store-title">${item.bizesNm}</h3>
          <p class="store-subtitle">${item.indsLclsNm} · ${item.indsSclsNm}</p>
          <p class="store-address">${item.rdnmAdr || item.lnoAdr}</p>
          <p class="store-micro">${item.bizesId} · ${item.lon}, ${item.lat}</p>
        </article>
      `;
    })
    .join("");
}

function renderStoreList(items) {
  const sortedItems = [...items].sort((left, right) => {
    const areaCompared = `${left.signguNm} ${left.adongNm}`.localeCompare(
      `${right.signguNm} ${right.adongNm}`,
      "ko",
    );
    if (areaCompared !== 0) {
      return areaCompared;
    }

    const industryCompared = `${left.indsMclsNm || left.indsLclsNm}`.localeCompare(
      `${right.indsMclsNm || right.indsLclsNm}`,
      "ko",
    );
    if (industryCompared !== 0) {
      return industryCompared;
    }

    return left.bizesNm.localeCompare(right.bizesNm, "ko");
  });
  const visibleItems = sortedItems.slice(0, 20);

  refs.storeNote.textContent = `총 ${items.length}건 중 ${visibleItems.length}건 표시`;

  if (!items.length) {
    refs.storeList.innerHTML = `
      <article class="placeholder-card">점포 샘플이 없습니다.</article>
    `;
    return;
  }

  refs.storeList.innerHTML = buildStoreCards(visibleItems);
}

function render() {
  const items = getFilteredItems();
  renderFilterSections();
  renderStats(items);
  renderAreaSummary(items);
  renderCategoryList(items);
  renderStoreList(items);
}

async function init() {
  refs.areaSearch.addEventListener("input", (event) => {
    state.areaQuery = event.target.value;
    render();
  });
  refs.industrySearch.addEventListener("input", (event) => {
    state.industryQuery = event.target.value;
    render();
  });

  try {
    const response = await fetch("./latest-commercial-area-snapshot.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load JSON: ${response.status}`);
    }

    state.data = await response.json();
    refs.snapshotChip.textContent =
      state.data.snapshotMode === "live" ? "실 API 스냅샷" : "문서 기반 데모";
    refs.heroStatus.textContent = `${formatDateTime(state.data.updatedAt)} · ${
      countUnique(getAllItems(), (item) => item.adongCd || item.signguCd)
    }개 행정동 · ${
      countUnique(getAllItems(), (item) => item.indsMclsCd || item.indsLclsCd)
    }개 업종`;
    render();
  } catch (error) {
    console.error(error);
    refs.heroStatus.textContent = "스냅샷을 불러오지 못했습니다.";
    refs.areaFilter.innerHTML = `<article class="placeholder-card">commercial-area-radar/latest-commercial-area-snapshot.json 파일을 확인해 주세요.</article>`;
    refs.industryFilter.innerHTML = "";
    refs.statsGrid.innerHTML = "";
    refs.areaList.innerHTML = `
      <article class="placeholder-card">스냅샷이 없어 행정동 분포를 렌더링하지 못했습니다.</article>
    `;
    refs.categoryList.innerHTML = `
      <article class="placeholder-card">스냅샷이 없어 업종 분포를 렌더링하지 못했습니다.</article>
    `;
    refs.storeList.innerHTML = `
      <article class="placeholder-card">스냅샷이 없어 점포 목록을 렌더링하지 못했습니다.</article>
    `;
  }
}

init();
