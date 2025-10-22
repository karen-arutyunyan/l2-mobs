import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const MOBS_LIST_FILE = path.join(DATA_DIR, 'mobs_adena.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'mobs_full_stats.json');
const TEMP_OUTPUT_FILE = path.join(DATA_DIR, '.mobs_full_stats_temp.json');
const PROGRESS_FILE = path.join(DATA_DIR, '.collection_progress.json');

// Констант для контроля
const BATCH_SAVE_SIZE = 50; // Сохранять прогресс каждые 50 монстров
const REQUEST_DELAY = 300; // мс между запросами
const REQUEST_TIMEOUT = 15000; // мс
const MAX_RETRIES = 3;

// Цвета для console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

/**
 * Очищает текст от лишних символов (\n, \t, множественные пробелы)
 */
function cleanText(text) {
  return text
    .replace(/[\n\t]/g, ' ') // Заменяем \n и \t на пробел
    .replace(/\s+/g, ' ')     // Заменяем множественные пробелы на один
    .trim();                   // Удаляем пробелы в начале/конце
}

/**
 * Парсит характеристики монстра из HTML
 */
function parseStats(html) {
  try {
    const $ = cheerio.load(html);
    const stats = {};

    // Парсим основную таблицу статистики
    const $statsTable = $('#result-stats table');
    if ($statsTable.length === 0) {
      return null;
    }

    const $rows = $statsTable.find('tr');
    
    $rows.each((rowIndex, row) => {
      const $cells = $(row).find('td');
      
      // Пропускаем первую строку (заголовок с названием)
      if (rowIndex === 0) return;
      
      // Пропускаем последние строки с дропами
      const firstText = $cells.eq(0).text().trim();
      if (firstText.includes('Предмет')) return;
      
      // Каждая строка содержит несколько пар label-value в ячейках
      // Например: ["Уровень | 3 | Время возрождения | 9s."]
      // или ["HP | 90 | MP | 67"]
      for (let i = 0; i < $cells.length; i += 2) {
        const cellLabel = cleanText($cells.eq(i).text());
        const cellValue = cleanText($cells.eq(i + 1).text());
        
        // Ключи для корректного маппинга
        const keyMap = {
          'Уровень': 'Level',
          'HP': 'HP',
          'MP': 'MP',
          'Физ. Атк.': 'P.Atk.',
          'Маг. Атк.': 'M.Atk.',
          'Физ. Защ.': 'P.Def.',
          'Маг. Защ.': 'M.Def.',
          'Точность': 'Accuracy',
          'Уклонение': 'Evasion',
          'Опыт': 'EXP',
          'SP': 'SP',
          'Время возрождения': 'RespawnTime'
        };
        
        if (keyMap[cellLabel] && cellValue) {
          // Извлекаем все цифры, удаляя пробелы (для чисел типа "1 400")
          const digitsOnly = cellValue.replace(/\s/g, '');
          const numMatch = digitsOnly.match(/^(\d+)/);
          const numValue = numMatch ? parseInt(numMatch[1]) : cellValue;
          stats[keyMap[cellLabel]] = numValue;
        }
      }
    });

    // Парсим атрибуты защиты
    const defenseRow = $rows.filter((idx, row) => {
      return $(row).find('td').eq(0).text().includes('Атрибуты защ');
    });
    
    if (defenseRow.length > 0) {
      const $defCell = defenseRow.eq(0).find('td').eq(1);
      const attributes = {};
      
      $defCell.find('p').each((idx, el) => {
        const text = cleanText($(el).text());
        if (text && !text.includes('%')) {
          const parts = text.split(/:\s*/);
          if (parts.length >= 2) {
            const attrName = cleanText(parts[0]);
            const attrValue = parseInt(parts[1]);
            if (!isNaN(attrValue)) {
              attributes[attrName] = attrValue;
            }
          }
        }
      });
      
      if (Object.keys(attributes).length > 0) {
        stats['Defence Attributes'] = attributes;
      }
    }

    return Object.keys(stats).length > 0 ? stats : null;
  } catch (error) {
    console.error(`${colors.red}✗ Ошибка при парсинге HTML:${colors.reset}`, error.message);
    return null;
  }
}

/**
 * Парсит наличие "Harbinger of Ankou" из item-name__additional
 */
function parseHarbingerOfAnkou(html) {
  try {
    const $ = cheerio.load(html);
    const additionalSpan = $('#result-title .item-name__additional');
    if (additionalSpan.length === 0) {
      return false;
    }
    
    const additionalText = cleanText(additionalSpan.text());
    return additionalText.toLowerCase().includes('harbinger of ankou');
  } catch (error) {
    return false;
  }
}

/**
 * Парсит HP множитель из Skills раздела (например "HP Increase (3x)")
 */
function parseHPMultiplier(html) {
  try {
    const $ = cheerio.load(html);
    
    // Ищем все таблицы для поиска Skills
    const tables = $('table');
    
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const $table = $(tables[tableIndex]);
      const $rows = $table.find('tr');
      
      // Проверяем, содержит ли таблица "Skill" или "Умение" в заголовке
      const firstRowText = cleanText($rows.first().text());
      if (!firstRowText.toLowerCase().includes('skill') && !firstRowText.toLowerCase().includes('умение')) {
        continue;
      }
      
      // Ищем строку с HP Increase
      for (let rowIndex = 0; rowIndex < $rows.length; rowIndex++) {
        const text = cleanText($($rows[rowIndex]).text());
        
        // Ищем HP Increase с множителем (3x, 2x, 4x и т.д.)
        if (text.toLowerCase().includes('hp increase') || (text.toLowerCase().includes('hp') && text.match(/\(\d+x\)/))) {
          const match = text.match(/\((\d+)x\)/);
          if (match && match[1]) {
            const multiplier = parseInt(match[1]);
            if (multiplier > 1) {
              return multiplier;
            }
          }
        }
      }
    }
    
    return 1;
  } catch (error) {
    return 1;
  }
}

