import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AddTransactionModal from "@/components/AddTransactionModal";
import DonutChart from "@/components/DonutChart";
import SMSParser from "@/components/SMSParser";
import TransactionCard from "@/components/TransactionCard";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const CHART_COLORS = ["#4CD964", "#5C6BC0", "#26C6DA", "#FFA726", "#EF5350", "#AB47BC"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions, accounts } = useData();
  const [showSMS, setShowSMS] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);

  const currentMonth = new Date().toLocaleString("default", { month: "long" });

  const thisMonth = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [transactions]);

  const totalSpend = useMemo(
    () => thisMonth.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0),
    [thisMonth]
  );
  const totalIncome = useMemo(
    () => thisMonth.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0),
    [thisMonth]
  );
  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + a.balance, 0),
    [accounts]
  );

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    thisMonth.filter((t) => t.type === "debit").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [thisMonth]);

  const segments = categoryBreakdown.map(([label, value], i) => ({
    label,
    value,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const recentTransactions = [...transactions].slice(0, 5);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topInset + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              Hi Yash
            </Text>
            <Text style={[styles.monthLabel, { color: colors.foreground }]}>
              Money manager › {currentMonth}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSMS(true);
              }}
              activeOpacity={0.7}
            >
              <Feather name="message-square" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAddTx(true);
              }}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Donut Chart */}
        <View style={styles.chartSection}>
          <Text style={[styles.chartTitle, { color: colors.mutedForeground }]}>
            Spent in {currentMonth}
          </Text>
          <DonutChart
            segments={segments}
            total={Math.max(totalIncome, totalSpend)}
            centerLabel={`₹${(totalSpend / 1000).toFixed(0)}k`}
            centerSub={totalIncome > 0 ? `${Math.round((totalSpend / totalIncome) * 100)}% of income` : ""}
            size={210}
            strokeWidth={26}
          />

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Income</Text>
              <Text style={[styles.statValue, { color: "#4CD964" }]}>
                ₹{totalIncome.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Budget</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>₹30,000</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Balance</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                ₹{totalBalance.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent transactions
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddTx(true)}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color={colors.primaryForeground} />
              <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No transactions yet. Parse an SMS or add manually.
              </Text>
            </View>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))
          )}
        </View>
      </ScrollView>

      {/* SMS Modal */}
      <Modal visible={showSMS} animationType="slide" presentationStyle="pageSheet">
        <SMSParser onClose={() => setShowSMS(false)} />
      </Modal>

      {/* Add Transaction Modal */}
      <Modal visible={showAddTx} animationType="slide" presentationStyle="pageSheet">
        <AddTransactionModal onClose={() => setShowAddTx(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  greeting: { fontSize: 16, fontFamily: "Inter_500Medium", marginBottom: 2 },
  monthLabel: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chartSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  chartTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    width: "100%",
  },
  stat: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statDivider: { width: 1, height: 30 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
