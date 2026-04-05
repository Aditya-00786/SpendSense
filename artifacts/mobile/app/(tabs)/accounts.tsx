import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useFocusEffect } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  FadeInDown,
  FadeOutDown,
  FadeInUp,
  FadeOutUp,
  LinearTransition
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StatementSheet from "@/components/StatementSheet";
import TransactionFilter, { FilterMode, FilterTrigger, useTransactionFilter } from "@/components/TransactionFilter";
import { Account, Transaction, useData } from "@/context/DataContext";
import TransactionDetailSheet from "@/components/TransactionDetailSheet";
import { useColors } from "@/hooks/useColors";

const BANK_COLORS: Record<string, string> = {
  "HDFC Bank": "#003087",
  "Saraswat Bank": "#8B1A1A",
};

function getBankLogoAsset(bank: string) {
  const b = bank.toLowerCase();
  if (b.includes("hdfc")) return require("../../assets/images/HDFCLogo.png");
  if (b.includes("saraswat")) return require("../../assets/images/SaraswatLogo.png");
  return null;
}

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  if (diffMin < 2) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ----------------------------------------------------
// COMPONENTS
// ----------------------------------------------------

interface AccountCardProps {
  account: Account;
  index: number;
  totalLength: number;
  isSingleMode: boolean;
  visible: boolean;
  selectedId: string | null;
  onPressCard: (account: Account) => void;
  onAction: (action: string, account: Account) => void;
  colors: any;
}

const SWIPE_LIMIT = -140;

