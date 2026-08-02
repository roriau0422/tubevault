// Polyfills must load before anything touches youtubei.js (arch doc §6.1).
import 'react-native-url-polyfill/auto';
import 'web-streams-polyfill/polyfill';
import 'text-encoding-polyfill';
// event-target-shim exports classes but does NOT install globals — do it manually.
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

// setCommands routes Next/Previous through JS so they step the whole queue. In
// the foreground the store's addEventListener handles them, but once the UI is
// backgrounded — the lock screen case — Android delivers them to a headless
// task instead. RNTP does not register that task itself; without this the only
// symptom is "No task registered for key TrackPlayerServiceBridge" and dead
// lock-screen skip buttons. Must run before the router entry.
// registerBackgroundEventHandler lives in the package's DEFAULT export (the
// whole ./audio namespace); only interfaces/events/hooks are re-exported by
// name, so destructuring it off the root yields undefined.
// `Event` above is event-target-shim's, hence the alias.
const TrackPlayer = require('@rntp/player').default;
const { Event: PlayerEvent } = require('@rntp/player');
TrackPlayer.registerBackgroundEventHandler(() => (event) => {
  // Required lazily: pulls in the video engine, which has no business loading
  // during startup just to register a handler.
  const { usePlayerStore } = require('./src/stores/playerStore');
  if (event.type === PlayerEvent.RemoteNext) usePlayerStore.getState().next();
  else if (event.type === PlayerEvent.RemotePrevious) usePlayerStore.getState().previous();
});

require('expo-router/entry');
