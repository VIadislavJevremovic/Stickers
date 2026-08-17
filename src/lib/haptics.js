// A light haptic "tap" for stepper / toggle interactions.
//
// Uses the Vibration API, which works on Android Chrome but is NOT
// supported by iOS Safari — there it silently no-ops. Kept feature-detected
// so it never throws on any platform (or in Node during tests).
export function tap() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(8);
  }
}
