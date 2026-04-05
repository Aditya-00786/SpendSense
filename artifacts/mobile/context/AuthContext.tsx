import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

const BIOMETRIC_KEY = "biometric_enabled";
const BACKGROUND_TIMEOUT_MS = 60 * 1000; // Re-lock after 1 min in background

interface AuthContextType {
  isLocked: boolean;
  isBiometricEnabled: boolean;
  isBiometricSupported: boolean;
  biometricType: "face" | "fingerprint" | "none";
  authenticate: () => Promise<boolean>;
  lock: () => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<"face" | "fingerprint" | "none">("none");
  const backgroundTimestamp = useRef<number | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    // Check device support
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const supported = compatible && enrolled;
    setIsBiometricSupported(supported);

    // Detect type (Face ID vs Touch ID)
    if (supported) {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType("face");
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType("fingerprint");
      }
    }

    // Load user preference
    const stored = await AsyncStorage.getItem(BIOMETRIC_KEY);
    const enabled = stored === "true" && supported;
    setIsBiometricEnabled(enabled);

    // Lock on startup if enabled
    if (enabled) {
      setIsLocked(true);
      hasInitialized.current = true;
    } else {
      hasInitialized.current = true;
    }
  };

  // Re-lock when coming back from background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (!hasInitialized.current || !isBiometricEnabled) return;
      if (state === "background" || state === "inactive") {
        backgroundTimestamp.current = Date.now();
      } else if (state === "active") {
        if (
          backgroundTimestamp.current !== null &&
          Date.now() - backgroundTimestamp.current > BACKGROUND_TIMEOUT_MS
        ) {
          setIsLocked(true);
        }
        backgroundTimestamp.current = null;
      }
    });
    return () => sub.remove();
  }, [isBiometricEnabled]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      // Web doesn't support biometrics — just unlock
      setIsLocked(false);
      return true;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock SpendSense",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const lock = useCallback(() => {
    if (isBiometricEnabled) setIsLocked(true);
  }, [isBiometricEnabled]);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    await AsyncStorage.setItem(BIOMETRIC_KEY, enabled ? "true" : "false");
    setIsBiometricEnabled(enabled);
    if (!enabled) setIsLocked(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLocked,
        isBiometricEnabled,
        isBiometricSupported,
        biometricType,
        authenticate,
        lock,
        setBiometricEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
