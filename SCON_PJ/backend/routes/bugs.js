const router = require('express').Router();
const db     = require('../db');

const map = b => ({
  id:          b.id,
  title:       b.title,
  description: b.description ?? '',
  status:      b.status,
  severity:    b.severity,
  reporterId:  b.reporter_id,
  reporterName: b.reporter_name,
  createdAt:   b.created_at,
  updatedAt:   b.updated_at,
});

// 목록 — 미해결 먼저, 최신순
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM bugs ORDER BY FIELD(status,'접수','진행중','보류','해결'), created_at DESC`
    );
    res.json(rows.map(map));
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// 버그 신고
router.post('/', async (req, res) => {
  try {
    const { title, description, severity } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: '제목은 필수입니다.' });
    const id = `bug${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.query(
      'INSERT INTO bugs (id, title, description, status, severity, reporter_id, reporter_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, title.trim(), description || null, '접수', severity || '보통', req.user.id, req.user.name ?? null]
    );
    const [[row]] = await db.query('SELECT * FROM bugs WHERE id = ?', [id]);
    res.status(201).json(map(row));
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// 수정 (상태/제목/설명/심각도) — 모든 구성원이 처리(고침) 가능
router.patch('/:id', async (req, res) => {
  try {
    const [[bug]] = await db.query('SELECT * FROM bugs WHERE id = ?', [req.params.id]);
    if (!bug) return res.status(404).json({ error: 'Not found' });
    const { title, description, status, severity } = req.body;
    await db.query(
      'UPDATE bugs SET title=?, description=?, status=?, severity=?, updated_at=NOW() WHERE id=?',
      [
        title ?? bug.title,
        description !== undefined ? description : bug.description,
        status ?? bug.status,
        severity ?? bug.severity,
        req.params.id,
      ]
    );
    const [[row]] = await db.query('SELECT * FROM bugs WHERE id = ?', [req.params.id]);
    res.json(map(row));
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// 삭제 — 신고자 또는 관리자
router.delete('/:id', async (req, res) => {
  try {
    const [[bug]] = await db.query('SELECT reporter_id FROM bugs WHERE id = ?', [req.params.id]);
    if (!bug) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && bug.reporter_id !== req.user.id)
      return res.status(403).json({ error: '본인 신고 또는 관리자만 삭제할 수 있습니다.' });
    await db.query('DELETE FROM bugs WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

module.exports = router;
