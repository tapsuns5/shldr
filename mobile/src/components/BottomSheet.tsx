import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from 'react-native-paper';

export function BottomSheet({
  visible,
  onDismiss,
  children,
  height = '88%',
  detents,
  initialDetentIndex,
  style,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode | ((close: () => void) => ReactNode);
  height?: DimensionValue;
  detents?: number[];
  initialDetentIndex?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const normalizedDetents = useMemo(
    () => detents?.length
      ? [...detents].map((d) => Math.min(Math.max(d, 0.25), 0.96)).sort((a, b) => a - b)
      : null,
    [detents],
  );

  // The sheet container is always sized to the max detent height.
  const maxDetent = normalizedDetents ? normalizedDetents[normalizedDetents.length - 1] : null;
  const sheetHeightPx = maxDetent ? maxDetent * windowHeight : (typeof height === 'number' ? height : windowHeight * 0.88);

  // Positioning model:
  // The sheet's top edge starts at `top: windowHeight` (fully off-screen below).
  // We use negative translateY to pull it up into view.
  // translateY = 0 → fully hidden (top of sheet at bottom of screen).
  // translateY = -sheetHeightPx → fully expanded (max detent visible).
  // translateY = -(detent * windowHeight) → that detent's visible height.
  //
  // Snap positions: for each detent, snap = -(detent * windowHeight).
  // Larger (more negative) = more visible. Smaller (closer to 0) = less visible.
  const snapPositions = useMemo(
    () => normalizedDetents
      ? normalizedDetents.map((d) => -(d * windowHeight))
      : [-sheetHeightPx],
    [normalizedDetents, windowHeight, sheetHeightPx],
  );
  // Ordered from most expanded (most negative) to least expanded (closest to 0).
  const orderedSnaps = useMemo(() => [...snapPositions].sort((a, b) => a - b), [snapPositions]);

  const initialIndex = Math.min(
    Math.max(initialDetentIndex ?? snapPositions.length - 1, 0),
    snapPositions.length - 1,
  );
  const initialSnap = snapPositions[initialIndex];

  const translateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);
  const currentSnap = useRef(initialSnap);
  const closing = useRef(false);

  const open = useCallback(() => {
    closing.current = false;
    currentSnap.current = initialSnap;
    translateY.setValue(0);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: initialSnap,
        useNativeDriver: true,
        stiffness: 260,
        damping: 28,
        mass: 0.85,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, initialSnap, translateY]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onDismiss();
      closing.current = false;
    });
  }, [backdropOpacity, onDismiss, translateY]);

  const snapTo = useCallback((snap: number) => {
    currentSnap.current = snap;
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: snap,
        useNativeDriver: true,
        stiffness: 320,
        damping: 28,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, translateY]);

  const lastPosition = useRef(initialSnap);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: () => {
      translateY.stopAnimation((value) => {
        dragStart.current = value;
        lastPosition.current = value;
      });
    },
    onPanResponderMove: (_, gesture) => {
      const mostExpanded = orderedSnaps[0];
      const newPos = Math.min(Math.max(dragStart.current + gesture.dy, mostExpanded), 0);
      translateY.setValue(newPos);
      lastPosition.current = newPos;
      // Fade backdrop as sheet moves toward dismissed (0).
      const leastExpanded = orderedSnaps[orderedSnaps.length - 1];
      const dismissRange = -leastExpanded;
      const currentVisible = -newPos;
      backdropOpacity.setValue(Math.min(1, currentVisible / dismissRange));
    },
    onPanResponderRelease: (_, gesture) => {
      const position = lastPosition.current;
      const leastExpanded = orderedSnaps[orderedSnaps.length - 1];
      const dragDistance = position - dragStart.current; // positive = dragged down

      // Dismiss if dragged far enough past the smallest detent
      if (position > leastExpanded + 140) {
        close();
        return;
      }
      // Dismiss on fast downward swipe with meaningful drag distance
      if (gesture.vy > 1.2 && dragDistance > 80) {
        close();
        return;
      }
      // Dismiss if dragged down more than 60% of the visible height
      if (dragDistance > (-leastExpanded) * 0.6) {
        close();
        return;
      }
      // Fast upward swipe (negative vy = moving up = toward expansion)
      if (gesture.vy < -0.75) {
        const prev = orderedSnaps.find((s) => s < position - 1);
        snapTo(prev ?? orderedSnaps[0]);
        return;
      }
      // Settle to nearest snap
      const nearest = orderedSnaps.reduce((best, s) =>
        Math.abs(s - position) < Math.abs(best - position) ? s : best
      );
      snapTo(nearest);
    },
    onPanResponderTerminate: () => snapTo(currentSnap.current),
  }), [backdropOpacity, close, orderedSnaps, snapTo, translateY, initialSnap]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onShow={open}
      onRequestClose={close}
    >
      <View style={styles.root} accessibilityViewIsModal>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close sheet" />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              top: windowHeight,
              height: sheetHeightPx,
              backgroundColor: theme.colors.surface,
              transform: [{ translateY }],
            },
            style,
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: theme.colors.outline }]} />
          </View>
          <View style={styles.content}>
            {typeof children === 'function' ? children(close) : children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.38)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    maxHeight: '96%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 16,
  },
  content: { flex: 1 },
  handleArea: { paddingTop: 12, paddingBottom: 15 },
  handle: { alignSelf: 'center', width: 46, height: 5, borderRadius: 3 },
});
