/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/generated/prisma/client$': '<rootDir>/tests/__mocks__/generatedPrismaClient.ts',
    '^../../src/generated/prisma/client$': '<rootDir>/tests/__mocks__/generatedPrismaClient.ts',
    '^\\./generated/prisma/client$': '<rootDir>/tests/__mocks__/generatedPrismaClient.ts',
    '^@scalar/express-api-reference$': '<rootDir>/tests/__mocks__/scalarMock.cjs',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
