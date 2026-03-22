(function () {
  'use strict';

  var LEGAL_LINKS = [
    { href: '/index.html', label: 'Home' },
    { href: '/about.html', label: 'About' },
    { href: '/contact.html', label: 'Contact' },
    { href: '/privacy.html', label: 'Privacy' },
    { href: '/terms.html', label: 'Terms' },
    { href: '/dmca.html', label: 'Copyright/DMCA' }
  ];

  var GAME_GUIDES = {
    'godot-air-striker-web': {
      title: 'Air Striker Lite',
      lead: '짧은 세션 슈팅이지만 스테이지 전환과 보스 페이즈가 핵심입니다. 단순 점수 누적보다 파츠 선택과 SP 타이밍으로 안정 클리어를 노리도록 설계했습니다.',
      goal: '3개 스테이지를 모두 넘기고 보스 패턴을 끊어내는 것이 목표입니다. 무작정 화력만 올리기보다 생존 루프를 먼저 확보해야 점수가 올라갑니다.',
      controls: [
        'PC: WASD 또는 방향키 이동, SP 버튼/키로 필살기 사용',
        '모바일: 좌측 방향 패드 + 우측 SP 버튼',
        '시작 직후 5초는 패턴 관찰 구간으로 쓰는 것이 유리'
      ],
      tips: [
        'Wave 초반에 콤보를 쌓고 보스 직전에는 SP를 70% 이상 남기세요.',
        '체력이 1 남았을 때는 중앙보다 가장자리 회피가 안전합니다.',
        '레벨업 순간 무빙을 멈추지 않으면 피격률이 크게 줄어듭니다.'
      ],
      updates: [
        '2026-03-14: 보스 탄막 간격을 단계별로 분리해 초반 좌절감을 낮췄습니다.',
        '2026-03-14: 모바일 터치 입력 지연을 줄여 SP 반응성을 개선했습니다.'
      ],
      faq: [
        { q: 'Q. SP는 언제 쓰는 게 가장 좋나요?', a: 'A. 보스 패턴 전환 직후 사용하면 체력 손실 없이 딜 이득을 크게 볼 수 있습니다.' },
        { q: 'Q. 점수가 잘 안 오릅니다.', a: 'A. 웨이브 종료 전 콤보를 끊지 않는 것이 핵심입니다. 생존보다 콤보 유지가 고득점에 직접 연결됩니다.' }
      ]
    },
    'godot-winter-ski-rush-web': {
      title: 'Winter Ski Rush',
      lead: '다운힐 레이스 감각을 살린 타임어택 게임입니다. 브레이크로 리듬을 만들고 코너를 짧게 자르는 선택이 기록 차이를 만듭니다.',
      goal: '20개 체크포인트를 통과해 완주 시간을 줄이는 것이 1차 목표입니다. 코스를 정확히 읽어 충돌 없는 런을 만들면 기록이 급격히 단축됩니다.',
      controls: [
        'LEFT/RIGHT: 좌우 조향',
        'BRAKE: 급코너 감속',
        'BOOST: 직선 가속'
      ],
      tips: [
        '코너 진입 전에 BRAKE를 짧게 두 번 쓰면 미끄러짐이 줄어듭니다.',
        'BOOST는 넓은 직선 구간에서만 사용해야 손실이 적습니다.',
        '체크포인트 직후 라인을 재정렬하면 다음 구간 난이도가 낮아집니다.'
      ],
      updates: [
        '2026-03-14: 트랙 길이를 확장하고 장애물 배치를 재조정했습니다.',
        '2026-03-14: Easy/Normal의 가속 차이를 분리해 모드 체감이 명확해졌습니다.'
      ],
      faq: [
        { q: 'Q. 왜 충돌 후 기록이 크게 손해 보나요?', a: 'A. 리스폰 자체보다 라인 재정렬 비용이 큽니다. 체크포인트 직전 안전 주행이 오히려 빠릅니다.' },
        { q: 'Q. 모바일에서도 같은 기록을 노릴 수 있나요?', a: 'A. 가능합니다. 조향 입력을 길게 누르기보다 짧은 탭으로 리듬을 맞추면 데스크톱과 차이가 줄어듭니다.' }
      ]
    },
    'sunken-sixway-defense': {
      title: 'Sunken Sixway Defense',
      lead: '웨이브 방어형 타워 디펜스이며, 핵심은 “길 설계 + 타워 조합 + 업그레이드 타이밍”입니다. 단일 화력보다 라인 유지가 중요합니다.',
      goal: '황제를 지키며 Stage 50까지 도달하는 것이 목표입니다. 고난도 구간은 메인 딜 타워보다 감속/스턴/탱커 조합이 성패를 좌우합니다.',
      controls: [
        '좌클릭 배치/업그레이드, 우클릭 판매',
        'Speed +/- 로 진행 배속 제어',
        'Merge는 조건을 만족할 때만 사용 가능'
      ],
      tips: [
        '초반에는 저비용 타워로 라인을 길게 만들고, 중반에 광역 딜로 전환하세요.',
        '스턴 면역 보스 스테이지(5,15,25,35,45)는 탱커+해머 비중을 높이세요.',
        '배속을 올릴수록 경제 관리 실수가 크게 누적됩니다.'
      ],
      updates: [
        '2026-03-14: 광고 슬롯 UI를 제거해 전투 정보 집중도를 높였습니다.',
        '2026-03-14: 랭킹 패널 가독성과 모바일 입력 안정성을 조정했습니다.'
      ],
      faq: [
        { q: 'Q. 왜 중반 이후 갑자기 뚫리나요?', a: 'A. 딜 타워만 늘리면 경로 제어가 무너집니다. 스턴/탱커 라인을 함께 유지해야 후반이 안정됩니다.' },
        { q: 'Q. Merge가 비활성화되는 조건은?', a: 'A. 단순 개수 5개가 아니라, 머지 가능한 타워 조합이 더 이상 남지 않을 때 비활성화됩니다.' }
      ]
    },
    'worm-arena-rush': {
      title: 'Worm Arena Rush',
      lead: '성장형 아레나 게임으로, 길이 성장보다 충돌 리스크 관리가 먼저입니다. 짧은 부스트를 어떻게 끊어 쓰는지가 고점 플레이를 만듭니다.',
      goal: '먹이를 모아 길이를 늘리면서 다른 웜의 동선을 유도해 생존 시간을 늘리세요. 최종 목표는 최고 길이와 최고 점수 갱신입니다.',
      controls: [
        '마우스/터치 이동, WASD/방향키 지원',
        'Shift/Space 또는 BOOST 버튼으로 가속',
        '가속은 길이 소모가 있으므로 연속 사용 금지'
      ],
      tips: [
        '맵 바깥 원형 라인을 타면 충돌 각을 만들기 좋습니다.',
        '성장 초반에는 공격보다 공간 확보가 안정적입니다.',
        '길이가 길어질수록 급회전을 줄여 자기충돌을 막으세요.'
      ],
      updates: [
        '2026-03-14: 충돌 판정 보정으로 억울한 자기충돌 사례를 줄였습니다.',
        '2026-03-14: 피드백 이펙트를 정리해 고속 상황에서도 시인성을 확보했습니다.'
      ],
      faq: [
        { q: 'Q. 부스트를 자주 쓰면 왜 손해인가요?', a: 'A. 가속은 위치 이득은 크지만 길이 손실이 누적되면 역전당하기 쉽습니다.' },
        { q: 'Q. 봇 상대가 너무 단단하게 느껴집니다.', a: 'A. 정면 추격보다 측면 차단으로 머리를 유도하면 더 쉽게 제압할 수 있습니다.' }
      ]
    },
    'orbitSurvivor': {
      title: 'Orbit Survivor',
      lead: '한 번의 탭으로 방향을 바꾸는 리듬 생존 게임입니다. 현재는 3목숨 구조로 바뀌어, 연속 피격만 피하면 후반 패턴 학습이 가능합니다.',
      goal: '궤도 안에서 파편을 회피하며 최대 점수를 갱신하세요. 점수 20 이후 중심축 드리프트 패턴이 바뀌므로 적응이 중요합니다.',
      controls: [
        'Tap / Space / Tab: 궤도 방향 전환',
        'Enter 또는 Play Again: 재시작',
        'Lives가 0이 되면 결과 모달에서 재도전'
      ],
      tips: [
        '연속 탭보다 1~2박자 늦춘 입력이 충돌을 줄여줍니다.',
        '드리프트 화살표를 먼저 보고 회피 방향을 선결정하세요.',
        '굽어지는 탄은 꺾이는 타이밍 전에 빈 공간을 확보해야 안전합니다.'
      ],
      updates: [
        '2026-03-14: 3 라이프/피격 플래시/게임오버 모달을 추가했습니다.',
        '2026-03-14: 상하/대각 드리프트 + 직선 후 꺾이는 탄 패턴을 도입했습니다.'
      ],
      faq: [
        { q: 'Q. 예전보다 왜 오래 버티기 쉬워졌나요?', a: 'A. 즉사 구조를 3라이프로 완화해 패턴 학습 루프를 확보했습니다.' },
        { q: 'Q. 후반 탄이 너무 갑자기 꺾입니다.', a: 'A. 꺾임 탄은 생성 색이 다르며, 타이밍이 가까워지면 궤도 바깥쪽으로 빠지는 것이 안전합니다.' }
      ]
    },
    'zigzag-memory-run': {
      title: 'Zigzag Memory Run',
      lead: '기억 퍼즐 + 리듬 입력 조합 게임입니다. 미리 보여준 경로를 정확히 복기하면 고득점 배수가 붙도록 설계되어 있습니다.',
      goal: '라운드마다 제시되는 경로를 기억하고 정확히 재현하세요. 실수 없이 연속 클리어할수록 스코어 배수가 커집니다.',
      controls: [
        '좌/우 입력 또는 화면 좌/우 탭으로 경로 선택',
        'Start 후 프리뷰 패턴 관찰',
        '입력 도중 과도한 연타는 오입력으로 판정될 수 있음'
      ],
      tips: [
        '패턴을 “좌2-우1”처럼 덩어리로 기억하면 안정적입니다.',
        '라운드 시작 직후 첫 입력을 서두르지 마세요.',
        '실패 라운드를 짧게 복기하면 다음 런의 정확도가 급상승합니다.'
      ],
      updates: [
        '2026-03-14: 목적지 원이 화면 밖으로 벗어나는 버그를 수정했습니다.',
        '2026-03-14: 메모리 구간의 시각 힌트를 줄여 난이도 의도를 강화했습니다.'
      ],
      faq: [
        { q: 'Q. 왜 난이도가 갑자기 튀나요?', a: 'A. 라운드마다 패턴 길이가 늘어나며, 복기 정확도 기반으로 체감 난이도가 상승합니다.' },
        { q: 'Q. 모바일에서 잘 안 맞아요.', a: 'A. 좌우 탭 위치를 화면 가장자리 쪽으로 넓게 써서 오입력을 줄였습니다.' }
      ]
    },
    'godot-thrillpark-manager-web': {
      title: 'ThrillPark Manager',
      lead: '건설/운영 시뮬레이션 프로토타입으로, 단순 건물 배치보다 손님 흐름과 유지비 밸런스를 맞추는 운영 감각이 핵심입니다.',
      goal: '입장객, 만족도, 수익의 균형을 맞추며 공원을 성장시키세요. 길 연결과 시설 배치 실패가 가장 큰 손실 원인입니다.',
      controls: [
        '마우스 중심 배치 + 확대/축소',
        'UI 탭에서 Build/Staff/Finance 전환',
        '모바일에서는 드래그 이동 후 버튼 탭 중심 운영'
      ],
      tips: [
        '놀이기구보다 화장실/벤치/쓰레기통이 초반 이탈률을 크게 줄입니다.',
        '대출은 확장 타이밍 1회만 쓰고 빠르게 상환하는 편이 안정적입니다.',
        '대기열이 긴 구역에 상점을 붙이면 수익이 급격히 늘어납니다.'
      ],
      updates: [
        '2026-03-14: 캠페인형 안내 문구를 정리해 초반 진입 장벽을 낮췄습니다.',
        '2026-03-14: 정책/신뢰 페이지 링크를 추가해 서비스 구조를 명확히 했습니다.'
      ],
      faq: [
        { q: 'Q. 수익이 늘다가 갑자기 줄어듭니다.', a: 'A. 유지비와 청결도 하락이 겹치면 방문객 체류 시간이 급감합니다. 스태프 동선을 먼저 보세요.' },
        { q: 'Q. 확장 전에 무엇부터 올려야 하나요?', a: 'A. 기존 구역 만족도를 70 이상으로 만든 뒤 확장해야 투자 대비 효율이 좋습니다.' }
      ]
    },
    'godot-hyperfold-web': {
      title: 'Hyperfold: Golden Hunt',
      lead: '레이어 전환과 리와인드를 섞어 목적 지점을 먼저 선점하는 4D 퍼즐 액션입니다. 탐색보다 타이밍이 더 중요한 설계입니다.',
      goal: '골든 웨폰을 외계인보다 먼저 확보하세요. 레이어(W0~W3)와 시간축(리와인드)을 조합해 지름길을 찾아야 합니다.',
      controls: [
        'W 또는 슬라이더: 레이어 전환',
        'R/Rewind 버튼: 10초 역재생',
        '방향키/터치패드: 이동'
      ],
      tips: [
        '초반 7초 동안은 스폰 조건을 파악하는 정찰 플레이가 유리합니다.',
        '리와인드 직후 적 AI가 경로를 재계산하므로, 바로 레이어를 바꿔야 추격을 끊을 수 있습니다.',
        '실드는 충돌 직전보다는 갈림길 진입 직전에 쓰는 편이 효율적입니다.'
      ],
      updates: [
        '2026-03-14: 골든 웨폰 출현 규칙 안내를 보강해 의도를 명확히 했습니다.',
        '2026-03-14: 레이어 전환 시각 효과와 상태 표시를 정리했습니다.'
      ],
      faq: [
        { q: 'Q. 골든 웨폰이 항상 같은 레이어인가요?', a: 'A. 고정이 아니라 시간/레이어 조합 규칙에 따라 달라집니다. 탐색과 리와인드가 필수입니다.' },
        { q: 'Q. 리와인드 중에는 왜 고스트처럼 보이나요?', a: 'A. 과거 경로 학습을 위해 충돌 판정이 완화된 상태를 시각적으로 구분한 것입니다.' }
      ]
    },
    'crimson-hunter-trials': {
      title: 'Crimson Hunter Trials',
      lead: '탑다운 액션 로그라이트로, 순간 화력보다 위치 선정과 쿨다운 운용이 생존을 좌우합니다. Trial이 올라갈수록 빌드 선택이 중요해집니다.',
      goal: '웨이브를 버티며 Essence를 모아 다음 Trial까지 도달하세요. 안정적인 클리어는 대시/시그니처 타이밍에 달려 있습니다.',
      controls: [
        '모바일: 좌측 가상 스틱 이동 + 우측 대시/시그니처 버튼',
        'PC: WASD/방향키 이동',
        'Shift/Space: 대시 · Q/E: 시그니처'
      ],
      tips: [
        '근접 압박 웨이브에서는 대시를 공격용이 아니라 이탈용으로 보존하세요.',
        '시그니처는 잡몹보다 중형 적 타이밍에 맞춰야 효율이 큽니다.',
        'HP가 40% 이하일 때는 원형 이동으로 적 탄을 흩뜨리세요.'
      ],
      updates: [
        '2026-03-22: 토스 미니앱 Safe Area/뒤로가기/백그라운드 일시정지 흐름을 반영했습니다.',
        '2026-03-22: 모바일 자동 조준 보정과 스틱/스킬 버튼 레이아웃을 개선했습니다.'
      ],
      faq: [
        { q: 'Q. Essence는 어디에 우선 투자하나요?', a: 'A. 생존형 옵션(회복/쿨감)을 먼저 찍고 딜 옵션은 후반에 올리는 편이 안정적입니다.' },
        { q: 'Q. 웨이브가 길어질수록 컨트롤이 꼬입니다.', a: 'A. 적을 한쪽 벽으로 유도한 뒤 시계 방향으로 크게 돌면 패턴이 단순해집니다.' }
      ]
    },
    'poop-escape': {
      title: 'Poop Escape',
      lead: '코미디 스텔스 컨셉의 짧은 라운드 게임입니다. 목표 전환이 빠르기 때문에 경로 암기보다 즉흥 판단이 점수를 좌우합니다.',
      goal: '휴지 확보 → 처리 → 탈출 루프를 최대한 빠르게 반복해 스테이지를 올리세요. 지연 없이 목적 전환하는 것이 핵심입니다.',
      controls: [
        'Tap/Swipe 기반 이동',
        'Start로 라운드 시작',
        '타이머를 보며 목표 칩(Goal)을 즉시 확인'
      ],
      tips: [
        '목표가 바뀌는 순간 0.5초 안에 진행 방향을 확정하세요.',
        '좁은 구간에서는 짧은 스와이프가 긴 드래그보다 안전합니다.',
        '스테이지 3 이후에는 경로 단축보다 충돌 방지가 더 중요합니다.'
      ],
      updates: [
        '2026-03-14: 목표 칩 텍스트 대비를 높여 인지 속도를 개선했습니다.',
        '2026-03-14: 모바일 화면에서 버튼 간격을 재정렬했습니다.'
      ],
      faq: [
        { q: 'Q. 왜 갑자기 실패 판정이 납니다?', a: 'A. 목표 상태 전환 후 제한 시간 초과가 주요 원인입니다. Goal 칩을 우선 확인하세요.' },
        { q: 'Q. 고득점 핵심은 무엇인가요?', a: 'A. 이동 거리 최소화보다 목표 전환 반응 시간을 줄이는 것이 점수에 더 큰 영향을 줍니다.' }
      ]
    },
    'neon-dodge': {
      title: 'Neon Dodge',
      lead: '가장 기본적인 회피형 게임이지만 콤보를 유지하면 점수 구조가 크게 달라집니다. 단순 생존보다 리스크를 감수한 라인 선택이 중요합니다.',
      goal: '장애물을 회피하면서 콤보를 끊기지 않게 유지해 최고 점수를 달성하세요. 생존 시간보다 연속 회피 효율이 핵심 지표입니다.',
      controls: [
        'A/D 또는 방향키 좌우 이동',
        '모바일은 좌/우 영역 탭',
        'Space: 빠른 재시작'
      ],
      tips: [
        '중앙 고정 플레이보다 좁은 스윙 이동이 안정적입니다.',
        '콤보 10 이상 구간은 급회피보다 선이동 예측이 유리합니다.',
        '경계선 근처에서 오래 머물면 피격각이 급증합니다.'
      ],
      updates: [
        '2026-03-14: 콤보 하이라이트 시인성을 강화했습니다.',
        '2026-03-14: 모바일 탭 경계 오입력을 줄였습니다.'
      ],
      faq: [
        { q: 'Q. 콤보가 자주 끊깁니다.', a: 'A. 장애물 직전 반응보다 한 템포 이른 이동으로 라인을 미리 잡아야 합니다.' },
        { q: 'Q. 초반과 후반 속도 차이가 큰가요?', a: 'A. 예, 점수 구간에 따라 체감 속도가 올라가므로 입력 리듬을 조금씩 짧게 가져가야 합니다.' }
      ]
    },
    'ball-bounce': {
      title: 'Ball Bounce',
      lead: '벽돌 파괴 기반이지만 멀티볼과 콤보 유지가 중심입니다. 안전하게 오래 치는 것보다 드롭 타이밍을 공격적으로 노리는 플레이가 유리합니다.',
      goal: '브릭을 빠르게 제거하고 생명을 지키면서 높은 콤보를 달성하세요. 레벨이 올라갈수록 패들 위치 선정이 중요해집니다.',
      controls: [
        '좌우 이동: A/D, 방향키, 드래그',
        '발사: 스페이스 또는 탭',
        'Pause/Sound 버튼으로 플레이 템포 조절'
      ],
      tips: [
        '공이 낮게 내려올 때 패들 중앙으로 정확히 받으면 각도 제어가 쉬워집니다.',
        '파워업은 즉시 먹기보다 위험 구간에서 회수하는 편이 안정적입니다.',
        '생명이 1일 때는 공격보다 공 회수 우선 순위로 전환하세요.'
      ],
      updates: [
        '2026-03-14: 콤보 계산과 최고 콤보 기록 동기화를 개선했습니다.',
        '2026-03-14: 모바일 드래그 감도를 조정해 오버슈팅을 줄였습니다.'
      ],
      faq: [
        { q: 'Q. 멀티볼 구간에서 왜 갑자기 난이도가 올라가나요?', a: 'A. 화면 정보량이 늘면서 패들 위치 오차가 커지기 때문입니다. 중앙 복귀를 습관화하면 안정됩니다.' },
        { q: 'Q. 레벨업 기준은 무엇인가요?', a: 'A. 남은 브릭 비율과 콤보 상태를 함께 반영합니다. 빠른 클리어와 콤보 유지가 동시에 필요합니다.' }
      ]
    },
    'color-switch-dot': {
      title: 'Color Switch Dot',
      lead: '색상 매칭 반사 신경 게임으로, 눈에 보이는 색보다 다음 게이트 색 순서를 먼저 읽는 플레이가 안정적입니다.',
      goal: '현재 내 색과 같은 게이트만 통과하며 최대 점수를 쌓으세요. 속도가 붙을수록 색상 전환 타이밍 예측이 중요해집니다.',
      controls: [
        'Tap/Space: 점프',
        '짧은 탭으로 높이를 미세 조절',
        '실패 후 화면 탭 또는 재시작 버튼으로 즉시 재도전'
      ],
      tips: [
        '게이트 중앙보다 살짝 아래에서 진입하면 색상 확인 시간이 늘어납니다.',
        '연속 점프보다 리듬 있는 단타 입력이 오버슈팅을 줄입니다.',
        '색상 전환 직후는 무리해서 점수를 노리지 말고 다음 구간 정렬을 우선하세요.'
      ],
      updates: [
        '2026-03-14: 게이트 대비를 높여 모바일에서도 색 구분이 쉬워졌습니다.',
        '2026-03-14: 점프 입력 버퍼를 조정해 연타 오입력을 줄였습니다.'
      ],
      faq: [
        { q: 'Q. 분명 맞는 색인데 실패하는 것 같아요.', a: 'A. 게이트 가장자리 충돌이 먼저 판정될 수 있어 중심선 정렬이 중요합니다.' },
        { q: 'Q. 후반에 점프 높이 조절이 어렵습니다.', a: 'A. 길게 누르기보다 일정한 박자의 짧은 탭이 더 안정적인 궤적을 만듭니다.' }
      ]
    },
    'neon-snake': {
      title: 'Neon Snake',
      lead: '클래식 스네이크를 네온 아케이드 감각으로 다듬은 게임입니다. 성장보다 회전 반경 관리가 더 큰 실수 포인트입니다.',
      goal: '먹이를 모아 길이를 늘리면서 벽과 자기 몸통 충돌 없이 최고 점수를 갱신하세요. 후반에는 공간을 남겨두는 운영이 핵심입니다.',
      controls: [
        '방향키 또는 WASD 이동',
        '모바일은 화면 스와이프로 방향 전환',
        '재시작 버튼으로 즉시 다시 플레이 가능'
      ],
      tips: [
        '맵 가장자리를 따라 큰 사각형 루프를 만들면 후반 운영이 쉬워집니다.',
        '먹이를 바로 먹기보다 다음 회전 공간을 먼저 확보하세요.',
        '길이가 길어질수록 급회전보다 일정한 패턴 이동이 안전합니다.'
      ],
      updates: [
        '2026-03-14: 스와이프 방향 판정을 안정화해 역입력을 줄였습니다.',
        '2026-03-14: 점수 HUD 간격을 조정해 플레이 영역 시야를 넓혔습니다.'
      ],
      faq: [
        { q: 'Q. 왜 후반에 갑자기 막히나요?', a: 'A. 먹이를 좇다가 중앙 공간을 미리 닫아버리는 경우가 많습니다. 외곽 루프를 유지하세요.' },
        { q: 'Q. 모바일에서 방향이 늦게 바뀌는 느낌입니다.', a: 'A. 짧고 분명한 스와이프가 가장 정확하며, 대각선 제스처는 오인식될 수 있습니다.' }
      ]
    }
  };

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getPageKey() {
    var path = (window.location.pathname || '/').replace(/\/+/g, '/');
    if (path === '/' || path === '/index.html') return 'home';
    var parts = path.split('/').filter(Boolean);
    if (!parts.length) return 'home';
    return parts[0];
  }

  function buildLinkSet(className) {
    var holder = document.createElement('div');
    holder.className = className;
    LEGAL_LINKS.forEach(function (item, idx) {
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      holder.appendChild(a);
      if (idx < LEGAL_LINKS.length - 1) {
        var sep = document.createElement('span');
        sep.textContent = '·';
        holder.appendChild(sep);
      }
    });
    return holder;
  }

  function isCanvasGamePage() {
    return !document.querySelector('.wrap') &&
      !document.querySelector('.legal-layout') &&
      !!document.querySelector('canvas');
  }

  function getGuideMode() {
    if (!document.body || !document.body.dataset) return '';
    return document.body.dataset.siteGuideMode || '';
  }

  function getGuideLang() {
    if (!document.body || !document.body.dataset) return '';
    return document.body.dataset.siteGuideLang || '';
  }

  function getGuideButtonLabel() {
    if (!document.body || !document.body.dataset) return 'Game Guide';
    return document.body.dataset.siteGuideLabel || 'Game Guide';
  }

  function getGuideCloseLabel() {
    if (!document.body || !document.body.dataset) return 'Close';
    return document.body.dataset.siteGuideCloseLabel || 'Close';
  }

  function getGuideHeading(title) {
    if (getGuideLang() === 'ko') {
      return title + ' 가이드';
    }
    return title + ' Guide';
  }

  function buildFixedLinkNav() {
    var fixed = document.createElement('nav');
    fixed.className = 'site-nav-inline no-wrap-nav';
    var fixedLabel = document.createElement('span');
    fixedLabel.className = 'label';
    fixedLabel.textContent = 'TapTapCho';
    fixed.appendChild(fixedLabel);
    LEGAL_LINKS.forEach(function (item, idx) {
      var link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.label;
      fixed.appendChild(link);
      if (idx < LEGAL_LINKS.length - 1) {
        var dot = document.createElement('span');
        dot.textContent = '·';
        fixed.appendChild(dot);
      }
    });
    return fixed;
  }

  function buildCompactFixedNav() {
    var fixed = document.createElement('nav');
    fixed.className = 'site-nav-inline no-wrap-nav compact-nav';
    fixed.setAttribute('aria-label', 'TapTapCho quick links');

    var fixedLabel = document.createElement('span');
    fixedLabel.className = 'label';
    fixedLabel.textContent = 'TapTapCho';
    fixed.appendChild(fixedLabel);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'site-nav-toggle';
    toggle.textContent = 'Menu';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open TapTapCho menu');
    fixed.appendChild(toggle);

    var drawer = document.createElement('div');
    drawer.className = 'site-nav-drawer';
    drawer.setAttribute('aria-label', 'Quick links');
    LEGAL_LINKS.forEach(function (item) {
      var link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.label;
      drawer.appendChild(link);
    });
    fixed.appendChild(drawer);

    function closeDrawer() {
      fixed.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      var isOpen = fixed.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', function (event) {
      if (!fixed.contains(event.target)) {
        closeDrawer();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeDrawer();
      }
    });

    return fixed;
  }

  function ensureTopLinks() {
    var topHeader = document.querySelector('header.top');
    if (topHeader && !topHeader.querySelector('.top-links')) {
      topHeader.appendChild(buildLinkSet('top-links'));
      return;
    }

    var wrap = document.querySelector('.wrap');
    if (wrap && !wrap.querySelector('.site-nav-inline')) {
      var nav = document.createElement('nav');
      nav.className = 'site-nav-inline';
      var label = document.createElement('span');
      label.className = 'label';
      label.textContent = 'TapTapCho';
      nav.appendChild(label);
      LEGAL_LINKS.forEach(function (item, idx) {
        var a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.label;
        nav.appendChild(a);
        if (idx < LEGAL_LINKS.length - 1) {
          var sep = document.createElement('span');
          sep.textContent = '·';
          nav.appendChild(sep);
        }
      });
      wrap.insertBefore(nav, wrap.firstElementChild);
      return;
    }

    if (!wrap && !document.querySelector('.site-nav-inline.no-wrap-nav')) {
      document.body.appendChild(isCanvasGamePage() ? buildCompactFixedNav() : buildFixedLinkNav());
    }
  }

  function ensureFooterLinks() {
    var wrap = document.querySelector('.wrap');
    var root = wrap || document.body;
    var footer = root.querySelector('footer');

    if (!footer && wrap) {
      footer = document.createElement('footer');
      wrap.appendChild(footer);
    }

    if (footer && !footer.querySelector('.site-footer-links')) {
      footer.appendChild(buildLinkSet('site-footer-links'));
    }
  }

  function renderGuide(meta) {
    var controls = meta.controls.map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join('');

    var tips = meta.tips.map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join('');

    var updates = meta.updates.map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join('');

    var faq = meta.faq.map(function (item) {
      return '<div><dt>' + escapeHtml(item.q) + '</dt><dd>' + escapeHtml(item.a) + '</dd></div>';
    }).join('');

    return (
      '<section class="game-guide" aria-label="' + escapeHtml(getGuideHeading(meta.title)) + '">' +
      '<h2>' + escapeHtml(getGuideHeading(meta.title)) + '</h2>' +
      '<p class="lead">' + escapeHtml(meta.lead) + '</p>' +
      '<div class="game-guide-grid">' +
      '<article class="game-guide-card"><h3>게임 목표</h3><p>' + escapeHtml(meta.goal) + '</p></article>' +
      '<article class="game-guide-card"><h3>조작 방법</h3><ul>' + controls + '</ul></article>' +
      '<article class="game-guide-card"><h3>공략 팁</h3><ul>' + tips + '</ul></article>' +
      '<article class="game-guide-card"><h3>운영 메모</h3><p>현재 페이지는 고유 플레이 가이드 중심으로 구성되었습니다. 동일 텍스트 재사용 없이 게임별 정보만 유지합니다.</p></article>' +
      '</div>' +
      '<article class="game-guide-card game-guide-updates"><h3>업데이트 내역</h3><ul>' + updates + '</ul></article>' +
      '<dl class="game-guide-card game-guide-faq"><h3>FAQ</h3>' + faq + '</dl>' +
      '</section>'
    );
  }

  function insertGuide(meta) {
    var html = renderGuide(meta);
    var wrap = document.querySelector('.wrap');
    var prefersFloatingGuide = getGuideMode() === 'floating';

    if (wrap && !prefersFloatingGuide) {
      if (wrap.querySelector('.game-guide')) return;
      var footer = wrap.querySelector('footer');
      var section = document.createElement('div');
      section.innerHTML = html;
      if (footer) wrap.insertBefore(section.firstChild, footer);
      else wrap.appendChild(section.firstChild);
      return;
    }

    if (document.querySelector('.floating-guide')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'floating-guide-btn';
    btn.textContent = getGuideButtonLabel();

    var layer = document.createElement('div');
    layer.className = 'floating-guide';
    layer.innerHTML = '<div class="floating-guide-panel"><button type="button" class="floating-guide-close">' + escapeHtml(getGuideCloseLabel()) + '</button>' + html + '</div>';

    document.body.appendChild(btn);
    document.body.appendChild(layer);

    btn.addEventListener('click', function () {
      layer.classList.add('show');
    });

    layer.addEventListener('click', function (event) {
      if (event.target === layer || event.target.classList.contains('floating-guide-close')) {
        layer.classList.remove('show');
      }
    });
  }

  function curateHomeTop12() {
    // Home card curation is disabled. Keep all cards visible.
  }

  function run() {
    var key = getPageKey();
    ensureTopLinks();
    ensureFooterLinks();

    if (key === 'home') {
      curateHomeTop12();
      return;
    }

    if (GAME_GUIDES[key]) {
      insertGuide(GAME_GUIDES[key]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
