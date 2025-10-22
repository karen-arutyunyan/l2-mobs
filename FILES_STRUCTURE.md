# 📁 Структура файлов проекта

## Основные директории

```
d:\code\l2-mobs/
├── src/                         # Исходный код
├── data/                        # Данные и результаты
├── package.json                 # Конфигурация npm
├── README.md                    # Основная документация
├── QUICK_START.md              # Быстрый старт
├── ARCHITECTURE.md             # Архитектура системы
└── FILES_STRUCTURE.md          # Этот файл
```

---

## 📂 Папка `src/` - Исходный код

### Основные модули (можно использовать отдельно)

#### 1. **parseAdena.js** (209 строк)
```javascript
// Парсит список монстров, дропящих адену со страницы Wiki
// Вход: URL https://wiki1.mw2.wiki/item/57-adena/live
// Выход: data/mobs_adena.json
```

**Экспортируемые функции:**
- `parseAdenaDrop(pageNum)` - парсит одну страницу
- `getMaxPages()` - определяет количество страниц
- `parseAllPages(maxPages)` - парсит все страницы
- `saveResults(mobs, filename)` - сохраняет результаты

**Использование:**
```bash
npm run parse-adena
```

---

#### 2. **parseMobStats.js** (172 строки)
```javascript
// Извлекает характеристики монстра из HTML файла
// Вход: HTML строка или файл
// Выход: объект с параметрами (HP, EXP, Stats и т.д.)
```

**Экспортируемые функции:**
```javascript
export { 
  parseMobStats,           // Главная функция парсинга
  parseMobDrops,           // Парсит дропы из таблицы
  normalizeStats,          // Преобразует строки в числа
  enrichMobsFromHtmlFiles  // Обогащает массив данных
}
```

**Основная функция:**
```javascript
// Парсить из HTML строки
const stats = parseMobStats(htmlString);

// Парсить из файла
const stats = parseMobStats('./data/npc_20537.html', true);

// Нормализовать значения (строки → числа)
const normalized = normalizeStats(stats);
```

**Пример результата:**
```javascript
{
  "Level": 3,
  "HP": 90,           // уже число
  "MP": 67,
  "EXP": 99,
  "P.Atk.": 10,
  "Defence Attributes": { "Fire": 20, "Water": 20, ... }
}
```

---

#### 3. **calculateEfficiency.js** (125 строк)
```javascript
// Рассчитывает эффективность фарма (HP / Adena)
// Вход: массив монстров с hp и avgAdena
// Выход: массив с добавленным полем efficiency
```

**Экспортируемые функции:**
```javascript
export {
  calculateEfficiency,      // Рассчитывает HP/Adena для одного монстра
  enrichWithEfficiency,     // Добавляет efficiency всем
  sortByEfficiency,         // Сортирует по эффективности
  generateEfficiencyReport, // Генерирует текстовый отчет
  saveEfficiencyResults     // Сохраняет результаты в JSON
}
```

**Использование:**
```javascript
const enriched = enrichWithEfficiency(mobs);
const sorted = sortByEfficiency(enriched);
const report = generateEfficiencyReport(sorted);
```

---

### Интеграционные скрипты (main скрипты)

#### 4. **integrateMobData.js** (92 строки)
```javascript
// Главный скрипт, объединяющий все модули
// Процесс:
// 1. Загружает mobs_adena.json
// 2. Ищет все npc_*.html файлы
// 3. Парсит каждый
// 4. Обогащает данные
// 5. Рассчитывает эффективность
// 6. Генерирует отчет
```

**Использование:**
```bash
npm run integrate
```

**Выходные данные:**
- `data/mobs_with_efficiency.json`
- `data/efficiency_report.txt`

---

### Тестовые скрипты (для проверки функциональности)

#### 5. **testLocalParser.js** (80 строк)
```javascript
// Тестирует парсер HTML на локальном файле
// Использует: data/sample_elder_red_keltir.html
// Показывает как работает парсер
```

