# Professional Smart Expense Splitter - Full Stack

This is a complete professional refactor with **Node.js + Express backend**, **PostgreSQL database**, **atomic design components**, and **PostCSS styling**.

## Architecture

### Backend (Node.js + Express + PostgreSQL)
- RESTful API with proper database schema
- Group, member, expense, settlement management
- Normalized relationships with foreign keys
- CORS enabled for frontend integration

### Frontend (React + Vite + PostCSS)
- Atomic design: atoms (Button, Input), molecules (Alert, FormField), organisms
- Component-based modular architecture
- PostCSS for professional CSS-in-JS styling with variables
- API client layer for data fetching
- Real-time balance calculations

### Database (PostgreSQL)
- Tables: groups, members, expenses, expense_splits, settlements
- Cascading deletes, UUID primary keys
- Optimized queries for balance calculation

## Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 12+

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your PostgreSQL connection

# Start server
npm run dev
```

Server runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env

# Start dev server
npm run dev
```

App runs on `http://localhost:5173`

### Database Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE expense_splitter;
```

2. Update .env in backend with connection string:
```
DATABASE_URL=postgresql://user:password@localhost:5432/expense_splitter
```

3. Tables auto-create on first server start

## API Endpoints

- `GET /api/health` – Health check
- `GET /api/groups` – List all groups
- `GET /api/groups/:groupId` – Get group with members, expenses, settlements
- `POST /api/groups` – Create group
- `POST /api/members` – Add member to group
- `GET /api/expenses/group/:groupId` – Get group expenses
- `POST /api/expenses` – Create expense with splits
- `POST /api/settlements` – Record settlement

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── atoms/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── Label.jsx
│   │   │   └── Card.jsx
│   │   └── molecules/
│   │       ├── Alert.jsx
│   │       ├── FormField.jsx
│   │       ├── MemberChip.jsx
│   │       └── BalanceItem.jsx
│   ├── api/
│   │   └── client.js
│   ├── styles/
│   │   ├── base.css (PostCSS variables, reset)
│   │   ├── components.css (component styles)
│   │   └── layout.css (grid, flex, spacing)
│   ├── App.jsx (main app with data fetching)
│   └── main.jsx
├── postcss.config.js
├── vite.config.js
└── package.json

backend/
├── server.js (Express setup)
├── db.js (PostgreSQL pool & schema init)
├── routes/
│   ├── groups.js
│   ├── members.js
│   ├── expenses.js
│   └── settlements.js
└── package.json
```

## Features

✅ **Professional component architecture** with atomic design
✅ **PostCSS styling** with CSS variables and modern features
✅ **PostgreSQL persistence** with proper normalization
✅ **RESTful API** with error handling
✅ **Real-time balance calculations**
✅ **Settlement tracking & suggestions**
✅ **CORS enabled** for cross-origin requests
✅ **Responsive UI** with grid & flexbox utilities

## Deployment

### Backend (Heroku/Railway)
1. Create Heroku app with PostgreSQL addon
2. Set environment variables
3. Deploy with `git push heroku main`

### Frontend (Vercel)
1. Set VITE_API_URL to production backend URL
2. Deploy from GitHub
