import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: ["prisma/generated/**", ".next/**", "node_modules/**", "test-results/**", "playwright-report/**"],
  },
  ...nextVitals,
];

export default config;

