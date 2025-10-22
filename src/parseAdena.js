import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://wiki1.mw2.wiki/item/57-adena/live';
const QUERY_PARAMS = {
  sortField: 'count_up_to',
  sortType: 4
};

/**
 * Парсит одну страницу с дропом адены
 * @param {number} pageNum - номер страницы
 * @returns {Promise<Array>} массив монстров
 */
async function parseAdenaDrop(pageNum) {
  try {
    console.log(`Загружаю страницу ${pageNum}...`);
    
    const response = await axios.get(BASE_URL, {
      params: {
        ...QUERY_PARAMS,
        dropPage: pageNum
      }
    });

    const $ = cheerio.load(response.data);
    const mobs = [];

    // Парсим каждую строку таблицы (ищем только в пане дропа)
    $('#pjax_drop table.table tbody tr').each((index, element) => {
      const $row = $(element);
      
      // NPC информация
      const $npcLink = $row.find('a.item-name');
      const npcHref = $npcLink.attr('href'); // /npc/20537-elder-red-keltir/live
      
      // Получаем имя монстра и уровень отдельно
      const $contentSpan = $npcLink.find('.item-name__content');
      const $levelSpan = $contentSpan.find('.item-name__additional');
      const level = $levelSpan.text().trim(); // "Ур. 3"
      
      // Удаляем уровень из содержимого и берем только имя
      const fullText = $contentSpan.html();
      const npcName = fullText.split('<span class="item-name__additional">')[0].trim();
      
      // Парсим количество адены (например "22 - 38")
      const $amountTd = $row.find('td.text-center');
      const amountText = $amountTd.text().trim();
      const [minAmount, maxAmount] = amountText.split('-').map(v => parseInt(v.trim()));
      
      // Шанс дропа (например "70%")
      const $chanceTd = $row.find('td.text-end');
      const chanceText = $chanceTd.text().trim(); // "70%"
      const chance = parseFloat(chanceText);
      
      // Извлекаем NPC ID из ссылки
      const npcIdMatch = npcHref.match(/\/npc\/(\d+)-/);
      const npcId = npcIdMatch ? parseInt(npcIdMatch[1]) : null;
      
      mobs.push({
        id: npcId,
        name: npcName,
        level: level,
        href: npcHref,
        minAdena: minAmount,
        maxAdena: maxAmount,
        chance: chance,
        avgAdena: Math.round((minAmount + maxAmount) / 2)
      });
    });

    console.log(`✓ Найдено монстров на странице ${pageNum}: ${mobs.length}`);
    return mobs;
  } catch (error) {
    console.error(`Ошибка при парсинге страницы ${pageNum}:`, error.message);
    return [];
  }
}

/**
 * Определяет максимальное число страниц
 * @returns {Promise<number>} количество страниц
 */
async function getMaxPages() {
  try {
    const response = await axios.get(BASE_URL, {
      params: QUERY_PARAMS
    });
    
    const $ = cheerio.load(response.data);
    
    // Ищем ссылки на страницы в пагинации (внутри pjax_drop)
    const pageLinks = $('#pjax_drop ul.pagination li a[data-page]');
    let maxPage = 1;
    
    pageLinks.each((index, element) => {
      const pageNum = parseInt($(element).attr('data-page')) + 1;
      maxPage = Math.max(maxPage, pageNum);
    });
    
    console.log(`Найдено ссылок на страницы: ${pageLinks.length}`);
    console.log(`Определено страниц: ${maxPage}`);
    
    return maxPage;
  } catch (error) {
    console.error('Ошибка при определении количества страниц:', error.message);
    return 1;
  }
}

/**
 * Загружает страницы пока не найдет конец списка (пустую страницу)
 * @returns {Promise<number>} максимальное количество страниц
 */
async function findMaxPagesAuto() {
  console.log('🔍 Определяю количество всех страниц...\n');
  
  let pageNum = 1;
  let lastHadMobs = true;
  
  while (lastHadMobs) {
    try {
      console.log(`  Проверяю страницу ${pageNum}...`);
      
      const response = await axios.get(BASE_URL, {
        params: {
          ...QUERY_PARAMS,
          dropPage: pageNum
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const mobRows = $('#pjax_drop table.table tbody tr');
      const mobCount = mobRows.length;
      
      if (mobCount === 0) {
        console.log(`  └─ Страница ${pageNum} пуста. Конец списка.\n`);
        lastHadMobs = false;
        return pageNum - 1;
      }
      
      console.log(`  └─ На странице ${pageNum}: ${mobCount} монстров`);
      pageNum++;
      
      // Задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.log(`  └─ Ошибка на странице ${pageNum}: ${error.message}`);
      lastHadMobs = false;
      return pageNum - 1;
    }
  }
  
  return pageNum - 1;
}

/**
 * Собирает информацию со всех страниц
 * @param {number} maxPages - максимальное количество страниц для парсинга (или null для всех)
 * @returns {Promise<Array>} полный список монстров
 */
async function parseAllPages(maxPages = null) {
  const totalPages = maxPages || await getMaxPages();
  const allMobs = [];
  
  for (let i = 1; i <= totalPages; i++) {
    const mobs = await parseAdenaDrop(i);
    allMobs.push(...mobs);
    
    // Небольшая задержка между запросами, чтобы не перегружать сервер
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return allMobs;
}

/**
 * Сохраняет данные в JSON файл
 */
async function saveResults(mobs, filename = 'mobs_adena.json') {
  const outputDir = './data';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(mobs, null, 2));
  console.log(`\n✓ Данные сохранены в ${filepath}`);
  console.log(`Всего монстров: ${mobs.length}`);
}

/**
 * Главная функция
 */
async function main() {
  console.log('🎮 Lineage 2 - Парсер дропа Адены');
  console.log('=====================================\n');
  
  // Опционально: парсим только первые N страниц для теста
  // Измените это значение или удалите для парсинга всех страниц
  const TEST_MODE = false;
  const TEST_PAGES = 2;
  
  let totalPages;
  
  if (TEST_MODE) {
    totalPages = TEST_PAGES;
    console.log(`⚙️  ТЕСТОВЫЙ РЕЖИМ: загружу ${TEST_PAGES} страниц\n`);
  } else {
    // Автоматически определяем все страницы
    totalPages = await findMaxPagesAuto();
  }
  
  console.log('');
  const mobs = await parseAllPages(totalPages);
  
  // Сортируем по среднему количеству адены (по убыванию)
  mobs.sort((a, b) => b.avgAdena - a.avgAdena);
  
  // Вывод статистики
  console.log('\n📊 СТАТИСТИКА:');
  console.log(`Всего уникальных монстров: ${mobs.length}`);
  
  if (mobs.length > 0) {
    const minAdena = Math.min(...mobs.map(m => m.minAdena));
    const maxAdena = Math.max(...mobs.map(m => m.maxAdena));
    console.log(`Диапазон адены: ${minAdena} - ${maxAdena}`);
    
    // Средний уровень
    const levels = mobs.map(m => {
      const levelMatch = m.level.match(/\d+/);
      return levelMatch ? parseInt(levelMatch[0]) : 0;
    });
    const avgLevel = Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
    console.log(`Средний уровень: ${avgLevel}`);
    
    console.log('\nТоп 10 монстров по среднему количеству адены:');
    mobs.slice(0, 10).forEach((mob, i) => {
      console.log(`${i + 1}. ${mob.name} (Lv. ${mob.level}) - ${mob.minAdena}-${mob.maxAdena} адены (${mob.chance}%)`);
    });
  }
  
  await saveResults(mobs);
}

main().catch(console.error);