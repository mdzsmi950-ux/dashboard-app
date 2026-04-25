import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maddie.dashboard',
  appName: 'Maddies Dashboard',
  webDir: 'out',
  server: {
    url: 'https://fianance-dashboard-five.vercel.app',
    cleartext: true
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;