import { forwardRef, useImperativeHandle } from "react";
import { Dimensions, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { PropertyCardContent } from "./PropertyCardContent";
import type { PropertyWithCover } from "../../lib/properties/service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const FLING_DISTANCE = SCREEN_WIDTH * 1.5;

export type SwipeDirection = "left" | "right";

export interface SwipeCardHandle {
  flingOff: (direction: SwipeDirection) => void;
}

interface SwipeCardProps {
  property: PropertyWithCover;
  active: boolean;
  onSwiped: (direction: SwipeDirection) => void;
}

// Top card only (active=true) gets the pan gesture; stacked cards behind it
// render the same content statically, no GestureDetector. SwipeDeck also
// drives this via the imperative `flingOff` handle so the on-screen Yes/No
// buttons trigger the exact same animated-completion path as a finger swipe.
export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { property, active, onSwiped },
  ref,
) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  function complete(direction: SwipeDirection) {
    onSwiped(direction);
  }

  function flingOff(direction: SwipeDirection) {
    const toX = direction === "right" ? FLING_DISTANCE : -FLING_DISTANCE;
    translateX.value = withTiming(toX, { duration: 220 }, (finished) => {
      if (finished) runOnJS(complete)(direction);
    });
  }

  useImperativeHandle(ref, () => ({ flingOff }));

  const pan = Gesture.Pan()
    .enabled(active)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const direction: SwipeDirection = e.translationX > 0 ? "right" : "left";
        const toX = direction === "right" ? FLING_DISTANCE : -FLING_DISTANCE;
        translateX.value = withTiming(toX, { duration: 220 }, (finished) => {
          if (finished) runOnJS(complete)(direction);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotateZ: `${interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-15, 0, 15], Extrapolation.CLAMP)}deg`,
      },
    ],
  }));

  const yesStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const noStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const card = (
    <Animated.View style={cardStyle}>
      <PropertyCardContent property={property} />
      <Animated.View
        style={yesStyle}
        className="absolute left-4 top-4 -rotate-12 rounded-md border-2 border-success-500 bg-success-100 px-3 py-1"
      >
        <Text className="font-display-bold text-lg text-success-500">YES</Text>
      </Animated.View>
      <Animated.View
        style={noStyle}
        className="absolute right-4 top-4 rotate-12 rounded-md border-2 border-error-500 bg-error-100 px-3 py-1"
      >
        <Text className="font-display-bold text-lg text-error-500">NO</Text>
      </Animated.View>
    </Animated.View>
  );

  if (!active) return card;

  return <GestureDetector gesture={pan}>{card}</GestureDetector>;
});
