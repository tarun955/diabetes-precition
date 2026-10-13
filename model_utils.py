"""Small reusable transformers shared by training and the Vercel API."""

from __future__ import annotations

import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


class IQRClipper(BaseEstimator, TransformerMixin):
    """Winsorize extreme numeric values using training-set IQR limits.

    This keeps unusual observations in the dataset while reducing the influence
    of accidental data-entry extremes. The learned limits are stored inside the
    fitted pipeline so inference applies exactly the same transformation.
    """

    def __init__(self, columns: list[str], multiplier: float = 1.5):
        self.columns = columns
        self.multiplier = multiplier

    def fit(self, X: pd.DataFrame, y=None):
        frame = X.copy()
        self.lower_ = {}
        self.upper_ = {}
        for column in self.columns:
            values = pd.to_numeric(frame[column], errors="coerce")
            q1 = values.quantile(0.25)
            q3 = values.quantile(0.75)
            iqr = q3 - q1
            self.lower_[column] = float(q1 - self.multiplier * iqr)
            self.upper_[column] = float(q3 + self.multiplier * iqr)
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        frame = X.copy()
        for column in self.columns:
            frame[column] = pd.to_numeric(frame[column], errors="coerce").clip(
                self.lower_[column], self.upper_[column]
            )
        return frame
