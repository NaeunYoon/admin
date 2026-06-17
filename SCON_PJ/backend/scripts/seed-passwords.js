// 모든 유저의 비밀번호를 scon1234로 초기화
// 실행: node backend/scripts/seed-passwords.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db     = require('../db');

async function seed() {
  const hash  = await bcrypt.hash('scon1234', 10);
  const [res] = await db.query('UPDATE users SET password_hash = ?', [hash]);
  console.log(`비밀번호 초기화 완료 (${res.affectedRows}명) — 기본 비밀번호: scon1234`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
