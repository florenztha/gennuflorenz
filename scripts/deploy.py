import json
from pathlib import Path

CONFIG = Path("genlayer.json")

def deploy():
    with open(CONFIG, "r") as f:
        data = json.load(f)

    print("Deploying contracts...")
    print(f"Project: {data['project']}")
    print(f"Network: {data['network']}")

    for contract in data["contracts"]:
        print(f"Deploying: {contract['name']}")

    print("Deployment simulation completed.")

if __name__ == "__main__":
    deploy()