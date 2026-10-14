export const featureRows = [
  { name: "Gender", type: "Categorical", meaning: "Reported gender category in the source dataset." },
  { name: "Age", type: "Years", meaning: "Age recorded in years." },
  { name: "Hypertension history", type: "Yes / no", meaning: "Whether hypertension was recorded for the profile." },
  { name: "Heart disease history", type: "Yes / no", meaning: "Whether heart disease was recorded for the profile." },
  { name: "Smoking history", type: "Category", meaning: "Reported smoking category." },
  { name: "Body mass index", type: "BMI", meaning: "A numeric body mass index value." },
  { name: "HbA1c", type: "%", meaning: "Glycated hemoglobin level." },
  { name: "Blood glucose", type: "mg/dL", meaning: "Recorded blood glucose level." },
] as const;
