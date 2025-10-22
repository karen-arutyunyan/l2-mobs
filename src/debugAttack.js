import axios from 'axios';
import * as cheerio from 'cheerio';

const url = 'https://wiki1.mw2.wiki/npc/20537-elder-red-keltir/live';

axios.get(url).then(r => {
  const $ = cheerio.load(r.data);
  
  const $statsTable = $('#result-stats table');
  const $rows = $statsTable.find('tr');
  
  $rows.each((rowIndex, row) => {
    const $cells = $(row).find('td');
    
    // Проверим третью строку (Физ. Атк)
    if (rowIndex === 3) {
      console.log(`\n=== TR3 (Attack) ===`);
      $cells.each((i, cell) => {
        const text = $(cell).text().trim();
        console.log(`Cell[${i}]: "${text}"`);
      });
      
      // Попробуем парсить
      console.log('\n=== ПАРСИНГ ===');
      for (let i = 0; i < $cells.length; i += 2) {
        const cellLabel = $cells.eq(i).text().trim();
        const cellValue = $cells.eq(i + 1).text().trim();
        console.log(`Label[${i}]: "${cellLabel}" => Value[${i+1}]: "${cellValue}"`);
        
        if (cellLabel === 'Физ. Атк.') {
          console.log('  ✓ Найден Физ. Атк.!');
        }
      }
    }
  });
  
}).catch(e => console.log('Ошибка:', e.message));