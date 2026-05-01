# Interior Review Showcase

스크린샷으로 확인한 네이버 카페 구조를 바탕으로 만든 인테리어 홍보용 데모입니다.

## 목적

- `전체인테리어`, `공간별모음` 같은 기존 카테고리 흐름 유지
- 카페 후기/사진을 상담 전환용 단일 웹페이지로 재구성
- 실제 데이터가 생기면 코드 수정 없이 브라우저에서 빠르게 교체 가능

## 파일

- `index.html`: 페이지 구조
- `style.css`: 비주얼 스타일
- `app.js`: 샘플 데이터, 필터, 편집 패널, 로컬 저장
- `import-naver-blog.mjs`: 네이버 블로그 카테고리, 글, 이미지 경로 자동 수집

## 미리보기

프로젝트 루트에서 아래처럼 실행하면 됩니다.

```bash
python3 -m http.server 4300
```

브라우저에서 `http://127.0.0.1:4300/games/interior-review-showcase/` 로 확인합니다.

## 데이터 바꾸기

우측 하단 `데모 편집` 버튼에서 아래 형식으로 붙여넣으면 됩니다.

### 프로젝트 데이터

```text
카테고리 | 공간표시명 | 제목 | 지역 | 날짜 | 조회수 | 사진종류키 | 요약 | 이미지URL(optional)
전체인테리어 | 거실/주방 | 용인 수지 동천동 전체 리모델링 | 동천동 | 2026.03.20 | 86 | living | 밝은 톤의 전체 리모델링 | https://example.com/photo.jpg
```

사진종류키는 기본 플레이스홀더 모양을 정할 때 사용합니다.

- `living`
- `bathroom`
- `blind`
- `hallway`
- `door`
- `window`
- `kitchen`

### 후기 데이터

```text
이름 | 프로젝트 제목 | 별점 | 태그1,태그2 | 후기 요약
수지구 고객 A | 용인 수지 동천동 전체 리모델링 | 5 | 마감,상담 | 공정 설명이 명확하고 마감이 깔끔했습니다.
```

## 네이버 블로그 자동 수집

남서울인테리어처럼 네이버 블로그에 공개된 글이라면 카테고리 목록, 글 목록, 글 안 이미지 원본 경로까지 자동으로 뽑아낼 수 있습니다.

```bash
node games/interior-review-showcase/import-naver-blog.mjs
```

기본 출력 파일:

- `games/interior-review-showcase/data/naver-blog-import.json`

실제 이미지 파일까지 내려받으려면:

```bash
node games/interior-review-showcase/import-naver-blog.mjs --download
```

기본 다운로드 폴더:

- `games/interior-review-showcase/photos/naver-blog`

특정 카테고리만 받고 싶다면:

```bash
node games/interior-review-showcase/import-naver-blog.mjs --category 1 --category 159
```

## 한계

- 비공개 글, 이웃공개 글, 로그인 필요 글은 자동 수집할 수 없습니다.
- 스크립트는 현재 공개된 네이버 모바일 블로그 구조에 의존합니다.
- 브라우저 저장소(`localStorage`)를 사용하므로 편집 패널 변경 내용은 같은 브라우저에서만 유지됩니다.
