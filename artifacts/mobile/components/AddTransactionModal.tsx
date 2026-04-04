import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Transaction, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  onClose: () => void;
}

export default function AddTransactionModal({ onClose }: Props) {
  const colors = useColors();
  const { addTransaction, accounts, categories } = useData();
  const [type, setType] = useState<"debit" | "credit">("debit");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Other");
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [note, setNote] = useState("");

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const handleSave = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Invalid", "Please enter a valid amount.");
      return;
    }
    if (!merchant.trim()) {
      Alert.alert("Invalid", "Please enter a merchant name.");
      return;
    }
    const t: Transaction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      amount: Number(amount),
      merchant: merchant.trim(),
      category: selectedCategory,
      date: new Date().toISOString().split("T")[0],
      bank: selectedAccount?.bank ?? "Unknown",
      accountNumber: selectedAccount?.accountNumber ?? "",
      note: note.trim() || undefined,
    };
    addTransaction(t);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Add Transaction</Text>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Type Toggle */}
        <View style={[styles.typeToggle, { backgroundColor: colors.card }]}>
          {(["debit", "credit"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeBtn,
                type === t && {
                  backgroundColor: t === "debit" ? "#ef4444" : "#4CD964",
                },
              ]}
              onPress={() => setType(t)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  { color: type === t ? "#fff" : colors.mutedForeground },
                ]}
              >
                {t === "debit" ? "Expense" : "Income"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Amount (₹)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={colors.mutedForeground}
        />

        {/* Merchant */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Merchant / Description</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          value={merchant}
          onChangeText={setMerchant}
          placeholder="e.g. Zomato"
          placeholderTextColor={colors.mutedForeground}
        />

        {/* Account */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Account</Text>
        <View style={styles.chipRow}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedAccountId === acc.id ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setSelectedAccountId(acc.id)}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: selectedAccountId === acc.id ? colors.primaryForeground : colors.foreground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                }}
              >
                {acc.bank}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
        <View style={styles.chipRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedCategory === cat ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: selectedCategory === cat ? colors.primaryForeground : colors.foreground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Note */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Note (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          value={note}
          onChangeText={setNote}
          placeholder="Add a note..."
          placeholderTextColor={colors.mutedForeground}
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
            Save Transaction
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  typeToggle: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  typeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 30,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
