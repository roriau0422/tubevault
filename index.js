// Polyfills must load before anything touches youtubei.js (arch doc §6.1).
import 'react-native-url-polyfill/auto';
import 'web-streams-polyfill/polyfill';
import 'text-encoding-polyfill';
// event-target-shim exports classes but does not install globals, so do it here.
import { EventTarget, Event } from 'event-target-shim';

if (!global.EventTarget) global.EventTarget = EventTarget;
if (!global.Event) global.Event = Event;
if (!global.CustomEvent) {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.detail = options.detail ?? null;
    }
  };
}
if (__DEV__) {
  console.log(
    '[polyfills] EventTarget:', typeof global.EventTarget,
    'CustomEvent:', typeof global.CustomEvent,
    'ReadableStream:', typeof global.ReadableStream,
    'TextDecoder:', typeof global.TextDecoder
  );
}

const { runMigrations } = require('./src/db/ddl');
runMigrations();

const { getLanguageSync } = require('./src/db/repositories/settingsRepo');
const { initI18n } = require('./src/i18n');
initI18n(getLanguageSync());

const TrackPlayer = require('@rntp/player').default;
const { Event: PlayerEvent } = require('@rntp/player');
TrackPlayer.registerBackgroundEventHandler(() => (event) => {
  const { usePlayerStore } = require('./src/stores/playerStore');
  if (event.type === PlayerEvent.RemoteNext) usePlayerStore.getState().next();
  else if (event.type === PlayerEvent.RemotePrevious) usePlayerStore.getState().previous();
});

require('expo-router/entry');
