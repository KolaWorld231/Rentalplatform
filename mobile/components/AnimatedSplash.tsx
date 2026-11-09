import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import {
  useFonts,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Manrope_500Medium } from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { brand as BRAND } from '../lib/brand';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const ROOF_D =
  'M100 232 L256 104 L412 232';
const DIGIT_2_D =
  'M213.35 420L114.37 420L114.37 396.48L153.57 356.10Q165.14 344.15 171.11 337.19Q177.09 330.23 179.35 325.53Q181.60 320.82 181.60 316.32Q181.60 308.28 176.41 303.67Q171.21 299.07 163.37 299.07Q155.34 299.07 149.06 303.67Q142.79 308.28 139.85 317.69L113.39 309.06Q115.74 297.70 123.19 289.27Q130.64 280.84 141.22 276.23Q151.81 271.63 163.37 271.63Q177.88 271.63 188.85 276.72Q199.83 281.82 205.90 291.03Q211.98 300.24 211.98 312.59Q211.98 320.43 209.24 327.98Q206.49 335.52 200.91 343.27Q195.32 351.01 186.50 360.02L152.98 394.52L213.35 394.52L213.35 420';
const DIGIT_3_D =
  'M276.19 422.35Q264.04 422.35 253.06 417.75Q242.08 413.14 234.44 404.71Q226.80 396.28 224.25 384.92L251.10 375.90Q254.43 385.31 260.90 390.11Q267.37 394.91 276.19 394.91Q283.44 394.91 288.63 392.17Q293.83 389.42 296.77 384.43Q299.71 379.43 299.71 372.76Q299.71 366.10 296.87 361.30Q294.02 356.50 288.83 353.85Q283.64 351.20 276.19 351.20Q271.88 351.20 267.56 352.18Q263.25 353.16 259.72 354.93L252.67 340.23L290.10 299.46L233.07 299.46L233.07 273.98L324.21 273.98L324.21 297.50L295.98 329.64Q303.43 330.82 309.70 334.15Q319.31 339.64 324.70 349.24Q330.09 358.85 330.09 371.59Q330.09 386.09 323.03 397.66Q315.98 409.22 303.82 415.79Q291.67 422.35 276.19 422.35';
const DIGIT_1_D =
  'M398.61 420L368.23 420L368.23 299.66L339.81 299.66L339.81 273.98L398.61 273.98';

const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const SPRING = { damping: 14, stiffness: 160, mass: 1 };

interface Props {
  isAppReady: boolean;
  onFinish: () => void;
}

