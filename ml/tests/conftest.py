import os
import tempfile

# Must run before pricing/app are imported: they read MODELS_DIR at import time.
os.environ["MODELS_DIR"] = tempfile.mkdtemp(prefix="campushub-models-")
os.environ.pop("MONGO_URL", None)
