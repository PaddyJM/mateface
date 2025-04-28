module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/api'],
    testMatch: ['**/*.test.ts'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    extensionsToTreatAsEsm: ['.ts'],
    preset: 'ts-jest/presets/default-esm',
    testEnvironmentOptions: {
        extensionsToTreatAsEsm: ['.ts'],
    },
}
