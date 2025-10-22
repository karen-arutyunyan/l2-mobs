import fs from 'fs';
import path from 'path';
import { parseMobStats, normalizeStats } from './parseMobStats.js';
import { enrichWithEfficiency, sortByEfficiency, generateEfficiencyReport, saveEfficiencyResults } from './calculateEfficiency.js';

/**
 * Интегрирует данные из mobs_adena.json и HTML файлов монстров
 * Рассчитывает эффективность (HP/Adena) для каждого монстра
 */
async function integrateMobData() {
  console.log('🎮 Интеграция данных монстров\n');

  // Загружаем базовые данные по адене
  const adenajsonPath = './data/mobs_adena.json';
  if (!fs.existsSync(adenajsonPath)) {
    console.error(`✗ Файл не найден: ${adenajsonPath}`);
    console.log('  Сначала запустите: npm run parse-adena');
    process.exit(1);
  }

  const mobs = JSON.parse(fs.readFileSync(adenajsonPath, 'utf-8'));
  console.log(`✓ Загружено ${mobs.length} монстров из ${adenajsonPath}\n`);

  // Проверяем какие HTML файлы доступны
  const dataDir = './data';
  const htmlFiles = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('npc_') && f.endsWith('.html'));

  console.log(`📁 Найдено HTML файлов монстров: ${htmlFiles.length}\n`);

  // Обогащаем монстров данными из HTML файлов
  let enrichedCount = 0;

  for (let i = 0; i < mobs.length; i++) {
    const mob = mobs[i];
    
    // Ищем HTML файл для этого монстра
    const htmlFile = htmlFiles.find(f => f.includes(mob.id.toString()));

    if (htmlFile) {
      const htmlPath = path.join(dataDir, htmlFile);
      
      try {
        console.log(`[${i + 1}/${mobs.length}] Загружаю ${mob.name}...`);
        
        const stats = parseMobStats(htmlPath, true);
        if (stats) {
          const normalized = normalizeStats(stats);
          
          mob.hp = normalized['HP'];
          mob.mp = normalized['MP'];
          mob.pAtk = normalized['P.Atk.'];
          mob.mAtk = normalized['M.Atk.'];
          mob.pDef = normalized['P.Def.'];
          mob.mDef = normalized['M.Def.'];
          mob.accuracy = normalized['Accuracy'];
          mob.evasion = normalized['Evasion'];
          mob.exp = normalized['EXP'];
          mob.sp = normalized['SP'];
          mob.defenceAttributes = normalized['Defence Attributes'];
          mob.allStats = normalized;

          enrichedCount++;
          console.log(`  ✓ HP: ${mob.hp}, EXP: ${mob.exp}`);
        }
      } catch (error) {
        console.error(`  ✗ Ошибка при парсинге: ${error.message}`);
      }
    }
  }

  console.log(`\n✓ Обогащено данными ${enrichedCount} монстров\n`);

  // Рассчитываем эффективность
  console.log('📊 Расчет эффективности (HP/Adena)...\n');
  
  const enriched = enrichWithEfficiency(mobs);
  const sorted = sortByEfficiency(enriched);

  // Генерируем отчет
  const report = generateEfficiencyReport(sorted);
  console.log(report);

  // Сохраняем отчет в файл
  const reportPath = './data/efficiency_report.txt';
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Отчет сохранен: ${reportPath}`);

  // Сохраняем результаты в JSON
  saveEfficiencyResults(sorted);

  // Выводим примеры для проверки
  console.log('\n🔍 ПРИМЕРЫ ДАННЫХ ДЛЯ ПРОВЕРКИ:\n');
  
  const withEfficiency = sorted.filter(m => m.efficiency !== null).slice(0, 3);
  withEfficiency.forEach((mob, idx) => {
    console.log(`${idx + 1}. ${mob.name} (Lv. ${mob.level})`);
    console.log(`   HP: ${mob.hp || 'N/A'} | Adena: ${mob.avgAdena} | Efficiency: ${mob.efficiency?.toFixed(2) || 'N/A'}`);
  });
}

integrateMobData().catch(console.error);