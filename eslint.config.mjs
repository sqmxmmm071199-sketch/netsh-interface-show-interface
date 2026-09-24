import { globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  globalIgnores([".local/**", "data/**", "logs/**", "public/mock-uploads/**"]),
  ...nextVitals,
  ...nextTypescript,
];

export default eslintConfig;
