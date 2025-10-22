import axios from 'axios';
import * as cheerio from 'cheerio';

const url = 'https://wiki1.mw2.wiki/npc/20537-elder-red-keltir/live';

axios.get(url).then(r => {
  const $ = cheerio.load(r.data);
  
  console.log('=== НАЙДЕННЫЕ ID ЭЛЕМЕНТОВ ===');
  const elements = ['result-stats', 'infobox', 'stats', 'monster-stats', 'creature-stats'];
  elements.forEach(id => {
    console.log(`#${id}:`, $(`#${id}`).length > 0 ? '✓ НАЙДЕНА' : '✗ нет');
  });
  
  console.log('\n=== КЛАССЫ ЭЛЕМЕНТОВ ===');
  $('*[class*="stat"]').slice(0, 5).each((i, el) => {
    console.log(`  ${i}: class="${$(el).attr('class')}" text="${$(el).text().substring(0, 40)}"`);
  });
  
  console.log('\n=== ПЕРВЫЕ 10 TR В ТАБЛИЦАХ ===');
  $('table tr').slice(0, 10).each((i, tr) => {
    const text = $(tr).text().trim().substring(0, 80);
    console.log(`  TR${i}: ${text}`);
  });
  
  console.log('\n=== ИЩЕМ "Level" ===');
  $('*').each((i, el) => {
    if ($(el).text().includes('Level')) {
      console.log(`Найдено в <${$(el).prop('tagName')}> class="${$(el).attr('class')}"`);
      console.log(`  Текст: ${$(el).text().substring(0, 100)}`);
      return false; // break after first match
    }
  });
  
}).catch(e => console.log('Ошибка:', e.message));