function AccountCard({ account, index, totalLength, isSingleMode, visible, selectedId, onPressCard, onAction, colors }: AccountCardProps) {
  const isTargetCard = selectedId === account.id;
  const translateX = useSharedValue(0);
  const topAnim = useSharedValue(isTargetCard ? 0 : index * 60);
  const scaleAnim = useSharedValue(isTargetCard ? 1 : 1 - index * 0.05);
  const opacityAnim = useSharedValue(visible ? 1 : 0);

  const logoAsset = getBankLogoAsset(account.bank);
  const bankColor = BANK_COLORS[account.bank] ?? "#333";
  const gradientColors = [bankColor, bankColor] as const; // Strictly solid translucent prevention

  useEffect(() => {
    // Top animation smooth snap and opacity flip
    topAnim.value = withTiming(isTargetCard ? 0 : index * 60, { duration: 350 });
    scaleAnim.value = withTiming(isTargetCard ? 1.0 : 1 - index * 0.05, { duration: 350 });
    opacityAnim.value = withTiming(visible ? 1 : 0, { duration: 350 });

    // Reset any swiped state instantly if we close single mode
    if (!isSingleMode) {
      translateX.value = withTiming(0, { duration: 350 });
    }
  }, [isSingleMode, isTargetCard, index, visible, topAnim, scaleAnim, opacityAnim, translateX]);

  const pan = Gesture.Pan()
    .enabled(isSingleMode)
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = Math.max(e.translationX, SWIPE_LIMIT - 30);
      }
    })
    .onEnd((e) => {
      if (e.translationX < -100 || e.velocityX < -800) {
        translateX.value = withTiming(SWIPE_LIMIT, { duration: 350 });
      } else {
        translateX.value = withTiming(0, { duration: 350 });
      }
    });

  const rStyle = useAnimatedStyle(() => {
    const scale = interpolate(translateX.value, [0, SWIPE_LIMIT], [1, 0.88], Extrapolation.CLAMP);
    const rotateY = interpolate(translateX.value, [0, SWIPE_LIMIT], [0, 32], Extrapolation.CLAMP);

    return {
      transform: [
        { perspective: 1000 },
        { translateX: translateX.value },
        { scale },
        { rotateY: `${rotateY}deg` },
      ],
    };
  });

  const actionGridStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [-40, -160], [0, 1], Extrapolation.CLAMP);
    const scale = interpolate(translateX.value, [-40, -160], [0.8, 1], Extrapolation.CLAMP);
    const translateXBtn = interpolate(translateX.value, [-40, SWIPE_LIMIT], [30, 0], Extrapolation.CLAMP);
    const pointerEvents = opacity === 0 ? "none" : "auto";
    return {
      opacity,
      pointerEvents: pointerEvents as any,
      transform: [{ translateX: translateXBtn }, { scale }]
    };
  });

  const innerContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, SWIPE_LIMIT / 1.5], [1, 0], Extrapolation.CLAMP);
    return { opacity };
  });

  const swipedContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, SWIPE_LIMIT / 1.5], [0, 1], Extrapolation.CLAMP);
    return { opacity };
  });

  const layoutStyle = useAnimatedStyle(() => {
    return {
      top: topAnim.value,
      opacity: opacityAnim.value,
      transform: [{ scale: scaleAnim.value }],
    };
  });

  // Calculate pointer events fully based on absolute visibility flag without forcing a React re-render unmount
  const pointerEventsAttr = visible ? "auto" : "none";

  return (
    <Animated.View
      style={[{ position: "absolute", left: 0, right: 0, zIndex: totalLength - index }, layoutStyle]}
      pointerEvents={pointerEventsAttr}
    >
      {/* Background 3D Action Grid view, strictly visible only when gesture is active */}
      {isSingleMode && (
        <Animated.View style={[styles.actionGridContainer, actionGridStyle]}>
          <View style={styles.actionRow}>
            {/* 3 Buttons Setup! (Spends Removed from Quick Action Grid) */}
            <TouchableOpacity style={styles.actionGridBtn} onPress={() => { translateX.value = withSpring(0); onAction("stats", account); }}>
              <View style={[styles.actionGridIcon, { backgroundColor: "#6366F1" }]}>
                <Feather name="file-text" size={18} color="#fff" />
              </View>
              <Text style={[styles.actionGridText, { color: colors.foreground }]}>Statement</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionGridBtn} onPress={() => { translateX.value = withSpring(0); onAction("edit", account); }}>
              <View style={[styles.actionGridIcon, { backgroundColor: "#2563EB" }]}>
                <Feather name="edit-2" size={18} color="#fff" />
              </View>
              <Text style={[styles.actionGridText, { color: colors.foreground }]}>Update</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionGridBtn} onPress={() => { translateX.value = withSpring(0); onAction("unlink", account); }}>
              <View style={[styles.actionGridIcon, { backgroundColor: "#EF5350" }]}>
                <Feather name="trash-2" size={18} color="#fff" />
              </View>
              <Text style={[styles.actionGridText, { color: colors.foreground }]}>Unlink</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Main Draggable Credit Card UI */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[rStyle]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              if (translateX.value !== 0) {
                translateX.value = withTiming(0, { duration: 350 });
                return;
              }
              onPressCard(account);
            }}
            style={styles.ccShadow}
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ccContainer}
            >
              <Animated.View style={[{ flex: 1, justifyContent: "space-between" }, innerContentStyle]}>
                <View style={styles.ccHeader}>
                  <View style={styles.ccLogoWrap}>
                    {logoAsset ? <Image source={logoAsset} style={{ width: 30, height: 30 }} contentFit="contain" /> : <Text style={{ fontSize: 22, fontWeight: 'bold', color: bankColor }}>{account.bank.charAt(0)}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ccBankName}>{account.bank}</Text>
                    <Text style={styles.ccBankSub}>Savings Account</Text>
                  </View>
                </View>

                <View style={styles.ccFooter}>
                  {(!isTargetCard && index > 0) ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Text style={[styles.ccBankName, { fontSize: 16 }]} numberOfLines={1}>{account.bank}</Text>
                      <Text style={[styles.ccAccNum, { marginBottom: 0 }]}>•• {account.accountNumber.slice(-4)}</Text>
                    </View>
                  ) : (
                    <>
                      <View>
                        <Text style={styles.ccBalanceLabel}>AVAILABLE BALANCE</Text>
                        <Text style={styles.ccBalanceValue}>₹{account.balance.toLocaleString("en-IN")}</Text>
                      </View>
                      <Text style={styles.ccAccNum}>•• {account.accountNumber.slice(-4)}</Text>
                    </>
                  )}
                </View>
              </Animated.View>

              {/* Formatted Tilted View Focus Overlay */}
              <Animated.View style={[{ position: "absolute", right: 50, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", width: 150 }, swipedContentStyle]} pointerEvents="none">
                <View style={[styles.ccLogoWrap, { width: 64, height: 64, borderRadius: 20, marginBottom: 16 }]}>
                  {logoAsset ? <Image source={logoAsset} style={{ width: 40, height: 40 }} contentFit="contain" /> : <Text style={{ fontSize: 28, fontWeight: 'bold', color: bankColor }}>{account.bank.charAt(0)}</Text>}
                </View>
                <Text style={{ color: "rgba(255,255,255,1)", fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 6, textAlign: "center" }} numberOfLines={1}>{account.bank.split(' ')[0]}</Text>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, fontFamily: "Inter_600SemiBold", letterSpacing: 4, textAlign: "center" }}>•• {account.accountNumber.slice(-4)}</Text>
              </Animated.View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// ... Modals
interface EditBalanceModalProps {
  account: Account | null;
  onClose: () => void;
  onSave: (balance: number) => void;
}
function EditBalanceModal({ account, onClose, onSave }: EditBalanceModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(account?.balance.toString() ?? "");
  if (!account) return null;
  const handleSave = () => {
    const num = parseFloat(value.replace(/,/g, ""));
    if (isNaN(num) || num < 0) { Alert.alert("Invalid amount", "Please enter a valid balance."); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(num);
    onClose();
  };
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.editSheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.editTitle, { color: colors.foreground }]}>Update Balance</Text>
          <Text style={[styles.editSub, { color: colors.mutedForeground }]}>{account.bank} • xx{account.accountNumber.slice(-4)}</Text>
          <View style={[styles.amountRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.rupeeSign, { color: colors.mutedForeground }]}>₹</Text>
            <TextInput style={[styles.amountInput, { color: colors.foreground }]} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.mutedForeground} autoFocus selectTextOnFocus />
          </View>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} activeOpacity={0.8}>
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Balance</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ----------------------------------------------------
// MAIN PAGE VIEW
// ----------------------------------------------------

