import { defineConfig } from '@apps-in-toss/web-framework/config';

const SUNKEN_DEFENSE_ICON =
  'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20128%20128%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23070d18%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%231c3154%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22beam%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23a5d4ff%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%235e8df6%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%22128%22%20height%3D%22128%22%20rx%3D%2228%22%20fill%3D%22url(%23bg)%22%2F%3E%3Cpath%20d%3D%22M22%2090%20L64%2030%20L106%2090%22%20fill%3D%22none%22%20stroke%3D%22url(%23beam)%22%20stroke-width%3D%2210%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3Ccircle%20cx%3D%2264%22%20cy%3D%2232%22%20r%3D%2211%22%20fill%3D%22%23f0ca77%22%2F%3E%3Ccircle%20cx%3D%2234%22%20cy%3D%2286%22%20r%3D%228%22%20fill%3D%22%238ff8bf%22%2F%3E%3Ccircle%20cx%3D%2294%22%20cy%3D%2286%22%20r%3D%228%22%20fill%3D%22%23ff8ca3%22%2F%3E%3Ccircle%20cx%3D%2264%22%20cy%3D%2292%22%20r%3D%229%22%20fill%3D%22%239ec9ff%22%2F%3E%3C%2Fsvg%3E';

export default defineConfig({
  appName: 'sunkendefense',
  brand: {
    displayName: '선큰 식스웨이 디펜스',
    primaryColor: '#3182F6',
    icon: SUNKEN_DEFENSE_ICON,
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
