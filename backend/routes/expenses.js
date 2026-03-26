import express from 'express'
import { query } from '../db.js'

const router = express.Router()

router.post('/', async (req, res) => {
  const { groupId, payerId, description, amount, participantIds, splitType, splits } = req.body

  if (!groupId || !payerId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid expense data' })
  }

  try {
    const expenseResult = await query(
      `INSERT INTO expenses (group_id, payer_id, description, amount, split_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [groupId, payerId, description || 'Shared Expense', amount, splitType],
    )

    const expenseId = expenseResult.rows[0].id

    for (const [memberId, splitAmount] of Object.entries(splits)) {
      await query(
        'INSERT INTO expense_splits (expense_id, member_id, amount) VALUES ($1, $2, $3)',
        [expenseId, memberId, splitAmount],
      )
    }

    res.status(201).json(expenseResult.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

router.get('/group/:groupId', async (req, res) => {
  const { groupId } = req.params
  try {
    const result = await query(
      `SELECT e.*, json_agg(json_build_object('member_id', es.member_id, 'amount', es.amount)) as splits
       FROM expenses e
       LEFT JOIN expense_splits es ON es.expense_id = e.id
       WHERE e.group_id = $1
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [groupId],
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

export default router
