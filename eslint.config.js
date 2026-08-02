const expoConfig = require('eslint-config-expo/flat');
const i18next = require('eslint-plugin-i18next');

module.exports = [
  ...expoConfig,
  {
    files: ['app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    plugins: { i18next },
    rules: {
      // User-facing copy must come from i18n catalogs. Structural/identifier
      // attributes (route names, modal presentation, colors, …) are exempt.
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            exclude: [
              'name',
              'href',
              'presentation',
              'style',
              'thumbShape',
              'testID',
              'returnKeyType',
              'keyboardType',
              'keyboardShouldPersistTaps',
              'keyboardDismissMode',
              'autoCapitalize',
              'animationType',
              'resizeMode',
              'contentFit',
              'minimumTrackTintColor',
              'maximumTrackTintColor',
              'color',
              'tintColor',
              'behavior',
              'baseUrl',
              'androidLayerType',
              'source',
              'pointerEvents',
              'tint',
            ],
          },
          'object-properties': {
            exclude: ['presentation', 'backgroundColor', 'color', 'fontWeight', 'textTransform', 'textAlign'],
          },
          callees: {
            // navigation, lookups, and local helpers take identifiers, not copy
            exclude: ['push', 'replace', 'navigate', 't', 'require', 'enqueueAs', 'chip'],
          },
        },
      ],
    },
  },
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'ios/**', 'android/**'],
  },
];
