#!/usr/bin/env python3
"""
Импорт постов из Telegram-канала в Hugo.

Использование:
  1. Откройте Telegram Desktop → канал → ⋮ → Export Chat History
  2. Выберите формат JSON, снимите галочки с медиа (или оставьте фото)
  3. Запустите скрипт:
     python3 scripts/import_telegram.py path/to/result.json

Скрипт создаст markdown-файлы в content/posts/tg-<id>.md
Посты создаются как draft — проверьте и опубликуйте вручную.
"""

import json
import sys
import os
import re
from datetime import datetime
from pathlib import Path

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content" / "posts"
MAX_TITLE_LEN = 80


def extract_text(message: dict) -> str:
    """Извлекает текст из сообщения Telegram (поддерживает rich text)."""
    raw = message.get("text", "")
    if isinstance(raw, str):
        return raw
    # rich text — список из строк и объектов
    parts = []
    for chunk in raw:
        if isinstance(chunk, str):
            parts.append(chunk)
        elif isinstance(chunk, dict):
            text = chunk.get("text", "")
            typ = chunk.get("type", "")
            if typ == "bold":
                parts.append(f"**{text}**")
            elif typ == "italic":
                parts.append(f"*{text}*")
            elif typ == "code":
                parts.append(f"`{text}`")
            elif typ == "pre":
                lang = chunk.get("language", "")
                parts.append(f"\n```{lang}\n{text}\n```\n")
            elif typ == "text_link":
                href = chunk.get("href", "")
                parts.append(f"[{text}]({href})")
            elif typ in ("link", "url"):
                parts.append(text)
            elif typ == "strikethrough":
                parts.append(f"~~{text}~~")
            else:
                parts.append(text)
    return "".join(parts)


def make_title(text: str) -> str:
    """Генерирует заголовок из первой строки текста."""
    first_line = text.strip().split("\n")[0]
    # убираем markdown-разметку для заголовка
    title = re.sub(r"[*_`~\[\]()#]", "", first_line).strip()
    if len(title) > MAX_TITLE_LEN:
        title = title[:MAX_TITLE_LEN].rsplit(" ", 1)[0] + "…"
    return title or "Пост из Telegram"


def make_slug(msg_id: int) -> str:
    """Генерирует slug для файла."""
    return f"tg-{msg_id}"


def process_message(msg: dict) -> dict | None:
    """Обрабатывает одно сообщение и возвращает данные для поста."""
    # пропускаем сервисные сообщения
    if msg.get("type") != "message":
        return None

    text = extract_text(msg)
    if not text.strip():
        return None

    msg_id = msg["id"]
    date_str = msg.get("date", "")

    try:
        date = datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        date = datetime.now()

    title = make_title(text)
    slug = make_slug(msg_id)

    # собираем фото если есть
    photo = msg.get("photo", "")

    front_matter = {
        "title": title,
        "date": date.strftime("%Y-%m-%dT%H:%M:%S+03:00"),
        "tags": ["telegram"],
        "draft": True,
    }

    body = text.strip()
    if photo:
        body = f"![photo]({photo})\n\n{body}"

    return {
        "slug": slug,
        "front_matter": front_matter,
        "body": body,
    }


def write_post(post: dict) -> Path:
    """Записывает пост в файл."""
    CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    filepath = CONTENT_DIR / f"{post['slug']}.md"

    fm = post["front_matter"]
    # экранируем кавычки в заголовке
    safe_title = fm["title"].replace('"', '\\"')

    lines = [
        "---",
        f'title: "{safe_title}"',
        f'date: {fm["date"]}',
        f'tags: {json.dumps(fm["tags"], ensure_ascii=False)}',
        f'draft: {str(fm["draft"]).lower()}',
        "---",
        "",
        post["body"],
        "",
    ]

    filepath.write_text("\n".join(lines), encoding="utf-8")
    return filepath


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("Ошибка: укажите путь к result.json из экспорта Telegram Desktop")
        sys.exit(1)

    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"Файл не найден: {json_path}")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    messages = data.get("messages", [])
    if not messages:
        print("Сообщения не найдены в файле")
        sys.exit(1)

    created = 0
    skipped = 0

    for msg in messages:
        post = process_message(msg)
        if post is None:
            skipped += 1
            continue

        filepath = CONTENT_DIR / f"{post['slug']}.md"
        if filepath.exists():
            print(f"  пропуск (уже существует): {filepath.name}")
            skipped += 1
            continue

        path = write_post(post)
        print(f"  создан: {path.name}")
        created += 1

    print(f"\nГотово! Создано: {created}, пропущено: {skipped}")
    print(f"Посты созданы как draft. Проверьте и снимите draft: true для публикации.")
    print(f"Директория: {CONTENT_DIR}")


if __name__ == "__main__":
    main()
