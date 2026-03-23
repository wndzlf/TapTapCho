import { defineConfig } from '@apps-in-toss/web-framework/config';

const DEFAULT_ICON_URL =
  'https://static.toss.im/appsintoss/29647/0fd5d3b5-8246-4fb0-bcbf-4413e472b066.png';

const icon = process.env.TOSS_BRAND_ICON_URL ?? DEFAULT_ICON_URL;

export default defineConfig({
  appName: 'sunkendefense',
  brand: {
    displayName: '선큰 식스웨이 디펜스',
    primaryColor: '#3182F6',
    icon,
  },
  web: {
    host: 'localhost',
    port: 4174,
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
