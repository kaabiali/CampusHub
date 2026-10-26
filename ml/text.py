import unicodedata


def fold(text: str) -> str:
    """Lowercase and strip accents so "Probabilités" and "PROBABILITES" match."""
    text = unicodedata.normalize("NFD", str(text or ""))
    return "".join(c for c in text if unicodedata.category(c) != "Mn").lower().strip()
