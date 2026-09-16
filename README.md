# Русские плагины ранобэ для LNReader

Репозиторий плагинов [LNReader](https://github.com/LNReader/lnreader) с
русскими источниками ранобэ. Плагины взяты из
[LNReader/lnreader-plugins](https://github.com/LNReader/lnreader-plugins)
(MIT), оставлены только русские, иконки приведены к единому стилю.

## Установка

В LNReader: **Настройки → Репозитории → Добавить**, вставить:

```
https://raw.githubusercontent.com/Sindrow33/lnreader-ru-plugins/plugins/v3.0.0/.dist/plugins.min.json
```

Затем **Обзор** — источники появятся там.

Это отдельный репозиторий от аниме и манги: LNReader читает ранобэ и
использует JS-плагины, а не APK-расширения Aniyomi/Mihon.

## Сборка

Всё собирается в GitHub Actions (`.github/workflows/publish-plugins.yml`)
при пуше в `main`: генерация multisrc-плагинов → компиляция TypeScript →
сборка манифеста → публикация в ветку `plugins/v3.0.0`.

Иконки генерируются скриптом `scripts/make-icons.py` — единый стиль задаётся
там, вручную файлы не правятся.

## Лицензия

MIT — см. [LICENSE](LICENSE). Код плагинов принадлежит проекту LNReader и его
контрибьюторам.
