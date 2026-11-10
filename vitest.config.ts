import { defineConfig } from 'vitest/config';

// I test girano in Node, senza i plugin dell'interfaccia (React, Tailwind, PWA).
// Sono test veri solo i file *.spec.ts: un'asserzione che fallisce fa fallire il comando.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
