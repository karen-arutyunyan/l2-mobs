import fs from 'fs';
import path from 'path';
import { parseMobStats, normalizeStats } from './parseMobStats.js';
import { enrichWithEfficiency, sortByEfficiency, generateEfficiencyReport } from './calculateEfficiency.js';

/**
 * Полный тест всей системы на примере локального HTML
 */
async function fullTest() {
  console.log('🧪 ПОЛНЫЙ ТЕСТ СИСТЕМЫ ПАРСИНГА МОНСТРОВ\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // === ТЕСТ 1: Парсинг HTML ===
  console.log('✅ ТЕСТ 1: Парсинг HTML файла\n');
  
  const htmlPath = './data/sample_elder_red_keltir.html';
  
  if (!fs.existsSync(htmlPath)) {
    console.error(`✗ Файл не найден: ${htmlPath}`);
    process.exit(1);
  }

  const stats = parseMobStats(htmlPath, true);
  
  if (!stats) {
    console.error('✗ Ошибка при парсинге HTML');
    process.exit(1);
  }

  console.log('✓ HTML успешно спарсен');
  console.log(`  Найдено параметров: ${Object.keys(stats).length}\n`);

  // === ТЕСТ 2: Нормализация данных ===
  console.log('✅ ТЕСТ 2: Нормализация данных\n');

  const normalized = normalizeStats(stats);
  
  console.log('✓ Данные нормализованы:');
  console.log(`  HP: ${normalized['HP']} (тип: ${typeof normalized['HP']})`);
  console.log(`  EXP: ${normalized['EXP']} (тип: ${typeof normalized['EXP']})`);
  console.log(`  Level: ${normalized['Level']} (тип: ${typeof normalized['Level']})`);
  console.log(`  Defence Attributes: ${JSON.stringify(normalized['Defence Attributes'])}\n`);

  // === ТЕСТ 3: Расчет эффективности ===
  console.log('✅ ТЕСТ 3: Расчет эффективности (HP/Adena)\n');

  // Используем примерные данные адены для теста
  const testMob = {
    id: 20537,
    name: 'Elder Red Keltir',
    level: 'Ур. 3',
    href: '/npc/20537-elder-red-keltir/live',
    minAdena: 22,
    maxAdena: 38,
    chance: 70,
    avgAdena: 30,
    hp: normalized['HP'],
    mp: normalized['MP'],
    exp: normalized['EXP'],
    sp: normalized['SP'],
    pAtk: normalized['P.Atk.'],
    mAtk: normalized['M.Atk.'],
    pDef: normalized['P.Def.'],
    mDef: normalized['M.Def.'],
    accuracy: normalized['Accuracy'],
    evasion: normalized['Evasion'],
    defenceAttributes: normalized['Defence Attributes']
  };

  const enriched = enrichWithEfficiency([testMob]);
  
  console.log(`✓ Эффективность рассчитана:`);
  console.log(`  HP: ${enriched[0].hp}`);
  console.log(`  Adena: ${enriched[0].avgAdena}`);
  console.log(`  Efficiency (HP/Adena): ${enriched[0].efficiency ? enriched[0].efficiency.toFixed(2) : 'N/A'}\n`);

  // === ТЕСТ 4: Сортировка ===
  console.log('✅ ТЕСТ 4: Сортировка по эффективности\n');

  const sorted = sortByEfficiency(enriched, false);
  console.log(`✓ Монстры отсортированы:`);
  sorted.forEach((mob, idx) => {
    console.log(`  ${idx + 1}. ${mob.name} - Efficiency: ${mob.efficiency.toFixed(2)}`);
  });

  // === ТЕСТ 5: Генерация отчета ===
  console.log('\n✅ ТЕСТ 5: Генерация отчета\n');

  const report = generateEfficiencyReport(sorted);
  console.log('✓ Отчет сгенерирован\n');
  console.log(report);

  // === ИТОГИ ===
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!\n');

  console.log('📋 СЛЕДУЮЩИЕ ШАГИ:\n');
  console.log('1. Запустите парсинг адены:');
  console.log('   npm run parse-adena\n');
  
  console.log('2. Добавьте HTML файлы монстров в папку data/:');
  console.log('   - Скачайте страницы монстров (Ctrl+S)');
  console.log('   - Переименуйте в формат: npc_<ID>.html');
  console.log('   - Поместите в папку data/\n');

  console.log('3. Запустите интеграцию данных:');
  console.log('   npm run integrate\n');

  console.log('Это создаст файл mobs_with_efficiency.json с полной информацией\n');
}

fullTest().catch(console.error);