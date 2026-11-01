import { Bar, BarChart, Cell, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt } from "../lib/constants.js";
 
/** Horizontal SHAP bar chart. `field` is "shap_extreme" or "shap_predicted". */
export default function ContributionChart({ contributions, field = "shap_extreme" }) {
  const data = contributions.map((c) => ({ name: c.label, shap: c[field], value: c.value }));
  return (
    <div role="img" aria-label="SHAP contribution of each predictor" style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" label={{ value: "SHAP value (impact on model output)", position: "insideBottom", offset: -12 }} />
          <YAxis type="category" dataKey="name" width={70} />
          <ReferenceLine x={0} stroke="#475569" />
          <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => l} />
          <Bar dataKey="shap" name="SHAP value">
            {data.map((d) => (
              <Cell key={d.name} fill={d.shap >= 0 ? "#D55E00" : "#0072B2"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

