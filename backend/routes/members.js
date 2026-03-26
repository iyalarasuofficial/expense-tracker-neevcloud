import express from 'express'
import { query } from '../db.js'

const router = express.Router()

router.get('/group/:groupId', async (req, res) => {
  const { groupId } = req.params
  try {
    const result = await query('SELECT * FROM members WHERE group_id = $1 ORDER BY name', [groupId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch members' })
  }
})

router.post('/', async (req, res) => {
  const { groupId, name } = req.body
  if (!groupId || !name || !name.trim()) {
    return res.status(400).json({ error: 'Group ID and member name required' })
  }

  try {
    const result = await query(
      'INSERT INTO members (group_id, name) VALUES ($1, $2) RETURNING *',
      [groupId, name.trim()],
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create member' })
  }
})

export default router
