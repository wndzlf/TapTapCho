#!/usr/bin/env node

import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const DEFAULT_ITEM_COUNT = 24;
const DEFAULT_BLOG_ID = "khg641129";
const OUTPUT_ROOT = path.resolve(process.cwd(), "games/interior-review-showcase");

async function main() {
  const { values } = parseArgs({
    options: {
      blogId: { type: "string", default: DEFAULT_BLOG_ID },
      out: {
        type: "string",
        default: path.join(OUTPUT_ROOT, "data", "naver-blog-import.json"),
      },
      photosDir: {
        type: "string",
        default: path.join(OUTPUT_ROOT, "photos", "naver-blog"),
      },
      itemCount: { type: "string", default: String(DEFAULT_ITEM_COUNT) },
      download: { type: "boolean", default: false },
      overwrite: { type: "boolean", default: false },
      category: { type: "string", multiple: true, default: [] },
    },
    allowPositionals: false,
  });

  const blogId = values.blogId;
  const itemCount = Math.max(1, Number.parseInt(values.itemCount, 10) || DEFAULT_ITEM_COUNT);
  const selectedCategoryNos = new Set(
    values.category
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value) && value > 0),
  );

  const categoryPayload = await fetchJson(
    `https://m.blog.naver.com/api/blogs/${blogId}/category-list`,
    `https://m.blog.naver.com/PostList.naver?blogId=${blogId}&tab=1`,
  );

  const allCategories = categoryPayload.result?.mylogCategoryList ?? [];
  const targetCategories = allCategories.filter((category) => {
    if (!category.openYN || category.divisionLine || category.postCnt <= 0) {
      return false;
    }

    if (selectedCategoryNos.size === 0) {
      return true;
    }

    return selectedCategoryNos.has(category.categoryNo);
  });

  const manifest = {
    source: {
      blogId,
      fetchedAt: new Date().toISOString(),
      categoryApi: `https://m.blog.naver.com/api/blogs/${blogId}/category-list`,
      itemCount,
    },
    summary: {
      categoryCount: targetCategories.length,
      postCount: 0,
      imageCount: 0,
    },
    categories: [],
  };

  for (const category of targetCategories) {
    const posts = await fetchCategoryPosts({ blogId, categoryNo: category.categoryNo, itemCount });
    const normalizedPosts = [];

    for (const post of posts) {
      const details = await fetchPostDetails({ blogId, logNo: post.logNo });
      const images = details.images.map((image, index) => ({
        index: index + 1,
        id: image.id,
        originalPath: image.path,
        originalUrl: `https://blogfiles.naver.net${image.path}`,
        extension: inferExtension(image.path),
      }));

      manifest.summary.imageCount += images.length;
      normalizedPosts.push({
        logNo: post.logNo,
        title: post.titleWithInspectMessage,
        addDate: post.addDate,
        categoryNo: post.categoryNo,
        categoryName: post.categoryName,
        briefContents: post.briefContents,
        thumbnailUrl: post.thumbnailUrl || "",
        thumbnailCount: post.thumbnailCount || post.thumbnailList?.length || 0,
        postUrl: `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${post.logNo}`,
        images,
      });

      if (values.download) {
        await downloadPostImages({
          photosDir: values.photosDir,
          categoryNo: category.categoryNo,
          logNo: post.logNo,
          images,
          overwrite: values.overwrite,
        });
      }
    }

    manifest.summary.postCount += normalizedPosts.length;
    manifest.categories.push({
      categoryNo: category.categoryNo,
      categoryName: category.categoryName,
      postCnt: category.postCnt,
      posts: normalizedPosts,
    });
  }

  await mkdir(path.dirname(values.out), { recursive: true });
  await writeFile(values.out, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        out: values.out,
        photosDir: values.download ? values.photosDir : null,
        summary: manifest.summary,
      },
      null,
      2,
    ),
  );
}

async function fetchCategoryPosts({ blogId, categoryNo, itemCount }) {
  const posts = [];
  const seen = new Set();

  for (let page = 1; page <= 50; page += 1) {
    const payload = await fetchJson(
      `https://m.blog.naver.com/api/blogs/${blogId}/category/${categoryNo}/post?page=${page}&itemCount=${itemCount}`,
      `https://m.blog.naver.com/PostList.naver?blogId=${blogId}&categoryNo=${categoryNo}&tab=1`,
    );

    const items = payload.result?.items ?? [];
    const freshItems = items.filter((item) => {
      if (seen.has(item.logNo)) {
        return false;
      }

      seen.add(item.logNo);
      return true;
    });

    if (freshItems.length === 0) {
      break;
    }

    posts.push(...freshItems);

    if (items.length < itemCount) {
      break;
    }
  }

  return posts;
}

async function fetchPostDetails({ blogId, logNo }) {
  const html = await fetchText(
    `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`,
    `https://m.blog.naver.com/PostList.naver?blogId=${blogId}&tab=1`,
  );

  const encoded = matchGroup(html, /attachImagePathAndIdInfo\s*=\s*'([^']*)'/);
  const decoded = decodeHtml(encoded || "[]");
  const images = JSON.parse(decoded);

  return { images };
}

async function downloadPostImages({ photosDir, categoryNo, logNo, images, overwrite }) {
  const postDir = path.join(photosDir, `category-${String(categoryNo).padStart(3, "0")}`, `post-${logNo}`);
  await mkdir(postDir, { recursive: true });

  for (const image of images) {
    const filename = `${String(image.index).padStart(2, "0")}${image.extension}`;
    const filePath = path.join(postDir, filename);

    if (!overwrite) {
      try {
        await readFile(filePath);
        continue;
      } catch {
        // File does not exist yet.
      }
    }

    const response = await fetch(image.originalUrl, {
      headers: {
        "user-agent": MOBILE_USER_AGENT,
        referer: `https://m.blog.naver.com/`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download ${image.originalUrl}: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));
  }
}

async function fetchJson(url, referer) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      referer,
      "user-agent": MOBILE_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`);
  }

  return response.json();
}

async function fetchText(url, referer) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      referer,
      "user-agent": MOBILE_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`);
  }

  return response.text();
}

function matchGroup(text, pattern) {
  const match = text.match(pattern);
  return match?.[1] ?? null;
}

function decodeHtml(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function inferExtension(imagePath) {
  const ext = path.extname(imagePath);
  return ext || ".jpg";
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
