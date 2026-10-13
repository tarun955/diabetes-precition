# Deployment model artifacts

The Vercel function loads these generated files at runtime:

- `random_forest.joblib`
- `gradient_boosting.joblib`
- `metadata.json`

They are intentionally **not ignored by Git**. After the faculty CSV is added,
run:

```bash
python scripts/train_models.py --data-file data/diabetes_prediction_dataset.csv
```

Review the generated metrics and commit the three files so Vercel can bundle
them with `api/predict.py`. Never commit the private Kaggle credentials or the
raw CSV.
