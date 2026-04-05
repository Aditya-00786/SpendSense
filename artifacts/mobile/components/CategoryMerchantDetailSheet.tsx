import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Transaction, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import TransactionCard from "./TransactionCard";
import TransactionDetailSheet from "./TransactionDetailSheet";
import { FilterMode } from "./TransactionFilter";

interface Props {
  visible: boolean;
  title: string;
  type: "category" | "merchant";
  transactions: Transaction[];
  filterMode: FilterMode;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
}

export default function CategoryMerchantDetailSheet({ visible, title, type, transactions, filterMode, onClose, onDelete, onEdit }: Props) {
  const colors = useColors();
  const { settings } = useData();

  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);

  const stats = useMemo(() => {
    let credits = 0;
    let debits = 0;
    transactions.forEach(t => {
      if (t.type === "credit") credits += t.amount;
      if (t.type === "debit") debits += t.amount;
    });
    return { credits, debits };
  }, [transactions]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: 36 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          <Text style={[styles.subText, { color: colors.mutedForeground, paddingHorizontal: 20 }]}>
            {type === "category" ? "Category breakdown" : "Merchant history"}
          </Text>

          {/* Stats Bar */}
          <View style={styles.statsContainer}>
            {filterMode === "all" ? (
              <>
                <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Spent</Text>
                  <Text style={[styles.statValue, { color: "#EF5350" }]}>-{settings.currencySymbol}{stats.debits.toLocaleString("en-IN")}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Received</Text>
                  <Text style={[styles.statValue, { color: "#4CD964" }]}>+{settings.currencySymbol}{stats.credits.toLocaleString("en-IN")}</Text>
                </View>
              </>
            ) : filterMode === "debit" ? (
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Debits Out</Text>
                <Text style={[styles.statValue, { color: "#EF5350" }]}>{settings.currencySymbol}{stats.debits.toLocaleString("en-IN")}</Text>
              </View>
            ) : (
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Credits In</Text>
                <Text style={[styles.statValue, { color: "#4CD964" }]}>{settings.currencySymbol}{stats.credits.toLocaleString("en-IN")}</Text>
              </View>
            )}
          </View>

          <View style={styles.listContainer}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {transactions.length} Transactions
            </Text>

            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={32} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No records found.</Text>
              </View>
            ) : (
              transactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  onPress={() => setViewingTx(tx)}
                  onDelete={() => onDelete(tx.id)}
                  onEdit={() => onEdit(tx)}
                />
              ))
            )}
          </View>

        </ScrollView>

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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", flex: 1 },
  subText: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 24 },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  listContainer: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 16, letterSpacing: 0.5, textTransform: "uppercase" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
