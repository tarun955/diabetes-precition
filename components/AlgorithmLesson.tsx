"use client";

import { useState } from "react";
import styles from "./AlgorithmLesson.module.css";

type LessonMode = "forest" | "boosting";

const forestSteps = [
  {
    title: "Tree A starts with one view.",
    body: "A small tree reads a slightly different slice of the training records and gives an illustrative 20% probability.",
  },
  {
    title: "Tree B brings another view.",
    body: "A second, independent tree sees another slice and gives 30%. It does not copy Tree A's path.",
  },
  {
    title: "Tree C adds one more opinion.",
    body: "A third tree gives 40%. Three modest readings are more useful together than one tree acting alone.",
  },
  {
    title: "The forest averages probabilities.",
    body: "The combination is (20% + 30% + 40%) ÷ 3 = 30%. Random Forest keeps the probability information, rather than only counting which class won most votes.",
  },
] as const;

const boostingStages = [
  {
    title: "Initial estimate",
    logOdds: "−1.0",
    probability: "27%",
    update: "baseline",
    body: "The first estimate is a simple starting point. Its log-odds of −1.0 translate to an illustrative probability of about 27%.",
  },
  {
    title: "Learn from errors",
    logOdds: "−0.5",
    probability: "38%",
    update: "+0.5",
    body: "During training, the next tree studies where the earlier estimate missed. An illustrative +0.5 log-odds correction moves the estimate to about 38%.",
  },
  {
    title: "Adjusted estimate",
    logOdds: "−0.2",
    probability: "45%",
    update: "+0.3",
    body: "Another small training correction of +0.3 moves the running log-odds to −0.2, or about 45% in this illustration.",
  },
] as const;

function forestTreeState(step: number, treeIndex: number) {
  if (step === treeIndex) return styles.treeCurrent;
  if (step > treeIndex) return styles.treeReached;
  return styles.treeWaiting;
}

function ForestDiagram({ step }: { step: number }) {
  const trees = [
    { label: "Tree A", output: "20%", x: 4 },
    { label: "Tree B", output: "30%", x: 208 },
    { label: "Tree C", output: "40%", x: 412 },
  ];

  return (
    <svg
      className={styles.forestDiagram}
      viewBox="0 0 620 178"
      role="img"
      aria-labelledby="forest-diagram-title forest-diagram-description"
    >
      <title id="forest-diagram-title">Three small Random Forest decision trees</title>
      <desc id="forest-diagram-description">
        Tree A gives 20 percent, Tree B gives 30 percent, and Tree C gives 40 percent. Their probabilities are averaged into 30 percent.
      </desc>
      {trees.map((tree, index) => (
        <g
          className={`${styles.tree} ${forestTreeState(step, index)}`}
          key={tree.label}
          transform={`translate(${tree.x} 0)`}
        >
          <title>{`${tree.label}: illustrative output ${tree.output}`}</title>
          <text className={styles.treeLabel} x="94" y="18" textAnchor="middle">
            {tree.label}
          </text>
          <path className={styles.treeBranch} d="M94 43 L48 82 M94 43 L140 82 M48 82 L25 122 M48 82 L70 122 M140 82 L118 122 M140 82 L163 122" />
          <circle className={styles.treeNode} cx="94" cy="43" r="7" />
          <circle className={styles.treeNode} cx="48" cy="82" r="5" />
          <circle className={styles.treeNode} cx="140" cy="82" r="5" />
          <rect className={styles.treeLeaf} x="8" y="120" height="25" width="35" />
          <rect className={styles.treeLeaf} x="52" y="120" height="25" width="35" />
          <rect className={styles.treeLeaf} x="100" y="120" height="25" width="35" />
          <rect className={styles.treeLeaf} x="146" y="120" height="25" width="35" />
          <text className={styles.treeOutput} x="94" y="163" textAnchor="middle">
            {tree.output}
          </text>
        </g>
      ))}
    </svg>
  );
}

