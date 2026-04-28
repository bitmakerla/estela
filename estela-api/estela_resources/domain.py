"""Resource control-plane contracts (kinds, phases, transitions).

See docs/estela/adr-001-resource-platform-control-plane.md.
"""


class ResourceKind:
    """Kinds of managed resources; values align with existing workload types only."""

    SPIDER_JOB = "SPIDER_JOB"
    PROJECT_DEPLOY = "PROJECT_DEPLOY"


class ResourcePhase:
    """Lifecycle phases for a managed resource (control-plane)."""

    PENDING = "PENDING"
    PROVISIONING = "PROVISIONING"
    RUNNING = "RUNNING"
    STOPPING = "STOPPING"
    TERMINATED = "TERMINATED"
    FAILED = "FAILED"


class ExecutionBackend:
    """Names for pluggable execution backends (to be wired in settings in a later task)."""

    KUBERNETES = "kubernetes"
    LOCAL = "local"


_TERMINAL_PHASES = frozenset(
    {
        ResourcePhase.TERMINATED,
        ResourcePhase.FAILED,
    }
)

_ALLOWED_TRANSITIONS = {
    ResourcePhase.PENDING: frozenset(
        {
            ResourcePhase.PROVISIONING,
            ResourcePhase.FAILED,
        }
    ),
    ResourcePhase.PROVISIONING: frozenset(
        {
            ResourcePhase.RUNNING,
            ResourcePhase.FAILED,
        }
    ),
    ResourcePhase.RUNNING: frozenset(
        {
            ResourcePhase.STOPPING,
            ResourcePhase.TERMINATED,
            ResourcePhase.FAILED,
        }
    ),
    ResourcePhase.STOPPING: frozenset(
        {
            ResourcePhase.TERMINATED,
            ResourcePhase.FAILED,
        }
    ),
}


def is_terminal_phase(phase):
    """Return True if phase is terminal (no further business transitions)."""
    return phase in _TERMINAL_PHASES


def is_valid_transition(from_phase, to_phase):
    """Return True if moving from from_phase to to_phase is allowed (including no-op)."""
    if from_phase == to_phase:
        return True
    if is_terminal_phase(from_phase):
        return False
    allowed = _ALLOWED_TRANSITIONS.get(from_phase)
    if allowed is None:
        return False
    return to_phase in allowed
