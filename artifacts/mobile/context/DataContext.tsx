import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert, Platform, ToastAndroid } from "react-native";

export type TransactionType = "debit" | "credit";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  balance?: number;
  merchant: string;
  category: string;
  date: string;
  bank: string;
  accountNumber: string;
  rawSMS?: string;
  note?: string;
  refNo?: string;
}

export interface Account {
  id: string;
  bank: string;
  accountNumber: string;
  balance: number;
  lastUpdated: string;
  lastFirmBalanceDate?: string; // Tracks the newest timestamp a definitive balance was established
  fallbackBalanceUpdate?: boolean; // Determines if missing explicit balance updates are differentially padded
  color: string;
}

export interface AppSettings {
  name: string;
  currencySymbol: string;
  showNetCategoryBreakdown?: boolean;
  showNetMultiColorTrends?: boolean;
  showDebitIncomePct?: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  type: "bill" | "emi" | "subscription" | "other";
  recurrence: "once" | "monthly" | "weekly";
}

const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "Utilities",
  "Healthcare",
  "Education",
  "Travel",
  "Transfer",
  "Other",
];

const MERCHANT_CATEGORIES: Record<string, string> = {
  zomato: "Food & Dining",
  swiggy: "Food & Dining",
  myntra: "Shopping",
  amazon: "Shopping",
  flipkart: "Shopping",
  uber: "Transport",
  ola: "Transport",
  rapido: "Transport",
  irctc: "Travel",
  makemytrip: "Travel",
  netflix: "Entertainment",
  spotify: "Entertainment",
  hotstar: "Entertainment",
  electricity: "Utilities",
  bescom: "Utilities",
  airtel: "Utilities",
  jio: "Utilities",
  bsnl: "Utilities",
  hospital: "Healthcare",
  pharmacy: "Healthcare",
  school: "Education",
  college: "Education",
  cred: "Transfer",
  paytm: "Transfer",
  phonepe: "Transfer",
  gpay: "Transfer",
};

function detectCategory(merchant: string): string {
  const lowerMerchant = merchant.toLowerCase();
  for (const [key, category] of Object.entries(MERCHANT_CATEGORIES)) {
    if (lowerMerchant.includes(key)) return category;
  }
  return "Other";
}

// Clean VPA merchant name: "snitchapparels1.rzp@hdfcbank" → "Snitchapparels1"
function cleanVPAMerchant(vpa: string): string {
  const localPart = vpa.split("@")[0];
  const cleaned = localPart.replace(/\.(rzp|paytm|phonepe|gpay|upi|icici|axis|sbi|ybl|ok|ibl|freecharge|mobikwik)$/i, "");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Extract last 4 digits from any account string: "XX9302" → "9302", "229302" → "9302", "2233" → "2233"
function extractAccSuffix(raw: string): string {
  const stripped = raw.replace(/^X+/i, "").trim();
  return stripped.length > 4 ? stripped.slice(-4) : stripped;
}

// Parse date "03-04-2026" from various formats, returns ISO date string
function parseDate(raw: string): string {
  const parts = raw.trim().split(/[-/]/);
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y && y.length === 2) {
      y = "20" + y;
    }
    if (y && y.length === 4) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  return raw;
}

