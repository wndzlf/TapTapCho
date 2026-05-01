const storageKey = "interior-review-showcase-v2";

const defaultState = {
  companyName: "남서울 인테리어",
  companyCategory: "Tile · Interior · Blind",
  heroBadge: "용인 수지 · 광교 · 성복 시공 사례",
  heroTitle: "공간을 설명하는 대신, 장면으로 먼저 설득하는 인테리어 포트폴리오",
  heroSubtitle:
    "카페에 쌓인 사진형 후기와 공간별 사례를 브랜드 사이트 톤으로 재구성한 프리미엄 쇼케이스입니다.",
  heroImage: "",
  aboutBody:
    "전체 인테리어와 공간별 시공 사례를 장면 중심으로 정리해, 첫 방문 고객도 분위기와 마감 감도를 빠르게 이해할 수 있게 구성합니다.",
  aboutBullets: [
    "전체인테리어와 공간별모음 카테고리를 그대로 유지합니다.",
    "대표 장면부터 보여주고, 설명은 그 뒤에 따라오게 편집합니다.",
    "실제 사진만 연결되면 바로 브랜드 사이트 톤으로 전환됩니다.",
  ],
  filmImage: "",
  filmCaption:
    "실제 영상이 없어도 대표 이미지 한 장과 짧은 문장으로 브랜드 톤을 먼저 전달할 수 있습니다.",
  contactHref: "tel:01012345678",
  contactLabel: "상담 문의",
  projects: [
    {
      category: "전체인테리어",
      space: "living",
      spaceLabel: "거실/주방",
      title: "용인 수지 동천동 전체 리모델링",
      area: "동천동",
      date: "2026.03.20",
      views: 86,
      excerpt: "밝은 벽면과 우드 바닥 조합으로 첫인상을 정리한 전체 인테리어 사례입니다.",
      photo: "",
    },
    {
      category: "전체인테리어",
      space: "window",
      spaceLabel: "거실",
      title: "광교 센트럴뷰 인테리어",
      area: "광교",
      date: "2026.01.16",
      views: 36,
      excerpt: "채광이 잘 보이는 거실 구성을 중심으로 미니멀한 마감감을 정리한 사례입니다.",
      photo: "",
    },
    {
      category: "전체인테리어",
      space: "door",
      spaceLabel: "현관/중문",
      title: "광교 상떼빌파크뷰 인테리어",
      area: "광교",
      date: "2025.11.13",
      views: 24,
      excerpt: "현관 동선과 수납감을 강조해 입구 첫인상을 바꾼 리모델링 구성입니다.",
      photo: "",
    },
    {
      category: "공간별모음",
      space: "bathroom",
      spaceLabel: "욕실",
      title: "동천동 인테리어 욕실 리모델링",
      area: "동천동",
      date: "2024.04.22",
      views: 60,
      excerpt: "화이트 타일과 딥블루 하부장을 조합한 욕실 리모델링 예시입니다.",
      photo: "",
    },
    {
      category: "공간별모음",
      space: "window",
      spaceLabel: "거실",
      title: "성복역 롯데캐슬 골드타운 거실 정리",
      area: "성복동",
      date: "2021.08.23",
      views: 106,
      excerpt: "채광을 살리면서 벽면과 바닥 톤을 정돈한 거실 중심 사례입니다.",
      photo: "",
    },
    {
      category: "공간별모음",
      space: "blind",
      spaceLabel: "블라인드",
      title: "동천동 써니밸리 블라인드 시공",
      area: "동천동",
      date: "2021.08.12",
      views: 113,
      excerpt: "넓은 창 면적에 맞춰 정돈된 수평 라인이 보이는 블라인드 시공입니다.",
      photo: "",
    },
    {
      category: "전체인테리어",
      space: "hallway",
      spaceLabel: "복도/벽체",
      title: "동천자이 인테리어 복도 정리",
      area: "동천동",
      date: "2025.02.24",
      views: 89,
      excerpt: "불필요한 요소를 걷어내고 밝은 톤으로 공간 폭을 넓혀 보이게 만든 사례입니다.",
      photo: "",
    },
    {
      category: "공간별모음",
      space: "door",
      spaceLabel: "중문",
      title: "수지마을 3단지 우미아파트 중문 포인트",
      area: "수지구",
      date: "2024.12.24",
      views: 142,
      excerpt: "우드 프레임과 유리 질감으로 현관 분위기를 정리한 중문 중심 시공입니다.",
      photo: "",
    },
    {
      category: "전체인테리어",
      space: "living",
      spaceLabel: "거실",
      title: "동천동 동천 디이스트 전체 인테리어",
      area: "동천동",
      date: "2024.10.16",
      views: 126,
      excerpt: "넓은 채광과 깔끔한 천장 라인으로 공간이 넓어 보이게 만든 사례입니다.",
      photo: "",
    },
    {
      category: "공간별모음",
      space: "blind",
      spaceLabel: "블라인드",
      title: "동문굿모닝힐5차 블라인드 시공",
      area: "풍덕천동",
      date: "2021.08.06",
      views: 51,
      excerpt: "암막과 채광 밸런스를 동시에 고려한 스트라이프 블라인드 시공입니다.",
      photo: "",
    },
    {
      category: "공간별모음",
      space: "blind",
      spaceLabel: "블라인드",
      title: "풍덕천 한성아파트 블라인드 교체",
      area: "풍덕천동",
      date: "2019.06.05",
      views: 69,
      excerpt: "창호 규격에 맞춰 정돈된 라인을 살린 실용형 블라인드 교체 사례입니다.",
      photo: "",
    },
  ],
  reviews: [
    {
      name: "수지구 고객 A",
      project: "용인 수지 동천동 전체 리모델링",
      score: 5,
      tags: ["상담", "마감"],
      quote: "처음 상담부터 공정 설명이 명확했고 마감 정리가 깔끔해서 믿음이 갔습니다.",
    },
    {
      name: "광교 고객 B",
      project: "광교 센트럴뷰 인테리어",
      score: 5,
      tags: ["채광", "동선"],
      quote: "거실이 훨씬 넓어 보이게 정리돼서 집 분위기가 완전히 달라졌습니다.",
    },
    {
      name: "동천동 고객 C",
      project: "동천동 인테리어 욕실 리모델링",
      score: 4.9,
      tags: ["욕실", "타일"],
      quote: "타일 라인과 색감이 생각보다 훨씬 차분하게 나와서 만족도가 높았습니다.",
    },
    {
      name: "성복동 고객 D",
      project: "성복역 롯데캐슬 골드타운 거실 정리",
      score: 4.8,
      tags: ["거실", "밸런스"],
      quote: "화이트 톤이 과하지 않고 생활감이 남아 있어 실제 거주 공간으로 편했습니다.",
    },
    {
      name: "풍덕천 고객 E",
      project: "동문굿모닝힐5차 블라인드 시공",
      score: 5,
      tags: ["블라인드", "응대"],
      quote: "창 크기에 맞춰 추천을 잘 해줘서 선택이 쉬웠고 설치도 빠르게 끝났습니다.",
    },
    {
      name: "수지 고객 F",
      project: "수지마을 3단지 우미아파트 중문 포인트",
      score: 4.9,
      tags: ["중문", "디자인"],
      quote: "현관 분위기가 정리되면서 집 전체 첫인상이 훨씬 고급스럽게 보입니다.",
    },
  ],
};

