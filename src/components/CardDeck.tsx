import { useCallback, useMemo } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Carousel3D } from "@/components/ui/organisms/3d-carousel";
import { CircularCarousel } from "@/components/ui/molecules/circular-carousel";
import { CinematicCarousel } from "@/components/ui/molecules/cinematic-carousel";
import { FlingStack } from "@/components/ui/molecules/filling-stack";
import { AddCard, CARD_HEIGHT, HabitCard } from "./HabitCard";
import { haptic } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import type { CardStyle, Habit } from "@/store/useStore";

export type DeckItem = { id: string; habit?: Habit };

type Props = {
  items: DeckItem[];
  cardStyle: CardStyle;
  today: Date;
  initialIndex: number;
  onOpen: (h: Habit) => void;
  onEdit: (h: Habit) => void;
  onUrge: (h: Habit) => void;
  onAdd: () => void;
  onIndexChange: (i: number) => void;
};

/** Space the 3D drum needs: the front face is magnified by perspective. */
const PERSPECTIVE = 6;
const FRONT_SCALE = PERSPECTIVE / (PERSPECTIVE - 1);

export function CardDeck({ items, cardStyle, today, initialIndex, onOpen, onEdit, onUrge, onAdd, onIndexChange }: Props) {
  const { width: SW } = useWindowDimensions();
  const { isDark } = useTheme();

  const handleIndex = useCallback(
    (i: number) => {
      haptic.select();
      onIndexChange(i);
    },
    [onIndexChange],
  );

  const renderCard = useCallback(
    (item: DeckItem, width: number) =>
      item.habit ? (
        <HabitCard habit={item.habit} width={width} today={today} onOpen={onOpen} onEdit={onEdit} onUrge={onUrge} />
      ) : (
        <AddCard width={width} onPress={onAdd} />
      ),
    [today, onOpen, onEdit, onUrge, onAdd],
  );

  const start = Math.min(initialIndex, Math.max(items.length - 1, 0));

  if (cardStyle === "cylinder") {
    // The front face is drawn FRONT_SCALE× larger than its layout box, so size the box down.
    const visualWidth = Math.min(SW * 0.86, 356);
    const itemWidth = Math.round(visualWidth / FRONT_SCALE);
    return (
      <Carousel3D
        // geometry depends on the number of faces, so remount when it changes
        key={items.length}
        data={items}
        keyExtractor={(it) => it.id}
        itemWidth={itemWidth}
        itemHeight={CARD_HEIGHT}
        radius={itemWidth * 0.95}
        perspectiveFactor={PERSPECTIVE}
        gap={0}
        borderRadius={32}
        backOpacity={0}
        initialIndex={start}
        onIndexChange={handleIndex}
        renderItem={({ item }) => renderCard(item, itemWidth)}
      />
    );
  }

  if (cardStyle === "stack") {
    const cardWidth = Math.min(SW - 44, 380);
    return (
      <FlingStack
        data={items}
        visibleCount={4}
        cardWidth={cardWidth}
        cardHeight={CARD_HEIGHT}
        useBlur
        blurIntensity={20}
        tint={isDark ? "dark" : "light"}
        wrapperStyle={{ height: CARD_HEIGHT + 96, paddingTop: 70 }}
        onIndexChange={handleIndex}
        renderItem={({ item }) => renderCard(item, cardWidth)}
      />
    );
  }

  if (cardStyle === "cinematic") {
    const itemWidth = Math.min(SW * 0.84, 360);
    return (
      <CinematicCarousel
        data={items}
        itemWidth={itemWidth}
        horizontalSpacing={(SW - itemWidth) / 2}
        spacing={16}
        onIndexChange={handleIndex}
        renderItem={({ item }) => renderCard(item, itemWidth - 10)}
      />
    );
  }

  const itemWidth = Math.min(SW * 0.76, 340);
  return (
    <CircularCarousel
      data={items}
      itemWidth={itemWidth}
      spacing={10}
      horizontalSpacing={(SW - itemWidth) / 2}
      onIndexChange={handleIndex}
      renderItem={({ item }) => renderCard(item, itemWidth)}
    />
  );
}

function Dot({ active }: { active: boolean }) {
  const { c } = useTheme();
  const style = useAnimatedStyle(() => ({
    width: withSpring(active ? 20 : 6, { damping: 16, stiffness: 260 }),
    opacity: withSpring(active ? 1 : 0.45),
  }));
  return <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: active ? c.ink : c.ink3 }, style]} />;
}

export function PageDots({ count, index }: { count: number; index: number }) {
  const dots = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  if (count < 2) return <View style={{ height: 6 }} />;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
      {dots.map((i) => (
        <Dot key={i} active={i === index} />
      ))}
    </View>
  );
}
