import { parseMobStats, normalizeStats } from './parseMobStats.js';

console.log('🧪 ТЕСТИРОВАНИЕ ПАРСЕРА НА HTML\n');

// Тестируем парсер на локальном HTML файле
const htmlPath = './data/test_npc_20537.html';

console.log(`📄 Парсим файл: ${htmlPath}\n`);

// Шаг 1: Парсим сырые данные
const rawStats = parseMobStats(htmlPath, true);

if (!rawStats) {
  console.error('❌ Ошибка парсинга');
  process.exit(1);
}

console.log('✅ СЫРЫЕ ДАННЫЕ:');
console.log(JSON.stringify(rawStats, null, 2));

// Шаг 2: Нормализуем данные
const normalized = normalizeStats(rawStats);

console.log('\n✅ НОРМАЛИЗОВАННЫЕ ДАННЫЕ:');
console.log(JSON.stringify(normalized, null, 2));

// Шаг 3: Подготавливаем для базы данных
const mobData = {
  id: 20537,
  name: 'Elder Red Keltir',
  stats: normalized,
  level: normalized['Level'],
  hp: normalized['HP'],
  mp: normalized['MP'],
  exp: normalized['EXP'],
  sp: normalized['SP'],
  pAtk: normalized['P.Atk.'],
  mAtk: normalized['M.Atk.'],
  pDef: normalized['P.Def.'],
  mDef: normalized['M.Def.'],
  accuracy: normalized['Accuracy'],
  evasion: normalized['Evasion'],
  respawnTime: normalized['Respawn Time'],
  defenceAttributes: normalized['Defence Attributes'] || {}
};

console.log('\n✅ ПОДГОТОВЛЕННЫЕ ДАННЫЕ ДЛЯ БД:');
console.log(JSON.stringify(mobData, null, 2));

// Сохраняем результат
import fs from 'fs';
fs.writeFileSync('./data/parser_test_result.json', JSON.stringify(mobData, null, 2));
console.log('\n📁 Результат сохранен в: data/parser_test_result.json');