function parseSaraswatDebit(sms: string): Partial<Transaction> | null {
  // New format: "Your a/c no. XX9302 is debited for Rs.899.00 on 03-04-2026 23:16:18 and credited to vpa snitchapparels1.rzp@hdfcbank"
  const newDebit = sms.match(
    /a\/c no\.\s*(XX\d+|\d+)\s+is debited for Rs\.([\d,]+(?:\.\d+)?)\s+on\s+([\d-\/]+)/i
  );
  if (newDebit) {
    const vpaMatch = sms.match(/credited to vpa\s+(\S+)/i);
    const balanceMatch = sms.match(/Current Balance is INR\s+([\d,]+(?:\.\d+)?)/i);
    const merchant = vpaMatch ? cleanVPAMerchant(vpaMatch[1]) : "Unknown";
    return {
      type: "debit",
      accountNumber: extractAccSuffix(newDebit[1]),
      amount: parseFloat(newDebit[2].replace(/,/g, "")),
      date: parseDate(newDebit[3]),
      merchant,
      balance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      bank: "Saraswat Bank",
      category: detectCategory(merchant),
    };
  }

  // Old format: "A/c no. XXXXXXX is debited with INR <amount> on <date>"
  const oldDebit = sms.match(
    /A\/c no\.\s*(\w+)\s+is debited with INR\s+([\d,]+(?:\.\d+)?)\s+on\s+([\d-\/]+)/i
  );
  if (oldDebit) {
    const merchantMatch = sms.match(/towards\s+(?:UPI\/\d+\/)?([^\/\n.]+)/i);
    const balanceMatch = sms.match(/Current Bal is INR\s+([\d,]+(?:\.\d+)?)/i);
    const merchant = merchantMatch ? merchantMatch[1].trim().replace(/\//g, " ").trim() : "Unknown";
    return {
      type: "debit",
      accountNumber: extractAccSuffix(oldDebit[1]),
      amount: parseFloat(oldDebit[2].replace(/,/g, "")),
      date: parseDate(oldDebit[3]),
      merchant,
      balance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      bank: "Saraswat Bank",
      category: detectCategory(merchant),
    };
  }

  return null;
}

function parseSaraswatCredit(sms: string): Partial<Transaction> | null {
  // New format: "Your A/c no. 229302 is credited with INR 1,749.00 on 03-04-2026 towards UPI/.../WWW MYNTRA/..."
  const creditMatch = sms.match(
    /A\/c no\.\s*([\w]+)\s+is credited with INR\s+([\d,]+(?:\.\d+)?)\s+on\s+([\d-\/]+)/i
  );
  if (creditMatch) {
    const merchantMatch = sms.match(/towards\s+(?:UPI\/\d+\/)?([^\/\n]+)/i);
    const balanceMatch = sms.match(/Current Bal is INR\s+([\d,]+(?:\.\d+)?)/i);
    const raw = merchantMatch ? merchantMatch[1].trim().split("/")[0].trim() : "Unknown";
    const merchant = raw.replace(/^WWW\s+/i, "").trim() || "Unknown";
    return {
      type: "credit",
      accountNumber: extractAccSuffix(creditMatch[1]),
      amount: parseFloat(creditMatch[2].replace(/,/g, "")),
      date: parseDate(creditMatch[3]),
      merchant,
      balance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      bank: "Saraswat Bank",
      category: detectCategory(merchant),
    };
  }

  // Old format without INR keyword
  const oldCredit = sms.match(
    /A\/c no\.\s*(\w+)\s+is credited with\s+([\d,]+(?:\.\d+)?)\s+on\s+([\d-\/]+)/i
  );
  if (oldCredit) {
    const merchantMatch = sms.match(/towards\s+(?:UPI\/\d+\/)?([^\/\n.]+)/i);
    const balanceMatch = sms.match(/Current Bal is\s+([\d,]+(?:\.\d+)?)/i);
    const merchant = merchantMatch ? merchantMatch[1].trim().replace(/\//g, " ").trim() : "Unknown";
    return {
      type: "credit",
      accountNumber: extractAccSuffix(oldCredit[1]),
      amount: parseFloat(oldCredit[2].replace(/,/g, "")),
      date: parseDate(oldCredit[3]),
      merchant,
      balance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      bank: "Saraswat Bank",
      category: detectCategory(merchant),
    };
  }

  return null;
}

function parseHDFCDebit(sms: string): Partial<Transaction> | null {
  // New format (same structure as Saraswat debit but ends with "- HDFC Bank" or contains "HDFC")
  const newDebit = sms.match(
    /a\/c no\.\s*(XX\d+|\d+)\s+is debited for Rs\.([\d,]+(?:\.\d+)?)\s+on\s+([\d-\/]+)/i
  );
  if (newDebit) {
    const vpaMatch = sms.match(/credited to vpa\s+(\S+)/i);
    const balanceMatch = sms.match(/Current Balance is INR\s+([\d,]+(?:\.\d+)?)/i);
    const merchant = vpaMatch ? cleanVPAMerchant(vpaMatch[1]) : "Unknown";
    return {
      type: "debit",
      accountNumber: extractAccSuffix(newDebit[1]),
      amount: parseFloat(newDebit[2].replace(/,/g, "")),
      date: parseDate(newDebit[3]),
      merchant,
      balance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      bank: "HDFC Bank",
      category: detectCategory(merchant),
    };
  }

  // Old format: "Sent Rs.<amount> From HDFC Bank A/C *<acc> To <merchant> On <date>"
  const amountMatch = sms.match(/Sent Rs\.([\d,]+(?:\.\d+)?)/i);
  const accMatch = sms.match(/A\/C \*(\d+)/i);
  const toMatch = sms.match(/To\s+([^\n]+)/i);
  const dateMatch = sms.match(/On\s+([\d-\/]+)/i);
  if (amountMatch && accMatch) {
    const merchant = toMatch ? toMatch[1].trim() : "Unknown";
    return {
      type: "debit",
      accountNumber: accMatch[1],
      amount: parseFloat(amountMatch[1].replace(/,/g, "")),
      date: dateMatch ? parseDate(dateMatch[1].trim()) : new Date().toISOString().split("T")[0],
      merchant,
      bank: "HDFC Bank",
      category: detectCategory(merchant),
    };
  }

  return null;
}

function parseHFDCCredit(sms: string): Partial<Transaction> | null {
  const match = sms.match(/Rs\.([\d,]+(?:\.\d+)?)\s+credited to.*A\/c\s+(XX\d+|\d+)\s+on\s+([\d-\/]+)/i);
  if (match) {
    const vpaMatch = sms.match(/from VPA\s+([^\s]+)/i);
    const fromMatch = sms.match(/from\s+([^\(]+?)\s*(?:\(UPI|$)/i);
    const balanceMatch = sms.match(/Current Balance is INR\s+([\d,]+(?:\.\d+)?)/i);
    
    let rawMerchant = "Unknown";
    if (vpaMatch) rawMerchant = cleanVPAMerchant(vpaMatch[1]);
    else if (fromMatch) rawMerchant = fromMatch[1].trim();

    return {
      type: "credit",
      accountNumber: extractAccSuffix(match[2]),
      amount: parseFloat(match[1].replace(/,/g, "")),
      date: parseDate(match[3]),
      merchant: rawMerchant,
      balance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      bank: "HDFC Bank",
      category: detectCategory(rawMerchant),
    };
  }
  return null;
}

export function parseSMS(smsText: string): Partial<Transaction> | null {
  const lower = smsText.toLowerCase();

  // Detect bank from SMS footer
  const isSaraswat = lower.includes("saraswat");
  const isHDFC = lower.includes("hdfc");
  
  let parsed: Partial<Transaction> | null = null;

  if (isSaraswat) {
    if (lower.includes("debited")) parsed = parseSaraswatDebit(smsText);
    else if (lower.includes("credited")) parsed = parseSaraswatCredit(smsText);
  }

  if (isHDFC && !parsed) {
    if (lower.includes("sent rs")) parsed = parseHDFCDebit(smsText);
    else if (lower.includes("debited")) parsed = parseHDFCDebit(smsText);
    else if (lower.includes("credited")) parsed = parseHFDCCredit(smsText);
  }

  if (parsed) {
    const patterns = [
      /(?:UPI(?: Ref\.?\s*No\.?)?)[\s-:\/]*([A-Za-z0-9]{6,15})/i,
      /(?:Ref\.?\s*No\.?|Ref|UTR)[\s-:\/]*([A-Za-z0-9]{6,15})/i,
      /IMPS(?:[\s-]+[A-Za-z\s]+[\s-]+|[\s-:]*)([A-Za-z0-9]{6,15})/i
    ];
    for (const p of patterns) {
      const match = smsText.match(p);
      if (match) {
        parsed.refNo = match[1];
        break;
      }
    }
  }

  return parsed;
}

interface DataContextType {
  transactions: Transaction[];
  accounts: Account[];
  reminders: Reminder[];
  addTransaction: (t: Transaction) => void;
  addTransactionFromSMS: (sms: string) => Transaction | "duplicate" | null;
  updateTransaction: (t: Transaction) => void;
  updateAccount: (account: Account) => void;
  addReminder: (r: Reminder) => void;
  updateReminder: (r: Reminder) => void;
  deleteReminder: (id: string) => void;
  deleteTransaction: (id: string) => void;
  deleteAccount: (id: string) => void;
  categories: string[];
  settings: AppSettings;
  updateSettings: (s: AppSettings) => void;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    type: "debit",
    amount: 220,
    merchant: "Zomato",
    category: "Food & Dining",
    date: "2024-05-26",
    bank: "HDFC Bank",
    accountNumber: "2233",
    note: "Dinner",
  },
  {
    id: "2",
    type: "debit",
    amount: 360,
    merchant: "Uber",
    category: "Transport",
    date: "2024-05-19",
    bank: "HDFC Bank",
    accountNumber: "2233",
    note: "Office",
  },
  {
    id: "3",
    type: "debit",
    amount: 1400,
    merchant: "Decathlon",
    category: "Shopping",
    date: "2024-05-16",
    bank: "Saraswat Bank",
    accountNumber: "1234567",
    note: "Badminton shuttle",
  },
  {
    id: "4",
    type: "debit",
    amount: 1400,
    merchant: "1mg",
    category: "Healthcare",
    date: "2024-05-10",
    bank: "Saraswat Bank",
    accountNumber: "1234567",
  },
  {
    id: "5",
    type: "credit",
    amount: 45000,
    merchant: "Axio",
    category: "Transfer",
    date: "2024-05-02",
    bank: "HDFC Bank",
    accountNumber: "2233",
    note: "Salary",
  },
  {
    id: "6",
    type: "debit",
    amount: 3527,
    merchant: "Myntra",
    category: "Shopping",
    date: "2024-05-14",
    bank: "HDFC Bank",
    accountNumber: "2233",
  },
  {
    id: "7",
    type: "debit",
    amount: 3973,
    merchant: "IRCTC",
    category: "Travel",
    date: "2024-05-12",
    bank: "Saraswat Bank",
    accountNumber: "1234567",
  },
  {
    id: "8",
    type: "debit",
    amount: 2702,
    merchant: "BigBasket",
    category: "Food & Dining",
    date: "2024-05-08",
    bank: "HDFC Bank",
    accountNumber: "2233",
  },
  {
    id: "9",
    type: "debit",
    amount: 4004,
    merchant: "Netflix",
    category: "Entertainment",
    date: "2024-05-05",
    bank: "HDFC Bank",
    accountNumber: "2233",
  },
];

const DEMO_ACCOUNTS: Account[] = [
  {
    id: "acc1",
    bank: "HDFC Bank",
    accountNumber: "2233",
    balance: 6051,
    lastUpdated: new Date().toISOString(),
    color: "#003087",
  },
  {
    id: "acc2",
    bank: "Saraswat Bank",
    accountNumber: "1234567",
    balance: 352500,
    lastUpdated: new Date().toISOString(),
    color: "#8B1A1A",
  },
];

const DEMO_REMINDERS: Reminder[] = [
  {
    id: "rem1",
    title: "Axio Pay Later",
    amount: 1200,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    isPaid: false,
    type: "emi",
    recurrence: "monthly",
  },
  {
    id: "rem2",
    title: "HDFC Credit Card",
    amount: 3400,
    dueDate: new Date().toISOString(),
    isPaid: false,
    type: "bill",
    recurrence: "monthly",
  },
  {
    id: "rem3",
    title: "BESCOM Electricity",
    amount: 1200,
    dueDate: new Date().toISOString(),
    isPaid: false,
    type: "bill",
    recurrence: "monthly",
  },
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] =
    useState<Transaction[]>(DEMO_TRANSACTIONS);
  const [accounts, setAccounts] = useState<Account[]>(DEMO_ACCOUNTS);
  const [reminders, setReminders] = useState<Reminder[]>(DEMO_REMINDERS);
  const [merchantRules, setMerchantRules] = useState<Record<string, { merchant: string; category: string }>>({});
  const [settings, setSettings] = useState<AppSettings>({ name: "User", currencySymbol: "₹" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [txData, accData, remData, rulesData, settingsData] = await Promise.all([
        AsyncStorage.getItem("transactions"),
        AsyncStorage.getItem("accounts"),
        AsyncStorage.getItem("reminders"),
        AsyncStorage.getItem("merchantRules"),
        AsyncStorage.getItem("appSettings"),
      ]);
      if (txData) setTransactions(JSON.parse(txData));
      if (accData) setAccounts(JSON.parse(accData));
      if (remData) setReminders(JSON.parse(remData));
      if (rulesData) setMerchantRules(JSON.parse(rulesData));
      if (settingsData) setSettings(JSON.parse(settingsData));
    } catch {
      // use defaults
    }
    setIsLoading(false);
  };

  const saveTransactions = async (data: Transaction[]) => {
    await AsyncStorage.setItem("transactions", JSON.stringify(data));
  };

  const saveAccounts = async (data: Account[]) => {
    await AsyncStorage.setItem("accounts", JSON.stringify(data));
  };

  const saveReminders = async (data: Reminder[]) => {
    await AsyncStorage.setItem("reminders", JSON.stringify(data));
  };

  const addTransaction = useCallback(
    (t: Transaction) => {
      const updated = [t, ...transactions];
      setTransactions(updated);
      saveTransactions(updated);
    },
    [transactions]
  );

  const addTransactionFromSMS = useCallback(
    (sms: string): Transaction | "duplicate" | null => {
      const parsed = parseSMS(sms);
      if (!parsed) return null;
      
      if (parsed.refNo) {
        const isDuplicate = transactions.some((tx) => tx.refNo === parsed.refNo);
        if (isDuplicate) {
          return "duplicate";
        }
      }

      let finalMerchant = parsed.merchant ?? "Unknown";
      let finalCategory = parsed.category ?? "Other";
      const rule = merchantRules[finalMerchant.toLowerCase()];
      if (rule) {
        finalMerchant = rule.merchant;
        finalCategory = rule.category;
      }

      const t: Transaction = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: parsed.type ?? "debit",
        amount: parsed.amount ?? 0,
        merchant: finalMerchant,
        category: finalCategory,
        date: parsed.date ?? new Date().toISOString().split("T")[0],
        bank: parsed.bank ?? "Unknown",
        accountNumber: parsed.accountNumber ?? "",
        balance: parsed.balance,
        rawSMS: sms,
        refNo: parsed.refNo,
      };
      addTransaction(t);
      // Update or auto-create account whenever we successfully parse a known bank and account number
      if (t.bank && t.bank !== "Unknown" && t.accountNumber) {
        setAccounts((prev) => {
          const suffix4 = t.accountNumber.slice(-4);
          const bankKey = t.bank;
          let matched = false;
          let modified = false;

          const txDate = new Date(t.date).getTime();

          const updated = prev.map((acc) => {
            const acc4 = acc.accountNumber.slice(-4);
            if (acc4 === suffix4 && acc.bank === bankKey) {
              matched = true;
              
              let applyChanges = false;
              let nextBalance = acc.balance;
              let nextFirmDate = acc.lastFirmBalanceDate;
              
              const firmDate = acc.lastFirmBalanceDate ? new Date(acc.lastFirmBalanceDate).getTime() : 0;
              
              if (parsed.balance !== undefined) {
                if (txDate >= firmDate) {
                  applyChanges = true;
                  nextBalance = parsed.balance;
                  nextFirmDate = t.date;
                }
              } else if (acc.fallbackBalanceUpdate) {
                if (txDate >= firmDate) {
                  applyChanges = true;
                  nextBalance += (t.type === "debit" ? -t.amount : t.amount);
                }
              }
              
              if (applyChanges) {
                modified = true;
                return { ...acc, balance: nextBalance, lastUpdated: new Date().toISOString(), lastFirmBalanceDate: nextFirmDate };
              }
            }
            return acc;
          });

          if (!matched) {
            // Auto-create account for this bank/number
            modified = true;
            
            let initialBalance = parsed.balance !== undefined ? parsed.balance : 0;
            let initialFirmDate = parsed.balance !== undefined ? t.date : undefined;

            const BANK_COLORS: Record<string, string> = {
              "HDFC Bank": "#003087",
              "Saraswat Bank": "#8B1A1A",
            };
            updated.push({
              id: "acc_" + Date.now(),
              bank: bankKey,
              accountNumber: suffix4,
              balance: initialBalance,
              lastUpdated: new Date().toISOString(),
              lastFirmBalanceDate: initialFirmDate,
              color: BANK_COLORS[bankKey] ?? "#333",
            });
          }

          if (modified) {
            saveAccounts(updated);
            return updated;
          }
          return prev;
        });
      }
      return t;
    },
    [addTransaction, merchantRules]
  );

  const updateSettings = useCallback((s: AppSettings) => {
    setSettings(s);
    AsyncStorage.setItem("appSettings", JSON.stringify(s));
  }, []);

  const updateTransaction = useCallback(
    (t: Transaction) => {
      setTransactions((prev) => {
        const updated = prev.map((tx) => (tx.id === t.id ? t : tx));
        saveTransactions(updated);
        return updated;
      });

      if (t.rawSMS) {
        const parsedOriginal = parseSMS(t.rawSMS);
        if (parsedOriginal && parsedOriginal.merchant) {
          const origMerchantLower = parsedOriginal.merchant.toLowerCase();
          setMerchantRules((prev) => {
            const updated = { ...prev };
            if (
              t.merchant === parsedOriginal.merchant &&
              t.category === parsedOriginal.category
            ) {
              delete updated[origMerchantLower];
            } else {
              updated[origMerchantLower] = {
                merchant: t.merchant,
                category: t.category,
              };
            }
            AsyncStorage.setItem("merchantRules", JSON.stringify(updated));
            return updated;
          });
        }
      }
    },
    []
  );

  const updateAccount = useCallback(
    (account: Account) => {
      setAccounts((prev) => {
        const updated = prev.map((a) =>
          a.id === account.id ? account : a
        );
        saveAccounts(updated);
        return updated;
      });
    },
    []
  );

  const deleteAccount = useCallback(
    (id: string) => {
      setAccounts((prev) => {
        const deletedAccount = prev.find((a) => a.id === id);
        const updated = prev.filter((a) => a.id !== id);
        saveAccounts(updated);

        // Also sweep any transactions belonging to this unlinked account
        if (deletedAccount) {
          const deletedBank = deletedAccount.bank;
          const deletedAcc4 = deletedAccount.accountNumber.slice(-4);

          setTransactions((prevTx) => {
            const updatedTx = prevTx.filter((tx) => {
              const txAcc4 = tx.accountNumber ? tx.accountNumber.slice(-4) : "";
              const match = tx.bank === deletedBank && txAcc4 === deletedAcc4;
              return !match;
            });
            saveTransactions(updatedTx);
            return updatedTx;
          });
        }

        return updated;
      });
    },
    []
  );

  const addReminder = useCallback(
    (r: Reminder) => {
      setReminders((prev) => {
        const updated = [r, ...prev];
        saveReminders(updated);
        return updated;
      });
    },
    []
  );

  const updateReminder = useCallback(
    (r: Reminder) => {
      setReminders((prev) => {
        const updated = prev.map((rem) => (rem.id === r.id ? r : rem));
        saveReminders(updated);
        return updated;
      });
    },
    []
  );

  const deleteReminder = useCallback(
    (id: string) => {
      setReminders((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        saveReminders(updated);
        return updated;
      });
    },
    []
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        saveTransactions(updated);
        return updated;
      });
    },
    []
  );

  return (
    <DataContext.Provider
      value={{
        transactions,
        accounts,
        reminders,
        addTransaction,
        addTransactionFromSMS,
        updateTransaction,
        updateAccount,
        addReminder,
        updateReminder,
        deleteReminder,
        deleteTransaction,
        deleteAccount,
        categories: CATEGORIES,
        settings,
        updateSettings,
        isLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
