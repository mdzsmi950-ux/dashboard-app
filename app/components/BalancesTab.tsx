'use client';
import type { Account, ManualAccount, Txn } from './types';
import { fmt, inp } from './constants';

type Props = {
  accounts: Account[];
  manualAccountsDb: ManualAccount[];
  txns: Txn[];
  archivedTxns: Txn[];
  updateManualBalance: (id: number, balance: number) => void;
};

export default function BalancesTab({ accounts, manualAccountsDb, txns, archivedTxns, updateManualBalance }: Props) {
  const displayPositive = accounts.filter(a => a.type !== 'credit' && a.type !== 'loan');
  const displayNegative = accounts.filter(a => a.type === 'credit' || a.type === 'loan');

  const allTxnAccounts = new Set([...txns, ...archivedTxns].map(t => t.account).filter(Boolean));
  const manualAccountsWithBalance = manualAccountsDb
    .filter(ma => allTxnAccounts.has(ma.name))
    .map(ma => {
      const laterTxns = [...txns, ...archivedTxns].filter(t => t.account === ma.name && t.date > ma.balance_date);
      const txnTotal = laterTxns.reduce((s, t) => s + t.amount, 0);
      return { ...ma, effectiveBalance: ma.balance + txnTotal };
    });

  if (accounts.length === 0 && manualAccountsWithBalance.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: '#888' }}>
        <p style={{ fontSize: 15, marginBottom: 8 }}>No accounts loaded</p>
        <p style={{ fontSize: 13 }}>Click "Connect" to link your account</p>
      </div>
    );
  }

  return (
    <>
      {displayPositive.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Assets</p>
          <div style={{ border: '0.5px solid #eee', borderRadius: 12, overflow: 'hidden', marginBottom: '1.25rem' }}>
            {displayPositive.map((a, i) => (
              <div key={a.account_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: i === 0 ? 'none' : '0.5px solid #eee' }}>
                <div><p style={{ fontSize: 13, margin: '0 0 2px' }}>{a.name}</p><p style={{ fontSize: 11, color: '#888', margin: 0, textTransform: 'capitalize' }}>{a.subtype}</p></div>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#3A5068' }}>{fmt(a.current_balance || 0)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {(displayNegative.length > 0 || manualAccountsWithBalance.length > 0) && (
        <>
          <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Debts</p>
          <div style={{ border: '0.5px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
            {displayNegative.map((a, i) => (
              <div key={a.account_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: i === 0 ? 'none' : '0.5px solid #eee' }}>
                <div><p style={{ fontSize: 13, margin: '0 0 2px' }}>{a.name}</p><p style={{ fontSize: 11, color: '#888', margin: 0, textTransform: 'capitalize' }}>{a.subtype}</p></div>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#683A52' }}>{fmt(a.current_balance || 0)}</span>
              </div>
            ))}
            {manualAccountsWithBalance.map((ma, i) => (
              <div key={ma.id} style={{ borderTop: (displayNegative.length > 0 || i > 0) ? '0.5px solid #eee' : 'none', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><p style={{ fontSize: 13, margin: '0 0 2px' }}>{ma.name}</p><p style={{ fontSize: 11, color: '#888', margin: 0 }}>manual · credit card</p></div>
                  <span style={{ fontSize: 15, fontWeight: 500, color: '#683A52' }}>{fmt(ma.effectiveBalance)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: '#aaa' }}>Set base balance:</span>
                  <input type="number" defaultValue={ma.balance} key={ma.id + '-' + ma.balance} onBlur={e => updateManualBalance(ma.id, parseFloat(e.target.value) || 0)} style={{ ...inp, width: 100, fontSize: 12 }} />
                  <span style={{ fontSize: 11, color: '#aaa' }}>as of today</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}