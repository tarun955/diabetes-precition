import Link from "next/link";
import { ArrowRight, BarChart3, Database, GitCompareArrows, Layers3, SlidersHorizontal } from "lucide-react";
import ModelScoreCard from "@/components/ModelScoreCard";
import StatCard from "@/components/StatCard";
import { modelCards, workflow } from "@/lib/content";

export default function HomePage() {
  return (
    <div className="page-wrap">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> Overview</div><div className="topbar-status"><span className="status-dot" /> Models ready for review</div></header>
      <section className="hero-block">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> ENSEMBLE MODELING STUDY</div><h1>See the signal<br /><em>behind the prediction.</em></h1><p>Explore how Random Forest and Gradient Boosting read the same patient profile, where they agree, and why one may generalize better.</p><div className="hero-actions"><Link href="/predict" className="primary-button">Start a prediction <ArrowRight size={17} /></Link><Link href="/compare" className="text-button">Review comparison <BarChart3 size={16} /></Link></div></div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit-ring orbit-ring-one" /><div className="orbit-ring orbit-ring-two" /><div className="orbit-center"><GitCompareArrows size={31} /><span>RF <i>×</i> GB</span></div><span className="orbit-label orbit-label-one">precision</span><span className="orbit-label orbit-label-two">recall</span><span className="orbit-label orbit-label-three">ROC-AUC</span></div>
      </section>

      <section className="stats-grid"><StatCard label="Algorithms" value="02" detail="Ensemble classifiers" icon={<Layers3 size={17} />} /><StatCard label="Patient signals" value="08" detail="Clinical input features" icon={<Database size={17} />} /><StatCard label="Evaluation" value="05" detail="Core metrics tracked" icon={<BarChart3 size={17} />} /><StatCard label="Tuning" value="CV" detail="Randomized search" icon={<SlidersHorizontal size={17} />} /></section>

      <section className="section-block"><div className="section-heading"><div><div className="eyebrow">THE TWO LENSES</div><h2>Different paths to the same question</h2></div><Link href="/compare" className="text-button">See the full comparison <ArrowRight size={15} /></Link></div><div className="model-grid">{modelCards.map((model) => <ModelScoreCard key={model.name} {...model} />)}</div></section>

      <section className="workflow-section"><div className="section-heading"><div><div className="eyebrow">RESEARCH WORKFLOW</div><h2>From raw records to useful evidence</h2></div></div><div className="workflow-grid">{workflow.map((step) => <div className="workflow-step" key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></div>)}</div></section>
      <footer className="page-footer"><span>Diabetes Ensemble Lab</span><span>Classification • Ensemble learning • Explainable comparison</span></footer>
    </div>
  );
}
