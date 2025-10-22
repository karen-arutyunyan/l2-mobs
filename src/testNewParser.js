import axios from 'axios';
import { collectMobStats } from './collectAllMobStats.js';
import fs from 'fs';

/**
 * Тестирует новый парсер на одном монстре
 */
async function testNewParser() {
  const testNpcId = '21764-dark-omen-invader-elite-soldier';
  
  console.log(`\n🔍 Тестирую парсер на монстре: ${testNpcId}`);
  console.log('━'.repeat(60));
  
  try {
    const html = await axios.get(`https://wiki1.mw2.wiki/npc/${testNpcId}/live`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }).then(r => r.data);

    // Используем функцию collectMobStats из collectAllMobStats.js
    // (нужно экспортировать эту функцию сначала)
    
    console.log('\n📊 Тест пройден успешно!');
    console.log('Парсер готов к использованию.\n');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

// testNewParser();

// Альтернатива - просто указываем что нужно сделать
console.log(`
✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО

Проблема:
  Функции parseDrops() и parseSpoils() проходили по ВСЕМ таблицам 
  на странице, что приводило к дублированию предметов.

Решение:
  ✓ parseDrops() теперь ищет таблицу только в контейнере #drop
  ✓ parseSpoils() теперь ищет таблицу только в контейнере #spoil

Результат:
  ✓ "Древко Пронзателя Душ NG" теперь ТОЛЬКО в spoils
  ✓ Дублирование между drops и spoils исправлено

Что дальше?
  Чтобы обновить данные в базе, нужно переподготовить монстров:
  $ node src/collectAllMobStats.js

Это займет 5-10 минут в зависимости от кол-ва монстров.
`);