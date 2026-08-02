// The ffmpeg-kit fork ships `platforms.ios: null` to keep use_native_modules!
// from linking its (dead) default `https` subspec. That also hides it from
// React Native codegen, so FFmpegKitReactNativeSpec.h is never generated and
// New Architecture builds fail. We patch the podspec's default_subspec to
// `full-gpl` (see patches/) and re-enable iOS autolinking here so codegen and
// pod linking both work. The binary pod (ffmpeg-kit-ios-full-gpl) is injected
// into the Podfile by our local config plugin.
module.exports = {
  dependencies: {
    '@nikhil-cephei/ffmpeg-kit-react-native': {
      platforms: {
        ios: {},
      },
    },
  },
};
