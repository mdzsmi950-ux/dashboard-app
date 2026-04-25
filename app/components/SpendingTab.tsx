import { Txn } from './types';
import SpendingRow from './SpendingRow';
import { fmt, myShare } from './constants';

type Props = {
  allTxns: Txn[];
  updateField: (id: string, field: keyof Txn, val: any) => void;
};

const isReviewedSpendingTxn = (t: Txn) => {
  return (
    (t.label === 'Mine' || t.label === 'Joint') &&
    t.category !== null &&
    t.category !== 'Income'
  );
};

export default function SpendingTab({ allTxns, updateField }: Props) {
  const spendingTxns = allTxns.filter(isReviewedSpendingTxn);

  if (spendingTxns.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: '#888' }}>
        <p style={{ fontSize: 13 }}>No spending transactions yet.</p>
      </div>
    );
  }

  const byMonth: Record<string, Txn[]> = {};

  spendingTxns.forEach(t => {
    const month = t.date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(t);
  });

  const months = Object.keys(byMonth).sort().reverse();

  return (
    <div style={{ paddingBottom: '6rem' }}>
      {months.map(month => {
        const mTxns = byMonth[month];
        const total = mTxns.reduce((sum, t) => sum + myShare(t), 0);

        return (
          <div key={month} style={{ marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <h3 style={{ fontSize: 15, margin: 0 }}>{month}</h3>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {fmt(total)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mTxns.map(t => (
                <SpendingRow key={t.id} t={t} updateField={updateField} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}