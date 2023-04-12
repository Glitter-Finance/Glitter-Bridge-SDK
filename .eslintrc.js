module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: [
      "./packages/examples/tsconfig.json",
      "./packages/sdk-core/tsconfig.json",
      "./packages/sdk-web/tsconfig.json",
      "./packages/sdk-server/tsconfig.json",
      "./packages/tests/tsconfig.json",
      "./tsconfig.base.json",
    ],
    tsconfigRootDir: __dirname,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  plugins: ["@typescript-eslint", "import"],
  env: {
    es6: true,
    node: true,
  },
  rules: {
    //Main rules
    "import/extensions": ["warn", "ignorePackages"],
    "import/no-named-as-default": "warn",
    "import/no-cycle": "warn",
    "import/no-unused-modules": "warn",
    "import/no-deprecated": "warn",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "no-redeclare": "off",
    "no-shadow": "off",
    "@typescript-eslint/no-shadow": "warn",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-empty-pattern": "off",
    "no-empty": ["error", { allowEmptyCatch: true }],
    "@typescript-eslint/restrict-template-expressions": "off",
    "import/extensions": ["off"],
    "@typescript-eslint/no-misused-promises": [
      "error",
      { checksVoidReturn: false },
    ],
    "prefer-const": "warn",

    //Formatting Rules
    "no-multiple-empty-lines": ["warn", { max: 1, maxEOF: 0, maxBOF: 0 }],
    indent: ["warn", 4, { SwitchCase: 1 }],
    "comma-spacing": ["warn", { before: false, after: true }],
    "no-multi-spaces": "warn",
    "object-curly-spacing": ["warn", "never"],
    "array-bracket-spacing": ["warn", "never"],
    "space-in-parens": ["warn", "never"],
  },
  ignorePatterns: ["dist", "node_modules", "scripts", ".eslintrc.js"],
};
