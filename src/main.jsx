// Global focus-visible ring for keyboard navigation (WCAG 2.4.7)
const focusStyle = document.createElement("style");
focusStyle.textContent = `
  *:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;
document.head.appendChild(focusStyle);

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
