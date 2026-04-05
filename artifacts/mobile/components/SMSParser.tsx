import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  onClose: () => void;
}

const SAMPLE_SMS = [
  `Your A/c no. 229302 is credited with INR 1,749.00 on 03-04-2026 towards UPI/103045447228/WWW MYNTRA/HD. Current Bal is INR 1,32,000.87 CR  - Saraswat Bank`,
  `Your a/c no. XX9302 is debited for Rs.899.00 on 03-04-2026 23:16:18 and credited to vpa snitchapparels1.rzp@hdfcbank (UPI Ref no 103045481551) Your Current Balance is INR 129912.87. If not you, give a missed call on 7666339922 - Saraswat Bank`,
  `Sent Rs.360\nFrom HDFC Bank A/C *2233\nTo Uber\nOn 19-05-2024\nRef 645410750429\nNot You?\nCall 18002586161/SMS BLOCK UPI to 7308080808`,
];

export default function SMSParser({ onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTransactionFromSMS } = useData();
  const [smsText, setSmsText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);

  const topInset = Platform.OS === "web" ? 20 : insets.top;

  const handlePaste = async () => {
    try {
      setPasting(true);
      let text = "";
      if (Platform.OS === "web") {
        if (navigator.clipboard?.readText) {
          text = await navigator.clipboard.readText();
        } else {
          Alert.alert("Not supported", "Clipboard paste is not supported in this browser. Please paste manually.");
          return;
        }
      } else {
        text = await Clipboard.getStringAsync();
      }
      if (text.trim()) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSmsText(text.trim());
        setResult(null);
      } else {
        Alert.alert("Empty clipboard", "Your clipboard is empty.");
      }
    } catch {
      Alert.alert("Error", "Could not read clipboard.");
    } finally {
      setPasting(false);
    }
  };

  const handleParse = () => {
    if (!smsText.trim()) {
      Alert.alert("Empty", "Please paste an SMS message to parse.");
      return;
    }
    const transaction = addTransactionFromSMS(smsText.trim());
    if (transaction === "duplicate") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setResult("Duplicate Sync. This transaction has already been synced to your account.");
      Alert.alert(
        "Duplicate Sync",
        "This transaction has already been synced to your account.",
        [{ text: "OK", onPress: () => setTimeout(onClose, 400) }]
      );
    } else if (transaction) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(
        `✓ Added ${transaction.type === "debit" ? "expense" : "income"} of ₹${transaction.amount.toLocaleString("en-IN")} from ${transaction.merchant}`
      );
      setSmsText("");
      setTimeout(onClose, 800);
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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset + 16 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Parse Bank SMS
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

      {/* Paste button */}
      <TouchableOpacity
        style={[styles.pasteBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handlePaste}
        activeOpacity={0.75}
        disabled={pasting}
      >
        <Feather name="clipboard" size={15} color={colors.primary} />
        <Text style={[styles.pasteBtnText, { color: colors.primary }]}>
          {pasting ? "Pasting…" : "Paste from clipboard"}
        </Text>
      </TouchableOpacity>

      {result && (
        <View
          style={[
            styles.resultBox,
            {
              backgroundColor: result.startsWith("✓") ? "#4CD96420" : "#ef444420",
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
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    marginBottom: 10,
  },
  pasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  pasteBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
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
