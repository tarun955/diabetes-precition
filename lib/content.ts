export const modelCards = [
  {
    name: "Random Forest",
    shortName: "RF",
    tone: "blue",
    description: "Bagged decision trees that reduce variance through randomized samples and features.",
    strengths: ["Stable on mixed data", "Built-in feature importance", "Robust to noisy records"],
  },
  {
    name: "Gradient Boosting",
    shortName: "GB",
    tone: "violet",
    description: "Sequential trees that focus on correcting the errors made by earlier learners.",
    strengths: ["Captures subtle patterns", "Strong predictive accuracy", "Flexible decision boundaries"],
  },
] as const;

export const featureRows = [
  { name: "Gender", type: "Categorical", meaning: "Reported gender category" },
  { name: "Age", type: "Numeric", meaning: "Patient age in years" },
  { name: "Hypertension", type: "Binary", meaning: "History of hypertension" },
  { name: "Heart disease", type: "Binary", meaning: "History of heart disease" },
  { name: "Smoking history", type: "Categorical", meaning: "Reported smoking category" },
  { name: "BMI", type: "Numeric", meaning: "Body mass index" },
  { name: "HbA1c level", type: "Numeric", meaning: "Glycated hemoglobin level" },
  { name: "Blood glucose", type: "Numeric", meaning: "Blood glucose level" },
] as const;

export const workflow = [
  { number: "01", title: "Prepare", body: "Validate types, impute gaps, encode categories, scale numeric fields, and clip extreme values." },
  { number: "02", title: "Tune", body: "Search model-specific parameter combinations using stratified cross-validation." },
  { number: "03", title: "Compare", body: "Evaluate precision, recall, F1, accuracy, ROC-AUC, and confusion matrices." },
] as const;
