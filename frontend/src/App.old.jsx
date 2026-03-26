import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'smart-expense-splitter-v1'

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

const formatMoney = (value) => {
  const number = Number.isFinite(value) ? value : 0
  return `INR ${number.toFixed(2)}`
}

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createEmptyGroup = (name) => ({
  id: createId(),
  name,
  members: [],
  expenses: [],
  settlements: [],
})

const computeBalances = (group) => {
  const balances = Object.fromEntries(group.members.map((member) => [member.id, 0]))

  for (const expense of group.expenses) {
    balances[expense.payerId] = (balances[expense.payerId] ?? 0) + expense.amount

    for (const [memberId, share] of Object.entries(expense.splits)) {
      balances[memberId] = (balances[memberId] ?? 0) - share
    }
  }

  for (const settlement of group.settlements) {
    balances[settlement.fromId] = (balances[settlement.fromId] ?? 0) + settlement.amount
    balances[settlement.toId] = (balances[settlement.toId] ?? 0) - settlement.amount
  }

  return Object.fromEntries(
    Object.entries(balances).map(([memberId, amount]) => [memberId, round2(amount)]),
  )
}

const deriveDebts = (balances) => {
  const creditors = Object.entries(balances)
    .filter(([, amount]) => amount > 0.01)
    .map(([memberId, amount]) => ({ memberId, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = Object.entries(balances)
    .filter(([, amount]) => amount < -0.01)
    .map(([memberId, amount]) => ({ memberId, amount: round2(-amount) }))
    .sort((a, b) => b.amount - a.amount)

  const settlements = []
  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]
    const amount = round2(Math.min(creditor.amount, debtor.amount))

    if (amount > 0.01) {
      settlements.push({
        fromId: debtor.memberId,
        toId: creditor.memberId,
        amount,
      })
    }

    creditor.amount = round2(creditor.amount - amount)
    debtor.amount = round2(debtor.amount - amount)

    if (creditor.amount <= 0.01) {
      creditorIndex += 1
    }

    if (debtor.amount <= 0.01) {
      debtorIndex += 1
    }
  }

  return settlements
}

function App() {
  const [groups, setGroups] = useState([])
  const [activeGroupId, setActiveGroupId] = useState('')
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
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed.groups)) {
        return
      }

      setGroups(parsed.groups)
      if (parsed.activeGroupId) {
        setActiveGroupId(parsed.activeGroupId)
      } else if (parsed.groups.length > 0) {
        setActiveGroupId(parsed.groups[0].id)
      }
    } catch {
      setError('Could not load saved data. Starting with a fresh workspace.')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        groups,
        activeGroupId,
      }),
    )
  }, [groups, activeGroupId])

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? null,
    [groups, activeGroupId],
  )

  const membersById = useMemo(() => {
    if (!activeGroup) {
      return {}
    }

    return Object.fromEntries(activeGroup.members.map((member) => [member.id, member]))
  }, [activeGroup])

  const balances = useMemo(() => {
    if (!activeGroup) {
      return {}
    }

    return computeBalances(activeGroup)
  }, [activeGroup])

  const debtSuggestions = useMemo(() => deriveDebts(balances), [balances])

  const updateActiveGroup = (updater) => {
    setGroups((previous) =>
      previous.map((group) => {
        if (group.id !== activeGroupId) {
          return group
        }

        return updater(group)
      }),
    )
  }

  const handleAddGroup = (event) => {
    event.preventDefault()
    const name = newGroupName.trim()
    if (!name) {
      setError('Group name is required.')
      return
    }

    const newGroup = createEmptyGroup(name)
    setGroups((previous) => [...previous, newGroup])
    setActiveGroupId(newGroup.id)
    setNewGroupName('')
    setError('')
  }

  const handleAddMember = (event) => {
    event.preventDefault()
    if (!activeGroup) {
      setError('Create or select a group first.')
      return
    }

    const name = newMemberName.trim()
    if (!name) {
      setError('Member name is required.')
      return
    }

    if (activeGroup.members.some((member) => member.name.toLowerCase() === name.toLowerCase())) {
      setError('This member already exists in the selected group.')
      return
    }

    const member = {
      id: createId(),
      name,
    }

    updateActiveGroup((group) => ({
      ...group,
      members: [...group.members, member],
    }))

    setNewMemberName('')
    setExpenseForm((previous) => ({
      ...previous,
      participantIds: [...previous.participantIds, member.id],
      payerId: previous.payerId || member.id,
    }))
    setError('')
  }

  const handleParticipantToggle = (memberId) => {
    setExpenseForm((previous) => {
      const hasMember = previous.participantIds.includes(memberId)
      const nextParticipants = hasMember
        ? previous.participantIds.filter((id) => id !== memberId)
        : [...previous.participantIds, memberId]

      return {
        ...previous,
        participantIds: nextParticipants,
      }
    })
  }

  const handleAddExpense = (event) => {
    event.preventDefault()
    if (!activeGroup) {
      setError('Create or select a group first.')
      return
    }

    if (activeGroup.members.length < 2) {
      setError('Add at least 2 members to split an expense.')
      return
    }

    const amount = round2(Number(expenseForm.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Expense amount must be greater than zero.')
      return
    }

    if (!expenseForm.payerId) {
      setError('Select who paid for the expense.')
      return
    }

    if (expenseForm.participantIds.length === 0) {
      setError('Select at least one participant for this expense.')
      return
    }

    const uniqueParticipants = [...new Set(expenseForm.participantIds)]
    let splits = {}

    if (splitMode === 'equal') {
      const share = round2(amount / uniqueParticipants.length)
      splits = Object.fromEntries(uniqueParticipants.map((id) => [id, share]))

      const difference = round2(amount - share * uniqueParticipants.length)
      if (difference !== 0 && uniqueParticipants.length > 0) {
        const firstMemberId = uniqueParticipants[0]
        splits[firstMemberId] = round2(splits[firstMemberId] + difference)
      }
    } else {
      splits = Object.fromEntries(
        uniqueParticipants.map((memberId) => [memberId, round2(Number(customSplits[memberId] || 0))]),
      )

      const total = round2(Object.values(splits).reduce((sum, value) => sum + value, 0))
      if (total !== amount) {
        setError(`Custom split total (${formatMoney(total)}) must equal amount (${formatMoney(amount)}).`)
        return
      }
    }

    const expense = {
      id: createId(),
      description: expenseForm.description.trim() || 'Shared Expense',
      amount,
      payerId: expenseForm.payerId,
      participantIds: uniqueParticipants,
      splitType: splitMode,
      splits,
      createdAt: new Date().toISOString(),
    }

    updateActiveGroup((group) => ({
      ...group,
      expenses: [expense, ...group.expenses],
    }))

    setExpenseForm((previous) => ({
      ...previous,
      description: '',
      amount: '',
    }))
    setCustomSplits({})
    setError('')
  }

  const handleAddSettlement = (event) => {
    event.preventDefault()
    if (!activeGroup) {
      setError('Select a group first.')
      return
    }

    const amount = round2(Number(settlementForm.amount))
    if (!settlementForm.fromId || !settlementForm.toId || settlementForm.fromId === settlementForm.toId) {
      setError('Choose two different members for settlement.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Settlement amount must be greater than zero.')
      return
    }

    updateActiveGroup((group) => ({
      ...group,
      settlements: [
        {
          id: createId(),
          fromId: settlementForm.fromId,
          toId: settlementForm.toId,
          amount,
          createdAt: new Date().toISOString(),
        },
        ...group.settlements,
      ],
    }))

    setSettlementForm({ fromId: '', toId: '', amount: '' })
    setError('')
  }

  const selectedMemberCount = activeGroup?.members.length ?? 0

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Smart Expense Splitter</p>
        <h1>Split group expenses in seconds</h1>
        <p className="subtle">
          Add members, log shared expenses, and track who owes whom with live balances.
        </p>
      </header>

      <section className="panel two-col">
        <div>
          <h2>Create Group</h2>
          <form onSubmit={handleAddGroup} className="form-row">
            <input
              type="text"
              placeholder="Trip to Goa"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
            />
            <button type="submit">Add Group</button>
          </form>
        </div>

        <div>
          <h2>Select Group</h2>
          <select
            value={activeGroupId}
            onChange={(event) => setActiveGroupId(event.target.value)}
            disabled={groups.length === 0}
          >
            <option value="">Choose a group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}

      {!activeGroup ? (
        <section className="panel empty">
          <p>Create your first group to start splitting expenses.</p>
        </section>
      ) : (
        <>
          <section className="panel two-col">
            <div>
              <h2>Members</h2>
              <form onSubmit={handleAddMember} className="form-row">
                <input
                  type="text"
                  placeholder="Member name"
                  value={newMemberName}
                  onChange={(event) => setNewMemberName(event.target.value)}
                />
                <button type="submit">Add Member</button>
              </form>

              <ul className="chip-list">
                {activeGroup.members.map((member) => (
                  <li key={member.id}>{member.name}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2>Quick Snapshot</h2>
              <p className="metric">
                <span>{activeGroup.expenses.length}</span> expenses logged
              </p>
              <p className="metric">
                <span>{formatMoney(activeGroup.expenses.reduce((sum, item) => sum + item.amount, 0))}</span>{' '}
                total spend
              </p>
              <p className="metric">
                <span>{debtSuggestions.length}</span> settlement suggestions
              </p>
            </div>
          </section>

          <section className="panel">
            <h2>Add Expense</h2>
            <form onSubmit={handleAddExpense} className="expense-grid">
              <label>
                Description
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(event) =>
                    setExpenseForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Dinner"
                />
              </label>

              <label>
                Amount
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseForm.amount}
                  onChange={(event) =>
                    setExpenseForm((previous) => ({
                      ...previous,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </label>

              <label>
                Paid By
                <select
                  value={expenseForm.payerId}
                  onChange={(event) =>
                    setExpenseForm((previous) => ({
                      ...previous,
                      payerId: event.target.value,
                    }))
                  }
                  disabled={selectedMemberCount === 0}
                >
                  <option value="">Select payer</option>
                  {activeGroup.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <p className="label">Split Mode</p>
                <div className="toggle-row">
                  <button
                    type="button"
                    className={splitMode === 'equal' ? 'active' : ''}
                    onClick={() => setSplitMode('equal')}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    className={splitMode === 'custom' ? 'active' : ''}
                    onClick={() => setSplitMode('custom')}
                  >
                    Custom
                  </button>
                </div>
              </div>

              <div className="participants">
                <p className="label">Participants</p>
                <div className="checkbox-grid">
                  {activeGroup.members.map((member) => (
                    <label key={member.id}>
                      <input
                        type="checkbox"
                        checked={expenseForm.participantIds.includes(member.id)}
                        onChange={() => handleParticipantToggle(member.id)}
                      />
                      {member.name}
                    </label>
                  ))}
                </div>
              </div>

              {splitMode === 'custom' ? (
                <div className="custom-split-box">
                  <p className="label">Custom Amounts</p>
                  <div className="custom-grid">
                    {expenseForm.participantIds.map((memberId) => (
                      <label key={memberId}>
                        {membersById[memberId]?.name}
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={customSplits[memberId] ?? ''}
                          onChange={(event) =>
                            setCustomSplits((previous) => ({
                              ...previous,
                              [memberId]: event.target.value,
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <button type="submit" className="primary">
                Add Expense
              </button>
            </form>
          </section>

          <section className="panel two-col">
            <div>
              <h2>Balances</h2>
              <ul className="balance-list">
                {activeGroup.members.map((member) => {
                  const amount = balances[member.id] ?? 0
                  return (
                    <li key={member.id}>
                      <span>{member.name}</span>
                      <strong className={amount >= 0 ? 'positive' : 'negative'}>{formatMoney(amount)}</strong>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div>
              <h2>Who Owes Whom</h2>
              {debtSuggestions.length === 0 ? (
                <p className="subtle">All settled up.</p>
              ) : (
                <ul className="debt-list">
                  {debtSuggestions.map((debt, index) => (
                    <li key={`${debt.fromId}-${debt.toId}-${index}`}>
                      <strong>{membersById[debt.fromId]?.name}</strong> owes{' '}
                      <strong>{membersById[debt.toId]?.name}</strong> {formatMoney(debt.amount)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="panel two-col">
            <div>
              <h2>Add Settlement</h2>
              <form onSubmit={handleAddSettlement} className="settlement-grid">
                <label>
                  From
                  <select
                    value={settlementForm.fromId}
                    onChange={(event) =>
                      setSettlementForm((previous) => ({
                        ...previous,
                        fromId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select member</option>
                    {activeGroup.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  To
                  <select
                    value={settlementForm.toId}
                    onChange={(event) =>
                      setSettlementForm((previous) => ({
                        ...previous,
                        toId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select member</option>
                    {activeGroup.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Amount
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settlementForm.amount}
                    onChange={(event) =>
                      setSettlementForm((previous) => ({
                        ...previous,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                  />
                </label>

                <button type="submit">Record Settlement</button>
              </form>
            </div>

            <div>
              <h2>Recent Activity</h2>
              <ul className="activity-list">
                {activeGroup.expenses.slice(0, 5).map((expense) => (
                  <li key={expense.id}>
                    <p>
                      <strong>{membersById[expense.payerId]?.name}</strong> paid{' '}
                      <strong>{formatMoney(expense.amount)}</strong> for {expense.description}
                    </p>
                  </li>
                ))}

                {activeGroup.settlements.slice(0, 5).map((settlement) => (
                  <li key={settlement.id}>
                    <p>
                      <strong>{membersById[settlement.fromId]?.name}</strong> settled{' '}
                      <strong>{formatMoney(settlement.amount)}</strong> with{' '}
                      <strong>{membersById[settlement.toId]?.name}</strong>
                    </p>
                  </li>
                ))}

                {activeGroup.expenses.length === 0 && activeGroup.settlements.length === 0 ? (
                  <li>
                    <p className="subtle">No expenses or settlements yet.</p>
                  </li>
                ) : null}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default App
