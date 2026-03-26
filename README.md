# Sprint Tracker — Jira Report Reviewer

A React + Vite single-page application that connects to Jira Cloud to view sprint and kanban board data, review individual tickets with pull request status, and export formatted reports to Excel — all from the browser with no backend required.

<img width="842" height="280" alt="Sprint Tracker screenshot" src="https://github.com/user-attachments/assets/98628689-c049-40d6-b777-02f2ca93e45c" />

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Usage Guide](#usage-guide)
- [Views](#views)
- [Excel Export](#excel-export)
- [Theming](#theming)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Building for Production](#building-for-production)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)

---

## Features

### Jira Cloud Integration

- Connects to **Jira Agile REST API v1.0** and **Core REST API v3** to fetch boards, sprints, and issues.
- Supports both **Scrum** and **Kanban** board types — Kanban boards load issues from active/backlog columns automatically.
- Fetches **pull request data** from linked code hosting platforms (Bitbucket, GitHub, GitLab, GitHub Enterprise, Stash) via the Jira Developer Status API.
- Retrieves up to **20 most recent comments** per ticket with ADF (Atlassian Document Format) to plain-text conversion.
- **Auto-detects story point fields** — inspects 9 common custom field IDs; also configurable via environment variable.
- Handles pagination, deduplication, and graceful error fallbacks across all API endpoints.
- **In-memory board caching** for fast repeat navigation within a session.

### Custom Jira Fields

| Field | Default ID | Purpose |
|---|---|---|
| Story Points | Auto-detected (or `customfield_10016`) | Effort estimation |
| TL Comment | `customfield_10100` | Tech lead review notes |
| Review Rating | `customfield_10101` | Numeric review rating |
| Artifacts | `customfield_10102` | Linked deliverables / artifacts |

All custom field IDs are configurable via environment variables.

### Sprint Tracking

- Select any board and sprint (active, closed, or future) from searchable dropdown comboboxes.
- Real-time ticket list with **status badges**, **assignee avatars**, **story points**, and color coding.
- **Stats bar** showing total tickets, done count, and story point progress.
- **Sprint timeline bar** — visual progress indicator with start/end dates, days remaining, and overdue alerts.
- Active sprint auto-selection when switching boards.

### Filtering & Search

- **Filter by assignee** — dropdown populated with unique assignees in the current sprint.
- **Filter by status** — case-insensitive dropdown of all statuses present.
- **Date range filter** — filter tickets by creation date.
- All filters combine simultaneously; a clear button appears when any filter is active.
- **Ticket lookup** — search any Jira ticket by ID (e.g., `PROJ-456`) to load its full details, pull requests, and comments.

### Ticket Detail Panel

- **Header** — issue type icon, ticket ID (linked to Jira), status badge, sprint name, priority, labels, and components.
- **Description** — expandable body with "Show more" toggle beyond 300 characters.
- **Metadata grid** — assignee with avatar, story points, creation date, reporter, and last updated date.
- **Sprint timeline** — visual bar with current-day marker (yellow), start/end dates, and overdue indicator (red).
- **Pull requests** — linked PRs with author, repo, and status badge (Merged / Open / Declined); summary pills for quick counts.
- **Comments** — chronological list with author avatars, dates, and parsed ADF content; TL comment highlighted separately.
- **Artifacts** — custom field display with PR count and merge/open breakdown.

### Saved Reports

- Save sprint snapshots to `localStorage` (up to **20 reports**).
- Each snapshot preserves the full ticket array, board/sprint context, and timestamp.
- **Reload** any saved report to view it as the active sprint.
- **Export** saved reports directly to Excel without re-fetching from Jira.
- **Delete** reports you no longer need.
- **Drag-and-drop reordering** — rearrange saved reports with HTML5 drag-drop or move-up/move-down buttons.
- Save button shows **"Save"** or **"Update"** depending on whether the sprint was previously saved, with visual feedback on success.

### Excel Export

- Exports sprint data to a formatted **`.xlsx`** file using `xlsx-js-style`.
- **18 columns**: Ticket ID, Summary, Assignee, Status, Story Points, Time Spent, Priority, Issue Type, Sprint Name, Start Date, End Date, Created Date, Reporter, Labels, Components, Jira URL (hyperlinked), TL Comment, Review Rating.
- **Formatting**: bold blue headers, merged title row with sprint name, frozen panes, auto-filter, optimized column widths.
- **Date format**: `DD Mmm YY` (e.g., "26 Mar 26").
- Filename pattern: `{sprint_name}_report_{YYYY-MM-DD_HHmm}.xlsx`.

### Dashboard View

- **Per-person statistics** — each team member displayed on a card with:
  - Ticket count and completion percentage with progress bar.
  - Story points done/total with progress bar.
  - Color-coded status breakdown pills (To Do, In Progress, Done, etc.).
  - Avatar with initials fallback.
  - Clickable ticket list with per-ticket metadata.
- **Sprint metrics header** — sprint name, contributor count, ticket count, completion count, state badge, date range, time-based progress bar, days remaining/overdue, and story points progress bar.
- **Unassigned tickets** grouped under an "Unassigned" card.

### Theming

- **Three modes**: Light, Dark (default), and System (follows OS `prefers-color-scheme`).
- Full CSS variable system with hierarchical text, surface, border, and status color tokens.
- Preference persisted in `localStorage` and applied instantly.
- Real-time listener for OS theme changes when using System mode.

### Performance

- **Lazy-loaded views** — `TrackerView`, `DashboardView`, and `SavedReportsView` use `React.lazy()` with an `AppSkeleton` fallback.
- **Memoized computations** — dashboard stats, sprint panel props, and ticker list rendering are memoized.
- **Memoized components** — `TicketList`, `StatsBar`, and `DashboardPersonCard` are wrapped with `React.memo()`.
- **Vite dev server file warmup** — pre-loads all source files for faster HMR.
- **Efficient pagination** — `Promise.allSettled()` for batch board fetches; iterative pagination for sprint issues.

### Accessibility

- **Full ARIA implementation** — `aria-expanded`, `aria-haspopup`, `aria-controls`, `aria-activedescendant` on comboboxes; `aria-label` and `aria-pressed` on buttons.
- **Keyboard navigation** — Arrow keys, Enter, Space, Escape, Home, End all supported in comboboxes and interactive lists.
- **Screen reader support** — descriptive button labels, semantic heading hierarchy, decorative icons marked `aria-hidden`.
- **Focus management** — visible focus indicators, dropdown auto-close on blur.
- **Skeleton loaders** — shimmer animation placeholders during async loads with `aria-hidden`.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A Jira Cloud account with API access

---

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

1. Go to [atlassian.com](https://atlassian.com) → Account Settings → Security → API tokens.
2. Create a new token and paste it as `VITE_JIRA_API_TOKEN`.

### 3. Start the development server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser. The dev server proxies all `/jira-api/*` requests to your Jira instance to avoid CORS issues.

> If Jira is not yet configured, a setup banner will guide you through the required environment variables.

---

## Usage Guide

### Viewing a Sprint

1. Select a Jira board from the **Board** combobox (shows project key and board type).
2. Pick a sprint from the **Sprint** combobox — active sprints are auto-selected. Sprint state badges (active/closed/future) are shown inline.
3. The ticket list loads with status badges, assignee avatars, and story points. Use the stats bar to see completion progress at a glance.

### Viewing a Kanban Board

Select a board that uses Kanban mode — the sprint selector is hidden, and tickets are fetched from the board's active/backlog columns.

### Looking Up a Ticket

Enter a ticket ID (e.g., `PROJ-123`) in the search input on the Tracker view. The app fetches the full ticket, its linked pull requests, and comments — all displayed in the detail panel.

### Reviewing a Ticket

Click any ticket row to open its detail panel. Review description, metadata, sprint timeline, pull requests, comments, TL notes, and artifacts — all in one place.

### Saving a Sprint Report

Click **Save** on the sprint panel to snapshot the current sprint data to `localStorage`. Revisit saved reports anytime from the **Saved** view — load, export, reorder, or delete them.

### Exporting to Excel

Click **Export** on the sprint panel (or from a saved report card) to download a formatted `.xlsx` file with all ticket data.

---

## Views

| View | Description |
|---|---|
| **Tracker** | Main working view — board/sprint selection, filtered ticket list, and ticket detail panel side-by-side. |
| **Dashboard** | Per-person statistics with progress bars, status breakdowns, and sprint metrics header. |
| **Saved** | Grid of saved sprint report cards with load, export, delete, and drag-to-reorder capabilities. |

Navigation between views is via the header buttons. The Saved view shows a badge with the count of saved reports.

---

## Excel Export

The export produces a professional `.xlsx` file with:

- **Merged title row** with the sprint name.
- **18 data columns** with bold blue headers, frozen panes, and auto-filter.
- **Hyperlinked Jira URLs** — click to open tickets directly in Jira.
- **Formatted dates** — `DD Mmm YY` for readability.
- **Optimized column widths** — summary column set at 48 characters.

---

## Theming

Toggle between **Light**, **Dark**, and **System** themes using the header controls. The selection is persisted across sessions. System mode automatically follows your OS dark/light preference in real time.

---

## Keyboard Shortcuts

| Key | Context | Action |
|---|---|---|
| `↑` `↓` | Combobox open | Navigate options |
| `Home` `End` | Combobox open | Jump to first/last option |
| `Enter` | Combobox / Search | Select option / Execute lookup |
| `Space` | Combobox focused | Toggle dropdown open |
| `Escape` | Combobox open | Close dropdown |
| `↑` `↓` | Saved report card | Move report up/down in list |
| `Tab` | Global | Navigate between interactive elements |

---

## Building for Production

```bash
npm run build
```

Output is placed in `dist/`. Serve it with any static file host.

```bash
npm run preview   # preview the production build locally
```

---

## Testing

```bash
npm test           # run tests in watch mode
npm run test:run   # single run
npm run test:coverage  # run with coverage report
```

Tests use **Vitest** with **@testing-library/react** and **jsdom**. Test suites cover:

- Status and PR status configuration mappings
- Jira field mapping and issue formatting
- ADF-to-text conversion
- Board caching logic
- Date and theme utilities
- localStorage service
- Excel export configuration

---

## Project Structure

```
src/
├── App.jsx                  — Root component, view routing, and state orchestration
├── main.jsx                 — React entry point
├── components/
│   ├── layout/              — AppHeader, SprintPanel, StatsBar, TicketList
│   ├── ticket/              — TicketCard, TicketHeader, PRCard, CommentsSection
│   ├── ui/                  — Reusable UI primitives (Combobox, Pill, StatusBadge, etc.)
│   └── views/               — TrackerView, DashboardView, SavedReportsView
├── constants/               — Status color mappings and PR status config
├── hooks/                   — Custom hooks (filters, sprints, boards, drag, theme, etc.)
├── services/
│   ├── storage.js           — localStorage persistence for saved reports
│   ├── excel/               — Excel export logic and configuration
│   └── jira/                — Jira API client, field mapping, pagination, caching
└── utils/                   — Date formatting and theme utilities

vite.config.js               — Dev server with Jira proxy and polyfills
vite.build.js                — Production build configuration
```

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 18 |
| Build Tool | Vite 7 |
| Excel Export | xlsx-js-style |
| Testing | Vitest, @testing-library/react, jsdom |
| Styling | CSS variables with dark/light/system theme support |
| API | Jira Cloud REST API v3 + Agile API v1.0 |
| Persistence | Browser localStorage |
