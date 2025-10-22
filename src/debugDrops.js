import axios from 'axios';
import * as cheerio from 'cheerio';

const url = 'https://wiki1.mw2.wiki/npc/20537-elder-red-keltir/live';

axios.get(url).then(r => {
  const $ = cheerio.load(r.data);
  
  console.log('=== ТАБЛИЦЫ ===');
  $('table').each((i, t) => {
    const rows = $(t).find('tr').length;
    const firstCell = $(t).find('td').eq(0).text().substring(0, 30);
    console.log(`Table ${i}: ${rows} rows, first cell: "${firstCell}"`);
  });
  
  console.log('\n=== ИЩЕМ ДРОПЫ ===');
  $('table').each((i, t) => {
    const text = $(t).text();
    if (text.includes('Предмет') || text.includes('Количество') || text.includes('Шанс')) {
      console.log(`\nТаблица ${i} содержит дропы!`);
      const $rows = $(t).find('tr');
      console.log(`  Всего TR: ${$rows.length}`);
      $rows.slice(0, 8).each((ri, r) => {
        const $cells = $(r).find('td');
        const cellTexts = [];
        $cells.each((ci, c) => {
          cellTexts.push($(c).text().trim().substring(0, 30));
        });
        console.log(`  TR${ri}: [${cellTexts.join(' | ')}]`);
      });
    }
  });
  
}).catch(e => console.log('Ошибка:', e.message));