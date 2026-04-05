import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState, useRef, useCallback } from "react";
import { useFocusEffect } from "expo-router";
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
import TransactionCard, { CATEGORY_ICONS } from "@/components/TransactionCard";
import CategoryMerchantDetailSheet from "@/components/CategoryMerchantDetailSheet";
import EditTransactionSheet from "@/components/EditTransactionSheet";
import TransactionDetailSheet from "@/components/TransactionDetailSheet";
import TransactionFilter, { FilterMode, FilterTrigger, useTransactionFilter } from "@/components/TransactionFilter";
import MonthPickerModal from "@/components/MonthPickerModal";
import { useData, Transaction } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const CHART_COLORS = ["#4CD964", "#5C6BC0", "#26C6DA", "#FFA726", "#EF5350", "#AB47BC", "#FF7043", "#26A69A"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ViewMode = "Transactions" | "Categories" | "Merchants";

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions, deleteTransaction, updateTransaction, settings } = useData();
  const [view, setView] = useState<ViewMode>("Categories");
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const { filter: txFilter, setFilter: setTxFilter, isExpanded, setIsExpanded } = useTransactionFilter();
  const [detailSelection, setDetailSelection] = useState<{ title: string; type: "category" | "merchant" } | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [])
  );

  const thisMonthTx = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }),
    [transactions, currentMonth, currentYear]
  );

  const totalSpend = useMemo(
    () => thisMonthTx.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0),
    [thisMonthTx]
  );
  const totalIncome = useMemo(
    () => thisMonthTx.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0),
    [thisMonthTx]
  );

  const detailTransactions = useMemo(() => {
    if (!detailSelection) return [];
    return thisMonthTx.filter((t) => {
      if (txFilter === "debit" && t.type !== "debit") return false;
      if (txFilter === "credit" && t.type !== "credit") return false;
      return detailSelection.type === "category" ? t.category === detailSelection.title : t.merchant === detailSelection.title;
    });
  }, [thisMonthTx, txFilter, detailSelection]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    thisMonthTx.forEach((t) => {
      if (txFilter === "debit" && t.type !== "debit") return;
      if (txFilter === "credit" && t.type !== "credit") return;
      map[t.category] = (map[t.category] ?? 0) + Math.abs(t.amount);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [thisMonthTx, txFilter]);

  const merchantBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    thisMonthTx.forEach((t) => {
      if (txFilter === "debit" && t.type !== "debit") return;
      if (txFilter === "credit" && t.type !== "credit") return;
      map[t.merchant] = (map[t.merchant] ?? 0) + Math.abs(t.amount);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [thisMonthTx, txFilter]);

  const monthlyData = useMemo(() => {
    const data: { label: string; value: number; color?: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();

      let debits = 0;
      let credits = 0;
      transactions.forEach((t) => {
        const td = new Date(t.date);
        if (td.getMonth() === m && td.getFullYear() === y) {
          if (t.type === "debit") debits += t.amount;
          if (t.type === "credit") credits += t.amount;
        }
      });

      let val = 0;
      let clr = undefined;

      if (txFilter === "debit") {
        val = debits;
      } else if (txFilter === "credit") {
        val = credits;
      } else {
        const net = credits - debits;
        val = Math.abs(net);
        if (!settings.showNetMultiColorTrends) {
          clr = net >= 0 ? "#4CD964" : "#EF5350";
        }
      }

      data.push({ label: MONTHS[m].substring(0, 3), value: val, color: clr });
    }
    return data;
  }, [transactions, currentMonth, currentYear, txFilter, settings.showNetMultiColorTrends]);

  const segments = useMemo(() => {
    if (txFilter === "all" && !settings.showNetCategoryBreakdown) {
      return [
        { label: "Income", value: totalIncome, color: "#4CD964" },
        { label: "Spendings", value: totalSpend, color: "#EF5350" }
      ].filter(s => s.value > 0);
    }

    const breakdown = categoryBreakdown;
    const palette = CHART_COLORS;

    return breakdown.map(([label, value], i) => ({
      label,
      value,
      color: palette[i % palette.length],
    }));
  }, [categoryBreakdown, txFilter, totalSpend, totalIncome, settings.showNetCategoryBreakdown]);

  const totalVolume = txFilter === "debit" ? totalSpend : txFilter === "credit" ? totalIncome : totalSpend + totalIncome;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingTop: topInset + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Text style={[styles.pageTitle, { color: colors.foreground, marginBottom: 0 }]}>Analytics</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <FilterTrigger isExpanded={isExpanded} onPress={() => setIsExpanded(!isExpanded)} size={40} />
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowMonthPicker(true);
              }}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <TransactionFilter filter={txFilter} onFilterChange={setTxFilter} isExpanded={isExpanded} allLabel="Net" />

        {/* Donut + Stats */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>
            {txFilter === "credit" ? "Received in" : txFilter === "debit" ? "Spent in" : "Net Flow in"} {MONTHS[currentMonth]}
          </Text>
          <View style={styles.donutRow}>
            <DonutChart
              segments={segments}
              total={Math.max(totalVolume, 1)}
              centerLabel={txFilter === "credit" ? `₹${(totalIncome / 1000).toFixed(1)}k` : txFilter === "debit" ? `₹${(totalSpend / 1000).toFixed(1)}k` : `₹${(((totalIncome - totalSpend) / 1000) >= 0 ? "+" : "") + ((totalIncome - totalSpend) / 1000).toFixed(1)}k`}
              centerSub={txFilter === "debit" && settings.showDebitIncomePct ? (totalIncome > 0 ? `${Math.round((totalSpend / totalIncome) * 100)}% of income` : "") : ""}
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
                    {Math.round((seg.value / Math.max(totalVolume, 1)) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.statRow}>
            {txFilter !== "credit" && (
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>- Spent</Text>
                <Text style={[styles.statValue, { color: "#EF5350" }]}>₹{totalSpend.toLocaleString("en-IN")}</Text>
              </View>
            )}
            {txFilter !== "debit" && (
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>+ Received</Text>
                <Text style={[styles.statValue, { color: "#4CD964" }]}>₹{totalIncome.toLocaleString("en-IN")}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Monthly Trend */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Trends by month</Text>
          <View style={styles.barChartWrapper}>
            <BarChart
              data={monthlyData.map((d, i) => ({ ...d, color: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }))}
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
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => setDetailSelection({ title: category, type: "category" })}
                >
                  <View style={[styles.catIcon, { backgroundColor: (CATEGORY_ICONS[category]?.color ?? CATEGORY_ICONS["Other"].color) + "25" }]}>
                    <Feather name={(CATEGORY_ICONS[category]?.icon ?? CATEGORY_ICONS["Other"].icon) as any} size={20} color={CATEGORY_ICONS[category]?.color ?? CATEGORY_ICONS["Other"].color} />
                  </View>
                  <View style={styles.catInfo}>
                    <View style={styles.catHeader}>
                      <Text style={[styles.catName, { color: colors.foreground }]}>{category}</Text>
                      <View style={styles.catAmounts}>
                        <Text style={[styles.catAmount, { color: colors.foreground }]}>
                          ₹{amount.toLocaleString("en-IN")}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
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
                onPress={() => setViewingTx(tx)}
                onDelete={() => deleteTransaction(tx.id)}
                onEdit={() => setEditingTx(tx)}
              />
            ))}
          </View>
        )}

        {/* Merchants View */}
        {view === "Merchants" && (
          <View>
            {merchantBreakdown.map(([merchant, amount], i) => (
              <TouchableOpacity
                key={merchant}
                style={[styles.categoryRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => setDetailSelection({ title: merchant, type: "merchant" })}
              >
                <View style={[styles.catIcon, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + "25" }]}>
                  <Text style={{ color: CHART_COLORS[i % CHART_COLORS.length], fontSize: 20, fontFamily: "Inter_700Bold", textTransform: "uppercase" }}>{merchant.charAt(0)}</Text>
                </View>
                <View style={styles.catInfo}>
                  <View style={styles.catHeader}>
                    <Text style={[styles.catName, { color: colors.foreground }]}>{merchant}</Text>
                    <Text style={[styles.catAmount, { color: colors.foreground }]}>
                      ₹{amount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View style={[styles.relativeBar, { backgroundColor: colors.muted }]}>
                    <View
                      style={[
                        styles.relativeFill,
                        {
                          width: `${(amount / (merchantBreakdown[0]?.[1] ?? 1)) * 100}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        },
                      ]}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Transaction Sheet */}
      {editingTx && (
        <EditTransactionSheet
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={(updated) => updateTransaction(updated)}
        />
      )}

      {/* View Transaction Details Sheet */}
      <TransactionDetailSheet
        transaction={viewingTx}
        onClose={() => setViewingTx(null)}
      />

      <CategoryMerchantDetailSheet
        visible={!!detailSelection}
        title={detailSelection?.title || ""}
        type={detailSelection?.type || "category"}
        transactions={detailTransactions}
        filterMode={txFilter}
        onClose={() => setDetailSelection(null)}
        onDelete={deleteTransaction}
        onEdit={setEditingTx}
      />

      <MonthPickerModal
        visible={showMonthPicker}
        selectedMonth={currentMonth}
        selectedYear={currentYear}
        onSelect={(m, y) => {
          setCurrentMonth(m);
          setCurrentYear(y);
        }}
        onClose={() => setShowMonthPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 20 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
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
  relativeBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  relativeFill: { height: 4, borderRadius: 2 },
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