/**
 * Парсит Spoil предметы (если раздел существует)
 */
function parseSpoils(html) {
  try {
    const $ = cheerio.load(html);
    const spoils = [];

    // Ищем таблицу в контейнере #spoil
    const $spoilContainer = $('#spoil');
    if ($spoilContainer.length === 0) {
      return spoils; // Нет раздела спойлов
    }

    const $table = $spoilContainer.find('table');
    if ($table.length === 0) {
      return spoils;
    }

    const $rows = $table.find('tbody tr');
    
    $rows.each((rowIndex, row) => {
      const $cells = $(row).find('td');
      if ($cells.length < 3) return;
      
      const firstText = cleanText($cells.eq(0).text());
      
      // Пропускаем пустые строки
      if (!firstText || firstText === '') return;
      
      // Пропускаем характеристики
      if (isMonsterCharacteristic(firstText)) {
        return;
      }
      
      const itemName = cleanText(firstText);
      const amount = cleanText($cells.eq(1).text());
      const chance = cleanText($cells.eq(2).text());
      
      if (itemName && amount && chance && !chance.toLowerCase().includes('шанс') && !chance.toLowerCase().includes('chance')) {
        spoils.push({
          name: itemName,
          amount: amount,
          chance: chance
        });
      }
    });

    return spoils;
  } catch (error) {
    console.error(`${colors.red}✗ Ошибка при парсинге spoils:${colors.reset}`, error.message);
    return [];
  }
}

/**
 * Проверяет, является ли строка характеристикой монстра, а не дропом
 */
function isMonsterCharacteristic(itemName) {
  // Характеристики монстра
  const characteristics = [
    'Уровень',
    'HP',
    'MP',
    'Физ. Атк.',
    'Маг. Атк.',
    'Физ. Защ.',
    'Маг. Защ.',
    'Точность',
    'Уклонение',
    'Опыт',
    'SP',
    'Время возрождения',
    'Атрибут атаки',
    'Атрибуты защ'
  ];
  
  // Проверяем прямое совпадение
  if (characteristics.some(char => itemName === char)) {
    return true;
  }
  
  // Проверяем адены (все варианты)
  if (itemName.includes('Адены') || itemName.includes('адены')) {
    return true;
  }
  
  return false;
}

