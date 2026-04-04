import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

interface Props {
  visible: boolean;
  selectedMonth: number;
  selectedYear: number;
  onSelect: (month: number, year: number) => void;
  onClose: () => void;
}

export default function MonthPickerModal({ visible, selectedMonth, selectedYear, onSelect, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const now = new Date();

  const [year, setYear] = useState(selectedYear);

  const changeYear = (delta: number) => {
    const next = year + delta;
    if (next > now.getFullYear()) return;
    Haptics.selectionAsync();
    setYear(next);
  };

  const handleSelect = (monthIdx: number) => {
    if (year === now.getFullYear() && monthIdx > now.getMonth()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(monthIdx, year);
    onClose();
  };

  const isFuture = (monthIdx: number) =>
    year === now.getFullYear() && monthIdx > now.getMonth();

  const isSelected = (monthIdx: number) =>
    monthIdx === selectedMonth && year === selectedYear;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Text style={[styles.title, { color: colors.foreground }]}>Select Month</Text>

        {/* Year navigation */}
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => changeYear(-1)} style={styles.yearBtn} activeOpacity={0.7}>
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.yearText, { color: colors.foreground }]}>{year}</Text>
          <TouchableOpacity
            onPress={() => changeYear(1)}
            style={styles.yearBtn}
            activeOpacity={year >= now.getFullYear() ? 1 : 0.7}
          >
            <Feather name="chevron-right" size={20} color={year >= now.getFullYear() ? colors.border : colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Month grid */}
        <View style={styles.grid}>
          {MONTHS.map((m, i) => {
            const future = isFuture(i);
            const selected = isSelected(i);
            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.monthCell,
                  {
                    backgroundColor: selected ? colors.primary : colors.background,
                    borderColor: selected ? colors.primary : colors.border,
                    opacity: future ? 0.3 : 1,
                  },
                ]}
                onPress={() => handleSelect(i)}
                activeOpacity={future ? 1 : 0.75}
                disabled={future}
              >
                <Text
                  style={[
                    styles.monthText,
                    { color: selected ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: colors.border }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 16,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 24,
  },
  yearBtn: {
    padding: 8,
  },
  yearText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    minWidth: 60,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  monthCell: {
    width: "22%",
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  monthText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  cancelBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
