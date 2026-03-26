import express from 'express'
import { query } from '../db.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM groups ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch groups' })
  }
})

router.get('/:groupId', async (req, res) => {
  const { groupId } = req.params
  try {
    const groupResult = await query('SELECT * FROM groups WHERE id = $1', [groupId])
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const membersResult = await query(
      `SELECT m.*, 
              COALESCE(SUM(CASE WHEN e.payer_id = m.id THEN e.amount ELSE 0 END), 0) as paid,
              COALESCE(SUM(es.amount), 0) as owes
       FROM members m
       LEFT JOIN expenses e ON e.payer_id = m.id AND e.group_id = $1
       LEFT JOIN expense_splits es ON es.member_id = m.id AND es.expense_id = e.id
       WHERE m.group_id = $1
       GROUP BY m.id`,
      [groupId],
    )

    const expensesResult = await query(
      `SELECT e.*, json_agg(json_build_object('member_id', es.member_id, 'amount', es.amount)) as splits
       FROM expenses e
       LEFT JOIN expense_splits es ON es.expense_id = e.id
       WHERE e.group_id = $1
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [groupId],
    )

    const settlementsResult = await query(
      'SELECT * FROM settlements WHERE group_id = $1 ORDER BY created_at DESC',
      [groupId],
    )

    res.json({
      group: groupResult.rows[0],
      members: membersResult.rows,
      expenses: expensesResult.rows,
      settlements: settlementsResult.rows,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch group details' })
  }
})

router.post('/', async (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required' })
  }

  try {
    const result = await query('INSERT INTO groups (name) VALUES ($1) RETURNING *', [name.trim()])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create group' })
  }
})

export default router
