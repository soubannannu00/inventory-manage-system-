require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DATABASE_NAME = 'inventory_supply_chain_db';
if (process.env.DB_NAME && process.env.DB_NAME !== DATABASE_NAME) {
  throw new Error(`Refusing setup: DB_NAME must be ${DATABASE_NAME}.`);
}

function statements(file) {
  return fs.readFileSync(file, 'utf8').split(';').map(s => s.trim()).filter(Boolean);
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: false,
  });
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.changeUser({ database: DATABASE_NAME });

    const rootDir = path.resolve(__dirname, '../..');
    for (const statement of statements(path.join(rootDir, 'database/schema.sql'))) await connection.query(statement);
    for (const statement of statements(path.join(rootDir, 'database/demo-data.sql'))) await connection.query(statement);

    const passwordHash = await bcrypt.hash('admin123', 10);
    await connection.query("INSERT IGNORE INTO users(name,email,password,role) VALUES('Admin User','admin@example.com',?,'Admin')", [passwordHash]);

    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    const required = ['users','categories','suppliers','customers','warehouses','products','purchases','sales','orders','stock_movements','settings','notifications'];
    const missing = required.filter(name => !tableNames.includes(name));
    if (missing.length) throw new Error(`Missing tables: ${missing.join(', ')}`);
    const [database] = await connection.query('SELECT DATABASE() AS name');
    if (database[0].name !== DATABASE_NAME) throw new Error('Connected database verification failed.');
    const [counts] = await connection.query('SELECT (SELECT COUNT(*) FROM products) products,(SELECT COUNT(*) FROM purchases) purchases,(SELECT COUNT(*) FROM sales) sales,(SELECT COUNT(*) FROM orders) orders');
    if (counts[0].products < 20 || counts[0].purchases < 20 || counts[0].sales < 30 || counts[0].orders < 10) throw new Error('Demo record verification failed. Run setup on an empty database.');

    console.log('Database setup successful!');
    console.log(`\nDatabase:\n${DATABASE_NAME}\n\nTables:\n${required.join('\n')}\n\nDemo data inserted successfully.`);
  } finally {
    await connection.end();
  }
}

main().catch(error => { console.error('Database setup failed:', error.message); process.exitCode = 1; });
