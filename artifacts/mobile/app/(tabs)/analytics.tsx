import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BarChart from "@/components/BarChart";
import DonutChart from "@/components/DonutChart";
import TransactionCard from "@/components/TransactionCard";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const CHART_COLORS = ["#4CD964", "#5C6BC0", "#26C6DA", "#FFA726", "#EF5350", "#AB47BC", "#FF7043", "#26A69A"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ViewMode = "Transactions" | "Categories" | "Merchants";

const CATEGORY_BUDGETS: Record<string, number> = {
  "Food & Dining": 5000,
  Transport: 3000,
  Shopping: 3000,
  Entertainment: 6000,
  Utilities: 2000,
  Healthcare: 2000,
  Education: 2000,
  Travel: 3500,
  Transfer: 0,
  Other: 2000,
};

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions, deleteTransaction } = useData();
  const [view, setView] = useState<ViewMode>("Categories");
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthTx = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }),
    [transactions]
  );

  const totalSpend = useMemo(
    () => thisMonthTx.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0),
    [thisMonthTx]
  );
  const totalIncome = useMemo(
    () => thisMonthTx.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0),
    [thisMonthTx]
  );

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    thisMonthTx.filter((t) => t.type === "debit").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [thisMonthTx]);

  const merchantBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    thisMonthTx.filter((t) => t.type === "debit").forEach((t) => {
      map[t.merchant] = (map[t.merchant] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [thisMonthTx]);

  const monthlyData = useMemo(() => {
    const data: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const spend = transactions
        .filter((t) => {
          const td = new Date(t.date);
          return td.getMonth() === m && td.getFullYear() === y && t.type === "debit";
        })
        .reduce((s, t) => s + t.amount, 0);
      data.push({ label: MONTHS[m], value: spend });
    }
    return data;
  }, [transactions]);

  const segments = categoryBreakdown.slice(0, 6).map(([label, value], i) => ({
    label,
    value,
    color: CHART_COLORS[i],
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topInset + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Analytics</Text>

        {/* Donut + Stats */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>
            Spent in {MONTHS[currentMonth]}
          </Text>
          <View style={styles.donutRow}>
            <DonutChart
              segments={segments}
              total={Math.max(totalIncome, totalSpend, 1)}
              centerLabel={`₹${(totalSpend / 1000).toFixed(1)}k`}
              centerSub={totalIncome > 0 ? `${Math.round((totalSpend / totalIncome) * 100)}%` : ""}
              size={180}
              strokeWidth={22}
            />
            <View style={styles.legend}>
              {segments.map((seg, i) => (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                  <Text style={[styles.legendText, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {seg.label}
                  </Text>
                  <Text style={[styles.legendPct, { color: colors.foreground }]}>
                    {Math.round((seg.value / totalSpend) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>+ Income</Text>
              <Text style={[styles.statValue, { color: "#4CD964" }]}>₹{totalIncome.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>— Budget</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>₹30,000</Text>
            </View>
          </View>
        </View>

        {/* Monthly Trend */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Trends by month</Text>
          <View style={styles.barChartWrapper}>
            <BarChart
              data={monthlyData.map((d, i) => ({ ...d, color: CHART_COLORS[i % CHART_COLORS.length] }))}
              height={100}
            />
          </View>
        </View>

        {/* View Toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.card }]}>
          {(["Transactions", "Categories", "Merchants"] as ViewMode[]).map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.toggleBtn, view === v && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
              onPress={() => setView(v)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, { color: view === v ? colors.primary : colors.mutedForeground }]}>
                {v}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories View */}
        {view === "Categories" && (
          <View>
            {categoryBreakdown.map(([category, amount], i) => {
              const budget = CATEGORY_BUDGETS[category] ?? 2000;
              const pct = budget > 0 ? Math.min(amount / budget, 1) : 0;
              const overBudget = budget > 0 && amount > budget;
              return (
                <View
                  key={category}
                  style={[styles.categoryRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.catIcon, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + "25" }]}>
                    <View style={[styles.catDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                  </View>
                  <View style={styles.catInfo}>
                    <View style={styles.catHeader}>
                      <Text style={[styles.catName, { color: colors.foreground }]}>{category}</Text>
                      <View style={styles.catAmounts}>
                        <Text style={[styles.catAmount, { color: overBudget ? "#EF5350" : colors.foreground }]}>
                          ₹{amount.toLocaleString("en-IN")}
                        </Text>
                        {overBudget && (
                          <Feather name="alert-circle" size={14} color="#EF5350" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                    </View>
                    {budget > 0 && (
                      <>
                        <View style={[styles.budgetBar, { backgroundColor: colors.muted }]}>
                          <View
                            style={[
                              styles.budgetFill,
                              {
                                width: `${pct * 100}%`,
                                backgroundColor: overBudget ? "#EF5350" : CHART_COLORS[i % CHART_COLORS.length],
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.budgetLabel, { color: colors.mutedForeground }]}>
                          Budget: ₹{budget.toLocaleString("en-IN")}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Transactions View */}
        {view === "Transactions" && (
          <View>
            {thisMonthTx.slice(0, 20).map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onDelete={() => deleteTransaction(tx.id)}
              />
            ))}
          </View>
        )}

        {/* Merchants View */}
        {view === "Merchants" && (
          <View>
            {merchantBreakdown.map(([merchant, amount], i) => (
              <View
                key={merchant}
                style={[styles.categoryRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.catIcon, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + "25" }]}>
                  <View style={[styles.catDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                </View>
                <View style={styles.catInfo}>
                  <View style={styles.catHeader}>
                    <Text style={[styles.catName, { color: colors.foreground }]}>{merchant}</Text>
                    <Text style={[styles.catAmount, { color: colors.foreground }]}>
                      ₹{amount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View style={[styles.budgetBar, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.budgetFill,
                        {
                          width: `${(amount / (merchantBreakdown[0]?.[1] ?? 1)) * 100}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 20 },
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  legend: { flex: 1 },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },
  legendPct: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statRow: { flexDirection: "row", marginTop: 16, gap: 12 },
  statItem: {
    flex: 1,
    backgroundColor: "#FFFFFF10",
    borderRadius: 12,
    padding: 12,
  },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  barChartWrapper: { height: 130, justifyContent: "flex-end" },
  toggleRow: {
    flexDirection: "row",
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catInfo: { flex: 1 },
  catHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  catName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  catAmounts: { flexDirection: "row", alignItems: "center" },
  catAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  budgetBar: { height: 4, borderRadius: 2, marginBottom: 4, overflow: "hidden" },
  budgetFill: { height: 4, borderRadius: 2 },
  budgetLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  txInfo: { flex: 1 },
  txMerchant: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  txCat: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  txAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
