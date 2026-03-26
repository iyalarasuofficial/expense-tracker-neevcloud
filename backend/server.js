import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDB } from './db.js'
import groupRoutes from './routes/groups.js'
import memberRoutes from './routes/members.js'
import expenseRoutes from './routes/expenses.js'
import settlementRoutes from './routes/settlements.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/groups', groupRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/settlements', settlementRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const start = async () => {
  try {
    await initDB()
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
