import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { CreditAccount, CreditTransaction } from '../types.js';

export class CreditService {
  private db = getFirestore();

  public async getAccount(uid: string): Promise<CreditAccount> {
    const docRef = this.db.collection('creditAccounts').doc(uid);
    const snap = await docRef.get();

    if (!snap.exists) {
      const initialAccount: CreditAccount = {
        uid,
        balance: 150,
        reservedBalance: 0,
        lifetimeUsed: 0,
        tier: 'free',
        updatedAt: new Date().toISOString()
      };
      await docRef.set(initialAccount);
      return initialAccount;
    }

    return snap.data() as CreditAccount;
  }

  public async reserveCredits(
    uid: string,
    amount: number,
    referenceId?: string,
    idempotencyKey?: string
  ): Promise<{ success: boolean; remainingBalance?: number; error?: string }> {
    const accountRef = this.db.collection('creditAccounts').doc(uid);

    return this.db.runTransaction(async (transaction) => {
      // 1. Idempotency Check
      if (idempotencyKey) {
        const txQuery = await this.db
          .collection('creditTransactions')
          .where('idempotencyKey', '==', idempotencyKey)
          .limit(1)
          .get();

        if (!txQuery.empty) {
          const existingTx = txQuery.docs[0].data() as CreditTransaction;
          return { success: true, remainingBalance: existingTx.balanceAfter };
        }
      }

      // 2. Fetch Account within Transaction
      const accountDoc = await transaction.get(accountRef);
      let account: CreditAccount;

      if (!accountDoc.exists) {
        account = {
          uid,
          balance: 150,
          reservedBalance: 0,
          lifetimeUsed: 0,
          tier: 'free',
          updatedAt: new Date().toISOString()
        };
      } else {
        account = accountDoc.data() as CreditAccount;
      }

      if (account.balance < amount) {
        return {
          success: false,
          error: `Insufficient credits. Required: ${amount}, Available: ${account.balance}`
        };
      }

      const newBalance = account.balance - amount;
      const newReserved = account.reservedBalance + amount;

      // Update Account
      transaction.set(
        accountRef,
        {
          balance: newBalance,
          reservedBalance: newReserved,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      // Record Transaction
      const txId = `tx_${uuidv4().substring(0, 10)}`;
      const txRef = this.db.collection('creditTransactions').doc(txId);
      const txRecord: CreditTransaction = {
        id: txId,
        uid,
        amount: -amount,
        type: 'reserve',
        description: `Reserved ${amount} credits for job ${referenceId || ''}`,
        referenceId,
        idempotencyKey,
        balanceAfter: newBalance,
        createdAt: new Date().toISOString()
      };

      transaction.set(txRef, txRecord);

      return { success: true, remainingBalance: newBalance };
    });
  }

  public async settleCredits(uid: string, amount: number, referenceId?: string): Promise<{ success: boolean }> {
    const accountRef = this.db.collection('creditAccounts').doc(uid);

    return this.db.runTransaction(async (transaction) => {
      const snap = await transaction.get(accountRef);
      if (!snap.exists) return { success: false };

      const account = snap.data() as CreditAccount;
      const newReserved = Math.max(0, account.reservedBalance - amount);
      const newLifetime = account.lifetimeUsed + amount;

      transaction.update(accountRef, {
        reservedBalance: newReserved,
        lifetimeUsed: newLifetime,
        updatedAt: new Date().toISOString()
      });

      const txId = `tx_${uuidv4().substring(0, 10)}`;
      const txRef = this.db.collection('creditTransactions').doc(txId);
      transaction.set(txRef, {
        id: txId,
        uid,
        amount: 0,
        type: 'settle',
        description: `Settled ${amount} credits for completed job ${referenceId || ''}`,
        referenceId,
        balanceAfter: account.balance,
        createdAt: new Date().toISOString()
      });

      return { success: true };
    });
  }

  public async refundCredits(
    uid: string,
    amount: number,
    referenceId?: string,
    reason?: string
  ): Promise<{ success: boolean; newBalance?: number }> {
    const accountRef = this.db.collection('creditAccounts').doc(uid);

    return this.db.runTransaction(async (transaction) => {
      const snap = await transaction.get(accountRef);
      if (!snap.exists) return { success: false };

      const account = snap.data() as CreditAccount;
      const newBalance = account.balance + amount;
      const newReserved = Math.max(0, account.reservedBalance - amount);

      transaction.update(accountRef, {
        balance: newBalance,
        reservedBalance: newReserved,
        updatedAt: new Date().toISOString()
      });

      const txId = `tx_${uuidv4().substring(0, 10)}`;
      const txRef = this.db.collection('creditTransactions').doc(txId);
      transaction.set(txRef, {
        id: txId,
        uid,
        amount,
        type: 'refund',
        description: `Refunded ${amount} credits: ${reason || 'Job failed'}`,
        referenceId,
        balanceAfter: newBalance,
        createdAt: new Date().toISOString()
      });

      return { success: true, newBalance };
    });
  }

  public async adminAdjust(
    uid: string,
    delta: number,
    description: string
  ): Promise<{ success: boolean; newBalance: number }> {
    const accountRef = this.db.collection('creditAccounts').doc(uid);

    return this.db.runTransaction(async (transaction) => {
      const snap = await transaction.get(accountRef);
      const account = snap.exists
        ? (snap.data() as CreditAccount)
        : { balance: 0, reservedBalance: 0, lifetimeUsed: 0 };

      const newBalance = Math.max(0, account.balance + delta);
      transaction.set(
        accountRef,
        {
          uid,
          balance: newBalance,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      const txId = `tx_${uuidv4().substring(0, 10)}`;
      const txRef = this.db.collection('creditTransactions').doc(txId);
      transaction.set(txRef, {
        id: txId,
        uid,
        amount: delta,
        type: delta >= 0 ? 'grant' : 'reserve',
        description: `Admin adjustment: ${description}`,
        balanceAfter: newBalance,
        createdAt: new Date().toISOString()
      });

      return { success: true, newBalance };
    });
  }
}

export const creditService = new CreditService();
