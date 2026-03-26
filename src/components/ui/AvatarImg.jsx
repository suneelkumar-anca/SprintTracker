import React from "react";

export default function AvatarImg({ src, name, size = 34, radius = 9, fontSize = 14 }) {
  const [failed, setFailed] = React.useState(false);
  const initial = (name ?? "?")[0].toUpperCase();
  const baseStyle = { width: size, height: size, borderRadius: radius, flexShrink: 0 };

  if (!src || failed) {
    return (
      <div style={{
        ...baseStyle, background: "var(--border-sub)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#60a5fa", fontSize, fontWeight: 700,
      }}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src} alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ ...baseStyle, objectFit: "cover", border: "2px solid var(--border-sub)" }}
    />
  );
}