function BoostingDiagram({ step }: { step: number }) {
  const stageX = [12, 212, 412];

  return (
    <svg
      className={styles.boostingDiagram}
      viewBox="0 0 620 164"
      role="img"
      aria-labelledby="boosting-diagram-title boosting-diagram-description"
    >
      <title id="boosting-diagram-title">Three sequential Gradient Boosting training stages</title>
      <desc id="boosting-diagram-description">
        An initial estimate is followed by a tree that learns from errors, then an adjusted estimate. The example uses fixed illustrative log-odds and derived probabilities.
      </desc>
      <path className={styles.stageArrow} d="M177 74 H203 M197 68 L205 74 L197 80" />
      <path className={styles.stageArrow} d="M377 74 H403 M397 68 L405 74 L397 80" />
      <text className={styles.arrowLabel} x="190" y="48" textAnchor="middle">
        learn
      </text>
      <text className={styles.arrowLabel} x="390" y="48" textAnchor="middle">
        correct
      </text>
      {boostingStages.map((stage, index) => (
        <g
          className={`${styles.boostStage} ${step === index ? styles.stageCurrent : step > index ? styles.stageReached : styles.stageWaiting}`}
          key={stage.title}
          transform={`translate(${stageX[index]} 0)`}
        >
          <title>{`${stage.title}: log-odds ${stage.logOdds}, probability ${stage.probability}`}</title>
          <rect className={styles.stageBlock} x="0" y="58" width="166" height="66" />
          <text className={styles.stageTitle} x="83" y="78" textAnchor="middle">
            {stage.title}
          </text>
          <text className={styles.stageNumbers} x="83" y="99" textAnchor="middle">
            log-odds {stage.logOdds}
          </text>
          <text className={styles.stageProbability} x="83" y="116" textAnchor="middle">
            ≈ {stage.probability} probability
          </text>
          {index > 0 && (
            <text className={styles.stageUpdate} x="83" y="145" textAnchor="middle">
              {stage.update} correction
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function LessonControls({ mode, onModeChange }: { mode: LessonMode; onModeChange: (mode: LessonMode) => void }) {
  return (
    <div className={styles.selector}>
      <span className={styles.selectorLabel}>Choose a learning habit</span>
      <div className={styles.modelToggle} role="group" aria-label="Choose a model to explain">
        <button
          className={`${styles.modelButton} ${styles.forestButton}`}
          type="button"
          aria-pressed={mode === "forest"}
          onClick={() => onModeChange("forest")}
        >
          <span className={styles.buttonKey}>RF</span>
          <span>Random Forest</span>
        </button>
        <button
          className={`${styles.modelButton} ${styles.boostButton}`}
          type="button"
          aria-pressed={mode === "boosting"}
          onClick={() => onModeChange("boosting")}
        >
          <span className={styles.buttonKey}>GB</span>
          <span>Gradient Boosting</span>
        </button>
      </div>
    </div>
  );
}

function ForestLesson({ step, onStepChange }: { step: number; onStepChange: (step: number) => void }) {
  const currentStep = forestSteps[step];
  const isComplete = step === forestSteps.length - 1;

  return (
    <div className={styles.lessonContent}>
      <div className={`${styles.visualPane} ${styles.forestVisual}`}>
        <div className={styles.modelHeading}>
          <span className={styles.modelDot} aria-hidden="true" />
          <span>Random Forest</span>
          <span className={styles.modelDescriptor}>independent trees</span>
        </div>
        <figure className={styles.diagramFigure}>
          <ForestDiagram step={step} />
          <figcaption>Each tree works independently. The forest combines the probability each one gives.</figcaption>
        </figure>
        <div className={styles.equation} aria-label="20 percent plus 30 percent plus 40 percent divided by 3 equals 30 percent average">
          <span>20%</span>
          <span aria-hidden="true">+</span>
          <span>30%</span>
          <span aria-hidden="true">+</span>
          <span>40%</span>
          <span aria-hidden="true">÷ 3 =</span>
          <strong>30%</strong>
          <small>average probability</small>
        </div>
      </div>
      <div className={styles.explanationPane}>
        <div className={styles.liveCopy} id="forest-readout" aria-live="polite">
          <h3>{currentStep.title}</h3>
          <p>{currentStep.body}</p>
        </div>
        <div className={styles.controlLine}>
          <button
            className={styles.nextButton}
            type="button"
            aria-controls="forest-readout"
            onClick={() => onStepChange(isComplete ? 0 : step + 1)}
          >
            {isComplete ? "Replay forest lesson" : "Next step"}
            <span aria-hidden="true">{isComplete ? "↺" : "→"}</span>
          </button>
          <span className={styles.controlHint}>{isComplete ? "Start with Tree A again" : "Follow the trees to the average"}</span>
        </div>
      </div>
    </div>
  );
}

function BoostingLesson({ step, onStepChange }: { step: number; onStepChange: (step: number) => void }) {
  const currentStage = boostingStages[step];
  const isComplete = step === boostingStages.length - 1;

  return (
    <div className={styles.lessonContent}>
      <div className={`${styles.visualPane} ${styles.boostingVisual}`}>
        <div className={styles.modelHeading}>
          <span className={`${styles.modelDot} ${styles.boostDot}`} aria-hidden="true" />
          <span>Gradient Boosting</span>
          <span className={styles.modelDescriptor}>sequential corrections</span>
        </div>
        <figure className={styles.diagramFigure}>
          <BoostingDiagram step={step} />
          <figcaption>Fixed illustrative values show how each training stage adjusts the running estimate.</figcaption>
        </figure>
        <div className={styles.trainingNote}>
          <strong>Training detail:</strong> error correction happens while the model is trained. A patient does not retrain the model.
        </div>
      </div>
      <div className={styles.explanationPane}>
        <div className={styles.liveCopy} id="boosting-readout" aria-live="polite">
          <h3>{currentStage.title}</h3>
          <p>{currentStage.body}</p>
        </div>
        <div className={styles.controlLine}>
          <button
            className={`${styles.nextButton} ${styles.boostNextButton}`}
            type="button"
            aria-controls="boosting-readout"
            onClick={() => onStepChange(isComplete ? 0 : step + 1)}
          >
            {isComplete ? "Replay boosting lesson" : "Next stage"}
            <span aria-hidden="true">{isComplete ? "↺" : "→"}</span>
          </button>
          <span className={styles.controlHint}>{isComplete ? "Return to the initial estimate" : "Reveal the next correction"}</span>
        </div>
      </div>
    </div>
  );
}

export default function AlgorithmLesson() {
  const [mode, setMode] = useState<LessonMode>("forest");
  const [forestStep, setForestStep] = useState(0);
  const [boostingStep, setBoostingStep] = useState(0);

  const changeMode = (nextMode: LessonMode) => {
    setMode(nextMode);
  };

  return (
    <section className={styles.lesson} aria-labelledby="algorithm-lesson-title">
      <div className={styles.lessonHeader}>
        <div className={styles.headingCopy}>
          <h2 id="algorithm-lesson-title">Two ways to combine small decisions.</h2>
          <p>Random Forest listens to independent trees. Gradient Boosting lets each tree learn from the last one&apos;s errors.</p>
        </div>
        <LessonControls mode={mode} onModeChange={changeMode} />
      </div>
      <div className={styles.lessonRule} />
      {mode === "forest" ? <ForestLesson step={forestStep} onStepChange={setForestStep} /> : <BoostingLesson step={boostingStep} onStepChange={setBoostingStep} />}
      <p className={styles.illustrationNote}>Illustration only — not this profile&apos;s prediction.</p>
    </section>
  );
}
