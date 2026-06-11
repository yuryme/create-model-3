#!/usr/bin/env python
"""Validate a BaSYS spec-json (ТЗ) file against _spec-json.schema.json.

Usage:
    python project/docs/specs/validate_spec.py <path-to-spec.json>

Exit codes:
    0 - valid
    1 - invalid (schema violations printed)
    2 - usage / IO error

Requires the `jsonschema` package (Draft 2020-12).
"""
import json
import os
import sys


def main():
    if len(sys.argv) != 2:
        print("usage: validate_spec.py <spec.json>")
        return 2
    spec_path = sys.argv[1]
    schema_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "_spec-json.schema.json"
    )
    try:
        from jsonschema import Draft202012Validator
    except ImportError:
        print("ERR: jsonschema package is not installed (pip install jsonschema)")
        return 2
    try:
        with open(schema_path, encoding="utf-8") as f:
            schema = json.load(f)
    except (OSError, ValueError) as exc:
        print("ERR: cannot read schema %s - %s" % (schema_path, exc))
        return 2
    try:
        with open(spec_path, encoding="utf-8") as f:
            instance = json.load(f)
    except (OSError, ValueError) as exc:
        print("ERR: cannot read/parse spec %s - %s" % (spec_path, exc))
        return 2
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(instance), key=lambda e: list(e.path))
    if not errors:
        print("VALID: %s conforms to spec-json-v0.1" % spec_path)
        return 0
    for err in errors:
        print("ERR", list(err.path), "-", err.message)
    return 1


if __name__ == "__main__":
    sys.exit(main())
