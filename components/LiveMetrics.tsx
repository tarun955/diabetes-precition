"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

type Metrics = Record<string, Record<string, number>>;

const metricLabels: Record<string, string> = {
  accuracy: "Accuracy",
  precision: "Precision",
  recall: "Recall",
  f1: "F1 score",
  roc_auc: "ROC-AUC",
};

function displayModel(name: string) {
  return name === "random_forest" ? "Random Forest" : "Gradient Boosting";
}

export default function LiveMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadMetrics() {
    setLoading(true);
    try {
      const response = await fetch("/api/metadata", { cache: "no-store" });
      const data = await response.json() as { ok?: boolean; metrics?: Metrics; error?: string };
      if (!response.ok || !data.ok || !data.metrics) throw new Error(data.error || "Training metadata is not available yet.");
      setMetrics(data.metrics);
      setMessage("");
    } catch (error) {
      setMetrics(null);
      setMessage(error instanceof Error ? error.message : "Training metadata is not available yet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadMetrics(); }, []);

  if (loading) return <div className="metrics-loading"><LoaderCircle className="spin" size={17} /> Reading exported validation metrics…</div>;
  if (!metrics) return <div className="metrics-empty"><span>{message}</span><button type="button" onClick={() => void loadMetrics()}><RefreshCw size={13} /> Retry</button></div>;

  const models = Object.keys(metrics);
  return <div className="metric-table"><div className="metric-row metric-header"><span>Metric</span>{models.map((model) => <span key={model}>{displayModel(model)}</span>)}</div>{Object.keys(metricLabels).map((metric) => <div className="metric-row" key={metric}><span>{metricLabels[metric]}</span>{models.map((model) => <span className="metric-value" key={model}>{(metrics[model][metric] ?? 0).toFixed(3)}</span>)}</div>)}</div>;
}
