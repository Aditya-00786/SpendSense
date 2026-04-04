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
import { Reminder, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  onClose: () => void;
}

const TYPES = ["bill", "emi", "subscription", "other"] as const;
const RECURRENCES = ["once", "monthly", "weekly"] as const;

export default function AddReminderModal({ onClose }: Props) {
  const colors = useColors();
  const { addReminder } = useData();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<Reminder["type"]>("bill");
  const [recurrence, setRecurrence] = useState<Reminder["recurrence"]>("monthly");
  const [dueOffset, setDueOffset] = useState("0");

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Invalid", "Please enter a title.");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Invalid", "Please enter a valid amount.");
      return;
    }
    const daysOffset = parseInt(dueOffset, 10) || 0;
    const dueDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000).toISOString();

    const r: Reminder = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      amount: Number(amount),
      dueDate,
      isPaid: false,
      type,
      recurrence,
    };
    addReminder(r);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Add Reminder</Text>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. HDFC Credit Card"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Amount (₹)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={colors.mutedForeground}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Type</Text>
        <View style={styles.chipRow}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.chip,
                { backgroundColor: type === t ? colors.primary : colors.card, borderColor: colors.border },
              ]}
              onPress={() => setType(t)}
              activeOpacity={0.8}
            >
              <Text style={{ color: type === t ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Recurrence</Text>
        <View style={styles.chipRow}>
          {RECURRENCES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.chip,
                { backgroundColor: recurrence === r ? colors.primary : colors.card, borderColor: colors.border },
              ]}
              onPress={() => setRecurrence(r)}
              activeOpacity={0.8}
            >
              <Text style={{ color: recurrence === r ? colors.primaryForeground : colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Due in (days from today)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          keyboardType="numeric"
          value={dueOffset}
          onChangeText={setDueOffset}
          placeholder="0 = today"
          placeholderTextColor={colors.mutedForeground}
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
            Set Reminder
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 16, fontFamily: "Inter_400Regular", marginBottom: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8, marginBottom: 30 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
