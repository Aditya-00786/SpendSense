import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectSMS: () => void;
  onSelectManual: () => void;
}

export default function AddOptionsSheet({ visible, onClose, onSelectSMS, onSelectManual }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleSMS = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(onSelectSMS, 200);
  };

  const handleManual = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(onSelectManual, 200);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Text style={[styles.title, { color: colors.foreground }]}>
          Add Transaction
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          How would you like to add it?
        </Text>

        <View style={styles.options}>
          <TouchableOpacity
            style={[styles.optionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleSMS}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#4CD96420" }]}>
              <Feather name="message-square" size={24} color="#4CD964" />
            </View>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Via SMS</Text>
            <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
              Parse your bank SMS automatically
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleManual}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#5C6BC020" }]}>
              <Feather name="edit-3" size={24} color="#5C6BC0" />
            </View>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Manually</Text>
            <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
              Enter transaction details yourself
            </Text>
          </TouchableOpacity>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 20,
  },
  options: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  optionBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  optionDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 15,
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
