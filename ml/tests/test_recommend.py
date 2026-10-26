from app import app
from recommend import evaluate, rank

ITEMS = [
    {"id": "proba", "texte": "Probabilités, révision du partiel. Lois discrètes et continues"},
    {"id": "python", "texte": "Python et Pandas, mini-projets de data science"},
    {"id": "foot", "texte": "Tournoi de football inter-filières, club sport"},
    {"id": "cv", "texte": "Atelier CV et LinkedIn, club entrepreneuriat"},
]


def test_ranks_matching_subject_first():
    top = rank({"matieres": ["Probabilités"], "centresInteret": ["Data et IA"]}, ITEMS, k=3)
    assert top[0]["id"] == "proba"


def test_accents_and_case_do_not_matter():
    assert rank({"matieres": ["PROBABILITES"]}, ITEMS)[0]["id"] == "proba"


def test_interests_contribute():
    top = rank({"matieres": [], "centresInteret": ["Entrepreneuriat"]}, ITEMS)
    assert top[0]["id"] == "cv"


def test_empty_profile_recommends_nothing():
    assert rank({"matieres": [], "centresInteret": []}, ITEMS) == []


def test_beats_popularity_baseline():
    m = evaluate()
    assert m["precision_at_5"] > m["baseline_popularite"]


def test_endpoint_validates_items():
    client = app.test_client()
    assert client.post("/recommend", json={"profil": {}, "items": "nope"}).status_code == 400
    res = client.post("/recommend", json={"profil": {"matieres": ["Python"]}, "items": ITEMS, "k": 2})
    assert res.status_code == 200
    assert res.get_json()["resultats"][0]["id"] == "python"
