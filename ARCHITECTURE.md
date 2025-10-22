# Архитектура системы парсинга L2 Mobs

## Обзор

Система состоит из 3 независимых модулей, которые можно использовать отдельно или в комбинации:

```
┌─────────────────────────────────────────────────────────────┐
│           L2 MOBS PARSING SYSTEM                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────┐   ┌────────────────────┐             │
│  │  parseAdena.js    │   │  parseMobStats.js  │             │
│  │  ───────────────  │   │  ──────────────    │             │
│  │ - Парсит список   │   │ - Извлекает HP,   │             │
│  │   монстров        │   │   EXP, Stats       │             │
│  │ - Собирает адену  │   │ - Работает с HTML  │             │
│  │ - С сайта Wiki    │   │ - Из файлов       │             │
│  └────────┬──────────┘   └────────┬───────────┘             │
│           │                        │                        │
│           │   ┌───────────────────┘                         │
│           │   │                                             │
│           └───┼───────────────────────────────┐             │
│               │                               │             │
│               v                               │             │
│  ┌────────────────────────────────┐         │             │
│  │   integrateMobData.js          │         │             │
│  │   ────────────────────────     │         │             │
│  │ - Объединяет данные из адены   │         │             │
│  │   и HP статистики              │         │             │
│  │ - Читает HTML файлы из data/   │         │             │
│  │ - Обогащает базовые данные     │         │             │
│  └────────────┬───────────────────┘         │             │
│               │                              │             │
│               v                              │             │
│  ┌────────────────────────────────┐         │             │
│  │ calculateEfficiency.js         │<────────┘             │
│  │ ──────────────────────         │                       │
│  │ - Рассчитывает HP/Adena        │                       │
│  │ - Сортирует по эффективности   │                       │
│  │ - Генерирует отчеты            │                       │
│  └────────────┬───────────────────┘                       │
│               │                                            │
│               v                                            │
│  📊 РЕЗУЛЬТАТЫ:                                           │
│     - mobs_with_efficiency.json                           │
│     - efficiency_report.txt                               │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

## Модули

### 1. parseAdena.js
**Назначение:** Парсит список всех монстров, дропящих адену

**Входные данные:**
- URL: `https://wiki1.mw2.wiki/item/57-adena/live`
- Пагинированные страницы

**Выходные данные:** `data/mobs_adena.json`
```json
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
```

**Функции:**
- `parseAdenaDrop(pageNum)` - парсит одну страницу
- `getMaxPages()` - определяет количество страниц
- `parseAllPages(maxPages)` - парсит все страницы с задержкой
- `saveResults(mobs)` - сохраняет результаты

**Использование:**
```bash
npm run parse-adena
```

---

### 2. parseMobStats.js
**Назначение:** Извлекает характеристики монстра из HTML файла

**Входные данные:**
- HTML строка или файл с таблицей статистики (`#result-stats`)

**Выходные данные:** объект с параметрами
```json
{
  "Level": 3,
  "HP": 90,
  "MP": 67,
  "EXP": 99,
  "SP": 10,
  "P.Atk.": 10,
  "M.Atk.": 4,
  "P.Def.": 44,
  "M.Def.": 33,
  "Accuracy": 36,
  "Evasion": 36,
  "Defence Attributes": {
    "Fire": 20,
    "Water": 20,
    ...
  }
}
```

**Функции:**
- `parseMobStats(htmlContent, isFilePath)` - парсит HTML
- `parseMobDrops(htmlContent, isFilePath)` - парсит дропы
- `normalizeStats(stats)` - преобразует строки в числа
- `enrichMobsFromHtmlFiles(mobs, baseDir)` - обогащает массив данных

**Использование:**
```javascript
import { parseMobStats, normalizeStats } from './src/parseMobStats.js';

// Из HTML строки
const stats = parseMobStats(htmlString);

// Из файла
const stats = parseMobStats('./data/npc_20537.html', true);

// Нормализовать значения
const normalized = normalizeStats(stats);
```

---

### 3. calculateEfficiency.js
**Назначение:** Рассчитывает эффективность фарма (HP / Adena)

**Входные данные:** массив монстров с полями `hp` и `avgAdena`

**Выходные данные:** массив с добавленным полем `efficiency`

**Функции:**
- `calculateEfficiency(mob)` - рассчитывает HP/Adena
- `enrichWithEfficiency(mobs)` - добавляет поле efficiency всем
- `sortByEfficiency(mobs, ascending)` - сортирует по эффективности
- `generateEfficiencyReport(mobs)` - генерирует текстовый отчет
- `saveEfficiencyResults(mobs)` - сохраняет в JSON

**Использование:**
```javascript
import { enrichWithEfficiency, sortByEfficiency } from './src/calculateEfficiency.js';

const enriched = enrichWithEfficiency(mobs);
const sorted = sortByEfficiency(enriched);
```

---

### 4. integrateMobData.js
**Назначение:** Главный скрипт, объединяющий все модули

**Процесс:**
1. Загружает `data/mobs_adena.json`
2. Ищет все файлы `npc_*.html` в папке `data/`
3. Парсит каждый HTML файл
4. Обогащает базовые данные характеристиками
5. Рассчитывает эффективность
6. Генерирует отчет
7. Сохраняет результаты

**Выходные данные:**
- `data/mobs_with_efficiency.json` - обогащенные данные
- `data/efficiency_report.txt` - текстовый отчет

**Использование:**
```bash
npm run integrate
```

---

## Поток данных

