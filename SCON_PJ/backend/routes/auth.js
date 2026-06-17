const router  = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });

  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!rows.length)
    return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

  const user = rows[0];
  if (!user.password_hash)
    return res.status(401).json({ message: '비밀번호가 설정되지 않은 계정입니다. 관리자에게 문의하세요.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid)
    return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

  const payload = { id: user.id, email: user.email, name: user.name, role: user.role };
  const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// 어드민(인트라넷) SSO — 어드민이 발급한 핸드오프 토큰을 검증하고
// 사용자를 동기화(upsert)한 뒤 프로젝트앱 토큰을 발급한다. (자체 로그인 불필요)
router.post('/sso', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'SSO 토큰이 없습니다.' });

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'SSO 토큰이 유효하지 않거나 만료되었습니다.' });
  }

  const { id, name, email } = claims;
  let role = claims.role;
  const department = claims.department ?? null;
  if (!id || !email || !name)
    return res.status(400).json({ message: 'SSO 토큰에 필수 정보가 없습니다.' });
  if (!['admin', 'manager', 'member'].includes(role)) role = 'member';

  // 어드민 직원 동기화 (email은 갱신하지 않음 — 고유키 충돌 방지)
  await db.query(
    `INSERT INTO users (id, name, email, role, department)
       VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), department = VALUES(department)`,
    [id, name, email, role, department]
  );

  const sel = 'SELECT id, name, email, role, department, avatar, created_at FROM users WHERE ';
  let [rows] = await db.query(sel + 'id = ?', [id]);
  if (!rows.length) [rows] = await db.query(sel + 'email = ?', [email]);
  const user = rows[0];

  const appToken = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token: appToken, user });
});

module.exports = router;
