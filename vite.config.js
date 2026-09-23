import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local-only React app. No backend, no env needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
