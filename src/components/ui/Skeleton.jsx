export default function Skeleton({ w = "100%", h = 14, radius = 6 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: w, height: h, borderRadius: radius,
        background: "var(--border-sub)",
        animation: "shimmer 1.5s ease-in-out infinite",
      }}
    />
  );
}
