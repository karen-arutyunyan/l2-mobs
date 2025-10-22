# 🚀 ПОЛНЫЙ WORKFLOW: От HTML до Анализа Эффективности

## 📋 Обзор

Эта система позволяет собрать полную базу данных монстров в Lineage 2 и определить **лучшие места для фарма** на основе анализа эффективности.

**Основное преимущество:** Вы получаете **только нужные данные** (JSON), без лишних HTML файлов на диске.

---

## 🔄 Этапы Workflow

### Этап 1: Подготовка данных по адене
```bash
npm run parse-adena
```

**Что происходит:**
- Загружаются все страницы с дропом адены с вики
- Создается список всех 2000+ монстров, дропящих адену
- Результат: `data/mobs_adena.json`

**Файл содержит:**
```json
[
  {
    "id": 20537,
    "name": "Elder Red Keltir",
    "level": "Ур. 3",
    "minAdena": 22,
    "maxAdena": 38,
    "chance": 70,
    "avgAdena": 30
  },
  ...
]
```

---

### Этап 2: Собрать HTML данные монстров

#### Вариант A: Вручную (РЕКОМЕНДУЕТСЯ)

**Для каждого интересующего вас монстра:**

1. **Откройте браузер** и перейдите на страницу монстра:
   ```
   https://wiki1.mw2.wiki/en/npc/<ID>-<NAME>/live
   ```
   Пример: https://wiki1.mw2.wiki/en/npc/20537-elder-red-keltir/live

2. **Сохраните HTML страницу** (Ctrl+S):
   - Выберите: "Сохранить как HTML файл" (полная страница)
   - Выберите папку: `data/`

3. **Переименуйте файл** по образцу:
   ```
   npc_<ID>.html
   ```
   Пример: `npc_20537.html`

4. **Повторите для всех интересующих монстров**

**💡 Совет:** Вы можете открыть несколько вкладок и сохранять их все подряд в одну папку.

---

#### Вариант B: Автоматически (если сервер не блокирует)

```bash
npm run collect-db 10     # Первые 10 монстров
npm run collect-db-sample # Первые 50 монстров
npm run collect-db-full   # ВСЕ монстры (может долго)
```

**⚠️ Важно:** Сервер может блокировать автоматические запросы. Если не работает — используйте вариант A (ручной).

---

### Этап 3: Собрать базу данных
```bash
npm run build-db
```

**Что происходит:**
- Ищет все файлы `npc_*.html` в папке `data/`
- Парсит каждый файл
- Извлекает характеристики монстра
- Объединяет с данными адены
- **Сохраняет только JSON** (HTML файлы больше не нужны)

**Результаты:**
- `data/mobs_full_database.json` - все 2000+ монстров
- `data/mobs_with_data.json` - только с полной статистикой
- `data/database_report.txt` - краткий отчет

**Пример результата:**
```json
{
  "id": 20537,
  "name": "Elder Red Keltir",
  "hp": 90,
  "exp": 99,
  "sp": 10,
  "avgAdena": 30,
  "pAtk": 10,
  "mAtk": 4,
  "pDef": 44,
  "mDef": 33,
  "accuracy": 36,
  "evasion": 36,
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

### Этап 4: Анализ эффективности фарма
```bash
npm run analyze
```

**Что происходит:**
- Рассчитывает **4 различные метрики** эффективности:

1. **EXP/HP** - опыт на единицу здоровья
2. **EXP/Adena** - опыт на адену (для богатых)
3. **SP/HP** - умение на здоровье
4. **Adena/Respawn** - адена в минуту

- Выводит ТОП 10 для каждой метрики
- Рассчитывает **комбо-метрику** (универсальная оценка)
- Дает рекомендации

**Пример вывода:**
```
🎯 МЕТРИКА 1: EXP/HP (Опыт на единицу здоровья)

   1. Lv 3 Monster Name                   EXP:   99 HP:  90 Ratio:1.100
   2. Lv 5 Another Monster                EXP:  150 HP: 100 Ratio:1.500
   ...

💰 МЕТРИКА 2: EXP/Adena (Опыт на адену)

   1. Lv 3 Monster Name                   EXP:   99 Adena:  30 Ratio:3.300
   ...

🎯 РЕКОМЕНДАЦИИ:

  🥇 ЛУЧШЕ ВСЕГО ДЛЯ EXP:   Monster Name (1.100 EXP/HP)
  💰 ЛУЧШЕ ВСЕГО ДЛЯ ADENA:  Another Monster (3.300 EXP/Adena)
  🔥 УНИВЕРСАЛЬНЫЙ ВЫБОР:    Best Monster (Score: 11.33)
```

**Результат:** `data/efficiency_analysis.json`

---

## 📊 Полный Workflow в одну команду

Создайте батник `collect_all.bat`:

```batch
@echo off
echo [1] Parse Adena Data...
call npm run parse-adena

echo.
echo [2] Add HTML files to data/ folder and press Enter...
pause

echo.
echo [3] Build Database...
call npm run build-db

echo.
echo [4] Analyze Efficiency...
call npm run analyze

echo.
echo Done! Check data/ folder for results
pause
```

Или в PowerShell (`collect_all.ps1`):

```powershell
Write-Host "=== L2 MOBS ANALYSIS WORKFLOW ===" -ForegroundColor Cyan

