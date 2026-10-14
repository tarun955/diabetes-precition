import Link from "next/link";
import PredictionForm from "@/components/PredictionForm";

export default function PredictPage() {
  return (
    <div className="inner-page">
      <section className="inner-page-header">
        <div><Link href="/" className="back-link">← Start here</Link><p className="side-note" style={{ marginTop: 34 }}>Use an example profile or enter values from the eight fields used by the study.</p></div>
        <div><h1>See what both models make of one profile.</h1><p className="lead">The same inputs go to both learners. You will see two estimated likelihoods, written in plain language. This is an educational demonstration, not a diagnosis.</p></div>
      </section>
      <div className="method-note">Do not enter names or other identifying information. The example profile is illustrative and does not represent a real person.</div>
      <div style={{ marginTop: 36 }}><PredictionForm /></div>
    </div>
  );
}
