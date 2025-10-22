import axios from 'axios';
import * as cheerio from 'cheerio';

const url = 'https://wiki1.mw2.wiki/npc/20537-elder-red-keltir/live';

axios.get(url).then(r => {
  const $ = cheerio.load(r.data);
  
  console.log('=== ИЩЕМ УРОВЕНЬ ===');
  const rows = $('#result-stats table tr');
  rows.each((i, row) => {
    const $cells = $(row).find('td');
    const cellCount = $cells.length;
    if (cellCount > 0) {
      const texts = [];
      $cells.each((ci, c) => {
        texts.push($(c).text().substring(0, 20).replace(/\n/g, ' ').trim());
      });
      console.log(`TR${i} (${cellCount} cells): [${texts.join(' | ')}]`);
    }
  });
  
}).catch(e => console.log('Ошибка:', e.message));