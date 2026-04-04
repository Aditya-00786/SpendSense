import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Account, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const BANK_COLORS: Record<string, string> = {
  "HDFC Bank": "#003087",
  "Saraswat Bank": "#8B1A1A",
};

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  if (diffMin < 2) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface EditBalanceModalProps {
  account: Account | null;
  onClose: () => void;
  onSave: (balance: number) => void;
}

function EditBalanceModal({ account, onClose, onSave }: EditBalanceModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(account?.balance.toString() ?? "");

  if (!account) return null;

  const handleSave = () => {
    const num = parseFloat(value.replace(/,/g, ""));
    if (isNaN(num) || num < 0) {
      Alert.alert("Invalid amount", "Please enter a valid balance.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(num);
    onClose();
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.editSheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.editTitle, { color: colors.foreground }]}>
            Update Balance
          </Text>
          <Text style={[styles.editSub, { color: colors.mutedForeground }]}>
            {account.bank} • xx{account.accountNumber.slice(-4)}
          </Text>

          <View style={[styles.amountRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.rupeeSign, { color: colors.mutedForeground }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.foreground }]}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              selectTextOnFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
              Save Balance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.cancelLink, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accounts, transactions, updateAccount } = useData();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + a.balance, 0),
    [accounts]
  );

  const recentByAccount = useMemo(() => {
    const map: Record<string, typeof transactions> = {};
    accounts.forEach((acc) => {
      map[acc.id] = transactions
        .filter((t) => {
          const suffix = acc.accountNumber.slice(-4);
          return t.accountNumber.endsWith(suffix) || t.accountNumber === acc.accountNumber;
        })
        .slice(0, 3);
    });
    return map;
  }, [accounts, transactions]);

  const handleSyncPress = (account: Account) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingAccount(account);
  };

  const handleSaveBalance = (balance: number) => {
    if (!editingAccount) return;
    updateAccount({ ...editingAccount, balance, lastUpdated: new Date().toISOString() });
  };

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
                    {formatUpdated(account.lastUpdated)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleSyncPress(account)}
                  style={[styles.refreshBtn, { borderColor: colors.border }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="edit-2" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Recent transactions */}
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

        {/* Bank-wise Summary */}
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
                    { width: `${pct}%` as any, backgroundColor: bankColor },
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

      {/* Edit Balance Modal */}
      {editingAccount && (
        <EditBalanceModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={handleSaveBalance}
        />
      )}
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
  bankInitial: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
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
  summaryBar: { height: 6, borderRadius: 3, marginBottom: 10, overflow: "hidden" },
  summaryFill: { height: 6, borderRadius: 3 },
  summaryInfo: { flexDirection: "row", justifyContent: "space-between" },
  summaryBank: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  summaryBalance: { fontSize: 14, fontFamily: "Inter_700Bold" },
  // Edit balance modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  editSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  editTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 4 },
  editSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 20 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 58,
  },
  rupeeSign: { fontSize: 22, fontFamily: "Inter_500Medium", marginRight: 8 },
  amountInput: { flex: 1, fontSize: 26, fontFamily: "Inter_700Bold" },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cancelLink: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 4 },
});
