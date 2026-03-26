# Smart Expense Splitter

A lightweight web app to split shared expenses for friends, roommates, or teams.

## Features Implemented

- Create multiple groups.
- Add members to each group.
- Add shared expenses with:
	- Equal split
	- Custom split
- Real-time balance calculation per member.
- Clear "who owes whom" settlement suggestions.
- Record settlement transactions to reduce outstanding balances.
- localStorage persistence so data remains after page refresh.
- Responsive UI for desktop and mobile.

## Tech Stack

- React 19
- Vite
- Plain CSS
- Browser localStorage (no backend required for MVP)

## Architecture

The application is frontend-only for rapid delivery.

- Single-page app with state managed in React hooks.
- Data model is group-centric:
	- groups -> members
	- groups -> expenses
	- groups -> settlements
- Balance engine computes:
	- Net amount per member
	- Settlement guidance (debtor -> creditor) using a greedy matching algorithm.

## Local Setup

1. Open terminal in the frontend folder.
2. Install dependencies:

```bash
npm install
```

3. Start development server:

```bash
npm run dev
```

4. Build production bundle:

```bash
npm run build
```

## Deployment (Vercel)

1. Push this repository to GitHub.
2. Go to Vercel dashboard and import the repository.
3. Set project root to frontend.
4. Build command: npm run build
5. Output directory: dist
6. Deploy.

## Submission Checklist

- Public GitHub repository with source code.
- README with setup, architecture, and features.
- Demo video (<= 5 minutes).
- Deployed URL from Vercel/Netlify.
