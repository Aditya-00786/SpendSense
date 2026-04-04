import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const BANK_COLORS: Record<string, string> = {
  "HDFC Bank": "#003087",
  "Saraswat Bank": "#8B1A1A",
};

const BANK_LIGHT_COLORS: Record<string, string> = {
  "HDFC Bank": "#E8EEF7",
  "Saraswat Bank": "#F7E8E8",
};

export default function AccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accounts, transactions } = useData();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + a.balance, 0),
    [accounts]
  );

  const recentByAccount = useMemo(() => {
    const map: Record<string, typeof transactions> = {};
    accounts.forEach((acc) => {
      map[acc.id] = transactions
        .filter((t) => t.accountNumber === acc.accountNumber)
        .slice(0, 3);
    });
    return map;
  }, [accounts, transactions]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topInset + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>
          Accounts & Deposits
        </Text>

        {/* Total Balance */}
        <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
            Total Balance
          </Text>
          <Text style={[styles.totalAmount, { color: colors.foreground }]}>
            ₹{totalBalance.toLocaleString("en-IN")}
          </Text>
          <Text style={[styles.totalSub, { color: colors.mutedForeground }]}>
            Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Accounts Section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Savings Accounts
        </Text>

        {accounts.map((account) => {
          const bankColor = BANK_COLORS[account.bank] ?? "#333";
          const bankLight = BANK_LIGHT_COLORS[account.bank] ?? "#eee";
          const recent = recentByAccount[account.id] ?? [];

          return (
            <View
              key={account.id}
              style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={[styles.bankBadge, { backgroundColor: bankColor }]}>
                  <Text style={styles.bankInitial}>
                    {account.bank.charAt(0)}
                  </Text>
                </View>
                <View style={styles.bankInfo}>
                  <Text style={[styles.bankName, { color: colors.foreground }]}>
                    {account.bank}
                  </Text>
                  <Text style={[styles.accNumber, { color: colors.mutedForeground }]}>
                    xx{account.accountNumber.slice(-4)}
                  </Text>
                </View>
                <View style={styles.balanceInfo}>
                  <Text style={[styles.accountBalance, { color: colors.foreground }]}>
                    ₹{account.balance.toLocaleString("en-IN")}
                  </Text>
                  <Text style={[styles.updatedText, { color: colors.mutedForeground }]}>
                    Updated Today
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  style={[styles.refreshBtn, { borderColor: colors.border }]}
                >
                  <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Recent transactions for this account */}
              <Text style={[styles.recentLabel, { color: colors.mutedForeground }]}>
                Recent
              </Text>
              {recent.length === 0 ? (
                <Text style={[styles.noActivity, { color: colors.mutedForeground }]}>
                  No recent activity
                </Text>
              ) : (
                recent.map((tx) => (
                  <View key={tx.id} style={styles.miniTx}>
                    <Text style={[styles.miniMerchant, { color: colors.foreground }]} numberOfLines={1}>
                      {tx.merchant}
                    </Text>
                    <Text
                      style={[
                        styles.miniAmount,
                        { color: tx.type === "credit" ? "#4CD964" : colors.foreground },
                      ]}
                    >
                      {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                ))
              )}
            </View>
          );
        })}

        {/* Summary by bank */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Bank-wise Summary
        </Text>
        {accounts.map((account) => {
          const bankColor = BANK_COLORS[account.bank] ?? "#333";
          const pct = totalBalance > 0 ? (account.balance / totalBalance) * 100 : 0;
          return (
            <View
              key={account.id + "-summary"}
              style={[styles.summaryRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.summaryBar, { backgroundColor: bankColor + "30" }]}>
                <View
                  style={[
                    styles.summaryFill,
                    { width: `${pct}%`, backgroundColor: bankColor },
                  ]}
                />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={[styles.summaryBank, { color: colors.foreground }]}>
                  {account.bank}
                </Text>
                <Text style={[styles.summaryBalance, { color: colors.foreground }]}>
                  ₹{account.balance.toLocaleString("en-IN")} ({pct.toFixed(0)}%)
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 20 },
  totalCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  totalLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  totalAmount: { fontSize: 36, fontFamily: "Inter_700Bold", marginBottom: 4 },
  totalSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  accountCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  bankBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bankInitial: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  bankInfo: { flex: 1 },
  bankName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  accNumber: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  balanceInfo: { alignItems: "flex-end" },
  accountBalance: { fontSize: 16, fontFamily: "Inter_700Bold" },
  updatedText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, marginBottom: 12 },
  recentLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  noActivity: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  miniTx: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  miniMerchant: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, marginRight: 8 },
  miniAmount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  summaryRow: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  summaryBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 10,
    overflow: "hidden",
  },
  summaryFill: { height: 6, borderRadius: 3 },
  summaryInfo: { flexDirection: "row", justifyContent: "space-between" },
  summaryBank: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  summaryBalance: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
