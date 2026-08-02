const fs = require('fs');
const path = require('path');
const { withDangerousMod, withProjectBuildGradle, withXcodeProject } = require('@expo/config-plugins');

// Replaces @nikhil-cephei/ffmpeg-kit-react-native's config plugin, which writes a
// subspec-only pod ("pod 'ffmpeg-kit-react-native/full-gpl'") that compiles no
// module sources. Here:
//  - the RN module pod comes from autolinking (re-enabled in react-native.config.js;
//    the podspec's default_subspec is patched to full-gpl via patch-package)
//  - only the self-hosted binary pod is injected into the Podfile
//  - the Android AAR flatDir repo is injected (copied from the upstream plugin)
//  - ENABLE_USER_SCRIPT_SANDBOXING is forced off (Xcode 15+ default breaks the
//    React Native bundle script)

const BINARY_POD =
  "  pod 'ffmpeg-kit-ios-full-gpl', :podspec => '../node_modules/@nikhil-cephei/ffmpeg-kit-react-native/ios/ffmpeg-kit-ios-full-gpl.podspec'";

const AAR_FLAT_DIR =
  '        flatDir { dirs "$rootDir/../node_modules/@nikhil-cephei/ffmpeg-kit-react-native/android/libs" }';

function withFFmpegBinaryPod(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (!contents.includes("pod 'ffmpeg-kit-ios-full-gpl'")) {
        contents = contents.replace(/^(\s*use_expo_modules!)/m, `${BINARY_POD}\n\n$1`);
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
}

function withFFmpegAndroidAar(config) {
  config = withProjectBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes('ffmpeg-kit-react-native/android/libs')) {
      contents = contents.replace(
        /(allprojects\s*\{[\s\S]*?repositories\s*\{)/,
        `$1\n${AAR_FLAT_DIR}`
      );
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const settingsPath = path.join(cfg.modRequest.platformProjectRoot, 'settings.gradle');
      if (fs.existsSync(settingsPath)) {
        let contents = fs.readFileSync(settingsPath, 'utf8');
        if (
          contents.includes('dependencyResolutionManagement') &&
          !contents.includes('ffmpeg-kit-react-native/android/libs')
        ) {
          contents = contents.replace(
            /(dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{)/,
            `$1\n${AAR_FLAT_DIR}`
          );
          fs.writeFileSync(settingsPath, contents);
        }
      }
      return cfg;
    },
  ]);
}

function withoutScriptSandboxing(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const buildSettings = configurations[key]?.buildSettings;
      if (buildSettings && buildSettings.ENABLE_USER_SCRIPT_SANDBOXING !== undefined) {
        buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      }
    }
    return cfg;
  });
}

module.exports = function withTubeVaultNative(config) {
  config = withFFmpegBinaryPod(config);
  config = withFFmpegAndroidAar(config);
  config = withoutScriptSandboxing(config);
  return config;
};
