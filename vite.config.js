import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path' // Kailangan ito para sa path aliasing

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Pinapadali nito ang pag-import ng files
      // Imbes na ../../../lib/supabase, magiging "@/lib/supabase" na lang
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Para mas madaling i-debug sa mobile devices sa local network
    host: true, 
    port: 5173,
  }
})