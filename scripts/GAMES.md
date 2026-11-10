# Игры на firej.org

Исходники: https://github.com/firej/card-games.

Для обновления скопируйте актуальные игры из локального checkout:

```sh
python3 scripts/sync_card_games.py /path/to/card-games
hugo --minify
```

Скрипт копирует только игровые файлы и локальные шрифты в `static/games/`,
убирает загрузку Yandex SDK, добавляет навигацию и версии ресурсов по содержимому.
Логика игр остаётся без изменений; сохранения работают в localStorage.
Исходные страницы для Яндекс Игр в card-games не меняются.

Страница выбора — `content/games/_index.md` и `layouts/games/list.html`.
Игры доступны по `/games/klondike/` и `/games/spider/`.
Обновлённые файлы `static/games/` нужно коммитить вместе с остальными изменениями.
Публикация выполняется штатным workflow при push в main.
