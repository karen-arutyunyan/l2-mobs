import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Парсит HTML содержимое (строка или файл) и извлекает статистику монстра
 * @param {string} htmlContent - HTML содержимое или путь к файлу
 * @param {boolean} isFilePath - если true, htmlContent является путем к файлу
 * @returns {Object} объект с характеристиками монстра
 */
function parseMobStats(htmlContent, isFilePath = false) {
  try {
    let html;
    
    if (isFilePath) {
      if (!fs.existsSync(htmlContent)) {
        throw new Error(`Файл не найден: ${htmlContent}`);
      }
      html = fs.readFileSync(htmlContent, 'utf-8');
      console.log(`✓ Загружен файл: ${htmlContent}`);
    } else {
      html = htmlContent;
    }

    const $ = cheerio.load(html);
    const stats = {};

    // Парсим таблицу статистики (#result-stats)
    const $statsTable = $('#result-stats table');
    
    if ($statsTable.length === 0) {
      throw new Error('Таблица #result-stats не найдена в HTML');
    }

    // Извлекаем все строки таблицы
    $statsTable.find('tr').each((rowIndex, row) => {
      const $cells = $(row).find('td');
      
      // В каждой строке может быть 2 или 4 ячейки (пара параметр-значение)
      // Формат: Label1, Value1, Label2, Value2
      for (let i = 0; i < $cells.length; i += 2) {
        const label = $($cells[i]).text().trim();
        const value = $($cells[i + 1]).text().trim();
        
        if (label && value) {
          // Избегаем перезаписи значений
          if (!stats[label]) {
            stats[label] = value;
          }
        }
      }
    });

    // Парсим специальные атрибуты защиты (они содержат HTML span'ы)
    const $allCells = $statsTable.find('td');
    let defAttributeCell = null;
    
    for (let i = 0; i < $allCells.length; i++) {
      if ($($allCells[i]).find('span[style*="color"]').length > 0) {
        defAttributeCell = $($allCells[i]);
        break;
      }
    }
    
    if (defAttributeCell) {
      const attributes = {};
      defAttributeCell.find('p').each((idx, el) => {
        const text = $(el).text().trim();
        if (text) {
          const parts = text.split(',').map(p => p.trim());
          if (parts.length >= 2) {
            const attrName = parts[0];
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

    return stats;

  } catch (error) {
    console.error(`✗ Ошибка при парсинге HTML:`, error.message);
    return null;
  }
}

/**
 * Парсит дропы из HTML
 * @param {string} htmlContent - HTML содержимое или путь к файлу
 * @param {boolean} isFilePath - если true, htmlContent является путем к файлу
 * @returns {Array} массив с информацией о дропах
 */
function parseMobDrops(htmlContent, isFilePath = false) {
  try {
    let html;
    
    if (isFilePath) {
      if (!fs.existsSync(htmlContent)) {
        throw new Error(`Файл не найден: ${htmlContent}`);
      }
      html = fs.readFileSync(htmlContent, 'utf-8');
    } else {
      html = htmlContent;
    }

    const $ = cheerio.load(html);
    const drops = [];

    // Парсим таблицу дропов
    const $dropTable = $('#pjax_npc_drop table');
    
    if ($dropTable.length === 0) {
      return drops; // Может быть нет таблицы дропов
    }

    $dropTable.find('tbody tr').each((rowIndex, row) => {
      const $row = $(row);
      
      // Пропускаем строки с информацией о шансе группы
      if ($row.find('td[colspan]').length > 0) {
        return; // continue
      }

      const $cells = $row.find('td');
      if ($cells.length < 3) return;

      // Извлекаем название предмета
      const $itemLink = $row.find('a.item-name');
      const itemName = $itemLink.find('.item-name__content').text().trim();
      const itemHref = $itemLink.attr('href') || '';

      // Количество
      const amount = $($cells[1]).text().trim();

      // Шанс
      const chance = $($cells[2]).text().trim();

      if (itemName && amount && chance) {
        drops.push({
          name: itemName,
          href: itemHref,
          amount: amount,
          chance: chance
        });
      }
    });

    return drops;

  } catch (error) {
    console.error(`✗ Ошибка при парсинге дропов:`, error.message);
    return [];
  }
}

/**
 * Преобразует названия полей в camelCase и строковые значения в числа
 * @param {Object} stats - объект со статистикой
 * @returns {Object} преобразованный объект с нормализованными ключами и значениями
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
    // Преобразуем ключ в camelCase или используем оригинальный если нет маппинга
    const normalizedKey = fieldMapping[key] || key;

    // Пропускаем объекты (например defenceAttributes)
    if (typeof value === 'object' && value !== null) {
      normalized[normalizedKey] = value;
      continue;
    }

    // Преобразуем в числа где возможно
    const match = value.match(/(\d+)/);
    const num = match ? parseInt(match[1]) : NaN;
    normalized[normalizedKey] = !isNaN(num) ? num : value;
  }

  return normalized;
}

/**
 * Обогащает массив монстров их характеристиками из HTML файлов
 * @param {Array} mobs - массив монстров с полем htmlFile
 * @param {string} baseDir - базовая директория для поиска файлов
 * @returns {Array} обогащенный массив монстров
 */
function enrichMobsFromHtmlFiles(mobs, baseDir = './data') {
  const enrichedMobs = [];

  for (const mob of mobs) {
    if (!mob.htmlFile) {
      enrichedMobs.push(mob);
      continue;
    }

    const filePath = path.join(baseDir, mob.htmlFile);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  HTML файл не найден: ${filePath}`);
      enrichedMobs.push(mob);
      continue;
    }

    const stats = parseMobStats(filePath, true);
    const normalized = normalizeStats(stats || {});

    const enrichedMob = {
      ...mob,
      stats: normalized,
      hp: normalized['HP'],
      level: normalized['Level'],
      exp: normalized['EXP'],
      sp: normalized['SP'],
      defenceAttributes: normalized['Defence Attributes']
    };

    enrichedMobs.push(enrichedMob);
  }

  return enrichedMobs;
}

export { parseMobStats, parseMobDrops, normalizeStats, enrichMobsFromHtmlFiles };