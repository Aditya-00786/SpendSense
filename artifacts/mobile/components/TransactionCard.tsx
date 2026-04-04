import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Transaction } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  "Food & Dining": { icon: "coffee", color: "#FF6B6B" },
  Transport: { icon: "navigation", color: "#4ECDC4" },
  Shopping: { icon: "shopping-bag", color: "#A78BFA" },
  Entertainment: { icon: "star", color: "#F59E0B" },
  Utilities: { icon: "zap", color: "#60A5FA" },
  Healthcare: { icon: "heart", color: "#F472B6" },
  Education: { icon: "book", color: "#34D399" },
  Travel: { icon: "map", color: "#FB923C" },
  Transfer: { icon: "repeat", color: "#94A3B8" },
  Other: { icon: "circle", color: "#6B7280" },
};

interface Props {
  transaction: Transaction;
  onPress?: () => void;
}

export default function TransactionCard({ transaction, onPress }: Props) {
  const colors = useColors();
  const categoryInfo = CATEGORY_ICONS[transaction.category] ?? CATEGORY_ICONS["Other"];
  const isCredit = transaction.type === "credit";

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    } catch {
      return dateStr;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: categoryInfo.color + "20" }]}
      >
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
        <Text
          style={[
            styles.amount,
            { color: isCredit ? "#4CD964" : colors.foreground },
          ]}
        >
          {isCredit ? "+" : "-"}₹{transaction.amount.toLocaleString("en-IN")}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {formatDate(transaction.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
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
  info: {
    flex: 1,
  },
  merchant: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  category: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
