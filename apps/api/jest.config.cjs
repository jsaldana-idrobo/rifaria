/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: String.raw`.*\.spec\.ts$`,
  moduleNameMapper: {
    '^@rifaria/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    [String.raw`^.+\.(t|j)s$`]: 'ts-jest'
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node'
};
