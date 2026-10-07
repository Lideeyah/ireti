import type { BankAccount, Transaction } from "../domain/types";
import { institutionById } from "../seed/institutions";
import { generateInstitutionData } from "../seed/transactions";

/**
 * BankConnectionService — the Open Banking layer.
 *
 * Production: an Open Banking aggregator or direct bank APIs under the Nigerian
 * Open Banking framework. Consent is collected by the institution, not by Ìrètí,
 * and credentials never pass through this product.
 *
 * Demo: deterministic seeded accounts and transactions per institution.
 */
export interface ConnectResult {
  ok: boolean;
  accounts?: BankAccount[];
  transactions?: Transaction[];
  reason?: string;
}

export interface BankConnectionService {
  connectBank(params: { businessId: string; institutionId: string; connectionId: string; asOf: Date; seedKey: string; simulateFailure?: boolean }): Promise<ConnectResult>;
  getAccounts(connectionId: string, accounts: BankAccount[]): BankAccount[];
  getBalances(connectionId: string, accounts: BankAccount[]): { accountId: string; balance: number }[];
  getTransactions(accountIds: string[], transactions: Transaction[]): Transaction[];
  refreshConnection(connectionId: string): Promise<{ ok: boolean; syncedAt: string }>;
  disconnectBank(connectionId: string): Promise<{ ok: boolean }>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const demoBankConnectionService: BankConnectionService = {
  async connectBank({ businessId, institutionId, connectionId, asOf, seedKey, simulateFailure }) {
    await delay(1100 + Math.random() * 600);
    if (simulateFailure) {
      return { ok: false, reason: "The institution did not return an authorisation response." };
    }
    const institution = institutionById(institutionId);
    const data = generateInstitutionData({ businessId, institution, connectionId, asOf, seedKey });
    return { ok: true, accounts: data.accounts, transactions: data.transactions };
  },
  getAccounts(connectionId, accounts) {
    return accounts.filter((a) => a.connectionId === connectionId);
  },
  getBalances(connectionId, accounts) {
    return accounts.filter((a) => a.connectionId === connectionId).map((a) => ({ accountId: a.id, balance: a.balance }));
  },
  getTransactions(accountIds, transactions) {
    const set = new Set(accountIds);
    return transactions.filter((t) => set.has(t.accountId));
  },
  async refreshConnection() {
    await delay(700);
    return { ok: true, syncedAt: new Date().toISOString() };
  },
  async disconnectBank() {
    await delay(300);
    return { ok: true };
  },
};
