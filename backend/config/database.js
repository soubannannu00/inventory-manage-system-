const mysql = require('mysql2/promise');
require('dotenv').config();
const DATABASE_NAME = 'inventory_supply_chain_db';
if (process.env.DB_NAME !== DATABASE_NAME) {
  throw new Error(`Refusing to connect: DB_NAME must be ${DATABASE_NAME}.`);
}
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
});
module.exports = pool;
