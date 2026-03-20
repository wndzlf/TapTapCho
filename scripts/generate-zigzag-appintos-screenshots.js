const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'webgame-21', 'appintos-screenshots');

const palette = {
  bg0: '#07121f',
  bg1: '#0f2239',
  bg2: '#17304d',
  bg3: '#0b1a2b',
  grid: '#33526f',
  text: '#f1f8ff',
  muted: '#bed4e5',
  eyebrow: '#7fb9e6',
  accent: '#74f7d4',
  accentSoft: '#b9fff0',
  accentLine: '#58d7c4',
  accentBlue: '#9cc9ff',
  gold: '#ffd479',
  goldSoft: '#ffe7aa',
  card: '#0d2135',
  cardLine: '#7bc5ea',
  cardDeep: '#091726',
  phoneBody: '#06111b',
  phoneEdge: '#10283f',
  screenTop: '#152c47',
  screenBottom: '#091421',
  danger: '#ff8b7a',
};

const portraitShots = [
  {
    name: 'portrait-01-memory',
    size: { width: 636, height: 1048 },
    eyebrow: 'MEMORY PUZZLE',
    title: ['보여준 경로를', '기억하세요'],
    subtitle: ['짧게 나타난 좌우 패턴을 보고', '같은 순서로 다시 탭하세요'],
    chips: ['패턴 보기', '빠른 한 판'],
    phone: {
      score: '0',
      best: '1240',
      streak: '0',
      pattern: '6',
      status: '패턴을 보는 중이에요',
      boardMode: 'preview',
      boardLabel: 'Watch the route',
      boardPattern: 'Pattern 6',
      lanes: [-1, 0, -1, 0, 1, 0],
      previewCount: 7,
    },
  },
  {
    name: 'portrait-02-input',
    size: { width: 636, height: 1048 },
    eyebrow: 'FOCUS INPUT',
    title: ['더 길어지는 패턴에', '집중하세요'],
    subtitle: ['라운드가 올라갈수록 연속 성공 보너스와', '점수가 함께 커집니다'],
    chips: ['연속 성공 7', '패턴 길이 9'],
    phone: {
      score: '1860',
      best: '4520',
      streak: '7',
      pattern: '9',
      status: '입력 진행 중 4/9',
      boardMode: 'input',
      boardLabel: 'Input 4/9',
      boardPattern: 'Pattern 9',
      lanes: [-1, 0, -1, 1, 0, 1, 0, 1],
      inputIndex: 4,
    },
  },
  {
    name: 'portrait-03-records',
    size: { width: 636, height: 1048 },
    eyebrow: 'HIGH SCORE',
    title: ['하이스코어를', '계속 갱신하세요'],
    subtitle: ['실수해도 바로 다시 시작하고', '최고 기록과 연속 기록을 남기세요'],
    chips: ['기록 저장', '즉시 재도전'],
    phone: {
      score: '3240',
      best: '3240',
      streak: '11',
      pattern: '10',
      status: '오답으로 라운드 종료',
      boardMode: 'gameover',
      boardLabel: 'Wrong turn',
      boardPattern: 'Pattern 10',
      lanes: [-1, 0, -1, 1, 0, 1, 2, 1],
      inputIndex: 5,
      modal: {
        title: '패턴을 놓쳤어요',
        score: '3240',
        best: '3240',
        streak: '11',
      },
    },
  },
];

