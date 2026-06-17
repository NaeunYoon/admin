const router = require('express').Router();
const db     = require('../db');

const toFront = (p) => ({
  id:          p.id,
  code:        p.code,
  name:        p.name,
  description: p.description ?? '',
  status:      p.status,
  ownerId:     p.owner_id,
  startDate:   p.start_date,
  endDate:     p.end_date,
  nasPath:     p.nas_path ?? '',
  createdAt:   p.created_at,
  memberIds:   p.memberIds ?? [],
});

// 전체 프로젝트
router.get('/', async (req, res) => {
  const [projects] = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
  const [members]  = await db.query('SELECT * FROM project_members');
  const result = projects.map(p => toFront({
    ...p,
    memberIds: members.filter(m => m.project_id === p.id).map(m => m.user_id),
  }));
  res.json(result);
});

// 단일 프로젝트
router.get('/:id', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: '프로젝트 없음' });
  const [members] = await db.query('SELECT user_id FROM project_members WHERE project_id = ?', [req.params.id]);
  res.json(toFront({ ...rows[0], memberIds: members.map(m => m.user_id) }));
});

// 프로젝트 생성
router.post('/', async (req, res) => {
  const { id, code, name, description, status, ownerId, startDate, endDate, nasPath, memberIds = [] } = req.body;
  await db.query(
    'INSERT INTO projects (id,code,name,description,status,owner_id,start_date,end_date,nas_path) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, code, name, description, status, ownerId, startDate, endDate, nasPath]
  );
  if (memberIds.length) {
    const vals = memberIds.map(uid => [id, uid]);
    await db.query('INSERT INTO project_members (project_id, user_id) VALUES ?', [vals]);
  }
  res.status(201).json({ id });
});

// 프로젝트 수정
router.put('/:id', async (req, res) => {
  const { name, description, status, ownerId, startDate, endDate, nasPath, memberIds } = req.body;
  await db.query(
    'UPDATE projects SET name=?, description=?, status=?, owner_id=?, start_date=?, end_date=?, nas_path=? WHERE id=?',
    [name, description, status, ownerId, startDate, endDate, nasPath, req.params.id]
  );
  if (memberIds) {
    await db.query('DELETE FROM project_members WHERE project_id = ?', [req.params.id]);
    if (memberIds.length) {
      const vals = memberIds.map(uid => [req.params.id, uid]);
      await db.query('INSERT INTO project_members (project_id, user_id) VALUES ?', [vals]);
    }
  }
  res.json({ ok: true });
});

module.exports = router;
