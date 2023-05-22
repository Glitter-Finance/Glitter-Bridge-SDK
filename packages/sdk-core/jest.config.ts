module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    resolveJsonModule: true,
    testTimeout: 30000,
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json',
        },
    },
    "types": [
        "node",
        "jest",
        "assert"
    ],
};

console.log(module.exports.globals['ts-jest'].tsconfig);
