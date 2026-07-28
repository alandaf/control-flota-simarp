import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // El código usa imports ESM con extensión .js; mapea a los .ts al testear.
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
