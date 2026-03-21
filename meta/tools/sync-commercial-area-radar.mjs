import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const outputPath = path.join(rootDir, "games", "commercial-area-radar", "latest-commercial-area-snapshot.json");
const apiBaseUrl = "https://apis.data.go.kr/B553077/api/open/sdsc2";
const defaultScopes = [
  { divId: "signguCd", key: "11110", label: "서울 종로구" },
  { divId: "signguCd", key: "11200", label: "서울 성동구" },
  { divId: "signguCd", key: "11440", label: "서울 마포구" },
  { divId: "signguCd", key: "11560", label: "서울 영등포구" },
  { divId: "signguCd", key: "11650", label: "서울 서초구" },
  { divId: "signguCd", key: "11680", label: "서울 강남구" },
  { divId: "signguCd", key: "11710", label: "서울 송파구" },
  { divId: "signguCd", key: "41117", label: "경기 수원 영통구" },
  { divId: "signguCd", key: "41135", label: "경기 성남 분당구" },
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeServiceKey(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  if (/%[0-9A-Fa-f]{2}/.test(trimmed)) {
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function scoreObject(candidate, expectedKeys) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return 0;
  }

  return expectedKeys.reduce((score, key) => {
    return score + (Object.prototype.hasOwnProperty.call(candidate, key) ? 1 : 0);
  }, 0);
}

function collectArrays(node, accumulator = []) {
  if (Array.isArray(node)) {
    accumulator.push(node);
    node.forEach((entry) => collectArrays(entry, accumulator));
    return accumulator;
  }

  if (node && typeof node === "object") {
    Object.values(node).forEach((value) => collectArrays(value, accumulator));
  }

  return accumulator;
}

function extractItems(payload, expectedKeys) {
  const arrayCandidates = collectArrays(payload)
    .filter((candidate) => candidate.some((item) => item && typeof item === "object" && !Array.isArray(item)))
    .map((candidate) => {
      const bestScore = candidate.reduce((score, entry) => {
        return Math.max(score, scoreObject(entry, expectedKeys));
      }, 0);
      return { candidate, bestScore, length: candidate.length };
    })
    .sort((left, right) => {
      if (right.bestScore !== left.bestScore) {
        return right.bestScore - left.bestScore;
      }

      return right.length - left.length;
    });

  if (arrayCandidates[0]?.bestScore > 0) {
    return arrayCandidates[0].candidate.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
  }

  return [];
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

async function fetchJson(endpoint, params, serviceKey) {
  const url = new URL(`${apiBaseUrl}/${endpoint}`);
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  searchParams.set("type", "json");
  searchParams.set("ServiceKey", serviceKey);
  searchParams.set("servicekey", serviceKey);
  url.search = searchParams.toString();

  const response = await fetch(url, {
    headers: {
      Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
      "User-Agent": "TapTapCho Commercial Area Radar Sync",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}: ${text.slice(0, 240)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}, received: ${text.slice(0, 240)}`);
  }
}

function compactStoreItem(item) {
  return {
    stdrYm: item.stdrYm || "",
    bizesId: item.bizesId || "",
    bizesNm: item.bizesNm || "",
    brchNm: item.brchNm || "",
    indsLclsCd: item.indsLclsCd || "",
    indsLclsNm: item.indsLclsNm || "",
    indsMclsCd: item.indsMclsCd || "",
    indsMclsNm: item.indsMclsNm || "",
    indsSclsCd: item.indsSclsCd || "",
    indsSclsNm: item.indsSclsNm || "",
    ctprvnCd: item.ctprvnCd || "",
    ctprvnNm: item.ctprvnNm || "",
    signguCd: item.signguCd || "",
    signguNm: item.signguNm || "",
    adongCd: item.adongCd || "",
    adongNm: item.adongNm || "",
    lnoAdr: item.lnoAdr || "",
    rdnmAdr: item.rdnmAdr || "",
    lon: item.lon || item.longitude || "",
    lat: item.lat || item.latitude || "",
  };
}

function getScopeList(defaultDivId) {
  const rawScopeKeys = String(process.env.COMMERCIAL_AREA_SCOPE_KEYS || "").trim();
  if (!rawScopeKeys) {
    return defaultScopes;
  }

  return rawScopeKeys
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((key) => ({
      divId: defaultDivId,
      key,
      label: `${defaultDivId}:${key}`,
    }));
}

function buildLocations(items) {
  return Array.from(groupBy(items, (item) => item.adongCd || item.signguCd).values())
    .map((groupedItems) => {
      const item = groupedItems[0];
      return {
        ctprvnCd: item.ctprvnCd,
        ctprvnNm: item.ctprvnNm,
        signguCd: item.signguCd,
        signguNm: item.signguNm,
        adongCd: item.adongCd,
        adongNm: item.adongNm,
      };
    })
    .sort((left, right) => {
      return `${left.signguNm} ${left.adongNm}`.localeCompare(`${right.signguNm} ${right.adongNm}`, "ko");
    });
}

function buildUniqueCategories(items, codeKey, nameKey, parentKey, parentNameKey) {
  const uniqueMap = new Map();

  items.forEach((item) => {
    const code = item[codeKey];
    const name = item[nameKey];
    if (!code || !name || uniqueMap.has(code)) {
      return;
    }

    uniqueMap.set(code, {
      [codeKey]: code,
      [nameKey]: name,
      ...(parentKey ? { [parentKey]: item[parentKey] || "" } : {}),
      ...(parentNameKey ? { [parentNameKey]: item[parentNameKey] || "" } : {}),
    });
  });

  return Array.from(uniqueMap.values()).sort((left, right) => {
    return String(left[nameKey]).localeCompare(String(right[nameKey]), "ko");
  });
}

function buildQueryExample(scope) {
  return {
    storeListInDong: {
      ServiceKey: "{REAL_ESTATE_API_SERVICE_KEY}",
      pageNo: 1,
      numOfRows: scope.numOfRows,
      divId: scope.divId,
      key: scope.key,
      ...(scope.indsLclsCd ? { indsLclsCd: scope.indsLclsCd } : {}),
      ...(scope.indsMclsCd ? { indsMclsCd: scope.indsMclsCd } : {}),
      ...(scope.indsSclsCd ? { indsSclsCd: scope.indsSclsCd } : {}),
      type: "json",
    },
  };
}

async function fetchStoresByScope(serviceKey, scope, options) {
  const collected = [];

  for (let pageNo = 1; pageNo <= options.maxPages; pageNo += 1) {
    const payload = await fetchJson(
      "storeListInDong",
      {
        pageNo,
        numOfRows: options.numOfRows,
        divId: scope.divId,
        key: scope.key,
        indsLclsCd: options.indsLclsCd,
        indsMclsCd: options.indsMclsCd,
        indsSclsCd: options.indsSclsCd,
      },
      serviceKey,
    );

    const pageItems = extractItems(payload, ["bizesId", "bizesNm", "rdnmAdr"]).map(compactStoreItem);
    collected.push(...pageItems);

    process.stdout.write(
      `synced ${scope.label} (${scope.divId}:${scope.key}) page ${pageNo} -> ${pageItems.length} items\n`,
    );

    if (pageItems.length < options.numOfRows) {
      break;
    }

    await sleep(120);
  }

  return collected;
}

async function main() {
  const serviceKey = normalizeServiceKey(
    process.env.REAL_ESTATE_API_SERVICE_KEY ||
      process.env.COMMERCIAL_AREA_API_SERVICE_KEY ||
      process.env.DATA_GO_KR_API_SERVICE_KEY,
  );

  if (!serviceKey) {
    throw new Error("REAL_ESTATE_API_SERVICE_KEY is required to fetch the commercial area snapshot.");
  }

  const options = {
    divId: process.env.COMMERCIAL_AREA_SCOPE_DIV_ID || "signguCd",
    indsLclsCd: process.env.COMMERCIAL_AREA_INDS_LCLS_CD || "",
    indsMclsCd: process.env.COMMERCIAL_AREA_INDS_MCLS_CD || "",
    indsSclsCd: process.env.COMMERCIAL_AREA_INDS_SCLS_CD || "",
    numOfRows: Math.max(1, Number.parseInt(process.env.COMMERCIAL_AREA_NUM_OF_ROWS || "120", 10) || 120),
    maxPages: Math.max(1, Number.parseInt(process.env.COMMERCIAL_AREA_MAX_PAGES || "2", 10) || 2),
  };
  const scopes = getScopeList(options.divId);
  const mergedItems = new Map();

  for (const scope of scopes) {
    const scopeItems = await fetchStoresByScope(serviceKey, scope, options);

    scopeItems.forEach((item) => {
      if (!item.bizesId) {
        return;
      }

      mergedItems.set(item.bizesId, item);
    });

    await sleep(140);
  }

  const storeItems = Array.from(mergedItems.values()).sort((left, right) => {
    const areaCompared = `${left.signguNm} ${left.adongNm}`.localeCompare(
      `${right.signguNm} ${right.adongNm}`,
      "ko",
    );
    if (areaCompared !== 0) {
      return areaCompared;
    }

    return left.bizesNm.localeCompare(right.bizesNm, "ko");
  });

  if (!storeItems.length) {
    throw new Error("No store items were extracted from the API response.");
  }

  const payload = {
    snapshotMode: "live",
    updatedAt: new Date().toISOString(),
    scope: `${scopes.length}개 권역 자동 수집 스냅샷`,
    source: "소상공인시장진흥공단_상가(상권)정보_API / 공공데이터포털",
    serviceUrl: apiBaseUrl,
    appIds: {
      primary: "commercial-area-radar",
      alternatives: ["dong-store-radar", "storezone-radar", "sanggwon-radar"],
    },
    queryExamples: buildQueryExample({
      divId: scopes[0].divId,
      key: scopes[0].key,
      numOfRows: options.numOfRows,
      indsLclsCd: options.indsLclsCd,
      indsMclsCd: options.indsMclsCd,
      indsSclsCd: options.indsSclsCd,
    }),
    hierarchy: {
      locations: buildLocations(storeItems),
      largeCategories: buildUniqueCategories(storeItems, "indsLclsCd", "indsLclsNm"),
      middleCategories: buildUniqueCategories(storeItems, "indsMclsCd", "indsMclsNm", "indsLclsCd", "indsLclsNm"),
      smallCategories: buildUniqueCategories(storeItems, "indsSclsCd", "indsSclsNm", "indsMclsCd", "indsMclsNm"),
    },
    items: storeItems,
  };

  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`wrote ${storeItems.length} items to ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
