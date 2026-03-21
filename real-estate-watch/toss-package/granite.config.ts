import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON =
  'https://static.toss.im/appsintoss/29647/18a3c412-0033-4217-89c2-7219a4e43034.png';

const appName = process.env.TOSS_APP_NAME ?? 'real-estate-watch';
const displayName = process.env.TOSS_BRAND_DISPLAY_NAME ?? '서울·경기 아파트 실거래';
const icon = process.env.TOSS_BRAND_ICON_URL ?? DEFAULT_ICON;

export default defineConfig({
  appName,
  brand: {
    displayName,
    primaryColor: '#B86B2F',
    icon,
  },
  web: {
    host: 'localhost',
    port: 4176,
    commands: {
      dev: 'node scripts/dev-server.mjs',
      build: 'node scripts/build-web.mjs',
    },
  },
  webViewProps: {
    type: 'partner',
    allowsBackForwardNavigationGestures: false,
    bounces: false,
    overScrollMode: 'never',
    pullToRefreshEnabled: false,
  },
  permissions: [],
  outdir: 'dist',
});
