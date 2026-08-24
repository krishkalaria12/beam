import os
import re

SRC_ROOT = "crates/beam-services/src"
OLD_ROOT = "apps/desktop/src-tauri/src"

marker_re = re.compile(r"^// PORT:", re.M)

for dirpath, _dirnames, filenames in os.walk(SRC_ROOT):
    for filename in filenames:
        if not filename.endswith(".rs"):
            continue
        path = os.path.join(dirpath, filename)
        rel = os.path.relpath(path, SRC_ROOT)
        source = f"{OLD_ROOT}/{rel}"
        if not os.path.exists(source):
            continue
        text = open(path).read()
        if marker_re.search(text):
            continue
        # Prepend the marker above the first line.
        marker = f"// PORT: {source}\n// Copied verbatim; no Tauri APIs in this file.\n"
        open(path, "w").write(marker + text)
        print("marked", rel)