```
ЭТАП 1: Сбор списка монстров
┌─────────────────────┐
│ Wiki: Adena drops   │
│ (пагинированные)    │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ parseAdena.js       │
│ - Парсит каждую    │
│   страницу          │
│ - С задержкой 500ms │
└──────────┬──────────┘
           │
           v
    ✅ mobs_adena.json
    (40+ монстров)


ЭТАП 2: Получить характеристики
┌─────────────────────┐
│ Пользователь:       │
│ - Скачивает HTML    │
│ - Сохраняет как     │
│   npc_<ID>.html     │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ data/npc_*.html     │
│ файлы               │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ parseMobStats.js    │
│ - Извлекает HP     │
│ - Извлекает EXP    │
│ - Нормализует      │
└──────────┬──────────┘
           │
           v
    Данные характеристик


ЭТАП 3: Интеграция и анализ
┌─────────────────────┐
│ integrateMobData.js │
│ - Объединяет       │
│   базовые данные    │
│   и характеристики  │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│calculateEfficiency  │
│ - Рассчитывает     │
│   HP/Adena         │
│ - Сортирует        │
│ - Генерирует       │
│   отчет            │
└──────────┬──────────┘
           │
           v
    ✅ mobs_with_efficiency.json
    ✅ efficiency_report.txt
```

---

## Форматы данных

### Входной формат: HTML таблица статистики
```html
<div id="result-stats" class="npc-stats">
  <table class="table">
    <tr>
      <td>Level</td>
      <td>3</td>
      <td>HP</td>
      <td>90</td>
    </tr>
    ...
  </table>
</div>
```

### Выходной формат: JSON
```json
{
  "id": 20537,
  "name": "Elder Red Keltir",
  "level": "Ур. 3",
  "href": "/npc/20537-elder-red-keltir/live",
  "minAdena": 22,
  "maxAdena": 38,
  "chance": 70,
  "avgAdena": 30,
  "hp": 90,
  "mp": 67,
  "exp": 99,
  "sp": 10,
  "pAtk": 10,
  "mAtk": 4,
  "pDef": 44,
  "mDef": 33,
  "accuracy": 36,
  "evasion": 36,
  "efficiency": 3.00,
  "hpPerAdena": 3.00,
  "defenceAttributes": {
    "Fire": 20,
    "Water": 20,
    "Wind": 53,
    "Earth": 20,
    "Holy": 20,
    "Unholy": 20
  }
}
```

---

## Использование API в собственном коде

### Пример 1: Парсить только адену
```javascript
import('./src/parseAdena.js').then(async () => {
  // Уже запущено при импорте main()
});
```

### Пример 2: Парсить только HTML монстра
```javascript
import { parseMobStats, normalizeStats } from './src/parseMobStats.js';

const stats = parseMobStats('./data/npc_20537.html', true);
const normalized = normalizeStats(stats);
console.log(normalized);
```

### Пример 3: Рассчитать эффективность
```javascript
import { enrichWithEfficiency, sortByEfficiency } from './src/calculateEfficiency.js';

const mobs = [...]; // ваш массив монстров
const enriched = enrichWithEfficiency(mobs);
const sorted = sortByEfficiency(enriched);

sorted.forEach((mob, idx) => {
  console.log(`${idx + 1}. ${mob.name}: Efficiency = ${mob.efficiency}`);
});
```

### Пример 4: Полный pipeline
```javascript
import fs from 'fs';
import { parseMobStats, normalizeStats } from './src/parseMobStats.js';
import { enrichWithEfficiency, sortByEfficiency } from './src/calculateEfficiency.js';

// Загрузить базовые данные
const mobs = JSON.parse(fs.readFileSync('./data/mobs_adena.json'));

// Обогатить данными с HTML файла
const stats = parseMobStats('./data/npc_20537.html', true);
const normalized = normalizeStats(stats);

mobs[0].hp = normalized['HP'];
mobs[0].exp = normalized['EXP'];

// Рассчитать эффективность
const enriched = enrichWithEfficiency(mobs);
const sorted = sortByEfficiency(enriched);

// Использовать
console.log(sorted[0]);
```

---

## Ошибки и решения

| Проблема | Причина | Решение |
|----------|---------|---------|
| 404 при парсинге сайта | Сервер блокирует ботов | Используйте HTML файлы вручную |
| Пустой результат при парсинге HTML | Неправильная структура HTML | Проверьте наличие `#result-stats` |
| NaN при расчете эффективности | Отсутствует hp или avgAdena | Добавьте HTML файл монстра |
| Неправильная нормализация | Используется строковое значение | Вызовите `normalizeStats()` |

---

## Производительность

- **parseAdena.js**: ~1-2 минуты для 40+ страниц (с задержкой 500ms)
- **parseMobStats.js**: ~5-10ms на один HTML файл
- **calculateEfficiency.js**: < 10ms для 1000+ монстров
- **integrateMobData.js**: ~3-5 минут для 100+ монстров с HTML файлами

---

## Расширение функционала

### Добавить новые метрики
```javascript
// в calculateEfficiency.js
function calculateNewMetric(mob) {
  return mob.hp / mob.exp; // или другая формула
}

enrichedMobs = enrichedMobs.map(mob => ({
  ...mob,
  newMetric: calculateNewMetric(mob)
}));
```

### Фильтрация по уровню
```javascript
const filteredMobs = mobs.filter(m => {
  const level = parseInt(m.level.match(/\d+/)[0]);
  return level >= 10 && level <= 20;
});
```

### Экспорт в CSV
```javascript
import { writeFileSync } from 'fs';

const csv = mobs.map(m => 
  `${m.id},${m.name},${m.level},${m.hp},${m.avgAdena},${m.efficiency}`
).join('\n');

writeFileSync('./data/mobs.csv', csv);
```