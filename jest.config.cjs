const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/shared/$1",
    "^@/(.*)$": "<rootDir>/client/src/$1",
  },
};