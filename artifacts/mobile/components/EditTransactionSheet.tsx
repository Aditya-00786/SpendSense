import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
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
import { Transaction } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_ICONS } from "./TransactionCard";

const DEBIT_CATEGORIES = [
  "Food & Dining", "Transport", "Shopping", "Entertainment",
  "Utilities", "Healthcare", "Education", "Travel", "Transfer", "Other",
];
const CREDIT_CATEGORIES = [
  "Salary", "Interest", "Fixed Deposit", "Investments",
  "Dividend", "Rental Income", "Refund", "Transfer", "Other Income",
];

interface Props {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
}

export default function EditTransactionSheet({ transaction, onClose, onSave }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [merchant, setMerchant] = useState(transaction?.merchant ?? "");
  const [category, setCategory] = useState(transaction?.category ?? "Other");
  const [note, setNote] = useState(transaction?.note ?? "");
  const [showCatPicker, setShowCatPicker] = useState(false);

  if (!transaction) return null;

  const categories = transaction.type === "credit" ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;
  const catInfo = CATEGORY_ICONS[category] ?? CATEGORY_ICONS["Other"];

  const handleSave = () => {
    if (!merchant.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ ...transaction, merchant: merchant.trim(), category, note: note.trim() });
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 24) }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.foreground }]}>Edit Transaction</Text>
            <TouchableOpacity onPress={handleSave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Read-only summary */}
            <View style={[styles.readOnlyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.readOnlyRow}>
                <Text style={[styles.readOnlyLabel, { color: colors.mutedForeground }]}>Amount</Text>
                <Text style={[
                  styles.readOnlyValue,
                  { color: transaction.type === "credit" ? "#4CD964" : "#EF5350" },
                ]}>
                  {transaction.type === "credit" ? "+" : "-"}₹{transaction.amount.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={[styles.readOnlyDivider, { backgroundColor: colors.border }]} />
              <View style={styles.readOnlyRow}>
                <Text style={[styles.readOnlyLabel, { color: colors.mutedForeground }]}>Bank</Text>
                <Text style={[styles.readOnlyValue, { color: colors.foreground }]}>{transaction.bank}</Text>
              </View>
              <View style={[styles.readOnlyDivider, { backgroundColor: colors.border }]} />
              <View style={styles.readOnlyRow}>
                <Text style={[styles.readOnlyLabel, { color: colors.mutedForeground }]}>Account</Text>
                <Text style={[styles.readOnlyValue, { color: colors.foreground }]}>
                  xx{transaction.accountNumber.slice(-4)}
                </Text>
              </View>
            </View>

            {/* Merchant */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Merchant / Source</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={merchant}
              onChangeText={setMerchant}
              placeholder="Merchant name"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
            />

            {/* Category picker */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
            <TouchableOpacity
              style={[styles.catSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowCatPicker(!showCatPicker)}
              activeOpacity={0.8}
            >
              <View style={[styles.catIcon, { backgroundColor: catInfo.color + "20" }]}>
                <Feather name={catInfo.icon as any} size={16} color={catInfo.color} />
              </View>
              <Text style={[styles.catSelectorText, { color: colors.foreground }]}>{category}</Text>
              <Feather
                name={showCatPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>

            {showCatPicker && (
              <View style={[styles.catDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {categories.map((cat) => {
                  const info = CATEGORY_ICONS[cat] ?? CATEGORY_ICONS["Other"];
                  const selected = cat === category;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catOption,
                        selected && { backgroundColor: colors.primary + "15" },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCategory(cat);
                        setShowCatPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.catIcon, { backgroundColor: info.color + "20" }]}>
                        <Feather name={info.icon as any} size={14} color={info.color} />
                      </View>
                      <Text style={[styles.catOptionText, { color: selected ? colors.primary : colors.foreground }]}>
                        {cat}
                      </Text>
                      {selected && <Feather name="check" size={14} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Note */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.noteInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Feather name="check" size={18} color={colors.primaryForeground} />
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  cancelText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  saveText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 20, paddingBottom: 20 },
  readOnlyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  readOnlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  readOnlyDivider: { height: 1 },
  readOnlyLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  readOnlyValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  noteInput: { minHeight: 80, marginBottom: 24 },
  catSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  catSelectorText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  catDropdown: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  catOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  catOptionText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  catIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
