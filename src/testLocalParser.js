import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

/**
 * Парсит локальный HTML файл и извлекает статистику
 */
function parseLocalNpcStats(htmlPath) {
  try {
    console.log(`Загружаю локальный файл: ${htmlPath}`);

    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = cheerio.load(html);
    const stats = {};

    // Парсим таблицу статистики (#result-stats)
    const $statsTable = $('#result-stats table');
    
    console.log(`✓ Найдена таблица статистики`);

    // Извлекаем все строки таблицы
    $statsTable.find('tr').each((rowIndex, row) => {
      const $cells = $(row).find('td');
      
      // В каждой строке может быть 2 или 4 ячейки (пара параметр-значение)
      // Формат: Label1, Value1, Label2, Value2
      for (let i = 0; i < $cells.length; i += 2) {
        const label = $($cells[i]).text().trim();
        const value = $($cells[i + 1]).text().trim();
        
        if (label && value) {
          stats[label] = value;
          console.log(`  ${label}: ${value}`);
        }
      }
    });

    // Парсим специальные атрибуты (они содержат HTML)
    const $defAttrTd = $statsTable.find('td').filter((idx, el) => 
      $(el).find('span[style*="color"]').length > 0
    );
    
    if ($defAttrTd.length > 0) {
      const attributes = {};
      $defAttrTd.find('p').each((idx, el) => {
        const text = $(el).text().trim();
        if (text) {
          const [attrName, attrValue] = text.split(',');
          if (attrName && attrValue) {
            attributes[attrName.trim()] = parseInt(attrValue.trim());
          }
        }
      });
      if (Object.keys(attributes).length > 0) {
        stats['Defence Attributes'] = attributes;
        console.log(`  Defence Attributes: ${JSON.stringify(attributes)}`);
      }
    }

    return stats;

  } catch (error) {
    console.error(`Ошибка при парсинге локального файла:`, error.message);
    return {};
  }
}

/**
 * Преобразует параметры в удобный формат
 */
function normalizeStats(stats) {
  const normalized = {};

  for (const [key, value] of Object.entries(stats)) {
    // Пропускаем объекты
    if (typeof value === 'object' && value !== null) {
      normalized[key] = value;
      continue;
    }

    // Преобразуем в числа где возможно
    const match = value.match(/(\d+)/);
    const num = match ? parseInt(match[1]) : NaN;
    normalized[key] = !isNaN(num) ? num : value;
  }

  return normalized;
}

async function main() {
  console.log('🧪 Тестирование локального парсера\n');

  const htmlPath = './data/sample_elder_red_keltir.html';

  if (!fs.existsSync(htmlPath)) {
    console.error(`✗ Файл не найден: ${htmlPath}`);
    process.exit(1);
  }

  console.log('📄 Парсинг локального HTML файла...\n');
  const stats = parseLocalNpcStats(htmlPath);

  console.log('\n📊 Преобразованные данные:');
  const normalized = normalizeStats(stats);
  console.log(JSON.stringify(normalized, null, 2));

  // Сохраняем результаты
  const outputPath = './data/test_local_parse.json';
  fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2));
  console.log(`\n✓ Результаты сохранены в ${outputPath}`);
}

main().catch(console.error);