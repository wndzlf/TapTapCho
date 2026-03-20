import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "commercial-area-radar", "latest-commercial-area-snapshot.json");
const apiBaseUrl = "https://apis.data.go.kr/B553077/api/open/sdsc2";

const endpointDefinitions = [
  {
    label: "행정경계조회",
    path: "/baroApi",
    summary: "시도, 시군구, 행정동 리소스를 단계적으로 탐색합니다.",
    requestHint: "resId=dong · catId=mega",
  },
  {
    label: "업종 대분류 조회",
    path: "/largeUpjongList",
    summary: "상권정보 업종 대분류 목록을 불러옵니다.",
    requestHint: "type=json",
  },
  {
    label: "업종 중분류 조회",
    path: "/middleUpjongList",
    summary: "대분류 코드 아래의 중분류 업종을 확인합니다.",
    requestHint: "indsLclsCd=I2",
  },
  {
    label: "업종 소분류 조회",
    path: "/smallUpjongList",
    summary: "중분류 하위 업종 코드와 이름을 확인합니다.",
    requestHint: "indsLclsCd=I2 · indsMclsCd=I212",
  },
  {
    label: "행정동 상가업소 조회",
    path: "/storeListInDong",
    summary: "행정동 코드와 업종 코드를 조합해 점포 목록을 확인합니다.",
    requestHint: "divId=adongCd · key=11680640",
  },
];

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

function collectObjects(node, accumulator = []) {
  if (Array.isArray(node)) {
    node.forEach((entry) => collectObjects(entry, accumulator));
    return accumulator;
  }

  if (node && typeof node === "object") {
    accumulator.push(node);
    Object.values(node).forEach((value) => collectObjects(value, accumulator));
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

  const objectCandidates = collectObjects(payload)
    .map((candidate) => ({ candidate, score: scoreObject(candidate, expectedKeys) }))
    .sort((left, right) => right.score - left.score);

  if (objectCandidates[0]?.score > 1) {
    return [objectCandidates[0].candidate];
  }

  return [];
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

function buildQueryExample(scope) {
  return {
    storeListInDong: {
      ServiceKey: "{REAL_ESTATE_API_SERVICE_KEY}",
      pageNo: 1,
      numOfRows: scope.numOfRows,
      divId: scope.divId,
      key: scope.key,
      indsLclsCd: scope.indsLclsCd,
      ...(scope.indsMclsCd ? { indsMclsCd: scope.indsMclsCd } : {}),
      ...(scope.indsSclsCd ? { indsSclsCd: scope.indsSclsCd } : {}),
      type: "json",
    },
  };
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
    ksicCd: item.ksicCd || "",
    ksicNm: item.ksicNm || "",
    ctprvnCd: item.ctprvnCd || "",
    ctprvnNm: item.ctprvnNm || "",
    signguCd: item.signguCd || "",
    signguNm: item.signguNm || "",
    adongCd: item.adongCd || "",
    adongNm: item.adongNm || "",
    ldongCd: item.ldongCd || "",
    ldongNm: item.ldongNm || "",
    lnoAdr: item.lnoAdr || "",
    rdnmAdr: item.rdnmAdr || "",
    lon: item.lon || item.longitude || "",
    lat: item.lat || item.latitude || "",
  };
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

  const scope = {
    divId: process.env.COMMERCIAL_AREA_SCOPE_DIV_ID || "signguCd",
    key: process.env.COMMERCIAL_AREA_SCOPE_KEY || "11680",
    indsLclsCd: process.env.COMMERCIAL_AREA_INDS_LCLS_CD || "I2",
    indsMclsCd: process.env.COMMERCIAL_AREA_INDS_MCLS_CD || "",
    indsSclsCd: process.env.COMMERCIAL_AREA_INDS_SCLS_CD || "",
    numOfRows: Math.max(1, Number.parseInt(process.env.COMMERCIAL_AREA_NUM_OF_ROWS || "80", 10) || 80),
  };

  const largeUpjongPayload = await fetchJson("largeUpjongList", {}, serviceKey);
  const largeCategories = extractItems(largeUpjongPayload, ["indsLclsCd", "indsLclsNm"]);

  const middleUpjongPayload = await fetchJson(
    "middleUpjongList",
    { indsLclsCd: scope.indsLclsCd },
    serviceKey,
  );
  const middleCategories = extractItems(middleUpjongPayload, ["indsMclsCd", "indsMclsNm"]);

  if (!scope.indsMclsCd && middleCategories[0]?.indsMclsCd) {
    scope.indsMclsCd = middleCategories[0].indsMclsCd;
  }

  const smallUpjongPayload = await fetchJson(
    "smallUpjongList",
    {
      indsLclsCd: scope.indsLclsCd,
      indsMclsCd: scope.indsMclsCd,
    },
    serviceKey,
  );
  const smallCategories = extractItems(smallUpjongPayload, ["indsSclsCd", "indsSclsNm"]);

  const storeListPayload = await fetchJson(
    "storeListInDong",
    {
      pageNo: 1,
      numOfRows: scope.numOfRows,
      divId: scope.divId,
      key: scope.key,
      indsLclsCd: scope.indsLclsCd,
      indsMclsCd: scope.indsMclsCd,
      indsSclsCd: scope.indsSclsCd,
    },
    serviceKey,
  );
  const storeItems = extractItems(storeListPayload, ["bizesId", "bizesNm", "rdnmAdr"]).map(compactStoreItem);

  if (!storeItems.length) {
    throw new Error("No store items were extracted from the API response.");
  }

  const areaGroups = new Map();
  storeItems.forEach((item) => {
    if (!item.adongCd) {
      return;
    }

    if (areaGroups.has(item.adongCd)) {
      return;
    }

    areaGroups.set(item.adongCd, {
      ctprvnCd: item.ctprvnCd,
      ctprvnNm: item.ctprvnNm,
      signguCd: item.signguCd,
      signguNm: item.signguNm,
      adongCd: item.adongCd,
      adongNm: item.adongNm,
    });
  });

  const payload = {
    snapshotMode: "live",
    updatedAt: new Date().toISOString(),
    scope: `${scope.divId}:${scope.key} 실 API 스냅샷`,
    source: "소상공인시장진흥공단_상가(상권)정보_API / 공공데이터포털",
    serviceUrl: apiBaseUrl,
    appIds: {
      primary: "commercial-area-radar",
      alternatives: ["dong-store-radar", "storezone-radar", "sanggwon-radar"],
    },
    endpoints: endpointDefinitions,
    queryExamples: buildQueryExample(scope),
    hierarchy: {
      locations: Array.from(areaGroups.values()),
      largeCategories,
      middleCategories,
      smallCategories,
    },
    rawSamples: {
      storeItem: storeItems[0],
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