/**
 * Парсит дропы из HTML (без характеристик монстра)
 */
function parseDrops(html) {
  try {
    const $ = cheerio.load(html);
    const drops = [];

    // Ищем таблицу в контейнере #drop
    const $dropContainer = $('#drop');
    if ($dropContainer.length === 0) {
      return drops; // Нет раздела дропов
    }

    const $table = $dropContainer.find('table');
    if ($table.length === 0) {
      return drops;
    }

    const $rows = $table.find('tbody tr');
    
    $rows.each((rowIndex, row) => {
      const $cells = $(row).find('td');
      if ($cells.length < 3) return;
      
      const firstText = cleanText($cells.eq(0).text());
      
      // Пропускаем строки "Шанс группы"
      if (firstText.includes('Шанс группы')) return;
      
      // Пропускаем пустые строки
      if (!firstText) return;
      
      // Название предмета (очищаем)
      const itemName = cleanText(firstText);
      
      // ПРОПУСКАЕМ ХАРАКТЕРИСТИКИ МОНСТРА
      if (isMonsterCharacteristic(itemName)) {
        return;
      }
      
      // Количество
      const amount = cleanText($cells.eq(1).text());
      
      // Шанс
      const chance = cleanText($cells.eq(2).text());
      
      if (itemName && amount && chance && !chance.includes('Шанс')) {
        drops.push({
          name: itemName,
          amount: amount,
          chance: chance
        });
      }
    });

    return drops;
  } catch (error) {
    console.error(`${colors.red}✗ Ошибка при парсинге дропов:${colors.reset}`, error.message);
    return [];
  }
}

/**
 * Загружает страницу монстра с повторами при ошибках
 */
async function fetchMobPage(npcPath, retries = 0) {
  try {
    const url = `https://wiki1.mw2.wiki/npc/${npcPath}/live`;
    
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    return response.data;
  } catch (error) {
    // Retry на других ошибках сети
    if (retries < MAX_RETRIES && error.code !== 'ENOTFOUND') {
      const delay = REQUEST_DELAY * (retries + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchMobPage(npcPath, retries + 1);
    }

    throw error;
  }
}

/**
 * Загружает прогресс (если был прерван)
 */
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      console.log(`${colors.yellow}📋 Загружена точка сохранения: обработано ${progress.processed.length}/${progress.total}${colors.reset}`);
      return progress;
    } catch (error) {
      console.error(`${colors.red}✗ Ошибка при загрузке прогресса:${colors.reset}`, error.message);
    }
  }

  return {
    processed: [],
    failed: [],
    total: 0,
    startTime: Date.now(),
    lastSave: Date.now()
  };
}

/**
 * Сохраняет прогресс
 */
function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error(`${colors.red}✗ Ошибка при сохранении прогресса:${colors.reset}`, error.message);
  }
}

/**
 * Нормализует значения статистики
 */
function normalizeStats(stats) {
  const fieldMapping = {
    'Level': 'level',
    'HP': 'hp',
    'MP': 'mp',
    'P.Atk.': 'pAtk',
    'M.Atk.': 'mAtk',
    'P.Def.': 'pDef',
    'M.Def.': 'mDef',
    'Accuracy': 'accuracy',
    'Evasion': 'evasion',
    'EXP': 'exp',
    'SP': 'sp',
    'Respawn Time': 'respawnTime',
    'Attack Attribute': 'attackAttribute',
    'Defence Attribute': 'defenceAttribute',
    'Defence Attributes': 'defenceAttributes'
  };

  const normalized = {};

  for (const [key, value] of Object.entries(stats)) {
    const normalizedKey = fieldMapping[key] || key;

    // Объекты (например defenceAttributes) копируем как есть
    if (typeof value === 'object' && value !== null) {
      normalized[normalizedKey] = value;
    } else {
      normalized[normalizedKey] = value;
    }
  }

  return normalized;
}

/**
 * Обрабатывает одного монстра
 */
