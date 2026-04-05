import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Account, Transaction, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import MonthPickerModal from "./MonthPickerModal";
import TransactionCard from "./TransactionCard";
import TransactionDetailSheet from "./TransactionDetailSheet";
import TransactionFilter, { FilterMode, FilterTrigger, useTransactionFilter } from "./TransactionFilter";

interface Props {
  account: Account | null;
  transactions: Transaction[];
  onClose: () => void;
}

export default function StatementSheet({ account, transactions, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, deleteTransaction } = useData();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);
  const { filter: txFilter, setFilter: setTxFilter, isExpanded, setIsExpanded } = useTransactionFilter();

  React.useEffect(() => {
    if (!account) {
      setTxFilter("all");
      setIsExpanded(false);
    }
  }, [account, setTxFilter, setIsExpanded]);

  const selectedMonthName = new Date(selectedYear, selectedMonth, 1).toLocaleString("default", { month: "long" });

  const statementData = useMemo(() => {
    if (!account) return { list: [], credits: 0, debits: 0, count: 0 };
    const suffix = account.accountNumber.slice(-4);

    const monthTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      const isRightMonth = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      const isRightAccount = t.accountNumber.endsWith(suffix) || t.accountNumber === account.accountNumber;
      return isRightMonth && isRightAccount && (txFilter === "all" || t.type === txFilter);
    });

    return monthTxs.reduce(
      (acc, t) => {
        if (t.type === "credit") acc.credits += t.amount;
        else acc.debits += t.amount;
        acc.list.push(t);
        acc.count++;
        return acc;
      },
      { list: [] as Transaction[], credits: 0, debits: 0, count: 0 }
    );
  }, [account, transactions, selectedMonth, selectedYear, txFilter]);

  return (
    <Modal visible={!!account} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: 36 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Statement</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          
          <Text style={[styles.subText, { color: colors.mutedForeground, paddingHorizontal: 20 }]}>
            {account?.bank} • xx{account?.accountNumber?.slice(-4)}
          </Text>

          {/* Month Picker Trigger */}
          <TouchableOpacity 
            style={[styles.monthSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowMonthPicker(true)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Feather name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.monthText, { color: colors.foreground }]}>
                {selectedMonthName} {selectedYear}
              </Text>
            </View>
            <Feather name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Stats Bar */}
          <View style={styles.statsContainer}>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
               <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Credits In</Text>
               <Text style={[styles.statValue, { color: "#4CD964" }]}>+{settings.currencySymbol}{statementData.credits.toLocaleString("en-IN")}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
               <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Debits Out</Text>
               <Text style={[styles.statValue, { color: "#EF5350" }]}>-{settings.currencySymbol}{statementData.debits.toLocaleString("en-IN")}</Text>
            </View>
          </View>
          
          {/* Transaction Array List */}
          <View style={styles.listContainer}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginBottom: 0 }]}>
                {statementData.count} Recorded Transactions
              </Text>
              <FilterTrigger isExpanded={isExpanded} onPress={() => setIsExpanded(!isExpanded)} />
            </View>

            <TransactionFilter filter={txFilter} onFilterChange={setTxFilter} isExpanded={isExpanded} />

            {statementData.list.length === 0 ? (
               <View style={styles.emptyState}>
                 <Feather name="inbox" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
                 <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions found purely for this period.</Text>
               </View>
            ) : (
              statementData.list.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  onPress={() => setViewingTx(tx)}
                  onDelete={() => deleteTransaction(tx.id)}
                />
              ))
            )}
          </View>

        </ScrollView>

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

        <TransactionDetailSheet
          transaction={viewingTx}
          onClose={() => setViewingTx(null)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subText: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 4, marginBottom: 24 },
  
  monthSelector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 20, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  monthText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  
  statsContainer: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  statBox: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  statLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },

  listContainer: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 },

  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" }
});
