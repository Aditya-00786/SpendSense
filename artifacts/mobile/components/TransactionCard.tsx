import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Transaction } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  "Food & Dining": { icon: "coffee", color: "#FF6B6B" },
  Transport: { icon: "navigation", color: "#4ECDC4" },
  Shopping: { icon: "shopping-bag", color: "#A78BFA" },
  Entertainment: { icon: "star", color: "#F59E0B" },
  Utilities: { icon: "zap", color: "#60A5FA" },
  Healthcare: { icon: "heart", color: "#F472B6" },
  Education: { icon: "book", color: "#34D399" },
  Travel: { icon: "map", color: "#FB923C" },
  Transfer: { icon: "repeat", color: "#94A3B8" },
  Salary: { icon: "briefcase", color: "#4CD964" },
  Interest: { icon: "percent", color: "#4CD964" },
  "Fixed Deposit": { icon: "lock", color: "#34D399" },
  Investments: { icon: "trending-up", color: "#26C6DA" },
  Dividend: { icon: "dollar-sign", color: "#FFA726" },
  "Rental Income": { icon: "home", color: "#AB47BC" },
  Refund: { icon: "corner-down-left", color: "#4ECDC4" },
  "Other Income": { icon: "plus-circle", color: "#94A3B8" },
  Other: { icon: "circle", color: "#6B7280" },
};

interface Props {
  transaction: Transaction;
  onPress?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export default function TransactionCard({ transaction, onPress, onDelete, onEdit }: Props) {
  const colors = useColors();
  const categoryInfo = CATEGORY_ICONS[transaction.category] ?? CATEGORY_ICONS["Other"];
  const isCredit = transaction.type === "credit";
  const swipeableRef = useRef<Swipeable>(null);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    } catch {
      return dateStr;
    }
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    swipeableRef.current?.close();
    onDelete?.();
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    swipeableRef.current?.close();
    onEdit?.();
  };

  // Swipe LEFT → Delete (red)
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, -60, 0],
      outputRange: [1, 0.9, 0.8],
      extrapolate: "clamp",
    });
    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.7, 1],
    });
    return (
      <Animated.View style={[styles.actionWrapper, styles.deleteAction, { opacity }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Feather name="trash-2" size={20} color="#fff" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  };

  // Swipe RIGHT → Edit (blue)
  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 60, 100],
      outputRange: [0.8, 0.9, 1],
      extrapolate: "clamp",
    });
    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.7, 1],
    });
    return (
      <Animated.View style={[styles.actionWrapper, styles.editAction, { opacity }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleEdit} activeOpacity={0.8}>
            <Feather name="edit-2" size={20} color="#fff" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={onDelete ? renderRightActions : undefined}
      renderLeftActions={onEdit ? renderLeftActions : undefined}
      rightThreshold={80}
      leftThreshold={80}
      onSwipeableOpen={(direction) => {
        if (direction === "left") {
          // Fully swiped left → auto delete
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setTimeout(() => onDelete?.(), 200);
        }
      }}
      friction={2}
      overshootFriction={8}
      containerStyle={styles.swipeContainer}
    >
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: categoryInfo.color + "20" }]}>
          <Feather name={categoryInfo.icon as any} size={20} color={categoryInfo.color} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.merchant, { color: colors.foreground }]} numberOfLines={1}>
            {transaction.merchant}
          </Text>
          <Text style={[styles.category, { color: colors.mutedForeground }]}>
            {transaction.category} · {transaction.bank}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: isCredit ? "#4CD964" : colors.foreground }]}>
            {isCredit ? "+" : "-"}₹{transaction.amount.toLocaleString("en-IN")}
          </Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(transaction.date)}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  info: { flex: 1 },
  merchant: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  category: { fontSize: 12, fontFamily: "Inter_400Regular" },
  right: { alignItems: "flex-end" },
  amount: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionWrapper: {
    width: 90,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
  },
  deleteAction: {
    backgroundColor: "#EF5350",
    marginLeft: 8,
  },
  editAction: {
    backgroundColor: "#5C6BC0",
    marginRight: 8,
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
