import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { parseMobStats, normalizeStats } from './parseMobStats.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

/**
 * Загружает HTML страницу монстра с вики
 * @param {number} mobId - ID монстра
 * @param {string} language - язык ('en', 'ru', и т.д.)
 * @returns {Promise<string>} HTML содержимое
 */
async function fetchMobHtml(mobId, language = 'en') {
  const baseUrl = `https://wiki1.mw2.wiki/${language}/npc`;
  
  try {
    // Пытаемся несколько раз с разными языками
    const urls = [
      `${baseUrl}/${mobId}`,
      `${baseUrl}/${mobId}/live`,
      `https://wiki1.mw2.wiki/en/npc/${mobId}/live`,
      `https://wiki1.mw2.wiki/en/npc/${mobId}`
    ];

    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.status === 200 && response.data) {
          console.log(`  ✓ Загружено: ${url}`);
          return response.data;
        }
      } catch (err) {
        // Продолжаем к следующему URL
        continue;
      }
    }
    
    throw new Error('Все URL недоступны');
  } catch (error) {
    console.log(`  ✗ Не удалось загрузить (${error.message})`);
    return null;
  }
}

/**
 * Парсит и нормализует статистику монстра
 * @param {string} htmlContent - HTML содержимое
 * @returns {Object} нормализованные статистики
 */
function parseMobStatsFromHtml(htmlContent) {
  try {
    const stats = parseMobStats(htmlContent, false);
    if (!stats) return null;
    
    const normalized = normalizeStats(stats);
    return normalized;
  } catch (error) {
    console.log(`  ✗ Ошибка парсинга: ${error.message}`);
    return null;
  }
}

/**
 * Собирает данные по одному монстру
 * @param {Object} mob - объект монстра из mobs_adena.json
 * @returns {Promise<Object>} обогащенный объект монстра
 */
