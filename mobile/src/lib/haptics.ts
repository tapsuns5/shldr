import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Lightweight haptics helpers.
 * All calls are no-ops on platforms without haptic support (e.g. web, Android < API 30).
 */

const available = Platform.OS === 'ios' || (Platform.OS === 'android' && Platform.Version >= 30);

/** Soft tap — used for taps on buttons, list rows, tab selection. */
export function selection() {
  if (!available) return;
  Haptics.selectionAsync().catch(() => {});
}

/** Light impact — used for sheet snap / drag settle. */
export function light() {
  if (!available) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Medium impact — used for sheet open/close. */
export function medium() {
  if (!available) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Rigid impact — used for dismissals. */
export function rigid() {
  if (!available) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
}
