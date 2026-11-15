import * as React from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import { CinematicCarouselItemProps, CinematicCarouselProps } from "./types";
import { BlurView } from "expo-blur";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  Extrapolation,
  useAnimatedProps,
  useAnimatedReaction,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const AnimatedBlurView = Animated.createAnimatedComponent(
  BlurView as unknown as React.ComponentType<import("expo-blur").BlurViewProps>,
);
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_IOS = Platform.OS === "ios";

const ITEM_WIDTH = SCREEN_WIDTH * 0.75;
const SPACING = 20;
const SIDE_SPACING = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

const CarouselItem = <ItemT,>({
  item,
  index,
  scrollX,
  renderItem,
  itemWidth = ITEM_WIDTH,
  spacing = SPACING,
}: CinematicCarouselItemProps<ItemT>) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * itemWidth,
      index * itemWidth,
      (index + 1) * itemWidth,
    ];

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP,
    );

    const rotateY = interpolate(
      scrollX.value,
      inputRange,
      [50, 0, -50],
      Extrapolation.CLAMP,
    );

    const skewY = interpolate(
      scrollX.value,
      inputRange,
      [5, 0.5, -5],
      Extrapolation.CLAMP,
    );

    const scaleY = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolation.CLAMP,
    );

    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [spacing, 0, -spacing],
      Extrapolation.CLAMP,
    );

    const blurIntensity = interpolate(
      scrollX.value,
      inputRange,
      [5, 0, 5],
      Extrapolation.CLAMP,
    );

    return {
      filter: IS_IOS ? [] : [{ blur: blurIntensity }],
      transform: [
        { perspective: 400 },
        { rotateY: `${rotateY}deg` },
        { skewY: `${skewY}deg` },
        { translateX },
        { scaleY },
      ],
      opacity,
    };
  });

  const animatedBlurProps = useAnimatedProps(() => {
    const inputRange = [
      (index - 1) * itemWidth,
      index * itemWidth,
      (index + 1) * itemWidth,
    ];

    const blurIntensity = interpolate(
      scrollX.value,
      inputRange,
      [25, 0, 25],
      Extrapolation.CLAMP,
    );

    return {
      intensity: blurIntensity,
    };
  });

  return (
    <Animated.View
      style={[styles.itemContainer, animatedStyle, { width: itemWidth }]}
    >
      <View style={styles.contentWrapper}>
        {renderItem({ item, index })}

        {Platform.OS === "ios" && (
          <AnimatedBlurView
            style={[StyleSheet.absoluteFill, styles.blurOverlay]}
            tint="regular"
            animatedProps={animatedBlurProps}
          />
        )}
      </View>
    </Animated.View>
  );
};

const CinematicCarousel = <ItemT,>({
  data,
  renderItem,
  horizontalSpacing = SIDE_SPACING,
  itemWidth = ITEM_WIDTH,
  spacing = SPACING,
  onIndexChange,
}: CinematicCarouselProps<ItemT>) => {
  const scrollX = useSharedValue(0);

  useAnimatedReaction(
    () => Math.round(scrollX.value / itemWidth),
    (current, previous) => {
      if (previous !== null && current !== previous && onIndexChange) {
        scheduleOnRN(onIndexChange, current);
      }
    },
    [itemWidth],
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <Animated.FlatList
      data={data}
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyExtractor={(_, index) => index.toString()}
      horizontal
      pagingEnabled
      snapToInterval={itemWidth}
      decelerationRate="fast"
      contentContainerStyle={{
        paddingHorizontal: horizontalSpacing,
        paddingVertical: 12,
      }}
      style={{
        flexGrow: 0,
      }}
      renderItem={({ item, index }) => (
        <CarouselItem
          item={item}
          index={index}
          scrollX={scrollX}
          renderItem={renderItem}
          itemWidth={itemWidth}
          spacing={spacing}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  contentWrapper: {
    borderRadius: 30,
    backgroundColor: "transparent",
  },
  blurOverlay: {
    borderRadius: 30,
    overflow: "hidden",
  },
});

export {
  CinematicCarousel,
  CinematicCarouselItemProps,
  CinematicCarouselProps,
};
