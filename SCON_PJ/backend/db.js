const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // DATE 컬럼을 'YYYY-MM-DD' 문자열로 반환 — Date→toISOString(UTC) 변환에 의한 1일 밀림 방지
  dateStrings: ['DATE'],
});

module.exports = pool;
