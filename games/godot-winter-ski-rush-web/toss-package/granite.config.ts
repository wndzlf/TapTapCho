import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON_URL =
  'https://static.toss.im/appsintoss/29647/f5106af5-8b92-4378-96df-2259b8142405.png';
const appName = process.env.TOSS_APP_NAME?.trim() || 'winter-ski-rush';
const displayName = process.env.TOSS_BRAND_DISPLAY_NAME?.trim() || '윈터스키러시';
const icon = process.env.TOSS_BRAND_ICON_URL?.trim() || DEFAULT_ICON_URL;

export default defineConfig({
  appName,
  brand: {
    displayName,
    primaryColor: '#87D3FF',
    icon,
  },
  web: {
    host: 'localhost',
    port: 4175,
    commands: {
      dev: 'node scripts/dev-server.mjs',
      build: 'node scripts/build-web.mjs',
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
