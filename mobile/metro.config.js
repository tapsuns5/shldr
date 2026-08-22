// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// packages/* live one level up (outside mobile/), linked in via the pnpm
// workspace declared in mobile/pnpm-workspace.yaml. Metro only watches the
// project root by default, so the shared packages need to be added explicitly.
const sharedPackagesRoot = path.resolve(projectRoot, '..', 'packages');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedPackagesRoot];
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
