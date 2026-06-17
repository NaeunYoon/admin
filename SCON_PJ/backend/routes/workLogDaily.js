const router = require('express').Router();
const db     = require('../db');

// GET: 특정 날짜 범위의 일일 메타 조회
router.get('/', async (req, res) => {
  try {
    const { userId, startDate, endDate, date } = req.query;
    const clauses = ['wld.user_id = ?'];
    const params  = [userId || req.user.id];

    if (date)      { clauses.push('wld.log_date = ?');  params.push(date); }
    if (startDate) { clauses.push('wld.log_date >= ?'); params.push(startDate); }
    if (endDate)   { clauses.push('wld.log_date <= ?'); params.push(endDate); }

    const [rows] = await db.query(
      `SELECT * FROM work_log_daily wld WHERE ${clauses.join(' AND ')} ORDER BY wld.log_date`,
      params
    );
    res.json(rows.map(r => ({
      id:           r.id,
      userId:       r.user_id,
      logDate:      r.log_date instanceof Date ? r.log_date.toISOString().slice(0, 10) : String(r.log_date).slice(0, 10),
      todayGoal:    r.today_goal    ?? '',
      tomorrowGoal: r.tomorrow_goal ?? '',
      overtime:     r.overtime      ?? '',
      issues:       r.issues        ?? '',
      weekGoal:     r.week_goal     ?? '',
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// PUT: upsert 일일 메타
router.put('/', async (req, res) => {
  try {
    const { logDate, todayGoal, tomorrowGoal, overtime, issues, weekGoal } = req.body;
    if (!logDate) return res.status(400).json({ error: 'logDate required' });

    const id = `wld_${req.user.id}_${logDate}`;
    await db.query(`
      INSERT INTO work_log_daily (id, user_id, log_date, today_goal, tomorrow_goal, overtime, issues, week_goal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        today_goal    = VALUES(today_goal),
        tomorrow_goal = VALUES(tomorrow_goal),
        overtime      = VALUES(overtime),
        issues        = VALUES(issues),
        week_goal     = VALUES(week_goal),
        updated_at    = NOW()
    `, [id, req.user.id, logDate, todayGoal || '', tomorrowGoal || '', overtime || '', issues || '', weekGoal || '']);

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
