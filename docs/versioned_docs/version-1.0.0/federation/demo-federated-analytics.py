#!/usr/bin/env python3
"""
Federated Analytics Demo — Kamiwaza Mesh MVP
=============================================

This script demonstrates the complete federated analytics workflow:

  1. Authenticate on the local cluster (Keycloak OIDC)
  2. Query the remote cluster's catalog through the mesh proxy
  3. Retrieve data from the remote cluster (inline transport)
  4. Submit a compute job on the remote cluster that processes
     the retrieved data and returns structured analytics
  5. Display the aggregated results

Prerequisites
-------------
- Two Kamiwaza clusters paired via federation (see setup.md)
- Remote CA cert stored in the federation record
- The calling user must have ``federation:operator`` ReBAC grant
- Python 3.10+ with the ``requests`` library installed::

      pip install requests

Usage
-----
::

    # Minimal — uses defaults (https://kamiwaza.test, cluster "studio")
    python demo-federated-analytics.py -u admin@kamiwaza.localhost -p kamiwaza

    # Explicit cluster and base URL
    python demo-federated-analytics.py \\
        --base-url https://192.168.50.100 \\
        --cluster studio-1 \\
        -u admin@kamiwaza.localhost \\
        -p kamiwaza

Environment
-----------
Tested against a k0s-lima dev-full deployment with Istio routing and
self-signed certificates (verify=False).
"""

from __future__ import annotations

import argparse
import json
import sys
import textwrap
from typing import Any

import requests
import urllib3

# Silence InsecureRequestWarning for self-signed certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _banner(step: int, title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  Step {step}: {title}")
    print(f"{'=' * 60}\n")


def _pretty(obj: Any) -> str:
    return json.dumps(obj, indent=2, default=str)


def _fail(msg: str) -> None:
    print(f"\nERROR: {msg}", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Step 1 — Authenticate
# ---------------------------------------------------------------------------


def authenticate(base_url: str, username: str, password: str) -> str:
    """Obtain a JWT access token from Keycloak via the OIDC password grant."""
    _banner(1, "Authenticate on the local cluster")

    token_url = f"{base_url}/realms/kamiwaza/protocol/openid-connect/token"
    print(f"POST {token_url}")

    resp = requests.post(
        token_url,
        data={
            "grant_type": "password",
            "client_id": "kamiwaza-platform",
            "username": username,
            "password": password,
        },
        verify=False,
        timeout=15,
    )

    if resp.status_code != 200:
        _fail(
            f"Authentication failed ({resp.status_code}).\nResponse: {resp.text[:500]}"
        )

    token = resp.json()["access_token"]
    print(f"Authenticated as {username}")
    print(f"Token: {token[:40]}...")
    return token


# ---------------------------------------------------------------------------
# Step 2 — Discover remote datasets
# ---------------------------------------------------------------------------


def discover_datasets(base_url: str, cluster: str, token: str) -> list[dict[str, Any]]:
    """List datasets available on the remote cluster via the mesh proxy."""
    _banner(2, "Query remote cluster catalog")

    url = f"{base_url}/api/mesh/{cluster}/api/catalog/datasets/"
    print(f"GET {url}")

    resp = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        verify=False,
        timeout=30,
    )

    if resp.status_code != 200:
        _fail(
            f"Catalog query failed ({resp.status_code}).\nResponse: {resp.text[:500]}"
        )

    datasets = resp.json()

    if not datasets:
        print("No datasets found on the remote cluster.")
        print("Hint: ensure datasets exist and your user has ReBAC viewer grants.")
        return []

    print(f"Found {len(datasets)} dataset(s) on remote cluster:\n")
    for ds in datasets:
        name = ds.get("name") or ds.get("urn", "<unknown>")
        urn = ds.get("urn", "")
        print(f"  - {name}")
        if urn:
            print(f"    URN: {urn}")

    return datasets


# ---------------------------------------------------------------------------
# Step 3 — Retrieve data from remote cluster (inline)
# ---------------------------------------------------------------------------