let state = loadState();

const els = {
  brandName: document.getElementById("brandName"),
  brandCategory: document.getElementById("brandCategory"),
  headerCta: document.getElementById("headerCta"),
  heroBadge: document.getElementById("heroBadge"),
  heroTitle: document.getElementById("heroTitle"),
  heroSubtitle: document.getElementById("heroSubtitle"),
  heroMedia: document.getElementById("heroMedia"),
  heroNoteTitle: document.getElementById("heroNoteTitle"),
  heroNoteExcerpt: document.getElementById("heroNoteExcerpt"),
  heroNoteArea: document.getElementById("heroNoteArea"),
  heroNoteViews: document.getElementById("heroNoteViews"),
  primaryCta: document.getElementById("primaryCta"),
  projectCount: document.getElementById("projectCount"),
  reviewCount: document.getElementById("reviewCount"),
  averageScore: document.getElementById("averageScore"),
  areaCount: document.getElementById("areaCount"),
  aboutTitle: document.getElementById("aboutTitle"),
  aboutBody: document.getElementById("aboutBody"),
  aboutBullets: document.getElementById("aboutBullets"),
  beforeMedia: document.getElementById("beforeMedia"),
  afterMedia: document.getElementById("afterMedia"),
  beforeTitle: document.getElementById("beforeTitle"),
  afterTitle: document.getElementById("afterTitle"),
  filmMedia: document.getElementById("filmMedia"),
  filmCaption: document.getElementById("filmCaption"),
  signatureGrid: document.getElementById("signatureGrid"),
  spaceRibbon: document.getElementById("spaceRibbon"),
  spaceStoryGrid: document.getElementById("spaceStoryGrid"),
  reviewStage: document.getElementById("reviewStage"),
  contactTitle: document.getElementById("contactTitle"),
  contactText: document.getElementById("contactText"),
  contactPrimary: document.getElementById("contactPrimary"),
  contactSecondary: document.getElementById("contactSecondary"),
  editorToggle: document.getElementById("editorToggle"),
  editorPanel: document.getElementById("editorPanel"),
  editorClose: document.getElementById("editorClose"),
  editorBackdrop: document.getElementById("editorBackdrop"),
  editorForm: document.getElementById("editorForm"),
  resetButton: document.getElementById("resetButton"),
};

