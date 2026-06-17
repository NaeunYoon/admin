const router = require('express').Router();
const bcrypt  = require('bcryptjs');
const db      = require('../db');

// 전체 유저 (projectIds 포함)
router.get('/', async (req, res) => {
  const [users]   = await db.query('SELECT id,name,email,role,department,avatar,created_at FROM users ORDER BY name');
  const [members] = await db.query('SELECT * FROM project_members');
  const result = users.map(u => ({
    ...u,
    projectIds: members.filter(m => m.user_id === u.id).map(m => m.project_id),
  }));
  res.json(result);
});

// 단일 유저
router.get('/:id', async (req, res) => {
  const [rows] = await db.query(
    'SELECT id,name,email,role,department,avatar,created_at FROM users WHERE id = ?', [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ message: '유저 없음' });
  const [members] = await db.query('SELECT project_id FROM project_members WHERE user_id = ?', [req.params.id]);
  res.json({ ...rows[0], projectIds: members.map(m => m.project_id) });
});

// 유저 생성 (admin only)
router.post('/', async (req, res) => {
  const { name, email, department, role = 'member', password = 'scon1234' } = req.body;
  if (!name || !email) return res.status(400).json({ message: '이름과 이메일은 필수입니다.' });

  const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (exists.length) return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });

  const id   = `u${Date.now()}`;
  const hash = await bcrypt.hash(password, 10);
  await db.query(
    'INSERT INTO users (id, name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, email, hash, role, department]
  );
  res.status(201).json({ id, name, email, role, department, projectIds: [] });
});

// 유저 수정 (role, department — admin only)
router.put('/:id', async (req, res) => {
  const { role, department } = req.body;
  await db.query('UPDATE users SET role=?, department=? WHERE id=?', [role, department, req.params.id]);
  res.json({ ok: true });
});

// 유저 삭제 (admin only)
router.delete('/:id', async (req, res) => {
  const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: '유저 없음' });
  if (rows[0].role === 'admin') {
    const [admins] = await db.query("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'");
    if (admins[0].cnt <= 1) return res.status(400).json({ message: '마지막 관리자는 삭제할 수 없습니다.' });
  }
  await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