const landscapeShots = [
  {
    name: 'landscape-01-overview',
    size: { width: 1504, height: 741 },
    eyebrow: 'ZIGZAG MEMORY RUN',
    title: ['좌우 지그재그를 기억해', '빠르게 복기하세요'],
    subtitle: ['짧고 몰입감 있는 메모리 퍼즐 러너', '연속 성공으로 점수와 기록을 끌어올리세요'],
    chips: ['빠른 라운드', '연속 성공', '기록 저장'],
    phone: {
      score: '1860',
      best: '4520',
      streak: '7',
      pattern: '9',
      status: '입력 진행 중 4/9',
      boardMode: 'input',
      boardLabel: 'Input 4/9',
      boardPattern: 'Pattern 9',
      lanes: [-1, 0, -1, 1, 0, 1, 2],
      inputIndex: 4,
    },
    hero: {
      lanes: [-1, 0, -1, 1, 0, 1, 2],
    },
  },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function linesText({ x, y, lines, size, lineHeight, fill, weight = 800, opacity = 1, anchor = 'start', family }) {
  const fontFamily = family || '"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
  return `<text x="${x}" y="${y}" fill="${fill}" fill-opacity="${opacity}" font-family=${JSON.stringify(fontFamily)} font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('')}</text>`;
}

function renderDefs(width, height) {
  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${palette.bg2}"/>
        <stop offset="58%" stop-color="${palette.bg1}"/>
        <stop offset="100%" stop-color="${palette.bg0}"/>
      </linearGradient>
      <radialGradient id="glowLeft" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${round(width * 0.28)} ${round(height * 0.24)}) rotate(90) scale(${round(height * 0.42)} ${round(width * 0.44)})">
        <stop offset="0%" stop-color="#234a70" stop-opacity="0.46"/>
        <stop offset="100%" stop-color="#234a70" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glowRight" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${round(width * 0.78)} ${round(height * 0.58)}) rotate(90) scale(${round(height * 0.34)} ${round(width * 0.38)})">
        <stop offset="0%" stop-color="#12364d" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="#12364d" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="vignette" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${round(width * 0.5)} ${round(height * 0.5)}) rotate(90) scale(${round(height * 0.62)} ${round(width * 0.72)})">
        <stop offset="68%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#040b13" stop-opacity="0.52"/>
      </radialGradient>
      <linearGradient id="screenBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${palette.screenTop}"/>
        <stop offset="100%" stop-color="${palette.screenBottom}"/>
      </linearGradient>
      <linearGradient id="panelBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#10263f"/>
        <stop offset="100%" stop-color="${palette.cardDeep}"/>
      </linearGradient>
      <linearGradient id="boardBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#102034"/>
        <stop offset="100%" stop-color="${palette.bg3}"/>
      </linearGradient>
      <linearGradient id="pathCore" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${palette.accent}"/>
        <stop offset="100%" stop-color="#84ffe8"/>
      </linearGradient>
      <pattern id="grid" width="${round(Math.max(56, width * 0.085))}" height="${round(Math.max(56, width * 0.085))}" patternUnits="userSpaceOnUse">
        <path d="M${round(Math.max(56, width * 0.085))} 0H0V${round(Math.max(56, width * 0.085))}" fill="none" stroke="${palette.grid}" stroke-width="${round(Math.max(2, width * 0.0017))}"/>
      </pattern>
      <filter id="panelShadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="${round(Math.max(16, width * 0.012))}" stdDeviation="${round(Math.max(16, width * 0.012))}" flood-color="#02060a" flood-opacity="0.34"/>
      </filter>
      <filter id="phoneShadow" x="-20%" y="-20%" width="160%" height="170%">
        <feDropShadow dx="0" dy="${round(Math.max(18, width * 0.018))}" stdDeviation="${round(Math.max(20, width * 0.02))}" flood-color="#02060a" flood-opacity="0.42"/>
      </filter>
      <filter id="mintGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="${round(Math.max(10, width * 0.01))}" flood-color="${palette.accent}" flood-opacity="0.34"/>
      </filter>
      <filter id="ringGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="${round(Math.max(8, width * 0.008))}" flood-color="${palette.accentLine}" flood-opacity="0.28"/>
      </filter>
      <filter id="nodeShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="${round(Math.max(8, width * 0.007))}" stdDeviation="${round(Math.max(8, width * 0.007))}" flood-color="#04101a" flood-opacity="0.46"/>
      </filter>
    </defs>
  `;
}

function renderBackdrop(width, height) {
  const dots = [
    { x: width * 0.14, y: height * 0.13, r: width * 0.022, opacity: 0.18 },
    { x: width * 0.24, y: height * 0.09, r: width * 0.01, opacity: 0.2 },
    { x: width * 0.83, y: height * 0.18, r: width * 0.012, opacity: 0.18 },
    { x: width * 0.91, y: height * 0.11, r: width * 0.014, opacity: 0.18 },
  ];

  return `
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <rect width="${width}" height="${height}" fill="url(#glowLeft)"/>
    <rect width="${width}" height="${height}" fill="url(#glowRight)"/>
    <rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.24"/>
    ${dots
      .map(
        (dot) =>
          `<circle cx="${round(dot.x)}" cy="${round(dot.y)}" r="${round(dot.r)}" fill="#d6efff" fill-opacity="${dot.opacity}"/>`,
      )
      .join('')}
    <rect width="${width}" height="${height}" fill="url(#vignette)"/>
  `;
}

function renderChip(x, y, label) {
  const width = Math.max(126, 42 + label.length * 24);
  return `
    <g transform="translate(${x} ${y})" filter="url(#panelShadow)">
      <rect width="${width}" height="52" rx="26" fill="#132a44" fill-opacity="0.92"/>
      <rect width="${width}" height="52" rx="26" fill="none" stroke="${palette.accent}" stroke-opacity="0.2" stroke-width="2"/>
      <circle cx="24" cy="26" r="8" fill="${palette.accent}"/>
      <text x="42" y="33" fill="${palette.text}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="24" font-weight="700">${escapeXml(label)}</text>
    </g>
  `;
}

function renderChipRow(chips, x, y, gap = 16) {
  let cursor = x;
  return chips
    .map((chip) => {
      const markup = renderChip(cursor, y, chip);
      cursor += Math.max(126, 42 + chip.length * 24) + gap;
      return markup;
    })
    .join('');
}

function buildBoardPoints(board, lanes) {
  const laneGap = board.width / 8.4;
  const startX = board.x + board.width / 2;
  const startY = board.y + board.height - board.width * 0.1;
  const stepY = (board.height - board.width * 0.24) / Math.max(1, lanes.length);
  const points = [{ x: startX, y: startY }];
  let lane = 0;

  lanes.forEach((move, index) => {
    lane = move;
    points.push({
      x: startX + lane * laneGap,
      y: startY - stepY * (index + 1),
    });
  });

  return points;
}

function pointPath(points) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`)
    .join(' ');
}

