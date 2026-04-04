import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: DataPoint[];
  maxValue?: number;
  height?: number;
}

export default function BarChart({ data, maxValue, height = 120 }: Props) {
  const colors = useColors();
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {data.map((item, i) => {
        const barHeight = Math.max(4, (item.value / max) * height);
        return (
          <View key={i} style={styles.barWrapper}>
            <Text style={[styles.value, { color: colors.mutedForeground }]}>
              {item.value > 999
                ? `${(item.value / 1000).toFixed(0)}k`
                : item.value.toString()}
            </Text>
            <View
              style={[
                styles.bar,
                {
                  height: barHeight,
                  backgroundColor: item.color ?? colors.primary,
                  width: 28,
                },
              ]}
            />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: "flex-end",
    paddingHorizontal: 4,
    gap: 8,
  },
  barWrapper: {
    alignItems: "center",
    gap: 4,
  },
  bar: {
    borderRadius: 6,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  value: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
});
