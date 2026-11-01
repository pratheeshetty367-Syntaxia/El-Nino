/** Four-step "relay" showing which predictor dominates at each lead time. */
export default function DominanceTimeline({ steps }) {
  return (
    <ol className="relay" aria-label="Dominant predictor at each lead time">
      {steps.map((s) => (
        <li key={s.lead} style={{ "--c": s.color }}>
          <span className="relay-lead">{s.lead} months ahead</span>
          <strong className="relay-name">{s.name}</strong>
          <span className="relay-role">{s.role}</span>
          <span className="relay-share">{Math.round(s.share * 100)}% of total importance</span>
          {s.note && <small>{s.note}</small>}
        </li>
      ))}
    </ol>
  );
}