export default function AccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accounts, transactions, updateAccount, deleteAccount, settings } = useData();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [statementAccount, setStatementAccount] = useState<Account | null>(null);
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { filter: txFilter, setFilter: setTxFilter, isExpanded, setIsExpanded } = useTransactionFilter();

  // Reset filter when exiting single card view
  useEffect(() => {
    if (!selectedId) {
      setTxFilter("all");
      setIsExpanded(false);
    }
  }, [selectedId, setTxFilter, setIsExpanded]);

  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return () => {
        if (selectedId) setSelectedId(null);
      };
    }, [selectedId])
  );

  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + a.balance, 0),
    [accounts]
  );

  const visibleAccounts = useMemo(() => {
    if (!selectedId) return accounts;
    return accounts.filter(a => a.id === selectedId);
  }, [accounts, selectedId]);

  const recentSpendsLocal = useMemo(() => {
    if (!selectedId) return [];
    const activeAcc = accounts.find(a => a.id === selectedId);
    if (!activeAcc) return [];
    const suffix = activeAcc.accountNumber.slice(-4);
    
    let filtered = transactions.filter(t => t.accountNumber.endsWith(suffix) || t.accountNumber === activeAcc.accountNumber);
    if (txFilter !== "all") {
      filtered = filtered.filter(t => t.type === txFilter);
    }
    
    return filtered.slice(0, 15);
  }, [selectedId, transactions, accounts, txFilter]);

  const handleCardPress = (account: Account) => {
    if (!selectedId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedId(account.id);
    }
  };

  const handeAction = (action: string, acc: Account) => {
    if (action === "edit") {
      setEditingAccount(acc);
    } else if (action === "stats") {
      setStatementAccount(acc);
    } else if (action === "unlink") {
      Alert.alert(
        "Unlink Account",
        `Are you sure you want to unlink ${acc.bank} xx${acc.accountNumber.slice(-4)}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unlink",
            style: "destructive",
            onPress: () => {
              deleteAccount(acc.id);
              if (selectedId === acc.id) setSelectedId(null);
            }
          }
        ]
      );
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingTop: topInset + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {!selectedId && (
          <Animated.View entering={FadeInUp.duration(300)} exiting={FadeOutUp.duration(200)}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>
              Accounts & Deposits
            </Text>

            <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Balance</Text>
              <Text style={[styles.totalAmount, { color: colors.foreground }]}>₹{totalBalance.toLocaleString("en-IN")}</Text>
              <Text style={[styles.totalSub, { color: colors.mutedForeground }]}>Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}</Text>
            </View>
          </Animated.View>
        )}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, marginTop: 4 }}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, margin: 0 }]}>
            Savings Wallets
          </Text>
          {selectedId !== null && (
            <TouchableOpacity
              onPress={() => setSelectedId(null)}
              hitSlop={10}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Feather name="x-circle" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Inter_500Medium" }}>
                Close View
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stack View Dynamic Container */}
        <Animated.View layout={LinearTransition} style={{ position: "relative", minHeight: selectedId !== null ? 200 : 200 + ((accounts.length - 1) * 60), marginBottom: selectedId ? 16 : 32, zIndex: 10 }}>
          {accounts.map((account, index) => {
            const isSelected = selectedId === account.id;
            const isVisible = selectedId === null || isSelected;

            return (
              <AccountCard
                key={account.id}
                account={account}
                index={index} // Statically lock the layout scale and Z-Index
                totalLength={accounts.length}
                isSingleMode={selectedId !== null}
                visible={isVisible}
                selectedId={selectedId}
                onPressCard={handleCardPress}
                onAction={handeAction}
                colors={colors}
              />
            );
          })}
        </Animated.View>

        {/* Inline Recent Transactions - Visually replaces general Bank Summary */}
        {selectedId && (
          <Animated.View entering={FadeInDown.delay(200).duration(300)} exiting={FadeOutDown.duration(250)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Recent Tracker</Text>
              <FilterTrigger isExpanded={isExpanded} onPress={() => setIsExpanded(!isExpanded)} />
            </View>
            
            <TransactionFilter filter={txFilter} onFilterChange={setTxFilter} isExpanded={isExpanded} />

            <View style={[styles.recentTxBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {recentSpendsLocal.length === 0 ? (
                <Text style={[styles.noActivity, { color: colors.mutedForeground, textAlign: "center", padding: 20 }]}>No recent activity found on this account.</Text>
              ) : (
                recentSpendsLocal.map((tx, idx) => (
                  <TouchableOpacity
                    key={tx.id}
                    style={[styles.recentTxRow, { borderBottomColor: colors.border, borderBottomWidth: idx === recentSpendsLocal.length - 1 ? 0 : 1 }]}
                    onPress={() => setViewingTx(tx)}
                    activeOpacity={0.6}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recentMerchant, { color: colors.foreground }]} numberOfLines={1}>{tx.merchant}</Text>
                      <Text style={[styles.recentCategory, { color: colors.mutedForeground }]}>{tx.category} • {formatUpdated(tx.date)}</Text>
                    </View>
                    <Text style={[styles.recentAmount, { color: tx.type === "credit" ? "#4CD964" : "#EF5350" }]}>
                      {tx.type === "credit" ? "+" : "-"}{settings.currencySymbol}{tx.amount.toLocaleString("en-IN")}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </Animated.View>
        )}

        {/* Bank-wise Summary */}
        {!selectedId && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)} exiting={FadeOutDown.duration(250)}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Bank-wise Summary</Text>
            {accounts.map((account) => {
              const bankColor = BANK_COLORS[account.bank] ?? "#333";
              const pct = totalBalance > 0 ? (account.balance / totalBalance) * 100 : 0;
              return (
                <View key={account.id + "-summary"} style={[styles.summaryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.summaryBar, { backgroundColor: bankColor + "30" }]}>
                    <View style={[styles.summaryFill, { width: `${pct}%` as any, backgroundColor: bankColor }]} />
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={[styles.summaryBank, { color: colors.foreground }]}>{account.bank}</Text>
                    <Text style={[styles.summaryBalance, { color: colors.foreground }]}>₹{account.balance.toLocaleString("en-IN")} ({pct.toFixed(0)}%)</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

      </ScrollView>

      {/* Transaction Details Modal */}
      <TransactionDetailSheet
        transaction={viewingTx}
        onClose={() => setViewingTx(null)}
      />

      {editingAccount && <EditBalanceModal account={editingAccount} onClose={() => setEditingAccount(null)} onSave={(bal) => { updateAccount({ ...editingAccount, balance: bal, lastUpdated: new Date().toISOString() }) }} />}
      <StatementSheet account={statementAccount} transactions={transactions} onClose={() => setStatementAccount(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 20 },
  totalCard: { borderRadius: 18, padding: 20, marginBottom: 24, borderWidth: 1, alignItems: "center" },
  totalLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  totalAmount: { fontSize: 36, fontFamily: "Inter_700Bold", marginBottom: 4 },
  totalSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },

  // Custom Card Aesthetics
  ccShadow: { width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  ccContainer: { height: 195, borderRadius: 24, padding: 22, justifyContent: "space-between", overflow: "hidden" },
  ccHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  ccLogoWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.9)", justifyContent: "center", alignItems: "center" },
  ccBankName: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  ccBankSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  ccFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  ccBalanceLabel: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 6 },
  ccBalanceValue: { color: "#fff", fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  ccAccNum: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontFamily: "Inter_600SemiBold", letterSpacing: 2, marginBottom: 4 },

  // 3D Grid Actions
  actionGridContainer: {
    position: "absolute",
    right: 18,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 1
  },
  actionRow: { flexDirection: "row", gap: 12, width: 120, flexWrap: "wrap", alignContent: "center" },
  actionGridBtn: { alignItems: "center", width: 54 },
  actionGridIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  actionGridText: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginTop: 8, textAlign: "center" },

  summaryRow: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  summaryBar: { height: 6, borderRadius: 3, marginBottom: 10, overflow: "hidden" },
  summaryFill: { height: 6, borderRadius: 3 },
  summaryInfo: { flexDirection: "row", justifyContent: "space-between" },
  summaryBank: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  summaryBalance: { fontSize: 14, fontFamily: "Inter_700Bold" },

  // Inline Spends
  recentTxBox: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  recentTxRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18, paddingHorizontal: 16 },
  recentMerchant: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 12 },
  recentCategory: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 4 },
  recentAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  noActivity: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic" },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalOverlayFull: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  editSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  editTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 4 },
  editSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 20 },
  amountRow: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, marginBottom: 16, height: 58 },
  rupeeSign: { fontSize: 22, fontFamily: "Inter_500Medium", marginRight: 8 },
  amountInput: { flex: 1, fontSize: 26, fontFamily: "Inter_700Bold" },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },

  statementCard: { width: "100%", borderRadius: 24, padding: 24, borderWidth: 1 },
  statementTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 4 },
  statementSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 24 },
  statementStatsRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  statementStatBlock: { flex: 1 },
  statementStatLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  statementStatValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statementFooterText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 24 },
  divider: { height: 1 },
});
