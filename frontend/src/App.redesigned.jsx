import { useEffect, useState, useMemo } from 'react'
import './App.css'
import './App.new.css'
import Button from './components/atoms/Button'
import Input from './components/atoms/Input'
import Select from './components/atoms/Select'
import Card from './components/atoms/Card'
import Alert from './components/molecules/Alert'
import FormField from './components/molecules/FormField'
import MemberChip from './components/molecules/MemberChip'
import BalanceItem from './components/molecules/BalanceItem'
import { groupsAPI, membersAPI, expensesAPI, settlementsAPI } from './api/client'

function App() {
  const [groups, setGroups] = useState([])
  const [activeGroupId, setActiveGroupId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('expenses') 

  const [newGroupName, setNewGroupName] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [splitMode, setSplitMode] = useState('equal')
  const [customSplits, setCustomSplits] = useState({})

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    payerId: '',
    participantIds: [],
  })

  const [settlementForm, setSettlementForm] = useState({
    fromId: '',
    toId: '',
    amount: '',
  })

  const [groupData, setGroupData] = useState(null)

  
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const res = await groupsAPI.getAll()
        setGroups(res.data)
        if (res.data.length > 0) {
          setActiveGroupId(res.data[0].id)
        }
        setLoading(false)
      } catch (err) {
        console.error('Failed to load groups:', err)
        setError('Failed to load groups')
        setLoading(false)
      }
    }
    loadGroups()
  }, [])

  
  useEffect(() => {
    if (!activeGroupId) return

    const loadGroupData = async () => {
      try {
        const res = await groupsAPI.getById(activeGroupId)
        setGroupData(res.data)
        setError('')
      } catch (err) {
        console.error('Failed to load group details:', err)
        setError('Failed to load group details')
      }
    }

    loadGroupData()
  }, [activeGroupId])

  
  const balances = useMemo(() => {
    if (!groupData) return {}
    const bal = {}
    groupData.members.forEach((m) => (bal[m.id] = 0))

    groupData.expenses.forEach((e) => {
      bal[e.payer_id] = (bal[e.payer_id] || 0) + parseFloat(e.amount)
      const splits = JSON.parse(
        typeof e.splits === 'string' ? e.splits : JSON.stringify(e.splits || []),
      )
      splits.forEach(({ member_id, amount }) => {
        bal[member_id] = (bal[member_id] || 0) - parseFloat(amount)
      })
    })

    groupData.settlements.forEach((s) => {
      bal[s.from_member_id] = (bal[s.from_member_id] || 0) + parseFloat(s.amount)
      bal[s.to_member_id] = (bal[s.to_member_id] || 0) - parseFloat(s.amount)
    })

    return bal
  }, [groupData])

  
  const debtSuggestions = useMemo(() => {
    const creditors = Object.entries(balances)
      .filter(([, amt]) => amt > 0.01)
      .map(([mid, amt]) => ({ memberId: mid, amount: amt }))
      .sort((a, b) => b.amount - a.amount)

    const debtors = Object.entries(balances)
      .filter(([, amt]) => amt < -0.01)
      .map(([mid, amt]) => ({ memberId: mid, amount: -amt }))
      .sort((a, b) => b.amount - a.amount)

    const settlements = []
    let ci = 0,
      di = 0
    while (ci < creditors.length && di < debtors.length) {
      const c = creditors[ci]
      const d = debtors[di]
      const amt = Math.min(c.amount, d.amount)
      settlements.push({
        fromId: d.memberId,
        toId: c.memberId,
        amount: amt,
      })
      c.amount -= amt
      d.amount -= amt
      if (c.amount <= 0.01) ci++
      if (d.amount <= 0.01) di++
    }
    return settlements
  }, [balances])

  const totalExpenses = useMemo(
    () => groupData?.expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0,
    [groupData],
  )

  
  const handleAddGroup = async (e) => {
    e.preventDefault()
    const name = newGroupName.trim()
    if (!name) {
      setError('Group name required')
      return
    }
    try {
      const res = await groupsAPI.create(name)
      setGroups([...groups, res.data])
      setActiveGroupId(res.data.id)
      setNewGroupName('')
      setError('')
    } catch (err) {
      setError('Failed to create group')
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    const name = newMemberName.trim()
    if (!name || !activeGroupId) {
      setError('Select group and enter member name')
      return
    }
    try {
      const res = await membersAPI.create(activeGroupId, name)
      setGroupData({
        ...groupData,
        members: [...groupData.members, res.data],
      })
      setNewMemberName('')
      setError('')
    } catch (err) {
      setError('Failed to add member')
    }
  }

  const handleAddExpense = async (e) => {
    e.preventDefault()
    const amount = parseFloat(expenseForm.amount)
    if (!amount || amount <= 0 || !expenseForm.payerId || expenseForm.participantIds.length === 0) {
      setError('Fill all required expense fields')
      return
    }

    try {
      let splits = {}
      if (splitMode === 'equal') {
        const share = amount / expenseForm.participantIds.length
        expenseForm.participantIds.forEach((id) => (splits[id] = share))
      } else {
        splits = customSplits
        const total = Object.values(splits).reduce((s, v) => s + parseFloat(v || 0), 0)
        if (Math.abs(total - amount) > 0.01) {
          setError(`Custom split total (${total.toFixed(2)}) must equal ${amount.toFixed(2)}`)
          return
        }
      }

      await expensesAPI.create({
        groupId: activeGroupId,
        payerId: expenseForm.payerId,
        description: expenseForm.description || 'Shared Expense',
        amount,
        participantIds: expenseForm.participantIds,
        splitType: splitMode,
        splits,
      })

      const res = await groupsAPI.getById(activeGroupId)
      setGroupData(res.data)
      setExpenseForm({ description: '', amount: '', payerId: '', participantIds: [] })
      setCustomSplits({})
      setError('')
    } catch (err) {
      setError('Failed to add expense')
    }
  }

  const handleAddSettlement = async (e) => {
    e.preventDefault()
    const amount = parseFloat(settlementForm.amount)
    if (!settlementForm.fromId || !settlementForm.toId || !amount || amount <= 0) {
      setError('Fill all settlement fields')
      return
    }

    try {
      await settlementsAPI.create({
        groupId: activeGroupId,
        fromMemberId: settlementForm.fromId,
        toMemberId: settlementForm.toId,
        amount,
      })

      const res = await groupsAPI.getById(activeGroupId)
      setGroupData(res.data)
      setSettlementForm({ fromId: '', toId: '', amount: '' })
      setError('')
    } catch (err) {
      setError('Failed to add settlement')
    }
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">Loading your expense tracker...</div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {}
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>💰 Expense Splitter</h1>
            <p className="header-subtitle">Split expenses with friends & track balances instantly</p>
          </div>
          <div className="header-stats">
            {groupData && (
              <>
                <div className="stat-box">
                  <span className="stat-label">Total Spent</span>
                  <span className="stat-value">₹{totalExpenses.toFixed(2)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Members</span>
                  <span className="stat-value">{groupData.members.length}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="app-main">
        {}
        <aside className="app-sidebar">
          <div className="sidebar-section">
            <h3>📁 Your Groups</h3>
            <form onSubmit={handleAddGroup} className="new-group-form">
              <Input
                placeholder="Create new group"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Button type="submit" variant="primary" size="sm" className="w-full">
                Create
              </Button>
            </form>

            <div className="groups-list">
              {groups.length === 0 ? (
                <p className="empty-state">No groups yet. Create your first!</p>
              ) : (
                groups.map((g) => (
                  <button
                    key={g.id}
                    className={`group-item ${activeGroupId === g.id ? 'active' : ''}`}
                    onClick={() => setActiveGroupId(g.id)}
                  >
                    {g.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {}
        <main className="app-content">
          {error && <Alert message={error} variant="error" className="mb-lg" />}

          {!groupData ? (
            <div className="empty-group">
              <div className="empty-group-icon">📌</div>
              <h2>Select or create a group to begin</h2>
              <p>Create a group first, then invite members and start tracking expenses</p>
            </div>
          ) : (
            <>
              {}
              <div className="quick-section">
                <div className="section-header">
                  <h2>👥 Members</h2>
                </div>
                <div className="members-container">
                  <form onSubmit={handleAddMember} className="add-member-form">
                    <Input
                      placeholder="Add a member name"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                    />
                    <Button type="submit" variant="primary" size="md">
                      Add Member
                    </Button>
                  </form>
                  <div className="members-list">
                    {groupData.members.map((m) => (
                      <MemberChip key={m.id} name={m.name} />
                    ))}
                  </div>
                </div>
              </div>

              {}
              <div className="tabs-nav">
                <button
                  className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
                  onClick={() => setActiveTab('expenses')}
                >
                  💳 Expenses
                </button>
                <button
                  className={`tab-btn ${activeTab === 'settlements' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settlements')}
                >
                  💸 Settlements
                </button>
                <button
                  className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                  onClick={() => setActiveTab('members')}
                >
                  📊 Balances
                </button>
              </div>

              {}
              {activeTab === 'expenses' && (
                <div className="tab-content">
                  <Card variant="default">
                    <div className="card-header">
                      <h3>➕ Add Expense</h3>
                      <p className="card-subtitle">Log a shared expense and split it among members</p>
                    </div>

                    <form onSubmit={handleAddExpense} className="expense-form">
                      <div className="form-grid-2">
                        <FormField label="What did you buy?" required>
                          <Input
                            placeholder="e.g., Dinner, Groceries, Movie tickets"
                            value={expenseForm.description}
                            onChange={(e) =>
                              setExpenseForm({ ...expenseForm, description: e.target.value })
                            }
                          />
                        </FormField>

                        <FormField label="Total Amount" required>
                          <div className="amount-input-group">
                            <span className="currency-symbol">₹</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={expenseForm.amount}
                              onChange={(e) =>
                                setExpenseForm({ ...expenseForm, amount: e.target.value })
                              }
                            />
                          </div>
                        </FormField>
                      </div>

                      <FormField label="Who paid?" required>
                        <Select
                          value={expenseForm.payerId}
                          onChange={(e) =>
                            setExpenseForm({ ...expenseForm, payerId: e.target.value })
                          }
                          options={groupData.members.map((m) => ({ value: m.id, label: m.name }))}
                        />
                      </FormField>

                      <FormField label="Who's involved?" required>
                        <div className="participants-grid">
                          {groupData.members.map((m) => (
                            <label key={m.id} className="participant-checkbox">
                              <input
                                type="checkbox"
                                checked={expenseForm.participantIds.includes(m.id)}
                                onChange={() => {
                                  const ids = expenseForm.participantIds.includes(m.id)
                                    ? expenseForm.participantIds.filter((id) => id !== m.id)
                                    : [...expenseForm.participantIds, m.id]
                                  setExpenseForm({ ...expenseForm, participantIds: ids })
                                }}
                              />
                              <span>{m.name}</span>
                            </label>
                          ))}
                        </div>
                      </FormField>

                      <FormField label="How to split?">
                        <div className="split-mode-buttons">
                          <button
                            type="button"
                            className={`split-btn ${splitMode === 'equal' ? 'active' : ''}`}
                            onClick={() => setSplitMode('equal')}
                          >
                            ✓ Equal Split
                          </button>
                          <button
                            type="button"
                            className={`split-btn ${splitMode === 'custom' ? 'active' : ''}`}
                            onClick={() => setSplitMode('custom')}
                          >
                            ⚙ Custom Amounts
                          </button>
                        </div>
                      </FormField>

                      {splitMode === 'custom' && (
                        <FormField label="Enter custom amounts">
                          <div className="custom-split-fields">
                            {expenseForm.participantIds.map((mid) => (
                              <div key={mid} className="custom-split-field">
                                <label>{groupData.members.find((m) => m.id === mid)?.name}</label>
                                <div className="amount-input-group">
                                  <span className="currency-symbol">₹</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={customSplits[mid] || ''}
                                    onChange={(e) =>
                                      setCustomSplits({ ...customSplits, [mid]: e.target.value })
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </FormField>
                      )}

                      <Button type="submit" variant="primary" size="md" className="w-full mt-lg">
                        ✅ Add Expense
                      </Button>
                    </form>
                  </Card>

                  {}
                  <Card variant="default" className="mt-lg">
                    <h3>📝 Recent Expenses</h3>
                    {groupData.expenses.length === 0 ? (
                      <p className="empty-state">No expenses yet</p>
                    ) : (
                      <div className="expenses-list">
                        {groupData.expenses.slice(0, 5).map((e) => (
                          <div key={e.id} className="expense-item">
                            <div className="expense-info">
                              <strong>{e.description}</strong>
                              <small>
                                {groupData.members.find((m) => m.id === e.payer_id)?.name} paid
                              </small>
                            </div>
                            <div className="expense-amount">₹{parseFloat(e.amount).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {}
              {activeTab === 'settlements' && (
                <div className="tab-content">
                  <Card variant="default">
                    <div className="card-header">
                      <h3>💳 Record a Settlement</h3>
                      <p className="card-subtitle">Mark a payment as complete</p>
                    </div>

                    <form onSubmit={handleAddSettlement} className="settlement-form">
                      <FormField label="Who is paying?" required>
                        <Select
                          value={settlementForm.fromId}
                          onChange={(e) =>
                            setSettlementForm({ ...settlementForm, fromId: e.target.value })
                          }
                          options={groupData.members.map((m) => ({ value: m.id, label: m.name }))}
                        />
                      </FormField>

                      <FormField label="Paying to?" required>
                        <Select
                          value={settlementForm.toId}
                          onChange={(e) =>
                            setSettlementForm({ ...settlementForm, toId: e.target.value })
                          }
                          options={groupData.members.map((m) => ({ value: m.id, label: m.name }))}
                        />
                      </FormField>

                      <FormField label="Amount" required>
                        <div className="amount-input-group">
                          <span className="currency-symbol">₹</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={settlementForm.amount}
                            onChange={(e) =>
                              setSettlementForm({ ...settlementForm, amount: e.target.value })
                            }
                          />
                        </div>
                      </FormField>

                      <Button type="submit" variant="primary" size="md" className="w-full mt-lg">
                        ✅ Record Settlement
                      </Button>
                    </form>
                  </Card>

                  {}
                  <Card variant="default" className="mt-lg">
                    <h3>💡 Suggested Settlements</h3>
                    {debtSuggestions.length === 0 ? (
                      <div className="success-state">
                        <p>✅ Everyone is settled up!</p>
                      </div>
                    ) : (
                      <div className="suggestions-list">
                        {debtSuggestions.map((debt, idx) => (
                          <div key={idx} className="suggestion-item">
                            <div className="suggestion-arrow">
                              <strong>{groupData.members.find((m) => m.id === debt.fromId)?.name}</strong>
                              <span>→</span>
                              <strong>{groupData.members.find((m) => m.id === debt.toId)?.name}</strong>
                            </div>
                            <div className="suggestion-amount">₹{debt.amount.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {}
              {activeTab === 'members' && (
                <div className="tab-content">
                  <Card variant="default">
                    <h3>📊 Member Balances</h3>
                    <p className="card-subtitle">Positive = they're owed money, Negative = they owe money</p>

                    <div className="balances-grid">
                      {groupData.members.map((m) => {
                        const amount = balances[m.id] || 0
                        const isPositive = amount > 0.01
                        return (
                          <div
                            key={m.id}
                            className={`balance-card ${isPositive ? 'positive' : amount < -0.01 ? 'negative' : 'settled'}`}
                          >
                            <div className="balance-name">{m.name}</div>
                            <div className="balance-amount">₹{Math.abs(amount).toFixed(2)}</div>
                            <div className="balance-status">
                              {isPositive
                                ? '💰 Gets money back'
                                : amount < -0.01
                                  ? '💳 Owes money'
                                  : '✅ All set'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
