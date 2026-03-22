const TOP_RANK_LIMIT = 5;
const FOCUS_RANK_LIMIT = 6;
const FILTER_PREVIEW_LIMIT = 8;
const SEARCH_RESULT_LIMIT = 8;
const RECENT_SELECTION_LIMIT = 3;
const FREQUENT_SELECTION_LIMIT = 3;
const SNAPSHOT_ARCHIVE_LIMIT = 6;

const state = {
  area: "all",
  industry: "all",
  areaBasis: "context",
  industryBasis: "context",
  areaGranularity: "adong",
  areaRankView: "focus",
  industryRankView: "focus",
  areaQuery: "",
  industryQuery: "",
  pickerType: null,
  pickerQuery: "",
  recentAreas: [],
  recentIndustries: [],
  areaSelectionCounts: {},
  industrySelectionCounts: {},
  snapshotArchive: [],
  currentSnapshotSummary: null,
  previousSnapshotSummary: null,
  data: null,
};

const refs = {
  heroStatus: document.getElementById("hero-status"),
  snapshotChip: document.getElementById("snapshot-chip"),
  areaSearch: document.getElementById("area-search"),
  industrySearch: document.getElementById("industry-search"),
  areaSuggestions: document.getElementById("area-suggestions"),
  industrySuggestions: document.getElementById("industry-suggestions"),
  areaPickerOpen: document.getElementById("area-picker-open"),
  industryPickerOpen: document.getElementById("industry-picker-open"),
  areaHelper: document.getElementById("area-helper"),
  industryHelper: document.getElementById("industry-helper"),
  areaFilter: document.getElementById("area-filter"),
  industryFilter: document.getElementById("industry-filter"),
  briefingTitle: document.getElementById("briefing-title"),
  briefingCopy: document.getElementById("briefing-copy"),
  briefingVisual: document.getElementById("briefing-visual"),
  briefingPoints: document.getElementById("briefing-points"),
  briefingMeta: document.getElementById("briefing-meta"),
  selectionSummary: document.getElementById("selection-summary"),
  signalGrid: document.getElementById("signal-grid"),
  areaSectionTitle: document.getElementById("area-section-title"),
  areaNote: document.getElementById("area-note"),
  areaActions: document.getElementById("area-actions"),
  areaList: document.getElementById("area-list"),
  categorySectionTitle: document.getElementById("category-section-title"),
  categoryNote: document.getElementById("category-note"),
  categoryActions: document.getElementById("category-actions"),
  categoryList: document.getElementById("category-list"),
  filterPicker: document.getElementById("filter-picker"),
  pickerBackdrop: document.getElementById("picker-backdrop"),
  pickerKicker: document.getElementById("picker-kicker"),
  pickerTitle: document.getElementById("picker-title"),
  pickerNote: document.getElementById("picker-note"),
  pickerSearch: document.getElementById("picker-search"),
  pickerQuick: document.getElementById("picker-quick"),
  pickerGroups: document.getElementById("picker-groups"),
  pickerClose: document.getElementById("picker-close"),
};

const getAreaId = (item) => item.adongCd || item.signguCd || "";
const getSignguId = (item) => item.signguCd || "";
const getIndustryId = (item) => item.indsMclsCd || item.indsLclsCd || "";

function getAreaLabel(item) {
  return [item.signguNm, item.adongNm].filter(Boolean).join(" ").trim() || item.signguNm || "미상 동네";
}

function getIndustryLabel(item) {
  return item.indsMclsNm || item.indsLclsNm || "미상 업종";
}

function getSignguLabel(item) {
  return item.signguNm || "미상 구";
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

function getRecentStorageKey(type) {
  return `commercial-area-radar-recent-${type}`;
}

function getCountStorageKey(type) {
  return `commercial-area-radar-count-${type}`;
}

function getSnapshotArchiveKey() {
  return "commercial-area-radar-snapshot-archive";
}

function loadRecentSelections(type) {
  try {
    const rawValue = window.localStorage.getItem(getRecentStorageKey(type));
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value) => typeof value === "string")
      .slice(0, RECENT_SELECTION_LIMIT);
  } catch {
    return [];
  }
}

function saveRecentSelections(type, values) {
  try {
    window.localStorage.setItem(getRecentStorageKey(type), JSON.stringify(values));
  } catch {
    // Ignore storage failures and keep the in-memory fallback.
  }
}

function loadSelectionCounts(type) {
  try {
    const rawValue = window.localStorage.getItem(getCountStorageKey(type));
    const parsed = rawValue ? JSON.parse(rawValue) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => Number.isFinite(value) && value > 0),
    );
  } catch {
    return {};
  }
}

function saveSelectionCounts(type, values) {
  try {
    window.localStorage.setItem(getCountStorageKey(type), JSON.stringify(values));
  } catch {
    // Ignore storage failures and keep the in-memory fallback.
  }
}

function loadSnapshotArchive() {
  try {
    const rawValue = window.localStorage.getItem(getSnapshotArchiveKey());
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => {
      return entry
        && typeof entry.updatedAt === "string"
        && typeof entry.totalCount === "number"
        && typeof entry.areaCounts === "object"
        && typeof entry.signguCounts === "object"
        && typeof entry.industryCounts === "object";
    });
  } catch {
    return [];
  }
}

