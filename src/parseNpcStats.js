import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Парсит страницу монстра и извлекает его характеристики
 * @param {number|string} npcId - ID монстра или его часть из href (например "20537-elder-red-keltir")
 * @param {string} language - язык ('en', 'ru', 'uk', 'ru-en', 'uk-en') - по умолчанию 'ru'
 * @returns {Promise<Object>} объект с характеристиками монстра
 */
async function parseNpcStats(npcId, language = 'ru') {
  try {
    // Если передан номер, нужна полная информация из другого источника
    // Пока используем пример для тестирования
    const npcPath = typeof npcId === 'number' ? `${npcId}-unknown` : npcId;
    const url = `https://wiki1.mw2.wiki/${language}/npc/${npcPath}/live`;

    console.log(`Загружаю страницу монстра: ${url}`);

    let response;
    try {
      response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
    } catch (error) {
      // Если ошибка 404, пробуем английскую версию
      if (error.response?.status === 404 && language !== 'en') {
        console.log(`  ⚠️  ${language} версия не найдена, пробую английскую...`);
        const enUrl = `https://wiki1.mw2.wiki/en/npc/${npcPath}/live`;
        response = await axios.get(enUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          }
        });
      } else {
        throw error;
      }
    }

    const $ = cheerio.load(response.data);
    const stats = {
      id: npcId,
      parsedAt: new Date().toISOString(),
      stats: {}
    };

    // Парсим таблицу статистики (#result-stats)
    const $statsTable = $('#result-stats table');
    
    // Извлекаем все строки таблицы
    $statsTable.find('tr').each((rowIndex, row) => {
      const $cells = $(row).find('td');
      
      // В каждой строке может быть 2 или 4 ячейки (пара параметр-значение)
      // Формат: Label1, Value1, Label2, Value2
      for (let i = 0; i < $cells.length; i += 2) {
        const label = $($cells[i]).text().trim();
        const value = $($cells[i + 1]).text().trim();
        
        if (label && value) {
          stats.stats[label] = value;
        }
      }
    });

    // Парсим специальные атрибуты (они содержат HTML, нужно их обработать)
    const $defAttrTd = $statsTable.find('td').filter((idx, el) => 
      $(el).find('span[style*="color"]').length > 0
    );
    
    if ($defAttrTd.length > 0) {
      const attributes = {};
      $defAttrTd.find('p').each((idx, el) => {
        const text = $(el).text().trim();
        if (text) {
          const [attrName, attrValue] = text.split(',');
          if (attrName && attrValue) {
            attributes[attrName.trim()] = parseInt(attrValue.trim());
          }
        }
      });
      if (Object.keys(attributes).length > 0) {
        stats.stats['Defence Attributes'] = attributes;
      }
    }

    console.log(`✓ Характеристики загружены:`, stats.stats);
    return stats;

  } catch (error) {
    console.error(`Ошибка при парсинге монстра ${npcId}:`, error.message);
    return {
      id: npcId,
      error: error.message,
      stats: {}
    };
  }
}

/**
 * Парсит страницы для массива монстров и обогащает их данными
 * @param {Array} mobs - массив монстров с полями id и href
 * @param {number} delayMs - задержка между запросами (мс)
 * @returns {Promise<Array>} массив монстров с добавленной статистикой
 */
async function enrichMobsWithStats(mobs, delayMs = 500) {
  const enrichedMobs = [];

  for (let i = 0; i < mobs.length; i++) {
    const mob = mobs[i];
    
    // Извлекаем путь из href (например из "/npc/20537-elder-red-keltir/live")
    const hrefMatch = mob.href?.match(/\/npc\/(.+?)\/live$/);
    const npcPath = hrefMatch ? hrefMatch[1] : null;

    if (!npcPath) {
      console.warn(`⚠ Не могу получить путь для монстра: ${mob.name}`);
      enrichedMobs.push(mob);
      continue;
    }

    console.log(`\n[${i + 1}/${mobs.length}] Парсю: ${mob.name} (${npcPath})`);

    const stats = await parseNpcStats(npcPath);
    
    // Объединяем базовые данные с статистикой
    const enrichedMob = {
      ...mob,
      ...stats
    };

    enrichedMobs.push(enrichedMob);

    // Задержка между запросами
    if (i < mobs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return enrichedMobs;
}

/**
 * Извлекает численные значения из строк типа "90" или "9s"
 * @param {string} str - строка для парсинга
 * @returns {number} числовое значение или NaN
 */
function extractNumber(str) {
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1]) : NaN;
}

/**
 * Преобразует параметры из строкового формата в удобный объект
 * @param {Object} stats - объект со статистикой
 * @returns {Object} преобразованный объект с числовыми значениями
 */
function normalizeStats(stats) {
  const normalized = {};

  for (const [key, value] of Object.entries(stats)) {
    // Пропускаем объекты (например Defence Attributes)
    if (typeof value === 'object' && value !== null) {
      normalized[key] = value;
      continue;
    }

    // Преобразуем в числа где возможно
    const num = extractNumber(value);
    normalized[key] = !isNaN(num) ? num : value;
  }

  return normalized;
}

export { parseNpcStats, enrichMobsWithStats, normalizeStats, extractNumber };