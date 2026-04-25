import { execFileSync } from "child_process";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..", "..");
const historyDirPath = path.join(rootDir, "games", "real-estate-watch", "snapshots");
const historyIndexPath = path.join(historyDirPath, "index.json");

const candidatePaths = [
  "games/real-estate-watch/latest-transactions.json",
  "real-estate-watch/latest-transactions.json",
];

function runGit(args) {
  return execFileSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1024 * 1024 * 64,
  });
}

function getSnapshotDateLabel(updatedAt) {
  const iso = String(updatedAt || "");
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
    return iso.slice(0, 10);
  }
  return "";
}

function createHistoryEntry(compactPayload, fileName) {
  const view = compactPayload?.views?.all || {};
  const highest = view.highestPriceItem || null;
  const latest = view.latestContractItem || null;

  return {
    snapshotDate: getSnapshotDateLabel(compactPayload.updatedAt),
    updatedAt: compactPayload.updatedAt,
    fileName,
    filePath: `./snapshots/${fileName}`,
    itemCount: compactPayload.itemCount || 0,
    averagePriceManwon: view.averagePriceManwon || 0,
    highestPriceManwon: highest?.priceManwon || 0,
    highestPriceTitle: highest ? `${highest.district} · ${highest.apartmentName}` : "",
    latestContractDate: latest?.contractDate || "",
    latestContractTitle: latest ? `${latest.district} · ${latest.apartmentName}` : "",
  };
}

function toCompactPayload(rawPayload) {
  if (rawPayload?.snapshotFormat === "compact" && rawPayload?.views) {
    return rawPayload;
  }

  const items = Array.isArray(rawPayload?.items) ? rawPayload.items : [];
  const seoulItems = items.filter((item) => item.region === "seoul");
  const gyeonggiItems = items.filter((item) => item.region === "gyeonggi");

  const rankItems = (rows, mode) => {
    const ranked = [...rows];
    ranked.sort((left, right) => {
      if (mode === "price") {
        if (right.priceManwon !== left.priceManwon) return right.priceManwon - left.priceManwon;
        return String(right.contractDate || "").localeCompare(String(left.contractDate || ""));
      }
      const rightTs = Date.parse(right.contractDate || "");
      const leftTs = Date.parse(left.contractDate || "");
      if (rightTs !== leftTs) return rightTs - leftTs;
      return (right.priceManwon || 0) - (left.priceManwon || 0);
    });
    return ranked;
  };

  const buildRegionView = (rows, label) => {
    const priceTop10 = rankItems(rows, "price").slice(0, 10);
    const contractTop10 = rankItems(rows, "contract").slice(0, 10);
    return {
      label,
      itemCount: rows.length,
      averagePriceManwon: rows.length
        ? Math.round(rows.reduce((sum, item) => sum + (item.priceManwon || 0), 0) / rows.length)
        : 0,
      highestPriceItem: priceTop10[0] || null,
      latestContractItem: contractTop10[0] || null,
      priceTop10,
      contractTop10,
    };
  };

  return {
    snapshotMode: rawPayload?.snapshotMode || "live",
    snapshotFormat: "compact",
    updatedAt: rawPayload?.updatedAt || new Date().toISOString(),
    scope: rawPayload?.scope || "서울·경기 아파트 매매 자동 수집 스냅샷",
    source: rawPayload?.source || "국토교통부 실거래가 공개시스템 / 공공데이터포털 OpenAPI",
    monthsQueried: rawPayload?.monthsQueried || [],
    regionCount: rawPayload?.regionCount || 0,
    itemCount: rawPayload?.itemCount || items.length,
    views: {
      all: buildRegionView(items, "서울·경기 전체"),
      seoul: buildRegionView(seoulItems, "서울"),
      gyeonggi: buildRegionView(gyeonggiItems, "경기"),
    },
  };
}

function getCommitList() {
  const hashes = new Set();
  for (const p of candidatePaths) {
    try {
      const out = runGit(["log", "--follow", "--format=%H", "--", p]);
      out
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((hash) => hashes.add(hash));
    } catch {
      // ignore missing path history
    }
  }

  return Array.from(hashes);
}

function readSnapshotFromCommit(hash) {
  for (const p of candidatePaths) {
    try {
      const raw = runGit(["show", `${hash}:${p}`]);
      if (!raw) continue;
      return JSON.parse(raw);
    } catch {
      // try next path
    }
  }

  return null;
}

async function main() {
  await mkdir(historyDirPath, { recursive: true });

  const existingIndexRaw = await readFile(historyIndexPath, "utf8").catch(() => "");
  const existingIndex = existingIndexRaw ? JSON.parse(existingIndexRaw) : { entries: [] };
  const byDate = new Map();

  for (const entry of existingIndex.entries || []) {
    if (entry?.snapshotDate && entry?.fileName) {
      byDate.set(entry.snapshotDate, entry);
    }
  }

  const commits = getCommitList();
  let imported = 0;

  for (const hash of commits) {
    const payloadRaw = readSnapshotFromCommit(hash);
    if (!payloadRaw) continue;

    const compactPayload = toCompactPayload(payloadRaw);
    const snapshotDate = getSnapshotDateLabel(compactPayload.updatedAt);
    if (!snapshotDate || byDate.has(snapshotDate)) {
      continue;
    }

    const fileName = `snapshot-${snapshotDate}.json`;
    const filePath = path.join(historyDirPath, fileName);
    await writeFile(filePath, `${JSON.stringify(compactPayload, null, 2)}\n`, "utf8");

    byDate.set(snapshotDate, createHistoryEntry(compactPayload, fileName));
    imported += 1;
  }

  const entries = Array.from(byDate.values()).sort((left, right) =>
    String(right.snapshotDate).localeCompare(String(left.snapshotDate))
  );

  const historyPayload = {
    updatedAt: new Date().toISOString(),
    itemCount: entries.length,
    entries,
  };

  await writeFile(historyIndexPath, `${JSON.stringify(historyPayload, null, 2)}\n`, "utf8");
  process.stdout.write(`backfilled ${imported} snapshots, total ${entries.length} days in index\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
