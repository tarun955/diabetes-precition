"""Train, tune, evaluate, and export both ensemble models.

Usage:
    python scripts/train_models.py --data-file data/diabetes_prediction_dataset.csv

The output artifacts are intentionally kept outside source code so the same
notebook can be used with the faculty's exact CSV filename.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
OUTPUT_DIR = ROOT / "outputs"
sys.path.insert(0, str(ROOT))
from model_utils import IQRClipper  # noqa: E402


TARGET = "diabetes"
CATEGORICAL_FEATURES = ["gender", "smoking_history"]
NUMERIC_FEATURES = [
    "age",
    "hypertension",
    "heart_disease",
    "bmi",
    "HbA1c_level",
    "blood_glucose_level",
]
FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-file", default=os.getenv("DATA_FILE"), help="Path to the faculty CSV")
    parser.add_argument("--kaggle-file", default=os.getenv("KAGGLE_FILE", ""), help="Kaggle file path")
    parser.add_argument("--n-iter", type=int, default=8, help="RandomizedSearchCV iterations per model")
    parser.add_argument("--cv", type=int, default=3, help="Cross-validation folds")
    return parser.parse_args()


def resolve_data_file(explicit: str | None) -> Path | None:
    if explicit:
        candidate = Path(explicit)
        if not candidate.is_absolute():
            candidate = ROOT / candidate
        if not candidate.exists():
            raise FileNotFoundError(f"Data file not found: {candidate}")
        return candidate
    candidates = sorted((ROOT / "data").glob("*.csv")) + sorted(ROOT.glob("*.csv"))
    return candidates[0] if candidates else None


def load_data(data_file: Path | None, kaggle_file: str) -> tuple[pd.DataFrame, str]:
    if data_file:
        return pd.read_csv(data_file), str(data_file.relative_to(ROOT))
    if kaggle_file:
        try:
            import kagglehub
            from kagglehub import KaggleDatasetAdapter

            data = kagglehub.load_dataset(
                KaggleDatasetAdapter.PANDAS,
                os.getenv("KAGGLE_DATASET", "iammustafatz/diabetes-prediction-dataset"),
                kaggle_file,
            )
            return data, f"Kaggle: {kaggle_file}"
        except Exception as exc:
            raise RuntimeError(f"Kaggle download failed: {exc}") from exc
    raise FileNotFoundError(
        "No CSV was found. Put the faculty file in data/ or pass "
        "--data-file path/to/diabetes_prediction_dataset.csv."
    )


def clean_data(frame: pd.DataFrame) -> pd.DataFrame:
    data = frame.copy()
    data.columns = [str(column).strip() for column in data.columns]
    if TARGET not in data.columns:
        raise ValueError(f"Target column `{TARGET}` was not found. Columns: {list(data.columns)}")
    missing = [column for column in FEATURES if column not in data.columns]
    if missing:
        raise ValueError(f"Required feature columns are missing: {missing}")

    data = data[FEATURES + [TARGET]].copy()
    data["gender"] = data["gender"].astype("string").str.strip().replace({"Other": "Other"})
    data["smoking_history"] = data["smoking_history"].astype("string").str.strip()
    for column in NUMERIC_FEATURES + [TARGET]:
        data[column] = pd.to_numeric(data[column], errors="coerce")
    data = data.dropna(subset=[TARGET])
    data[TARGET] = data[TARGET].astype(int).clip(0, 1)
    return data


def build_preprocessor() -> ColumnTransformer:
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def build_pipeline(model: Any) -> Pipeline:
    return Pipeline(
        steps=[
            ("outlier_clipper", IQRClipper(NUMERIC_FEATURES)),
            ("preprocessor", build_preprocessor()),
            ("model", model),
        ]
    )


def manual_binary_metrics(y_true: pd.Series, y_pred: np.ndarray) -> dict[str, float]:
    """Manual calculation included for the faculty rubric."""
    matrix = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = matrix.ravel()
    total = tn + fp + fn + tp
    return {
        "accuracy": round((tp + tn) / total, 6) if total else 0.0,
        "precision": round(tp / (tp + fp), 6) if tp + fp else 0.0,
        "recall": round(tp / (tp + fn), 6) if tp + fn else 0.0,
        "specificity": round(tn / (tn + fp), 6) if tn + fp else 0.0,
    }


def evaluate(name: str, search: RandomizedSearchCV, x_test: pd.DataFrame, y_test: pd.Series) -> dict[str, Any]:
    predictions = search.predict(x_test)
    probabilities = search.predict_proba(x_test)[:, 1]
    metrics = {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 6),
        "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 6),
        "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 6),
        "f1": round(float(f1_score(y_test, predictions, zero_division=0)), 6),
        "roc_auc": round(float(roc_auc_score(y_test, probabilities)), 6),
    }
    manual = manual_binary_metrics(y_test, predictions)
    report = classification_report(y_test, predictions, output_dict=True, zero_division=0)
    model = search.best_estimator_
    transformed_names = model.named_steps["preprocessor"].get_feature_names_out().tolist()
    importances = model.named_steps["model"].feature_importances_
    feature_importance = sorted(
        [
            {"feature": feature, "importance": round(float(importance), 6)}
            for feature, importance in zip(transformed_names, importances)
        ],
        key=lambda item: item["importance"],
        reverse=True,
    )[:12]
    return {
        "metrics": metrics,
        "manual_metrics": manual,
        "classification_report": report,
        "best_params": search.best_params_,
        "cv_score": round(float(search.best_score_), 6),
        "feature_importance": feature_importance,
        "predictions": predictions,
        "probabilities": probabilities,
    }


def save_visualizations(data: pd.DataFrame, y_test: pd.Series, evaluations: dict[str, Any]) -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    sns.set_theme(style="whitegrid", palette="deep")

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    sns.countplot(data=data, x=TARGET, ax=axes[0], hue=TARGET, legend=False, palette=["#94a3b8", "#ef7c63"])
    axes[0].set_title("Target balance")
    axes[0].set_xlabel("Diabetes outcome (0 = no, 1 = yes)")
    axes[0].set_ylabel("Records")
    data.select_dtypes(include=np.number).corr()[TARGET].drop(TARGET).sort_values().plot.barh(
        ax=axes[1], color="#2dd4bf"
    )
    axes[1].set_title("Numeric feature correlation with target")
    axes[1].set_xlabel("Pearson correlation")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "dataset_profile.png", dpi=160)
    plt.close(fig)

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    for axis, (name, result) in zip(axes, evaluations.items()):
        matrix = confusion_matrix(y_test, result["predictions"], labels=[0, 1])
        sns.heatmap(matrix, annot=True, fmt="d", cmap="Blues", cbar=False, ax=axis)
        axis.set_title(f"{name.replace('_', ' ').title()} confusion matrix")
        axis.set_xlabel("Predicted label")
        axis.set_ylabel("Actual label")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "confusion_matrices.png", dpi=160)
    plt.close(fig)

    fig, axis = plt.subplots(figsize=(8, 6))
    for name, result in evaluations.items():
        fpr, tpr, _ = roc_curve(y_test, result["probabilities"])
        axis.plot(fpr, tpr, linewidth=2.5, label=f"{name.replace('_', ' ').title()} (AUC {result['metrics']['roc_auc']:.3f})")
    axis.plot([0, 1], [0, 1], linestyle="--", color="#94a3b8", label="Random baseline")
    axis.set_title("ROC curve comparison")
    axis.set_xlabel("False positive rate")
    axis.set_ylabel("True positive rate")
    axis.legend()
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "roc_comparison.png", dpi=160)
    plt.close(fig)

    comparison = pd.DataFrame({name: result["metrics"] for name, result in evaluations.items()}).T
    axis = comparison[["accuracy", "precision", "recall", "f1", "roc_auc"]].plot.bar(
        figsize=(11, 5), color=["#38bdf8", "#a78bfa", "#fb7185", "#fbbf24", "#2dd4bf"]
    )
    axis.set_title("Validation metric comparison")
    axis.set_ylim(0, 1)
    axis.set_ylabel("Score")
    axis.set_xlabel("")
    axis.legend(loc="lower right", ncol=3)
    axis.figure.tight_layout()
    axis.figure.savefig(OUTPUT_DIR / "metric_comparison.png", dpi=160)
    plt.close(axis.figure)


def main() -> None:
    args = parse_args()
    data_file = resolve_data_file(args.data_file)
    raw, source = load_data(data_file, args.kaggle_file)
    data = clean_data(raw)
    x = data[FEATURES]
    y = data[TARGET]
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, stratify=y, random_state=42
    )
    cv = StratifiedKFold(n_splits=args.cv, shuffle=True, random_state=42)

    models = {
        "random_forest": (
            build_pipeline(RandomForestClassifier(random_state=42, n_jobs=-1)),
            {
                "model__n_estimators": [150, 250, 350],
                "model__max_depth": [None, 8, 12, 18],
                "model__min_samples_leaf": [1, 2, 4, 8],
                "model__max_features": ["sqrt", "log2", 0.7],
                "model__class_weight": [None, "balanced", "balanced_subsample"],
            },
        ),
        "gradient_boosting": (
            build_pipeline(GradientBoostingClassifier(random_state=42)),
            {
                "model__n_estimators": [100, 150, 250],
                "model__learning_rate": [0.03, 0.05, 0.1, 0.15],
                "model__max_depth": [2, 3, 4],
                "model__min_samples_leaf": [1, 3, 6],
                "model__subsample": [0.8, 1.0],
            },
        ),
    }

    evaluations: dict[str, Any] = {}
    for name, (pipeline, parameters) in models.items():
        print(f"Tuning {name} with {args.n_iter} randomized configurations...")
        search = RandomizedSearchCV(
            pipeline,
            parameters,
            n_iter=args.n_iter,
            scoring="roc_auc",
            cv=cv,
            n_jobs=-1,
            random_state=42,
            refit=True,
            verbose=1,
        )
        search.fit(x_train, y_train)
        evaluations[name] = evaluate(name, search, x_test, y_test)
        MODEL_DIR.mkdir(exist_ok=True)
        joblib.dump(search.best_estimator_, MODEL_DIR / f"{name}.joblib", compress=3)

    save_visualizations(data, y_test, evaluations)
    predictions_frame = pd.DataFrame({"actual": y_test.to_numpy()})
    for name, result in evaluations.items():
        predictions_frame[f"{name}_prediction"] = result["predictions"]
        predictions_frame[f"{name}_probability"] = result["probabilities"]
    predictions_frame.to_csv(MODEL_DIR / "test_predictions.csv", index=False)

    metrics = {name: result["metrics"] for name, result in evaluations.items()}
    metadata = {
        "source": source,
        "target": TARGET,
        "features": FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "records": int(len(data)),
        "missing_values": {str(key): int(value) for key, value in data.isna().sum().items()},
        "class_distribution": {str(key): int(value) for key, value in y.value_counts().sort_index().items()},
        "test_records": int(len(y_test)),
        "tuning": {
            "search": "RandomizedSearchCV",
            "iterations_per_model": args.n_iter,
            "cv_folds": args.cv,
            "scoring": "roc_auc",
            "random_state": 42,
        },
        "metrics": metrics,
        "manual_metrics": {name: result["manual_metrics"] for name, result in evaluations.items()},
        "best_params": {name: result["best_params"] for name, result in evaluations.items()},
        "cv_score": {name: result["cv_score"] for name, result in evaluations.items()},
        "feature_importance": {name: result["feature_importance"] for name, result in evaluations.items()},
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    (MODEL_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"records": len(data), "metrics": metrics}, indent=2))
    print(f"Artifacts written to {MODEL_DIR}")


if __name__ == "__main__":
    main()
