# L2 Mobs Drops Parser

Полнофункциональный парсер для сбора и анализа информации о дропе монстров в Lineage 2, с расчетом эффективности фарма (HP / Adena).

## Структура проекта

```
l2-mobs/
├── src/
│   ├── parseAdena.js          # Парсер списка монстров, дропящих адену (с сайта)
│   ├── parseMobStats.js        # Парсер характеристик монстра из HTML
│   ├── calculateEfficiency.js  # Расчет эффективности фарма (HP/Adena)
│   ├── integrateMobData.js     # Интеграция всех данных
│   ├── testLocalParser.js      # Тест парсера на локальном HTML
│   └── testNpcParser.js        # Тест парсера на сайте (может не работать из-за блокировки)
├── data/                        # Результаты парсинга
│   ├── mobs_adena.json          # Список монстров с дропом адены
│   ├── mobs_with_efficiency.json # Результаты с расчетом эффективности
│   ├── efficiency_report.txt     # Текстовый отчет
│   └── npc_*.html               # HTML файлы монстров (нужно добавить вручную)
├── package.json
└── README.md
```

## Установка

```bash
npm install
```

## Использование

### Шаг 1: Получить список монстров с дропом адены

```bash
npm run parse-adena
```

Загружает все страницы с дропом адены, собирает информацию о монстрах и сохраняет в `data/mobs_adena.json`.

**Результат содержит:**
- `id` - ID монстра
- `name` - Имя монстра
- `level` - Уровень
- `href` - Ссылка на страницу монстра
- `minAdena` - Минимум адены
- `maxAdena` - Максимум адены
- `chance` - Шанс дропа (%)
- `avgAdena` - Среднее количество адены

### Шаг 2: Получить характеристики монстров (HP, EXP и т.д.)

Есть несколько способов:

#### Способ A: Парсить со страниц (может не работать из-за блокировки)
```bash
npm run test-npc
```

#### Способ B: Добавить HTML файлы вручную
1. Откройте страницу монстра в браузере
2. Нажмите Ctrl+S (Save As) и сохраните как HTML
3. Переименуйте файл в `npc_<ID>.html` (например: `npc_20537.html`)
4. Поместите в папку `data/`

#### Способ C: Тестировать на примере
```bash
npm run test-local
```

Этот тест парсирует примерный HTML файл `data/sample_elder_red_keltir.html` и показывает, как работает парсер.

### Шаг 3: Интегрировать все данные и расчитать эффективность

```bash
npm integrate
```

Это:
1. Загрузит базовые данные о дропе адены
2. Найдет и спарсит все HTML файлы монстров в папке `data/`
3. Обогатит данные характеристиками (HP, EXP и т.д.)
4. Рассчитает эффективность для каждого монстра (HP / avgAdena)
5. Создаст отчет с рейтингом эффективности
6. Сохранит результаты в `data/mobs_with_efficiency.json`

## Пример данных

### mobs_adena.json (после шага 1)
```json
[
  {
    "id": 20537,
    "name": "Elder Red Keltir",
    "level": "Ур. 3",
    "href": "/npc/20537-elder-red-keltir/live",
    "minAdena": 22,
    "maxAdena": 38,
    "chance": 70,
    "avgAdena": 30
  }
]
```

### mobs_with_efficiency.json (после шага 3)
```json
[
  {
    "id": 20537,
    "name": "Elder Red Keltir",
    "level": "Ур. 3",
    "href": "/npc/20537-elder-red-keltir/live",
    "minAdena": 22,
    "maxAdena": 38,
    "avgAdena": 30,
    "hp": 90,
    "exp": 99,
    "sp": 10,
    "pAtk": 10,
    "efficiency": 3.00,
    "hpPerAdena": 3.00,
    ...
  }
]
```

### efficiency_report.txt (пример)
```
📊 ОТЧЕТ ОБ ЭФФЕКТИВНОСТИ МОНСТРОВ
═══════════════════════════════════════════════════════════════

📈 СТАТИСТИКА:
  Всего монстров: 1
  С данными по HP: 1
  Без данных по HP: 0

💪 ЭФФЕКТИВНОСТЬ (HP/Adena):
  Минимум: 3.00
  Максимум: 3.00
  Среднее: 3.00

⭐ ТОП 15 ЭФФЕКТИВНЫХ МОНСТРОВ:
──────────────────────────────────────────────────────────────
 1. Elder Red Keltir             Lv. 3 | HP:   90 | Adena:  30 | Eff: 3.00
```

## API для разработчиков

### parseMobStats.js
```javascript
import { parseMobStats, normalizeStats } from './src/parseMobStats.js';

// Парсить из HTML строки
const stats = parseMobStats(htmlString);

// Парсить из файла
const stats = parseMobStats('./data/npc_20537.html', true);

// Нормализовать значения (строки → числа)
const normalized = normalizeStats(stats);
```

### calculateEfficiency.js
```javascript
import { enrichWithEfficiency, sortByEfficiency } from './src/calculateEfficiency.js';

// Рассчитать эффективность для каждого монстра
const enriched = enrichWithEfficiency(mobs);

// Отсортировать по эффективности (убывание)
const sorted = sortByEfficiency(enriched);
```

## Как добавить HTML файлы монстров

1. Найдите монстра на wiki: `https://wiki1.mw2.wiki/en/npc/<ID>-<name>/live`
2. Сохраните страницу как HTML (Ctrl+S → Save As)
3. Переименуйте файл в формат `npc_<ID>.html`
4. Поместите в папку `data/`
5. Запустите `npm run integrate`

Парсер автоматически найдет и обработает все HTML файлы.

## Проблемы и решения

### Ошибка 404 при запуске `npm run test-npc`
Сервер может блокировать боты. Используйте вместо этого способ с добавлением HTML файлов вручную.

### Парсер не находит таблицу статистики
Проверьте, что HTML содержит элемент `<div id="result-stats">` с таблицей характеристик.

### Нет данных по HP для некоторых монстров
Если для монстра нет HTML файла, характеристики не будут добавлены. Добавьте HTML файл вручную.