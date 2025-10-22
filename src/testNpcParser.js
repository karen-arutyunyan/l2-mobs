import { parseNpcStats, normalizeStats } from './parseNpcStats.js';
import fs from 'fs';
import path from 'path';

/**
 * Тестирует парсер на нескольких монстрах
 */
async function testNpcParser() {
  console.log('🧪 Тестирование парсера характеристик монстров\n');

  // Примеры монстров с их href из mobs_adena.json
  const testMobs = [
    {
      name: 'Elder Red Keltir',
      npcPath: '20537-elder-red-keltir'
    },
    {
      name: 'Орк',
      npcPath: '20130-orc'
    },
    {
      name: 'Древесный Волк Кхаши',
      npcPath: '20477-kasha-timber-wolf'
    }
  ];

  const results = [];

  for (let i = 0; i < testMobs.length; i++) {
    const mob = testMobs[i];
    console.log(`\n[${ i + 1}/${testMobs.length}] Загружаю ${mob.name}...`);

    try {
      const stats = await parseNpcStats(mob.npcPath);
      const normalized = normalizeStats(stats.stats);
      
      results.push({
        name: mob.name,
        npcPath: mob.npcPath,
        stats: normalized,
        error: stats.error || null
      });

      console.log(`✓ Данные получены:`);
      console.log('  HP:', normalized['HP']);
      console.log('  EXP:', normalized['EXP']);
      console.log('  Level:', normalized['Level']);

    } catch (error) {
      console.error(`✗ Ошибка:`, error.message);
      results.push({
        name: mob.name,
        npcPath: mob.npcPath,
        error: error.message
      });
    }

    // Задержка между запросами
    if (i < testMobs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Сохраняем результаты для проверки
  const outputPath = './data/test_npc_stats.json';
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✓ Результаты сохранены в ${outputPath}`);

  // Выводим итоги
  console.log('\n📊 Итоги:');
  console.log(`Успешно загружено: ${results.filter(r => !r.error).length}/${testMobs.length}`);
  
  if (results.some(r => r.error)) {
    console.log('\n⚠️  Ошибки:');
    results.filter(r => r.error).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
}

testNpcParser().catch(console.error);