render();
bindEvents();

function loadState() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      return structuredClone(defaultState);
    }

    return mergeState(JSON.parse(saved));
  } catch (error) {
    console.warn("Failed to load showcase state.", error);
    return structuredClone(defaultState);
  }
}

function mergeState(candidate) {
  const merged = structuredClone(defaultState);

  if (candidate && typeof candidate === "object") {
    merged.companyName = candidate.companyName || merged.companyName;
    merged.companyCategory = candidate.companyCategory || merged.companyCategory;
    merged.heroBadge = candidate.heroBadge || merged.heroBadge;
    merged.heroTitle = candidate.heroTitle || merged.heroTitle;
    merged.heroSubtitle = candidate.heroSubtitle || merged.heroSubtitle;
    merged.heroImage = candidate.heroImage || merged.heroImage;
    merged.aboutBody = candidate.aboutBody || merged.aboutBody;
    merged.aboutBullets = normalizeBullets(candidate.aboutBullets?.length ? candidate.aboutBullets : merged.aboutBullets);
    merged.filmImage = candidate.filmImage || merged.filmImage;
    merged.filmCaption = candidate.filmCaption || merged.filmCaption;
    merged.contactHref = candidate.contactHref || merged.contactHref;
    merged.contactLabel = candidate.contactLabel || merged.contactLabel;
    merged.projects = normalizeProjects(candidate.projects?.length ? candidate.projects : merged.projects);
    merged.reviews = normalizeReviews(candidate.reviews?.length ? candidate.reviews : merged.reviews);
  }

  return merged;
}

