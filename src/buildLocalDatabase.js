import fs from 'fs';
import path from 'path';
import { parseMobStats, normalizeStats } from './parseMobStats.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

/**
 * Собирает базу данных из локальных HTML файлов
 */
async function buildLocalDatabase() {
  console.log('📚 СБОРКА БД ИЗ ЛОКАЛЬНЫХ HTML ФАЙЛОВ\n');
  console.log('='.repeat(60));
  
  // Загружаем базу адены
  const adenaMobsPath = path.join(DATA_DIR, 'mobs_adena.json');
  if (!fs.existsSync(adenaMobsPath)) {
    console.error('❌ Файл mobs_adena.json не найден!');
    console.error('   Запустите: npm run parse-adena');
    process.exit(1);
  }
  
  const mobs = JSON.parse(fs.readFileSync(adenaMobsPath, 'utf-8'));
  console.log(`📋 Загружено ${mobs.length} монстров из mobs_adena.json\n`);
  
  // Ищем все HTML файлы в data папке
  const htmlFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.html'));
  console.log(`📄 Найдено HTML файлов: ${htmlFiles.length}\n`);
  
  if (htmlFiles.length === 0) {
    console.log('⚠️  ВНИМАНИЕ: HTML файлы не найдены!\n');
    console.log('Инструкция для добавления данных:\n');
    console.log('1. Откройте в браузере страницу монстра на вики:');
    console.log('   https://wiki1.mw2.wiki/en/npc/20537-elder-red-keltir/live\n');
    console.log('2. Сохраните HTML (Ctrl+S):');
    console.log('   - Выберите "Сохранить как HTML файл"');
    console.log('   - Сохраните в папку: data/\n');
    console.log('3. Переименуйте файл в формат: npc_<ID>.html');
    console.log('   Пример: npc_20537.html (для Elder Red Keltir)\n');
    console.log('4. Запустите этот скрипт снова\n');
    return;
  }
  
  console.log('🔄 Обработка файлов:\n');
  
  const enrichedMobs = JSON.parse(JSON.stringify(mobs)); // Копируем исходный массив
  const stats = {
    totalFiles: htmlFiles.length,
    processed: 0,
    successful: 0,
    failed: 0
  };
  
  // Парсим каждый HTML файл
  htmlFiles.forEach((fileName, idx) => {
    const filePath = path.join(DATA_DIR, fileName);
    console.log(`  ${idx + 1}/${htmlFiles.length} ${fileName}`);
    
    try {
      const htmlContent = fs.readFileSync(filePath, 'utf-8');
      const rawStats = parseMobStats(htmlContent, false);
      
      if (!rawStats || !rawStats['HP']) {
        console.log(`    ⚠️  Не содержит статистику HP`);
        stats.failed++;
        return;
      }
      
      const normalized = normalizeStats(rawStats);
      
      // Извлекаем ID из имени файла или из HTML
      let mobId = null;
      const nameMatch = fileName.match(/npc_(\d+)/);
      if (nameMatch) {
        mobId = parseInt(nameMatch[1]);
      }
      
      // Ищем монстра в массиве
      const mobIndex = enrichedMobs.findIndex(m => m.id === mobId);
      
      if (mobIndex !== -1) {
        // Обогащаем существующего монстра
        enrichedMobs[mobIndex] = {
          ...enrichedMobs[mobIndex],
          hasData: true,
          hp: normalized.hp,
          mp: normalized.mp,
          exp: normalized.exp,
          sp: normalized.sp,
          pAtk: normalized.pAtk,
          mAtk: normalized.mAtk,
          pDef: normalized.pDef,
          mDef: normalized.mDef,
          accuracy: normalized.accuracy,
          evasion: normalized.evasion,
          level: normalized.level,
          respawnTime: normalized.respawnTime,
          defenceAttributes: normalized.defenceAttributes || {},
          allStats: normalized
        };
        
        console.log(`    ✅ ID ${mobId} (${enrichedMobs[mobIndex].name}): HP=${normalized.hp}, EXP=${normalized.exp}`);
        stats.successful++;
      } else {
        console.log(`    ⚠️  ID ${mobId} не найден в списке адены`);
      }
      
      stats.processed++;
    } catch (error) {
      console.log(`    ❌ Ошибка: ${error.message}`);
      stats.failed++;
    }
  });
  
  // Результаты
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГИ:\n');
  
  const withData = enrichedMobs.filter(m => m.hasData);
  
  console.log(`  Файлов обработано: ${stats.processed}`);
  console.log(`  ✅ Успешно: ${stats.successful}`);
  console.log(`  ❌ Ошибок: ${stats.failed}`);
  console.log(`\n  Монстров в базе: ${enrichedMobs.length}`);
  console.log(`  С полной статистикой: ${withData.length}`);
  console.log(`  Покрытие: ${((withData.length / enrichedMobs.length) * 100).toFixed(1)}%`);
  
  // Сохраняем результаты
  const fullPath = path.join(DATA_DIR, 'mobs_full_database.json');
  fs.writeFileSync(fullPath, JSON.stringify(enrichedMobs, null, 2));
  console.log(`\n💾 Сохранено в: data/mobs_full_database.json`);
  
  // Сохраняем только с данными
  const withDataPath = path.join(DATA_DIR, 'mobs_with_data.json');
  fs.writeFileSync(withDataPath, JSON.stringify(withData, null, 2));
  console.log(`💾 Только с данными: data/mobs_with_data.json (${withData.length})`);
  
  // Генерируем отчет
  const report = generateReport(enrichedMobs, withData);
  const reportPath = path.join(DATA_DIR, 'database_report.txt');
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Отчет: data/database_report.txt`);
  
  // Статистика по HP и EXP
  if (withData.length > 0) {
    generateStats(withData);
  }
  
  console.log('\n✅ Готово!\n');
  
  return enrichedMobs;
}

function generateReport(allMobs, withData) {
  let report = '📚 ОТЧЕТ О БД МОНСТРОВ\n';
  report += '='.repeat(60) + '\n\n';
  
  report += `📈 СТАТИСТИКА:\n`;
  report += `  Всего монстров: ${allMobs.length}\n`;
  report += `  С полной статистикой: ${withData.length}\n`;
  report += `  Без статистики: ${allMobs.length - withData.length}\n`;
  report += `  Покрытие: ${((withData.length / allMobs.length) * 100).toFixed(1)}%\n\n`;
  
  if (withData.length > 0) {
    const hps = withData.map(m => m.hp).filter(h => h).sort((a, b) => a - b);
    const exps = withData.map(m => m.exp).filter(e => e).sort((a, b) => a - b);
    
    if (hps.length > 0) {
      report += `💪 HP:\n`;
      report += `  Минимум: ${Math.min(...hps)}\n`;
      report += `  Максимум: ${Math.max(...hps)}\n`;
      report += `  Среднее: ${(hps.reduce((a, b) => a + b, 0) / hps.length).toFixed(1)}\n\n`;
    }
    
    if (exps.length > 0) {
      report += `⭐ EXP:\n`;
      report += `  Минимум: ${Math.min(...exps)}\n`;
      report += `  Максимум: ${Math.max(...exps)}\n`;
      report += `  Среднее: ${(exps.reduce((a, b) => a + b, 0) / exps.length).toFixed(1)}\n\n`;
    }
    
    // ТОП 10 по EXP/HP
    const ePerHp = withData
      .filter(m => m.exp && m.hp)
      .map(m => ({
        name: m.name,
        exp: m.exp,
        hp: m.hp,
        level: m.allStats?.Level || '?',
        ratio: m.exp / m.hp
      }))
      .sort((a, b) => b.ratio - a.ratio);
    
    if (ePerHp.length > 0) {
      report += `🔥 ТОП 10 ПО EXP/HP (ЭФФЕКТИВНОСТЬ):\n`;
      ePerHp.slice(0, 10).forEach((m, i) => {
        report += `  ${String(i + 1).padStart(2)}. Lv${String(m.level).padStart(2)} ${m.name.padEnd(30)} `;
        report += `EXP:${String(m.exp).padStart(5)} HP:${String(m.hp).padStart(4)} E/H:${m.ratio.toFixed(2)}\n`;
      });
    }
  }
  
  return report;
}

function generateStats(withData) {
  console.log('\n📊 АНАЛИЗ ДАННЫХ:');
  
  const hps = withData.map(m => m.hp).filter(h => h).sort((a, b) => a - b);
  const exps = withData.map(m => m.exp).filter(e => e).sort((a, b) => a - b);
  
  if (hps.length > 0) {
    console.log(`\n  HP: ${Math.min(...hps)} - ${Math.max(...hps)} (avg: ${(hps.reduce((a, b) => a + b, 0) / hps.length).toFixed(0)})`);
  }
  
  if (exps.length > 0) {
    console.log(`  EXP: ${Math.min(...exps)} - ${Math.max(...exps)} (avg: ${(exps.reduce((a, b) => a + b, 0) / exps.length).toFixed(0)})`);
  }
  
  // Лучшие для фарма
  const ePerHp = withData
    .filter(m => m.exp && m.hp)
    .map(m => ({
      name: m.name,
      exp: m.exp,
      hp: m.hp,
      ratio: m.exp / m.hp
    }))
    .sort((a, b) => b.ratio - a.ratio);
  
  if (ePerHp.length > 3) {
    console.log(`\n  🥇 ТОП 3 ДЛЯ ФАРМА (EXP/HP):`);
    ePerHp.slice(0, 3).forEach((m, i) => {
      console.log(`     ${i + 1}. ${m.name}: ${m.ratio.toFixed(2)}`);
    });
  }
}

// Запуск
console.log('\n🚀 Инициализация сборки локальной БД...\n');

try {
  await buildLocalDatabase();
} catch (error) {
  console.error('\n❌ Критическая ошибка:', error.message);
  console.error(error.stack);
  process.exit(1);
}