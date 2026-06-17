const router = require('express').Router();
const db     = require('../db');

// 체크리스트 목록
router.get('/:taskId', async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM task_checklists WHERE task_id = ? ORDER BY sort_order, created_at',
    [req.params.taskId]
  );
  res.json(rows);
});

// 항목 추가
router.post('/:taskId', async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: '내용을 입력해주세요.' });
  const [count] = await db.query('SELECT COUNT(*) as cnt FROM task_checklists WHERE task_id = ?', [req.params.taskId]);
  const id = `cl${Date.now()}`;
  await db.query(
    'INSERT INTO task_checklists (id, task_id, content, is_done, sort_order) VALUES (?, ?, ?, 0, ?)',
    [id, req.params.taskId, content.trim(), count[0].cnt]
  );
  const [rows] = await db.query('SELECT * FROM task_checklists WHERE id = ?', [id]);
  res.status(201).json(rows[0]);
});

// 항목 수정 (체크 토글 또는 내용 변경)
router.patch('/:taskId/:itemId', async (req, res) => {
  const { is_done, content } = req.body;
  const fields = [];
  const vals   = [];
  if (is_done !== undefined) { fields.push('is_done = ?'); vals.push(is_done ? 1 : 0); }
  if (content  !== undefined) { fields.push('content = ?');  vals.push(content.trim()); }
  if (!fields.length) return res.status(400).json({ message: '변경할 내용 없음' });
  vals.push(req.params.itemId);
  await db.query(`UPDATE task_checklists SET ${fields.join(', ')} WHERE id = ?`, vals);
  res.json({ ok: true });
});

// 항목 삭제
router.delete('/:taskId/:itemId', async (req, res) => {
  await db.query('DELETE FROM task_checklists WHERE id = ? AND task_id = ?',
    [req.params.itemId, req.params.taskId]);
  res.json({ ok: true });
});

module.exports = router;
