const VIEWS = [
  { id: "saved",      label: "Saved",      icon: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21V13H7v8M7 3v5h8" },
  { id: "tracker",    label: "Tracker",    icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { id: "dashboard",  label: "Dashboard",  icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { id: "milestones", label: "Milestones", icon: "M9 11l3 3L22 4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
  { id: "projects",   label: "Projects",   icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
];

const THEMES = [
  { id: "light",  title: "Light theme",   icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
  { id: "dark",   title: "Dark theme",    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
  { id: "system", title: "System default",icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
];

const LOGO_SVG = <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7" height="7" rx="1.8" fill="#fff" opacity="0.95"/><rect x="10" y="2" width="7" height="1.6" rx="0.8" fill="#fff" opacity="0.9"/><rect x="10" y="4.7" width="5" height="1.6" rx="0.8" fill="#fff" opacity="0.65"/><rect x="10" y="7.4" width="6" height="1.6" rx="0.8" fill="#fff" opacity="0.45"/><rect x="1" y="11" width="16" height="6" rx="1.8" fill="#fff" opacity="0.15"/><polyline points="3.5,14 6,16.2 10.5,11.5" stroke="#7dd3fc" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;

export { VIEWS, THEMES, LOGO_SVG };
