import { ArrowUpRight, CheckCircle2 } from "lucide-react";

type ModelScoreCardProps = {
  name: string;
  tone: "blue" | "violet";
  description: string;
  strengths: readonly string[];
};

export default function ModelScoreCard({ name, tone, description, strengths }: ModelScoreCardProps) {
  return (
    <article className={`model-card model-${tone}`}>
      <div className="model-card-head">
        <span className="model-dot" />
        <span className="model-kicker">ENSEMBLE CLASSIFIER</span>
        <ArrowUpRight size={17} className="model-arrow" />
      </div>
      <h3>{name}</h3>
      <p>{description}</p>
      <div className="model-divider" />
      <ul className="strength-list">
        {strengths.map((strength) => <li key={strength}><CheckCircle2 size={15} /> {strength}</li>)}
      </ul>
      <div className="tuned-chip"><span /> Tuned with randomized search</div>
    </article>
  );
}
