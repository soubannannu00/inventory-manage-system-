# Stockwise Inventory & Supply Chain

Responsive inventory management using Express, MySQL/MariaDB, HTML/CSS/JavaScript, and Chart.js. The app is configured exclusively for the separate `inventory_supply_chain_db` database. The backend exits rather than connecting if `DB_NAME` is set to another value.

## Requirements
- Node.js 18+
- MySQL 8+ or MariaDB 10.5+

## Setup
1. Start MySQL/MariaDB.
2. Configure `backend/.env` with the host, port, user, password, and `DB_NAME=inventory_supply_chain_db`. Never put DB credentials in frontend files.
3. From the `backend` folder, install packages: `npm install`.
4. Create the new database, tables, and demo records: `npm run setup`. This connects without selecting a database, creates/selects only `inventory_supply_chain_db`, then loads the project schema and demo data.
5. Start the app: `npm start`.
6. Open http://localhost:3000.

Demo login: `admin@example.com` / `admin123`.

## Database isolation and health check
`backend/config/database.js` enforces the exact database name `inventory_supply_chain_db`. `GET /api/health` checks the active MySQL database and reports its name. The setup script also verifies the selected database, all 12 expected tables, and minimum demo counts. The project does not select or write to `inventory_db`.

## API
All routes except login and health require `Authorization: Bearer <token>`.
- `GET /api/health`; `POST /api/auth/login`; `GET /api/auth/me`
- CRUD endpoints: `/api/products`, `/api/categories`, `/api/suppliers`, `/api/customers`, `/api/warehouses`, `/api/orders`
- `GET,POST /api/purchases`; `DELETE /api/purchases/:id` (refuses purchases with linked stock-movement history); `GET,POST /api/sales`
- `GET /api/inventory`, `/api/stock-movements`, `/api/dashboard`, `/api/reports`, `/api/notifications`
- `PUT /api/notifications/:id/read`; `GET,PUT /api/profile`; `GET,PUT /api/settings`

Purchases and sales use database transactions. Purchase receipts increase stock and record a movement. Sales lock the product row, reject insufficient stock, decrement inventory, and record a movement. Demo SQL targets only `inventory_supply_chain_db` and is intended for initial setup. Keep `.env` private; it is ignored by git.
