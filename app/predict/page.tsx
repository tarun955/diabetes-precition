import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import PredictionForm from "@/components/PredictionForm";

export default function PredictPage() {
  return <div className="page-wrap"><header className="topbar"><div className="breadcrumb"><Link href="/">Overview</Link><span>/</span> Predict</div><div className="topbar-status"><span className="status-dot" /> Secure input workspace</div></header><section className="page-intro"><Link href="/" className="back-link"><ArrowLeft size={14} /> Back to overview</Link><div className="eyebrow">INDIVIDUAL SCREENING VIEW</div><h1>Run a patient prediction.</h1><p>Enter the eight dataset features below. Both tuned ensemble pipelines will return a probability and risk band.</p></section><div className="notice-strip"><Info size={16} /><span>This demonstration supports model analysis and is not a clinical diagnosis.</span></div><PredictionForm /></div>;
}
