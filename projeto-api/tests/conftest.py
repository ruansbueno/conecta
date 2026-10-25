import os

import pytest


def pytest_collection_modifyitems(config, items):
    # A integração real só roda quando há acesso ao Moodle (spec.md §9.1).
    if os.environ.get("MOODLE_URL"):
        return
    skip = pytest.mark.skip(reason="moodle_real: MOODLE_URL não configurado")
    for item in items:
        if "moodle_real" in item.keywords:
            item.add_marker(skip)
