const router = require('express').Router();
const db     = require('../db');

// 어드민(admindb)의 승인된 휴가 조회 — 업무일지 일일/주간 휴가 동기화용.
// PM 유저 id = 어드민 Identity GUID 이므로 LeaveRequests.UserId 와 매칭된다.
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const { startDate, endDate } = req.query;
    const clauses = ['UserId = ?', "Status = '승인'"];
    const params  = [userId];
    if (endDate)   { clauses.push('StartDate <= ?'); params.push(endDate); }
    if (startDate) { clauses.push('EndDate >= ?');   params.push(startDate); }

    const [rows] = await db.query(
      `SELECT Id, UserId, StartDate, EndDate, LeaveType, Period
         FROM admindb.LeaveRequests
        WHERE ${clauses.join(' AND ')}
        ORDER BY StartDate`,
      params
    );

    const toDate = (v) => v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
    res.json(rows.map(r => ({
      id:        r.Id,
      startDate: toDate(r.StartDate),
      endDate:   toDate(r.EndDate),
      type:      r.LeaveType,
      period:    r.Period ?? null,
    })));
  } catch (e) {
    // admindb 접근 불가 등 → 빈 배열 (휴가 동기화는 보조 기능, 핵심 기능 막지 않음)
    console.error('leave query failed:', e.message);
    res.json([]);
  }
});

module.exports = router;
