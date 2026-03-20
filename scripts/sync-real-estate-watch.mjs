import crypto from "crypto";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "real-estate-watch", "latest-transactions.json");
const sourceUrl = "https://rt.molit.go.kr/";
const apiUrl = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";
const regionLabelMap = {
  seoul: "서울",
  gyeonggi: "경기",
};

const regions = [
  { area: "seoul", code: "11110", label: "종로구" },
  { area: "seoul", code: "11140", label: "중구" },
  { area: "seoul", code: "11170", label: "용산구" },
  { area: "seoul", code: "11200", label: "성동구" },
  { area: "seoul", code: "11215", label: "광진구" },
  { area: "seoul", code: "11230", label: "동대문구" },
  { area: "seoul", code: "11260", label: "중랑구" },
  { area: "seoul", code: "11290", label: "성북구" },
  { area: "seoul", code: "11305", label: "강북구" },
  { area: "seoul", code: "11320", label: "도봉구" },
  { area: "seoul", code: "11350", label: "노원구" },
  { area: "seoul", code: "11380", label: "은평구" },
  { area: "seoul", code: "11410", label: "서대문구" },
  { area: "seoul", code: "11440", label: "마포구" },
  { area: "seoul", code: "11470", label: "양천구" },
  { area: "seoul", code: "11500", label: "강서구" },
  { area: "seoul", code: "11530", label: "구로구" },
  { area: "seoul", code: "11545", label: "금천구" },
  { area: "seoul", code: "11560", label: "영등포구" },
  { area: "seoul", code: "11590", label: "동작구" },
  { area: "seoul", code: "11620", label: "관악구" },
  { area: "seoul", code: "11650", label: "서초구" },
  { area: "seoul", code: "11680", label: "강남구" },
  { area: "seoul", code: "11710", label: "송파구" },
  { area: "seoul", code: "11740", label: "강동구" },
  { area: "gyeonggi", code: "41111", label: "수원시 장안구" },
  { area: "gyeonggi", code: "41113", label: "수원시 권선구" },
  { area: "gyeonggi", code: "41115", label: "수원시 팔달구" },
  { area: "gyeonggi", code: "41117", label: "수원시 영통구" },
  { area: "gyeonggi", code: "41131", label: "성남시 수정구" },
  { area: "gyeonggi", code: "41133", label: "성남시 중원구" },
  { area: "gyeonggi", code: "41135", label: "성남시 분당구" },
  { area: "gyeonggi", code: "41150", label: "의정부시" },
  { area: "gyeonggi", code: "41171", label: "안양시 만안구" },
  { area: "gyeonggi", code: "41173", label: "안양시 동안구" },
  { area: "gyeonggi", code: "41190", label: "부천시" },
  { area: "gyeonggi", code: "41210", label: "광명시" },
  { area: "gyeonggi", code: "41220", label: "평택시" },
  { area: "gyeonggi", code: "41250", label: "동두천시" },
  { area: "gyeonggi", code: "41271", label: "안산시 상록구" },
  { area: "gyeonggi", code: "41273", label: "안산시 단원구" },
  { area: "gyeonggi", code: "41281", label: "고양시 덕양구" },
  { area: "gyeonggi", code: "41285", label: "고양시 일산동구" },
  { area: "gyeonggi", code: "41287", label: "고양시 일산서구" },
  { area: "gyeonggi", code: "41290", label: "과천시" },
  { area: "gyeonggi", code: "41310", label: "구리시" },
  { area: "gyeonggi", code: "41360", label: "남양주시" },
  { area: "gyeonggi", code: "41370", label: "오산시" },
  { area: "gyeonggi", code: "41390", label: "시흥시" },
  { area: "gyeonggi", code: "41410", label: "군포시" },
  { area: "gyeonggi", code: "41430", label: "의왕시" },
  { area: "gyeonggi", code: "41450", label: "하남시" },
  { area: "gyeonggi", code: "41461", label: "용인시 처인구" },
  { area: "gyeonggi", code: "41463", label: "용인시 기흥구" },
  { area: "gyeonggi", code: "41465", label: "용인시 수지구" },
  { area: "gyeonggi", code: "41480", label: "파주시" },
  { area: "gyeonggi", code: "41500", label: "이천시" },
  { area: "gyeonggi", code: "41550", label: "안성시" },
  { area: "gyeonggi", code: "41570", label: "김포시" },
  { area: "gyeonggi", code: "41590", label: "화성시" },
  { area: "gyeonggi", code: "41610", label: "광주시" },
  { area: "gyeonggi", code: "41630", label: "양주시" },
  { area: "gyeonggi", code: "41650", label: "포천시" },
  { area: "gyeonggi", code: "41670", label: "여주시" },
  { area: "gyeonggi", code: "41800", label: "연천군" },
  { area: "gyeonggi", code: "41820", label: "가평군" },
  { area: "gyeonggi", code: "41830", label: "양평군" }
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

function getMonthList(monthCount) {
  const now = new Date();
  const months = [];

  for (let offset = 0; offset < monthCount; offset += 1) {
    const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, "0");
    months.push(`${year}${month}`);
  }

  return months;
}

