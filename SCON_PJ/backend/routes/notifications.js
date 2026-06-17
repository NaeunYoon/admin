const router = require('express').Router();
const db     = require('../db');

// 내 알림 목록
router.get('/', async (req, res) => {
  const [rows] = await db.query(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
    [req.user.id]
  );
  res.json(rows);
});

// 전체 읽음 처리 (/:id/read 보다 먼저 등록해야 충돌 없음)
router.patch('/read-all', async (req, res) => {
  await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ ok: true });
});

// 단건 읽음 처리
router.patch('/:id/read', async (req, res) => {
  await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
