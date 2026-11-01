import { CLASS_COLORS } from "../lib/constants.js";
 
export default function ProbabilityBars({ probabilities, predicted }) {
  return (
    <ul className="prob-list">
      {Object.entries(probabilities).map(([name, p]) => (
        <li key={name}>
          <div className="prob-head">
            <span>
              {name} {name === predicted && <strong>(predicted)</strong>}
            </span>
            <span>{(p * 100).toFixed(1)}%</span>
          </div>
          <div className="bar-track" role="presentation">
            <div className="bar-fill" style={{ width: `${(p * 100).toFixed(1)}%`, background: CLASS_COLORS[name] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
