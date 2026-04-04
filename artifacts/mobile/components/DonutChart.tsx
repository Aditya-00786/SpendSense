import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface Segment {
  value: number;
  color: string;
  label: string;
}

interface Props {
  segments: Segment[];
  total: number;
  centerLabel?: string;
  centerSub?: string;
  size?: number;
  strokeWidth?: number;
}

export default function DonutChart({
  segments,
  total,
  centerLabel,
  centerSub,
  size = 220,
  strokeWidth = 28,
}: Props) {
  const colors = useColors();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, []);

  let offset = 0;
  const segmentData = segments.map((seg) => {
    const fraction = total > 0 ? seg.value / total : 0;
    const dashArray = circumference * fraction;
    const dashOffset = -offset * circumference;
    offset += fraction;
    return { ...seg, dashArray, dashOffset };
  });

  // Fill remaining with muted
  const remaining = total > 0 ? Math.max(0, total - segments.reduce((s, seg) => s + seg.value, 0)) : total;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.muted}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Segments */}
          {segmentData.map((seg, i) => (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${seg.dashArray} ${circumference}`}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="round"
            />
          ))}
        </G>
      </Svg>
      <View style={styles.center}>
        {centerLabel && (
          <Text style={[styles.centerLabel, { color: colors.foreground }]}>
            {centerLabel}
          </Text>
        )}
        {centerSub && (
          <Text style={[styles.centerSub, { color: colors.mutedForeground }]}>
            {centerSub}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  centerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
