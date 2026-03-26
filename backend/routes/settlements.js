import express from 'express'
import { query } from '../db.js'

const router = express.Router()

router.post('/', async (req, res) => {
  const { groupId, fromMemberId, toMemberId, amount } = req.body

  if (!groupId || !fromMemberId || !toMemberId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid settlement data' })
  }

  if (fromMemberId === toMemberId) {
    return res.status(400).json({ error: 'Cannot settle with same member' })
  }

  try {
    const result = await query(
      `INSERT INTO settlements (group_id, from_member_id, to_member_id, amount)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [groupId, fromMemberId, toMemberId, amount],
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create settlement' })
  }
})

router.get('/group/:groupId', async (req, res) => {
  const { groupId } = req.params
  try {
    const result = await query(
      'SELECT * FROM settlements WHERE group_id = $1 ORDER BY created_at DESC',
      [groupId],
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch settlements' })
  }
})

export default router