async function collectMobData(mob, retries = 2) {
  console.log(`\n📥 Получаю данные для: ${mob.name} (ID: ${mob.id})`);
  
  // Задержка перед запросом (быть вежливым к серверу)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  let html = null;
  let attempt = 0;
  
  while (attempt < retries && !html) {
    try {
      console.log(`  Попытка ${attempt + 1}/${retries}...`);
      html = await fetchMobHtml(mob.id);
      if (html) break;
    } catch (error) {
      attempt++;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    attempt++;
  }
  
  if (!html) {
    console.log(`  ⚠️  Не удалось получить данные`);
    return { ...mob, stats: null, hasData: false };
  }
  
  const stats = parseMobStatsFromHtml(html);
  
  if (!stats || !stats['HP']) {
    console.log(`  ⚠️  Данные не содержат статистику HP`);
    return { ...mob, stats: null, hasData: false };
  }
  
  console.log(`  ✅ Статистика получена: HP=${stats['HP']}, EXP=${stats['EXP']}`);
  
  return {
    ...mob,
    stats: stats,
    hasData: true,
    level: stats['Level'],
    hp: stats['HP'],
    mp: stats['MP'],
    exp: stats['EXP'],
    sp: stats['SP'],
    pAtk: stats['P.Atk.'],
    mAtk: stats['M.Atk.'],
    pDef: stats['P.Def.'],
    mDef: stats['M.Def.'],
    accuracy: stats['Accuracy'],
    evasion: stats['Evasion'],
    respawnTime: stats['Respawn Time'],
    defenceAttributes: stats['Defence Attributes'] || {}
  };
}

/**
 * Собирает базу данных по всем монстрам
 * @param {number} limit - максимальное количество монстров (0 = все)
 * @param {number} startFrom - с какого монстра начать
 */
async function collectFullDatabase(limit = 0, startFrom = 0) {
  console.log('🗄️  СБОРКА ПОЛНОЙ БАЗЫ ДАННЫХ МОНСТРОВ\n');
  console.log('='.repeat(60));
  
  // Загружаем список монстров с дропом адены
  const adenaMobsPath = path.join(DATA_DIR, 'mobs_adena.json');
  
  if (!fs.existsSync(adenaMobsPath)) {
    console.error('❌ Файл mobs_adena.json не найден!');
    console.error('   Сначала запустите: npm run parse-adena');
    process.exit(1);
  }
  
  const mobs = JSON.parse(fs.readFileSync(adenaMobsPath, 'utf-8'));
  console.log(`📋 Загружено ${mobs.length} монстров из mobs_adena.json\n`);
  
  // Подготавливаем список для обработки
  let modsToProcess = mobs.slice(startFrom);
  if (limit > 0 && limit < modsToProcess.length) {
    modsToProcess = modsToProcess.slice(0, limit);
  }
  
  console.log(`🔄 Обработка ${modsToProcess.length} монстров...\n`);
  
  const enrichedMobs = [];
  const stats = {
    total: modsToProcess.length,
    successful: 0,
    failed: 0,
    noData: 0,
    startTime: Date.now()
  };
  
  for (let i = 0; i < modsToProcess.length; i++) {
    const mob = modsToProcess[i];
    const progress = `[${i + 1}/${modsToProcess.length}]`;
    
    try {
      const enrichedMob = await collectMobData(mob, 2);
      enrichedMobs.push(enrichedMob);
      
      if (enrichedMob.hasData) {
        stats.successful++;
      } else {
        stats.noData++;
      }
    } catch (error) {
      console.error(`  ✗ Ошибка при обработке: ${error.message}`);
      enrichedMobs.push({ ...mob, stats: null, hasData: false });
      stats.failed++;
    }
    
    // Показываем прогресс каждые 10 монстров
    if ((i + 1) % 10 === 0 || i === modsToProcess.length - 1) {
      const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
      console.log(`\n⏱️  Обработано: ${i + 1}/${modsToProcess.length} (${elapsed}s)`);
      console.log(`   ✅ Успешно: ${stats.successful}`);
      console.log(`   ⚠️  Без данных: ${stats.noData}`);
      console.log(`   ❌ Ошибок: ${stats.failed}\n`);
    }
  }
  
  // Результаты
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГИ:\n');
  console.log(`  Всего обработано: ${stats.successful + stats.noData + stats.failed}`);
  console.log(`  ✅ С полной статистикой: ${stats.successful}`);
  console.log(`  ⚠️  Без данных: ${stats.noData}`);
  console.log(`  ❌ Ошибок: ${stats.failed}`);
  console.log(`  ⏱️  Время выполнения: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`);
  
  // Сохраняем результаты
  const resultsPath = path.join(DATA_DIR, 'mobs_with_stats.json');
  fs.writeFileSync(resultsPath, JSON.stringify(enrichedMobs, null, 2));
  console.log(`\n💾 Сохранено в: data/mobs_with_stats.json`);
  
  // Сохраняем только успешные
  const successfulMobs = enrichedMobs.filter(m => m.hasData);
  const successPath = path.join(DATA_DIR, 'mobs_successful.json');
  fs.writeFileSync(successPath, JSON.stringify(successfulMobs, null, 2));
  console.log(`💾 Только успешные в: data/mobs_successful.json (${successfulMobs.length} монстров)`);
  
  // Генерируем краткий отчет
  const report = generateReport(enrichedMobs);
  const reportPath = path.join(DATA_DIR, 'collection_report.txt');
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Отчет сохранен в: data/collection_report.txt\n`);
  
  return enrichedMobs;
}

/**
 * Генерирует отчет о сборке
 */
function generateReport(mobs) {
  const withStats = mobs.filter(m => m.hasData);
  
  let report = '📊 ОТЧЕТ О СБОРКЕ БД МОНСТРОВ\n';
  report += '='.repeat(60) + '\n\n';
  
  report += `📈 СТАТИСТИКА:\n`;
  report += `  Всего монстров: ${mobs.length}\n`;
  report += `  С полной статистикой: ${withStats.length}\n`;
  report += `  Без данных: ${mobs.length - withStats.length}\n`;
  report += `  Процент успеха: ${((withStats.length / mobs.length) * 100).toFixed(1)}%\n\n`;
  
  if (withStats.length > 0) {
    // HP статистика
    const hps = withStats.map(m => m.hp).sort((a, b) => a - b);
    const exps = withStats.map(m => m.exp).sort((a, b) => a - b);
    
    report += `💪 HP СТАТИСТИКА:\n`;
    report += `  Минимум: ${Math.min(...hps)}\n`;
    report += `  Максимум: ${Math.max(...hps)}\n`;
    report += `  Среднее: ${(hps.reduce((a, b) => a + b, 0) / hps.length).toFixed(1)}\n\n`;
    
    report += `⭐ EXP СТАТИСТИКА:\n`;
    report += `  Минимум: ${Math.min(...exps)}\n`;
    report += `  Максимум: ${Math.max(...exps)}\n`;
    report += `  Среднее: ${(exps.reduce((a, b) => a + b, 0) / exps.length).toFixed(1)}\n\n`;
    
    // ТОП 10 по HP/EXP отношению
    const ratios = withStats
      .map(m => ({ name: m.name, hp: m.hp, exp: m.exp, ratio: m.exp / m.hp }))
      .sort((a, b) => b.ratio - a.ratio);
    
    report += `🔥 ТОП 10 ЛУЧШИХ EXP/HP:\n`;
    ratios.slice(0, 10).forEach((m, i) => {
      report += `  ${i + 1}. ${m.name.padEnd(30)} EXP:${m.exp.toString().padStart(5)} HP:${m.hp.toString().padStart(4)} Ratio:${m.ratio.toFixed(2)}\n`;
    });
  }
  
  return report;
}

// Запуск
const args = process.argv.slice(2);
const limit = args[0] ? parseInt(args[0]) : 10; // По умолчанию 10 монстров для теста
const startFrom = args[1] ? parseInt(args[1]) : 0;

console.log(`\n🚀 Запуск сборщика БД (limit: ${limit}, start: ${startFrom})\n`);

try {
  await collectFullDatabase(limit, startFrom);
  console.log('\n✅ Готово!\n');
} catch (error) {
  console.error('\n❌ Критическая ошибка:', error.message);
  process.exit(1);
}