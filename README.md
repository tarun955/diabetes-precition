# Diabetes Ensemble Lab

A Vercel-ready diabetes prediction study comparing **Random Forest** and
**Gradient Boosting** on the faculty-approved Kaggle dataset:

`iammustafatz/diabetes-prediction-dataset`

The project is deliberately split into two layers:

- `app/`, `components/`, and `lib/` — polished Next.js UI
- `api/`, `scripts/`, `model_utils.py`, and `models/` — Python training and
  serverless inference

The notebook and presentation are generated into `notebooks/` and
`presentation/` by `python scripts/create_deliverables.py`.

## What is included

- Overview dashboard explaining the two ensemble approaches
- Patient prediction form returning both probabilities and risk bands
- Live comparison page reading validation metrics from `models/metadata.json`
- Dataset and preprocessing interpretation page
- Randomized hyperparameter search with stratified cross-validation
- Accuracy, precision, recall, F1, ROC-AUC, confusion matrices, ROC curve, and
  feature-importance output
- Manual binary-metric calculation for the rubric
- Jupyter Notebook with markdown explanations and runnable cells
- Exactly four-slide PowerPoint presentation

The prediction interface is an educational model demonstration, not a clinical
diagnosis or substitute for professional medical advice.

## 1. Add the faculty CSV

Place the exact file supplied by the faculty in `data/`. The standard filename
is `data/diabetes_prediction_dataset.csv`, but any CSV can be passed explicitly
to the training command. The loader expects these columns:

```text
gender, age, hypertension, heart_disease, smoking_history,
bmi, HbA1c_level, blood_glucose_level, diabetes
```

Do not commit the raw CSV. It is ignored by `.gitignore`.

## 2. Install dependencies

Use Python 3.12 for the closest match to the Vercel function runtime.

```bash
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-training.txt
npm install
```

## 3. Train and export the models

```bash
python scripts/train_models.py --data-file data/diabetes_prediction_dataset.csv
```

This writes:

- `models/random_forest.joblib`
- `models/gradient_boosting.joblib`
- `models/metadata.json`
- `models/test_predictions.csv`
- `outputs/dataset_profile.png`
- `outputs/confusion_matrices.png`
- `outputs/roc_comparison.png`
- `outputs/metric_comparison.png`

The model artifacts are intentionally trackable because the deployed Python
function needs them. Review the generated `metadata.json` before committing.

The current local training run used 4 randomized configurations per model and
3-fold stratified cross-validation. It produced 100,000 usable records. On the
held-out split, Random Forest reached accuracy `0.9724` and ROC-AUC `0.9765`,
while Gradient Boosting reached accuracy `0.9723` and ROC-AUC `0.9788`.
Gradient Boosting had the slightly stronger ROC-AUC, recall, and F1; Random
Forest had the strongest precision and a tiny accuracy advantage. These values
are dataset-specific and are regenerated when the CSV or tuning budget changes.

## 4. Build the notebook and presentation

```bash
python scripts/create_deliverables.py
```

Generated files:

- `notebooks/diabetes_ensemble_study.ipynb`
- `presentation/diabetes_ensemble_presentation.pptx`
- `presentation/prototype-screens.pdf`
- `presentation/screenshots/*.png`

The final deck uses the four real working prototype screenshots stored in
`presentation/screenshots/`: Overview, Prediction, Compare models, and
Understand the data. Generate it again with `python scripts/create_deliverables.py`
after refreshing those screenshots.

## 5. Run the UI and deploy to Vercel

For the frontend-only preview:

```bash
npm run dev
```

The Python function is available locally through the Vercel runtime rather than
plain `next dev`:

```bash
npx vercel dev
```

To deploy through the GitHub-connected Vercel project:

1. Push the project, including the three files in `models/`, to GitHub.
2. Import the repository in Vercel and keep the framework preset as **Next.js**.
3. Keep the repository root as the project root; do not set a subdirectory.
4. Deploy. Vercel detects `api/predict.py` as `/api/predict` and
   `api/metadata.py` as `/api/metadata`.

The model artifacts are required at deploy time. If a fresh artifact is needed,
run the training command again, inspect `models/metadata.json`, and commit the
updated `.joblib` and metadata files. Configure function memory in the Vercel
project settings if the account uses Fluid compute.
