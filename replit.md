# SpendSense - Expense Tracker

## Overview

An iPhone expense tracking app built with Expo (React Native) that automatically parses bank SMS messages to log transactions. Dark-themed, inspired by professional fintech apps.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile**: Expo (React Native) with Expo Router (file-based routing)
- **API framework**: Express 5 (existing, not used by mobile for first build)
- **Database**: PostgreSQL + Drizzle ORM (existing, not used by mobile)
- **State**: React Context + AsyncStorage for local persistence
- **Charts**: react-native-svg (DonutChart, BarChart)

## Features

### SMS Parsing
Supports automatic parsing of:
- **Saraswat Bank** debit and credit SMS formats
- **HDFC Bank** UPI debit SMS format

### Screens
1. **Home** (`/`) — Monthly overview with donut chart, spending stats, recent transactions, SMS parser + manual add transaction modals
2. **Analytics** (`/analytics`) — Monthly/category trends, bar chart, category breakdown with budget tracking, merchant breakdown
3. **Accounts** (`/accounts`) — Savings accounts by bank (HDFC & Saraswat), balances, recent account activity, bank-wise distribution chart
4. **Reminders** (`/reminders`) — Payment reminders with due labels, mark as paid, add/delete reminders

## Key Files

- `artifacts/mobile/context/DataContext.tsx` — Global state, SMS parsing logic, AsyncStorage persistence
- `artifacts/mobile/constants/colors.ts` — Dark theme color tokens (dark + light)
- `artifacts/mobile/app/(tabs)/` — All tab screens
- `artifacts/mobile/components/` — DonutChart, BarChart, TransactionCard, SMSParser, AddTransactionModal, AddReminderModal

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/mobile run dev` — run Expo app locally
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## SMS Formats Supported

**Saraswat Bank debit:**
`Your A/c no. <acc> is debited with INR <amount> on <date> towards UPI/.../<merchant>/... Current Bal is INR <balance> CR - Saraswat Bank`

**Saraswat Bank credit:**
`Your A/c no. <acc> is credited with <amount> on <date> towards UPI/.../<merchant>/... Current Bal is <balance> CR - Saraswat Bank`

**HDFC Bank debit:**
`Sent Rs.<amount>\nFrom HDFC Bank A/C *<acc>\nTo <merchant>\nOn <date>\n...`