export default function AnimatedSplash({ isAppReady, onFinish }: Props) {
  const { width, height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_800ExtraBold,
    Manrope_500Medium,
  });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const started = useRef(false);
  const exited = useRef(false);
  const [minTimeReached, setMinTimeReached] = useState(false);
  const [timelineDone, setTimelineDone] = useState(false);

  const markWidth = Math.min(width * 0.34, 180);

  // Shared values
  const roofOffset = useSharedValue(404);
  const d2Y = useSharedValue(24);
  const d2Op = useSharedValue(0);
  const d3Y = useSharedValue(24);
  const d3Op = useSharedValue(0);
  const d1Y = useSharedValue(24);
  const d1Op = useSharedValue(0);
  const markScale = useSharedValue(1);
  const markTY = useSharedValue(0);
  const wordOp = useSharedValue(0);
  const wordTY = useSharedValue(14);
  const tagOp = useSharedValue(0);
  const tagTY = useSharedValue(6);
  const containerOp = useSharedValue(reduceMotion ? 0 : 1);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const hideNative = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const onLayout = useCallback(() => {
    if (!laidOut) {
      setLaidOut(true);
      hideNative();
    }
  }, [laidOut, hideNative]);

  const startExit = useCallback(() => {
    if (exited.current) return;
    exited.current = true;
    // Mutating a shared value's `.value` is Reanimated's own supported
    // API, not a React state/props mutation -- the lint rule below
    // doesn't know that, same false positive as the reduceMotion branch.
    // eslint-disable-next-line react-hooks/immutability
    containerOp.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) }, () => {
      runOnJS(onFinish)();
    });
  }, [containerOp, onFinish]);

  // Force exit at 4000 ms absolute
  useEffect(() => {
    if (!fontsLoaded || !laidOut || started.current) return;
    started.current = true;

    if (reduceMotion) {
      // eslint-disable-next-line react-hooks/immutability -- see startExit's comment
      containerOp.value = withTiming(1, { duration: 300 }, () => {
        runOnJS(setMinTimeReached)(true);
        runOnJS(setTimelineDone)(true);
      });
      // Brief hold then rely on ready check; safety at 4000.
      // withDelay operates on shared-value animations, not plain JS
      // callbacks -- `withDelay(ms, runOnJS(fn)())` calls fn()
      // immediately (the function call happens before withDelay even
      // runs) and throws the real delay away, so a plain timer is used
      // for this and the other two JS-side markers below.
      const capTimer = setTimeout(startExit, 4000);
      return () => clearTimeout(capTimer);
    }

    // Normal timeline
    roofOffset.value = withDelay(
      150,
      withTiming(0, { duration: 600, easing: EASE })
    );

    d2Y.value = withDelay(600, withSpring(0, SPRING));
    d2Op.value = withDelay(600, withSpring(1, SPRING));
    d3Y.value = withDelay(690, withSpring(0, SPRING));
    d3Op.value = withDelay(690, withSpring(1, SPRING));
    d1Y.value = withDelay(780, withSpring(0, SPRING));
    d1Op.value = withDelay(780, withSpring(1, SPRING));

    markScale.value = withDelay(
      1100,
      withSequence(
        withTiming(1.04, { duration: 125, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 125, easing: Easing.inOut(Easing.quad) })
      )
    );

    markScale.value = withDelay(
      1350,
      withTiming(0.82, { duration: 500, easing: EASE })
    );
    markTY.value = withDelay(
      1350,
      withTiming(-36, { duration: 500, easing: EASE })
    );

    wordOp.value = withDelay(1350, withTiming(1, { duration: 500, easing: EASE }));
    wordTY.value = withDelay(1350, withTiming(0, { duration: 500, easing: EASE }));

    tagOp.value = withDelay(1850, withTiming(1, { duration: 300, easing: EASE }));
    tagTY.value = withDelay(1850, withTiming(0, { duration: 300, easing: EASE }));

    // Min hold / timeline-complete / absolute-cap markers are plain JS
    // callbacks, not shared-value animations -- see the reduceMotion
    // branch's comment above for why withDelay can't be used here.
    const minTimer = setTimeout(() => setMinTimeReached(true), 2400);
    const doneTimer = setTimeout(() => setTimelineDone(true), 2150);
    const capTimer = setTimeout(startExit, 4000);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(doneTimer);
      clearTimeout(capTimer);
    };
  }, [
    fontsLoaded,
    laidOut,
    reduceMotion,
    roofOffset,
    d2Y,
    d2Op,
    d3Y,
    d3Op,
    d1Y,
    d1Op,
    markScale,
    markTY,
    wordOp,
    wordTY,
    tagOp,
    tagTY,
    containerOp,
    startExit,
  ]);

  // Exit when both min time and app ready (or reduce-motion equivalent)
  useEffect(() => {
    if ((minTimeReached && isAppReady && timelineDone) || (reduceMotion && minTimeReached && isAppReady)) {
      startExit();
    }
  }, [minTimeReached, isAppReady, timelineDone, reduceMotion, startExit]);

  const roofProps = useAnimatedProps(() => ({
    strokeDashoffset: roofOffset.value,
  }));

  const d2Props = useAnimatedProps(() => ({
    opacity: d2Op.value,
    transform: [{ translateY: d2Y.value }],
  }));
  const d3Props = useAnimatedProps(() => ({
    opacity: d3Op.value,
    transform: [{ translateY: d3Y.value }],
  }));
  const d1Props = useAnimatedProps(() => ({
    opacity: d1Op.value,
    transform: [{ translateY: d1Y.value }],
  }));

  const markStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: markTY.value },
      { scale: markScale.value },
    ],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOp.value,
    transform: [{ translateY: wordTY.value }],
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOp.value,
    transform: [{ translateY: tagTY.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOp.value,
  }));

  if (!fontsLoaded) {
    return <View style={[styles.fill, { backgroundColor: BRAND.colors.splash }]} />;
  }

  const offsetUp = height * 0.04;

  return (
    <Animated.View
      style={[styles.fill, { backgroundColor: BRAND.colors.splash }, containerStyle]}
      onLayout={onLayout}
    >
      <View style={[styles.center, { transform: [{ translateY: -offsetUp }] }]}>
        <Animated.View style={markStyle}>
          <Svg width={markWidth} height={markWidth} viewBox="0 0 512 512">
            <AnimatedPath
              d={ROOF_D}
              fill="none"
              stroke={BRAND.colors.onSplash}
              strokeWidth={38}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={404}
              animatedProps={roofProps}
            />
            <AnimatedPath d={DIGIT_2_D} fill={BRAND.colors.onSplash} animatedProps={d2Props} />
            <AnimatedPath d={DIGIT_3_D} fill={BRAND.colors.onSplash} animatedProps={d3Props} />
            <AnimatedPath d={DIGIT_1_D} fill={BRAND.colors.onSplash} animatedProps={d1Props} />
          </Svg>
        </Animated.View>

        <Animated.Text
          style={[
            styles.wordmark,
            { color: BRAND.colors.onSplash, fontFamily: 'PlusJakartaSans_800ExtraBold' },
            wordStyle,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {BRAND.name}
        </Animated.Text>

        <Animated.Text
          style={[
            styles.tagline,
            {
              color: BRAND.colors.onSplash,
              opacity: 0.92,
              fontFamily: 'Manrope_500Medium',
            },
            tagStyle,
          ]}
        >
          {BRAND.tagline}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  wordmark: {
    fontSize: 40,
    letterSpacing: -0.8, // ≈ -0.02em at 40pt
    marginTop: 18,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    marginTop: 6,
    textAlign: 'center',
  },
});
