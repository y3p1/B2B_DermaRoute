module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/backend/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  testPathIgnorePatterns: ["/node_modules/", "/.server-dist/", "/.next/"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
};
