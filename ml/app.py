from flask import Flask, jsonify, request

from pricing import ETATS, load_model, predict_range
from recommend import rank

app = Flask(__name__)
price_model = load_model()


@app.get("/health")
def health():
    return jsonify(ok=True)


@app.post("/price")
def price():
    body = request.get_json(silent=True) or {}
    try:
        etat = body["etat"]
        annee = int(body["anneeEdition"])
        prix_neuf = float(body["prixNeuf"])
    except (KeyError, TypeError, ValueError):
        return jsonify(error="etat, anneeEdition et prixNeuf sont requis"), 400
    if etat not in ETATS or not (1950 <= annee <= 2100) or not (0 < prix_neuf <= 2000):
        return jsonify(error="valeurs hors limites"), 400
    return jsonify(predict_range(price_model, body.get("matiere", ""), etat, annee, prix_neuf))


@app.post("/recommend")
def recommend():
    body = request.get_json(silent=True) or {}
    items = body.get("items")
    if not isinstance(items, list) or len(items) > 500 or not all(isinstance(i, dict) and "id" in i and "texte" in i for i in items):
        return jsonify(error="items invalides"), 400
    k = min(int(body.get("k", 5)), 50)
    return jsonify(resultats=rank(body.get("profil") or {}, items, k))
