"use client";

import { useRef, useState } from "react";

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

type ModelResult = { label: "Lower likelihood" | "Higher likelihood"; probability: number };
type ApiResult = { ok: true; predictions: { random_forest: ModelResult; gradient_boosting: ModelResult } };

const exampleValues: Inputs = { gender: "Female", age: "45", hypertension: "0", heart_disease: "0", smoking_history: "never", bmi: "27.5", HbA1c_level: "5.7", blood_glucose_level: "120" };
const higherGlucoseValues: Inputs = { ...exampleValues, blood_glucose_level: "240" };

function isModelResult(value: unknown): value is ModelResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<ModelResult>;
  return typeof result.probability === "number" && Number.isFinite(result.probability)
    && result.probability >= 0 && result.probability <= 100
    && (result.label === "Lower likelihood" || result.label === "Higher likelihood");
}

function isApiResult(value: unknown): value is ApiResult {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<ApiResult>;
  return body.ok === true && isModelResult(body.predictions?.random_forest)
    && isModelResult(body.predictions?.gradient_boosting);
}

function modelLabel(name: string) { return name === "random_forest" ? "Random Forest" : "Gradient Boosting"; }

function ResultCard({ name, result }: { name: string; result?: ModelResult }) {
  return <article className={`result-card ${result ? "has-result" : "result-empty"}`}>
    <div className="result-model-name"><span className={`model-mark ${name === "random_forest" ? "forest-mark" : "boost-mark"}`} />{modelLabel(name)}</div>
    {result ? <><div className="result-main"><div><strong>{result.probability}%</strong><span>predicted probability in this demonstration</span></div><span className="likelihood-label">{result.label}</span></div><div className="probability-track" aria-hidden="true"><span style={{ width: `${result.probability}%` }} /></div><div className="result-footer"><span>Both models read the same profile.</span></div></> : <div className="result-placeholder">No estimate yet. Complete the profile and show both readings.</div>}
  </article>;
}

export default function PredictionForm() {
  const [values, setValues] = useState<Inputs>(exampleValues);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  function update(field: keyof Inputs, value: string) {
    if (inFlight.current) return;
    setResult(null);
    setError("");
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function predict(profile: Inputs) {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    setResult(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 35000);
    const payload = { ...profile, age: Number(profile.age), hypertension: Number(profile.hypertension), heart_disease: Number(profile.heart_disease), bmi: Number(profile.bmi), HbA1c_level: Number(profile.HbA1c_level), blood_glucose_level: Number(profile.blood_glucose_level) };
    try {
      const response = await fetch("/api/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        setError(response.status === 400 || response.status === 413
          ? "Please check the eight profile values and try again."
          : "We couldn’t reach the prediction service. Please try again shortly.");
        return;
      }
      const body: unknown = await response.json();
      if (!isApiResult(body)) {
        setError("We couldn’t read the model estimates. Please try again shortly.");
        return;
      }
      setResult(body);
    } catch {
      setError(controller.signal.aborted
        ? "The model service took too long to respond. Please try again."
        : "We couldn’t reach the prediction service. Please check your connection and try again.");
    } finally {
      window.clearTimeout(timeout);
      inFlight.current = false;
      setLoading(false);
    }
  }

  function runExample(profile: Inputs) {
    if (inFlight.current) return;
    setValues(profile);
    void predict(profile);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void predict(values);
  }

  return <div className="predict-layout">
    <form id="prediction-form" className="patient-form" onSubmit={submit} aria-describedby="example-description" aria-busy={loading}>
      <p id="example-description" className="privacy-note">The prefilled values are an illustrative example, not a real person. Each sample button fills a profile and runs both trained models.</p>
      <div className="form-section" role="group" aria-labelledby="person-heading" aria-describedby="person-description">
        <h2 id="person-heading">About the person</h2><p id="person-description">Basic fields as they appear in the source dataset.</p>
        <div className="form-grid">
          <label>Gender<select value={values.gender} onChange={(event) => update("gender", event.target.value)} disabled={loading}><option>Female</option><option>Male</option><option>Other</option></select></label>
          <label>Age <span className="unit">years</span><input type="number" min="0" max="120" step="1" value={values.age} onChange={(event) => update("age", event.target.value)} disabled={loading} required /></label>
        </div>
      </div>
      <div className="form-section" role="group" aria-labelledby="history-heading" aria-describedby="history-description">
        <h2 id="history-heading">Health history</h2><p id="history-description">Recorded history, not a complete medical history.</p>
        <div className="form-grid">
          <label>High blood pressure history<select value={values.hypertension} onChange={(event) => update("hypertension", event.target.value)} disabled={loading}><option value="0">No</option><option value="1">Yes</option></select></label>
          <label>Heart disease history<select value={values.heart_disease} onChange={(event) => update("heart_disease", event.target.value)} disabled={loading}><option value="0">No</option><option value="1">Yes</option></select></label>
          <label className="wide">Smoking history<select value={values.smoking_history} onChange={(event) => update("smoking_history", event.target.value)} disabled={loading}><option value="never">Never</option><option value="No Info">No information</option><option value="current">Current</option><option value="former">Former</option><option value="ever">Ever</option><option value="not current">Not current</option></select></label>
        </div>
      </div>
      <div className="form-section" role="group" aria-labelledby="measurements-heading" aria-describedby="measurements-description">
        <h2 id="measurements-heading">Measurements</h2><p id="measurements-description">Three numeric signals used by the trained models.</p>
        <div className="form-grid">
          <label>Body mass index <span className="unit">BMI</span><input type="number" min="5" max="100" step="0.1" value={values.bmi} onChange={(event) => update("bmi", event.target.value)} disabled={loading} required /></label>
          <label>Glycated hemoglobin <span className="unit">HbA1c %</span><input type="number" min="2" max="20" step="0.1" value={values.HbA1c_level} onChange={(event) => update("HbA1c_level", event.target.value)} disabled={loading} required /></label>
          <label className="wide">Blood glucose <span className="unit">mg/dL</span><input type="number" min="20" max="500" step="1" value={values.blood_glucose_level} onChange={(event) => update("blood_glucose_level", event.target.value)} disabled={loading} required /></label>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="under-link" onClick={() => runExample(exampleValues)} disabled={loading}>Run default example</button>
        <button type="button" className="under-link" onClick={() => runExample(higherGlucoseValues)} disabled={loading}>Run higher-glucose example</button>
        <button className="button button-dark" type="submit" disabled={loading}>{loading ? "Reading the profile…" : "Show both estimates →"}</button>
      </div>
    </form>
    <section className="results-column" aria-live="polite" aria-busy={loading}>
      <div className="results-heading"><h2>Two estimates<br />for the same profile.</h2><p>The percentage is a model output, not a personal medical risk score.</p></div>
      <ResultCard name="random_forest" result={result?.predictions.random_forest} />
      <ResultCard name="gradient_boosting" result={result?.predictions.gradient_boosting} />
      {error && <div className="error-box" role="alert"><strong>No estimates are available.</strong><p>{error}</p><button type="submit" form="prediction-form" className="under-link" disabled={loading}>Try again</button></div>}
      {!result && !error && <div className="result-tip"><strong>{loading ? "Running both models…" : "What will happen?"}</strong><p>The same eight values will be passed to both ensembles. Their readings may agree, or they may differ slightly because they learn in different ways.</p></div>}
    </section>
  </div>;
}
