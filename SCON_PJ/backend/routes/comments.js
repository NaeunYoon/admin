const router = require('express').Router();
const db     = require('../db');

// 태스크 댓글 목록
router.get('/:taskId', async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.*, u.name AS author_name, u.department AS author_department
     FROM comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.task_id = ?
     ORDER BY c.created_at ASC`,
    [req.params.taskId]
  );
  res.json(rows);
});

// 댓글 작성
router.post('/:taskId', async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: '내용을 입력해주세요.' });

  const id = `c${Date.now()}`;
  await db.query(
    'INSERT INTO comments (id, task_id, author_id, content) VALUES (?, ?, ?, ?)',
    [id, req.params.taskId, req.user.id, content.trim()]
  );
  const [rows] = await db.query(
    `SELECT c.*, u.name AS author_name, u.department AS author_department
     FROM comments c JOIN users u ON u.id = c.author_id WHERE c.id = ?`,
    [id]
  );

  // 댓글 알림: 태스크 담당자 + 보고자 (작성자 제외)
  const [[task]] = await db.query('SELECT assignee_id, reporter_id, title FROM tasks WHERE id = ?', [req.params.taskId]);
  if (task) {
    const [[actor]] = await db.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
    const recipients = [...new Set([task.assignee_id, task.reporter_id].filter(uid => uid && uid !== req.user.id))];
    for (let i = 0; i < recipients.length; i++) {
      const nId = `n${Date.now()}_${i}_${recipients[i]}`;
      await db.query(
        'INSERT IGNORE INTO notifications (id, user_id, type, title, body, ref_id) VALUES (?, ?, ?, ?, ?, ?)',
        [nId, recipients[i], 'comment_added', '새 댓글', `${actor?.name}님이 "${task.title}"에 댓글을 달았습니다.`, req.params.taskId]
      ).catch(() => {});
    }
  }

  res.status(201).json(rows[0]);
});

// 댓글 삭제 (본인 또는 admin)
router.delete('/:taskId/:commentId', async (req, res) => {
  const [rows] = await db.query('SELECT author_id FROM comments WHERE id = ?', [req.params.commentId]);
  if (!rows.length) return res.status(404).json({ message: '댓글 없음' });
  if (rows[0].author_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ message: '권한 없음' });
  await db.query('DELETE FROM comments WHERE id = ?', [req.params.commentId]);
  res.json({ ok: true });
});

module.exports = router;
