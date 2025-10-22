import fs from 'fs';
import path from 'path';

/**
 * Рассчитывает эффективность монстра (HP на единицу адены)
 * @param {Object} mob - объект монстра с полями hp, avgAdena
 * @returns {number} эффективность (HP/Adena) или null если данных недостаточно
 */
function calculateEfficiency(mob) {
  if (!mob.hp || !mob.avgAdena) {
    return null;
  }

  return mob.hp / mob.avgAdena;
}

/**
 * Обогащает монстров показателем эффективности
 * @param {Array} mobs - массив монстров
 * @returns {Array} обогащенный массив
 */
function enrichWithEfficiency(mobs) {
  return mobs.map(mob => {
    const efficiency = calculateEfficiency(mob);
    return {
      ...mob,
      efficiency: efficiency,
      hpPerAdena: efficiency // alias для удобства
    };
  });
}

/**
 * Сортирует монстров по эффективности
 * @param {Array} mobs - массив монстров
 * @param {boolean} ascending - если true, сортирует по возрастанию
 * @returns {Array} отсортированный массив
 */
function sortByEfficiency(mobs, ascending = false) {
  return [...mobs].sort((a, b) => {
    const effA = a.efficiency ?? 0;
    const effB = b.efficiency ?? 0;
    return ascending ? effA - effB : effB - effA;
  });
}

/**
 * Генерирует отчет об эффективности
 * @param {Array} mobs - массив монстров
 * @returns {string} форматированный отчет
 */
function generateEfficiencyReport(mobs) {
  const mobsWithEff = enrichWithEfficiency(mobs);
  const sorted = sortByEfficiency(mobsWithEff, false);

  // Фильтруем монстров с данными по HP
  const withStats = sorted.filter(m => m.efficiency !== null);
  const withoutStats = sorted.filter(m => m.efficiency === null);

  let report = '📊 ОТЧЕТ ОБ ЭФФЕКТИВНОСТИ МОНСТРОВ\n';
  report += '═══════════════════════════════════════════════════════════════\n\n';

  // Статистика
  report += '📈 СТАТИСТИКА:\n';
  report += `  Всего монстров: ${mobs.length}\n`;
  report += `  С данными по HP: ${withStats.length}\n`;
  report += `  Без данных по HP: ${withoutStats.length}\n\n`;

  if (withStats.length > 0) {
    const efficiencies = withStats.map(m => m.efficiency);
    const minEff = Math.min(...efficiencies);
    const maxEff = Math.max(...efficiencies);
    const avgEff = efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;

    report += '💪 ЭФФЕКТИВНОСТЬ (HP/Adena):\n';
    report += `  Минимум: ${minEff.toFixed(2)}\n`;
    report += `  Максимум: ${maxEff.toFixed(2)}\n`;
    report += `  Среднее: ${avgEff.toFixed(2)}\n\n`;

    report += '⭐ ТОП 15 ЭФФЕКТИВНЫХ МОНСТРОВ:\n';
    report += '──────────────────────────────────────────────────────────────\n';
    
    withStats.slice(0, 15).forEach((mob, idx) => {
      report += `${String(idx + 1).padStart(2, ' ')}. ${mob.name.padEnd(25, ' ')} `;
      report += `Lv.${String(mob.level).padStart(2, ' ')} | `;
      report += `HP: ${String(mob.hp).padStart(4, ' ')} | `;
      report += `Adena: ${String(mob.avgAdena).padStart(3, ' ')} | `;
      report += `Eff: ${mob.efficiency.toFixed(2)}\n`;
    });

    report += '\n🔻 ТОП 15 НЕЭФФЕКТИВНЫХ МОНСТРОВ:\n';
    report += '──────────────────────────────────────────────────────────────\n';
    
    const reversed = [...withStats].reverse();
    reversed.slice(0, 15).forEach((mob, idx) => {
      report += `${String(idx + 1).padStart(2, ' ')}. ${mob.name.padEnd(25, ' ')} `;
      report += `Lv.${String(mob.level).padStart(2, ' ')} | `;
      report += `HP: ${String(mob.hp).padStart(4, ' ')} | `;
      report += `Adena: ${String(mob.avgAdena).padStart(3, ' ')} | `;
      report += `Eff: ${mob.efficiency.toFixed(2)}\n`;
    });
  }

  report += '\n══════════════════════════════════════════════════════════════\n';

  if (withoutStats.length > 0) {
    report += `\n⚠️  МОНСТРЫ БЕЗ ДАННЫХ ПО HP (${withoutStats.length}):\n`;
    withoutStats.slice(0, 10).forEach((mob, idx) => {
      report += `  ${idx + 1}. ${mob.name} - ID: ${mob.id}\n`;
    });
    if (withoutStats.length > 10) {
      report += `  ... и еще ${withoutStats.length - 10} монстров\n`;
    }
  }

  return report;
}

/**
 * Сохраняет результаты с эффективностью в JSON
 * @param {Array} mobs - массив монстров
 * @param {string} filename - имя файла для сохранения
 */
function saveEfficiencyResults(mobs, filename = 'mobs_with_efficiency.json') {
  const enriched = enrichWithEfficiency(mobs);
  const sorted = sortByEfficiency(enriched);

  const outputDir = './data';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(sorted, null, 2));
  console.log(`✓ Результаты сохранены в ${filepath}`);
}

export { calculateEfficiency, enrichWithEfficiency, sortByEfficiency, generateEfficiencyReport, saveEfficiencyResults };