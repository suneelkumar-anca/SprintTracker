import AvatarImg from "./AvatarImg.jsx";

export default function AssigneeCard({ name, avatarUrl, email }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <AvatarImg src={avatarUrl} name={name} size={34} radius={9} fontSize={14} />
      <div>
        <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>{name ?? "Unassigned"}</div>
        {email && <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 1 }}>{email}</div>}
      </div>
    </div>
  );
}
