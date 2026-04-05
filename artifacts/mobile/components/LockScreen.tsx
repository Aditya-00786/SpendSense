import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { authenticate, biometricType } = useAuth();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Pulse the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Auto-trigger on mount
    if (Platform.OS !== "web") {
      const timer = setTimeout(() => handleAuthenticate(), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAuthenticate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await authenticate();
  };

  const icon = biometricType === "face" ? "smile" : biometricType === "fingerprint" ? "activity" : "lock";
  const label = biometricType === "face" ? "Face ID" : biometricType === "fingerprint" ? "Touch ID" : "Biometrics";

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background, opacity: fadeIn },
        { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
      ]}
    >
      {/* App name */}
      <View style={styles.top}>
        <View style={[styles.appIcon, { backgroundColor: "#4CD96420", borderColor: "#4CD96440" }]}>
          <Feather name="trending-up" size={36} color="#4CD964" />
        </View>
        <Text style={[styles.appName, { color: colors.foreground }]}>SpendSense</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your finances are locked
        </Text>
      </View>

      {/* Biometric button */}
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.biometricBtn, { backgroundColor: colors.card, borderColor: "#4CD96450" }]}
            onPress={handleAuthenticate}
            activeOpacity={0.8}
          >
            <Feather name={icon as any} size={44} color="#4CD964" />
          </TouchableOpacity>
        </Animated.View>
        <Text style={[styles.biometricLabel, { color: colors.mutedForeground }]}>
          {Platform.OS === "web" ? "Tap to unlock" : `Use ${label} to unlock`}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.bottom}>
        <TouchableOpacity
          onPress={handleAuthenticate}
          style={[styles.unlockBtn, { backgroundColor: "#4CD964" }]}
          activeOpacity={0.85}
        >
          <Feather name="unlock" size={16} color="#0D0D0D" />
          <Text style={styles.unlockBtnText}>
            {Platform.OS === "web" ? "Unlock" : `Unlock with ${label}`}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  top: {
    alignItems: "center",
    gap: 12,
  },
  appIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  appName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  center: {
    alignItems: "center",
    gap: 16,
  },
  biometricBtn: {
    width: 110,
    height: 110,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4CD964",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  biometricLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  bottom: {
    width: "100%",
    gap: 12,
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
  },
  unlockBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#0D0D0D",
  },
});
