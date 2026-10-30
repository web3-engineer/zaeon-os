"""Private, pinned SDK process. Credentials arrive only through its environment.

Source contracts: overmind/dataset_cmd.py and overbae/api/{eval_views,
eval_serializers}.py at 16db2447dcf1fa96e29251cfe6c6cd63c4a72132.
Only synthetic recorded evaluation; never training or generated targets.
"""
import importlib.metadata
import json
import os
from pathlib import Path
import sys
import tempfile
import time
from urllib.parse import urlparse

PIN = "16db2447dcf1fa96e29251cfe6c6cd63c4a72132"


def main():
    distribution = importlib.metadata.distribution("overmind")
    direct = json.loads(distribution.read_text("direct_url.json") or "{}")
    if distribution.version != "0.1.112" or direct.get("vcs_info", {}).get("commit_id") != PIN:
        raise ValueError("sdk_pin_mismatch")
    from overmind.dataset_cmd import upload_file, wait_until_ready, export_dataset
    import requests

    payload = json.load(sys.stdin)
    base = os.environ["OVERMIND_API_URL"].rstrip("/")
    url = urlparse(base)
    if url.scheme != "https" and not (url.scheme == "http" and url.hostname in {"localhost", "127.0.0.1"}):
        raise ValueError("https_required")
    key = os.environ["OVERMIND_API_KEY"]
    project = os.environ["OVERMIND_PROJECT_ID"]
    client = requests.Session()
    client.headers.update({"X-Api-Key": key})

    def api(method, path, **kwargs):
        response = client.request(method, base + path, timeout=30, allow_redirects=False, **kwargs)
        if not 200 <= response.status_code < 300:
            raise ValueError("remote_request_failed")
        return response.json()

    imported = payload.get("imported") or {}
    if payload["phase"] == "import":
        result = upload_file(Path(payload["bundle"]["jsonlRef"]), project_id=project,
                             api_key=key, api_url=base, intent="eval",
                             request_key=payload["requestKey"])
        dataset_id = result["id"]
        ready = wait_until_ready(dataset_id, api_key=key, api_url=base)
        version = ready.get("active_version")
        cells = ready.get("cells", [])
        cell = next((item for item in cells if item.get("version") == version and item.get("id")), None)
        # Require the actual immutable cell contract; do not infer a version from
        # dataset state or substitute a local manifest for the remote version.
        if not isinstance(cell, dict) or not cell.get("id") or not cell.get("version"):
            raise ValueError("remote_cell_contract_unavailable")
        with tempfile.TemporaryDirectory(prefix="rea-overmind-") as directory:
            output = Path(directory) / "roundtrip.jsonl"
            export_dataset(dataset_id, cell=str(cell["id"]), file_format="jsonl",
                           output=output, api_key=key, api_url=base)
            rows = [json.loads(line) for line in output.read_text().splitlines() if line.strip()]
        return {"datasetId": dataset_id, "datasetVersion": str(cell["version"]),
                "cellId": str(cell["id"]), "returnedRows": rows}

    # An approved deterministic eval set is required. No default LLM judge set,
    # no model generation and no hidden training work is selected by this script.
    eval_set = api("GET", "/api/eval-sets/" + os.environ["REA_OVERMIND_EVAL_SET"] + "/")
    row_ids = eval_set.get("rows")
    rows = [api("GET", "/api/eval-matrix/" + str(row_id) + "/") for row_id in (row_ids or [])]
    if not rows or any(row.get("type") != "deterministic" for row in rows):
        raise ValueError("deterministic_eval_set_required")
    journal = Path(payload["bundle"]["jsonlRef"]).parent / "evaluation-intent.json"
    if journal.exists():
        prior = json.loads(journal.read_text())
        if not prior.get("evaluationId"):
            raise ValueError("ambiguous_evaluation_requires_operator")
        evaluation_id = prior["evaluationId"]
    else:
        # If launch succeeds but the response is lost, a retry stops for operator
        # reconciliation instead of launching a second charged evaluation.
        with journal.open("x") as handle:
            json.dump({"requestKey": payload["requestKey"], "datasetId": imported["datasetId"], "cellId": imported["cellId"]}, handle)
        created = api("POST", "/api/eval-runs/", json={"project": project,
                      "name": "Zaeon REA synthetic static proof", "dataset": imported["datasetId"],
                      "cell": imported["cellId"], "eval_set": os.environ["REA_OVERMIND_EVAL_SET"],
                      "targets": [{"mode": "recorded", "label": "verified-static-observations", "is_baseline": False}],
                      "max_items": len(payload["bundle"]["rowHashes"]), "sampling": 1.0})
        evaluation_id = created["runs"][0]["id"]
        journal.write_text(json.dumps({"evaluationId": evaluation_id, "datasetId": imported["datasetId"], "cellId": imported["cellId"]}))
    evaluation = None
    for _ in range(60):
        evaluation = api("GET", "/api/eval-runs/" + evaluation_id + "/")
        if evaluation.get("status") not in {"pending", "running"}:
            break
        time.sleep(2)
    scored = api("GET", "/api/eval-run-rows/", params={"run": evaluation_id, "page_size": 100})
    scored_rows = scored.get("results", []) if isinstance(scored, dict) else scored
    if isinstance(scored, dict) and scored.get("next"):
        raise ValueError("unexpected_evaluation_pagination")
    if evaluation.get("status") == "completed" and any(item.get("error") or item.get("degraded") or item.get("score") is None for item in scored_rows):
        raise ValueError("incomplete_evaluation_scores")
    return {"evaluationId": evaluation_id, "evaluationStatus": evaluation.get("status"),
            "evaluatedDatasetId": evaluation.get("dataset"), "evaluatedCellId": evaluation.get("cell"),
            "evaluatedRowCount": len(scored_rows), "result": {"summary": evaluation.get("summary"), "rows": scored_rows}}


try:
    print(json.dumps(main()))
except Exception:
    # Never serialize SDK errors/HTTP bodies: they may contain request credentials.
    print(json.dumps({"error": "overmind_transport_failed"}))
    sys.exit(1)
