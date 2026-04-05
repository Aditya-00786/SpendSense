import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Transaction, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_ICONS } from "./TransactionCard";

interface Props {
  transaction: Transaction | null;
  onClose: () => void;
}

export default function TransactionDetailSheet({ transaction, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useData();

  if (!transaction) return null;

  const isCredit = transaction.type === "credit";
  const catInfo = CATEGORY_ICONS[transaction.category] || CATEGORY_ICONS["Other"];

  const formatDateFull = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString("en-IN", {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return iso;
    }
  };

  const topInset = 20;

  return (
    <Modal visible={!!transaction} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset + 16 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Details</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: catInfo.color + "20" }]}>
              <Feather name={catInfo.icon as any} size={32} color={catInfo.color} />
            </View>
            <Text style={[styles.heroAmount, { color: isCredit ? "#4CD964" : "#EF5350" }]}>
              {isCredit ? "+" : "-"}{settings.currencySymbol}{transaction.amount.toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.heroMerchant, { color: colors.foreground }]}>{transaction.merchant}</Text>
          </View>

          {/* Details Matrix */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

            <DetailRow label="Category" value={transaction.category} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <DetailRow label="Transaction Type" value={isCredit ? "Credit" : "Debit"} colors={colors} valueColor={isCredit ? "#4CD964" : "#EF5350"} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <DetailRow label="Date & Time" value={formatDateFull(transaction.date)} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <DetailRow label="Bank Name" value={transaction.bank} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <DetailRow label="Account Number" value={`•••• ${transaction.accountNumber?.slice(-4) || 'XXXX'}`} colors={colors} />

            {transaction.refNo && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <DetailRow label="Reference Code" value={transaction.refNo} colors={colors} />
              </>
            )}

            {transaction.balance !== undefined && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <DetailRow label="Remaining Balance" value={`${settings.currencySymbol}${transaction.balance.toLocaleString("en-IN")}`} colors={colors} />
              </>
            )}
          </View>

          {transaction.note && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Notes</Text>
              <Text style={[styles.sectionBody, { color: colors.foreground }]}>{transaction.note}</Text>
            </View>
          )}

          {transaction.rawSMS && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Raw SMS Data</Text>
              <Text style={[styles.sectionBody, { color: colors.mutedForeground, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 }]} selectable>
                {transaction.rawSMS}
              </Text>
            </View>
          )}

        </ScrollView>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, colors, valueColor }: { label: string; value: string; colors: any; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor || colors.foreground }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },

  hero: { alignItems: "center", paddingVertical: 30 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  heroAmount: { fontSize: 36, fontFamily: "Inter_700Bold", marginBottom: 8 },
  heroMerchant: { fontSize: 18, fontFamily: "Inter_500Medium" },

  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", paddingVertical: 10 },
  rowLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right", maxWidth: "60%" },
  divider: { height: 1, width: "100%", marginVertical: 4 },

  section: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  sectionBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
