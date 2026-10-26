import time

import pytest

import pricing
from app import app


@pytest.fixture(scope="module")
def metrics():
    return pricing.train()


def test_models_beat_mean_baseline(metrics):
    base = metrics["baseline_moyenne"]["mae"]
    assert metrics["regression_lineaire"]["mae"] < base
    assert metrics["random_forest"]["mae"] < metrics["regression_lineaire"]["mae"]


def test_range_is_ordered_and_below_new_price(metrics):
    model = pricing.load_model()
    r = pricing.predict_range(model, "Probabilités", "TRES_BON", 2021, 45)
    assert 1 <= r["min"] <= r["max"] < 45


def test_better_condition_is_worth_more(metrics):
    model = pricing.load_model()
    good = pricing.predict_range(model, "Python", "NEUF", 2023, 60)
    worn = pricing.predict_range(model, "Python", "ACCEPTABLE", 2023, 60)
    assert good["min"] > worn["max"]


def test_accents_do_not_change_prediction(metrics):
    model = pricing.load_model()
    assert pricing.predict_range(model, "Probabilités", "BON", 2020, 40) == pricing.predict_range(model, "PROBABILITES", "BON", 2020, 40)


def test_price_endpoint_validates_and_is_fast():
    client = app.test_client()
    assert client.post("/price", json={"etat": "ABIME", "anneeEdition": 2020, "prixNeuf": 40}).status_code == 400
    start = time.perf_counter()
    res = client.post("/price", json={"matiere": "Analyse 1", "etat": "BON", "anneeEdition": 2020, "prixNeuf": 40})
    assert res.status_code == 200
    assert (time.perf_counter() - start) < 0.2
    assert set(res.get_json()) == {"min", "max", "modele"}
