import Link from "next/link";
import AlgorithmLesson from "@/components/AlgorithmLesson";
import metadata from "@/models/metadata.json";

const rf = metadata.metrics.random_forest;
const gb = metadata.metrics.gradient_boosting;

const signalBlocks = ["Age", "Blood pressure history", "Heart history", "Smoking history", "BMI", "HbA1c", "Blood glucose", "Gender"];
const treeDots = Array.from({ length: 36 }, (_, index) => index);

export default function HomePage() {
  return (
    <div className="study-page">
      <section className="masthead">
        <div className="masthead-side">
          <p className="side-note">A visual guide to an ensemble classification study</p>
          <div className="side-rule" />
          <p className="side-note">100,000 records<br />eight input fields<br />one recorded outcome</p>
        </div>
        <div className="masthead-copy">
          <h1>What do models see?</h1>
          <p className="lead">Two different ways of reading the same eight signals. This study shows how Random Forest and Gradient Boosting turn a patient profile into an estimated likelihood — and where that estimate stops.</p>
          <div className="masthead-actions"><Link href="/predict" className="button button-dark">Try an example profile <span aria-hidden="true">→</span></Link><Link href="/compare" className="under-link">See the evidence first</Link></div>
        </div>
        <div className="masthead-visual" data-ui aria-label="Illustration showing eight input signals being read by two models">
          <div className="visual-heading"><span>One profile</span><span>two readings</span></div>
          <div className="signal-stack">{signalBlocks.map((signal) => <span key={signal}>{signal}</span>)}</div>
          <div className="reading-paths"><span /><span /></div>
          <div className="reading-stack"><div><strong>Random Forest</strong><em>{(rf.roc_auc * 100).toFixed(2)}<small> AUC</small></em></div><div><strong>Gradient Boosting</strong><em>{(gb.roc_auc * 100).toFixed(2)}<small> AUC</small></em></div></div>
          <p className="visual-caption">The models see the same record. Their difference is how they learn from it.</p>
        </div>
      </section>

      <section className="dark-band opening-note"><div className="dark-band-label">The central idea</div><p>One profile. Two readings. Each score answers a question.</p></section>

      <section className="story-section model-reading">
        <div className="story-aside"><span>Two model lenses</span><p>Different learning habits create different strengths.</p></div>
        <div className="story-main"><h2>Same evidence.<br />Different route.</h2><p className="body-copy">Both models are ensembles: they combine many small decision trees instead of relying on one. The distinction is what happens between those trees.</p>
          <div className="lens-grid">
            <article className="lens-panel forest-panel" data-ui><div className="lens-title"><span className="model-mark forest-mark" />Random Forest</div><h3>Many trees vote.</h3><p>Many trees look at slightly different versions of the records. Their votes are averaged into one reading. In this study, it is slightly stronger on precision and accuracy.</p><div className="forest-diagram" aria-hidden="true">{treeDots.map((dot) => <span key={dot} style={{ transform: `rotate(${dot * 10}deg) translateY(${20 + (dot % 4) * 11}px)` }} />)}<b>many trees</b><i>one vote</i></div></article>
            <article className="lens-panel boost-panel" data-ui><div className="lens-title"><span className="model-mark boost-mark" />Gradient Boosting</div><h3>A team learns from misses.</h3><p>Trees are built one after another. Each new tree concentrates on what the earlier trees missed. Here, it edges ahead on recall, F1, and ROC-AUC.</p><div className="boost-diagram" aria-hidden="true"><span>first read</span><span>correct</span><span>refine</span><strong>stronger next reading</strong></div></article>
          </div>
        </div>
      </section>

      <AlgorithmLesson />

      <section className="chapter-band process-band"><div className="chapter-intro"><h2>From records<br />to evidence</h2><p>Every result follows the same three-part path. The interface makes the path visible so the numbers have somewhere to land.</p></div><div className="process-visual" aria-label="Three stages of the model study"><div className="process-stage stage-gather"><div className="dot-cloud">{Array.from({ length: 22 }, (_, index) => <i key={index} style={{ left: `${(index * 41) % 86}%`, top: `${(index * 29) % 76}%` }} />)}</div><h3>Prepare</h3><p>Clean, encode, and check the eight fields.</p></div><div className="process-stage stage-learn"><div className="tree-row">{Array.from({ length: 7 }, (_, index) => <i key={index} style={{ height: `${34 + (index % 3) * 14}px` }} />)}</div><h3>Tune</h3><p>Search multiple settings with cross-validation.</p></div><div className="process-stage stage-read"><div className="result-lines"><i /><i /><i /></div><h3>Compare</h3><p>Read accuracy, precision, recall, F1, and ROC-AUC together.</p></div></div></section>

      <section className="evidence-section"><div className="evidence-heading"><h2>Nearly tied.<br />Not identical.</h2><p>The models are close, but each metric answers a different question. A plain-language comparison is more useful than a single winner.</p><Link href="/compare" className="under-link">Read the full comparison →</Link></div><div className="score-board" data-ui><div className="score-board-head"><span>Held-out test</span><span>Random Forest</span><span>Gradient Boosting</span></div>{[["Accuracy", rf.accuracy, gb.accuracy, "How often was the overall prediction correct?"], ["Precision", rf.precision, gb.precision, "When it flagged a positive, how often was it right?"], ["Recall", rf.recall, gb.recall, "How many recorded positive cases did it find?"], ["ROC-AUC", rf.roc_auc, gb.roc_auc, "How well did it rank positive cases above negative ones?"]].map(([label, rfValue, gbValue, explanation]) => <div className="score-row" key={String(label)}><strong>{label}</strong><span className="score-explanation">{explanation}</span><b>{(Number(rfValue) * 100).toFixed(2)}<small>%</small></b><b>{(Number(gbValue) * 100).toFixed(2)}<small>%</small></b></div>)}</div></section>

      <section className="limit-band"><div className="limit-mark">!</div><div><h2>A high score is not a clinical finding.</h2><p>This is a model demonstration trained on a public dataset. It does not diagnose anyone, recommend treatment, or provide a validated personal risk score.</p></div><Link href="/insights" className="button button-paper">Understand the limits <span aria-hidden="true">→</span></Link></section>
      <footer className="study-footer"><strong>Diabetes model study</strong><span>Random Forest × Gradient Boosting</span><span>Educational use only</span></footer>
    </div>
  );
}
