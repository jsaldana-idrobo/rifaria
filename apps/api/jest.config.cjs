/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: String.raw`.*\.spec\.ts$`,
  transform: {
    [String.raw`^.+\.(t|j)s$`]: 'ts-jest'
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node'
};
