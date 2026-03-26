import Skeleton from "../ui/Skeleton.jsx";

export default function AppSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "20px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {[0,1,2,3].map(i => <Skeleton key={i} w="100%" h={80} radius={14} />)}
      </div>
      <Skeleton w="100%" h={420} radius={14} />
    </div>
  );
}
