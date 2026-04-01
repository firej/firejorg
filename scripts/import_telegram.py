#!/usr/bin/env python3
"""
Импорт постов из Telegram-канала в Hugo.

Использование:
  1. Откройте Telegram Desktop → канал → ⋮ → Export Chat History
  2. Выберите формат JSON, включите фото и видео
  3. Запустите скрипт:
     python3 scripts/import_telegram.py /path/to/result.json

Скрипт создаст Hugo page bundles в content/posts/tg-<id>/index.md
с копированием фото и видео файлов.
Посты создаются как draft — проверьте и опубликуйте вручную.

Сообщения с одинаковой датой (до секунды) группируются в один пост
(Telegram отправляет несколько фото как отдельные сообщения с одной датой).
"""

import json
import sys
import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from collections import defaultdict

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


def copy_media(src_path: Path, dest_dir: Path) -> str | None:
    """Копирует медиафайл в директорию поста. Возвращает имя файла."""
    if not src_path.exists():
        print(f"    ⚠ медиафайл не найден: {src_path}")
        return None
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / src_path.name
    shutil.copy2(src_path, dest)
    return src_path.name


def group_messages(messages: list[dict]) -> list[list[dict]]:
    """
    Группирует сообщения по дате (до секунды).
    Telegram отправляет несколько фото как отдельные сообщения с одинаковой датой.
    Одиночные сообщения остаются как группа из одного элемента.
    """
    # Фильтруем только message (не service)
    msgs = [m for m in messages if m.get("type") == "message"]

    groups = []
    by_date = defaultdict(list)

    for msg in msgs:
        by_date[msg["date"]].append(msg)

    # Сортируем по дате, внутри группы — по id
    for date in sorted(by_date.keys()):
        group = sorted(by_date[date], key=lambda m: m["id"])
        groups.append(group)

    return groups


def process_group(group: list[dict], export_dir: Path) -> dict | None:
    """Обрабатывает группу сообщений и возвращает данные для одного поста."""
    # Собираем весь текст из группы
    all_texts = []
    for msg in group:
        text = extract_text(msg)
        if text.strip():
            all_texts.append(text.strip())

    # Собираем все фото
    photos = []
    for msg in group:
        photo = msg.get("photo", "")
        if photo:
            photos.append(photo)

    # Собираем видео (обычно одно на группу)
    video_file = ""
    video_thumb = ""
    video_width = None
    video_height = None
    for msg in group:
        if msg.get("media_type") == "video_file" and msg.get("file"):
            video_file = msg["file"]
            video_thumb = msg.get("thumbnail", "")
            video_width = msg.get("width")
            video_height = msg.get("height")
            break

    # Пропускаем пустые группы
    if not all_texts and not photos and not video_file:
        return None

    # Берём первый id группы как основной
    first_msg = group[0]
    msg_id = first_msg["id"]
    date_str = first_msg.get("date", "")

    try:
        date = datetime.fromisoformat(date_str)
    except (ValueError, TypeError):
        date = datetime.now()

    combined_text = "\n\n".join(all_texts)
    title = make_title(combined_text) if combined_text else "Пост из Telegram"
    slug = f"tg-{msg_id}"

    front_matter = {
        "title": title,
        "date": date.strftime("%Y-%m-%dT%H:%M:%S+03:00"),
        "tags": ["telegram"],
        "draft": True,
    }

    # Собираем медиа-файлы для копирования
    media_files = []
    for photo in photos:
        media_files.append((export_dir / photo, "photo"))
    if video_file:
        media_files.append((export_dir / video_file, "video"))
    if video_thumb:
        media_files.append((export_dir / video_thumb, "thumbnail"))

    photo_names = [Path(p).name for p in photos]

    return {
        "slug": slug,
        "front_matter": front_matter,
        "body": combined_text,
        "media_files": media_files,
        "photo_names": photo_names,
        "video_name": Path(video_file).name if video_file else None,
        "video_thumb_name": Path(video_thumb).name if video_thumb else None,
        "video_width": video_width,
        "video_height": video_height,
    }


def build_body(post: dict) -> str:
    """Собирает тело поста с медиа-вставками."""
    parts = []

    # Фото — оборачиваем в grid если несколько
    if post["photo_names"]:
        n_photos = len(post["photo_names"])
        if n_photos > 1:
            # Несколько фото — grid layout
            parts.append(f'<div class="photo-grid photos-{n_photos}">')
            for photo_name in post["photo_names"]:
                parts.append(f'  <img src="{photo_name}" alt="photo">')
            parts.append("</div>")
            parts.append("")
        else:
            # Одно фото — обычная вставка
            parts.append(f"![photo]({post['photo_names'][0]})")
            parts.append("")

    # Видео — как GIF (autoplay, loop, muted)
    if post["video_name"]:
        w = post.get("video_width") or 640
        h = post.get("video_height") or 360
        vname = post["video_name"]
        parts.append(
            f'<video autoplay loop muted playsinline width="{w}" height="{h}">\n'
            f'  <source src="{vname}" type="video/mp4">\n'
            f"</video>"
        )
        parts.append("")

    # Текст
    if post["body"]:
        parts.append(post["body"])

    return "\n".join(parts)


def write_post(post: dict, export_dir: Path) -> Path:
    """Записывает пост как Hugo page bundle."""
    post_dir = CONTENT_DIR / post["slug"]
    post_dir.mkdir(parents=True, exist_ok=True)
    filepath = post_dir / "index.md"

    # Копируем медиа
    for src_path, media_type in post["media_files"]:
        name = copy_media(src_path, post_dir)
        if name:
            print(f"    📎 {media_type}: {name}")

    fm = post["front_matter"]
    safe_title = fm["title"].replace('"', '\\"')

    body = build_body(post)

    lines = [
        "---",
        f'title: "{safe_title}"',
        f'date: {fm["date"]}',
        f'tags: {json.dumps(fm["tags"], ensure_ascii=False)}',
        f'draft: {str(fm["draft"]).lower()}',
    ]
    # featured_image — первое фото
    if post["photo_names"]:
        lines.append(f'featured_image: "{post["photo_names"][0]}"')
    lines.extend([
        "---",
        "",
        body,
        "",
    ])

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

    export_dir = json_path.parent

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    messages = data.get("messages", [])
    if not messages:
        print("Сообщения не найдены в файле")
        sys.exit(1)

    groups = group_messages(messages)
    print(f"Найдено сообщений: {len(messages)}, групп (постов): {len(groups)}")
    print(f"Экспорт из: {export_dir}")
    print()

    created = 0
    skipped = 0

    for group in groups:
        post = process_group(group, export_dir)
        if post is None:
            skipped += 1
            continue

        post_dir = CONTENT_DIR / post["slug"]
        index_file = post_dir / "index.md"
        if index_file.exists():
            print(f"  ⏭ пропуск (уже существует): {post['slug']}/")
            skipped += 1
            continue

        path = write_post(post, export_dir)
        n_photos = len(post["photo_names"])
        has_video = "🎬" if post["video_name"] else ""
        photo_info = f" ({n_photos} фото)" if n_photos > 1 else ""
        print(f"  ✅ создан: {post['slug']}/{photo_info} {has_video}")
        created += 1

    print(f"\nГотово! Создано: {created}, пропущено: {skipped}")
    print(f"Посты созданы как draft. Проверьте и снимите draft: true для публикации.")
    print(f"Директория: {CONTENT_DIR}")


if __name__ == "__main__":
    main()
