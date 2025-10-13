import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.{ts,js}', '**/*.spec.{ts,js}'],
    exclude: ['node_modules', 'dist', '.replit', 'client'],
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
});