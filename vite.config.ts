import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// https://vite.dev/config/
// Las URLs de los backends se configuran en .env (VITE_AUTH_API_URL y VITE_API_URL);
// ambos servicios locales exponen CORS, por lo que no se necesita proxy de desarrollo.
export default defineConfig({
  plugins: [tailwind(), react()],
})