function renderBoard(board, spec) {
  const points = buildBoardPoints(board, spec.lanes);
  const previewCount = spec.previewCount || points.length;
  const inputCount = spec.inputIndex ? Math.min(points.length, spec.inputIndex + 1) : 1;
  const activePoints = spec.boardMode === 'preview' ? points.slice(0, previewCount) : points.slice(0, inputCount + (spec.boardMode === 'input' ? 0 : 0));
  const startPoint = points[0];
  const goalPoint = points[points.length - 1];
  const lastEnteredPoint = activePoints[activePoints.length - 1] || startPoint;
  const laneLines = [];
  const horizontalLines = [];
  const dotRects = [];

  for (let lane = -3; lane <= 3; lane += 1) {
    const x = board.x + board.width / 2 + lane * (board.width / 8.4);
    laneLines.push(
      `<line x1="${round(x)}" y1="${round(board.y + 28)}" x2="${round(x)}" y2="${round(board.y + board.height - 28)}" stroke="${lane === 0 ? palette.accent : palette.accentBlue}" stroke-opacity="${lane === 0 ? 0.24 : 0.12}" stroke-width="${lane === 0 ? 3 : 2}"/>`,
    );
  }

  for (let index = 0; index < 8; index += 1) {
    const y = board.y + 36 + index * ((board.height - 72) / 7);
    horizontalLines.push(
      `<line x1="${round(board.x + 24)}" y1="${round(y)}" x2="${round(board.x + board.width - 24)}" y2="${round(y)}" stroke="#c0d7ea" stroke-opacity="0.08" stroke-width="2"/>`,
    );
  }

  for (let index = 0; index < 24; index += 1) {
    const x = board.x + 22 + ((index * 53) % (board.width - 44));
    const y = board.y + 18 + ((index * 37) % (board.height - 36));
    dotRects.push(
      `<rect x="${round(x)}" y="${round(y)}" width="3" height="3" fill="${index % 2 === 0 ? palette.accent : palette.accentBlue}" fill-opacity="${index % 2 === 0 ? 0.16 : 0.14}"/>`,
    );
  }

  const previewNodes =
    spec.boardMode === 'preview'
      ? activePoints
          .map((point, index) => {
            const isLast = index === activePoints.length - 1;
            return `
              <circle cx="${round(point.x)}" cy="${round(point.y)}" r="${isLast ? 11 : 8}" fill="${palette.gold}" fill-opacity="${isLast ? 0.96 : 0.7}" filter="url(#nodeShadow)"/>
              <circle cx="${round(point.x)}" cy="${round(point.y)}" r="${isLast ? 4 : 3}" fill="${palette.goldSoft}" fill-opacity="0.8"/>
            `;
          })
          .join('')
      : '';

  const inputNodes =
    spec.boardMode !== 'preview'
      ? activePoints
          .map((point, index) => {
            const isLast = index === activePoints.length - 1;
            const fill = isLast ? palette.gold : palette.accent;
            const inner = isLast ? palette.goldSoft : palette.accentSoft;
            return `
              <circle cx="${round(point.x)}" cy="${round(point.y)}" r="${isLast ? 10 : 7}" fill="${fill}" filter="url(#nodeShadow)"/>
              <circle cx="${round(point.x)}" cy="${round(point.y)}" r="${isLast ? 4 : 3}" fill="${inner}" fill-opacity="0.82"/>
            `;
          })
          .join('')
      : '';

  const overlay =
    spec.boardMode === 'gameover' && spec.modal
      ? renderGameOverModal({
          x: board.x + board.width * 0.11,
          y: board.y + board.height * 0.34,
          width: board.width * 0.78,
          height: board.height * 0.3,
          modal: spec.modal,
        })
      : '';

  return `
    <g>
      <rect x="${round(board.x)}" y="${round(board.y)}" width="${round(board.width)}" height="${round(board.height)}" rx="${round(board.width * 0.06)}" fill="url(#boardBg)"/>
      <rect x="${round(board.x)}" y="${round(board.y)}" width="${round(board.width)}" height="${round(board.height)}" rx="${round(board.width * 0.06)}" fill="none" stroke="${palette.cardLine}" stroke-opacity="0.12" stroke-width="2"/>
      ${dotRects.join('')}
      ${laneLines.join('')}
      ${horizontalLines.join('')}
      <text x="${round(board.x + 18)}" y="${round(board.y + 28)}" fill="${spec.boardMode === 'input' ? '#ffe4b0' : '#e8f2ff'}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(board.width * 0.065)}" font-weight="800">${escapeXml(spec.boardPattern)}</text>
      <text x="${round(board.x + 18)}" y="${round(board.y + 52)}" fill="${palette.muted}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(board.width * 0.042)}" font-weight="600">${escapeXml(spec.boardLabel)}</text>
      <g filter="url(#mintGlow)">
        <path d="${pointPath(activePoints)}" stroke="${palette.bg0}" stroke-opacity="0.45" stroke-width="${round(board.width * 0.085)}" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${pointPath(activePoints)}" stroke="url(#pathCore)" stroke-width="${round(board.width * 0.052)}" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${pointPath(activePoints)}" stroke="${palette.accentSoft}" stroke-opacity="0.85" stroke-width="${round(board.width * 0.022)}" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      ${spec.boardMode === 'preview' ? previewNodes : inputNodes}
      <circle cx="${round(startPoint.x)}" cy="${round(startPoint.y)}" r="${round(board.width * 0.03)}" fill="${palette.gold}" filter="url(#nodeShadow)"/>
      <circle cx="${round(startPoint.x)}" cy="${round(startPoint.y)}" r="${round(board.width * 0.012)}" fill="${palette.goldSoft}" fill-opacity="0.82"/>
      <g filter="url(#ringGlow)">
        <circle cx="${round(goalPoint.x)}" cy="${round(goalPoint.y)}" r="${round(board.width * 0.05)}" fill="none" stroke="${palette.accentLine}" stroke-width="${round(board.width * 0.013)}" stroke-opacity="0.95"/>
        <circle cx="${round(goalPoint.x)}" cy="${round(goalPoint.y)}" r="${round(board.width * 0.071)}" fill="none" stroke="${palette.accentLine}" stroke-width="${round(board.width * 0.0048)}" stroke-opacity="0.14"/>
      </g>
      ${
        spec.boardMode === 'input'
          ? `<text x="${round(board.x + board.width - 18)}" y="${round(board.y + 28)}" fill="${palette.gold}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(board.width * 0.05)}" font-weight="800" text-anchor="end">${escapeXml(`${spec.inputIndex}/${spec.lanes.length}`)}</text>`
          : ''
      }
      ${overlay}
    </g>
  `;
}

