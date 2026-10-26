"""Content-based recommendations: TF-IDF over item text vs the student's profile, cosine similarity."""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from text import fold

STOPWORDS = sorted(
    {
        "le", "la", "les", "un", "une", "des", "de", "du", "et", "en", "a", "au", "aux", "pour", "par", "sur", "avec",
        "dans", "chaque", "avant", "apres", "est", "sont", "nous", "vous", "on", "se", "ce", "ces", "son", "sa", "ses",
        "club", "groupe", "seance", "seances",
    }
)


def profile_text(profile: dict) -> str:
    # Subjects weigh more than interests: they are what the student actually studies this term.
    matieres = profile.get("matieres", []) * 2
    return " ".join([*matieres, *profile.get("centresInteret", []), profile.get("filiere", "")])


def rank(profile: dict, items: list[dict], k: int = 5) -> list[dict]:
    """items: [{"id": str, "texte": str}] -> top-k [{"id", "score"}] with score > 0."""
    if not items:
        return []
    docs = [fold(i["texte"]) for i in items]
    query = fold(profile_text(profile))
    if not query.strip():
        return []
    vectorizer = TfidfVectorizer(stop_words=STOPWORDS, ngram_range=(1, 2), sublinear_tf=True)
    matrix = vectorizer.fit_transform(docs + [query])
    scores = cosine_similarity(matrix[-1], matrix[:-1]).ravel()
    order = np.argsort(-scores)[:k]
    return [{"id": items[i]["id"], "score": round(float(scores[i]), 4)} for i in order if scores[i] > 0]


SUBJECTS = ["probabilites", "statistique", "analyse", "algebre lineaire", "python", "machine learning", "bases de donnees", "reseaux", "physique", "anglais"]


def evaluate(n_students: int = 300, k: int = 5, seed: int = 7) -> dict:
    """precision@k of TF-IDF vs a popularity baseline on synthetic students and groups."""
    rng = np.random.default_rng(seed)
    items = []
    for s in SUBJECTS:
        for j in range(4):
            items.append({"id": f"{s}-{j}", "sujet": s, "texte": f"{s} revision {['partiel', 'td corriges', 'projet', 'examen final'][j]}"})
    # Popularity is skewed toward a few subjects, which is what a naive "most joined" list would show.
    weights = np.array([3.0 if s in ("probabilites", "python") else 1.0 for s in SUBJECTS])
    popularity = {i["id"]: rng.poisson(5 * weights[SUBJECTS.index(i["sujet"])]) for i in items}
    popular = sorted(popularity, key=popularity.get, reverse=True)[:k]

    hits_model = hits_pop = 0
    for _ in range(n_students):
        chosen = list(rng.choice(SUBJECTS, size=rng.integers(1, 3), replace=False))
        relevant = {i["id"] for i in items if i["sujet"] in chosen}
        top = [r["id"] for r in rank({"matieres": chosen, "centresInteret": [], "filiere": ""}, items, k)]
        hits_model += len(relevant & set(top))
        hits_pop += len(relevant & set(popular))
    total = n_students * k
    return {f"precision_at_{k}": round(hits_model / total, 3), "baseline_popularite": round(hits_pop / total, 3)}
