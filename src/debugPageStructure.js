import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const BASE_URL = 'https://wiki1.mw2.wiki/item/57-adena/live';

async function debugPageStructure() {
  try {
    console.log('Загружаю страницу 1...\n');
    
    const response = await axios.get(BASE_URL, {
      params: {
        sortField: 'count_up_to',
        sortType: 4,
        dropPage: 1
      }
    });

    // Сохраняем HTML для анализа
    fs.writeFileSync('./debug_page.html', response.data);
    console.log('✓ HTML сохранён в debug_page.html\n');

    const $ = cheerio.load(response.data);
    
    // Выводим структуру первой строки
    console.log('=== АНАЛИЗ ПЕРВОЙ СТРОКИ ТАБЛИЦЫ ===\n');
    
    const firstRow = $('table.table tbody tr').first();
    console.log('HTML первой строки:');
    console.log(firstRow.html());
    
    console.log('\n\n=== ПОПЫТКА ПАРСИНГА ===\n');
    
    const $npcLink = firstRow.find('a.item-name');
    console.log('NPC Link найдена:', $npcLink.length > 0 ? '✓' : '✗');
    console.log('href:', $npcLink.attr('href'));
    
    const npcName = $npcLink.find('.item-name__content').text().trim();
    console.log('NPC Name:', npcName);
    
    const level = $npcLink.find('.item-name__additional').text().trim();
    console.log('Level:', level);
    
    const $cells = firstRow.find('td');
    console.log('\n\nВсе TD элементы в строке:');
    $cells.each((i, el) => {
      const text = $(el).text().trim().substring(0, 100);
      console.log(`  TD[${i}]: "${text}"`);
    });

  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

debugPageStructure();