async function processMob(mob, index, total) {
  try {
    // Извлекаем путь из href
    const hrefMatch = mob.href?.match(/\/npc\/(.+?)\/live$/);
    const npcPath = hrefMatch ? hrefMatch[1] : null;

    if (!npcPath) {
      console.log(`${colors.gray}[${index}/${total}] ⚠ Пропускаю: нет пути для ${mob.name}${colors.reset}`);
      return { success: false, error: 'no_path', mob };
    }

    // Загружаем страницу
    const html = await fetchMobPage(npcPath);
    
    // Парсим данные
    const stats = parseStats(html);
    const drops = parseDrops(html);
    const spoils = parseSpoils(html);
    const isHarbinger = parseHarbingerOfAnkou(html);
    const hpMultiplier = parseHPMultiplier(html);
    const isTreasureChest = mob.name.toLowerCase().includes('treasure chest') || 
                            mob.name.toLowerCase().includes('сундук с сокровищами');

    if (!stats) {
      console.log(`${colors.yellow}[${index}/${total}] ⚠ Нет статистики: ${mob.name}${colors.reset}`);
      return { success: false, error: 'no_stats', mob };
    }

    const normalized = normalizeStats(stats);
    
    // Удаляем level из stats так как он уже на верхнем уровне
    const statsWithoutLevel = { ...normalized };
    delete statsWithoutLevel.level;

    console.log(`${colors.green}[${index}/${total}] ✓ ${mob.name} (Lv.${normalized.level}, HP:${normalized.hp}, EXP:${normalized.exp})${colors.reset}`);

    return {
      success: true,
      data: {
        id: mob.id,
        name: mob.name,
        href: mob.href,
        level: normalized.level,
        stats: statsWithoutLevel,
        drops: drops,
        spoils: spoils,
        adena: {
          min: mob.minAdena,
          max: mob.maxAdena,
          avg: mob.avgAdena,
          chance: mob.chance
        },
        attributes: {
          isHarbinger: isHarbinger,
          isTreasureChest: isTreasureChest,
          hpMultiplier: hpMultiplier
        },
        fetchedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.log(`${colors.red}[${index}/${total}] ✗ ОШИБКА ${mob.name}: ${error.message}${colors.reset}`);
    return { success: false, error: error.message, mob };
  }
}

/**
 * Основная функция сбора
 */
async function main() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}  🎯 СБОР ПОЛНОЙ ИНФОРМАЦИИ ПО ВСЕМ МОНСТРАМ${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // Загружаем список монстров
  if (!fs.existsSync(MOBS_LIST_FILE)) {
    console.error(`${colors.red}✗ Файл не найден: ${MOBS_LIST_FILE}${colors.reset}`);
    process.exit(1);
  }

  const allMobs = JSON.parse(fs.readFileSync(MOBS_LIST_FILE, 'utf-8'));
  console.log(`${colors.blue}📊 Загружено монстров: ${allMobs.length}${colors.reset}\n`);

  // Загружаем прогресс если был
  const progress = loadProgress();
  progress.total = allMobs.length;

  // Получаем уже обработанных монстров (из временного файла если существует, иначе из основного)
  let results = [];
  const sourceFile = fs.existsSync(TEMP_OUTPUT_FILE) ? TEMP_OUTPUT_FILE : OUTPUT_FILE;
  
  if (fs.existsSync(sourceFile)) {
    try {
      results = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
      console.log(`${colors.blue}💾 Загружено сохраненных результатов: ${results.length}${colors.reset}\n`);
    } catch (error) {
      console.warn(`${colors.yellow}⚠ Не удалось загрузить результаты, начинаю заново${colors.reset}\n`);
    }
  }

  const processedIds = new Set(progress.processed);
  const failedIds = new Set(progress.failed.map(f => f.id));

  // Фильтруем монстров - берем только тех, кто не был обработан
  const mobsToProcess = allMobs.filter((mob, idx) => 
    !processedIds.has(idx) && !failedIds.has(idx)
  );

  console.log(`${colors.blue}⏳ К обработке: ${mobsToProcess.length} / ${allMobs.length}${colors.reset}\n`);

  if (mobsToProcess.length === 0) {
    console.log(`${colors.green}✓ Все монстры уже обработаны!${colors.reset}`);
    printStats(results);
    return;
  }

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  // Обрабатываем монстров
  for (let i = 0; i < mobsToProcess.length; i++) {
    const mob = mobsToProcess[i];
    const currentIndex = allMobs.indexOf(mob) + 1;
    const totalCount = allMobs.length;

    const result = await processMob(mob, currentIndex, totalCount);

    if (result.success) {
      results.push(result.data);
      successCount++;
    } else {
      failCount++;
      progress.failed.push({
        id: allMobs.indexOf(mob),
        name: mob.name,
        error: result.error
      });
    }

    progress.processed.push(allMobs.indexOf(mob));

    // Сохраняем каждые BATCH_SAVE_SIZE монстров (во временный файл)
    if ((i + 1) % BATCH_SAVE_SIZE === 0) {
      fs.writeFileSync(TEMP_OUTPUT_FILE, JSON.stringify(results, null, 2));
      saveProgress(progress);
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const average = ((Date.now() - startTime) / (i + 1) * 1000).toFixed(0);
      const remaining = Math.round((mobsToProcess.length - i - 1) * average / 1000);
      
      console.log(`${colors.magenta}💾 Сохранено: ${successCount}✓ ${failCount}✗ | Время: ${elapsed}s | Осталось ~${remaining}s${colors.reset}\n`);
    }

    // Задержка между запросами
    if (i < mobsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  // Финальное сохранение во временный файл
  fs.writeFileSync(TEMP_OUTPUT_FILE, JSON.stringify(results, null, 2));
  saveProgress(progress);

  // Атомарно заменяем основной файл (бесшовное обновление для мониторинга)
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
    }
    fs.renameSync(TEMP_OUTPUT_FILE, OUTPUT_FILE);
    console.log(`${colors.green}✓ Основной файл успешно обновлен${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Ошибка при обновлении основного файла:${colors.reset}`, error.message);
  }

  // Удаляем файл прогресса (всё завершено)
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }

  // Статистика
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✓ СБОР ЗАВЕРШЕН${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`${colors.green}✓ Успешно: ${successCount}${colors.reset}`);
  console.log(`${colors.red}✗ Ошибок: ${failCount}${colors.reset}`);
  console.log(`${colors.blue}⏱ Время: ${totalTime}s${colors.reset}`);
  console.log(`${colors.blue}📁 Результаты: ${OUTPUT_FILE}${colors.reset}\n`);

  printStats(results);
}

