#!/usr/bin/env python3
# SPDX-License-Identifier: EUPL-1.2
"""Build or verify a museum deposit package for this work.

Needs only Python 3.9+ and git. No third-party packages, no network.

Build (from anywhere inside the repository):

    python3 archive/build_deposit.py build --out ../deposit-2026

Add material that is not in git (repeat --add as needed):

    python3 archive/build_deposit.py build --out ../deposit-2026 \
        --add director-output=app/dist/directions \
        --add installation-photos=/path/to/photos

Verify a package, today or in twenty years:

    python3 archive/build_deposit.py verify ../deposit-2026

The package follows the BagIt 1.0 layout (RFC 8493).
"""

import argparse
import datetime
import hashlib
import io
import shutil
import subprocess
import sys
import tarfile
from pathlib import Path

# Version tag of the opening, and last commit on main before the Biennale
# closed on 22 November 2026.
OPENING_REF = "vernissage-2026-05-08"
CLOSING_REF = "d3903f40331d55916aedcfc1bcb9df9a38d9c6ef"

ORIGIN = "https://github.com/daqhris/god-bless-usa"
SKIP_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini"}
SKIP_DIRS = {".git", "node_modules", "__pycache__"}

START_HERE = """\
GOD BLESS THE UNITED STATES OF ALIENS
Chris-Armel Iradukunda (daqhris), co-directed with Claude Opus 4.7, 2026

TO EXPERIENCE THE WORK (no internet, no installation):
  1. Open  data/exhibited/closing/index.html  in a web browser.
  2. Wait for the button to read "Begin", press it, listen with headphones.

If the browser cannot play it, the audio master is
  data/exhibited/closing/assets/audio/god-bless-usa.wav

FOLDERS
  data/exhibited/opening/  web app as tagged at the opening, 8 May 2026
  data/exhibited/closing/  web app as it stood when the Biennale closed
  data/source/             complete repository files at the closing version
  data/history/            full git history:  git clone repo.bundle
  data/documentation/      archive notes (catalogue record, guide, to-do)
  data/supplements/        material added by hand, if any

TO CHECK THAT NOTHING HAS CHANGED OR GONE MISSING:
  python3 data/documentation/build_deposit.py verify <this folder>

Rights are described in data/source/LICENSE. Keeping a copy does not by
itself grant a right to exhibit, modify or redistribute the work.
"""


def fail(message):
    sys.exit(f"error: {message}")


def git(repo, *args, binary=False):
    result = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, check=False
    )
    if result.returncode != 0:
        fail(f"git {' '.join(args)}: {result.stderr.decode(errors='replace').strip()}")
    return result.stdout if binary else result.stdout.decode().strip()


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def export_tree(repo, treeish, dest):
    """Write the files of a git tree to dest, byte for byte."""
    data = git(
        repo, "-c", "core.autocrlf=false", "archive", "--format=tar", treeish,
        binary=True,
    )
    dest.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(data)) as tar:
        for member in tar:
            parts = Path(member.name).parts
            if member.name.startswith("/") or ".." in parts:
                fail(f"unsafe path in archive: {member.name}")
            target = dest / member.name
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                target.parent.mkdir(parents=True, exist_ok=True)
                with tar.extractfile(member) as src, open(target, "wb") as out:
                    shutil.copyfileobj(src, out)
            else:
                fail(f"unsupported entry in git tree: {member.name}")


def stage_story(source_root, player_dir):
    """Recreate /story as .github/workflows/pages.yml does at deploy time."""
    story = source_root / "story.html"
    if not story.is_file():
        return
    text = story.read_bytes()
    for attribute in (
        b'<link rel="canonical" href=',
        b'<meta property="og:url" content=',
        b'<meta property="twitter:url" content=',
    ):
        old = attribute + b'"https://daqhris.com/god-bless-usa">'
        new = attribute + b'"https://daqhris.com/god-bless-usa/story">'
        text = text.replace(old, new)
    (player_dir / "story").mkdir(exist_ok=True)
    (player_dir / "story" / "index.html").write_bytes(text)


def add_supplement(source, dest):
    """Copy a file or folder, leaving out secrets, links and clutter."""
    if source.is_file():
        files = [(source, Path(source.name))]
    else:
        files = [(p, p.relative_to(source)) for p in sorted(source.rglob("*"))]
    copied = 0
    for path, relative in files:
        if SKIP_DIRS.intersection(relative.parts) or path.name in SKIP_NAMES:
            continue
        if path.is_symlink():
            print(f"  skipped link: {path}")
            continue
        if not path.is_file():
            continue
        if path.name.startswith(".env") and path.name != ".env.example":
            print(f"  skipped possible secret: {path}")
            continue
        (dest / relative).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, dest / relative)
        copied += 1
    if not copied:
        fail(f"nothing to copy from {source}")
    return copied


def write_manifest(bag, name, files):
    lines = []
    for path in sorted(files):
        relative = path.relative_to(bag).as_posix()
        # RFC 8493 section 2.1.3: encode %, CR and LF in file paths.
        relative = relative.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        lines.append(f"{sha256(path)}  {relative}\n")
    (bag / name).write_text("".join(lines), encoding="utf-8", newline="\n")


