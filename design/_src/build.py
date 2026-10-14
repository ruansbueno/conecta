#!/usr/bin/env python3
"""Gera o HTML de cada tela e renderiza os PNGs com o Chrome headless."""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_HTML = os.path.join(HERE, "..", "_html")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def render(name, html, folder, w, h):
    os.makedirs(OUT_HTML, exist_ok=True)
    png_dir = os.path.abspath(os.path.join(HERE, "..", folder))
    os.makedirs(png_dir, exist_ok=True)
    path = os.path.abspath(os.path.join(OUT_HTML, name + ".html"))
    with open(path, "w") as f:
        f.write(html)
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=2",
        f"--window-size={w},{h}", "--virtual-time-budget=3000",
        f"--screenshot={os.path.join(png_dir,name+'.png')}", "file://" + path,
    ], capture_output=True, cwd=png_dir)
    print("  " + folder + "/" + name + ".png")


def main(only=None):
    import screens_mobile
    import screens_web
    for name, html in screens_mobile.SCREENS():
        if only and only not in name:
            continue
        render(name, html, "mobile", 390, 844)
    for name, html in screens_web.SCREENS():
        if only and only not in name:
            continue
        render(name, html, "web", 1440, 900)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