def retrieve_data(
    base_url: str,
    cluster: str,
    token: str,
    dataset_urn: str,
    columns: list[str] | None = None,
    filters: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create a retrieval job on the remote cluster using inline transport."""
    _banner(3, "Retrieve data from remote cluster")

    url = f"{base_url}/api/mesh/{cluster}/api/retrieval/jobs"
    print(f"POST {url}")

    payload: dict[str, Any] = {
        "dataset_urn": dataset_urn,
        "transport": "inline",
    }
    if columns:
        payload["columns"] = columns
    if filters:
        payload["filters"] = filters

    print(f"Payload:\n{_pretty(payload)}\n")

    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
        verify=False,
        timeout=60,
    )

    if resp.status_code not in (200, 201):
        _fail(f"Retrieval failed ({resp.status_code}).\nResponse: {resp.text[:500]}")

    result = resp.json()

    rows = result.get("rows") or result.get("data") or []
    print(f"Retrieved {len(rows)} row(s) from remote cluster.")
    if rows:
        print(f"Sample row: {_pretty(rows[0])}")

    return result


# ---------------------------------------------------------------------------
# Step 4 — Submit analytics job on remote cluster
# ---------------------------------------------------------------------------


def submit_analytics_job(
    base_url: str,
    cluster: str,
    token: str,
    dataset_urn: str,
) -> dict[str, Any]:
    """Submit a synchronous Ray job on the remote cluster.

    The job runs a small Python script that reads the dataset via the local
    retrieval service, computes simple analytics, and prints the result using
    the ``KZ_MESH_RUN_ON_JSON::`` marker protocol so the orchestrator can
    extract structured output.
    """
    _banner(4, "Submit analytics job on remote cluster")

    url = f"{base_url}/api/mesh/{cluster}/cluster/jobs/run"
    print(f"POST {url}")

    # The entrypoint script runs *on the remote cluster* where the data lives.
    # It reads from the local retrieval service, computes analytics, and prints
    # the result via the marker protocol.
    entrypoint_script = textwrap.dedent(f"""\
        import json, os, requests as req

        DATASET_URN = "{dataset_urn}"
        BASE = os.environ.get("KAMIWAZA_API_URL", "http://core-api:8000")

        # Retrieve data locally on the remote cluster
        resp = req.post(
            f"{{BASE}}/api/retrieval/jobs",
            json={{"dataset_urn": DATASET_URN, "transport": "inline"}},
            timeout=30,
        )
        resp.raise_for_status()
        rows = resp.json().get("rows") or resp.json().get("data") or []

        # Compute analytics
        total = len(rows)
        if total == 0:
            analytics = {{"total_rows": 0, "message": "No data available"}}
        else:
            # Try to compute numeric summary if a 'score' column exists
            scores = [r.get("score") for r in rows if r.get("score") is not None]
            analytics = {{
                "total_rows": total,
                "columns": list(rows[0].keys()) if rows else [],
            }}
            if scores:
                analytics["score_avg"] = round(sum(scores) / len(scores), 2)
                analytics["score_min"] = min(scores)
                analytics["score_max"] = max(scores)
                analytics["score_count"] = len(scores)

        # Emit structured result via marker protocol
        print(f"KZ_MESH_RUN_ON_JSON::{{json.dumps(analytics)}}")
    """)

    payload = {
        "entrypoint": f"python -c {json.dumps(entrypoint_script)}",
        "runtime_env": {"pip": ["requests"]},
        "timeout_seconds": 120,
    }

    print(f"Job timeout: {payload['timeout_seconds']}s")
    print("Waiting for job to complete on remote cluster...\n")

    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
        verify=False,
        timeout=180,  # generous: covers job runtime + mesh proxy overhead
    )

    if resp.status_code != 200:
        _fail(
            f"Job submission failed ({resp.status_code}).\nResponse: {resp.text[:500]}"
        )

    result = resp.json()
    status = result.get("status", "UNKNOWN")
    duration = result.get("duration_seconds")

    print(f"Job ID:     {result.get('job_id', 'N/A')}")
    print(f"Ray Job ID: {result.get('ray_job_id', 'N/A')}")
    print(f"Status:     {status}")
    if duration is not None:
        print(f"Duration:   {duration:.1f}s")

    if status != "SUCCEEDED":
        print(f"\nJob did not succeed. Full response:\n{_pretty(result)}")
        return result

    job_result = result.get("result")
    if job_result:
        print(f"\nExtracted result:\n{_pretty(job_result)}")

    return result


# ---------------------------------------------------------------------------
# Step 5 — Display results
# ---------------------------------------------------------------------------


def display_results(
    datasets: list[dict[str, Any]],
    retrieval: dict[str, Any] | None,
    job: dict[str, Any] | None,
) -> None:
    """Print a summary of the federated analytics workflow."""
    _banner(5, "Results summary")

    print(f"Datasets discovered:   {len(datasets)}")

    if retrieval:
        rows = retrieval.get("rows") or retrieval.get("data") or []
        print(f"Rows retrieved:        {len(rows)}")

    if job and job.get("status") == "SUCCEEDED":
        analytics = job.get("result", {})
        print("Analytics computed:    yes")
        print(f"  Total rows:          {analytics.get('total_rows', 'N/A')}")
        if "score_avg" in analytics:
            print(f"  Score average:       {analytics['score_avg']}")
            print(
                f"  Score range:         {analytics['score_min']} - {analytics['score_max']}"
            )
    elif job:
        print(f"Analytics job status:  {job.get('status', 'UNKNOWN')}")

    print("\nFederated analytics workflow complete.")
    print("Data never left the remote cluster — only results crossed the mesh.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Demonstrate federated analytics across Kamiwaza clusters.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            examples:
              %(prog)s -u admin@kamiwaza.localhost -p kamiwaza
              %(prog)s --base-url https://192.168.50.100 --cluster studio-1 -u admin@kamiwaza.localhost -p kamiwaza
        """),
    )
    parser.add_argument(
        "--base-url",
        default="https://kamiwaza.test",
        help="Base URL of the local cluster (default: https://kamiwaza.test)",
    )
    parser.add_argument(
        "--cluster",
        default="studio",
        help="Remote cluster selector — name, UUID, or prefix (default: studio)",
    )
    parser.add_argument(
        "-u",
        "--username",
        required=True,
        help="Keycloak username (e.g. admin@kamiwaza.localhost)",
    )
    parser.add_argument(
        "-p",
        "--password",
        required=True,
        help="Keycloak password",
    )
    parser.add_argument(
        "--dataset-urn",
        default=None,
        help="Specific dataset URN to retrieve. If omitted, uses the first "
        "dataset returned by the catalog.",
    )
    parser.add_argument(
        "--skip-retrieval",
        action="store_true",
        help="Skip the inline retrieval step (step 3) and go straight to "
        "job submission.",
    )
    parser.add_argument(
        "--skip-job",
        action="store_true",
        help="Skip the job submission step (step 4).",
    )

    args = parser.parse_args()

    # -- Step 1: Authenticate -------------------------------------------------
    token = authenticate(args.base_url, args.username, args.password)

    # -- Step 2: Discover datasets --------------------------------------------
    datasets = discover_datasets(args.base_url, args.cluster, token)

    if not datasets:
        print("\nNo datasets to work with. Exiting.")
        sys.exit(0)

    # Pick the dataset to use for the remaining steps
    dataset_urn = args.dataset_urn
    if not dataset_urn:
        dataset_urn = datasets[0].get("urn")
        if not dataset_urn:
            _fail("First dataset has no URN. Pass --dataset-urn explicitly.")
        print(f"\nUsing dataset: {dataset_urn}")

    # -- Step 3: Retrieve data (inline) ---------------------------------------
    retrieval = None
    if not args.skip_retrieval:
        retrieval = retrieve_data(args.base_url, args.cluster, token, dataset_urn)
    else:
        print("\n[Skipping step 3: inline retrieval]")

    # -- Step 4: Submit analytics job -----------------------------------------
    job = None
    if not args.skip_job:
        job = submit_analytics_job(args.base_url, args.cluster, token, dataset_urn)
    else:
        print("\n[Skipping step 4: job submission]")

    # -- Step 5: Display results ----------------------------------------------
    display_results(datasets, retrieval, job)


if __name__ == "__main__":
    main()
