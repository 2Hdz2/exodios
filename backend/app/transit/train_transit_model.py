import pandas as pd
import numpy as np
import io
import os
import cloudpickle

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report


df = pd.read_csv(DATA_PATH, comment="#", on_bad_lines="skip")

# Clean HTML
string_cols = df.select_dtypes(include="object").columns
for col in string_cols:
    df[col] = df[col].astype(str).str.replace(r"<.*?>", "", regex=True)

# Detect label column
label_col = None
for col in string_cols:
    if df[col].astype(str).str.contains("PC|FP").any():
        label_col = col
        break

if label_col is None:
    raise Exception("No column with PC/FP found")

df["label"] = df[label_col].map({"PC": 1, "FP": 0})
df = df.dropna(subset=["label"])
df["label"] = df["label"].astype(int)

# Parse numeric values
def parse_plusminus(val):
    if pd.isna(val):
        return np.nan
    val = str(val)
    if "±" in val:
        return float(val.split("±")[0])
    elif "&plusmn;" in val:
        return float(val.split("&plusmn;")[0])
    try:
        return float(val)
    except:
        return np.nan

for col in df.columns:
    if col != "label":
        df[col] = df[col].apply(parse_plusminus)

df = df.fillna(df.mean())

# Feature selection
possible_features = ["pl_orbper", "pl_trandurh", "pl_trandep", "pl_rade", "st_rad"]
feature_cols = [c for c in possible_features if c in df.columns]

if not feature_cols:
    feature_cols = df.select_dtypes(include=np.number).columns[:5].tolist()

X = df[feature_cols]
y = df["label"]

# Train model
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

# Evaluation
print("Accuracy:", accuracy_score(y_test, clf.predict(X_test)))
print("Confusion Matrix:\n", confusion_matrix(y_test, clf.predict(X_test)))
print("Report:\n", classification_report(y_test, clf.predict(X_test)))


MODEL_DIR = "backend/app/transit"
os.makedirs(MODEL_DIR, exist_ok=True)

# MODEL_PATH = os.path.join(MODEL_DIR, "transit_model.pkl")

with open(MODEL_PATH, "wb") as f:
    cloudpickle.dump(clf, f)

print("Model saved at:", MODEL_PATH)
