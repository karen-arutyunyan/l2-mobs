import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

/**
 * Анализирует полный список всех монстров
 */
async function analyzeFull() {
  console.log('📊 АНАЛИЗ ПОЛНОГО СПИСКА МОНСТРОВ\n');
  console.log('='.repeat(70) + '\n');
  
  try {
    const dataPath = path.join(DATA_DIR, 'mobs_adena.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const mobs = JSON.parse(rawData);
    
    console.log(`✅ Загружено монстров: ${mobs.length}\n`);
    
    // Группировка по уровням
    const byLevel = {};
    mobs.forEach(mob => {
      const levelMatch = mob.level.match(/(\d+)/);
      const level = levelMatch ? parseInt(levelMatch[1]) : 0;
      
      if (!byLevel[level]) {
        byLevel[level] = [];
      }
      byLevel[level].push(mob);
    });
    
    // Статистика по уровням
    console.log('📈 РАСПРЕДЕЛЕНИЕ ПО УРОВНЯМ:\n');
    
    const levelStats = Object.entries(byLevel)
      .map(([level, mobs]) => ({
        level: parseInt(level),
        count: mobs.length,
        avgAdena: Math.round(
          mobs.reduce((sum, m) => sum + m.avgAdena, 0) / mobs.length
        ),
        maxAdena: Math.max(...mobs.map(m => m.avgAdena)),
        minAdena: Math.min(...mobs.map(m => m.avgAdena))
      }))
      .sort((a, b) => a.level - b.level);
    
    // Вывод таблицы
    console.log('Уровень | Кол-во | Сред. Адена | Макс Адена | Мин Адена');
    console.log('-'.repeat(65));
    
    levelStats.forEach(stat => {
      const level = String(stat.level).padStart(2);
      const count = String(stat.count).padStart(3);
      const avg = String(stat.avgAdena).padStart(11);
      const max = String(stat.maxAdena).padStart(10);
      const min = String(stat.minAdena).padStart(9);
      console.log(`   ${level}   │ ${count}  │${avg} │${max} │${min}`);
    });
    
    console.log('\n');
    
    // Группировка по диапазонам уровней
    console.log('📊 РАСПРЕДЕЛЕНИЕ ПО ДИАПАЗОНАМ:\n');
    
    const ranges = [
      { name: 'Новички (1-5)', min: 1, max: 5 },
      { name: 'Начальные (6-15)', min: 6, max: 15 },
      { name: 'Средние (16-30)', min: 16, max: 30 },
      { name: 'Средне-высокие (31-50)', min: 31, max: 50 },
      { name: 'Высокие (51-70)', min: 51, max: 70 },
      { name: 'Эпик/Боссы (71-85)', min: 71, max: 85 }
    ];
    
    ranges.forEach(range => {
      const rangeMobs = mobs.filter(m => {
        const level = parseInt(m.level.match(/(\d+)/)[1]);
        return level >= range.min && level <= range.max;
      });
      
      if (rangeMobs.length > 0) {
        const avgAdena = Math.round(
          rangeMobs.reduce((sum, m) => sum + m.avgAdena, 0) / rangeMobs.length
        );
        const bar = '█'.repeat(Math.min(40, Math.floor(rangeMobs.length / 5)));
        console.log(
          `${range.name.padEnd(25)} │ ${String(rangeMobs.length).padStart(4)} мон. │ ${bar}`
        );
      }
    });
    
    console.log('\n');
    
    // Топ 20 самых дорогих
    console.log('💰 ТОП 20 САМЫХ ДОРОГИХ МОНСТРОВ:\n');
    
    const sorted = [...mobs].sort((a, b) => b.avgAdena - a.avgAdena);
    sorted.slice(0, 20).forEach((mob, i) => {
      const level = mob.level.match(/(\d+)/)[1];
      console.log(
        `${String(i + 1).padStart(2)}. ${mob.name.padEnd(30)} Lv.${level.padStart(2)} → ${String(mob.avgAdena).padStart(12)} адены`
      );
    });
    
    console.log('\n');
    
    // Топ 20 самых дешёвых
    console.log('💸 ТОП 20 САМЫХ ДЕШЁВЫХ МОНСТРОВ:\n');
    
    sorted.slice(-20).reverse().forEach((mob, i) => {
      const level = mob.level.match(/(\d+)/)[1];
      console.log(
        `${String(i + 1).padStart(2)}. ${mob.name.padEnd(30)} Lv.${level.padStart(2)} → ${String(mob.avgAdena).padStart(12)} адены`
      );
    });
    
    console.log('\n');
    
    // Общая статистика
    console.log('📋 ОБЩАЯ СТАТИСТИКА:\n');
    
    const totalAdena = mobs.reduce((sum, m) => sum + m.avgAdena, 0);
    const avgAdena = Math.round(totalAdena / mobs.length);
    const uniqueIds = new Set(mobs.map(m => m.id)).size;
    
    console.log(`Всего монстров в списке:     ${mobs.length}`);
    console.log(`Уникальных ID:               ${uniqueIds}`);
    console.log(`Средняя адена за монстра:   ${avgAdena}`);
    console.log(`Всего адены (если убить всех): ${totalAdena.toLocaleString('ru-RU')}`);
    console.log(`Уровни в игре:               1 - 85`);
    
    // Находим уникальные уровни
    const uniqueLevels = new Set(
      mobs.map(m => {
        const match = m.level.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
    );
    console.log(`Уникальные уровни монстров: ${uniqueLevels.size}`);
    
    // Вероятности дропа
    console.log('\n🎲 СТАТИСТИКА ПО ВЕРОЯТНОСТИ ДРОПА:\n');
    
    const byChance = {};
    mobs.forEach(mob => {
      if (!byChance[mob.chance]) {
        byChance[mob.chance] = 0;
      }
      byChance[mob.chance]++;
    });
    
    Object.entries(byChance)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
      .forEach(([chance, count]) => {
        const percent = (count / mobs.length * 100).toFixed(1);
        console.log(`${chance}% шанс: ${count} монстров (${percent}%)`);
      });
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Анализ завершен!\n');
    
    // Сохраняем результаты анализа
    const analysisResult = {
      timestamp: new Date().toISOString(),
      totalMobs: mobs.length,
      uniqueIds: uniqueIds,
      avgAdena: avgAdena,
      totalAdena: totalAdena,
      levelStats: levelStats,
      rangeStats: ranges.map(range => {
        const rangeMobs = mobs.filter(m => {
          const level = parseInt(m.level.match(/(\d+)/)[1]);
          return level >= range.min && level <= range.max;
        });
        return {
          range: range.name,
          count: rangeMobs.length,
          avgAdena: rangeMobs.length > 0
            ? Math.round(rangeMobs.reduce((sum, m) => sum + m.avgAdena, 0) / rangeMobs.length)
            : 0
        };
      }),
      topMobs: sorted.slice(0, 20),
      bottomMobs: sorted.slice(-20).reverse()
    };
    
    const reportPath = path.join(DATA_DIR, 'full_analysis_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(analysisResult, null, 2));
    console.log(`📊 Полный отчет сохранен: data/full_analysis_report.json`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

analyzeFull().catch(console.error);