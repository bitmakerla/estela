import os
import subprocess


with open("tmp") as f:
    host_ip = f.read().strip()


os.remove("tmp")


with open(".env", "w") as f:
    lines = [
        f"HOST_IP={host_ip}",
        "LOCAL_REGISTRY=localhost:5000",
        f"HOST_REGISTRY={host_ip}:5000",
    ]
    print(lines)
    f.write("\n".join(lines))
