import os
import subprocess


with open("tmp") as f:
    host_ip = f.read().strip()

os.remove("tmp")

release_name = "base"
namespace = "default"

with open("local/.env", "w") as f:
    lines = [
        f"HOST_IP={host_ip}",
        "LOCAL_REGISTRY=localhost:5001",
        f"HOST_REGISTRY={host_ip}:5001",
        f"RELEASE_NAME={release_name}",
        f"NAMESPACE={namespace}",
    ]
    print(lines)
    f.write("\n".join(lines))