**Использование:**
```bash
npm run test-local
```

**Выходные данные:**
- Консоль: результаты парсинга
- `data/test_local_parse.json`: результаты

---

#### 6. **testNpcParser.js** (70 строк)
```javascript
// Тестирует парсер на реальных страницах сайта
// Может не работать из-за блокировки сервера
```

**Использование:**
```bash
npm run test-npc
```

---

#### 7. **fullTest.js** (102 строки)
```javascript
// Полный тест всей системы
// Проверяет:
// 1. Парсинг HTML
// 2. Нормализацию данных
// 3. Расчет эффективности
// 4. Сортировку
// 5. Генерацию отчетов
```

**Использование:**
```bash
npm test
```

---

## 📂 Папка `data/` - Данные и результаты

### Входные данные

#### **sample_elder_red_keltir.html** (500+ строк)
```html
<!-- Пример HTML страницы монстра для тестирования -->
<!-- Содержит таблицу #result-stats с характеристиками -->
<!-- Используется для: npm run test-local -->
```

#### **npc_*.html** (для каждого монстра)
```html
<!-- HTML страницы монстров, скачанные вручную -->
<!-- Формат имени: npc_<ID>.html -->
<!-- Пример: npc_20537.html, npc_20130.html и т.д. -->
<!-- Содержат таблицу #result-stats -->
```

---

### Выходные данные

#### **mobs_adena.json** (шаг 1)
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
  },
  ...
]
```

**Размер:** ~100-200 KB (2000+ монстров)
**Создается:** `npm run parse-adena`
**Используется:** `npm run integrate`

---

#### **mobs_with_efficiency.json** (ФИНАЛЬНЫЙ РЕЗУЛЬТАТ)
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
    },
    "allStats": { ... полная копия всей статистики ... }
  },
  ...
]
```

**Размер:** ~200-400 KB
**Создается:** `npm run integrate`
**Содержит:** Все данные адены + характеристики + эффективность

---

#### **efficiency_report.txt** (ОТЧЕТ)
```
📊 ОТЧЕТ ОБ ЭФФЕКТИВНОСТИ МОНСТРОВ
═══════════════════════════════════════════════════════════════

📈 СТАТИСТИКА:
  Всего монстров: 40
  С данными по HP: 5
  Без данных по HP: 35

💪 ЭФФЕКТИВНОСТЬ (HP/Adena):
  Минимум: 0.90
  Максимум: 5.45
  Среднее: 2.34

⭐ ТОП 15 ЭФФЕКТИВНЫХ МОНСТРОВ:
──────────────────────────────────────────────────────────────
 1. Elder Red Keltir             Lv. 3 | HP:   90 | Adena:  30 | Eff: 3.00
 ...

🔻 ТОП 15 НЕЭФФЕКТИВНЫХ МОНСТРОВ:
──────────────────────────────────────────────────────────────
 1. Some Monster                 Lv. 1 | HP:   10 | Adena:  50 | Eff: 0.20
 ...
```

**Размер:** ~2-5 KB
**Создается:** `npm run integrate`
**Для:** Быстрого просмотра результатов

---

### Тестовые результаты

#### **test_local_parse.json**
```json
[ Результаты парсинга локального HTML файла ]
```
**Создается:** `npm run test-local`

#### **test_npc_stats.json**
```json
[ Результаты попыток парсинга со страниц сайта ]
```
**Создается:** `npm run test-npc`

---

## 📋 Файлы конфигурации

### **package.json**
```json
{
  "name": "l2-mobs-drops-parser",
  "version": "1.0.0",
  "type": "module",  // ES6 модули
  "scripts": {
    "parse-adena": "node src/parseAdena.js",
    "test-npc": "node src/testNpcParser.js",
    "test-local": "node src/testLocalParser.js",
    "test": "node src/fullTest.js",
    "integrate": "node src/integrateMobData.js"
  },
  "dependencies": {
    "axios": "^1.6.0",      // HTTP клиент
    "cheerio": "^1.0.0-rc.12"  // HTML парсер
  }
}
```

