const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

/** Where npm actually installed @expo/cli (nested under expo in workspaces). */
function resolveExpoCliRoot() {
  const candidates = [
    path.join(monorepoRoot, "node_modules", "expo", "node_modules", "@expo", "cli"),
    path.join(projectRoot, "node_modules", "expo", "node_modules", "@expo", "cli"),
    path.join(projectRoot, "node_modules", "@expo", "cli"),
    path.join(monorepoRoot, "node_modules", "@expo", "cli"),
  ];
  for (const dir of candidates) {
    if (
      fs.existsSync(path.join(dir, "build", "metro-require", "require.js"))
    ) {
      return dir;
    }
  }
  return candidates[0];
}

const expoCliRoot = resolveExpoCliRoot();

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot, expoCliRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@expo/cli": resolveExpoCliRoot(),
};

module.exports = config;
