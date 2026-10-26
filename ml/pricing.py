"""Book price model: synthetic data generation, training with baselines, and inference."""
import json
import os
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from recommend import evaluate as evaluate_recommendations
from text import fold

MODELS_DIR = Path(os.environ.get("MODELS_DIR", Path(__file__).parent / "models"))
MODEL_PATH = MODELS_DIR / "price_model.joblib"
METRICS_PATH = MODELS_DIR / "metrics.json"

ETATS = ["NEUF", "TRES_BON", "BON", "ACCEPTABLE"]
ETAT_RANK = {e: i for i, e in enumerate(ETATS)}

# Subjects students keep buying hold their value better (demand premium).
SUBJECT_DEMAND = {
    "probabilites": 1.15, "analyse 1": 1.12, "python": 1.1, "machine learning": 1.12, "statistique": 1.08,
    "algebre lineaire": 1.05, "bases de donnees": 1.0, "algorithmique": 1.0, "physique 1": 0.92,
    "reseaux": 0.95, "anglais technique": 0.85, "systemes d'exploitation": 0.95,
}
CONDITION = {"NEUF": 0.8, "TRES_BON": 0.64, "BON": 0.5, "ACCEPTABLE": 0.33}
FEATURES = ["matiere", "etat_rank", "age", "prix_neuf"]


def make_synthetic(n: int = 2400, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    subjects = list(SUBJECT_DEMAND)
    matiere = rng.choice(subjects + ["autre"], size=n, p=[0.07] * len(subjects) + [1 - 0.07 * len(subjects)])
    etat = rng.choice(ETATS, size=n, p=[0.1, 0.35, 0.38, 0.17])
    age = rng.integers(0, 16, size=n)
    prix_neuf = np.round(rng.lognormal(mean=3.7, sigma=0.45, size=n), 1).clip(8, 180)

    demand = np.array([SUBJECT_DEMAND.get(m, 0.95) for m in matiere])
    cond = np.array([CONDITION[e] for e in etat])
    # Non-linear decay: steep in the first years, then flattens; worn old books lose extra value.
    decay = 0.55 + 0.45 * np.exp(-age / 4.5)
    worn_old = np.where((etat == "ACCEPTABLE") & (age > 8), 0.82, 1.0)
    # Students round prices and nobody sells below a few dinars.
    prix = prix_neuf * cond * decay * demand * worn_old * rng.normal(1.0, 0.07, size=n)
    prix = np.maximum(3, np.round(prix))

    return pd.DataFrame({"matiere": matiere, "etat_rank": [ETAT_RANK[e] for e in etat], "age": age, "prix_neuf": prix_neuf, "prix": prix})


def load_real_listings() -> pd.DataFrame:
    """Listings published on the platform, if Mongo is reachable; empty frame otherwise."""
    url = os.environ.get("MONGO_URL")
    if not url:
        return pd.DataFrame(columns=FEATURES + ["prix"])
    try:
        from pymongo import MongoClient

        with MongoClient(url, serverSelectionTimeoutMS=2000) as client:
            docs = list(
                client.get_default_database()["annonces"].find(
                    {"statut": {"$in": ["DISPONIBLE", "VENDUE"]}, "prixNeuf": {"$gt": 0}, "anneeEdition": {"$gt": 0}},
                    {"matiere": 1, "etat": 1, "anneeEdition": 1, "prixNeuf": 1, "prix": 1},
                )
            )
    except Exception as exc:  # noqa: BLE001 - training must still work without the database
        print(f"[train] real listings unavailable: {exc}")
        return pd.DataFrame(columns=FEATURES + ["prix"])
    year = date.today().year
    return pd.DataFrame(
        {
            "matiere": [fold(d["matiere"]) for d in docs],
            "etat_rank": [ETAT_RANK.get(d["etat"], 2) for d in docs],
            "age": [max(0, year - int(d["anneeEdition"])) for d in docs],
            "prix_neuf": [float(d["prixNeuf"]) for d in docs],
            "prix": [float(d["prix"]) for d in docs],
        }
    )


def _pipeline(model) -> Pipeline:
    pre = ColumnTransformer(
        [("matiere", OneHotEncoder(handle_unknown="ignore", min_frequency=10), ["matiere"])],
        remainder="passthrough",
    )
    return Pipeline([("pre", pre), ("model", model)])


def train(save: bool = True, seed: int = 42) -> dict:
    real = load_real_listings()
    data = pd.concat([make_synthetic(seed=seed), real], ignore_index=True)
    X, y = data[FEATURES], data["prix"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=seed)

    baseline_pred = np.full(len(y_test), y_train.mean())
    linear = _pipeline(LinearRegression()).fit(X_train, y_train)
    forest = _pipeline(RandomForestRegressor(n_estimators=200, min_samples_leaf=3, random_state=seed, n_jobs=-1)).fit(X_train, y_train)

    def score(pred):
        return {"mae": round(float(mean_absolute_error(y_test, pred)), 2), "rmse": round(float(root_mean_squared_error(y_test, pred)), 2)}

    metrics = {
        "trained_on": {"synthetic": int(len(data) - len(real)), "real": int(len(real)), "test_rows": int(len(y_test))},
        "baseline_moyenne": score(baseline_pred),
        "regression_lineaire": score(linear.predict(X_test)),
        "random_forest": score(forest.predict(X_test)),
    }
    metrics["recommandation"] = evaluate_recommendations()
    if save:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(forest, MODEL_PATH)
        METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    return metrics


def load_model():
    if not MODEL_PATH.exists():
        print("[ml] no model found, training on synthetic data")
        train()
    return joblib.load(MODEL_PATH)


def predict_range(model, matiere: str, etat: str, annee_edition: int, prix_neuf: float) -> dict:
    row = pd.DataFrame(
        [{"matiere": fold(matiere), "etat_rank": ETAT_RANK[etat], "age": max(0, date.today().year - int(annee_edition)), "prix_neuf": float(prix_neuf)}]
    )
    features = model.named_steps["pre"].transform(row)
    # Spread of the individual trees gives an uncertainty band instead of an arbitrary +/- percentage.
    per_tree = np.array([t.predict(features)[0] for t in model.named_steps["model"].estimators_])
    low, high = np.percentile(per_tree, [25, 75])
    low = max(1, int(np.floor(low)))
    return {"min": low, "max": max(low, int(np.ceil(high))), "modele": "random_forest"}
