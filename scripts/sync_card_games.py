#!/usr/bin/env python3
"""Export the standalone games from a card-games checkout into this Hugo site."""

import argparse
import hashlib
from pathlib import Path
import re
import shutil


def export(source: Path, destination: Path) -> None:
    for slug, title in (("klondike", "Косынка"), ("spider", "Паук")):
        game = source / slug
        target = destination / slug
        target.mkdir(parents=True, exist_ok=True)
        for name in ("game.js", "styles.css", "cards.css", "fonts.css"):
            shutil.copyfile(game / name, target / name)
            if name.endswith(".css"):
                (target / name).write_text((target / name).read_text().rstrip() + "\n")
        shutil.copytree(game / "fonts", target / "fonts", dirs_exist_ok=True)

        html = (game / "index.html").read_text()
        # The game already supports local saves and startup without YandexSDK.
        # Do not request /sdk.js from the blog or wait for its initialization.
        html = re.sub(r"\s*<!--.*?-->", "", html, flags=re.S)
        html, removed = re.subn(
            r'\s*<script\b[^>]*src="(?:yandex\.js[^\"]*|/sdk\.js)"[^>]*></script>',
            "", html,
        )
        if removed != 2:
            raise ValueError(f"{slug}: expected two Yandex integration scripts")

        html = html.replace("</head>", f'''  <meta name="description" content="Пасьянс «{title}» от firej. Играйте в браузере бесплатно, без рекламы и регистрации.">
  <link rel="canonical" href="https://firej.org/games/{slug}/">
  <link rel="stylesheet" href="../game-nav.css">
</head>''')
        html = html.replace('<div class="game-container">', '''<div class="game-container">
    <nav class="game-nav" aria-label="Навигация"><a href="../">← все игры</a><a href="/">firej.org</a></nav>''', 1)
        html = html.replace('  <script src="game.js', '  <noscript>Для игры включите JavaScript в браузере.</noscript>\n  <script src="game.js')

        # Publish URLs based on content so updates do not reuse old cached assets.
        def version(match: re.Match) -> str:
            path = match.group(2)
            digest = hashlib.sha256((target / path).read_bytes()).hexdigest()[:12]
            return f'{match.group(1)}="{path}?v={digest}"'

        html = re.sub(r'(src|href)="([\w.-]+\.(?:css|js))(?:\?[^\"]*)?"', version, html)
        (target / "index.html").write_text(html)

    for name in ("icon-kosynka.svg", "icon-spider.svg"):
        shutil.copyfile(source / "promo" / name, destination / name)
    (destination / "game-nav.css").write_text('''.game-nav {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
  font: 12px/1.5 "JetBrains Mono", monospace;
}
.game-nav a { color: #e5ddc9; text-decoration: none; padding: 4px 0; }
.game-nav a:hover { color: #fff; text-decoration: underline; }
.game-nav a:focus-visible { outline: 2px solid #d4af37; outline-offset: 4px; }
''')
    print(f"Exported Косынка and Паук to {destination}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Path to the card-games checkout")
    parser.add_argument("--destination", type=Path,
                        default=Path(__file__).resolve().parents[1] / "static" / "games")
    args = parser.parse_args()
    export(args.source.resolve(), args.destination.resolve())
