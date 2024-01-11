import type { JestConfigWithTsJest } from 'ts-jest'

/**
 * Konfigurasjon basert på: https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
 */
const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/default-esm',
  roots: [
    "src"
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
}

export default jestConfig
