import * as cheerio from 'cheerio';
import { readFileSync } from 'fs';

// Копируем функции из collectAllMobStats.js для тестирования
function cleanText(text) {
  return text
    .replace(/[\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMonsterCharacteristic(itemName) {
  const characteristics = [
    "Уровень", "HP", "MP", "Физ. Атк.", "Маг. Атк.", "Физ. Защ.", "Маг. Защ.",
    "Точность", "Уклонение", "Опыт", "SP", "Время возрождения", "Атрибут атаки", "Атрибуты защ"
  ];
  if (characteristics.some(char => itemName === char)) return true;
  if (itemName.includes("Адены") || itemName.includes("адены")) return true;
  return false;
}

function parseDrops(html) {
  const $ = cheerio.load(html);
  const drops = [];

  const $dropContainer = $("#drop");
  if ($dropContainer.length === 0) return drops;

  const $table = $dropContainer.find("table");
  if ($table.length === 0) return drops;

  const $rows = $table.find("tbody tr");
  
  $rows.each((rowIndex, row) => {
    const $cells = $(row).find("td");
    if ($cells.length < 3) return;
    
    const firstText = cleanText($cells.eq(0).text());
    if (firstText.includes("Шанс группы") || !firstText) return;
    
    const itemName = cleanText(firstText);
    if (isMonsterCharacteristic(itemName)) return;
    
    const amount = cleanText($cells.eq(1).text());
    const chance = cleanText($cells.eq(2).text());
    
    if (itemName && amount && chance && !chance.includes("Шанс")) {
      drops.push({ name: itemName, amount, chance });
    }
  });

  return drops;
}

function parseSpoils(html) {
  const $ = cheerio.load(html);
  const spoils = [];

  const $spoilContainer = $("#spoil");
  if ($spoilContainer.length === 0) return spoils;

  const $table = $spoilContainer.find("table");
  if ($table.length === 0) return spoils;

  const $rows = $table.find("tbody tr");
  
  $rows.each((rowIndex, row) => {
    const $cells = $(row).find("td");
    if ($cells.length < 3) return;
    
    const firstText = cleanText($cells.eq(0).text());
    if (!firstText) return;
    if (isMonsterCharacteristic(firstText)) return;
    
    const itemName = cleanText(firstText);
    const amount = cleanText($cells.eq(1).text());
    const chance = cleanText($cells.eq(2).text());
    
    if (itemName && amount && chance && !chance.toLowerCase().includes("шанс")) {
      spoils.push({ name: itemName, amount, chance });
    }
  });

  return spoils;
}

// Загружаем HTML файл
const html = readFileSync("d:\\code\\l2-mobs\\data\\test_21764.html", "utf-8");

console.log("=== DROPS ===");
const drops = parseDrops(html);
console.log(JSON.stringify(drops, null, 2));

console.log("\n=== SPOILS ===");
const spoils = parseSpoils(html);
console.log(JSON.stringify(spoils, null, 2));

console.log("\n=== ПРОВЕРКА: Есть ли дублирование? ===");
const dropNames = drops.map(d => d.name);
const spoilNames = spoils.map(s => s.name);
const duplicates = dropNames.filter(d => spoilNames.includes(d));
if (duplicates.length > 0) {
  console.log("❌ НАЙДЕНЫ ДУБЛИКАТЫ:", duplicates);
} else {
  console.log("✓ Дубликатов не найдено - парсер работает корректно!");
}