Write-Host "`n[1] Parsing Adena Data..." -ForegroundColor Yellow
npm run parse-adena

Write-Host "`n[2] Waiting for HTML files..." -ForegroundColor Yellow
Write-Host "- Download HTML pages from wiki"
Write-Host "- Save as: npc_<ID>.html in data/ folder"
Read-Host "Press Enter when ready"

Write-Host "`n[3] Building Database..." -ForegroundColor Yellow
npm run build-db

Write-Host "`n[4] Analyzing Efficiency..." -ForegroundColor Yellow
npm run analyze

Write-Host "`nDone! Check data/ folder" -ForegroundColor Green
```

---

## 📁 Структура файлов

```
data/
├── mobs_adena.json              ← Все монстры с дропом адены
├── mobs_full_database.json      ← Все монстры (часть с полной статистикой)
├── mobs_with_data.json          ← Только с полной статистикой (для анализа)
├── efficiency_analysis.json     ← Результаты анализа эффективности
├── database_report.txt          ← Текстовый отчет БД
├── npc_20537.html               ← Исходные HTML (можно удалить после)
├── npc_20130.html
└── ...
```

**После завершения** вы можете удалить HTML файлы — все данные сохранены в JSON.

---

## 🎯 Использование результатов

### Чтение `mobs_with_data.json`

```javascript
import fs from 'fs';

const mobs = JSON.parse(fs.readFileSync('./data/mobs_with_data.json', 'utf-8'));

// Найти монстра с наибольшим HP
const strongest = mobs.reduce((prev, current) => 
  (prev.hp > current.hp) ? prev : current
);

console.log(`Самый сильный: ${strongest.name} (HP: ${strongest.hp})`);

// Найти монстра с наилучшим EXP/HP
const bestExp = mobs.reduce((prev, current) => 
  ((prev.exp / prev.hp) > (current.exp / current.hp)) ? prev : current
);

console.log(`Лучший для EXP: ${bestExp.name} (${(bestExp.exp / bestExp.hp).toFixed(2)} EXP/HP)`);
```

### Чтение `efficiency_analysis.json`

```javascript
import fs from 'fs';

const analysis = JSON.parse(fs.readFileSync('./data/efficiency_analysis.json', 'utf-8'));

// Получить рекомендации
console.log(`Лучший универсальный фарм: ${analysis.recommendations.bestCombo}`);

// Получить ТОП 5 по опыту
console.log('ТОП 5 для опыта:');
analysis.metrics.expPerHp.slice(0, 5).forEach((mob, i) => {
  console.log(`${i+1}. ${mob.name}: ${mob.metric.toFixed(3)} EXP/HP`);
});
```

---

## ❓ FAQ

### Q: Где найти ID монстра?

**A:** 
- На странице вики: смотрите URL
  - URL: `https://wiki1.mw2.wiki/en/npc/20537-elder-red-keltir/live`
  - ID: **20537**
- Или посмотрите в `mobs_adena.json`

### Q: Как скачать сразу много HTML файлов?

**A:** 
1. Откройте консоль браузера (F12)
2. Перейдите на каждую страницу и нажмите Ctrl+S
3. Или используйте инструмент вроде wget/curl если знаете их

### Q: Могу ли я добавлять HTML файлы позже?

**A:** Да! Просто:
1. Добавьте новые `npc_*.html` файлы в папку `data/`
2. Запустите `npm run build-db` заново
3. Запустите `npm run analyze` для обновленного анализа

### Q: Что означает "Respawn Time"?

**A:** Время появления монстра после убийства (в секундах). 
- 9s = монстр появляется каждые 9 секунд
- Используется для расчета адены в минуту

### Q: Какая метрика лучше всего?

**A:** Зависит от вашей цели:
- **Хотите опыт?** → EXP/HP
- **Хотите адену?** → EXP/Adena или Adena/Respawn
- **Неуверены?** → Используйте Combo метрику (универсальная)

### Q: Почему я вижу разные названия монстров?

**A:** В нашей БД используются разные источники:
- `mobs_adena.json` - названия от вики на английском
- `npc_*.html` - может быть другой язык

Это нормально. ID монстра - это уникальный идентификатор.

---

## 🔧 Troubleshooting

| Проблема | Решение |
|----------|--------|
| `mobs_adena.json не найден` | Запустите `npm run parse-adena` |
| `HTML файлы не найдены` | Добавьте `npc_*.html` в папку `data/` |
| `Парсер не находит таблицу` | HTML может быть другой версии. Проверьте URL на вики |
| `Сервер блокирует загрузку` | Используйте ручное сохранение HTML (Ctrl+S) |
| `npm команда не найдена` | Установите зависимости: `npm install` |

---

## 📚 Команды справка

```bash
# Основной workflow
npm run parse-adena    # Получить список всех монстров
npm run build-db       # Собрать БД из HTML
npm run analyze        # Анализировать эффективность

# Дополнительные команды
npm run collect-db 50      # Загрузить 50 HTML (если работает)
npm run collect-db-full    # Загрузить ВСЕ HTML (может долго)
npm test                   # Протестировать парсер
```

---

## ✅ Готово!

Вы имеете полную систему для сбора и анализа данных монстров. 🎉

**Начните с:**
```bash
npm run parse-adena
# Затем добавьте HTML файлы
npm run build-db
npm run analyze
```

Happy farming! 🚀