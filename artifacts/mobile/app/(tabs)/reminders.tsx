import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AddReminderModal from "@/components/AddReminderModal";
import { Reminder, useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

const TYPE_ICONS: Record<Reminder["type"], string> = {
  bill: "file-text",
  emi: "credit-card",
  subscription: "repeat",
  other: "bell",
};

const TYPE_COLORS: Record<Reminder["type"], string> = {
  bill: "#60A5FA",
  emi: "#A78BFA",
  subscription: "#34D399",
  other: "#FB923C",
};

function getDueLabel(dueDate: string): { label: string; color: string } {
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Overdue", color: "#EF5350" };
  if (diffDays === 0) return { label: "Due Today", color: "#FFA726" };
  if (diffDays === 1) return { label: "Due Tomorrow", color: "#FFA726" };
  if (diffDays <= 7) return { label: `Due in ${diffDays} days`, color: "#60A5FA" };
  return {
    label: `Due ${due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
    color: "#94A3B8",
  };
}

export default function RemindersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reminders, updateReminder, deleteReminder } = useData();
  const [showAdd, setShowAdd] = useState(false);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const pending = useMemo(
    () =>
      reminders
        .filter((r) => !r.isPaid)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [reminders]
  );

  const paid = useMemo(() => reminders.filter((r) => r.isPaid), [reminders]);

  const totalPending = useMemo(
    () => pending.reduce((s, r) => s + r.amount, 0),
    [pending]
  );

  const handleMarkPaid = (reminder: Reminder) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateReminder({ ...reminder, isPaid: true });
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Reminder", "Remove this reminder?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteReminder(id);
        },
      },
    ]);
  };

  const renderReminder = (reminder: Reminder) => {
    const due = getDueLabel(reminder.dueDate);
    const icon = TYPE_ICONS[reminder.type];
    const iconColor = TYPE_COLORS[reminder.type];

    return (
      <View
        key={reminder.id}
        style={[
          styles.reminderCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.dueLabel, { color: due.color }]}>
          {due.label.toUpperCase()}
        </Text>
        <View style={styles.cardRow}>
          <View style={[styles.typeIcon, { backgroundColor: iconColor + "20" }]}>
            <Feather name={icon as any} size={20} color={iconColor} />
          </View>
          <View style={styles.reminderInfo}>
            <Text style={[styles.reminderTitle, { color: colors.foreground }]}>
              {reminder.title}
            </Text>
            <Text style={[styles.reminderAmount, { color: colors.foreground }]}>
              ₹{reminder.amount.toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.reminderRecurrence, { color: colors.mutedForeground }]}>
              {reminder.recurrence.charAt(0).toUpperCase() + reminder.recurrence.slice(1)} · {reminder.type}
            </Text>
          </View>
          <View style={styles.actions}>
            {!reminder.isPaid && (
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: colors.foreground }]}
                onPress={() => handleMarkPaid(reminder)}
                activeOpacity={0.8}
              >
                <Text style={[styles.payBtnText, { color: colors.background }]}>
                  Mark paid
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(reminder.id)}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topInset + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Reminders</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAdd(true);
            }}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        {pending.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: "#FFA72620", borderColor: "#FFA726" }]}>
            <Feather name="alert-circle" size={20} color="#FFA726" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.summaryTitle, { color: "#FFA726" }]}>
                {pending.length} payment{pending.length !== 1 ? "s" : ""} due
              </Text>
              <Text style={[styles.summaryAmount, { color: "#FFA726" }]}>
                Total: ₹{totalPending.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Upcoming</Text>
            {pending.map(renderReminder)}
          </>
        )}

        {/* Paid */}
        {paid.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Paid</Text>
            {paid.map((r) => (
              <View
                key={r.id}
                style={[styles.paidCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Feather name="check-circle" size={18} color="#4CD964" />
                <Text style={[styles.paidTitle, { color: colors.mutedForeground }]}>
                  {r.title}
                </Text>
                <Text style={[styles.paidAmount, { color: colors.mutedForeground }]}>
                  ₹{r.amount.toLocaleString("en-IN")}
                </Text>
                <TouchableOpacity onPress={() => deleteReminder(r.id)} style={{ marginLeft: 8 }}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {reminders.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="bell-off" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No reminders yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add payment reminders for bills, EMIs, and subscriptions.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <AddReminderModal onClose={() => setShowAdd(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  summaryTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  summaryAmount: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  reminderCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  dueLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: 10,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  reminderAmount: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  reminderRecurrence: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { alignItems: "flex-end", gap: 8 },
  payBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  payBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  deleteBtn: { padding: 4 },
  paidCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  paidTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  paidAmount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