def build(args):
    here = Path(__file__).resolve().parent
    repo = Path(git(here, "rev-parse", "--show-toplevel"))
    if git(repo, "rev-parse", "--is-shallow-repository") != "false":
        fail("this is a shallow clone; run 'git fetch --unshallow --tags' first")

    opening = git(repo, "rev-parse", "--verify", f"{args.opening}^{{commit}}")
    closing = git(repo, "rev-parse", "--verify", f"{args.closing}^{{commit}}")

    supplements = []
    for item in args.add:
        label, sep, source = item.partition("=")
        if not sep or not label.replace("-", "").replace("_", "").isalnum():
            fail(f"--add expects label=path, got: {item}")
        source = Path(source).expanduser().resolve()
        if not source.exists():
            fail(f"not found: {source}")
        supplements.append((label, source))

    bag = Path(args.out).expanduser().resolve()
    if bag.exists():
        fail(f"{bag} already exists; choose a new folder")
    for _, source in supplements:
        if bag == source or source in bag.parents:
            fail("the output folder cannot be inside an added folder")
    data = bag / "data"
    data.mkdir(parents=True)

    for name, commit in (("opening", opening), ("closing", closing)):
        print(f"exporting {name} version {commit[:12]}")
        player = data / "exhibited" / name
        export_tree(repo, f"{commit}:app/public", player)
        story_source = data / "history" / f"tmp-{name}"
        export_tree(repo, commit, story_source)
        stage_story(story_source, player)
        if name == "closing":
            story_source.rename(data / "source")
        else:
            shutil.rmtree(story_source)

    print("bundling git history")
    (data / "history").mkdir(exist_ok=True)
    git(repo, "bundle", "create", str(data / "history" / "repo.bundle"), "--all")
    git(repo, "bundle", "verify", str(data / "history" / "repo.bundle"))

    documentation = data / "documentation"
    add_supplement(here, documentation)
    for label, source in supplements:
        count = add_supplement(source, data / "supplements" / label)
        print(f"added {count} file(s) under supplements/{label}")

    payload = [p for p in data.rglob("*") if p.is_file()]
    size = sum(p.stat().st_size for p in payload)
    today = datetime.date.today().isoformat()

    def tag_file(name, text):
        (bag / name).write_text(text, encoding="utf-8", newline="\n")

    tag_file("bagit.txt", "BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n")
    tag_file(
        "bag-info.txt",
        "External-Description: God Bless The United States Of Aliens, "
        "web-based AI-voiced performance, 2026\n"
        "Contact-Name: Chris-Armel Iradukunda (daqhris)\n"
        "Contact-Email: media@daqhris.com\n"
        f"Bagging-Date: {today}\n"
        f"Payload-Oxum: {size}.{len(payload)}\n"
        f"External-Identifier: {ORIGIN}\n"
        f"Opening-Commit: {opening}\n"
        f"Closing-Commit: {closing}\n",
    )
    tag_file("START-HERE.txt", START_HERE)

    print(f"checksumming {len(payload)} files")
    write_manifest(bag, "manifest-sha256.txt", payload)
    write_manifest(
        bag,
        "tagmanifest-sha256.txt",
        [bag / n for n in ("bagit.txt", "bag-info.txt", "START-HERE.txt", "manifest-sha256.txt")],
    )
    print(f"done: {bag} ({size / 1e6:.0f} MB)")


def verify(args):
    bag = Path(args.bag).expanduser().resolve()
    problems = []
    listed = set()
    for manifest in ("manifest-sha256.txt", "tagmanifest-sha256.txt"):
        if not (bag / manifest).is_file():
            fail(f"{manifest} is missing; is this a deposit package?")
        for line in (bag / manifest).read_text(encoding="utf-8").split("\n"):
            if not line:
                continue
            expected, _, name = line.partition("  ")
            name = name.replace("%0D", "\r").replace("%0A", "\n").replace("%25", "%")
            path = (bag / name).resolve()
            if bag not in path.parents:
                problems.append(f"path leaves the package: {name}")
                continue
            listed.add(path)
            if not path.is_file():
                problems.append(f"missing: {name}")
            elif sha256(path) != expected:
                problems.append(f"changed: {name}")
    for path in (bag / "data").rglob("*"):
        if path.is_file() and path.resolve() not in listed:
            problems.append(f"not in manifest: {path.relative_to(bag).as_posix()}")
    if problems:
        print("\n".join(problems))
        sys.exit(f"FAILED: {len(problems)} problem(s)")
    print(f"OK: {len(listed)} files match their checksums")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    commands = parser.add_subparsers(dest="command", required=True)
    make = commands.add_parser("build", help="create a deposit package")
    make.add_argument("--out", required=True, help="new folder to create")
    make.add_argument("--opening", default=OPENING_REF)
    make.add_argument("--closing", default=CLOSING_REF)
    make.add_argument("--add", action="append", default=[], metavar="LABEL=PATH")
    make.set_defaults(run=build)
    check = commands.add_parser("verify", help="check a package against its manifests")
    check.add_argument("bag")
    check.set_defaults(run=verify)
    args = parser.parse_args()
    args.run(args)


if __name__ == "__main__":
    main()