---

### **package-lock.json**
```
Замороженные версии зависимостей (автоматически создается)
```

---

## 📚 Документация

### **README.md** (201 строка)
Полное описание:
- Структура проекта
- Установка
- Использование каждого скрипта
- Примеры данных
- API для разработчиков
- Проблемы и решения

### **QUICK_START.md** (250+ строк)
Быстрый старт:
- Что было сделано
- Как использовать (3 шага)
- Примеры результатов
- Доступные команды
- Примеры использования
- Часто встречающиеся проблемы

### **ARCHITECTURE.md** (350+ строк)
Техническая документация:
- Общий обзор системы
- Описание каждого модуля
- Поток данных
- Форматы данных
- API для собственного кода
- Производительность
- Расширение функционала

### **FILES_STRUCTURE.md** (этот файл)
Описание структуры файлов и модулей

---

## 🔗 Зависимости между модулями

```
parseAdena.js
    ↓
    └─→ data/mobs_adena.json
         ↓
         └─→ integrateMobData.js
              ↓
              ├─→ parseMobStats.js (парсит data/npc_*.html)
              │   ↓
              │   └─→ normalizeStats()
              │
              └─→ calculateEfficiency.js
                  ├─→ enrichWithEfficiency()
                  ├─→ sortByEfficiency()
                  ├─→ generateEfficiencyReport()
                  └─→ saveEfficiencyResults()
                      ↓
                      ├─→ data/mobs_with_efficiency.json
                      └─→ data/efficiency_report.txt
```

---

## 📊 Размеры и производительность файлов

| Файл | Размер | Тип | Время создания |
|------|--------|-----|----------------|
| parseAdena.js | 6 KB | Source | - |
| parseMobStats.js | 6 KB | Source | - |
| calculateEfficiency.js | 4 KB | Source | - |
| integrateMobData.js | 3 KB | Source | - |
| testLocalParser.js | 3 KB | Test | - |
| testNpcParser.js | 2 KB | Test | - |
| fullTest.js | 3 KB | Test | - |
| mobs_adena.json | 100-200 KB | Data | 1-2 мин |
| sample_elder_red_keltir.html | 500 KB | Data | - |
| npc_*.html (каждый) | ~500 KB | Data | - |
| mobs_with_efficiency.json | 200-400 KB | Result | 3-5 мин |
| efficiency_report.txt | 2-5 KB | Result | <1 сек |

---

## 🚀 Быстрая справка команд

```bash
# Установить зависимости
npm install

# Шаг 1: Получить список монстров
npm run parse-adena

# Шаг 2: Тестировать парсер
npm run test-local

# Шаг 3: Интегрировать и рассчитать эффективность
npm run integrate

# Полный тест системы
npm test

# Тест на сайте (может не сработать)
npm run test-npc
```

---

## ✅ Чек-лист использования

- [ ] Установил npm пакеты: `npm install`
- [ ] Запустил парсинг адены: `npm run parse-adena`
- [ ] Скачал HTML файл: `Ctrl+S → Save As HTML`
- [ ] Переименовал: `npc_<ID>.html`
- [ ] Поместил в `data/`
- [ ] Запустил интеграцию: `npm run integrate`
- [ ] Открыл результаты: `data/mobs_with_efficiency.json`
- [ ] Просмотрел отчет: `data/efficiency_report.txt`

---

## 📞 Как получить помощь?

1. Прочитайте **QUICK_START.md** для быстрого начала
2. Прочитайте **README.md** для полной информации
3. Прочитайте **ARCHITECTURE.md** для технических деталей
4. Проверьте **Часто встречающиеся проблемы** в QUICK_START.md

---

## 🎉 Готово к использованию!

Все файлы созданы и система полностью функциональна. Начните с:

```bash
npm run parse-adena
```

И следуйте инструкциям в QUICK_START.md! 🚀