function renderGameOverModal({ x, y, width, height, modal }) {
  const rowY1 = y + height * 0.55;
  const rowY2 = y + height * 0.74;
  return `
    <g filter="url(#panelShadow)">
      <rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" rx="${round(width * 0.08)}" fill="#07101a" fill-opacity="0.9"/>
      <rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" rx="${round(width * 0.08)}" fill="none" stroke="#8cc6ea" stroke-opacity="0.16" stroke-width="2"/>
      <text x="${round(x + width / 2)}" y="${round(y + height * 0.22)}" fill="${palette.danger}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(width * 0.055)}" font-weight="800" text-anchor="middle">RUN END</text>
      <text x="${round(x + width / 2)}" y="${round(y + height * 0.39)}" fill="${palette.text}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(width * 0.078)}" font-weight="800" text-anchor="middle">${escapeXml(modal.title)}</text>
      <text x="${round(x + width * 0.22)}" y="${round(rowY1)}" fill="${palette.muted}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(width * 0.045)}" font-weight="700" text-anchor="middle">점수</text>
      <text x="${round(x + width * 0.5)}" y="${round(rowY1)}" fill="${palette.muted}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(width * 0.045)}" font-weight="700" text-anchor="middle">최고</text>
      <text x="${round(x + width * 0.78)}" y="${round(rowY1)}" fill="${palette.muted}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(width * 0.045)}" font-weight="700" text-anchor="middle">연속</text>
      <text x="${round(x + width * 0.22)}" y="${round(rowY2)}" fill="${palette.text}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(width * 0.062)}" font-weight="800" text-anchor="middle">${escapeXml(modal.score)}</text>
      <text x="${round(x + width * 0.5)}" y="${round(rowY2)}" fill="${palette.text}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(width * 0.062)}" font-weight="800" text-anchor="middle">${escapeXml(modal.best)}</text>
      <text x="${round(x + width * 0.78)}" y="${round(rowY2)}" fill="${palette.text}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(width * 0.062)}" font-weight="800" text-anchor="middle">${escapeXml(modal.streak)}</text>
    </g>
  `;
}

