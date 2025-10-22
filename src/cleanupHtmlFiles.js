import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

console.log('🧹 ОЧИСТКА HTML ФАЙЛОВ\n');
console.log('='.repeat(60));

// Ищем все HTML файлы
const htmlFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.html'));

if (htmlFiles.length === 0) {
  console.log('\n✅ HTML файлов не найдено. Папка чистая!');
  process.exit(0);
}

console.log(`\n📄 Найдено HTML файлов: ${htmlFiles.length}\n`);

// Показываем какие файлы будут удалены
console.log('Файлы для удаления:');
htmlFiles.forEach((f, i) => {
  console.log(`  ${i + 1}. ${f}`);
});

console.log('\n⚠️  Убедитесь что data/mobs_full_database.json существует!');
console.log('   (Это гарантирует что все данные сохранены)\n');

// Проверяем что БД существует
const dbPath = path.join(DATA_DIR, 'mobs_full_database.json');
const dbWithDataPath = path.join(DATA_DIR, 'mobs_with_data.json');

const dbExists = fs.existsSync(dbPath) || fs.existsSync(dbWithDataPath);

if (!dbExists) {
  console.error('❌ ОШИБКА: БД не найдена!');
  console.error('   Сначала запустите: npm run build-db');
  process.exit(1);
}

console.log('✅ БД найдена - безопасно удалять HTML\n');

// Удаляем файлы
let deleted = 0;
htmlFiles.forEach(f => {
  try {
    const filePath = path.join(DATA_DIR, f);
    fs.unlinkSync(filePath);
    console.log(`  ✓ Удален: ${f}`);
    deleted++;
  } catch (error) {
    console.error(`  ✗ Ошибка при удалении ${f}: ${error.message}`);
  }
});

console.log(`\n✅ Удалено файлов: ${deleted}\n`);
console.log('='.repeat(60));
console.log('\n💾 Все данные сохранены в JSON формате\n');

// Показываем размеры сохраненных файлов
console.log('📊 Размеры файлов БД:\n');

const files = [
  'mobs_full_database.json',
  'mobs_with_data.json',
  'efficiency_analysis.json',
  'mobs_adena.json'
];

files.forEach(filename => {
  const filepath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filepath)) {
    const stats = fs.statSync(filepath);
    const size = (stats.size / 1024).toFixed(1);
    console.log(`  ${filename.padEnd(30)} ${size} KB`);
  }
});

console.log('\n✅ Готово! HTML файлы удалены.\n');