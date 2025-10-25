import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

const runSQLScript = async () => {
  try {
    console.log('🔧 Executing SQL script...');

    // Load the SQL script
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Execute the SQL script
    await pool.query(sql);

    console.log('✅ Tables are ready!');
  } catch (error) {
    console.error('❌ Error executing SQL script:', error);
  } finally {
    await pool.end();
  }
};

export default runSQLScript;
