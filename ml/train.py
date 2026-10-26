"""Retrain the price model (synthetic data + published listings) and print metrics vs baselines."""
import json

from pricing import train

if __name__ == "__main__":
    print(json.dumps(train(), indent=2, ensure_ascii=False))
