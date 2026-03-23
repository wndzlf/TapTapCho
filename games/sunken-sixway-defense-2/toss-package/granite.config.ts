import { readFileSync } from 'node:fs';
import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  readFileSync(new URL('../appintos-logo-600.svg', import.meta.url), 'utf8'),
)}`;

const appName = process.env.TOSS_APP_NAME?.trim() || 'sunkendefense2';
const displayName = process.env.TOSS_BRAND_DISPLAY_NAME?.trim() || '선큰 식스웨이 디펜스 2';
const icon = process.env.TOSS_BRAND_ICON_URL?.trim() || DEFAULT_ICON;

export default defineConfig({
  appName,
  brand: {
    displayName,
    primaryColor: '#6FCBFF',
    icon,
  },
  web: {
    host: 'localhost',
    port: 4182,
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
