import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState, useRef, useCallback } from "react";
import { useFocusEffect } from "expo-router";
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
import AddOptionsSheet from "@/components/AddOptionsSheet";
import AddTransactionModal from "@/components/AddTransactionModal";
import DonutChart from "@/components/DonutChart";
import EditTransactionSheet from "@/components/EditTransactionSheet";
import MonthPickerModal from "@/components/MonthPickerModal";
import SMSParser from "@/components/SMSParser";
import SettingsModal from "@/components/SettingsModal";
import TransactionCard from "@/components/TransactionCard";
import TransactionFilter, { FilterMode, FilterTrigger, useTransactionFilter } from "@/components/TransactionFilter";
import TransactionDetailSheet from "@/components/TransactionDetailSheet";
import { Transaction, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const CHART_COLORS = ["#4CD964", "#5C6BC0", "#26C6DA", "#FFA726", "#EF5350", "#AB47BC"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions, accounts, deleteTransaction, updateTransaction, settings } = useData();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  
  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, [])
  );

  const [showOptions, setShowOptions] = useState(false);
  const [showSMS, setShowSMS] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);
  const { filter: txFilter, setFilter: setTxFilter, isExpanded, setIsExpanded } = useTransactionFilter();

  const selectedMonthName = new Date(selectedYear, selectedMonth, 1).toLocaleString("default", { month: "long" });

  const hour = now.getHours();
  let greetingText = "Good Evening !";
  if (hour < 12) greetingText = "Good Morning !";
  else if (hour < 17) greetingText = "Good Afternoon !";

  const thisMonth = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

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

  const segments = useMemo(() => {
    if (txFilter === "all") {
      return [
        { label: "Income", value: totalIncome, color: "#4CD964" },
        { label: "Spendings", value: totalSpend, color: "#EF5350" }
      ].filter(s => s.value > 0);
    }

    const map: Record<string, number> = {};
    thisMonth.forEach((t) => {
      if (t.type === txFilter) {
        map[t.category] = (map[t.category] ?? 0) + t.amount;
      }
    });

    const breakdown = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const debitColors = ["#EF5350", "#E57373", "#EF9A9A", "#FFCDD2", "#FFEBEE"];
    const creditColors = ["#4CD964", "#81C784", "#A5D6A7", "#C8E6C9", "#E8F5E9"];
    const palette = txFilter === "debit" ? debitColors : creditColors;

    return breakdown.map(([label, value], i) => ({
      label,
      value,
      color: palette[i % palette.length],
    }));
  }, [thisMonth, txFilter, totalSpend, totalIncome]);

  const recentTransactions = useMemo(() => {
    let filtered = thisMonth;
    if (txFilter !== "all") {
      filtered = thisMonth.filter((t) => t.type === txFilter);
    }
    return [...filtered].slice(0, 5);
  }, [thisMonth, txFilter]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const openAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowOptions(true);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topInset + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSettings(true);
            }}>
              <Feather name="settings" size={24} color="#4CD964" />
            </TouchableOpacity>
            <View>
              <Text style={[styles.monthLabel, { color: colors.foreground }]}>
                Hi {settings.name.split(' ')[0]}
              </Text>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
                {greetingText}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {/* Calendar button */}
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
            {/* Add button */}
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card }]}
              onPress={openAdd}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Donut Chart */}
        <View style={styles.chartSection}>
          <Text style={[styles.chartTitle, { color: colors.mutedForeground }]}>
            {txFilter === "debit" ? "Spent in" : txFilter === "credit" ? "Received in" : "Net Flow in"} {selectedMonthName}
          </Text>
          <DonutChart
            segments={segments}
            total={txFilter === "debit" ? Math.max(totalSpend, 1) : txFilter === "credit" ? Math.max(totalIncome, 1) : Math.max(totalSpend + totalIncome, 1)}
            centerLabel={
              txFilter === "debit" ? `${settings.currencySymbol}${totalSpend.toLocaleString("en-IN")}`
              : txFilter === "credit" ? `${settings.currencySymbol}${totalIncome.toLocaleString("en-IN")}`
              : `${(totalIncome - totalSpend) >= 0 ? "+" : "-"}${settings.currencySymbol}${Math.abs(totalIncome - totalSpend).toLocaleString("en-IN")}`
            }
            centerSub={selectedMonthName}
            size={210}
            strokeWidth={26}
          />

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Spendings</Text>
              <Text style={[styles.statValue, { color: "#EF5350" }]}>
                {settings.currencySymbol}{totalSpend.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Balance</Text>
              <Text style={[styles.statValue, { color: "#4CD964" }]}>
                {settings.currencySymbol}{totalBalance.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {selectedMonthName} transactions
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <FilterTrigger isExpanded={isExpanded} onPress={() => setIsExpanded(!isExpanded)} />
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={openAdd}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={14} color={colors.primaryForeground} />
                <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TransactionFilter filter={txFilter} onFilterChange={setTxFilter} isExpanded={isExpanded} />

          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No transactions for {selectedMonthName}. Add one via SMS or manually.
              </Text>
            </View>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onPress={() => setViewingTx(tx)}
                onDelete={() => deleteTransaction(tx.id)}
                onEdit={() => setEditingTx(tx)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Options Sheet */}
      <AddOptionsSheet
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        onSelectSMS={() => setShowSMS(true)}
        onSelectManual={() => setShowAddTx(true)}
      />

      {/* Month Picker */}
      <MonthPickerModal
        visible={showMonthPicker}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onSelect={(m, y) => {
          setSelectedMonth(m);
          setSelectedYear(y);
        }}
        onClose={() => setShowMonthPicker(false)}
      />

      {/* SMS Modal */}
      <Modal visible={showSMS} animationType="slide" presentationStyle="pageSheet">
        <SMSParser onClose={() => setShowSMS(false)} />
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
        <SettingsModal onClose={() => setShowSettings(false)} />
      </Modal>

      {/* Add Transaction Modal */}
      <Modal visible={showAddTx} animationType="slide" presentationStyle="pageSheet">
        <AddTransactionModal onClose={() => setShowAddTx(false)} />
      </Modal>

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
