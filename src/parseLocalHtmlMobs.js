import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const MOBS_LIST_FILE = path.join(DATA_DIR, 'mobs_adena.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'mobs_full_stats.json');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

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

  $statsTable.find('tr').each((rowIndex, row) => {
    const $cells = $(row).find('td');
    
    for (let i = 0; i < $cells.length; i += 2) {
      const label = $($cells[i]).text().trim();
      const value = $($cells[i + 1]).text().trim();
      
      if (label && value && !stats[label]) {
        const numMatch = value.match(/(\d+)/);
        const numValue = numMatch ? parseInt(numMatch[1]) : value;
        stats[label] = numValue;
      }
    }
  });

  // Атрибуты защиты
  const $defAttrCell = $statsTable.find('td').filter((idx, el) => 
    $(el).find('span[style*="color"]').length > 0
  );
  
  if ($defAttrCell.length > 0) {
    const attributes = {};
    $defAttrCell.find('p').each((idx, el) => {
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

  return Object.keys(stats).length > 0 ? stats : null;
}

/**
 * Парсит дропы
 */
function parseDrops(html) {
  const $ = cheerio.load(html);
  const drops = [];

  const $dropTable = $('#pjax_npc_drop table, [data-pjax="npc_drop"] table');
  
  if ($dropTable.length === 0) {
    return drops;
  }

  $dropTable.find('tbody tr').each((rowIndex, row) => {
    const $row = $(row);
    
    if ($row.find('td[colspan]').length > 0) {
      return;
    }

    const $cells = $row.find('td');
    if ($cells.length < 3) return;

    const $itemLink = $row.find('a.item-name, a[href*="item"]');
    const itemName = $itemLink.text().trim() || $($cells[0]).text().trim();
    const amount = $($cells[1]).text().trim();
    const chance = $($cells[2]).text().trim();

    if (itemName && amount && chance) {
      drops.push({
        name: itemName,
        amount: amount,
        chance: chance
      });
    }
  });

  return drops;
}

/**
 * Нормализует статистику
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

    if (typeof value === 'object' && value !== null) {
      normalized[normalizedKey] = value;
    } else {
      normalized[normalizedKey] = value;
    }
  }

  return normalized;
}

/**
 * Основная функция
 */
function main() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}  📁 ПАРСИНГ ЛОКАЛЬНЫХ HTML ФАЙЛОВ${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  // Загружаем список монстров
  if (!fs.existsSync(MOBS_LIST_FILE)) {
    console.error(`${colors.red}✗ Файл не найден: ${MOBS_LIST_FILE}${colors.reset}`);
    process.exit(1);
  }

  const allMobs = JSON.parse(fs.readFileSync(MOBS_LIST_FILE, 'utf-8'));
  
  // Получаем все HTML файлы в data папке
  const htmlFiles = fs.readdirSync(DATA_DIR)
    .filter(file => file.match(/^npc_\d+\.html$/))
    .sort();

  console.log(`${colors.blue}📂 Найдено HTML файлов: ${htmlFiles.length}${colors.reset}`);
  console.log(`${colors.blue}📊 Всего монстров в БД: ${allMobs.length}${colors.reset}\n`);

  if (htmlFiles.length === 0) {
    console.log(`${colors.yellow}⚠ Нет HTML файлов для парсинга${colors.reset}`);
    console.log(`${colors.blue}Инструкции:${colors.reset}`);
    console.log(`  1. Откройте https://wiki1.mw2.wiki/en/npc/`);
    console.log(`  2. Откройте страницу монстра`);
    console.log(`  3. Сохраните как HTML (Ctrl+S)`);
    console.log(`  4. Переименуйте в: npc_<ID>.html`);
    console.log(`  5. Поместите в: ${DATA_DIR}\\`);
    console.log(`  6. Запустите скрипт снова\n`);
    process.exit(0);
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  // Обрабатываем каждый HTML файл
  htmlFiles.forEach((file, index) => {
    try {
      // Извлекаем ID из имени файла
      const match = file.match(/npc_(\d+)\.html/);
      if (!match) {
        console.log(`${colors.yellow}[${index + 1}/${htmlFiles.length}] ⚠ Неправильное имя файла: ${file}${colors.reset}`);
        return;
      }

      const npcId = parseInt(match[1]);

      // Читаем HTML
      const htmlPath = path.join(DATA_DIR, file);
      const html = fs.readFileSync(htmlPath, 'utf-8');

      // Парсим статистику и дропы
      const stats = parseStats(html);
      const drops = parseDrops(html);

      if (!stats) {
        console.log(`${colors.yellow}[${index + 1}/${htmlFiles.length}] ⚠ Не удалось распарсить: ${file}${colors.reset}`);
        failCount++;
        return;
      }

      // Ищем соответствующего монстра в БД
      const mobFromDb = allMobs.find(m => m.id === npcId);
      if (!mobFromDb) {
        console.log(`${colors.yellow}[${index + 1}/${htmlFiles.length}] ⚠ Монстр ${npcId} не найден в БД${colors.reset}`);
        failCount++;
        return;
      }

      const normalized = normalizeStats(stats);

      console.log(`${colors.green}[${index + 1}/${htmlFiles.length}] ✓ ${mobFromDb.name} (Lv.${normalized.level}, HP:${normalized.hp}, EXP:${normalized.exp})${colors.reset}`);

      results.push({
        id: npcId,
        name: mobFromDb.name,
        href: mobFromDb.href,
        level: normalized.level,
        stats: normalized,
        drops: drops,
        adena: {
          min: mobFromDb.minAdena,
          max: mobFromDb.maxAdena,
          avg: mobFromDb.avgAdena,
          chance: mobFromDb.chance
        },
        fetchedAt: new Date().toISOString()
      });

      successCount++;

    } catch (error) {
      console.log(`${colors.red}[${index + 1}/${htmlFiles.length}] ✗ ОШИБКА в ${file}: ${error.message}${colors.reset}`);
      failCount++;
    }
  });

  // Сохраняем результаты
  if (results.length > 0) {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`\n${colors.green}✓ Сохранено: ${OUTPUT_FILE}${colors.reset}`);
  }

  // Статистика
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✓ Успешно: ${successCount}${colors.reset}`);
  console.log(`${colors.red}✗ Ошибок: ${failCount}${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (results.length > 0) {
    const levels = results.map(r => r.stats.level);
    const exps = results.map(r => r.stats.exp);

    console.log(`${colors.magenta}📊 СТАТИСТИКА:${colors.reset}`);
    console.log(`  • Уровни: ${Math.min(...levels)} - ${Math.max(...levels)}`);
    console.log(`  • Средний EXP: ${(exps.reduce((a,b) => a+b, 0) / exps.length).toFixed(0)}`);
    console.log(`  • Монстров с дропами: ${results.filter(r => r.drops.length > 0).length}/${results.length}\n`);

    console.log(`${colors.blue}Примеры собранных монстров:${colors.reset}`);
    results.slice(0, 3).forEach(mob => {
      console.log(`  • ${mob.name} (ID:${mob.id}, Lv.${mob.level})`);
    });
  }

  console.log(`\n${colors.blue}💡 Совет: Скачивайте все больше HTML файлов и запускайте этот скрипт снова!${colors.reset}\n`);
}

main();