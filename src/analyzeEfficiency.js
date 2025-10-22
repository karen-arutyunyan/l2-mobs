import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

/**
 * Рассчитывает различные метрики эффективности для монстров
 */
function analyzeEfficiency() {
  console.log('📊 АНАЛИЗ ЭФФЕКТИВНОСТИ ФАРМА\n');
  console.log('='.repeat(70));
  
  // Загружаем БД с данными
  const dbPath = path.join(DATA_DIR, 'mobs_with_data.json');
  
  if (!fs.existsSync(dbPath)) {
    console.log('⚠️  БД еще не собрана!');
    console.log('\n📋 Используйте: npm run build-db\n');
    
    // Попытаемся найти полную БД
    const fullDbPath = path.join(DATA_DIR, 'mobs_full_database.json');
    if (!fs.existsSync(fullDbPath)) {
      console.error('❌ Файлы не найдены: mobs_with_data.json или mobs_full_database.json');
      process.exit(1);
    }
  }
  
  const mobs = JSON.parse(
    fs.readFileSync(dbPath, 'utf-8')
  );
  
  console.log(`📋 Загружено ${mobs.length} монстров с полной статистикой\n`);
  
  if (mobs.length === 0) {
    console.log('⚠️  Нет монстров с данными. Добавьте HTML файлы в data/ папку.\n');
    return;
  }
  
  // Фильтруем только монстров с полной информацией
  const validMobs = mobs.filter(m => m.hp && m.exp && m.avgAdena);
  
  console.log(`✅ Монстров для анализа: ${validMobs.length}\n`);
  
  // === РАСЧЕТ МЕТРИК ===
  
  // 1. EXP/HP - эффективность по опыту на HP
  const expPerHp = validMobs.map(m => ({
    ...m,
    metric: m.exp / m.hp,
    name: m.name,
    level: m.allStats?.level || m.level,
    exp: m.exp,
    hp: m.hp
  })).sort((a, b) => b.metric - a.metric);
  
  // 2. EXP/Adena - эффективность по опыту на адену
  const expPerAdena = validMobs.map(m => ({
    ...m,
    metric: m.exp / m.avgAdena,
    exp: m.exp,
    avgAdena: m.avgAdena
  })).sort((a, b) => b.metric - a.metric);
  
  // 3. SP/HP - эффективность по SP на HP
  const spPerHp = validMobs
    .filter(m => m.sp)
    .map(m => ({
      ...m,
      metric: (m.sp / m.hp),
      sp: m.sp,
      hp: m.hp
    }))
    .sort((a, b) => b.metric - a.metric);
  
  // 4. Adena/Respawn - скорость добычи адены
  const adenaPerRespawn = validMobs
    .filter(m => m.respawnTime)
    .map(m => ({
      ...m,
      metric: m.avgAdena / (m.respawnTime / 60), // адена в минуту
      avgAdena: m.avgAdena,
      respawnTime: m.respawnTime
    }))
    .sort((a, b) => b.metric - a.metric);
  
  // 5. Комбо-метрика: (EXP * SP + Adena) / HP
  const comboMetric = validMobs.map(m => ({
    ...m,
    metric: ((m.exp * (m.sp || 1)) + m.avgAdena) / m.hp,
    score: ((m.exp * (m.sp || 1)) + m.avgAdena) / m.hp
  })).sort((a, b) => b.metric - a.metric);
  
  // === ВЫВОД РЕЗУЛЬТАТОВ ===
  
  console.log('🎯 МЕТРИКА 1: EXP/HP (Опыт на единицу здоровья)\n');
  printTop(expPerHp, 'EXP/HP', (m, i) => {
    return `${String(i+1).padStart(2)}. Lv${String(m.level).padStart(2)} ${m.name.padEnd(35)} EXP:${String(m.exp).padStart(5)} HP:${String(m.hp).padStart(4)} Ratio:${m.metric.toFixed(3)}`;
  });
  
  console.log('\n💰 МЕТРИКА 2: EXP/Adena (Опыт на адену)\n');
  printTop(expPerAdena, 'EXP/Adena', (m, i) => {
    return `${String(i+1).padStart(2)}. ${m.name.padEnd(35)} EXP:${String(m.exp).padStart(5)} Adena:${String(m.avgAdena).padStart(4)} Ratio:${m.metric.toFixed(3)}`;
  });
  
  if (spPerHp.length > 0) {
    console.log('\n✨ МЕТРИКА 3: SP/HP (Умение на единицу здоровья)\n');
    printTop(spPerHp, 'SP/HP', (m, i) => {
      return `${String(i+1).padStart(2)}. ${m.name.padEnd(35)} SP:${String(m.sp).padStart(5)} HP:${String(m.hp).padStart(4)} Ratio:${m.metric.toFixed(3)}`;
    });
  }
  
  if (adenaPerRespawn.length > 0) {
    console.log('\n⚡ МЕТРИКА 4: Adena/Respawn (Адена в минуту)\n');
    printTop(adenaPerRespawn, 'Adena/min', (m, i) => {
      const respawnSec = m.respawnTime;
      return `${String(i+1).padStart(2)}. ${m.name.padEnd(35)} Adena:${String(m.avgAdena).padStart(4)} Respawn:${String(respawnSec).padStart(2)}s Ratio:${m.metric.toFixed(2)}/min`;
    });
  }
  
  console.log('\n🔥 КОМБО-МЕТРИКА: (EXP * SP + Adena) / HP\n');
  console.log('(Универсальная оценка эффективности фарма)\n');
  printTop(comboMetric, 'Combo', (m, i) => {
    return `${String(i+1).padStart(2)}. ${m.name.padEnd(35)} Score:${m.metric.toFixed(2)}`;
  });
  
  // === СТАТИСТИКА ===
  
  console.log('\n📈 ОБЩАЯ СТАТИСТИКА:\n');
  
  const avgExpPerHp = expPerHp.reduce((sum, m) => sum + m.metric, 0) / expPerHp.length;
  const avgExpPerAdena = expPerAdena.reduce((sum, m) => sum + m.metric, 0) / expPerAdena.length;
  const avgCombo = comboMetric.reduce((sum, m) => sum + m.metric, 0) / comboMetric.length;
  
  console.log(`  EXP/HP:    ${avgExpPerHp.toFixed(3)} (avg)`);
  console.log(`  EXP/Adena: ${avgExpPerAdena.toFixed(3)} (avg)`);
  console.log(`  Combo:     ${avgCombo.toFixed(2)} (avg)`);
  
  // === РЕКОМЕНДАЦИИ ===
  
  console.log('\n🎯 РЕКОМЕНДАЦИИ:\n');
  
  const bestExp = expPerHp[0];
  const bestAdena = expPerAdena[0];
  const bestCombo = comboMetric[0];
  
  console.log(`  🥇 ЛУЧШЕ ВСЕГО ДЛЯ EXP:   ${bestExp.name} (${bestExp.metric.toFixed(3)} EXP/HP)`);
  console.log(`  💰 ЛУЧШЕ ВСЕГО ДЛЯ ADENA:  ${bestAdena.name} (${bestAdena.metric.toFixed(3)} EXP/Adena)`);
  console.log(`  🔥 УНИВЕРСАЛЬНЫЙ ВЫБОР:    ${bestCombo.name} (Score: ${bestCombo.metric.toFixed(2)})`);
  
  // Сохраняем результаты
  const results = {
    timestamp: new Date().toISOString(),
    totalMobs: validMobs.length,
    metrics: {
      expPerHp: expPerHp.slice(0, 20),
      expPerAdena: expPerAdena.slice(0, 20),
      comboMetric: comboMetric.slice(0, 20)
    },
    statistics: {
      avgExpPerHp: avgExpPerHp.toFixed(3),
      avgExpPerAdena: avgExpPerAdena.toFixed(3),
      avgCombo: avgCombo.toFixed(2)
    },
    recommendations: {
      bestExp: bestExp.name,
      bestAdena: bestAdena.name,
      bestCombo: bestCombo.name
    }
  };
  
  const resultsPath = path.join(DATA_DIR, 'efficiency_analysis.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Полный анализ сохранен в: data/efficiency_analysis.json`);
  
  console.log('\n✅ Готово!\n');
}

function printTop(data, label, formatter) {
  const top = Math.min(10, data.length);
  
  for (let i = 0; i < top; i++) {
    console.log(`  ${formatter(data[i], i)}`);
  }
  
  if (data.length > 10) {
    console.log(`\n  ... и еще ${data.length - 10} монстров`);
  }
}

// Запуск
try {
  analyzeEfficiency();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  console.error(error.stack);
  process.exit(1);
}