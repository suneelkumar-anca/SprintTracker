# Sprint Tracker — Report Reviewer

A React + Vite web app that connects to Jira Cloud to view sprint and kanban board data, review individual tickets, and export reports to Excel.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A Jira Cloud account with API access

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Required
VITE_JIRA_BASE_URL=https://yourcompany.atlassian.net
VITE_JIRA_EMAIL=you@example.com
VITE_JIRA_API_TOKEN=your_api_token_here

# Optional — custom Jira field IDs (defaults shown)
VITE_JIRA_FIELD_TL_COMMENT=customfield_10100
VITE_JIRA_FIELD_REVIEW_RATING=customfield_10101
VITE_JIRA_FIELD_ARTIFACTS=customfield_10102
VITE_JIRA_FIELD_STORY_POINTS=customfield_10016
```

**Getting your API token:**
1. Go to [atlassian.com](https://atlassian.com) → Account Settings → Security → API tokens
2. Create a new token and paste it as `VITE_JIRA_API_TOKEN`

### 3. Start the development server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser. The dev server proxies all `/jira-api/*` requests to your Jira instance to avoid CORS issues.

## Usage

### Viewing a sprint

1. Open the app — if Jira is not yet configured, a setup panel will guide you.
2. Use the **Board** dropdown to select a Jira board.
3. Use the **Sprint** dropdown to pick an active or recent sprint.
4. The dashboard loads all tickets for that sprint, showing status, story points, assignees, and a sprint timeline.

### Viewing a kanban board

Select a board that uses Kanban mode — tickets are fetched from the board's backlog/active columns automatically.

### Reviewing a ticket

Click any ticket row to open the detail panel. It shows:
- Full description and status
- Linked pull requests and their merge status
- Comments and TL review notes
- Custom fields (review rating, artifacts, etc.)

### Exporting to Excel

Click the **Export** button on the sprint view to download a `.xlsx` file. The export includes all ticket data with formatted headers and a sprint name banner row.

### Saved reports

Up to 20 reports are persisted in `localStorage`. Use the **Saved Reports** panel to reload or delete previous snapshots.

### Theme

Use the theme toggle (Light / Dark / System) in the header to switch colour schemes.

## Building for production

```bash
npm run build
```

Output is placed in `dist/`. Serve it with any static file host.

```bash
npm run preview   # preview the production build locally
```

## Project structure

```
src/
  App.jsx      — UI, views, and state management
  jira.js      — Jira Cloud REST API v3 integration
  excel.js     — Excel (.xlsx) export logic
  storage.js   — localStorage persistence for saved reports
  main.jsx     — React entry point
vite.config.js — Vite config with Jira proxy setup
```