function normalizeBullets(bullets) {
  return bullets.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeProjects(projects) {
  return projects
    .map((project) => ({
      category: String(project.category || "").trim(),
      space: normalizeSpace(project.space),
      spaceLabel: String(project.spaceLabel || spaceLabelFromKey(normalizeSpace(project.space))).trim(),
      title: String(project.title || "").trim(),
      area: String(project.area || "").trim(),
      date: String(project.date || "").trim(),
      views: Number(project.views) || 0,
      excerpt: String(project.excerpt || "").trim(),
      photo: String(project.photo || "").trim(),
    }))
    .filter((project) => project.category && project.title);
}

function normalizeReviews(reviews) {
  return reviews
    .map((review) => ({
      name: String(review.name || "").trim(),
      project: String(review.project || "").trim(),
      score: Number(review.score) || 0,
      tags: Array.isArray(review.tags)
        ? review.tags.map((tag) => String(tag).trim()).filter(Boolean)
        : [],
      quote: String(review.quote || "").trim(),
    }))
    .filter((review) => review.name && review.project && review.quote);
}

function normalizeSpace(space) {
  const value = String(space || "").trim().toLowerCase();
  const map = {
    living: "living",
    bathroom: "bathroom",
    blind: "blind",
    hallway: "hallway",
    door: "door",
    window: "window",
    kitchen: "kitchen",
  };

  return map[value] || "living";
}

function spaceLabelFromKey(space) {
  const labels = {
    living: "거실/주방",
    bathroom: "욕실",
    blind: "블라인드",
    hallway: "복도/벽체",
    door: "현관/중문",
    window: "거실",
    kitchen: "주방",
  };

  return labels[space] || "시공사례";
}

function bindEvents() {
  els.editorToggle.addEventListener("click", openEditor);
  els.editorClose.addEventListener("click", closeEditor);
  els.editorBackdrop.addEventListener("click", closeEditor);
  els.editorForm.addEventListener("submit", onEditorSubmit);
  els.resetButton.addEventListener("click", resetState);
}

function render() {
  const featured = getFeaturedProject();
  const signatureProjects = getProjectsByCategory("전체인테리어");
  const spaceProjects = getProjectsByCategory("공간별모음");
  const averageScore = getAverageScore();
  const distinctAreas = new Set(state.projects.map((project) => project.area).filter(Boolean));

  document.title = `${state.companyName} | 프리미엄 포트폴리오`;
  updateMetaDescription(
    `${state.companyName}의 ${[...distinctAreas].slice(0, 3).join(", ")} 시공 사례와 고객 후기를 한눈에 보는 프리미엄 포트폴리오 페이지`
  );

  els.brandName.textContent = state.companyName;
  els.brandCategory.textContent = state.companyCategory;
  els.headerCta.textContent = state.contactLabel;
  els.headerCta.href = state.contactHref;
  els.heroBadge.textContent = state.heroBadge;
  els.heroTitle.textContent = state.heroTitle;
  els.heroSubtitle.textContent = state.heroSubtitle;
  els.primaryCta.textContent = state.contactLabel;
  els.primaryCta.href = state.contactHref;
  els.projectCount.textContent = String(state.projects.length);
  els.reviewCount.textContent = String(state.reviews.length);
  els.averageScore.textContent = averageScore.toFixed(1);
  els.areaCount.textContent = String(distinctAreas.size);

  els.contactTitle.textContent = `${state.companyName} 상담 문의`;
  els.contactText.textContent =
    `${state.companyName}의 실제 시공 사진과 후기 데이터를 한 화면에 정리해, 방문 고객이 분위기와 마감 감도를 바로 이해할 수 있게 구성했습니다.`;
  els.contactPrimary.textContent = state.contactLabel;
  els.contactPrimary.href = state.contactHref;

  renderHero(featured);
  renderAbout(signatureProjects, featured);
  renderFilm(signatureProjects, featured);
  renderSignatureGrid(signatureProjects);
  renderSpaceSection(spaceProjects);
  renderReviews();
  populateEditor();
}

function renderHero(featured) {
  setMediaShell(els.heroMedia, state.heroImage || featured?.photo || "", featured?.space || "living");
  els.heroNoteTitle.textContent = featured?.title || `${state.companyName} 대표 사례`;
  els.heroNoteExcerpt.textContent =
    featured?.excerpt ||
    "대표 장면 하나만으로도 이 업체가 어떤 공간 분위기를 만드는지 먼저 인식하게 하는 구간입니다.";
  els.heroNoteArea.textContent = featured?.area || "Portfolio";
  els.heroNoteViews.textContent = `조회 ${featured?.views || 0}`;
}

function renderAbout(signatureProjects, featured) {
  const first = signatureProjects[0] || featured;
  const second = signatureProjects[1] || state.projects.find((project) => project !== first) || featured;

  els.aboutTitle.textContent = `About ${state.companyName}`;
  els.aboutBody.textContent = state.aboutBody;
  els.aboutBullets.innerHTML = state.aboutBullets
    .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
    .join("");

  setMediaShell(els.beforeMedia, first?.photo || "", first?.space || "hallway");
  setMediaShell(els.afterMedia, second?.photo || "", second?.space || "window");
  els.beforeTitle.textContent = first?.title || "대표 사례 A";
  els.afterTitle.textContent = second?.title || "대표 사례 B";
}

function renderFilm(signatureProjects, featured) {
  const filmProject = signatureProjects[2] || featured;
  setMediaShell(els.filmMedia, state.filmImage || filmProject?.photo || "", filmProject?.space || "living");
  els.filmCaption.textContent = state.filmCaption;
}

function renderSignatureGrid(projects) {
  els.signatureGrid.innerHTML = projects
    .map((project, index) => {
      const cardClass = index === 0 ? "signature-card lead" : index === 1 ? "signature-card tall" : "signature-card";

      return `
        <article class="${cardClass}">
          <div class="signature-media media-shell" data-space="${escapeHtml(project.space)}" data-photo="${project.photo ? "1" : ""}" style="${project.photo ? inlinePhoto(project.photo) : ""}"></div>
          <div class="signature-body">
            <div class="card-meta">
              <span>${escapeHtml(project.category)}</span>
              <span>${escapeHtml(project.area)}</span>
              <span>${escapeHtml(project.date)}</span>
            </div>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.excerpt)}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSpaceSection(projects) {
  const grouped = new Map();

  projects.forEach((project) => {
    const existing = grouped.get(project.space) || { label: project.spaceLabel, count: 0 };
    existing.count += 1;
    grouped.set(project.space, existing);
  });

  els.spaceRibbon.innerHTML = [...grouped.entries()]
    .map(
      ([space, data]) => `
        <div class="space-pill" data-space="${escapeHtml(space)}">
          <span>${escapeHtml(String(data.count))}</span>
          <strong>${escapeHtml(data.label)}</strong>
        </div>
      `
    )
    .join("");

  els.spaceStoryGrid.innerHTML = projects
    .map(
      (project) => `
        <article class="space-card">
          <div class="space-media media-shell" data-space="${escapeHtml(project.space)}" data-photo="${project.photo ? "1" : ""}" style="${project.photo ? inlinePhoto(project.photo) : ""}"></div>
          <div class="space-body">
            <div class="card-meta">
              <span>${escapeHtml(project.spaceLabel)}</span>
              <span>${escapeHtml(project.area)}</span>
              <span>조회 ${escapeHtml(String(project.views))}</span>
            </div>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.excerpt)}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function renderReviews() {
  els.reviewStage.innerHTML = state.reviews
    .map((review, index) => `
      <article class="review-card ${index === 0 ? "lead" : ""}">
        <div class="review-top">
          <div>
            <p class="review-name">${escapeHtml(review.name)}</p>
            <p class="review-project">${escapeHtml(review.project)}</p>
          </div>
          <span class="review-score">${escapeHtml(review.score.toFixed(1))} / 5</span>
        </div>
        <p class="review-quote">${escapeHtml(review.quote)}</p>
        <div class="tag-list">
          ${review.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
      </article>
    `)
    .join("");
}

function getFeaturedProject() {
  return [...state.projects].sort((left, right) => right.views - left.views)[0];
}

function getProjectsByCategory(category) {
  return state.projects
    .filter((project) => project.category === category)
    .sort((left, right) => right.views - left.views);
}

function getAverageScore() {
  return state.reviews.reduce((sum, review) => sum + review.score, 0) / Math.max(state.reviews.length, 1);
}

function setMediaShell(element, photo, space) {
  element.dataset.space = space || "living";

  if (photo) {
    element.dataset.photo = "1";
    element.style.setProperty("--photo-url", `url("${photo}")`);
  } else {
    delete element.dataset.photo;
    element.style.removeProperty("--photo-url");
  }
}

function inlinePhoto(photo) {
  return `--photo-url: url("${escapeAttribute(photo)}");`;
}

function updateMetaDescription(content) {
  const tag = document.querySelector('meta[name="description"]');
  if (tag) {
    tag.setAttribute("content", content);
  }
}

function populateEditor() {
  const form = new FormData(els.editorForm);
  form.set("companyName", state.companyName);
  form.set("companyCategory", state.companyCategory);
  form.set("heroBadge", state.heroBadge);
  form.set("heroTitle", state.heroTitle);
  form.set("heroSubtitle", state.heroSubtitle);
  form.set("heroImage", state.heroImage);
  form.set("aboutBody", state.aboutBody);
  form.set("aboutBulletsText", state.aboutBullets.join("\n"));
  form.set("filmImage", state.filmImage);
  form.set("filmCaption", state.filmCaption);
  form.set("contactHref", state.contactHref);
  form.set("contactLabel", state.contactLabel);
  form.set("projectsText", toProjectsText(state.projects));
  form.set("reviewsText", toReviewsText(state.reviews));

  for (const [name, value] of form.entries()) {
    const field = els.editorForm.elements.namedItem(name);
    if (field) {
      field.value = value;
    }
  }
}

function toProjectsText(projects) {
  return projects
    .map((project) =>
      [
        project.category,
        project.spaceLabel,
        project.title,
        project.area,
        project.date,
        project.views,
        project.space,
        project.excerpt,
        project.photo,
      ].join(" | ")
    )
    .join("\n");
}

function toReviewsText(reviews) {
  return reviews
    .map((review) => [review.name, review.project, review.score, review.tags.join(","), review.quote].join(" | "))
    .join("\n");
}

function onEditorSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const nextProjects = parseProjectsText(String(formData.get("projectsText") || ""));
  const nextReviews = parseReviewsText(String(formData.get("reviewsText") || ""));

  if (!nextProjects.length) {
    window.alert("프로젝트 데이터는 최소 1줄 이상 필요합니다.");
    return;
  }

  if (!nextReviews.length) {
    window.alert("후기 데이터는 최소 1줄 이상 필요합니다.");
    return;
  }

  state = mergeState({
    companyName: String(formData.get("companyName") || "").trim(),
    companyCategory: String(formData.get("companyCategory") || "").trim(),
    heroBadge: String(formData.get("heroBadge") || "").trim(),
    heroTitle: String(formData.get("heroTitle") || "").trim(),
    heroSubtitle: String(formData.get("heroSubtitle") || "").trim(),
    heroImage: String(formData.get("heroImage") || "").trim(),
    aboutBody: String(formData.get("aboutBody") || "").trim(),
    aboutBullets: String(formData.get("aboutBulletsText") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    filmImage: String(formData.get("filmImage") || "").trim(),
    filmCaption: String(formData.get("filmCaption") || "").trim(),
    contactHref: String(formData.get("contactHref") || "").trim(),
    contactLabel: String(formData.get("contactLabel") || "").trim(),
    projects: nextProjects,
    reviews: nextReviews,
  });

  localStorage.setItem(storageKey, JSON.stringify(state));
  render();
  closeEditor();
}

function parseProjectsText(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const [category, spaceLabel, title, area, date, views, space, excerpt, photo = ""] = parts;

      return {
        category,
        spaceLabel,
        title,
        area,
        date,
        views: Number(views) || 0,
        space: normalizeSpace(space || spaceKeyFromLabel(spaceLabel)),
        excerpt,
        photo,
      };
    })
    .filter((project) => project.category && project.title);
}

function parseReviewsText(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const [name, project, score, tags = "", quote = ""] = parts;

      return {
        name,
        project,
        score: Number(score) || 0,
        tags: tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        quote,
      };
    })
    .filter((review) => review.name && review.project && review.quote);
}

function spaceKeyFromLabel(label) {
  const mapping = {
    "거실/주방": "living",
    거실: "window",
    욕실: "bathroom",
    블라인드: "blind",
    "복도/벽체": "hallway",
    "현관/중문": "door",
    주방: "kitchen",
    중문: "door",
  };

  return mapping[label] || "living";
}

function openEditor() {
  els.editorPanel.classList.add("open");
  els.editorPanel.setAttribute("aria-hidden", "false");
  els.editorToggle.setAttribute("aria-expanded", "true");
  els.editorBackdrop.hidden = false;
}

function closeEditor() {
  els.editorPanel.classList.remove("open");
  els.editorPanel.setAttribute("aria-hidden", "true");
  els.editorToggle.setAttribute("aria-expanded", "false");
  els.editorBackdrop.hidden = true;
}

function resetState() {
  if (!window.confirm("샘플 데이터를 다시 불러올까요?")) {
    return;
  }

  localStorage.removeItem(storageKey);
  state = structuredClone(defaultState);
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
