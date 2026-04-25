'use client'

import { useEffect, useState } from 'react'

type Txn = {
  id: string
  name: string
  amount: number
  date: string
  label: string | null
  category: string | null
  archived: boolean
}

export default function Page() {
  const [activeTxns, setActiveTxns] = useState<Txn[]>([])
  const [archivedTxns, setArchivedTxns] = useState<Txn[]>([])
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => {
        setActiveTxns(data.filter((t: Txn) => !t.archived))
        setArchivedTxns(data.filter((t: Txn) => t.archived))
      })
  }, [])

  const isCompleteForArchive = (txn: Txn) => {
    return (
      ['Maddie', 'Joint'].includes(txn.label || '') &&
      ['Needs', 'Wants', 'Impulse', 'Income'].includes(txn.category || '')
    )
  }

  const updateField = async (id: string, field: keyof Txn, val: any) => {
    const txn = activeTxns.find(t => t.id === id)
    if (!txn) return

    const updatedTxn: Txn = {
      ...txn,
      [field]: val,
      ...(field === 'label' && val === 'Ignore' ? { category: null } : {}),
    }

    const shouldArchive =
      updatedTxn.label === 'Ignore' || isCompleteForArchive(updatedTxn)

    if (shouldArchive) {
      setActiveTxns(prev => prev.filter(t => t.id !== id))
      setArchivedTxns(prev => [{ ...updatedTxn, archived: true }, ...prev])
    } else {
      setActiveTxns(prev =>
        prev.map(t => (t.id === id ? updatedTxn : t))
      )
    }

    await fetch('/api/transactions/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field, val }),
    })

    if (field === 'label' && val === 'Ignore') {
      await fetch('/api/transactions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field: 'category', val: null }),
      })
    }

    if (shouldArchive) {
      await fetch('/api/transactions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field: 'archived', val: true }),
      })
    }
  }

  const recoverTxn = async (txn: Txn) => {
    const recoveredTxn = { ...txn, archived: false }

    setArchivedTxns(prev => prev.filter(t => t.id !== txn.id))
    setActiveTxns(prev => [recoveredTxn, ...prev])

    await fetch('/api/transactions/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: txn.id, field: 'archived', val: false }),
    })
  }

  const handleTouchEnd = (txn: Txn, endX: number) => {
    if (touchStartX === null) return

    const distance = endX - touchStartX

    if (distance > 80) {
      recoverTxn(txn)
    }

    setTouchStartX(null)
  }

  const renderTransaction = (txn: Txn, isArchived = false) => (
    <div
      key={txn.id}
      className="border p-3 rounded bg-white"
      onTouchStart={e => {
        if (isArchived) {
          setTouchStartX(e.touches[0].clientX)
        }
      }}
      onTouchEnd={e => {
        if (isArchived) {
          handleTouchEnd(txn, e.changedTouches[0].clientX)
        }
      }}
    >
      <div className="font-medium">{txn.name}</div>
      <div>${txn.amount}</div>
      <div className="text-sm text-gray-500">{txn.date}</div>

      {!isArchived && (
        <div className="flex gap-2 mt-2">
          <select
            value={txn.label || ''}
            onChange={e => updateField(txn.id, 'label', e.target.value)}
          >
            <option value="">Label</option>
            <option value="Maddie">Maddie</option>
            <option value="Joint">Joint</option>
            <option value="Ignore">Ignore</option>
          </select>

          <select
            value={txn.category || ''}
            onChange={e => updateField(txn.id, 'category', e.target.value)}
            disabled={txn.label === 'Ignore'}
          >
            <option value="">Category</option>
            <option value="Needs">Needs</option>
            <option value="Wants">Wants</option>
            <option value="Impulse">Impulse</option>
            <option value="Income">Income</option>
          </select>
        </div>
      )}

      {isArchived && (
        <div className="mt-2 text-sm text-gray-500">
          Swipe right to recover
        </div>
      )}
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('active')}
          className={tab === 'active' ? 'font-bold' : ''}
        >
          Active
        </button>

        <button
          onClick={() => setTab('archived')}
          className={tab === 'archived' ? 'font-bold' : ''}
        >
          Archive
        </button>
      </div>

      <div className="space-y-3">
        {tab === 'active' &&
          activeTxns.map(txn => renderTransaction(txn, false))}

        {tab === 'archived' &&
          archivedTxns.map(txn => renderTransaction(txn, true))}
      </div>
    </div>
  )
}