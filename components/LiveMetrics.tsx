"use client";

import { useEffect, useState } from "react";
import metadata from "@/models/metadata.json";

type Metrics = Record<string, Record<string, number>>;
const fallbackMetrics = metadata.metrics as Metrics;
const definitions: Record<string, string> = {
  accuracy: "How often was the overall prediction correct?",
  precision: "When the model flagged a positive, how often was it right?",
  recall: "How many recorded positive cases did it find?",
  f1: "A balance between precision and recall.",
  roc_auc: "How well did it rank positive cases above negative ones?",
};
const labels: Record<string, string> = { accuracy: "Accuracy", precision: "Precision", recall: "Recall", f1: "F1 score", roc_auc: "ROC-AUC" };

function modelName(name: string) { return name === "random_forest" ? "Random Forest" : "Gradient Boosting"; }

export default function LiveMetrics() {
  const [metrics, setMetrics] = useState<Metrics>(fallbackMetrics);
  const [live, setLive] = useState(false);

  useEffect(() => {
    fetch("/api/metadata", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json() as { metrics?: Metrics };
      if (body.metrics) { setMetrics(body.metrics); setLive(true); }
    }).catch(() => undefined);
  }, []);

  const models = ["random_forest", "gradient_boosting"];
  return <>
    <table className="metric-table"><thead><tr><th>Measure</th><th>What it asks</th><th>Random Forest</th><th>Gradient Boosting</th></tr></thead><tbody>{Object.keys(labels).map((key) => <tr key={key}><td>{labels[key]}</td><td><span className="metric-help">{definitions[key]}</span></td>{models.map((model) => <td key={model}><span className="metric-number">{(metrics[model]?.[key] ?? 0).toFixed(3)}</span></td>)}</tr>)}</tbody></table>
    <p className="comparison-note">{live ? "These values are loaded from the deployed training record." : "These values come from the checked-in training record."}</p>
  </>;
}
