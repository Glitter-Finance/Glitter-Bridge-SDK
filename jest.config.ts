/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    projects: [
        //"./packages/examples/core-example/jest.config.ts",
        //  "./packages/examples/web-example/React/jest.config.ts",
        "./packages/sdk-core/jest.config.ts",
        // "./packages/sdk-web/jest.config.ts",
        "./packages/sdk-server/jest.config.ts",
        // "./packages/tests/jest.config.ts"
    ],
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.base.json',
        },
    }
};
