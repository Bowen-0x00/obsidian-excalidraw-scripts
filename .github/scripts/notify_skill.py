"""Notify the Agent repository only when its declared Engine inputs changed."""
import json
import os
import subprocess
import urllib.error
import urllib.request
from pathlib import Path

TARGET = "Bowen-0x00/obsidian-excalidraw-agent-skill"
SOURCE = "Bowen-0x00/obsidian-excalidraw-scripts"


def request(method, path, payload=None):
    token = os.environ["GH_TOKEN"]
    req = urllib.request.Request("https://api.github.com" + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
                 "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "shared-script-notification"}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        message = json.loads(error.read()).get("message", "request failed")
        raise RuntimeError(f"GitHub {error.code}: {message}") from None


def main():
    if os.environ["GITHUB_REPOSITORY"] != SOURCE:
        raise ValueError("Unexpected source repository")
    import base64
    data = request("GET", f"/repos/{TARGET}/contents/bridge/shared-scripts.json?ref=main")
    manifest = json.loads(base64.b64decode(data["content"]))
    if manifest["source"] != {"repository": SOURCE, "branch": "main"}:
        raise ValueError("Target shared-script manifest points at another source")
    declared = {item["source"] for item in manifest["files"]}
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    sha = os.environ["GITHUB_SHA"]
    if os.environ["GITHUB_EVENT_NAME"] == "push":
        before = event["before"]
        if before == "0" * 40:
            args = ["git", "ls-tree", "-r", "--name-only", sha]
        else:
            args = ["git", "diff", "--name-only", before, sha]
        changed = set(subprocess.run(args, check=True, capture_output=True, encoding="utf-8").stdout.splitlines())
        automation = {".github/workflows/notify-skill.yml", ".github/scripts/notify_skill.py"}
        if not changed & (declared | automation):
            print("No declared Engine or notification configuration changed; skipped.")
            return
    request("POST", f"/repos/{TARGET}/dispatches", {
        "event_type": "shared-scripts-updated",
        "client_payload": {"repository": SOURCE, "sha": sha},
    })
    print(f"Notified {TARGET} of published Scripts main commit {sha}.")


if __name__ == "__main__":
    main()
