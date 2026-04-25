import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maddie.dashboardapp',
  appName: 'Dashboard',
  webDir: 'out',
  server: {
    url: 'https://dashboard-app-beige-one.vercel.app',
    cleartext: true
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;