function renderTopPanel(screen, spec) {
  const panelX = screen.x + screen.width * 0.055;
  const panelY = screen.y + screen.height * 0.05;
  const panelWidth = screen.width * 0.89;
  const panelHeight = screen.height * 0.28;
  const hudY = panelY + panelHeight * 0.46;
  const hudWidth = (panelWidth - 22) / 4;
  const labels = [
    ['점수', spec.score],
    ['최고', spec.best],
    ['연속', spec.streak],
    ['패턴', spec.pattern],
  ];

  const hudCards = labels
    .map(([label, value], index) => {
      const x = panelX + index * hudWidth;
      return `
        <g transform="translate(${round(x)} ${round(hudY)})">
          <rect width="${round(hudWidth - 6)}" height="${round(panelHeight * 0.31)}" rx="${round(panelWidth * 0.03)}" fill="#10243a" fill-opacity="0.96"/>
          <rect width="${round(hudWidth - 6)}" height="${round(panelHeight * 0.31)}" rx="${round(panelWidth * 0.03)}" fill="none" stroke="#6fb2da" stroke-opacity="0.16" stroke-width="2"/>
          <text x="14" y="${round(panelHeight * 0.09)}" fill="${palette.muted}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(panelWidth * 0.03)}" font-weight="700">${label}</text>
          <text x="14" y="${round(panelHeight * 0.2)}" fill="${palette.text}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(panelWidth * 0.052)}" font-weight="800">${escapeXml(value)}</text>
        </g>
      `;
    })
    .join('');

  return `
    <g filter="url(#panelShadow)">
      <rect x="${round(panelX)}" y="${round(panelY)}" width="${round(panelWidth)}" height="${round(panelHeight)}" rx="${round(panelWidth * 0.06)}" fill="url(#panelBg)"/>
      <rect x="${round(panelX)}" y="${round(panelY)}" width="${round(panelWidth)}" height="${round(panelHeight)}" rx="${round(panelWidth * 0.06)}" fill="none" stroke="${palette.cardLine}" stroke-opacity="0.18" stroke-width="2"/>
      <text x="${round(panelX + 18)}" y="${round(panelY + 26)}" fill="${palette.eyebrow}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(panelWidth * 0.034)}" font-weight="800" letter-spacing="2">Toss Mini App Game</text>
      <text x="${round(panelX + 18)}" y="${round(panelY + 58)}" fill="${palette.text}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(panelWidth * 0.054)}" font-weight="800">Zigzag Memory Run</text>
      <text x="${round(panelX + 18)}" y="${round(panelY + 86)}" fill="${palette.muted}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(panelWidth * 0.03)}" font-weight="600">${escapeXml(spec.status)}</text>
      <g transform="translate(${round(panelX + panelWidth - panelWidth * 0.28)} ${round(panelY + 18)})">
        <rect width="${round(panelWidth * 0.23)}" height="${round(panelHeight * 0.18)}" rx="${round(panelHeight * 0.09)}" fill="#12304a"/>
        <rect width="${round(panelWidth * 0.23)}" height="${round(panelHeight * 0.18)}" rx="${round(panelHeight * 0.09)}" fill="none" stroke="${palette.gold}" stroke-opacity="0.22" stroke-width="2"/>
        <text x="${round(panelWidth * 0.115)}" y="${round(panelHeight * 0.12)}" fill="${palette.gold}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(panelWidth * 0.031)}" font-weight="800" text-anchor="middle">웹 미리보기</text>
      </g>
      ${hudCards}
    </g>
  `;
}

