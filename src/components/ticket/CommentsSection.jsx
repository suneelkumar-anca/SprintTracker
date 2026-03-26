import AvatarImg from "../ui/AvatarImg.jsx";
import Skeleton from "../ui/Skeleton.jsx";
import { fmt } from "../../utils/dateUtils.js";

export default function CommentsSection({ tlComment, comments, commentsLoading }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tlComment && (
        <div style={{ background: "var(--bg-nav)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, color: "var(--text-5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>TL Field</div>
          <p style={{ fontSize: 14, color: "var(--text-mid)", lineHeight: 1.75, margin: 0, fontStyle: "italic" }}>"{tlComment}"</p>
        </div>
      )}

      {commentsLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton h={56} radius={10} /><Skeleton h={56} radius={10} />
        </div>
      ) : comments.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ background: "var(--bg-nav)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <AvatarImg src={c.avatar} name={c.author} size={24} radius={6} fontSize={10} />
                <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>{c.author}</span>
                <span style={{ fontSize: 11, color: "var(--text-5)", marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace" }}>{fmt(c.created)}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-mid)", lineHeight: 1.65, margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </div>
      ) : !tlComment ? (
        <span style={{ fontSize: 13, color: "var(--text-5)" }}>No comments on this ticket yet.</span>
      ) : null}
    </div>
  );
}
