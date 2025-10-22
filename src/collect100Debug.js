import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const MOBS_LIST_FILE = path.join(DATA_DIR, 'mobs_adena.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'debug_first_100.json');
const DEBUG_REPORT = path.join(DATA_DIR, 'debug_first_100_report.txt');

const REQUEST_DELAY = 300;
const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 3;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

function cleanText(text) {
  return text
    .replace(/[\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseStats(html) {
  try {
    const $ = cheerio.load(html);
    const stats = {};

    const $statsTable = $('#result-stats table');
    if ($statsTable.length === 0) {
      return null;
    }

    const $rows = $statsTable.find('tr');
    
    $rows.each((rowIndex, row) => {
      const $cells = $(row).find('td');
      
      if (rowIndex === 0) return;
      
      const firstText = $cells.eq(0).text().trim();
      if (firstText.includes('Предмет')) return;
      
      for (let i = 0; i < $cells.length; i += 2) {
        const cellLabel = cleanText($cells.eq(i).text());
        const cellValue = cleanText($cells.eq(i + 1).text());
        
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
          const digitsOnly = cellValue.replace(/\s/g, '');
          const numMatch = digitsOnly.match(/^(\d+)/);
          const numValue = numMatch ? parseInt(numMatch[1]) : cellValue;
          stats[keyMap[cellLabel]] = numValue;
        }
      }
    });

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
    return null;
  }
}

function isMonsterCharacteristic(itemName) {
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
  
  if (characteristics.some(char => itemName === char)) {
    return true;
  }
  
  if (itemName.includes('Адены') || itemName.includes('адены')) {
    return true;
  }
  
  return false;
}

function parseDrops(html) {
  try {
    const $ = cheerio.load(html);
    const drops = [];

    $('table').each((tableIndex, table) => {
      const $rows = $(table).find('tr');
      
      $rows.each((rowIndex, row) => {
        const $cells = $(row).find('td');
        if ($cells.length < 3) return;
        
        const firstText = cleanText($cells.eq(0).text());
        
        if (firstText.includes('Шанс группы')) return;
        
        if (!firstText) return;
        
        const itemName = cleanText(firstText);
        
        if (isMonsterCharacteristic(itemName)) {
          return;
        }
        
        const amount = cleanText($cells.eq(1).text());
        const chance = cleanText($cells.eq(2).text());
        
        if (itemName && amount && chance) {
          drops.push({
            name: itemName,
            amount: amount,
            chance: chance
          });
        }
      });
    });

    return drops.length > 0 ? drops : [];
  } catch (error) {
    return [];
  }
}

async function fetchMobPage(npcPath, retries = 0) {
  try {
    const url = `https://l2wiki.com/npc/${npcPath}/live`;
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    return response.data;
  } catch (error) {
    if (retries < MAX_RETRIES && error.code !== 'ENOTFOUND') {
      const delay = REQUEST_DELAY * (retries + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchMobPage(npcPath, retries + 1);
    }

    throw error;
  }
}

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

async function processMob(mob, index, total, reportLines) {
  try {
    const hrefMatch = mob.href?.match(/\/npc\/(.+?)\/live$/);
    const npcPath = hrefMatch ? hrefMatch[1] : null;

    if (!npcPath) {
      console.log(`${colors.gray}[${index}/${total}] ⚠ Пропускаю: нет пути для ${mob.name}${colors.reset}`);
      reportLines.push(`[${index}] ⚠ SKIP: Нет пути для ${mob.name}`);
      return { success: false, error: 'no_path', mob };
    }

    const html = await fetchMobPage(npcPath);
    
    const stats = parseStats(html);
    const drops = parseDrops(html);

    if (!stats) {
      console.log(`${colors.yellow}[${index}/${total}] ⚠ Нет статистики: ${mob.name}${colors.reset}`);
      reportLines.push(`[${index}] ⚠ WARN: Нет статистики для ${mob.name}`);
      return { success: false, error: 'no_stats', mob };
    }

    const normalized = normalizeStats(stats);

    console.log(`${colors.green}[${index}/${total}] ✓ ${mob.name} (Lv.${normalized.level}, HP:${normalized.hp}, Drops:${drops.length})${colors.reset}`);
    reportLines.push(`[${index}] ✓ ${mob.name}: Level=${normalized.level}, HP=${normalized.hp}, EXP=${normalized.exp}, SP=${normalized.sp}, Drops=${drops.length}`);

    return {
      success: true,
      data: {
        id: mob.id,
        name: mob.name,
        href: mob.href,
        level: normalized.level,
        stats: normalized,
        drops: drops,
        adena: {
          min: mob.minAdena,
          max: mob.maxAdena,
          avg: mob.avgAdena,
          chance: mob.chance
        },
        fetchedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    const errorMsg = error.message.substring(0, 100);
    console.log(`${colors.red}[${index}/${total}] ✗ ОШИБКА ${mob.name}: ${errorMsg}${colors.reset}`);
    reportLines.push(`[${index}] ✗ ERROR: ${mob.name}: ${errorMsg}`);
    return { success: false, error: error.message, mob };
  }
}

async function main() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}  🔍 ОТЛАДКА: СБОР ПЕРВЫХ 100 МОНСТРОВ${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (!fs.existsSync(MOBS_LIST_FILE)) {
    console.error(`${colors.red}✗ Файл не найден: ${MOBS_LIST_FILE}${colors.reset}`);
    process.exit(1);
  }

  const allMobs = JSON.parse(fs.readFileSync(MOBS_LIST_FILE, 'utf-8'));
  console.log(`${colors.blue}📊 Загружено монстров: ${allMobs.length}${colors.reset}\n`);

  // Берем только первых 100
  const mobsToProcess = allMobs.slice(0, 100);
  console.log(`${colors.blue}⏳ Обрабатываю: ${mobsToProcess.length} монстров${colors.reset}\n`);

  const results = [];
  const reportLines = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < mobsToProcess.length; i++) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    
    const result = await processMob(mobsToProcess[i], i + 1, mobsToProcess.length, reportLines);
    
    if (result.success) {
      results.push(result.data);
      successCount++;
    } else {
      errorCount++;
    }
  }

  // Сохраняем результаты
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n${colors.green}✓ Результаты сохранены: ${OUTPUT_FILE}${colors.reset}`);

  // Сохраняем отчет
  const reportContent = [
    `ОТЛАДКА: Первые 100 монстров`,
    `${'='.repeat(60)}`,
    `Успешно: ${successCount}/${mobsToProcess.length}`,
    `Ошибок: ${errorCount}/${mobsToProcess.length}`,
    ``,
    `Детали:`,
    `${'='.repeat(60)}`,
    ...reportLines
  ].join('\n');

  fs.writeFileSync(DEBUG_REPORT, reportContent, 'utf-8');
  console.log(`${colors.green}✓ Отчет сохранен: ${DEBUG_REPORT}${colors.reset}`);

  // Статистика
  console.log(`\n${colors.magenta}📊 ИТОГИ:${colors.reset}`);
  console.log(`  ${colors.green}✓ Успешно: ${successCount}${colors.reset}`);
  console.log(`  ${colors.red}✗ Ошибок: ${errorCount}${colors.reset}`);

  // Выводим примеры из результатов
  if (results.length > 0) {
    console.log(`\n${colors.blue}📋 Первые 5 монстров:${colors.reset}\n`);
    results.slice(0, 5).forEach((mob, idx) => {
      console.log(`${idx + 1}. ${mob.name} (ID: ${mob.id})`);
      console.log(`   Level: ${mob.stats.level}`);
      console.log(`   HP: ${mob.stats.hp} | MP: ${mob.stats.mp}`);
      console.log(`   P.Atk: ${mob.stats.pAtk} | M.Atk: ${mob.stats.mAtk}`);
      console.log(`   EXP: ${mob.stats.exp} | SP: ${mob.stats.sp}`);
      console.log(`   Drops: ${mob.drops.length} позиций\n`);
    });
  }
}

main().catch(console.error);