function renderActionRow(screen) {
  const rowY = screen.y + screen.height * 0.355;
  const startX = screen.x + screen.width * 0.08;
  const buttons = [
    { label: '시작', width: 84, fill: '#1c4360', stroke: palette.accent },
    { label: 'BGM 켜짐', width: 112, fill: '#122a42', stroke: '#7abfe6' },
    { label: '효과음', width: 96, fill: '#122a42', stroke: '#7abfe6' },
  ];

  let cursor = startX;
  return buttons
    .map((button) => {
      const markup = `
        <g transform="translate(${round(cursor)} ${round(rowY)})">
          <rect width="${button.width}" height="34" rx="17" fill="${button.fill}" fill-opacity="0.95"/>
          <rect width="${button.width}" height="34" rx="17" fill="none" stroke="${button.stroke}" stroke-opacity="0.24" stroke-width="2"/>
          <text x="${round(button.width / 2)}" y="22" fill="${palette.text}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="15" font-weight="800" text-anchor="middle">${escapeXml(button.label)}</text>
        </g>
      `;
      cursor += button.width + 10;
      return markup;
    })
    .join('');
}

function renderPhone(screen, spec) {
  const bezel = screen.width * 0.018;
  const stageX = screen.x + screen.width * 0.055;
  const stageY = screen.y + screen.height * 0.42;
  const stageWidth = screen.width * 0.89;
  const stageHeight = screen.height * 0.5;
  const board = {
    x: stageX + stageWidth * 0.04,
    y: stageY + stageHeight * 0.05,
    width: stageWidth * 0.92,
    height: stageHeight * 0.76,
  };

  return `
    <g filter="url(#phoneShadow)">
      <rect x="${round(screen.x - bezel)}" y="${round(screen.y - bezel)}" width="${round(screen.width + bezel * 2)}" height="${round(screen.height + bezel * 2)}" rx="${round(screen.width * 0.11)}" fill="${palette.phoneBody}"/>
      <rect x="${round(screen.x - bezel)}" y="${round(screen.y - bezel)}" width="${round(screen.width + bezel * 2)}" height="${round(screen.height + bezel * 2)}" rx="${round(screen.width * 0.11)}" fill="none" stroke="${palette.phoneEdge}" stroke-width="3"/>
      <rect x="${round(screen.x)}" y="${round(screen.y)}" width="${round(screen.width)}" height="${round(screen.height)}" rx="${round(screen.width * 0.095)}" fill="url(#screenBg)"/>
      <rect x="${round(screen.x)}" y="${round(screen.y)}" width="${round(screen.width)}" height="${round(screen.height)}" rx="${round(screen.width * 0.095)}" fill="none" stroke="#7abfe6" stroke-opacity="0.12" stroke-width="2"/>
      <rect x="${round(screen.x + screen.width * 0.29)}" y="${round(screen.y + 10)}" width="${round(screen.width * 0.42)}" height="${round(screen.width * 0.05)}" rx="${round(screen.width * 0.025)}" fill="#13283e"/>
      ${renderTopPanel(screen, spec)}
      ${renderActionRow(screen)}
      <g filter="url(#panelShadow)">
        <rect x="${round(stageX)}" y="${round(stageY)}" width="${round(stageWidth)}" height="${round(stageHeight)}" rx="${round(stageWidth * 0.06)}" fill="#0b1725" fill-opacity="0.74"/>
        <rect x="${round(stageX)}" y="${round(stageY)}" width="${round(stageWidth)}" height="${round(stageHeight)}" rx="${round(stageWidth * 0.06)}" fill="none" stroke="#8cc6ea" stroke-opacity="0.15" stroke-width="2"/>
      </g>
      ${renderBoard(board, spec)}
      <text x="${round(stageX + stageWidth / 2)}" y="${round(stageY + stageHeight - 18)}" fill="${palette.muted}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="${round(stageWidth * 0.036)}" font-weight="600" text-anchor="middle">화면 왼쪽 또는 오른쪽 탭으로 입력하세요</text>
    </g>
  `;
}

