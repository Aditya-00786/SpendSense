import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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
}

export interface Account {
  id: string;
  bank: string;
  accountNumber: string;
  balance: number;
  lastUpdated: string;
  color: string;
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
  const parts = raw.trim().split("-");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (y && y.length === 4) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return raw;
}

function parseSaraswatDebit(sms: string): Partial<Transaction> | null {
  // New format: "Your a/c no. XX9302 is debited for Rs.899.00 on 03-04-2026 23:16:18 and credited to vpa snitchapparels1.rzp@hdfcbank"
  const newDebit = sms.match(
    /a\/c no\.\s*(XX\d+|\d+)\s+is debited for Rs\.([\d,]+(?:\.\d+)?)\s+on\s+([\d-]+)/i
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
    /a\/c no\.\s*(XX\d+|\d+)\s+is debited for Rs\.([\d,]+(?:\.\d+)?)\s+on\s+([\d-]+)/i
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

export function parseSMS(smsText: string): Partial<Transaction> | null {
  const lower = smsText.toLowerCase();

  // Detect bank from SMS footer
  const isSaraswat = lower.includes("saraswat");
  const isHDFC = lower.includes("hdfc");

  if (isSaraswat) {
    if (lower.includes("debited")) return parseSaraswatDebit(smsText);
    if (lower.includes("credited")) return parseSaraswatCredit(smsText);
  }

  if (isHDFC) {
    if (lower.includes("sent rs")) return parseHDFCDebit(smsText);
    if (lower.includes("debited")) return parseHDFCDebit(smsText);
  }

  return null;
}

interface DataContextType {
  transactions: Transaction[];
  accounts: Account[];
  reminders: Reminder[];
  addTransaction: (t: Transaction) => void;
  addTransactionFromSMS: (sms: string) => Transaction | null;
  updateTransaction: (t: Transaction) => void;
  updateAccount: (account: Account) => void;
  addReminder: (r: Reminder) => void;
  updateReminder: (r: Reminder) => void;
  deleteReminder: (id: string) => void;
  deleteTransaction: (id: string) => void;
  categories: string[];
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [txData, accData, remData] = await Promise.all([
        AsyncStorage.getItem("transactions"),
        AsyncStorage.getItem("accounts"),
        AsyncStorage.getItem("reminders"),
      ]);
      if (txData) setTransactions(JSON.parse(txData));
      if (accData) setAccounts(JSON.parse(accData));
      if (remData) setReminders(JSON.parse(remData));
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
    (sms: string): Transaction | null => {
      const parsed = parseSMS(sms);
      if (!parsed) return null;
      const t: Transaction = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: parsed.type ?? "debit",
        amount: parsed.amount ?? 0,
        merchant: parsed.merchant ?? "Unknown",
        category: parsed.category ?? "Other",
        date: parsed.date ?? new Date().toISOString().split("T")[0],
        bank: parsed.bank ?? "Unknown",
        accountNumber: parsed.accountNumber ?? "",
        balance: parsed.balance,
        rawSMS: sms,
      };
      addTransaction(t);
      // Update or auto-create account when balance is parsed from SMS
      if (parsed.balance !== undefined) {
        setAccounts((prev) => {
          const suffix4 = t.accountNumber.slice(-4); // always 4 digits
          const bankKey = t.bank;
          let matched = false;
          const updated = prev.map((acc) => {
            const acc4 = acc.accountNumber.slice(-4);
            if (acc4 === suffix4 && acc.bank === bankKey) {
              matched = true;
              return { ...acc, balance: parsed.balance!, lastUpdated: new Date().toISOString() };
            }
            return acc;
          });
          if (!matched) {
            // Auto-create account for this bank/number
            const BANK_COLORS: Record<string, string> = {
              "HDFC Bank": "#003087",
              "Saraswat Bank": "#8B1A1A",
            };
            updated.push({
              id: "acc_" + Date.now(),
              bank: bankKey,
              accountNumber: suffix4,
              balance: parsed.balance!,
              lastUpdated: new Date().toISOString(),
              color: BANK_COLORS[bankKey] ?? "#333",
            });
          }
          saveAccounts(updated);
          return updated;
        });
      }
      return t;
    },
    [addTransaction]
  );

  const updateTransaction = useCallback(
    (t: Transaction) => {
      setTransactions((prev) => {
        const updated = prev.map((tx) => (tx.id === t.id ? t : tx));
        saveTransactions(updated);
        return updated;
      });
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
        categories: CATEGORIES,
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
