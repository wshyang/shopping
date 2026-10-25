import tseslint from "typescript-eslint";
export default tseslint.config(
  { ignores: [".wxt/**", ".output/**", "coverage/**", "node_modules/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "max-lines-per-function": [
        "error",
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      "max-params": ["error", 3],
      "max-depth": ["error", 3],
      "max-lines": ["error", 800],
    },
  },
  { files: ["tests/**/*.ts"], rules: { "max-lines-per-function": "off" } },
);
