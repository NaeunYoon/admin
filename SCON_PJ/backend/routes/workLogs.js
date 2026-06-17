const router = require('express').Router();
const db     = require('../db');

// 업무일지 조회
router.get('/', async (req, res) => {
  try {
    const { userId, taskId, projectId, date, startDate, endDate } = req.query;
    const clauses = [];
    const params  = [];

    if (userId)    { clauses.push('wl.user_id = ?');  params.push(userId); }
    if (taskId)    { clauses.push('wl.task_id = ?');  params.push(taskId); }
    // projectId: 직접 등록된 project_id 또는 연결된 task의 project_id
    if (projectId) {
      clauses.push('(wl.project_id = ? OR t.project_id = ?)');
      params.push(projectId, projectId);
    }
    if (date)      { clauses.push('wl.log_date = ?'); params.push(date); }
    if (startDate) { clauses.push('wl.log_date >= ?'); params.push(startDate); }
    if (endDate)   { clauses.push('wl.log_date <= ?'); params.push(endDate); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [logs] = await db.query(
      `SELECT wl.*,
              u.name AS user_name, u.department AS user_department, u.role AS user_role,
              t.title AS task_title, t.project_id AS task_project_id
       FROM work_logs wl
       LEFT JOIN users u ON u.id = wl.user_id
       LEFT JOIN tasks t ON t.id = wl.task_id
       ${where}
       ORDER BY wl.log_date DESC, wl.created_at ASC`,
      params
    );

    res.json(logs.map(l => ({
      id:             l.id,
      userId:         l.user_id,
      taskId:         l.task_id         ?? null,
      projectId:      l.project_id      ?? l.task_project_id ?? null,
      taskTitle:      l.task_title      ?? null,
      taskProjectId:  l.task_project_id ?? null,
      logDate:        l.log_date instanceof Date
                        ? l.log_date.toISOString().slice(0, 10)
                        : String(l.log_date).slice(0, 10),
      startTime:      l.start_time,
      endTime:        l.end_time  ?? null,
      content:        l.content,
      category:       l.category  ?? null,
      userName:       l.user_name,
      userDepartment: l.user_department,
      userRole:       l.user_role,
      createdAt:      l.created_at,
      updatedAt:      l.updated_at,
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 업무일지 생성
router.post('/', async (req, res) => {
  try {
    const { taskId, projectId, logDate, startTime, endTime, content, category } = req.body;
    if (!logDate || !content) {
      return res.status(400).json({ error: '날짜와 내용은 필수입니다.' });
    }
    const id = `wl${Date.now()}_${req.user.id}`;
    await db.query(
      'INSERT INTO work_logs (id, user_id, task_id, project_id, log_date, start_time, end_time, content, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, taskId || null, projectId || null, logDate, startTime || null, endTime || null, content, category || null]
    );
    // 새로 만든 로그에 태스크/유저 정보 포함해서 반환
    const [[row]] = await db.query(
      `SELECT wl.*, u.name AS user_name, u.department AS user_department, u.role AS user_role,
              t.title AS task_title, t.project_id AS task_project_id
       FROM work_logs wl
       LEFT JOIN users u ON u.id = wl.user_id
       LEFT JOIN tasks t ON t.id = wl.task_id
       WHERE wl.id = ?`,
      [id]
    );
    res.status(201).json({
      id:             row.id,
      userId:         row.user_id,
      taskId:         row.task_id         ?? null,
      projectId:      row.project_id      ?? row.task_project_id ?? null,
      taskTitle:      row.task_title      ?? null,
      taskProjectId:  row.task_project_id ?? null,
      logDate:        row.log_date instanceof Date ? row.log_date.toISOString().slice(0, 10) : String(row.log_date).slice(0, 10),
      startTime:      row.start_time,
      endTime:        row.end_time  ?? null,
      content:        row.content,
      category:       row.category  ?? null,
      userName:       row.user_name,
      userDepartment: row.user_department,
      userRole:       row.user_role,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 업무일지 수정
router.put('/:id', async (req, res) => {
  try {
    const [[log]] = await db.query('SELECT user_id FROM work_logs WHERE id = ?', [req.params.id]);
    if (!log) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && log.user_id !== req.user.id) {
      return res.status(403).json({ error: '본인 업무일지만 수정할 수 있습니다.' });
    }
    const { taskId, projectId, logDate, startTime, endTime, content, category } = req.body;
    await db.query(
      'UPDATE work_logs SET task_id=?, project_id=?, log_date=?, start_time=?, end_time=?, content=?, category=?, updated_at=NOW() WHERE id=?',
      [taskId || null, projectId || null, logDate, startTime, endTime || null, content, category || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 업무일지 삭제
router.delete('/:id', async (req, res) => {
  try {
    const [[log]] = await db.query('SELECT user_id FROM work_logs WHERE id = ?', [req.params.id]);
    if (!log) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && log.user_id !== req.user.id) {
      return res.status(403).json({ error: '본인 업무일지만 삭제할 수 있습니다.' });
    }
    await db.query('DELETE FROM work_logs WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
