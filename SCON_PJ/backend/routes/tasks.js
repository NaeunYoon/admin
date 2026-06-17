const router = require('express').Router();
const db     = require('../db');

async function notify(db, { userId, type, title, body, refId }) {
  if (!userId) return;
  const id = `n${Date.now()}_${userId}`;
  await db.query(
    'INSERT IGNORE INTO notifications (id, user_id, type, title, body, ref_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, type, title, body, refId]
  ).catch(() => {});
}

// 프로젝트별 태스크 조회
router.get('/', async (req, res) => {
  const { projectId } = req.query;
  const where = projectId ? 'WHERE t.project_id = ?' : '';
  const params = projectId ? [projectId] : [];
  const [tasks] = await db.query(
    `SELECT t.*,
       GROUP_CONCAT(DISTINCT tt.tag) AS tags,
       COUNT(DISTINCT cl.id)              AS checklist_total,
       SUM(CASE WHEN cl.is_done = 1 THEN 1 ELSE 0 END) AS checklist_done
     FROM tasks t
     LEFT JOIN task_tags       tt ON tt.task_id = t.id
     LEFT JOIN task_checklists cl ON cl.task_id = t.id
     ${where}
     GROUP BY t.id
     ORDER BY t.sort_order`,
    params
  );
  const result = tasks.map(t => ({
    ...t,
    tags:           t.tags ? t.tags.split(',') : [],
    startDate:      t.start_date,
    dueDate:        t.due_date,
    projectId:      t.project_id,
    assigneeId:     t.assignee_id,
    reporterId:     t.reporter_id,
    order:          t.sort_order,
    checklistTotal: Number(t.checklist_total) || 0,
    checklistDone:  Number(t.checklist_done)  || 0,
    startedAt:      t.started_at   ?? null,
    reviewedAt:     t.reviewed_at  ?? null,
    completedAt:    t.completed_at ?? null,
  }));
  res.json(result);
});

// 태스크 생성
router.post('/', async (req, res) => {
  const { id, projectId, title, description, status, priority, assigneeId, reporterId, startDate, dueDate, order = 0, tags = [] } = req.body;
  await db.query(
    'INSERT INTO tasks (id,project_id,title,description,status,priority,assignee_id,reporter_id,start_date,due_date,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [id, projectId, title, description, status, priority, assigneeId || null, reporterId, startDate || null, dueDate || null, order]
  );
  if (tags.length) {
    const vals = tags.map(tag => [id, tag]);
    await db.query('INSERT INTO task_tags (task_id, tag) VALUES ?', [vals]);
  }
  // 담당자 배정 알림 (본인 제외)
  if (assigneeId && assigneeId !== req.user.id) {
    const [[creator]] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    await notify(db, {
      userId: assigneeId,
      type:   'task_assigned',
      title:  '업무 배정',
      body:   `${creator?.name}님이 "${title}" 업무를 배정했습니다.`,
      refId:  id,
    });
  }
  res.status(201).json({ id });
});

// 태스크 수정
router.put('/:id', async (req, res) => {
  const { title, description, status, priority, assigneeId, startDate, dueDate, order, tags } = req.body;

  // 이전 상태 + 담당자 조회
  const [[old]] = await db.query('SELECT assignee_id, status AS old_status FROM tasks WHERE id = ?', [req.params.id]);
  const oldAssigneeId = old?.assignee_id;
  const oldStatus     = old?.old_status;

  // 상태 전환 타임스탬프
  const tsCol = status !== oldStatus
    ? { in_progress: 'started_at', review: 'reviewed_at', done: 'completed_at' }[status]
    : null;
  const tsExtra = tsCol ? `, ${tsCol}=NOW()` : '';

  await db.query(
    `UPDATE tasks SET title=?, description=?, status=?, priority=?, assignee_id=?, start_date=?, due_date=?, sort_order=?${tsExtra} WHERE id=?`,
    [title, description, status, priority, assigneeId || null, startDate || null, dueDate || null, order ?? 0, req.params.id]
  );
  if (tags !== undefined) {
    await db.query('DELETE FROM task_tags WHERE task_id = ?', [req.params.id]);
    if (tags.length) {
      const vals = tags.map(tag => [req.params.id, tag]);
      await db.query('INSERT INTO task_tags (task_id, tag) VALUES ?', [vals]);
    }
  }

  // 담당자가 바뀌었을 때만 알림
  if (assigneeId && assigneeId !== oldAssigneeId && assigneeId !== req.user.id) {
    const [[actor]] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    await notify(db, {
      userId: assigneeId,
      type:   'task_assigned',
      title:  '업무 배정',
      body:   `${actor?.name}님이 "${title}" 업무를 배정했습니다.`,
      refId:  req.params.id,
    });
  }

  res.json({ ok: true });
});

// 태스크 삭제
router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// 태스크 상태/순서 이동 (칸반 드래그 + 빠른 버튼)
router.patch('/:id/move', async (req, res) => {
  const { status, order } = req.body;
  const tsCol = { in_progress: 'started_at', review: 'reviewed_at', done: 'completed_at' }[status];
  if (tsCol) {
    await db.query(`UPDATE tasks SET status=?, sort_order=?, ${tsCol}=NOW() WHERE id=?`, [status, order, req.params.id]);
  } else {
    await db.query('UPDATE tasks SET status=?, sort_order=? WHERE id=?', [status, order, req.params.id]);
  }
  res.json({ ok: true });
});

module.exports = router;
