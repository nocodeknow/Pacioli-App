import { defineConfig } from 'drizzle-kit';
export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: 'storage/pacioli.db',
    },
});
//# sourceMappingURL=drizzle.config.js.map