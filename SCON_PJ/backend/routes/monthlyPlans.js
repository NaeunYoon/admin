const router = require('express').Router();
const db     = require('../db');

function toDateStr(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function formatPlan(row) {
  return {
    id:           row.id,
    userId:       row.user_id,
    userName:     row.user_name   ?? null,
    department:   row.department  ?? null,
    projectName:  row.project_name ?? null,
    category:     row.category    ?? null,
    taskName:     row.task_name,
    assigneeNote: row.assignee_note ?? null,
    startDate:    toDateStr(row.start_date),
    endDate:      toDateStr(row.end_date),
    progress:     row.progress ?? 0,
    priority:     row.priority ?? 1,
  };
}

// GET /api/monthly-plans?year=2026
router.get('/', async (req, res) => {
  try {
    const { year } = req.query;
    const clauses = [];
    const params  = [];

    if (year) {
      const y = parseInt(year, 10);
      clauses.push('mp.start_date <= ?');
      params.push(`${y}-12-31`);
      clauses.push('mp.end_date >= ?');
      params.push(`${y}-01-01`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT mp.*, u.name AS user_name, u.department
       FROM monthly_plans mp
       LEFT JOIN users u ON u.id = mp.user_id
       ${where}
       ORDER BY mp.priority ASC, mp.start_date ASC, mp.created_at ASC`,
      params,
    );

    res.json(rows.map(formatPlan));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/monthly-plans
router.post('/', async (req, res) => {
  try {
    const { projectName, category, taskName, assigneeNote, startDate, endDate, progress, priority } = req.body;
    if (!taskName || !startDate || !endDate) {
      return res.status(400).json({ error: '업무내용, 시작일, 종료일은 필수입니다.' });
    }

    const id = `mp${Date.now()}_${req.user.id}`;
    await db.query(
      `INSERT INTO monthly_plans
         (id, user_id, project_name, category, task_name, assignee_note, start_date, end_date, progress, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, projectName || null, category || null, taskName,
       assigneeNote || null, startDate, endDate, progress ?? 0, priority ?? 1],
    );

    const [[row]] = await db.query(
      `SELECT mp.*, u.name AS user_name, u.department
       FROM monthly_plans mp LEFT JOIN users u ON u.id = mp.user_id
       WHERE mp.id = ?`,
      [id],
    );
    res.status(201).json(formatPlan(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/monthly-plans/:id
router.put('/:id', async (req, res) => {
  try {
    const [[plan]] = await db.query('SELECT user_id FROM monthly_plans WHERE id = ?', [req.params.id]);
    if (!plan) return res.status(404).json({ error: 'Not found' });
    if (plan.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '본인의 계획만 수정할 수 있습니다.' });
    }

    const { projectName, category, taskName, assigneeNote, startDate, endDate, progress, priority } = req.body;
    await db.query(
      `UPDATE monthly_plans
       SET project_name=?, category=?, task_name=?, assignee_note=?,
           start_date=?, end_date=?, progress=?, priority=?, updated_at=NOW()
       WHERE id=?`,
      [projectName || null, category || null, taskName, assigneeNote || null,
       startDate, endDate, progress ?? 0, priority ?? 1, req.params.id],
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/monthly-plans/:id
router.delete('/:id', async (req, res) => {
  try {
    const [[plan]] = await db.query('SELECT user_id FROM monthly_plans WHERE id = ?', [req.params.id]);
    if (!plan) return res.status(404).json({ error: 'Not found' });
    if (plan.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '본인의 계획만 삭제할 수 있습니다.' });
    }

    await db.query('DELETE FROM monthly_plans WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