function cleanXmlValue(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getTagValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`));
  return match ? cleanXmlValue(match[1]) : "";
}

function getAnyTagValue(xml, tagNames) {
  for (const tagName of tagNames) {
    const value = getTagValue(xml, tagName);
    if (value) {
      return value;
    }
  }

  return "";
}

function getItemBlocks(xml) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).map((match) => match[1]);
}

function parsePriceManwon(value) {
  return Number.parseInt(String(value || "").replace(/[^\d]/g, ""), 10) || 0;
}

function parseArea(value) {
  const numeric = Number.parseFloat(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseFloor(value) {
  const numeric = Number.parseInt(String(value || "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toIsoDate(year, month, day) {
  if (!/^\d{4}$/.test(String(year || ""))) {
    return "";
  }

  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  return `${year}-${paddedMonth}-${paddedDay}`;
}

function createTransactionId(parts) {
  return crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

function normalizeAddressHint(jibun) {
  return jibun ? `지번 ${jibun}` : "지번 정보 없음";
}

async function loadPreviousSnapshot() {
  try {
    const raw = await readFile(outputPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { items: [] };
  }
}

async function fetchTextWithRetry(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "TapTapCho Real Estate Watch Sync"
    }
  });

  if (!response.ok) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return fetchTextWithRetry(url, attempt + 1);
    }

    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  const text = await response.text();
  const resultCode = getTagValue(text, "resultCode");
  const resultMessage = getTagValue(text, "resultMsg");
  const successCodes = new Set(["00", "000"]);

  if (resultCode && !successCodes.has(resultCode)) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return fetchTextWithRetry(url, attempt + 1);
    }

    throw new Error(`API error ${resultCode}: ${resultMessage || "unknown error"}`);
  }

  return text;
}

async function fetchTransactionsByRegion(serviceKey, region, dealYearMonth) {
  const items = [];
  let pageNo = 1;
  let totalCount = 0;

  while (true) {
    const params = new URLSearchParams({
      serviceKey,
      LAWD_CD: region.code,
      DEAL_YMD: dealYearMonth,
      pageNo: String(pageNo),
      numOfRows: "1000"
    });
    const xml = await fetchTextWithRetry(`${apiUrl}?${params.toString()}`);
    const pageItems = getItemBlocks(xml);
    totalCount = Number.parseInt(getTagValue(xml, "totalCount"), 10) || totalCount;
    items.push(...pageItems);

    if (!pageItems.length || items.length >= totalCount) {
      break;
    }

    pageNo += 1;
    await sleep(120);
  }

  return items.map((itemXml) => {
    const priceManwon = parsePriceManwon(getAnyTagValue(itemXml, ["dealAmount", "거래금액"]));
    const contractYear = getAnyTagValue(itemXml, ["dealYear", "년"]);
    const contractMonth = getAnyTagValue(itemXml, ["dealMonth", "월"]);
    const contractDay = getAnyTagValue(itemXml, ["dealDay", "일"]);
    const neighborhood = getAnyTagValue(itemXml, ["umdNm", "법정동"]);
    const apartmentName = getAnyTagValue(itemXml, ["aptNm", "아파트"]);
    const jibun = getAnyTagValue(itemXml, ["jibun", "지번"]);
    const exclusiveAreaM2 = parseArea(getAnyTagValue(itemXml, ["excluUseAr", "전용면적"]));
    const floor = parseFloor(getAnyTagValue(itemXml, ["floor", "층"]));
    const contractDate = toIsoDate(contractYear, contractMonth, contractDay);
    const id = createTransactionId([
      region.code,
      apartmentName,
      neighborhood,
      jibun,
      exclusiveAreaM2.toFixed(2),
      String(floor),
      contractDate,
      String(priceManwon)
    ]);

    return {
      id,
      region: region.area,
      regionLabel: regionLabelMap[region.area],
      district: region.label,
      neighborhood,
      addressHint: normalizeAddressHint(jibun),
      apartmentName: apartmentName || "아파트명 미확인",
      exclusiveAreaM2,
      floor,
      contractDate,
      priceManwon,
      sourceUrl,
      lawdCode: region.code,
      dealYearMonth
    };
  });
}

async function main() {
  const serviceKey = normalizeServiceKey(
    process.env.REAL_ESTATE_API_SERVICE_KEY || process.env.DATA_GO_KR_API_SERVICE_KEY
  );
  const monthCount = Math.max(1, Number.parseInt(process.env.REAL_ESTATE_MONTH_COUNT || "3", 10) || 3);
  const nowIso = new Date().toISOString();

  if (!serviceKey) {
    throw new Error(
      "REAL_ESTATE_API_SERVICE_KEY is required. Use the decoded or raw data.go.kr service key as a GitHub secret."
    );
  }

  const previousSnapshot = await loadPreviousSnapshot();
  const previousItems = new Map(
    (previousSnapshot.items || []).map((item) => [item.id, item])
  );
  const months = getMonthList(monthCount);
  const mergedItems = new Map();

  for (const dealYearMonth of months) {
    for (const region of regions) {
      const transactions = await fetchTransactionsByRegion(serviceKey, region, dealYearMonth);

      for (const transaction of transactions) {
        if (!transaction.priceManwon || !transaction.contractDate) {
          continue;
        }

        const previous = previousItems.get(transaction.id);
        mergedItems.set(transaction.id, {
          ...transaction,
          firstSeenAt: previous?.firstSeenAt || nowIso,
          officialCheckedAt: nowIso
        });
      }

      process.stdout.write(
        `synced ${dealYearMonth} ${region.label} (${region.code}) -> ${transactions.length} items\n`
      );
      await sleep(120);
    }
  }

  const items = Array.from(mergedItems.values()).sort((left, right) => {
    const leftFirstSeen = new Date(left.firstSeenAt || left.officialCheckedAt).getTime();
    const rightFirstSeen = new Date(right.firstSeenAt || right.officialCheckedAt).getTime();
    if (rightFirstSeen !== leftFirstSeen) {
      return rightFirstSeen - leftFirstSeen;
    }

    if (right.priceManwon !== left.priceManwon) {
      return right.priceManwon - left.priceManwon;
    }

    return right.contractDate.localeCompare(left.contractDate);
  });

  if (!items.length) {
    throw new Error("No transactions were collected. The output file was not updated.");
  }

  const payload = {
    snapshotMode: "live",
    updatedAt: nowIso,
    scope: "서울·경기 아파트 매매 자동 수집 스냅샷",
    source: "국토교통부 실거래가 공개시스템 / 공공데이터포털 OpenAPI",
    monthsQueried: months,
    regionCount: regions.length,
    itemCount: items.length,
    items
  };

  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`wrote ${items.length} items to ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
