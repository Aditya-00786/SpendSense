import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  onClose: () => void;
}

const SAMPLE_SMS = [
  `Your A/c no. 1234567 is debited with INR 1,200 on 05-05-2024 towards UPI/933309880936/ZOMATO/SR. Current Bal is INR 45,200 CR  - Saraswat Bank`,
  `Your A/c no. 1234567 is credited with 45000 on 02-05-2024 towards UPI/103045447228/SALARY/HD. Current Bal is 52000 CR  - Saraswat Bank`,
  `Sent Rs.360\nFrom HDFC Bank A/C *2233\nTo Uber\nOn 19-05-2024\nRef 645410750429\nNot You?\nCall 18002586161/SMS BLOCK UPI to 7308080808`,
];

export default function SMSParser({ onClose }: Props) {
  const colors = useColors();
  const { addTransactionFromSMS } = useData();
  const [smsText, setSmsText] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleParse = () => {
    if (!smsText.trim()) {
      Alert.alert("Empty", "Please paste an SMS message to parse.");
      return;
    }
    const transaction = addTransactionFromSMS(smsText.trim());
    if (transaction) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(
        `✓ Added ${transaction.type === "debit" ? "expense" : "income"} of ₹${transaction.amount.toLocaleString("en-IN")} from ${transaction.merchant}`
      );
      setSmsText("");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setResult("Could not parse this SMS. Supported: Saraswat Bank & HDFC Bank.");
    }
  };

  const useSample = (sample: string) => {
    setSmsText(sample);
    setResult(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Parse Bank SMS
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        Paste your bank SMS message below
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            color: colors.foreground,
            borderColor: colors.border,
          },
        ]}
        multiline
        numberOfLines={6}
        value={smsText}
        onChangeText={(t) => {
          setSmsText(t);
          setResult(null);
        }}
        placeholder="Paste SMS here..."
        placeholderTextColor={colors.mutedForeground}
        textAlignVertical="top"
      />

      {result && (
        <View
          style={[
            styles.resultBox,
            {
              backgroundColor: result.startsWith("✓")
                ? "#4CD96420"
                : "#ef444420",
              borderColor: result.startsWith("✓") ? "#4CD964" : "#ef4444",
            },
          ]}
        >
          <Text
            style={{
              color: result.startsWith("✓") ? "#4CD964" : "#ef4444",
              fontFamily: "Inter_500Medium",
              fontSize: 13,
            }}
          >
            {result}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.parseBtn, { backgroundColor: colors.primary }]}
        onPress={handleParse}
        activeOpacity={0.8}
      >
        <Text style={[styles.parseBtnText, { color: colors.primaryForeground }]}>
          Parse SMS
        </Text>
      </TouchableOpacity>

      <Text style={[styles.samplesLabel, { color: colors.mutedForeground }]}>
        Try sample SMS:
      </Text>
      {SAMPLE_SMS.map((sample, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.sampleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => useSample(sample)}
          activeOpacity={0.7}
        >
          <Text style={[styles.sampleText, { color: colors.mutedForeground }]} numberOfLines={2}>
            {sample.substring(0, 80)}...
          </Text>
        </TouchableOpacity>
      ))}
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
  label: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 120,
    marginBottom: 12,
  },
  resultBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  parseBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  parseBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  samplesLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sampleBtn: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  sampleText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
