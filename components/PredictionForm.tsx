"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";

type Inputs = {
  gender: string;
  age: string;
  hypertension: string;
  heart_disease: string;
  smoking_history: string;
  bmi: string;
  HbA1c_level: string;
  blood_glucose_level: string;
};

type ModelResult = {
  label: string;
  class: number;
  probability: number;
  risk_band: string;
};

type ApiResult = {
  ok: boolean;
  predictions?: { random_forest: ModelResult; gradient_boosting: ModelResult };
  recommended_model?: string;
  recommendation_reason?: string;
  error?: string;
};

const initialValues: Inputs = {
  gender: "Female",
  age: "45",
  hypertension: "0",
  heart_disease: "0",
  smoking_history: "never",
  bmi: "27.5",
  HbA1c_level: "5.7",
  blood_glucose_level: "120",
};

const fieldLabels: Record<keyof Inputs, string> = {
  gender: "Gender",
  age: "Age",
  hypertension: "Hypertension",
  heart_disease: "Heart disease",
  smoking_history: "Smoking history",
  bmi: "BMI",
  HbA1c_level: "HbA1c level",
  blood_glucose_level: "Blood glucose",
};

function modelLabel(name: string) {
  return name === "random_forest" ? "Random Forest" : "Gradient Boosting";
}

function ResultCard({ name, result }: { name: string; result?: ModelResult }) {
  if (!result) {
    return <div className="result-card result-empty"><div className="result-model-name">{modelLabel(name)}</div><div className="result-placeholder">Submit patient details to see the model output.</div></div>;
  }
  return (
    <div className={`result-card ${result.class === 1 ? "result-risk" : "result-safe"}`}>
      <div className="result-model-name"><span className="result-status-dot" /> {modelLabel(name)}</div>
      <div className="result-main"><div><strong>{result.probability}%</strong><span>predicted probability</span></div><div className="risk-badge">{result.risk_band} risk</div></div>
      <div className="probability-track"><span style={{ width: `${Math.min(result.probability, 100)}%` }} /></div>
      <div className="result-footer"><span>{result.label}</span><span>{result.class === 1 ? "Class 1" : "Class 0"}</span></div>
    </div>
  );
}

export default function PredictionForm() {
  const [values, setValues] = useState<Inputs>(initialValues);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof Inputs, value: string) => setValues((current) => ({ ...current, [field]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const payload = {
      ...values,
      age: Number(values.age),
      hypertension: Number(values.hypertension),
      heart_disease: Number(values.heart_disease),
      bmi: Number(values.bmi),
      HbA1c_level: Number(values.HbA1c_level),
      blood_glucose_level: Number(values.blood_glucose_level),
    };
    try {
      const response = await fetch("/api/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = (await response.json()) as ApiResult;
      if (!response.ok || !body.ok) throw new Error(body.error || "The prediction service returned an error.");
      setResult(body);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to reach the prediction service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="predict-layout">
      <form className="patient-form panel" onSubmit={submit}>
        <div className="panel-heading"><div><div className="eyebrow"><Sparkles size={14} /> PATIENT SNAPSHOT</div><h2>Enter clinical inputs</h2><p>Use the same feature definitions as the training dataset.</p></div><ShieldCheck size={25} className="heading-icon" /></div>
        <div className="form-grid">
          <label>Gender<select value={values.gender} onChange={(event) => update("gender", event.target.value)}><option>Female</option><option>Male</option><option>Other</option></select></label>
          <label>Age <span className="unit">years</span><input type="number" min="0" max="120" step="1" value={values.age} onChange={(event) => update("age", event.target.value)} required /></label>
          <label>Hypertension<select value={values.hypertension} onChange={(event) => update("hypertension", event.target.value)}><option value="0">No</option><option value="1">Yes</option></select></label>
          <label>Heart disease<select value={values.heart_disease} onChange={(event) => update("heart_disease", event.target.value)}><option value="0">No</option><option value="1">Yes</option></select></label>
          <label>Smoking history<select value={values.smoking_history} onChange={(event) => update("smoking_history", event.target.value)}><option value="never">Never</option><option value="No Info">No Info</option><option value="current">Current</option><option value="former">Former</option><option value="ever">Ever</option><option value="not current">Not current</option></select></label>
          <label>BMI <span className="unit">kg/m²</span><input type="number" min="5" max="100" step="0.1" value={values.bmi} onChange={(event) => update("bmi", event.target.value)} required /></label>
          <label>HbA1c level <span className="unit">%</span><input type="number" min="2" max="20" step="0.1" value={values.HbA1c_level} onChange={(event) => update("HbA1c_level", event.target.value)} required /></label>
          <label>Blood glucose <span className="unit">mg/dL</span><input type="number" min="20" max="500" step="1" value={values.blood_glucose_level} onChange={(event) => update("blood_glucose_level", event.target.value)} required /></label>
        </div>
        <div className="form-actions"><div className="privacy-note"><ShieldCheck size={14} /> Data is used only for this prediction request.</div><button className="primary-button" type="submit" disabled={loading}>{loading ? <><LoaderCircle size={17} className="spin" /> Running models</> : <>Run prediction <ArrowRight size={17} /></>}</button></div>
      </form>

      <section className="results-column" aria-live="polite">
        <div className="results-heading"><div><div className="eyebrow">MODEL OUTPUT</div><h2>Two perspectives, one decision</h2></div><span className="live-pill"><span /> Ready</span></div>
        <ResultCard name="random_forest" result={result?.predictions?.random_forest} />
        <ResultCard name="gradient_boosting" result={result?.predictions?.gradient_boosting} />
        {result?.recommended_model && <div className="recommendation"><CheckCircle2 size={18} /><div><strong>{modelLabel(result.recommended_model)} is the validation leader</strong><p>{result.recommendation_reason}</p></div></div>}
        {error && <div className="error-box"><AlertCircle size={18} /><div><strong>Prediction service unavailable</strong><p>{error}</p><small>Have you trained the models and added the generated files to <code>models/</code>?</small></div></div>}
        {!result && !error && <div className="result-tip"><div className="tip-icon">✦</div><div><strong>How to read the result</strong><p>Probability is the model&apos;s estimated likelihood for class 1. Compare both outputs, then use the tuned validation metrics in the Compare view.</p></div></div>}
      </section>
    </div>
  );
}
