import React, { useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, Animated, PanResponder, StyleSheet, Platform } from 'react-native';

// A lightweight pinch-zoom + pan container using Animated + PanResponder (no extra deps)
// Props: children, minScale, maxScale, initialScale, style
function ZoomableView({
  children,
  minScale = 0.5,
  maxScale = 3,
  initialScale = 1,
  style,
}, ref) {
  const scale = useRef(new Animated.Value(initialScale)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const lastScaleRef = useRef(initialScale);
  const lastTranslateRef = useRef({ x: 0, y: 0 });
  const pinchDistanceRef = useRef(null);
  const pinchCenterRef = useRef({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });

  const getDistance = (touches) => {
    const [a, b] = touches;
    const dx = a.pageX - b.pageX;
    const dy = a.pageY - b.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches || [];
        if (touches.length === 2) {
          pinchDistanceRef.current = getDistance(touches);
          pinchCenterRef.current = {
            x: (touches[0].pageX + touches[1].pageX) / 2,
            y: (touches[0].pageY + touches[1].pageY) / 2,
          };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches || [];
        if (touches.length === 2) {
          // Pinch to zoom
          const dist = getDistance(touches);
          if (pinchDistanceRef.current) {
            const factor = dist / pinchDistanceRef.current;
            let nextScale = Math.max(minScale, Math.min(maxScale, lastScaleRef.current * factor));
            // Zoom around the center of the container to keep context
            const cx = size.w ? size.w / 2 : 0;
            const cy = size.h ? size.h / 2 : 0;
            const curScale = lastScaleRef.current;
            const curTx = lastTranslateRef.current.x;
            const curTy = lastTranslateRef.current.y;
            const wx = (cx - curTx) / curScale;
            const wy = (cy - curTy) / curScale;
            const nextTx = cx - wx * nextScale;
            const nextTy = cy - wy * nextScale;
            scale.setValue(nextScale);
            translateX.setValue(nextTx);
            translateY.setValue(nextTy);
          }
        } else if (touches.length === 1) {
          // Pan
          const nextX = lastTranslateRef.current.x + gestureState.dx;
          const nextY = lastTranslateRef.current.y + gestureState.dy;
          translateX.setValue(nextX);
          translateY.setValue(nextY);
        }
      },
      onPanResponderRelease: () => {
        // Persist last transforms
        scale.stopAnimation((v) => {
          const clamped = Math.max(minScale, Math.min(maxScale, v));
          lastScaleRef.current = clamped;
          scale.setValue(clamped);
        });
        translateX.stopAnimation((v) => {
          lastTranslateRef.current.x = v;
        });
        translateY.stopAnimation((v) => {
          lastTranslateRef.current.y = v;
        });
        pinchDistanceRef.current = null;
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        pinchDistanceRef.current = null;
      },
    })
  ).current;

  const animatedStyle = {
    transform: [{ translateX }, { translateY }, { scale }],
  };

  // --- Wheel / trackpad zoom support (web) ---
  const onWheel = useCallback((e) => {
    // Only supported on web; in native this handler is ignored
    if (Platform.OS !== 'web') return;
    // Prevent page scroll when hovering over zoomable view
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // Read current values synchronously
    let curScale = lastScaleRef.current;
    let curTx = lastTranslateRef.current.x;
    let curTy = lastTranslateRef.current.y;

    // DeltaY>0 => zoom out; <0 => zoom in
    const delta = e.deltaY || 0;
    const zoomIntensity = 0.0018; // tune trackpad sensitivity
    const factor = Math.exp(-delta * zoomIntensity);
    let nextScale = Math.max(minScale, Math.min(maxScale, curScale * factor));
    if (nextScale === curScale) return;

    // Zoom around the pointer position. We need container-local coords.
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left; // pointer x within element
    const py = e.clientY - rect.top;  // pointer y within element

    // Compute the world coordinates before scale change
    // worldPoint = (screenPoint - translate) / scale
    const wx = (px - curTx) / curScale;
    const wy = (py - curTy) / curScale;

    // After scaling, translate so the same world point stays under the cursor:
    // px = wx * nextScale + nextTx  => nextTx = px - wx * nextScale
    const nextTx = px - wx * nextScale;
    const nextTy = py - wy * nextScale;

    lastScaleRef.current = nextScale;
    lastTranslateRef.current = { x: nextTx, y: nextTy };
    scale.setValue(nextScale);
    translateX.setValue(nextTx);
    translateY.setValue(nextTy);
  }, [maxScale, minScale, scale, translateX, translateY]);

  // Optional: double-click to zoom in a step
  const onDoubleClick = useCallback((e) => {
    if (Platform.OS !== 'web') return;
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let curScale = lastScaleRef.current;
    let curTx = lastTranslateRef.current.x;
    let curTy = lastTranslateRef.current.y;
    const step = 1.2;
    let nextScale = Math.max(minScale, Math.min(maxScale, curScale * step));
    const wx = (px - curTx) / curScale;
    const wy = (py - curTy) / curScale;
    const nextTx = px - wx * nextScale;
    const nextTy = py - wy * nextScale;
    lastScaleRef.current = nextScale;
    lastTranslateRef.current = { x: nextTx, y: nextTy };
    scale.setValue(nextScale);
    translateX.setValue(nextTx);
    translateY.setValue(nextTy);
  }, [maxScale, minScale, scale, translateX, translateY]);

  // Imperative API to allow parent to set transforms programmatically
  useImperativeHandle(ref, () => ({
    setTransform: ({ nextScale, nextTranslateX, nextTranslateY, animate = true, duration = 250 } = {}) => {
      let s = typeof nextScale === 'number' ? nextScale : lastScaleRef.current;
      let tx = typeof nextTranslateX === 'number' ? nextTranslateX : lastTranslateRef.current.x;
      let ty = typeof nextTranslateY === 'number' ? nextTranslateY : lastTranslateRef.current.y;
      s = Math.max(minScale, Math.min(maxScale, s));
      if (animate) {
        Animated.timing(scale, { toValue: s, duration, useNativeDriver: true }).start(({ finished }) => {
          if (finished) lastScaleRef.current = s;
        });
        Animated.timing(translateX, { toValue: tx, duration, useNativeDriver: true }).start(({ finished }) => {
          if (finished) lastTranslateRef.current.x = tx;
        });
        Animated.timing(translateY, { toValue: ty, duration, useNativeDriver: true }).start(({ finished }) => {
          if (finished) lastTranslateRef.current.y = ty;
        });
      } else {
        scale.setValue(s);
        translateX.setValue(tx);
        translateY.setValue(ty);
        lastScaleRef.current = s;
        lastTranslateRef.current = { x: tx, y: ty };
      }
    },
    getSize: () => ({ ...size }),
    getState: () => ({ scale: lastScaleRef.current, translate: { ...lastTranslateRef.current } }),
  }), [maxScale, minScale, scale, translateX, translateY, size]);

  return (
    <View
      style={[styles.container, style]}
      {...panResponder.panHandlers}
      // The following events are only effective on web
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ w: width, h: height });
      }}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </View>
  );
}

export default React.forwardRef(ZoomableView);

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