function renderPortrait(spec) {
  const { width, height } = spec.size;
  const phone = { x: 92, y: 404, width: 452, height: 580 };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(spec.title.join(' '))}">
  ${renderDefs(width, height)}
  ${renderBackdrop(width, height)}
  <g opacity="0.18">
    <circle cx="494" cy="136" r="58" fill="none" stroke="${palette.accentLine}" stroke-width="10"/>
    <circle cx="494" cy="136" r="80" fill="none" stroke="${palette.accentLine}" stroke-opacity="0.12" stroke-width="4"/>
  </g>
  <rect x="472" y="0" width="5" height="${height}" fill="${palette.accentLine}" fill-opacity="0.2"/>
  <text x="66" y="94" fill="${palette.eyebrow}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="30" font-weight="800" letter-spacing="4">${escapeXml(spec.eyebrow)}</text>
  ${linesText({ x: 62, y: 178, lines: spec.title, size: 64, lineHeight: 74, fill: palette.text, weight: 900 })}
  ${linesText({ x: 66, y: 324, lines: spec.subtitle, size: 30, lineHeight: 42, fill: palette.muted, weight: 600 })}
  ${renderChipRow(spec.chips, 62, 374, 14)}
  ${renderPhone(phone, spec.phone)}
</svg>`;
}

function renderHeroArt(width, height, hero) {
  const box = {
    x: width * 0.68,
    y: height * 0.12,
    width: width * 0.25,
    height: height * 0.72,
  };
  const points = buildBoardPoints(box, hero.lanes);
  const startPoint = points[0];
  const goalPoint = points[points.length - 1];
  return `
    <g>
      <rect x="${round(width * 0.798)}" y="0" width="6" height="${height}" fill="${palette.accentLine}" fill-opacity="0.22"/>
      <g filter="url(#mintGlow)">
        <path d="${pointPath(points)}" stroke="${palette.bg0}" stroke-opacity="0.4" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${pointPath(points)}" stroke="url(#pathCore)" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${pointPath(points)}" stroke="${palette.accentSoft}" stroke-opacity="0.82" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      ${points
        .map((point, index) => {
          const isStart = index === 0;
          const isLast = index === points.length - 1;
          const fill = isStart || index === 3 ? palette.gold : palette.accent;
          const radius = isLast ? 0 : isStart || index === 3 ? 22 : 0;
          if (!radius) return '';
          return `
            <circle cx="${round(point.x)}" cy="${round(point.y)}" r="${radius}" fill="${fill}" filter="url(#nodeShadow)"/>
            <circle cx="${round(point.x)}" cy="${round(point.y)}" r="${round(radius * 0.42)}" fill="${isStart || index === 3 ? palette.goldSoft : palette.accentSoft}" fill-opacity="0.78"/>
          `;
        })
        .join('')}
      <g filter="url(#ringGlow)">
        <circle cx="${round(goalPoint.x)}" cy="${round(goalPoint.y)}" r="52" fill="none" stroke="${palette.accentLine}" stroke-width="14"/>
        <circle cx="${round(goalPoint.x)}" cy="${round(goalPoint.y)}" r="70" fill="none" stroke="${palette.accentLine}" stroke-opacity="0.12" stroke-width="4"/>
      </g>
    </g>
  `;
}

function renderLandscape(spec) {
  const { width, height } = spec.size;
  const phone = { x: 842, y: 76, width: 382, height: 582 };
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(spec.title.join(' '))}">
  ${renderDefs(width, height)}
  ${renderBackdrop(width, height)}
  ${renderHeroArt(width, height, spec.hero)}
  <g filter="url(#panelShadow)">
    <rect x="76" y="74" width="620" height="590" rx="42" fill="#0d1f33" fill-opacity="0.7"/>
    <rect x="76" y="74" width="620" height="590" rx="42" fill="none" stroke="#7bc5ea" stroke-opacity="0.14" stroke-width="3"/>
  </g>
  <text x="122" y="150" fill="${palette.eyebrow}" font-family='"Avenir Next", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif' font-size="34" font-weight="800" letter-spacing="5">${escapeXml(spec.eyebrow)}</text>
  ${linesText({ x: 118, y: 258, lines: spec.title, size: 72, lineHeight: 86, fill: palette.text, weight: 900 })}
  ${linesText({ x: 122, y: 442, lines: spec.subtitle, size: 30, lineHeight: 42, fill: palette.muted, weight: 600 })}
  ${renderChipRow(spec.chips, 122, 530, 14)}
  ${renderPhone(phone, spec.phone)}
</svg>`;
}

function writeSvg(name, content) {
  fs.writeFileSync(path.join(OUT_DIR, `${name}.svg`), content, 'utf8');
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  portraitShots.forEach((shot) => {
    writeSvg(shot.name, renderPortrait(shot));
  });

  landscapeShots.forEach((shot) => {
    writeSvg(shot.name, renderLandscape(shot));
  });

  console.log(`Generated ${portraitShots.length + landscapeShots.length} screenshot SVG files in ${OUT_DIR}`);
}

main();