/**
 * Выводит статистику
 */
function printStats(results) {
  if (results.length === 0) return;

  console.log(`${colors.blue}📊 СТАТИСТИКА:${colors.reset}`);
  
  const levels = results.filter(r => r.stats?.level).map(r => r.stats.level);
  const exps = results.filter(r => r.stats?.exp).map(r => r.stats.exp);
  const withDrops = results.filter(r => r.drops?.length > 0).length;
  const withSpoils = results.filter(r => r.spoils?.length > 0).length;
  const harbigers = results.filter(r => r.attributes?.isHarbinger).length;
  const treasureChests = results.filter(r => r.attributes?.isTreasureChest).length;
  const withHPMultiplier = results.filter(r => r.attributes?.hpMultiplier > 1).length;
  const maxHPMultiplier = Math.max(...results.map(r => r.attributes?.hpMultiplier || 1));

  console.log(`  • Уровни: ${Math.min(...levels)} - ${Math.max(...levels)}`);
  console.log(`  • Средний опыт: ${(exps.reduce((a,b) => a+b, 0) / exps.length).toFixed(0)}`);
  console.log(`  • Монстров с дропами: ${withDrops}/${results.length}`);
  console.log(`  • Монстров с спойлом: ${withSpoils}/${results.length}`);
  console.log(`  • Harbinger of Ankou: ${harbigers}`);
  console.log(`  • Treasure Chest: ${treasureChests}`);
  console.log(`  • Монстров с HP Multiplier: ${withHPMultiplier} (максимум: ${maxHPMultiplier}x)`);
}

main().catch(error => {
  console.error(`${colors.red}✗ Критическая ошибка:${colors.reset}`, error);
  process.exit(1);
});