import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  onClose: () => void;
}

function getBankLogoAsset(bank: string) {
  const b = bank.toLowerCase();
  if (b.includes("hdfc")) return require("../assets/images/HDFCLogo.png");
  if (b.includes("saraswat")) return require("../assets/images/SaraswatLogo.png");
  return null;
}

export default function SettingsModal({ onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, accounts, updateAccount } = useData();

  const [name, setName] = useState(settings.name);
  const [currency, setCurrency] = useState(settings.currencySymbol);
  
  const [showNetCategoryBreakdown, setShowNetCategoryBreakdown] = useState(settings.showNetCategoryBreakdown ?? false);
  const [showNetMultiColorTrends, setShowNetMultiColorTrends] = useState(settings.showNetMultiColorTrends ?? false);
  const [showDebitIncomePct, setShowDebitIncomePct] = useState(settings.showDebitIncomePct ?? false);

  const stateRef = useRef({ name, currency, showNetCategoryBreakdown, showNetMultiColorTrends, showDebitIncomePct });

  useEffect(() => {
    stateRef.current = { name, currency, showNetCategoryBreakdown, showNetMultiColorTrends, showDebitIncomePct };
  }, [name, currency, showNetCategoryBreakdown, showNetMultiColorTrends, showDebitIncomePct]);

  useEffect(() => {
    return () => {
      updateSettings({
        ...settings,
        name: stateRef.current.name,
        currencySymbol: stateRef.current.currency,
        showNetCategoryBreakdown: stateRef.current.showNetCategoryBreakdown,
        showNetMultiColorTrends: stateRef.current.showNetMultiColorTrends,
        showDebitIncomePct: stateRef.current.showDebitIncomePct
      });
    };
  }, []);

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSettings({
      ...settings,
      name,
      currencySymbol: currency,
      showNetCategoryBreakdown,
      showNetMultiColorTrends,
      showDebitIncomePct
    });
    onClose();
  };

  const topInset = 20;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset + 16 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="x" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Settings */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>PROFILE</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Yash"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Currency</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {["₹", "$", "€", "£", "¥"].map((sym) => (
              <TouchableOpacity
                key={sym}
                onPress={() => setCurrency(sym)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: currency === sym ? colors.primary : colors.border,
                  backgroundColor: currency === sym ? colors.primary + "15" : colors.card,
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 18,
                  fontFamily: "Inter_600SemiBold",
                  color: currency === sym ? colors.primary : colors.foreground,
                }}>{sym}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Changes</Text>
        </TouchableOpacity>

        {/* Analytics Configs */}
        <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 40 }]}>ANALYTICS CUSTOMIZATION</Text>
        <View style={styles.accountsList}>
          <View style={[styles.accCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.bankName, { color: colors.foreground }]}>Detailed Net Breakdown</Text>
              <Text style={[styles.accNum, { color: colors.mutedForeground, lineHeight: 18 }]}>Show multicolour category breakdown in Net pie chart.</Text>
            </View>
            <Switch
              value={showNetCategoryBreakdown}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowNetCategoryBreakdown(val);
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
          <View style={[styles.accCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.bankName, { color: colors.foreground }]}>Multicolor Net Trends</Text>
              <Text style={[styles.accNum, { color: colors.mutedForeground, lineHeight: 18 }]}>Show absolute differential with multicolor bars in Net trends view.</Text>
            </View>
            <Switch
              value={showNetMultiColorTrends}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowNetMultiColorTrends(val);
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
          <View style={[styles.accCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.bankName, { color: colors.foreground }]}>Show Income %</Text>
              <Text style={[styles.accNum, { color: colors.mutedForeground, lineHeight: 18 }]}>Show percentage of total income inside Debit pie chart.</Text>
            </View>
            <Switch
              value={showDebitIncomePct}
              onValueChange={(val) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowDebitIncomePct(val);
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* Bank Configs */}
        <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 40 }]}>ACCOUNT AUTOMATION</Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>
          If an SMS does not contain balance directly, enable this to update active balances implicitly.
        </Text>

        <View style={styles.accountsList}>
          {accounts.map((acc) => {
            const logoAsset = getBankLogoAsset(acc.bank);
            return (
              <View key={acc.id} style={[styles.accCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.accInfo}>
                  {logoAsset ? (
                    <Image source={logoAsset} style={styles.bankLogo} contentFit="contain" />
                  ) : (
                    <View style={[styles.colorDot, { backgroundColor: acc.color }]} />
                  )}
                  <View>
                    <Text style={[styles.bankName, { color: colors.foreground }]}>{acc.bank}</Text>
                    <Text style={[styles.accNum, { color: colors.mutedForeground }]}>*{acc.accountNumber.slice(-4)}</Text>
                  </View>
                </View>

                <Switch
                  value={acc.fallbackBalanceUpdate ?? false}
                  onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateAccount({ ...acc, fallbackBalanceUpdate: val });
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
            );
          })}
          {accounts.length === 0 && (
            <Text style={[styles.helper, { color: colors.foreground, fontStyle: "italic" }]}>No accounts connected yet.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 30 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 16 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 10 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  helper: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 20 },
  accountsList: { gap: 12 },
  accCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderWidth: 1, borderRadius: 14 },
  accInfo: { flexDirection: "row", alignItems: "center", gap: 14 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  bankLogo: { width: 24, height: 24, borderRadius: 4 },
  bankName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  accNum: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
