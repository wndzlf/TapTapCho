const RANK_LIMIT = 6;
const STORE_LIMIT = 8;

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
  briefingTitle: document.getElementById("briefing-title"),
  briefingCopy: document.getElementById("briefing-copy"),
  briefingVisual: document.getElementById("briefing-visual"),
  briefingPoints: document.getElementById("briefing-points"),
  briefingMeta: document.getElementById("briefing-meta"),
  signalGrid: document.getElementById("signal-grid"),
  areaSectionTitle: document.getElementById("area-section-title"),
  areaNote: document.getElementById("area-note"),
  areaList: document.getElementById("area-list"),
  categorySectionTitle: document.getElementById("category-section-title"),
  categoryNote: document.getElementById("category-note"),
  categoryList: document.getElementById("category-list"),
  storeNote: document.getElementById("store-note"),
  storeList: document.getElementById("store-list"),
};

const getAreaId = (item) => item.adongCd || item.signguCd || "";
const getIndustryId = (item) => item.indsMclsCd || item.indsLclsCd || "";

function getAreaLabel(item) {
  return [item.signguNm, item.adongNm].filter(Boolean).join(" ").trim() || item.signguNm || "미상 동네";
}

function getIndustryLabel(item) {
  return item.indsMclsNm || item.indsLclsNm || "미상 업종";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
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

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPercent(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const minimumFractionDigits = safeValue > 0 && safeValue < 10 ? 1 : 0;
  const maximumFractionDigits = safeValue >= 10 ? 0 : 1;
  return `${safeValue.toLocaleString("ko-KR", {
    minimumFractionDigits,
    maximumFractionDigits,
  })}%`;
}

function formatMultiple(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toLocaleString("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}배`;
}

function clampNumber(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeAgainst(value, maxReference) {
  if (!maxReference) {
    return 0;
  }

  return clampNumber(value / maxReference, 0, 1);
}

function normalizeRank(rank, total) {
  if (!rank) {
    return 0;
  }

  if (total <= 1) {
    return 1;
  }

  return clampNumber(1 - ((rank - 1) / (total - 1)), 0, 1);
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

function toPercent(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return (numerator / denominator) * 100;
}

function averageCount(entries) {
  if (!entries.length) {
    return 0;
  }

  return entries.reduce((sum, entry) => sum + entry.count, 0) / entries.length;
}

function getEntryRank(entries, id) {
  const index = entries.findIndex((entry) => entry.id === id);
  return index === -1 ? null : index + 1;
}

function getVisibleRankEntries(entries, selectedId) {
  if (entries.length <= RANK_LIMIT) {
    return entries;
  }

  if (selectedId === "all") {
    return entries.slice(0, RANK_LIMIT);
  }

  const topEntries = entries.slice(0, RANK_LIMIT - 1);
  if (topEntries.some((entry) => entry.id === selectedId)) {
    return entries.slice(0, RANK_LIMIT);
  }

  const selectedEntry = entries.find((entry) => entry.id === selectedId);
  return selectedEntry ? [...topEntries, selectedEntry] : entries.slice(0, RANK_LIMIT);
}

function withMissingSelection(entries, selectedEntry, foot) {
  if (!selectedEntry || entries.some((entry) => entry.id === selectedEntry.id)) {
    return entries;
  }

  return [
    ...entries,
    {
      ...selectedEntry,
      count: 0,
      share: 0,
      synthetic: true,
      foot,
    },
  ];
}

function getComparisonTone(entry, rankIndex, maxCount) {
  if (entry.synthetic || entry.count <= 0) {
    return "low";
  }

  const ratio = maxCount ? entry.count / maxCount : 0;
  if (rankIndex === 0 || ratio >= 0.72) {
    return "high";
  }

  if (ratio >= 0.36) {
    return "medium";
  }

  return "low";
}

function buildComparisonTicks(maxCount) {
  const ticks = [0];

  if (maxCount > 1) {
    const middle = Math.ceil(maxCount / 2);
    if (middle !== maxCount) {
      ticks.push(middle);
    }
  }

  if (maxCount > 0) {
    ticks.push(maxCount);
  }

  return [...new Set(ticks)];
}

function buildRadarPoint({ label, value, note, score, tone }, angle) {
  const normalized = clampNumber(score, 0.08, 0.92);
  const radius = 18 + normalized * 29;
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    label,
    value,
    note,
    tone,
    x: 50 + Math.cos(radians) * radius,
    y: 50 + Math.sin(radians) * radius,
  };
}

function buildRadar(points, tone, caption, status) {
  const angles = [14, 140, 258];
  return {
    tone,
    caption,
    status,
    points: points.map((point, index) => buildRadarPoint(point, angles[index % angles.length])),
  };
}

function describeDensity(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return { label: "비교 불가", tone: "low" };
  }

  if (ratio >= 1.8) {
    return { label: "과밀", tone: "high" };
  }

  if (ratio >= 1.15) {
    return { label: "높음", tone: "high" };
  }

  if (ratio >= 0.75) {
    return { label: "보통", tone: "medium" };
  }

  return { label: "희소", tone: "low" };
}

function buildBriefingVisual(items) {
  const allItems = getAllItems();
  const areaEntries = buildAreaEntries(allItems);
  const industryEntries = buildIndustryEntries(allItems);
  const selectedArea = getSelectedAreaEntry(areaEntries);
  const selectedIndustry = getSelectedIndustryEntry(industryEntries);

  if (!allItems.length) {
    return buildRadar([], "low", "표본이 들어오면 레이더 맵이 켜집니다.", "대기");
  }

  if (selectedArea && selectedIndustry && !items.length) {
    const areaItems = allItems.filter((item) => getAreaId(item) === selectedArea.id);
    const industryItems = allItems.filter((item) => getIndustryId(item) === selectedIndustry.id);
    const bestIndustry = buildIndustryEntries(areaItems)[0];
    const hottestArea = buildAreaEntries(industryItems)[0];

    return buildRadar(
      [
        {
          label: "조합",
          value: "비포착",
          note: "현재 동네와 업종 조합",
          score: 0.08,
          tone: "low",
        },
        {
          label: "동네 안 강세",
          value: formatPercent(bestIndustry?.share || 0),
          note: `${selectedArea.label}에서는 ${bestIndustry?.label || "-"} 쪽이 강합니다.`,
          score: normalizeAgainst(bestIndustry?.share || 0, 35),
          tone: "medium",
        },
        {
          label: "업종 쏠림",
          value: formatPercent(hottestArea?.share || 0),
          note: `${selectedIndustry.label}는 ${hottestArea?.label || "-"} 쪽에 더 몰립니다.`,
          score: normalizeAgainst(hottestArea?.share || 0, 35),
          tone: "medium",
        },
      ],
      "low",
      `${selectedArea.label} · ${selectedIndustry.label} 조합은 아직 잡히지 않았습니다.`,
      "비포착",
    );
  }

  if (selectedArea && selectedIndustry) {
    const areaItems = allItems.filter((item) => getAreaId(item) === selectedArea.id);
    const industryItems = allItems.filter((item) => getIndustryId(item) === selectedIndustry.id);
    const areaEntriesForIndustry = buildAreaEntries(industryItems);
    const densityRatio = items.length / averageCount(areaEntriesForIndustry);
    const density = describeDensity(densityRatio);
    const areaRank = getEntryRank(areaEntriesForIndustry, selectedArea.id);
    const areaShare = toPercent(items.length, areaItems.length);

    return buildRadar(
      [
        {
          label: "조합 강도",
          value: formatMultiple(densityRatio),
          note: `${density.label} · 평균 대비`,
          score: normalizeAgainst(densityRatio, 2.6),
          tone: density.tone,
        },
        {
          label: "동네 안 점유",
          value: formatPercent(areaShare),
          note: `${selectedArea.label} 안 비중`,
          score: normalizeAgainst(areaShare, 35),
          tone: areaShare >= 20 ? "high" : areaShare >= 8 ? "medium" : "low",
        },
        {
          label: "업종 안 순위",
          value: areaRank ? `${areaRank}위` : "-",
          note: `${selectedIndustry.label} 기준`,
          score: normalizeRank(areaRank, areaEntriesForIndustry.length),
          tone: areaRank && areaRank <= 5 ? "high" : "medium",
        },
      ],
      density.tone,
      `${selectedArea.label} · ${selectedIndustry.label} 조합이 얼마나 센지 바로 봅니다.`,
      density.label,
    );
  }

  if (selectedArea) {
    const areaItems = allItems.filter((item) => getAreaId(item) === selectedArea.id);
    const areaRank = getEntryRank(areaEntries, selectedArea.id);
    const densityRatio = areaItems.length / averageCount(areaEntries);
    const density = describeDensity(densityRatio);
    const diversity = countUnique(areaItems, getIndustryId);

    return buildRadar(
      [
        {
          label: "동네 순위",
          value: areaRank ? `${areaRank}위` : "-",
          note: "전체 동네 안 존재감",
          score: normalizeRank(areaRank, areaEntries.length),
          tone: areaRank && areaRank <= 5 ? "high" : "medium",
        },
        {
          label: "업종 다양성",
          value: `${formatNumber(diversity)}개`,
          note: `${selectedArea.label} 안 업종 수`,
          score: normalizeAgainst(diversity, industryEntries.length),
          tone: diversity >= Math.max(industryEntries.length * 0.2, 10) ? "high" : "medium",
        },
        {
          label: "밀집도",
          value: density.label,
          note: `평균 ${formatMultiple(densityRatio)}`,
          score: normalizeAgainst(densityRatio, 2.6),
          tone: density.tone,
        },
      ],
      density.tone,
      `${selectedArea.label} 한 곳만 골라도 동네 존재감이 바로 드러납니다.`,
      density.label,
    );
  }

  if (selectedIndustry) {
    const industryItems = allItems.filter((item) => getIndustryId(item) === selectedIndustry.id);
    const industryRank = getEntryRank(industryEntries, selectedIndustry.id);
    const densityRatio = industryItems.length / averageCount(industryEntries);
    const density = describeDensity(densityRatio);
    const spread = countUnique(industryItems, getAreaId);

    return buildRadar(
      [
        {
          label: "업종 순위",
          value: industryRank ? `${industryRank}위` : "-",
          note: "전체 업종 안 존재감",
          score: normalizeRank(industryRank, industryEntries.length),
          tone: industryRank && industryRank <= 5 ? "high" : "medium",
        },
        {
          label: "확산 동네",
          value: `${formatNumber(spread)}곳`,
          note: `${selectedIndustry.label}가 보인 동네`,
          score: normalizeAgainst(spread, areaEntries.length),
          tone: spread >= Math.max(areaEntries.length * 0.18, 10) ? "high" : "medium",
        },
        {
          label: "밀집도",
          value: density.label,
          note: `평균 ${formatMultiple(densityRatio)}`,
          score: normalizeAgainst(densityRatio, 2.6),
          tone: density.tone,
        },
      ],
      density.tone,
      `${selectedIndustry.label}가 얼마나 넓게 퍼져 있고 얼마나 센지 빠르게 읽습니다.`,
      density.label,
    );
  }

  const topArea = areaEntries[0];
  const topIndustry = industryEntries[0];

  return buildRadar(
    [
      {
        label: "핫 동네",
        value: formatPercent(topArea?.share || 0),
        note: topArea?.label || "미상 동네",
        score: normalizeAgainst(topArea?.share || 0, 18),
        tone: "high",
      },
      {
        label: "핫 업종",
        value: formatPercent(topIndustry?.share || 0),
        note: topIndustry?.label || "미상 업종",
        score: normalizeAgainst(topIndustry?.share || 0, 18),
        tone: "medium",
      },
      {
        label: "표본 크기",
        value: `${formatNumber(allItems.length)}건`,
        note: "지금 읽을 수 있는 전체 표본",
        score: allItems.length / (allItems.length + 420),
        tone: "medium",
      },
    ],
    "medium",
    "먼저 동네나 업종을 고르면 조합 강도가 더 또렷하게 보입니다.",
    "스냅샷",
  );
}

function buildAreaOptions() {
  const options = Array.from(groupBy(getAllItems(), getAreaId).values())
    .map((groupedItems) => {
      const item = groupedItems[0];
      return {
        id: getAreaId(item),
        label: getAreaLabel(item),
        hint: item.ctprvnNm || item.signguNm,
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
  const options = Array.from(groupBy(getAllItems(), getIndustryId).values())
    .map((groupedItems) => {
      const item = groupedItems[0];
      return {
        id: getIndustryId(item),
        label: getIndustryLabel(item),
        hint: item.indsLclsNm || "업종",
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

function buildAreaEntries(items) {
  const totalCount = items.length || 1;
  return Array.from(groupBy(items, getAreaId).values())
    .map((groupedItems) => {
      const item = groupedItems[0];
      return {
        id: getAreaId(item),
        label: getAreaLabel(item),
        hint: item.ctprvnNm || item.signguNm,
        count: groupedItems.length,
        share: (groupedItems.length / totalCount) * 100,
      };
    })
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label, "ko");
    });
}

function buildIndustryEntries(items) {
  const totalCount = items.length || 1;
  return Array.from(groupBy(items, getIndustryId).values())
    .map((groupedItems) => {
      const item = groupedItems[0];
      return {
        id: getIndustryId(item),
        label: getIndustryLabel(item),
        hint: item.indsLclsNm || "업종",
        count: groupedItems.length,
        share: (groupedItems.length / totalCount) * 100,
      };
    })
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label, "ko");
    });
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

function matchesSelectedArea(item) {
  return state.area === "all" ? true : getAreaId(item) === state.area;
}

function matchesSelectedIndustry(item) {
  return state.industry === "all" ? true : getIndustryId(item) === state.industry;
}

function getFilteredItems() {
  return getAllItems().filter((item) => matchesSelectedArea(item) && matchesSelectedIndustry(item));
}

function getSelectedAreaEntry(entries) {
  return state.area === "all" ? null : entries.find((entry) => entry.id === state.area) || null;
}

function getSelectedIndustryEntry(entries) {
  return state.industry === "all" ? null : entries.find((entry) => entry.id === state.industry) || null;
}

function buildBriefing(items) {
  const allItems = getAllItems();
  const areaEntries = buildAreaEntries(allItems);
  const industryEntries = buildIndustryEntries(allItems);
  const selectedArea = getSelectedAreaEntry(areaEntries);
  const selectedIndustry = getSelectedIndustryEntry(industryEntries);

  if (!allItems.length) {
    return {
      title: "스냅샷 데이터가 없습니다.",
      copy: "상권 브리핑을 만들기 위한 점포 표본이 아직 없습니다.",
      meta: [],
      signals: [],
    };
  }

  if (selectedArea && selectedIndustry && !items.length) {
    const areaItems = allItems.filter((item) => getAreaId(item) === selectedArea.id);
    const areaIndustryEntries = buildIndustryEntries(areaItems);
    const industryAreaItems = allItems.filter((item) => getIndustryId(item) === selectedIndustry.id);
    const areaEntriesForIndustry = buildAreaEntries(industryAreaItems);
    const density = describeDensity(0);
    const bestIndustry = areaIndustryEntries[0];
    const hottestArea = areaEntriesForIndustry[0];

    return {
      title: `${selectedArea.label}에서 ${selectedIndustry.label} 표본이 아직 포착되지 않습니다.`,
      copy: `${selectedIndustry.label} 조합은 현재 스냅샷에 없지만, ${selectedArea.label} 안에서는 ${bestIndustry?.label || "다른 업종"} 쪽이 더 두드러지고 있습니다. ${selectedIndustry.label} 자체는 ${hottestArea?.label || "다른 동네"}에서 더 자주 포착됩니다.`,
      meta: [selectedArea.label, selectedIndustry.label, "0건 조합"],
      signals: [
        {
          label: "경쟁",
          value: density.label,
          foot: "현재 선택 조합은 표본이 없습니다.",
          tone: density.tone,
        },
        {
          label: "순위",
          value: "-",
          foot: `${selectedIndustry.label} 기준 동네 랭킹에 없음`,
          tone: "low",
        },
        {
          label: "표본",
          value: "0건",
          foot: `${selectedArea.label} · ${selectedIndustry.label}`,
          tone: "low",
        },
        {
          label: "점유",
          value: "0%",
          foot: `${selectedArea.label} 내 ${selectedIndustry.label} 비중`,
          tone: "low",
        },
      ],
    };
  }

  if (selectedArea && selectedIndustry) {
    const areaItems = allItems.filter((item) => getAreaId(item) === selectedArea.id);
    const industryItems = allItems.filter((item) => getIndustryId(item) === selectedIndustry.id);
    const areaEntriesForIndustry = buildAreaEntries(industryItems);
    const industryEntriesForArea = buildIndustryEntries(areaItems);
    const areaRank = getEntryRank(areaEntriesForIndustry, selectedArea.id);
    const industryRank = getEntryRank(industryEntriesForArea, selectedIndustry.id);
    const densityRatio = items.length / averageCount(areaEntriesForIndustry);
    const density = describeDensity(densityRatio);
    const areaShare = toPercent(items.length, areaItems.length);
    const title = areaRank && areaRank <= 3
      ? `${selectedArea.label}의 ${selectedIndustry.label}는 강하게 몰린 조합입니다.`
      : areaRank && areaRank <= 8
        ? `${selectedArea.label}의 ${selectedIndustry.label}는 눈에 띄는 조합입니다.`
        : `${selectedArea.label}의 ${selectedIndustry.label}는 상대적으로 희소합니다.`;

    return {
      title,
      copy: `${formatNumber(items.length)}건이 포착됐고, ${selectedIndustry.label} 기준 ${formatNumber(areaEntriesForIndustry.length)}개 동네 중 ${areaRank}위입니다. ${selectedArea.label} 안에서는 ${selectedIndustry.label}가 ${industryRank}번째로 많이 보입니다.`,
      meta: [selectedArea.label, selectedIndustry.label, `${formatNumber(items.length)}건 조합`],
      signals: [
        {
          label: "경쟁",
          value: density.label,
          foot: `평균 대비 ${formatMultiple(densityRatio)}`,
          tone: density.tone,
        },
        {
          label: "순위",
          value: areaRank ? `${areaRank}위` : "-",
          foot: `${selectedIndustry.label} 기준 ${formatNumber(areaEntriesForIndustry.length)}개 동네`,
          tone: "medium",
        },
        {
          label: "표본",
          value: `${formatNumber(items.length)}건`,
          foot: `${selectedArea.label} · ${selectedIndustry.label}`,
          tone: "medium",
        },
        {
          label: "점유",
          value: formatPercent(areaShare),
          foot: `${selectedArea.label} 내 ${selectedIndustry.label} 비중`,
          tone: areaShare >= 20 ? "high" : areaShare >= 8 ? "medium" : "low",
        },
      ],
    };
  }

  if (selectedArea) {
    const areaItems = allItems.filter((item) => getAreaId(item) === selectedArea.id);
    const topIndustry = buildIndustryEntries(areaItems)[0];
    const areaRank = getEntryRank(areaEntries, selectedArea.id);
    const densityRatio = areaItems.length / averageCount(areaEntries);
    const density = describeDensity(densityRatio);
    const diversity = countUnique(areaItems, getIndustryId);
    const snapshotShare = toPercent(areaItems.length, allItems.length);

    return {
      title: `${selectedArea.label}은 ${topIndustry?.label || "주요 업종"} 중심으로 읽히는 상권입니다.`,
      copy: `${formatNumber(areaItems.length)}건이 포착돼 전체 ${formatNumber(areaEntries.length)}개 동네 중 ${areaRank}위입니다. 가장 많이 보이는 업종은 ${topIndustry?.label || "미상"} ${topIndustry ? `${formatNumber(topIndustry.count)}건` : ""}이며, 총 ${formatNumber(diversity)}개 업종이 섞여 있습니다.`,
      meta: [selectedArea.label, `${formatNumber(diversity)}개 업종`, `${formatNumber(areaItems.length)}건 표본`],
      signals: [
        {
          label: "경쟁",
          value: density.label,
          foot: `평균 대비 ${formatMultiple(densityRatio)}`,
          tone: density.tone,
        },
        {
          label: "순위",
          value: areaRank ? `${areaRank}위` : "-",
          foot: `전체 ${formatNumber(areaEntries.length)}개 동네`,
          tone: "medium",
        },
        {
          label: "표본",
          value: `${formatNumber(areaItems.length)}건`,
          foot: "선택 동네 표본",
          tone: "medium",
        },
        {
          label: "점유",
          value: formatPercent(snapshotShare),
          foot: "전체 스냅샷 대비",
          tone: snapshotShare >= 5 ? "high" : snapshotShare >= 2 ? "medium" : "low",
        },
      ],
    };
  }

  if (selectedIndustry) {
    const industryItems = allItems.filter((item) => getIndustryId(item) === selectedIndustry.id);
    const topArea = buildAreaEntries(industryItems)[0];
    const industryRank = getEntryRank(industryEntries, selectedIndustry.id);
    const densityRatio = industryItems.length / averageCount(industryEntries);
    const density = describeDensity(densityRatio);
    const spread = countUnique(industryItems, getAreaId);
    const snapshotShare = toPercent(industryItems.length, allItems.length);

    return {
      title: `${selectedIndustry.label}는 ${topArea?.label || "특정 동네"} 쪽에서 더 강하게 보입니다.`,
      copy: `${formatNumber(industryItems.length)}건이 포착돼 전체 ${formatNumber(industryEntries.length)}개 업종 중 ${industryRank}위입니다. 가장 많이 포착된 동네는 ${topArea?.label || "미상"} ${topArea ? `${formatNumber(topArea.count)}건` : ""}이고, 총 ${formatNumber(spread)}개 동네에 분포합니다.`,
      meta: [selectedIndustry.label, `${formatNumber(spread)}개 동네`, `${formatNumber(industryItems.length)}건 표본`],
      signals: [
        {
          label: "경쟁",
          value: density.label,
          foot: `평균 대비 ${formatMultiple(densityRatio)}`,
          tone: density.tone,
        },
        {
          label: "순위",
          value: industryRank ? `${industryRank}위` : "-",
          foot: `전체 ${formatNumber(industryEntries.length)}개 업종`,
          tone: "medium",
        },
        {
          label: "표본",
          value: `${formatNumber(industryItems.length)}건`,
          foot: "선택 업종 표본",
          tone: "medium",
        },
        {
          label: "점유",
          value: formatPercent(snapshotShare),
          foot: "전체 스냅샷 대비",
          tone: snapshotShare >= 5 ? "high" : snapshotShare >= 2 ? "medium" : "low",
        },
      ],
    };
  }

  const topArea = areaEntries[0];
  const topIndustry = industryEntries[0];

  return {
    title: `${topArea?.label || "핵심 동네"}과 ${topIndustry?.label || "핵심 업종"}이 스냅샷에서 가장 두드러집니다.`,
    copy: `총 ${formatNumber(allItems.length)}건 표본 중 ${topArea?.label || "미상 동네"}이 ${topArea ? formatNumber(topArea.count) : 0}건으로 가장 크고, 업종은 ${topIndustry?.label || "미상 업종"}이 ${topIndustry ? formatNumber(topIndustry.count) : 0}건으로 가장 많습니다. 동네나 업종을 고르면 경쟁 밀집도를 바로 읽을 수 있습니다.`,
    meta: [`${formatNumber(allItems.length)}건 스냅샷`, `${formatNumber(areaEntries.length)}개 동네`, `${formatNumber(industryEntries.length)}개 업종`],
    signals: [
      {
        label: "표본",
        value: `${formatNumber(allItems.length)}건`,
        foot: "수집 스냅샷 기준",
        tone: "medium",
      },
      {
        label: "동네",
        value: `${formatNumber(areaEntries.length)}곳`,
        foot: "행정동 기준",
        tone: "medium",
      },
      {
        label: "업종",
        value: `${formatNumber(industryEntries.length)}개`,
        foot: "중분류 업종 기준",
        tone: "medium",
      },
      {
        label: "최대치",
        value: `${formatNumber(topArea?.count || 0)}건`,
        foot: topArea?.label || "미상 동네",
        tone: "high",
      },
    ],
  };
}

function renderBriefing(items) {
  const briefing = buildBriefing(items);
  refs.briefingTitle.textContent = briefing.title;
  refs.briefingCopy.textContent = briefing.copy;
  refs.briefingMeta.innerHTML = briefing.meta.length
    ? briefing.meta.map((item) => `<span class="meta-chip">${escapeHtml(item)}</span>`).join("")
    : `<span class="placeholder-chip">요약 정보를 준비하고 있습니다.</span>`;

  refs.signalGrid.innerHTML = briefing.signals.length
    ? briefing.signals
      .map((signal) => {
        return `
          <article class="signal-card tone-${escapeHtml(signal.tone || "medium")}">
            <div class="signal-label">${escapeHtml(signal.label)}</div>
            <div class="signal-value">${escapeHtml(signal.value)}</div>
            <div class="signal-foot">${escapeHtml(signal.foot)}</div>
          </article>
        `;
      })
      .join("")
    : `<article class="placeholder-card">핵심 신호를 계산할 수 없습니다.</article>`;
}

function renderBriefingVisual(items) {
  const visual = buildBriefingVisual(items);
  refs.briefingVisual.className = `radar-card tone-${visual.tone}`;
  refs.briefingPoints.innerHTML = "";

  if (!visual.points.length) {
    refs.briefingVisual.innerHTML = `<article class="placeholder-card">레이더 맵을 만들 수 없습니다.</article>`;
    refs.briefingPoints.innerHTML = `<article class="placeholder-card">바로 읽기 포인트를 계산할 수 없습니다.</article>`;
    return;
  }

  refs.briefingVisual.innerHTML = `
    <div class="radar-head">
      <div>
        <div class="radar-kicker">레이더 맵</div>
        <p class="radar-caption">${escapeHtml(visual.caption)}</p>
      </div>
      <span class="radar-status tone-${escapeHtml(visual.tone)}">${escapeHtml(visual.status)}</span>
    </div>
    <div class="radar-board" aria-hidden="true">
      <div class="radar-cross"></div>
      <div class="radar-sweep"></div>
      <div class="radar-core"></div>
      ${visual.points
        .map((point) => {
          return `
            <div
              class="radar-blip tone-${escapeHtml(point.tone)}"
              style="left:${point.x}%; top:${point.y}%;"
            >
              <span class="radar-dot"></span>
              <span class="radar-blip-label">${escapeHtml(point.label)}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  refs.briefingPoints.innerHTML = visual.points
    .map((point) => {
      return `
        <article class="briefing-point-card tone-${escapeHtml(point.tone)}">
          <div class="briefing-point-label">${escapeHtml(point.label)}</div>
          <div class="briefing-point-value">${escapeHtml(point.value)}</div>
          <p class="briefing-point-note">${escapeHtml(point.note)}</p>
        </article>
      `;
    })
    .join("");
}

function renderRankList(target, entries, selectedId, totalCount, type, onChange) {
  target.innerHTML = "";

  if (!entries.length) {
    target.innerHTML = `<article class="placeholder-card">그래프를 그릴 표본이 없습니다.</article>`;
    return;
  }

  const visibleEntries = getVisibleRankEntries(entries, selectedId);
  const maxCount = visibleEntries[0]?.count || 1;
  const ticks = buildComparisonTicks(maxCount);
  const attributeName = type === "area" ? "data-area-id" : "data-industry-id";
  const axisSummary = `현재 비교군 최고치 ${formatNumber(maxCount)}건`;

  target.innerHTML = `
    <div class="comparison-chart">
      <div class="comparison-chart-head">
        <div class="comparison-axis-caption">${axisSummary}</div>
        <div class="comparison-axis" aria-hidden="true">
          ${ticks
            .map((tick) => `<span>${tick === 0 ? "0" : `${formatNumber(tick)}건`}</span>`)
            .join("")}
        </div>
      </div>
      <div class="comparison-rows">
        ${visibleEntries
          .map((entry, index) => {
            const rank = entry.synthetic ? "비포착" : `#${getEntryRank(entries, entry.id)}`;
            const tone = getComparisonTone(entry, index, maxCount);
            const foot = entry.foot || `전체 ${formatNumber(totalCount)}건 중 ${formatPercent(entry.share)}`;
            const selectedChip = selectedId === entry.id
              ? `<span class="comparison-chip">선택</span>`
              : "";
            const syntheticChip = entry.synthetic
              ? `<span class="comparison-chip comparison-chip-muted">비포착</span>`
              : "";
            const meterWidth = entry.count === 0 ? 0 : Math.max(12, (entry.count / maxCount) * 100);
            return `
              <button
                type="button"
                class="comparison-row tone-${tone}${selectedId === entry.id ? " is-active" : ""}${entry.synthetic ? " is-synthetic" : ""}"
                ${attributeName}="${escapeHtml(entry.id)}"
                aria-pressed="${selectedId === entry.id ? "true" : "false"}"
                style="--bar-width:${meterWidth}%"
              >
                <div class="comparison-row-main">
                  <div class="comparison-rank">${rank}</div>
                  <div class="comparison-copy">
                    <div class="comparison-label">${escapeHtml(entry.label)}</div>
                    <div class="comparison-subtitle">${escapeHtml(entry.hint)}</div>
                  </div>
                  <div class="comparison-stat">
                    <div class="comparison-value">${formatNumber(entry.count)}건</div>
                    <div class="comparison-share">${formatPercent(entry.share)}</div>
                  </div>
                </div>
                <div class="comparison-bar-wrap" aria-hidden="true">
                  <div class="comparison-bar-track">
                    <span class="comparison-bar-fill"></span>
                  </div>
                </div>
                <div class="comparison-foot">
                  ${selectedChip}
                  ${syntheticChip}
                  <span>${escapeHtml(foot)}</span>
                </div>
              </button>
            `;
          })
          .join("")}
      </div>
    </div>
  `;

  target.querySelectorAll(`[${attributeName}]`).forEach((button) => {
    button.addEventListener("click", () => {
      onChange(button.getAttribute(attributeName));
    });
  });
}

function renderAreaRadar() {
  const allItems = getAllItems();
  const areaEntries = buildAreaEntries(allItems);
  const selectedArea = getSelectedAreaEntry(areaEntries);
  const industryEntries = buildIndustryEntries(allItems);
  const selectedIndustry = getSelectedIndustryEntry(industryEntries);
  const sourceItems = selectedIndustry
    ? allItems.filter((item) => getIndustryId(item) === selectedIndustry.id)
    : allItems;
  const entries = withMissingSelection(
    buildAreaEntries(sourceItems),
    selectedArea,
    `${selectedIndustry?.label || "선택 업종"} 기준 표본이 아직 없습니다.`,
  );

  refs.areaSectionTitle.textContent = selectedIndustry
    ? `${selectedIndustry.label}가 많이 보이는 동네`
    : "점포가 많이 잡히는 동네";
  refs.areaNote.textContent = selectedIndustry
    ? `${selectedIndustry.label} 표본 ${formatNumber(sourceItems.length)}건을 기준으로 비교합니다.`
    : `전체 ${formatNumber(sourceItems.length)}건 스냅샷에서 많이 포착된 동네 순서입니다.`;

  renderRankList(refs.areaList, entries, state.area, sourceItems.length, "area", (areaId) => {
    state.area = areaId;
    render();
  });
}

function renderIndustryRadar() {
  const allItems = getAllItems();
  const areaEntries = buildAreaEntries(allItems);
  const selectedArea = getSelectedAreaEntry(areaEntries);
  const sourceItems = selectedArea
    ? allItems.filter((item) => getAreaId(item) === selectedArea.id)
    : allItems;
  const industryEntries = withMissingSelection(
    buildIndustryEntries(sourceItems),
    getSelectedIndustryEntry(buildIndustryEntries(allItems)),
    `${selectedArea?.label || "선택 동네"} 안에서는 아직 포착되지 않았습니다.`,
  );

  refs.categorySectionTitle.textContent = selectedArea
    ? `${selectedArea.label}에서 많이 보이는 업종`
    : "자주 보이는 업종";
  refs.categoryNote.textContent = selectedArea
    ? `${selectedArea.label} 표본 ${formatNumber(sourceItems.length)}건을 기준으로 비교합니다.`
    : `전체 ${formatNumber(sourceItems.length)}건 스냅샷에서 자주 보이는 업종 순서입니다.`;

  renderRankList(
    refs.categoryList,
    industryEntries,
    state.industry,
    sourceItems.length,
    "industry",
    (industryId) => {
      state.industry = industryId;
      render();
    },
  );
}

function buildStoreCards(items) {
  return items
    .map((item) => {
      return `
        <article class="store-card">
          <div class="store-top">
            <div class="store-badges">
              <span class="badge area">${escapeHtml(getAreaLabel(item))}</span>
              <span class="badge industry">${escapeHtml(getIndustryLabel(item))}</span>
              <span class="badge area">${escapeHtml(item.stdrYm || "기준월 없음")}</span>
            </div>
          </div>
          <h3 class="store-title">${escapeHtml(item.bizesNm || "상호 정보 없음")}</h3>
          <p class="store-subtitle">${escapeHtml(item.indsLclsNm || "업종 분류 없음")} · ${escapeHtml(item.indsSclsNm || "세부 업종 없음")}</p>
          <p class="store-address">${escapeHtml(item.rdnmAdr || item.lnoAdr || "주소 정보 없음")}</p>
          <p class="store-micro">${escapeHtml(item.bizesId || "-")} · ${escapeHtml(item.lon || "-")}, ${escapeHtml(item.lat || "-")}</p>
        </article>
      `;
    })
    .join("");
}

function renderStoreList(items) {
  const sortedItems = [...items].sort((left, right) => {
    const areaCompared = getAreaLabel(left).localeCompare(getAreaLabel(right), "ko");
    if (areaCompared !== 0) {
      return areaCompared;
    }

    const industryCompared = getIndustryLabel(left).localeCompare(getIndustryLabel(right), "ko");
    if (industryCompared !== 0) {
      return industryCompared;
    }

    return (left.bizesNm || "").localeCompare(right.bizesNm || "", "ko");
  });

  const visibleItems = sortedItems.slice(0, STORE_LIMIT);
  refs.storeNote.textContent = items.length
    ? `총 ${formatNumber(items.length)}건 중 ${formatNumber(visibleItems.length)}건만 먼저 보여줍니다.`
    : "현재 조건에 맞는 점포 샘플이 없습니다.";

  if (!items.length) {
    refs.storeList.innerHTML = `
      <article class="placeholder-card">점포 샘플이 없습니다. 위 레이더에서 다른 동네나 업종을 눌러보세요.</article>
    `;
    return;
  }

  refs.storeList.innerHTML = buildStoreCards(visibleItems);
}

function render() {
  const items = getFilteredItems();
  renderFilterSections();
  renderBriefing(items);
  renderBriefingVisual(items);
  renderAreaRadar();
  renderIndustryRadar();
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
    refs.snapshotChip.textContent = state.data.snapshotMode === "live" ? "실 API 스냅샷" : "문서 기반 데모";
    refs.heroStatus.textContent = `${formatDateTime(state.data.updatedAt)} · ${
      countUnique(getAllItems(), getAreaId)
    }개 동네 · ${
      countUnique(getAllItems(), getIndustryId)
    }개 업종`;
    render();
  } catch (error) {
    console.error(error);
    refs.heroStatus.textContent = "스냅샷을 불러오지 못했습니다.";
    refs.areaFilter.innerHTML = `<article class="placeholder-card">commercial-area-radar/latest-commercial-area-snapshot.json 파일을 확인해 주세요.</article>`;
    refs.industryFilter.innerHTML = "";
    refs.briefingTitle.textContent = "브리핑을 렌더링하지 못했습니다.";
    refs.briefingCopy.textContent = "스냅샷이 없어 핵심 진단을 계산할 수 없습니다.";
    refs.briefingVisual.className = "radar-card tone-low";
    refs.briefingVisual.innerHTML = `<article class="placeholder-card">스냅샷이 없어 레이더 맵을 렌더링하지 못했습니다.</article>`;
    refs.briefingPoints.innerHTML = `<article class="placeholder-card">스냅샷이 없어 바로 읽기 포인트를 렌더링하지 못했습니다.</article>`;
    refs.briefingMeta.innerHTML = `<span class="placeholder-chip">스냅샷 필요</span>`;
    refs.signalGrid.innerHTML = `<article class="placeholder-card">스냅샷이 없어 핵심 신호를 렌더링하지 못했습니다.</article>`;
    refs.areaList.innerHTML = `<article class="placeholder-card">스냅샷이 없어 동네 레이더를 렌더링하지 못했습니다.</article>`;
    refs.categoryList.innerHTML = `<article class="placeholder-card">스냅샷이 없어 업종 레이더를 렌더링하지 못했습니다.</article>`;
    refs.storeList.innerHTML = `<article class="placeholder-card">스냅샷이 없어 점포 목록을 렌더링하지 못했습니다.</article>`;
  }
}

init();
