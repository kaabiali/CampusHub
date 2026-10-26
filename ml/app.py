from flask import Flask, jsonify, request

from pricing import ETATS, load_model, predict_range

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
