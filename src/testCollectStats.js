import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const MOBS_LIST_FILE = path.join(DATA_DIR, 'mobs_adena.json');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
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
 * Парсит статистику из HTML
 */
function parseStats(html) {
  const $ = cheerio.load(html);
  const stats = {};

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
 * Парсит дропы (без характеристик монстра)
 */
function parseDrops(html) {
  const $ = cheerio.load(html);
  const drops = [];

  // Ищем все таблицы с дропами (их может быть несколько)
  $('table').each((tableIndex, table) => {
    const $rows = $(table).find('tr');
    
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
  });

  return drops;
}

/**
 * Загружает страницу с повторами
 */
async function fetchMobPage(npcPath, retries = 0) {
  try {
    const url = `https://wiki1.mw2.wiki/npc/${npcPath}/live`;
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    return response.data;
  } catch (error) {
    if (retries < 2 && error.code !== 'ENOTFOUND') {
      await new Promise(resolve => setTimeout(resolve, 300 * (retries + 1)));
      return fetchMobPage(npcPath, retries + 1);
    }

    throw error;
  }
}

/**
 * Тестирует сбор на небольшом наборе
 */
async function testCollection() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}  🧪 ТЕСТ СБОРА СТАТИСТИКИ (20 монстров)${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (!fs.existsSync(MOBS_LIST_FILE)) {
    console.error(`${colors.red}✗ Файл не найден: ${MOBS_LIST_FILE}${colors.reset}`);
    process.exit(1);
  }

  const allMobs = JSON.parse(fs.readFileSync(MOBS_LIST_FILE, 'utf-8'));
  
  // Берем разнообразный набор (начало, середина, конец)
  const testIndices = [
    0, 10, 20, 50, 100, 200, 300, 500, 1000, 1500, 
    2000, 2200, 2400, 2500, 2604
  ].filter(i => i < allMobs.length);
  
  console.log(`${colors.blue}📊 Тестируем ${testIndices.length} монстров из ${allMobs.length}${colors.reset}\n`);

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < testIndices.length; i++) {
    const mobIndex = testIndices[i];
    const mob = allMobs[mobIndex];

    try {
      // Извлекаем путь
      const hrefMatch = mob.href?.match(/\/npc\/(.+?)\/live$/);
      const npcPath = hrefMatch ? hrefMatch[1] : null;

      if (!npcPath) {
        console.log(`${colors.yellow}[${i + 1}/${testIndices.length}] ⚠ Пропуск: ${mob.name}${colors.reset}`);
        continue;
      }

      console.log(`${colors.blue}[${i + 1}/${testIndices.length}] Загружаю ${mob.name}...${colors.reset}`);

      // Загружаем страницу
      const html = await fetchMobPage(npcPath);
      
      // Парсим данные
      const stats = parseStats(html);
      const drops = parseDrops(html);

      if (!stats) {
        console.log(`${colors.yellow}  ⚠ Нет статистики${colors.reset}`);
        failCount++;
      } else {
        console.log(`${colors.green}  ✓ Lv.${stats.Level} | HP:${stats.HP} | EXP:${stats.EXP} | Дропов:${drops.length}${colors.reset}`);
        
        results.push({
          id: mob.id,
          name: mob.name,
          level: stats.Level,
          hp: stats.HP,
          mp: stats.MP,
          pAtk: stats['P.Atk.'],
          mAtk: stats['M.Atk.'],
          pDef: stats['P.Def.'],
          mDef: stats['M.Def.'],
          exp: stats.EXP,
          sp: stats.SP,
          dropsCount: drops.length,
          defenceAttributes: stats['Defence Attributes']
        });
        
        successCount++;
      }

    } catch (error) {
      console.log(`${colors.red}  ✗ ОШИБКА: ${error.message}${colors.reset}`);
      failCount++;
    }

    // Задержка
    if (i < testIndices.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Результаты
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✓ Успешно: ${successCount}${colors.reset}`);
  console.log(`${colors.red}✗ Ошибок: ${failCount}${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (results.length > 0) {
    console.log(`${colors.magenta}📋 ПРИМЕРЫ СОБРАННЫХ ДАННЫХ:${colors.reset}\n`);
    
    results.slice(0, 5).forEach(mob => {
      console.log(`${colors.blue}${mob.name} (ID: ${mob.id})${colors.reset}`);
      console.log(`  Level: ${mob.level}`);
      console.log(`  Stats: HP=${mob.hp} | MP=${mob.mp} | P.Atk=${mob.pAtk} | M.Atk=${mob.mAtk}`);
      console.log(`  EXP: ${mob.exp} | SP: ${mob.sp}`);
      console.log(`  Дропы: ${mob.dropsCount} позиций`);
      
      if (mob.defenceAttributes && Object.keys(mob.defenceAttributes).length > 0) {
        console.log(`  Защита от:`);
        Object.entries(mob.defenceAttributes).forEach(([attr, val]) => {
          console.log(`    • ${attr}: ${val}`);
        });
      }
      
      console.log('');
    });

    // Статистика по собранным данным
    console.log(`${colors.magenta}📊 СТАТИСТИКА:${colors.reset}\n`);
    const levels = results.map(r => r.level);
    const exps = results.map(r => r.exp);
    
    console.log(`  Уровни: ${Math.min(...levels)} - ${Math.max(...levels)}`);
    console.log(`  Средний EXP: ${(exps.reduce((a,b) => a+b, 0) / exps.length).toFixed(0)}`);
    console.log(`  Монстров с дропами: ${results.filter(r => r.dropsCount > 0).length}/${results.length}`);
  }

  console.log(`\n${colors.green}✓ Тест завершен! Система готова к полному сбору.${colors.reset}`);
  console.log(`${colors.blue}Команда: npm run collect-stats${colors.reset}\n`);
}

testCollection().catch(error => {
  console.error(`${colors.red}✗ Критическая ошибка:${colors.reset}`, error);
  process.exit(1);
});