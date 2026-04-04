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

function parseSaraswatDebit(sms: string): Partial<Transaction> | null {
  // Debit: A/c no. XXXXXXX is debited with INR <amount> on <date>
  const debitMatch = sms.match(
    /A\/c no\.\s*(\w+)\s+is debited with INR\s+([\d,]+(?:\.\d+)?)\s+on\s+([\d-\/]+)/i
  );
  if (debitMatch) {
    const merchantMatch = sms.match(/towards\s+(?:UPI\/\d+\/)?([^\/\n.]+)/i);
    const balanceMatch = sms.match(
      /Current Bal is INR\s+([\d,]+(?:\.\d+)?)/i
    );
    const merchant = merchantMatch
      ? merchantMatch[1].trim().replace(/\//g, " ").trim()
      : "Unknown";
    return {
      type: "debit",
      accountNumber: debitMatch[1],
      amount: parseFloat(debitMatch[2].replace(/,/g, "")),
      date: debitMatch[3],
      merchant,
      balance: balanceMatch
        ? parseFloat(balanceMatch[1].replace(/,/g, ""))
        : undefined,
      bank: "Saraswat Bank",
      category: detectCategory(merchant),
    };
  }
  return null;
}

function parseSaraswatCredit(sms: string): Partial<Transaction> | null {
  // Credit: A/c no. XXXXXXX is credited with <amount> on <date>
  const creditMatch = sms.match(
    /A\/c no\.\s*(\w+)\s+is credited with\s+([\d,]+(?:\.\d+)?)\s+on\s+([\d-\/]+)/i
  );
  if (creditMatch) {
    const merchantMatch = sms.match(/towards\s+(?:UPI\/\d+\/)?([^\/\n.]+)/i);
    const balanceMatch = sms.match(
      /Current Bal is\s+([\d,]+(?:\.\d+)?)/i
    );
    const merchant = merchantMatch
      ? merchantMatch[1].trim().replace(/\//g, " ").trim()
      : "Unknown";
    return {
      type: "credit",
      accountNumber: creditMatch[1],
      amount: parseFloat(creditMatch[2].replace(/,/g, "")),
      date: creditMatch[3],
      merchant,
      balance: balanceMatch
        ? parseFloat(balanceMatch[1].replace(/,/g, ""))
        : undefined,
      bank: "Saraswat Bank",
      category: "Transfer",
    };
  }
  return null;
}

function parseHDFCDebit(sms: string): Partial<Transaction> | null {
  // HDFC: Sent Rs.<amount> From HDFC Bank A/C *<acc> To <merchant> On <date>
  const amountMatch = sms.match(/Sent Rs\.([\d,]+(?:\.\d+)?)/i);
  const accMatch = sms.match(/A\/C \*(\d+)/i);
  const toMatch = sms.match(/To\s+([^\n]+)/i);
  const dateMatch = sms.match(/On\s+([\d-\/\s]+)/i);

  if (amountMatch && accMatch) {
    const merchant = toMatch ? toMatch[1].trim() : "Unknown";
    return {
      type: "debit",
      accountNumber: accMatch[1],
      amount: parseFloat(amountMatch[1].replace(/,/g, "")),
      date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
      merchant,
      bank: "HDFC Bank",
      category: detectCategory(merchant),
    };
  }
  return null;
}

export function parseSMS(
  smsText: string
): Partial<Transaction> | null {
  const lower = smsText.toLowerCase();

  if (lower.includes("saraswat")) {
    if (lower.includes("debited")) return parseSaraswatDebit(smsText);
    if (lower.includes("credited")) return parseSaraswatCredit(smsText);
  }

  if (lower.includes("hdfc") && lower.includes("sent rs")) {
    return parseHDFCDebit(smsText);
  }

  return null;
}

interface DataContextType {
  transactions: Transaction[];
  accounts: Account[];
  reminders: Reminder[];
  addTransaction: (t: Transaction) => void;
  addTransactionFromSMS: (sms: string) => Transaction | null;
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
      // Update account balance
      if (parsed.balance !== undefined) {
        setAccounts((prev) => {
          const updated = prev.map((acc) =>
            acc.accountNumber === t.accountNumber
              ? { ...acc, balance: t.balance!, lastUpdated: new Date().toISOString() }
              : acc
          );
          saveAccounts(updated);
          return updated;
        });
      }
      return t;
    },
    [addTransaction]
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
