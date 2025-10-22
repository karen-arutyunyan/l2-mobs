# ⚡ БЫСТРЫЙ СТАРТ (5 МИНУТ)

## 🎯 Цель

Определить **лучшие места для фарма** в Lineage 2, анализируя эффективность по нескольким метрикам.

---

## 🚀 Установка (1 минута)

```bash
npm install
```

---

## 📋 Основной Workflow (3 шага)

### Шаг 1: Получить список монстров 
```bash
npm run parse-adena
```
✅ Создает: `data/mobs_adena.json` (40+ монстров с дропом адены)

---

### Шаг 2: Добавить HTML файлы монстров

**За каждого интересующего монстра:**

1. **Откройте ссылку** (замените `<ID>`):
   ```
   https://wiki1.mw2.wiki/en/npc/<ID>-monster-name/live
   ```

2. **Сохраните HTML** (Ctrl+S → "Сохранить как HTML файл")

3. **Переименуйте** файл в: `npc_<ID>.html`

4. **Положите в**: `data/` папку

**Примеры:**
- ID 20537 → `npc_20537.html`
- ID 20130 → `npc_20130.html`
- ID 20477 → `npc_20477.html`

---

### Шаг 3: Собрать БД и Анализировать

```bash
npm run build-db    # Собрать данные из HTML
npm run analyze     # Показать рекомендации
```

✅ Готово! Смотрите результаты в консоли

---

## 📊 Результаты

Вы получите рекомендации типа:

```
🥇 ЛУЧШЕ ВСЕГО ДЛЯ EXP:   Monster A (1.50 EXP/HP)
💰 ЛУЧШЕ ВСЕГО ДЛЯ ADENA:  Monster B (3.30 EXP/Adena)
🔥 УНИВЕРСАЛЬНЫЙ ВЫБОР:    Monster C (Score: 15.23)
```

---

## 📁 Файлы Результатов

| Файл | Описание |
|------|---------|
| `data/mobs_with_data.json` | База данных монстров (для анализа) |
| `data/efficiency_analysis.json` | Результаты анализа (JSON) |

---

## 🎮 Примеры Использования

### Использовать БД в JavaScript

```javascript
import fs from 'fs';

// Загрузить БД
const mobs = JSON.parse(fs.readFileSync('./data/mobs_with_data.json', 'utf-8'));

// Найти лучшего по опыту
const best = mobs.reduce((prev, curr) => 
  (prev.exp / prev.hp) > (curr.exp / curr.hp) ? prev : curr
);

console.log(`Лучший: ${best.name}`);
console.log(`EXP/HP: ${(best.exp / best.hp).toFixed(2)}`);
```

### Использовать Анализ в JavaScript

```javascript
import fs from 'fs';

const analysis = JSON.parse(fs.readFileSync('./data/efficiency_analysis.json', 'utf-8'));

console.log('ТОП 3 ДЛЯ ФАРМА:');
analysis.metrics.comboMetric.slice(0, 3).forEach((mob, i) => {
  console.log(`${i + 1}. ${mob.name}`);
});
```

---

## 📚 Метрики Эффективности

| Метрика | Для чего | Пример |
|---------|----------|--------|
| **EXP/HP** | Максимум опыта на HP | 1.50 = хорошо |
| **EXP/Adena** | Опыт за адену | 3.30 = хорошо |
| **SP/HP** | Умение на HP | 0.11 = обычно |
| **Adena/min** | Адена в минуту | 200/min = хорошо |
| **Combo** | Универсальная оценка | 11.33 = хорошо |

---

## 🔧 Доступные Команды

```bash
# Основной workflow
npm run parse-adena     # Получить список монстров
npm run build-db        # Собрать БД из HTML
npm run analyze         # Анализировать эффективность

# Опциональные
npm run cleanup         # Удалить HTML файлы (все данные в JSON)
npm run collect-db 50   # Загрузить 50 HTML автоматически

# Тестирование
npm test               # Тестировать парсер
```

---

## ❓ Проблемы?

| Проблема | Решение |
|----------|--------|
| `Command not found` | Запустите `npm install` |
| `File not found` | Проверьте что HTML в папке `data/` с правильным именем |
| `Parser error` | HTML может быть неправильного формата (скачайте заново) |
| `Server blocked` | Это нормально - используйте ручное сохранение HTML |

---

## 💡 Примеры для Начинающих

### Хотю максимум EXP?
```bash
npm run analyze
# Ищу: "ЛУЧШЕ ВСЕГО ДЛЯ EXP"
```

### Хочу максимум ADENA?
```bash
npm run analyze
# Ищу: "ЛУЧШЕ ВСЕГО ДЛЯ ADENA"
```

### Не знаю что выбрать?
```bash
npm run analyze
# Ищу: "УНИВЕРСАЛЬНЫЙ ВЫБОР"
```

---

## ✅ Чек-лист

- [ ] Установить npm: `npm install`
- [ ] Запустить: `npm run parse-adena`
- [ ] Добавить HTML файлы в `data/`
- [ ] Запустить: `npm run build-db`
- [ ] Запустить: `npm run analyze`
- [ ] Прочитать рекомендации
- [ ] Выбрать лучшее место для фарма

---

## 📞 Нужна помощь?

Посмотрите подробные документы:
- **WORKFLOW.md** - полный workflow с примерами
- **IMPLEMENTATION_COMPLETE.md** - что было создано
- **README.md** - подробная документация

---

## 🎉 Готово!

Вы имеете полную систему для анализа монстров и выбора мест фарма!

**Happy farming! 🚀**