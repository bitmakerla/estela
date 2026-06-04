"""Capture and format failure information for spider jobs and deploys.

The functions in this module are best-effort log-scrapers that turn raw
Kubernetes pod output into something a non-developer end user can read:

* a friendly one-line description of *why* the job stopped, derived from
  the pod's termination reason (OOMKilled, Evicted, exit code, etc.).
* the last user-relevant Python traceback in the pod logs, with infra
  side-effect tracebacks (logging handlers crashing because Kafka
  closed, async cleanup failures, etc.) stripped out.

Anything outside a traceback block is intentionally discarded — that's
the contract that keeps Kafka/Redis/Twisted infrastructure noise out of
what the user sees.
"""

from datetime import datetime

from config.job_manager import job_manager, spiderdata_db_client


_TRACEBACK_HEADER = "Traceback (most recent call last):"
_CHAIN_MARKERS = (
    "During handling of the above exception, another exception occurred:",
    "The above exception was the direct cause of the following exception:",
)
# Markers that signal the next traceback is a downstream side-effect of the
# real error (logging handler crashed while reporting it, async cleanup
# failed after the spider already died, etc.). These are stable strings
# emitted by the Python stdlib `logging` module and Twisted, not random
# substrings — they're how those modules officially announce a meta-error.
_INFRA_MARKERS = (
    "--- Logging error ---",
    "--- <exception caught here> ---",
    "[Failure instance:",
)


def format_friendly_reason(termination):
    """Translate a k8s container-termination dict into one user-friendly line.

    Returns None when no termination data is available. Best-effort: in
    local clusters kubelet often does not populate `reason`, so several
    paths fall through to a generic message; managed k8s (EKS/GKE)
    populates these reliably.
    """
    if not termination:
        return None
    reason = termination.get("reason")
    exit_code = termination.get("exit_code")
    init_container = termination.get("init_container")
    if init_container:
        return "The spider could not be prepared and was stopped before starting."
    if reason == "OOMKilled":
        return "The spider used too much memory and was stopped."
    if reason == "DeadlineExceeded":
        return "The spider ran for too long and was stopped."
    if reason == "Evicted":
        return "The spider was stopped because the system ran out of resources."
    if exit_code == 137:
        return "The spider was stopped unexpectedly."
    if reason and reason != "Error":
        return f"The spider stopped unexpectedly ({reason})."
    return "The spider stopped due to an unexpected error."


def _parse_traceback_block(lines, start):
    """Parse a single traceback block starting at lines[start].
    Returns (end_index_exclusive, block_lines) or (None, None) if invalid."""
    block = [lines[start]]
    i = start + 1
    saw_exception = False
    while i < len(lines):
        ln = lines[i]
        if not ln.strip():
            break
        if ln.startswith((" ", "\t")):
            block.append(ln)
        elif not saw_exception:
            block.append(ln)
            saw_exception = True
        else:
            break
        i += 1
    if not saw_exception:
        return None, None
    return i, block


def extract_last_traceback(raw):
    """Return the last user-relevant Python traceback chain in the logs.

    A chain is one traceback or several connected by Python's chain markers
    ("During handling of the above exception..." or "The above exception
    was the direct cause of..."). All chained blocks plus their connecting
    lines are returned so the user can see the original cause.

    Tracebacks whose preceding region contains an infra marker
    (`_INFRA_MARKERS`) are skipped — they're side-effects of the error
    machinery itself (e.g. log handler failed because Kafka already
    closed), not the user's problem.

    Free-form log lines outside a traceback block or chain marker are
    discarded — that's the contract that keeps infra noise out.
    """
    if not raw:
        return None
    lines = raw.splitlines()
    raw_starts = [i for i, ln in enumerate(lines) if _TRACEBACK_HEADER in ln]
    if not raw_starts:
        return None

    blocks = []  # list of (start_idx, end_idx_exclusive, block_lines)
    last_end = 0
    for s in raw_starts:
        between = lines[last_end:s]
        is_infra = any(
            marker in ln for ln in between for marker in _INFRA_MARKERS
        )
        end, block = _parse_traceback_block(lines, s)
        if block:
            if not is_infra:
                blocks.append((s, end, block))
            last_end = end
        else:
            last_end = s + 1
    if not blocks:
        return None

    # Walk backwards from the last block, including predecessors connected
    # to it by a chain marker.
    chain = [len(blocks) - 1]
    for i in range(len(blocks) - 1, 0, -1):
        cur_start = blocks[i][0]
        prev_end = blocks[i - 1][1]
        between = lines[prev_end:cur_start]
        if any(marker in ln for ln in between for marker in _CHAIN_MARKERS):
            chain.insert(0, i - 1)
        else:
            break

    out = []
    for pos, block_idx in enumerate(chain):
        _, end, block = blocks[block_idx]
        out.extend(block)
        if pos < len(chain) - 1:
            next_start = blocks[chain[pos + 1]][0]
            for ln in lines[end:next_start]:
                stripped = ln.strip()
                if stripped and any(m in stripped for m in _CHAIN_MARKERS):
                    out.append("")
                    out.append(stripped)
                    out.append("")
    return "\n".join(out)


def strip_blanks(raw):
    """Return the log with blank lines removed, or None. Used for build
    containers (downloader/kaniko/spider-status) which don't run the
    spider's runtime stack, so they don't contain infra-level noise."""
    if not raw:
        return None
    lines = [ln for ln in raw.splitlines() if ln.strip()]
    return "\n".join(lines) if lines else None


def capture_job_error_reason(job):
    """Build the failure summary stored in Mongo for a failed spider job.

    Combines the friendly termination reason (when k8s provides one) and
    the last user-relevant Python traceback (when one is in the pod log).
    Returns None if neither piece of info is available.
    """
    termination = job_manager.read_pod_termination_reason(job.name)
    logs = job_manager.read_pod_logs(job.name, tail=2000)
    parts = []
    reason = format_friendly_reason(termination)
    if reason:
        parts.append(reason)
    traceback = extract_last_traceback(logs)
    if traceback:
        parts.append(f"Error details:\n{traceback}")
    return "\n\n".join(parts) or None


def write_job_logs_to_mongo(job, logs):
    """Upsert a job_logs record into the project's Mongo database.

    Uses $setOnInsert so concurrent writes for the same job_id are idempotent —
    the first writer wins and subsequent calls are no-ops.
    """
    if not spiderdata_db_client.get_connection():
        return
    db = str(job.spider.project.pid)
    spiderdata_db_client.client[db]["job_logs"].update_one(
        {"job_id": job.jid},
        {"$setOnInsert": {
            "job_id": job.jid,
            "logs": logs,
            "created": datetime.utcnow(),
        }},
        upsert=True,
    )


def write_deploy_logs_to_mongo(deploy, logs):
    """Upsert a deploy_logs record into the project's Mongo database.

    Uses $setOnInsert so concurrent writes for the same deploy_id are idempotent.
    """
    if not spiderdata_db_client.get_connection():
        return
    db = str(deploy.project.pid)
    spiderdata_db_client.client[db]["deploy_logs"].update_one(
        {"deploy_id": deploy.did},
        {"$setOnInsert": {
            "deploy_id": deploy.did,
            "logs": logs,
            "created": datetime.utcnow(),
        }},
        upsert=True,
    )
