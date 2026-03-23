import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON_URL =
  'https://static.toss.im/appsintoss/29647/bc677ab3-dd28-42cc-a5bd-2713240c6c56.png';

const appName = process.env.TOSS_APP_NAME ?? 'zigzag-memory-run';
const displayName = process.env.TOSS_BRAND_DISPLAY_NAME ?? '지그재그메모리런';
const icon = process.env.TOSS_BRAND_ICON_URL ?? DEFAULT_ICON_URL;

export default defineConfig({
  appName,
  brand: {
    displayName,
    primaryColor: '#74F7D4',
    icon,
  },
  web: {
    host: 'localhost',
    port: 4174,
    commands: {
      dev: 'jiti scripts/dev-server.mjs',
      build: 'jiti scripts/build-web.mjs',
    },
  },
  webViewProps: {
    type: 'game',
    allowsBackForwardNavigationGestures: false,
    bounces: false,
    overScrollMode: 'never',
    pullToRefreshEnabled: false,
  },
  permissions: [],
  outdir: 'dist',
});
