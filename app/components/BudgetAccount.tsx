'use client';
import { useState } from 'react';
import type { Bill, BudgetIncome, Txn } from './types';
import { fmt, fmtSigned, labelDate, today, inp, addBtn, delBtn } from './constants';

function AmountInput({ value, onCommit }: { value: string; onCommit: (val: string) => void }) {
  const [local, setLocal] = useState(value);
  return <input type="number" value={local} onChange={e => setLocal(e.target.value)} onBlur={() => onCommit(local)} style={{ ...inp, width: 80, textAlign: 'right' }} />;
}

export default function BudgetAccount({ title, bills, income, txns = [], onTogglePaid, onUpdateAmount, onDeleteBill, onDeleteIncome, onAddBill, onAddIncome }: any) {

  const findPaycheck = (date: string) => {
    const d = new Date(date);
    return (txns as Txn[]).find(t => {
      if (!t.merchant?.toUpperCase().includes('INVESTORS TITLE')) return false;
      const diff = Math.abs(new Date(t.date).getTime() - d.getTime()) / 86400000;
      return diff <= 3;
    });
  };
  const [subtab, setSubtab] = useState('overview');
  const [newBill, setNewBill] = useState({ name: '', amount: '', due: '', autopay: false });
  const [newInc, setNewInc] = useState({ date: '', amount: '', label: '' });
  const [confirming, setConfirming] = useState(false);
  const [confirmVal, setConfirmVal] = useState('');

  const sBills = [...bills].sort((a: Bill, b: Bill) => a.due.localeCompare(b.due));
  const sIncome = [...income].sort((a: BudgetIncome, b: BudgetIncome) => a.date.localeCompare(b.date));

  const getCutoff = () => {
    const d = new Date(today); const nm = d.getMonth() + 2;
    const y = nm > 11 ? d.getFullYear() + 1 : d.getFullYear();
    const m = nm > 11 ? 0 : nm;
    return new Date(y, m, 0).toISOString().split('T')[0];
  };

  const confirmBalance = async () => {
    const amt = parseFloat(confirmVal);
    if (isNaN(amt)) return;
    for (const p of sIncome.filter((p: BudgetIncome) => p.date <= today)) await onDeleteIncome(p.id);
    for (const b of sBills.filter((b: Bill) => b.due <= today && !b.paid)) await onDeleteBill(b.id);
    await onAddIncome({ date: today, amount: amt.toFixed(2), label: 'Confirmed balance' });
    setConfirming(false); setConfirmVal('');
  };

  const cutoff = getCutoff();
  const groups = () => {
    const pays = sIncome.filter((p: BudgetIncome) => p.date <= cutoff);
    if (!pays.length) return [];
    let running = 0;
    return pays.map((p: BudgetIncome, i: number, arr: BudgetIncome[]) => {
      const end = arr[i + 1]?.date || cutoff;
      const gb = sBills.filter((b: Bill) => b.due >= p.date && (i === arr.length - 1 ? true : b.due < end));
      const inc = parseFloat(p.amount || '0');
      const spent = gb.reduce((s: number, b: Bill) => s + parseFloat(b.amount || '0'), 0);
      running = running + inc - spent;
      return { pay: p, bills: gb, income: inc, balance: running };
    });
  };

  const tabBtn = (t: string) => ({ padding: '5px 12px', borderRadius: 8, border: 'none', background: subtab === t ? '#f0f0f0' : 'transparent', color: subtab === t ? '#000' : '#888', fontSize: 13, cursor: 'pointer', fontWeight: subtab === t ? 500 : 400 });

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: '1rem' }}>{title}</div>
      {!confirming
        ? <button style={{ ...addBtn, marginBottom: '1rem', fontSize: 12 }} onClick={() => setConfirming(true)}>Confirm balance</button>
        : <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: '0.75rem' }}>
            <input type="number" placeholder="Current balance" value={confirmVal} onChange={e => setConfirmVal(e.target.value)} style={{ ...inp, width: 160 }} />
            <button style={addBtn} onClick={confirmBalance}>Confirm</button>
            <button style={delBtn} onClick={() => { setConfirming(false); setConfirmVal(''); }}>Cancel</button>
          </div>}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', borderBottom: '0.5px solid #EAE4DC', paddingBottom: 8 }}>
        {['overview', 'bills', 'income'].map(t => <button key={t} style={tabBtn(t)} onClick={() => setSubtab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>

      {subtab === 'overview' && (
        <div>
          {groups().length === 0 && <p style={{ fontSize: 13, color: '#888' }}>No income entries yet.</p>}
          {groups().map((g: any, i: number) => (
            <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '0.5px solid #EAE4DC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                {(() => {
                const actual = g.pay.label === 'Paycheck' ? findPaycheck(g.pay.date) : null;
                const displayAmt = actual ? Math.abs(actual.amount) : g.income;
                return (
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {g.pay.label}{' '}
                    <span style={{ fontWeight: 400, color: '#888' }}>{labelDate(g.pay.date)} · {fmt(displayAmt)}</span>
                    {actual && <span style={{ color: '#3A6850', marginLeft: 4, fontSize: 12 }}>✓</span>}
                  </span>
                );
              })()}
                <span style={{ fontSize: 13, fontWeight: 600, color: g.balance >= 0 ? '#2A8A8A' : '#C04830' }}>balance: {fmtSigned(g.balance)}</span>
              </div>
              {g.bills.length === 0
                ? <div style={{ fontSize: 12, color: '#aaa' }}>No bills this period</div>
                : g.bills.map((b: Bill) => (
                  <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px', gap: 10, alignItems: 'center', padding: '8px 0' }}>
                    <span style={{ fontSize: 13, color: b.paid ? '#B0A49A' : '#3A3530', textDecoration: b.paid ? 'line-through' : 'none' }}>{b.name}</span>
                    <span style={{ fontSize: 12, color: '#888', textAlign: 'right' }}>{labelDate(b.due)}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{fmt(parseFloat(b.amount || '0'))}</span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {subtab === 'bills' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
            <input style={inp} placeholder="Name" value={newBill.name} onChange={e => setNewBill({ ...newBill, name: e.target.value })} />
            <input style={inp} placeholder="Amount" type="number" value={newBill.amount} onChange={e => setNewBill({ ...newBill, amount: e.target.value })} />
            <input style={inp} type="date" value={newBill.due} onChange={e => setNewBill({ ...newBill, due: e.target.value })} />
          </div>
          <button style={{ ...addBtn, marginBottom: '0.75rem' }} onClick={() => { onAddBill(newBill); setNewBill({ name: '', amount: '', due: '', autopay: false }); }}>+ Add bill</button>
          {sBills.map((b: Bill) => (
            <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 60px 90px 24px', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '0.5px solid #EAE4DC' }}>
              {b.autopay ? <span style={{ fontSize: 11, color: '#aaa' }}>—</span> : <input type="checkbox" checked={b.paid} onChange={() => onTogglePaid(b.id)} style={{ cursor: 'pointer' }} />}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, textDecoration: b.paid ? 'line-through' : 'none', color: b.paid ? '#aaa' : '#000' }}>{b.name}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{labelDate(b.due)}</div>
              </div>
              <div />
              <AmountInput value={b.amount} onCommit={val => onUpdateAmount(b.id, val)} />
              <button style={delBtn} onClick={() => onDeleteBill(b.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {subtab === 'income' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <input style={inp} type="date" value={newInc.date} onChange={e => setNewInc({ ...newInc, date: e.target.value })} />
            <input style={inp} placeholder="Amount" type="number" value={newInc.amount} onChange={e => setNewInc({ ...newInc, amount: e.target.value })} />
          </div>
          <input style={{ ...inp, marginBottom: 6 }} placeholder="Label (e.g. Paycheck)" value={newInc.label} onChange={e => setNewInc({ ...newInc, label: e.target.value })} />
          <button style={{ ...addBtn, marginBottom: '0.75rem' }} onClick={() => { onAddIncome(newInc); setNewInc({ date: '', amount: '', label: '' }); }}>+ Add</button>
          {sIncome.map((p: BudgetIncome) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '0.5px solid #EAE4DC' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{labelDate(p.date)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(() => {
                  const actual = p.label === 'Paycheck' ? findPaycheck(p.date) : null;
                  return actual
                    ? <span style={{ fontSize: 13, fontWeight: 500, color: '#3A6850' }}>{fmt(Math.abs(actual.amount))} <span style={{ fontSize: 12, color: '#3A6850' }}>✓</span></span>
                    : <span style={{ fontSize: 13, fontWeight: 500, color: '#3A6850' }}>{fmt(parseFloat(p.amount || '0'))}</span>;
                })()}
                <button style={delBtn} onClick={() => onDeleteIncome(p.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}