function saveSnapshotArchive(archive) {
  try {
    window.localStorage.setItem(getSnapshotArchiveKey(), JSON.stringify(archive));
  } catch {
    // Ignore storage failures and keep the in-memory fallback.
  }
}

function summarizeCounts(items, selector) {
  return items.reduce((accumulator, item) => {
    const key = selector(item);
    if (!key) {
      return accumulator;
    }

    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
}

function buildSnapshotSummary(data) {
  const items = data?.items || [];
  return {
    updatedAt: data?.updatedAt || new Date().toISOString(),
    totalCount: items.length,
    areaCounts: summarizeCounts(items, getAreaId),
    signguCounts: summarizeCounts(items, getSignguId),
    industryCounts: summarizeCounts(items, getIndustryId),
  };
}

function syncSnapshotArchive(data) {
  const currentSummary = buildSnapshotSummary(data);
  const existingArchive = loadSnapshotArchive().filter((entry) => entry.updatedAt !== currentSummary.updatedAt);
  const nextArchive = [currentSummary, ...existingArchive].slice(0, SNAPSHOT_ARCHIVE_LIMIT);

  state.snapshotArchive = nextArchive;
  state.currentSnapshotSummary = currentSummary;
  state.previousSnapshotSummary = nextArchive.find((entry) => entry.updatedAt !== currentSummary.updatedAt) || null;
  saveSnapshotArchive(nextArchive);
}

function rememberSelection(type, id) {
  if (id === "all") {
    return;
  }

  const stateKey = type === "area" ? "recentAreas" : "recentIndustries";
  const nextValues = [id, ...state[stateKey].filter((value) => value !== id)].slice(0, RECENT_SELECTION_LIMIT);
  state[stateKey] = nextValues;
  saveRecentSelections(type, nextValues);

  const countStateKey = type === "area" ? "areaSelectionCounts" : "industrySelectionCounts";
  const nextCounts = {
    ...state[countStateKey],
    [id]: (state[countStateKey][id] || 0) + 1,
  };
  state[countStateKey] = nextCounts;
  saveSelectionCounts(type, nextCounts);
}

function getAllItems() {
  return state.data?.items || [];
}

function getSelectedAreaItem(items = getAllItems()) {
  if (state.area === "all") {
    return null;
  }

  return items.find((item) => getAreaId(item) === state.area) || null;
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

function getVisibleRankEntries(entries, selectedId, mode = "focus") {
  const limit = mode === "top" ? TOP_RANK_LIMIT : FOCUS_RANK_LIMIT;

  if (entries.length <= limit) {
    return entries;
  }

  if (mode === "top" || selectedId === "all") {
    return entries.slice(0, TOP_RANK_LIMIT);
  }

  const selectedIndex = entries.findIndex((entry) => entry.id === selectedId);
  if (selectedIndex === -1) {
    return entries.slice(0, TOP_RANK_LIMIT);
  }

  if (selectedIndex < limit) {
    return entries.slice(0, limit);
  }

  const halfWindow = Math.floor(limit / 2);
  let startIndex = Math.max(0, selectedIndex - halfWindow);
  let endIndex = startIndex + limit;

  if (endIndex > entries.length) {
    endIndex = entries.length;
    startIndex = Math.max(0, endIndex - limit);
  }

  return entries.slice(startIndex, endIndex);
}

function getAreaEntryId(item, granularity = "adong") {
  return granularity === "signgu" ? getSignguId(item) : getAreaId(item);
}

function getAreaEntryLabel(item, granularity = "adong") {
  return granularity === "signgu" ? getSignguLabel(item) : getAreaLabel(item);
}

function getAreaEntryHint(item, granularity = "adong") {
  return granularity === "signgu"
    ? item.ctprvnNm || "광역시도"
    : item.ctprvnNm || item.signguNm;
}

function buildAreaSelectionEntry(item, granularity = "adong") {
  if (!item) {
    return null;
  }

  return {
    id: getAreaEntryId(item, granularity),
    label: getAreaEntryLabel(item, granularity),
    hint: getAreaEntryHint(item, granularity),
  };
}

function getAreaSummaryCounts(granularity = "adong") {
  if (granularity === "signgu") {
    return {
      current: state.currentSnapshotSummary?.signguCounts || null,
      previous: state.previousSnapshotSummary?.signguCounts || null,
    };
  }

  return {
    current: state.currentSnapshotSummary?.areaCounts || null,
    previous: state.previousSnapshotSummary?.areaCounts || null,
  };
}

function getSelectionDelta(currentCounts, previousCounts, id) {
  if (!currentCounts || !previousCounts || !id) {
    return null;
  }

  return (currentCounts[id] || 0) - (previousCounts[id] || 0);
}

function formatDeltaLabel(delta) {
  if (delta === null) {
    return "직전 스냅샷 없음";
  }

  if (delta === 0) {
    return "직전 동일";
  }

  return `직전 ${delta > 0 ? "+" : ""}${formatNumber(delta)}건`;
}

function getDeltaTone(delta) {
  if (delta === null) {
    return "none";
  }

  if (delta > 0) {
    return "up";
  }

  if (delta < 0) {
    return "down";
  }

  return "flat";
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
        groupLabel: item.signguNm || item.ctprvnNm || "기타 동네",
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
      groupLabel: "빠른 선택",
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
        groupLabel: item.indsLclsNm || "기타 업종",
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
      groupLabel: "빠른 선택",
      count: getAllItems().length,
      searchText: "전체 업종",
    },
    ...options,
  ];
}

function buildAreaEntries(items, granularity = "adong") {
  const totalCount = items.length || 1;
  return Array.from(groupBy(items, (item) => getAreaEntryId(item, granularity)).values())
    .map((groupedItems) => {
      const item = groupedItems[0];
      return {
        id: getAreaEntryId(item, granularity),
        label: getAreaEntryLabel(item, granularity),
        hint: getAreaEntryHint(item, granularity),
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

function getOptionById(options, id) {
  return options.find((option) => option.id === id) || null;
}

function getMatchedOptions(options, query, limit = SEARCH_RESULT_LIMIT) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return options
    .filter((option) => option.searchText.includes(normalizedQuery))
    .slice(0, limit);
}

function getContextualFilterEntries(type) {
  const allItems = getAllItems();
  if (type === "area") {
    const sourceItems = state.industry === "all" ? allItems : allItems.filter(matchesSelectedIndustry);
    return buildAreaEntries(sourceItems);
  }

  const sourceItems = state.area === "all" ? allItems : allItems.filter(matchesSelectedArea);
  return buildIndustryEntries(sourceItems);
}

function getFilterPreviewOptions(type, options, selectedId) {
  const previewOptions = [];
  const allOption = options[0];
  const selectedOption = getOptionById(options, selectedId);

  if (allOption) {
    previewOptions.push(allOption);
  }

  if (selectedOption && selectedOption.id !== allOption?.id) {
    previewOptions.push(selectedOption);
  }

  getContextualFilterEntries(type).forEach((entry) => {
    const option = getOptionById(options, entry.id);
    if (option && !previewOptions.some((previewOption) => previewOption.id === option.id)) {
      previewOptions.push(option);
    }
  });

  return previewOptions.slice(0, FILTER_PREVIEW_LIMIT);
}

function getFilterHelperText(type, totalCount, previewCount, matchCount) {
  const label = type === "area" ? "행정동" : "업종";
  if (matchCount !== null) {
    return matchCount
      ? `${totalCount}개 ${label} 중 검색 결과 ${matchCount}개`
      : `${totalCount}개 ${label} 중 검색 결과가 없습니다.`;
  }

  return `${totalCount}개 ${label} 중 지금 볼 ${previewCount}개만 먼저 보여줍니다. 나머지는 전체 보기에서 찾습니다.`;
}

function formatTopPercentLabel(rank, total) {
  if (!rank || !total) {
    return null;
  }

  return `상위 ${formatPercent((rank / total) * 100)}`;
}

function formatShareLabel(share) {
  if (!Number.isFinite(share)) {
    return null;
  }

  return `비중 ${formatPercent(share)}`;
}

function selectFilter(type, id, shouldClosePicker = false) {
  rememberSelection(type, id);
  state[type] = id;
  state[`${type}Query`] = "";

  if (shouldClosePicker) {
    state.pickerType = null;
    state.pickerQuery = "";
  }

  render();
}

function renderFilterPreview(target, options, selectedId, type) {
  target.innerHTML = "";

  if (!options.length) {
    target.innerHTML = `<div class="empty-search">추천 항목을 준비하고 있습니다.</div>`;
    return;
  }

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-button${selectedId === option.id ? " is-active" : ""}`;
    button.textContent = option.label;
    button.title = option.hint ? `${option.hint} · ${option.count}건` : option.label;
    button.addEventListener("click", () => selectFilter(type, option.id));
    target.appendChild(button);
  });
}

function renderSuggestionList(target, options, query, selectedId, type) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    target.hidden = true;
    target.innerHTML = "";
    return 0;
  }

  const matchedOptions = getMatchedOptions(options, normalizedQuery);
  target.hidden = false;

  if (!matchedOptions.length) {
    target.innerHTML = `<article class="suggestion-empty">검색 결과가 없습니다.</article>`;
    return 0;
  }

  target.innerHTML = matchedOptions
    .map((option) => {
      const meta = option.id === "all"
        ? "필터 해제"
        : `${escapeHtml(option.hint || "")} · ${formatNumber(option.count)}건`;
      return `
        <button
          type="button"
          class="suggestion-card${selectedId === option.id ? " is-active" : ""}"
          data-suggestion-id="${escapeHtml(option.id)}"
        >
          <span class="suggestion-copy">
            <span class="suggestion-title">${escapeHtml(option.label)}</span>
            <span class="suggestion-meta">${meta}</span>
          </span>
        </button>
      `;
    })
    .join("");

  target.querySelectorAll("[data-suggestion-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectFilter(type, button.getAttribute("data-suggestion-id"));
    });
  });

  return matchedOptions.length;
}

function renderFilterSections() {
  const areaOptions = buildAreaOptions();
  const areaPreview = getFilterPreviewOptions("area", areaOptions, state.area);
  refs.areaSearch.value = state.areaQuery;
  const areaMatchCount = renderSuggestionList(
    refs.areaSuggestions,
    areaOptions,
    state.areaQuery,
    state.area,
    "area",
  );
  refs.areaHelper.textContent = getFilterHelperText(
    "area",
    areaOptions.length - 1,
    areaPreview.length,
    state.areaQuery.trim() ? areaMatchCount : null,
  );
  renderFilterPreview(refs.areaFilter, areaPreview, state.area, "area");

  const industryOptions = buildIndustryOptions();
  const industryPreview = getFilterPreviewOptions("industry", industryOptions, state.industry);
  refs.industrySearch.value = state.industryQuery;
  const industryMatchCount = renderSuggestionList(
    refs.industrySuggestions,
    industryOptions,
    state.industryQuery,
    state.industry,
    "industry",
  );
  refs.industryHelper.textContent = getFilterHelperText(
    "industry",
    industryOptions.length - 1,
    industryPreview.length,
    state.industryQuery.trim() ? industryMatchCount : null,
  );
  renderFilterPreview(refs.industryFilter, industryPreview, state.industry, "industry");
}

function buildPickerGroups(options) {
  return Array.from(groupBy(options, (option) => option.groupLabel || "기타").entries())
    .map(([label, groupedOptions]) => {
      return {
        label,
        totalCount: groupedOptions.reduce((sum, option) => sum + option.count, 0),
        options: [...groupedOptions].sort((left, right) => {
          if (right.count !== left.count) {
            return right.count - left.count;
          }

          return left.label.localeCompare(right.label, "ko");
        }),
      };
    })
    .sort((left, right) => {
      if (right.totalCount !== left.totalCount) {
        return right.totalCount - left.totalCount;
      }

      return left.label.localeCompare(right.label, "ko");
    });
}

function renderPickerOption(option, selectedId) {
  const meta = option.id === "all"
    ? "필터 해제"
    : option.metaOverride || `${option.hint || ""} · ${formatNumber(option.count)}건`;
  return `
    <button
      type="button"
      class="picker-option${selectedId === option.id ? " is-active" : ""}"
      data-picker-option-id="${escapeHtml(option.id)}"
    >
      <span class="picker-option-label">${escapeHtml(option.label)}</span>
      <span class="picker-option-meta">${escapeHtml(meta)}</span>
    </button>
  `;
}

function renderPickerQuickSection(title, options, selectedId) {
  if (!options.length) {
    return "";
  }

  return `
    <section class="picker-quick-section">
      <div class="picker-quick-title">${escapeHtml(title)}</div>
      <div class="picker-option-grid">
        ${options.map((option) => renderPickerOption(option, selectedId)).join("")}
      </div>
    </section>
  `;
}

function getFrequentOptions(type, options, excludedIds) {
  const countStateKey = type === "area" ? "areaSelectionCounts" : "industrySelectionCounts";

  return Object.entries(state[countStateKey])
    .map(([id, count]) => {
      const option = getOptionById(options, id);
      if (!option || excludedIds.has(id)) {
        return null;
      }

      return {
        ...option,
        metaOverride: `${formatNumber(count)}번 선택${option.hint ? ` · ${option.hint}` : ""}`,
        selectionCount: count,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.selectionCount !== left.selectionCount) {
        return right.selectionCount - left.selectionCount;
      }

      return left.label.localeCompare(right.label, "ko");
    })
    .slice(0, FREQUENT_SELECTION_LIMIT);
}

function openPicker(type) {
  state.pickerType = type;
  state.pickerQuery = "";
  render();
  requestAnimationFrame(() => {
    refs.pickerSearch.focus();
  });
}

function closePicker() {
  state.pickerType = null;
  state.pickerQuery = "";
  render();
}

function renderPicker() {
  const isOpen = Boolean(state.pickerType);
  document.body.classList.toggle("picker-open", isOpen);
  refs.filterPicker.hidden = !isOpen;

  if (!isOpen) {
    refs.pickerQuick.innerHTML = "";
    refs.pickerGroups.innerHTML = "";
    refs.pickerSearch.value = "";
    return;
  }

  const type = state.pickerType;
  const options = type === "area" ? buildAreaOptions() : buildIndustryOptions();
  const selectedId = state[type];
  const totalCount = Math.max(options.length - 1, 0);
  const query = state.pickerQuery.trim();
  const quickOptions = [options[0], getOptionById(options, selectedId)].filter((option, index, array) => {
    return option && array.findIndex((candidate) => candidate.id === option.id) === index;
  });
  const recentStateKey = type === "area" ? "recentAreas" : "recentIndustries";
  const recentOptions = state[recentStateKey]
    .map((id) => getOptionById(options, id))
    .filter((option, index, array) => {
      return option
        && option.id !== "all"
        && array.findIndex((candidate) => candidate.id === option.id) === index
        && !quickOptions.some((quickOption) => quickOption.id === option.id);
    });
  const quickIds = new Set([
    ...quickOptions.map((option) => option?.id).filter(Boolean),
    ...recentOptions.map((option) => option?.id).filter(Boolean),
  ]);
  const frequentOptions = getFrequentOptions(type, options, quickIds);
  const visibleOptions = query
    ? getMatchedOptions(options, query, Number.MAX_SAFE_INTEGER).filter((option) => option.id !== "all")
    : options.slice(1);
  const groups = buildPickerGroups(visibleOptions);

  refs.pickerKicker.textContent = type === "area" ? "행정동 전체 보기" : "업종 전체 보기";
  refs.pickerTitle.textContent = type === "area" ? "동네를 넓게 훑어보기" : "업종을 넓게 훑어보기";
  refs.pickerNote.textContent = query
    ? `검색 결과 ${visibleOptions.length}개`
    : type === "area"
      ? `${totalCount}개 행정동을 구 기준으로 정리했습니다.`
      : `${totalCount}개 업종을 분류 기준으로 정리했습니다.`;
  refs.pickerSearch.placeholder = type === "area"
    ? "예: 서교동, 성수, 정자동"
    : "예: 카페, 편의점, 병의원";
  refs.pickerSearch.value = state.pickerQuery;

  refs.pickerQuick.innerHTML = [
    renderPickerQuickSection("빠른 선택", quickOptions, selectedId),
    renderPickerQuickSection("최근 선택", recentOptions, selectedId),
    renderPickerQuickSection("자주 선택", frequentOptions, selectedId),
  ]
    .filter(Boolean)
    .join("");

  refs.pickerGroups.innerHTML = groups.length
    ? groups
      .map((group) => {
        return `
          <section class="picker-group">
            <div class="picker-group-head">
              <h3 class="picker-group-title">${escapeHtml(group.label)}</h3>
              <span class="picker-group-count">${formatNumber(group.options.length)}개</span>
            </div>
            <div class="picker-option-grid">
              ${group.options.map((option) => renderPickerOption(option, selectedId)).join("")}
            </div>
          </section>
        `;
      })
      .join("")
    : `<article class="placeholder-card">검색 결과가 없습니다.</article>`;

  refs.filterPicker.querySelectorAll("[data-picker-option-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectFilter(type, button.getAttribute("data-picker-option-id"), true);
    });
  });
}

function renderComparisonActions({
  target,
  type,
  basis,
  canToggleContext,
  areaGranularity,
  rank,
  total,
  share,
  deltaLabel,
  deltaTone,
  rankView,
  canToggleRankView,
}) {
  const percentileLabel = formatTopPercentLabel(rank, total);
  const shareLabel = formatShareLabel(share);
  const rankLabel = rank && total ? `${rank} / ${formatNumber(total)}위` : null;
  const parts = [];

  if (canToggleContext) {
    parts.push(`
      <div class="comparison-toggle" role="group" aria-label="${type === "area" ? "동네" : "업종"} 비교 기준">
        <button
          type="button"
          class="comparison-toggle-button${basis === "context" ? " is-active" : ""}"
          data-comparison-basis="context"
        >
          현재 필터 기준
        </button>
        <button
          type="button"
          class="comparison-toggle-button${basis === "nationwide" ? " is-active" : ""}"
          data-comparison-basis="nationwide"
        >
          전국 기준
        </button>
      </div>
    `);
  }

  if (type === "area") {
    parts.push(`
      <div class="comparison-toggle" role="group" aria-label="동네 비교 레벨">
        <button
          type="button"
          class="comparison-toggle-button${areaGranularity === "adong" ? " is-active" : ""}"
          data-area-granularity="adong"
        >
          행정동
        </button>
        <button
          type="button"
          class="comparison-toggle-button${areaGranularity === "signgu" ? " is-active" : ""}"
          data-area-granularity="signgu"
        >
          구 단위
        </button>
      </div>
    `);
  }

  if (canToggleRankView) {
    parts.push(`
      <div class="comparison-toggle" role="group" aria-label="${type === "area" ? "동네" : "업종"} 순위 보기 방식">
        <button
          type="button"
          class="comparison-toggle-button${rankView === "top" ? " is-active" : ""}"
          data-rank-view="top"
        >
          Top 5
        </button>
        <button
          type="button"
          class="comparison-toggle-button${rankView === "focus" ? " is-active" : ""}"
          data-rank-view="focus"
        >
          주변 순위
        </button>
      </div>
    `);
  }

  if (percentileLabel) {
    parts.push(`<span class="comparison-pill">${escapeHtml(percentileLabel)}</span>`);
  }

  if (deltaLabel) {
    parts.push(`
      <span class="comparison-pill comparison-pill-delta comparison-pill-delta-${escapeHtml(deltaTone || "none")}">
        ${escapeHtml(deltaLabel)}
      </span>
    `);
  }

  if (shareLabel) {
    parts.push(`<span class="comparison-pill comparison-pill-muted">${escapeHtml(shareLabel)}</span>`);
  }

  if (rankLabel) {
    parts.push(`<span class="comparison-pill comparison-pill-muted">${escapeHtml(rankLabel)}</span>`);
  }

  target.innerHTML = parts.join("");
  target.hidden = parts.length === 0;
  target.querySelectorAll("[data-comparison-basis]").forEach((button) => {
    button.addEventListener("click", () => {
      state[`${type}Basis`] = button.getAttribute("data-comparison-basis");
      render();
    });
  });
  target.querySelectorAll("[data-area-granularity]").forEach((button) => {
    button.addEventListener("click", () => {
      state.areaGranularity = button.getAttribute("data-area-granularity");
      render();
    });
  });
  target.querySelectorAll("[data-rank-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state[`${type}RankView`] = button.getAttribute("data-rank-view");
      render();
    });
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

function renderSelectionSummary() {
  const allItems = getAllItems();
  const areaEntries = buildAreaEntries(allItems);
  const selectedArea = getSelectedAreaEntry(areaEntries);
  const selectedAreaItem = getSelectedAreaItem(allItems);
  const industryEntries = buildIndustryEntries(allItems);
  const selectedIndustry = getSelectedIndustryEntry(industryEntries);
  const chips = [];

  if (selectedArea || selectedIndustry) {
    chips.push(`<span class="selection-pill selection-pill-strong">현재 선택</span>`);
  } else {
    chips.push(`<span class="selection-pill selection-pill-muted">동네나 업종을 고르면 현재 조합이 여기에 고정됩니다.</span>`);
  }

  if (selectedArea) {
    chips.push(`<span class="selection-pill">${escapeHtml(selectedArea.label)}</span>`);
  }

  if (selectedAreaItem?.signguNm) {
    chips.push(`<span class="selection-pill selection-pill-muted">소속 구 ${escapeHtml(selectedAreaItem.signguNm)}</span>`);
  }

  if (selectedIndustry) {
    chips.push(`<span class="selection-pill">${escapeHtml(selectedIndustry.label)}</span>`);
  }

  chips.push(`
    <span class="selection-pill selection-pill-muted">
      동네 차트 ${escapeHtml(state.areaGranularity === "signgu" ? "구 단위" : "행정동")}
    </span>
  `);

  if (selectedIndustry) {
    chips.push(`
      <span class="selection-pill selection-pill-muted">
        동네 비교 ${escapeHtml(state.areaBasis === "context" ? "현재 필터" : "전국 기준")}
      </span>
    `);
  }

  if (selectedArea) {
    chips.push(`
      <span class="selection-pill selection-pill-muted">
        업종 비교 ${escapeHtml(state.industryBasis === "context" ? "현재 필터" : "전국 기준")}
      </span>
    `);
  }

  chips.push(`
    <span class="selection-pill ${state.previousSnapshotSummary ? "selection-pill-history" : "selection-pill-muted"}">
      ${escapeHtml(
        state.previousSnapshotSummary
          ? `직전 비교 ${formatDateTime(state.previousSnapshotSummary.updatedAt)}`
          : "직전 스냅샷 없음",
      )}
    </span>
  `);

  refs.selectionSummary.innerHTML = chips.join("");
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

function renderRankList(target, entries, selectedId, totalCount, type, rankView, interactive, onChange) {
  target.innerHTML = "";

  if (!entries.length) {
    target.innerHTML = `<article class="placeholder-card">그래프를 그릴 표본이 없습니다.</article>`;
    return;
  }

  const visibleEntries = getVisibleRankEntries(entries, selectedId, rankView);
  const maxCount = visibleEntries[0]?.count || 1;
  const ticks = buildComparisonTicks(maxCount);
  const attributeName = type === "area" ? "data-area-id" : "data-industry-id";
  const axisModeLabel = rankView === "top" || selectedId === "all"
    ? `Top ${formatNumber(visibleEntries.length)}`
    : `주변 순위 ${formatNumber(visibleEntries.length)}개`;
  const axisSummary = `${axisModeLabel} · 현재 비교군 최고치 ${formatNumber(maxCount)}건`;

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
                class="comparison-row tone-${tone}${selectedId === entry.id ? " is-active" : ""}${entry.synthetic ? " is-synthetic" : ""}${!interactive ? " is-static" : ""}"
                ${attributeName}="${escapeHtml(entry.id)}"
                aria-pressed="${selectedId === entry.id ? "true" : "false"}"
                ${interactive ? "" : "disabled"}
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

  if (!interactive) {
    return;
  }

  target.querySelectorAll(`[${attributeName}]`).forEach((button) => {
    button.addEventListener("click", () => {
      onChange(button.getAttribute(attributeName));
    });
  });
}

function renderAreaRadar() {
  const allItems = getAllItems();
  const selectedAreaItem = getSelectedAreaItem(allItems);
  const selectedArea = selectedAreaItem ? buildAreaSelectionEntry(selectedAreaItem, "adong") : null;
  const selectedAreaComparisonEntry = selectedAreaItem
    ? buildAreaSelectionEntry(selectedAreaItem, state.areaGranularity)
    : null;
  const selectedAreaComparisonId = selectedAreaComparisonEntry?.id || "all";
  const industryEntries = buildIndustryEntries(allItems);
  const selectedIndustry = getSelectedIndustryEntry(industryEntries);
  const useContextBasis = state.areaBasis === "context" && Boolean(selectedIndustry);
  const sourceItems = useContextBasis
    ? allItems.filter((item) => getIndustryId(item) === selectedIndustry.id)
    : allItems;
  const comparisonEntries = buildAreaEntries(sourceItems, state.areaGranularity);
  const entries = withMissingSelection(
    comparisonEntries,
    selectedAreaComparisonEntry,
    `${selectedIndustry?.label || "선택 업종"} 기준 ${selectedAreaComparisonEntry?.label || "선택 지역"} 표본이 아직 없습니다.`,
  );
  const selectedAreaRank = selectedAreaComparisonEntry
    ? getEntryRank(comparisonEntries, selectedAreaComparisonId)
    : null;
  const selectedAreaShare = selectedAreaComparisonEntry
    ? comparisonEntries.find((entry) => entry.id === selectedAreaComparisonId)?.share || 0
    : null;
  const areaSummaryCounts = getAreaSummaryCounts(state.areaGranularity);
  const selectedAreaDelta = selectedAreaComparisonEntry
    ? getSelectionDelta(areaSummaryCounts.current, areaSummaryCounts.previous, selectedAreaComparisonId)
    : null;

  renderComparisonActions(
    {
      target: refs.areaActions,
      type: "area",
      basis: useContextBasis ? "context" : "nationwide",
      canToggleContext: Boolean(selectedIndustry),
      areaGranularity: state.areaGranularity,
      rank: selectedAreaRank,
      total: comparisonEntries.length,
      share: selectedAreaShare,
      deltaLabel: selectedAreaComparisonEntry ? formatDeltaLabel(selectedAreaDelta) : null,
      deltaTone: getDeltaTone(selectedAreaDelta),
      rankView: state.areaRankView,
      canToggleRankView: Boolean(selectedAreaComparisonEntry),
    },
  );

  const areaUnitLabel = state.areaGranularity === "signgu" ? "구" : "동네";
  const interactive = state.areaGranularity === "adong";
  const readOnlyNote = interactive ? "" : " 구 단위 비교는 읽기 전용입니다.";

  if (useContextBasis) {
    refs.areaSectionTitle.textContent = `${selectedIndustry.label}가 많이 보이는 ${areaUnitLabel}`;
    refs.areaNote.textContent = selectedAreaComparisonEntry
      ? `${selectedIndustry.label} 기준 ${selectedAreaComparisonEntry.label}은 ${
        selectedAreaRank ? `${selectedAreaRank}위` : "비포착"
      }입니다. 총 ${formatNumber(sourceItems.length)}건을 기준으로 비교합니다.${
        state.areaGranularity === "signgu" && selectedArea
          ? ` 현재 선택 동네는 ${selectedArea.label}입니다.`
          : ""
      }${readOnlyNote}`
      : `${selectedIndustry.label} 표본 ${formatNumber(sourceItems.length)}건을 기준으로 비교합니다.`;
  } else if (selectedAreaComparisonEntry) {
    refs.areaSectionTitle.textContent = `${selectedAreaComparisonEntry.label}의 전체 ${areaUnitLabel} 순위`;
    refs.areaNote.textContent = selectedIndustry
      ? `전국 기준으로 다시 보면 ${selectedAreaComparisonEntry.label}은 전체 ${formatNumber(comparisonEntries.length)}개 ${areaUnitLabel} 중 ${
        selectedAreaRank ? `${selectedAreaRank}위` : "순위 밖"
      }입니다. 선택 업종은 비교축에서 제외했습니다.${
        state.areaGranularity === "signgu" && selectedArea
          ? ` 현재 선택 동네 ${selectedArea.label}의 소속 구를 기준으로 잡았습니다.`
          : ""
      }${readOnlyNote}`
      : `${selectedAreaComparisonEntry.label}가 전체 ${formatNumber(comparisonEntries.length)}개 ${areaUnitLabel} 중 어디쯤 있는지 ${
        state.areaRankView === "top" ? "상위 랭킹으로" : "주변 순위와 같이"
      } 봅니다.${readOnlyNote}`;
  } else if (selectedIndustry) {
    refs.areaSectionTitle.textContent = `점포가 많이 잡히는 ${areaUnitLabel}`;
    refs.areaNote.textContent = `전국 기준으로 다시 비교 중입니다. 선택 업종을 제외한 전체 ${formatNumber(sourceItems.length)}건 스냅샷 순서입니다.${readOnlyNote}`;
  } else {
    refs.areaSectionTitle.textContent = `점포가 많이 잡히는 ${areaUnitLabel}`;
    refs.areaNote.textContent = `전체 ${formatNumber(sourceItems.length)}건 스냅샷에서 많이 포착된 ${areaUnitLabel} 순서입니다.${readOnlyNote}`;
  }

  renderRankList(
    refs.areaList,
    entries,
    selectedAreaComparisonId,
    sourceItems.length,
    "area",
    state.areaRankView,
    interactive,
    (areaId) => {
    selectFilter("area", areaId);
    },
  );
}

function renderIndustryRadar() {
  const allItems = getAllItems();
  const areaEntries = buildAreaEntries(allItems);
  const selectedArea = getSelectedAreaEntry(areaEntries);
  const allIndustryEntries = buildIndustryEntries(allItems);
  const selectedIndustry = getSelectedIndustryEntry(allIndustryEntries);
  const useContextBasis = state.industryBasis === "context" && Boolean(selectedArea);
  const sourceItems = useContextBasis
    ? allItems.filter((item) => getAreaId(item) === selectedArea.id)
    : allItems;
  const comparisonEntries = buildIndustryEntries(sourceItems);
  const industryEntries = withMissingSelection(
    comparisonEntries,
    selectedIndustry,
    `${selectedArea?.label || "선택 동네"} 안에서는 아직 포착되지 않았습니다.`,
  );
  const selectedIndustryRank = selectedIndustry ? getEntryRank(comparisonEntries, selectedIndustry.id) : null;
  const selectedIndustryShare = selectedIndustry
    ? comparisonEntries.find((entry) => entry.id === selectedIndustry.id)?.share || 0
    : null;
  const selectedIndustryDelta = selectedIndustry
    ? getSelectionDelta(
      state.currentSnapshotSummary?.industryCounts || null,
      state.previousSnapshotSummary?.industryCounts || null,
      selectedIndustry.id,
    )
    : null;

  renderComparisonActions(
    {
      target: refs.categoryActions,
      type: "industry",
      basis: useContextBasis ? "context" : "nationwide",
      canToggleContext: Boolean(selectedArea),
      areaGranularity: state.areaGranularity,
      rank: selectedIndustryRank,
      total: comparisonEntries.length,
      share: selectedIndustryShare,
      deltaLabel: selectedIndustry ? formatDeltaLabel(selectedIndustryDelta) : null,
      deltaTone: getDeltaTone(selectedIndustryDelta),
      rankView: state.industryRankView,
      canToggleRankView: Boolean(selectedIndustry),
    },
  );

  if (useContextBasis) {
    refs.categorySectionTitle.textContent = `${selectedArea.label}에서 많이 보이는 업종`;
    refs.categoryNote.textContent = selectedIndustry
      ? `${selectedArea.label} 기준 ${selectedIndustry.label}은 ${
        selectedIndustryRank ? `${selectedIndustryRank}위` : "비포착"
      }입니다. 총 ${formatNumber(sourceItems.length)}건을 기준으로 비교합니다.`
      : `${selectedArea.label} 표본 ${formatNumber(sourceItems.length)}건을 기준으로 비교합니다.`;
  } else if (selectedIndustry) {
    refs.categorySectionTitle.textContent = `${selectedIndustry.label}의 전체 업종 순위`;
    refs.categoryNote.textContent = selectedArea
      ? `전국 기준으로 다시 보면 ${selectedIndustry.label}는 전체 ${formatNumber(comparisonEntries.length)}개 업종 중 ${
        selectedIndustryRank ? `${selectedIndustryRank}위` : "순위 밖"
      }입니다. 선택 동네는 비교축에서 제외했습니다.`
      : `${selectedIndustry.label}가 전체 ${formatNumber(comparisonEntries.length)}개 업종 중 어디쯤 있는지 주변 순위와 같이 봅니다.`;
  } else if (selectedArea) {
    refs.categorySectionTitle.textContent = "자주 보이는 업종";
    refs.categoryNote.textContent = `전국 기준으로 다시 비교 중입니다. 선택 동네를 제외한 전체 ${formatNumber(sourceItems.length)}건 스냅샷 순서입니다.`;
  } else {
    refs.categorySectionTitle.textContent = "자주 보이는 업종";
    refs.categoryNote.textContent = `전체 ${formatNumber(sourceItems.length)}건 스냅샷에서 자주 보이는 업종 순서입니다.`;
  }

  renderRankList(
    refs.categoryList,
    industryEntries,
    state.industry,
    sourceItems.length,
    "industry",
    state.industryRankView,
    true,
    (industryId) => {
      selectFilter("industry", industryId);
    },
  );
}

function handleSearchKeydown(type, event) {
  if (event.key === "Escape") {
    if (state[`${type}Query`]) {
      state[`${type}Query`] = "";
      render();
    }
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  const options = type === "area" ? buildAreaOptions() : buildIndustryOptions();
  const matchedOptions = getMatchedOptions(options, state[`${type}Query`], 1);
  if (!matchedOptions.length) {
    return;
  }

  event.preventDefault();
  selectFilter(type, matchedOptions[0].id);
}

function render() {
  const items = getFilteredItems();
  renderFilterSections();
  renderBriefing(items);
  renderSelectionSummary();
  renderBriefingVisual(items);
  renderAreaRadar();
  renderIndustryRadar();
  renderPicker();
}

async function init() {
  state.recentAreas = loadRecentSelections("area");
  state.recentIndustries = loadRecentSelections("industry");
  state.areaSelectionCounts = loadSelectionCounts("area");
  state.industrySelectionCounts = loadSelectionCounts("industry");

  refs.areaSearch.addEventListener("input", (event) => {
    state.areaQuery = event.target.value;
    render();
  });
  refs.areaSearch.addEventListener("keydown", (event) => {
    handleSearchKeydown("area", event);
  });

  refs.industrySearch.addEventListener("input", (event) => {
    state.industryQuery = event.target.value;
    render();
  });
  refs.industrySearch.addEventListener("keydown", (event) => {
    handleSearchKeydown("industry", event);
  });
  refs.areaPickerOpen.addEventListener("click", () => {
    openPicker("area");
  });
  refs.industryPickerOpen.addEventListener("click", () => {
    openPicker("industry");
  });
  refs.pickerClose.addEventListener("click", () => {
    closePicker();
  });
  refs.pickerBackdrop.addEventListener("click", () => {
    closePicker();
  });
  refs.pickerSearch.addEventListener("input", (event) => {
    state.pickerQuery = event.target.value;
    renderPicker();
  });
  refs.pickerSearch.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePicker();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.pickerType) {
      closePicker();
    }
  });

  try {
    const response = await fetch("./latest-commercial-area-snapshot.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load JSON: ${response.status}`);
    }

    state.data = await response.json();
    syncSnapshotArchive(state.data);
    const snapshotLabel = state.data.snapshotMode === "live" ? "실 API 스냅샷" : "문서 기반 데모";
    refs.snapshotChip.textContent = `${snapshotLabel}${state.previousSnapshotSummary ? " · 직전 비교 가능" : " · 첫 스냅샷"}`;
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
  }
}

init();
