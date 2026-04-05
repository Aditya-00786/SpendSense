import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, withTiming, Easing, LinearTransition } from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";

export type FilterMode = "all" | "debit" | "credit";

// Export the centralized state and cleanup hook globally natively
export function useTransactionFilter(defaultFilter: FilterMode = "all") {
  const [filter, setFilter] = useState<FilterMode>(defaultFilter);
  const [isExpanded, setIsExpanded] = useState(false);

  const mounted = React.useRef(true);
  React.useEffect(() => {
    return () => { mounted.current = false; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isFocused = true;
      return () => {
        isFocused = false;
        setTimeout(() => {
          if (mounted.current && !isFocused) {
            setIsExpanded(false);
            setFilter(defaultFilter);
          }
        }, 300);
      };
    }, [defaultFilter])
  );

  return { filter, setFilter, isExpanded, setIsExpanded };
}

// Icon Trigger specifically exposed for inline placements correctly
interface FilterTriggerProps {
  isExpanded: boolean;
  onPress: () => void;
  size?: number;
}

export function FilterTrigger({ isExpanded, onPress, size = 34 }: FilterTriggerProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[
        { width: size, height: size, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
        { backgroundColor: isExpanded ? colors.background : colors.card, borderColor: colors.border }
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <Feather name="filter" color={isExpanded ? colors.foreground : colors.primary} size={16} />
    </TouchableOpacity>
  );
}

// Drops internal states utilizing standardized array parameters gracefully natively
interface TransactionFilterProps {
  filter: FilterMode;
  onFilterChange: (filter: FilterMode) => void;
  isExpanded: boolean;
  allLabel?: string;
}

export default function TransactionFilter({ filter, onFilterChange, isExpanded, allLabel = "All" }: TransactionFilterProps) {
  const colors = useColors();

  const options: { label: string; value: FilterMode }[] = [
    { label: allLabel, value: "all" },
    { label: "Debit", value: "debit" },
    { label: "Credit", value: "credit" }
  ];

  const getActiveColor = (val: FilterMode) => {
    if (val === "debit") return "#EF5350";
    if (val === "credit") return "#4CD964";
    return colors.foreground;
  };

  const animatedWrapper = useAnimatedStyle(() => {
    return {
      height: withTiming(isExpanded ? 38 : 0, { duration: 350, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      opacity: withTiming(isExpanded ? 1 : 0, { duration: 250 }),
      marginBottom: withTiming(isExpanded ? 8 : 0, { duration: 350, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
    };
  }, [isExpanded]);

  return (
    <Animated.View style={[animatedWrapper, { overflow: "hidden", borderRadius: 10 }]}>
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {options.map((opt) => {
          const isActive = filter === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => {
                if (!isActive) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onFilterChange(opt.value);
                }
              }}
              activeOpacity={0.8}
              style={[
                styles.segment, 
                isActive && { 
                  backgroundColor: colors.background,
                  shadowColor: getActiveColor(opt.value),
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: colors.border
                }
              ]}
            >
              <Text style={[styles.label, { color: isActive ? getActiveColor(opt.value) : colors.mutedForeground, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 38,
    flexDirection: "row",
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  label: {
    fontSize: 12,
    zIndex: 1,
    letterSpacing: 0.2
  }
});
