import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseMobStats, normalizeStats } from './parseMobStats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

// Примеры ID монстров из Lineage 2
const SAMPLE_MOBS = [
  { id: 20537, name: 'elder-red-keltir' },  // Elder Red Keltir
  { id: 20038, name: 'giant-spider' },      // Giant Spider
  { id: 20120, name: 'skeleton-archer' },   // Skeleton Archer
  { id: 20050, name: 'young-boar' },        // Young Boar
  { id: 20079, name: 'poison-spider' }      // Poison Spider
];

/**
 * Загружает HTML монстра с вики
 */
async function downloadMobHtml(mobId, mobName) {
  try {
    const url = `https://wiki1.mw2.wiki/en/npc/${mobId}-${mobName}/live`;
    console.log(`  Загружаем: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const html = response.data;
    console.log(`    ✅ Загружено ${(html.length / 1024).toFixed(1)} KB`);
    return html;
  } catch (error) {
    console.log(`    ❌ Ошибка: ${error.response?.status || error.message}`);
    return null;
  }
}

/**
 * Сохраняет HTML в файл
 */
function saveHtmlFile(html, mobId) {
  try {
    const filePath = path.join(DATA_DIR, `npc_${mobId}.html`);
    fs.writeFileSync(filePath, html, 'utf-8');
    console.log(`    💾 Сохранено: data/npc_${mobId}.html`);
    return filePath;
  } catch (error) {
    console.log(`    ❌ Ошибка сохранения: ${error.message}`);
    return null;
  }
}

/**
 * Тестирует парсер на всех HTML файлах в папке data
 */
function testAllMobs() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 ТЕСТИРОВАНИЕ ПАРСЕРА НА ВСЕХ HTML ФАЙЛАХ');
  console.log('='.repeat(70) + '\n');
  
  const htmlFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('npc_') && f.endsWith('.html'))
    .sort();
  
  if (htmlFiles.length === 0) {
    console.log('❌ Нет HTML файлов для тестирования\n');
    return [];
  }
  
  console.log(`📋 Найдено ${htmlFiles.length} HTML файл(ов)\n`);
  
  const results = [];
  const errors = [];
  
  htmlFiles.forEach((fileName, idx) => {
    const filePath = path.join(DATA_DIR, fileName);
    const mobId = fileName.match(/npc_(\d+)/)[1];
    
    console.log(`${String(idx + 1).padStart(2)}/${htmlFiles.length} Парсим ${fileName}:`);
    
    try {
      const html = fs.readFileSync(filePath, 'utf-8');
      const rawStats = parseMobStats(html, false);
      
      if (!rawStats) {
        console.log(`    ❌ Не удалось распарсить статистику\n`);
        errors.push({ file: fileName, error: 'Не удалось распарсить' });
        return;
      }
      
      const normalized = normalizeStats(rawStats);
      
      // Проверяем основные параметры
      const requiredFields = ['hp', 'exp', 'level'];
      const missingFields = requiredFields.filter(f => !normalized[f]);
      
      if (missingFields.length > 0) {
        console.log(`    ⚠️  Отсутствуют поля: ${missingFields.join(', ')}\n`);
      }
      
      // Выводим извлеченные данные
      console.log(`    ✅ Успешно распаршено`);
      console.log(`       ID: ${mobId}, Level: ${normalized.level || '?'}`);
      console.log(`       HP: ${normalized.hp || '?'}, MP: ${normalized.mp || '?'}`);
      console.log(`       EXP: ${normalized.exp || '?'}, SP: ${normalized.sp || '?'}`);
      console.log(`       P.Atk: ${normalized.pAtk || '?'}, M.Atk: ${normalized.mAtk || '?'}`);
      console.log(`       P.Def: ${normalized.pDef || '?'}, M.Def: ${normalized.mDef || '?'}`);
      console.log(`       Accuracy: ${normalized.accuracy || '?'}, Evasion: ${normalized.evasion || '?'}`);
      console.log(`       Respawn: ${normalized.respawnTime || '?'}s`);
      
      if (normalized.defenceAttributes) {
        const attrs = Object.entries(normalized.defenceAttributes)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ');
        console.log(`       Defence Attrs: ${attrs}`);
      }
      console.log('');
      
      results.push({
        file: fileName,
        mobId,
        stats: normalized,
        success: true
      });
    } catch (error) {
      console.log(`    ❌ Ошибка: ${error.message}\n`);
      errors.push({ file: fileName, error: error.message });
    }
  });
  
  // Итоги
  console.log('='.repeat(70));
  console.log('📊 ИТОГИ ТЕСТИРОВАНИЯ\n');
  console.log(`  ✅ Успешно распаршено: ${results.length}`);
  console.log(`  ❌ Ошибок: ${errors.length}`);
  
  if (results.length > 0) {
    const avgHp = results
      .filter(r => r.stats.hp)
      .reduce((sum, r) => sum + r.stats.hp, 0) / results.filter(r => r.stats.hp).length;
    const avgExp = results
      .filter(r => r.stats.exp)
      .reduce((sum, r) => sum + r.stats.exp, 0) / results.filter(r => r.stats.exp).length;
    
    console.log(`\n  📈 Статистика:`);
    console.log(`     Среднее HP: ${avgHp.toFixed(0)}`);
    console.log(`     Среднее EXP: ${avgExp.toFixed(0)}`);
  }
  
  if (errors.length > 0) {
    console.log(`\n  ⚠️  Ошибки:`);
    errors.forEach(e => {
      console.log(`     ${e.file}: ${e.error}`);
    });
  }
  
  console.log('\n');
  return results;
}

/**
 * Главная функция
 */
async function main() {
  console.log('\n🚀 ЗАГРУЗЧИК И ТЕСТЕР МОНСТРОВ\n');
  console.log('='.repeat(70));
  
  const args = process.argv.slice(2);
  
  if (args.includes('--download')) {
    console.log('\n📥 ЗАГРУЗКА HTML ИЗ ВИКИ\n');
    
    for (const mob of SAMPLE_MOBS) {
      const html = await downloadMobHtml(mob.id, mob.name);
      if (html) {
        saveHtmlFile(html, mob.id);
      }
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Тестирование
  const results = testAllMobs();
  
  // Сохраняем результаты тестирования
  if (results.length > 0) {
    const reportPath = path.join(DATA_DIR, 'parser_test_results.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`💾 Результаты сохранены: data/parser_test_results.json\n`);
  }
}

main().catch(err => {
  console.error('❌ Ошибка:', err.message);
  process.exit(1);
});