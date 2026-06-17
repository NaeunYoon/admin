const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
require('dotenv').config();

const db   = require('./db');
const auth = require('./middleware/auth');
const app  = express();

app.use(cors());
app.use(express.json());

// 자동 마이그레이션
db.query(`
  CREATE TABLE IF NOT EXISTS task_checklists (
    id         VARCHAR(30)  PRIMARY KEY,
    task_id    VARCHAR(20)  NOT NULL,
    content    VARCHAR(200) NOT NULL,
    is_done    TINYINT(1)   NOT NULL DEFAULT 0,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  )
`).catch(console.error);

// 이력 컬럼 추가 (이미 있으면 무시)
db.query(`ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS started_at   DATETIME NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at  DATETIME NULL,
  ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL
`).catch(console.error);

db.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id         VARCHAR(60)  PRIMARY KEY,
    user_id    VARCHAR(64)  NOT NULL,
    type       VARCHAR(30)  NOT NULL,
    title      VARCHAR(100) NOT NULL,
    body       VARCHAR(500),
    ref_id     VARCHAR(30),
    is_read    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).catch(console.error);

db.query(`
  CREATE TABLE IF NOT EXISTS work_logs (
    id          VARCHAR(40)  PRIMARY KEY,
    user_id     VARCHAR(64)  NOT NULL,
    task_id     VARCHAR(20)  NULL,
    log_date    DATE         NOT NULL,
    start_time  TIME         NOT NULL,
    end_time    TIME         NULL,
    content     TEXT         NOT NULL,
    category    VARCHAR(50)  NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, log_date),
    INDEX idx_date (log_date),
    INDEX idx_task (task_id)
  )
`).catch(console.error);

// task_id, project_id 컬럼 추가 (기존 설치 환경 대응)
db.query(`ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS task_id VARCHAR(20) NULL AFTER user_id`).catch(() => {});
db.query(`ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS project_id VARCHAR(20) NULL AFTER task_id`).catch(() => {});
// 시간 입력 제거 → start_time/end_time 선택(NULL 허용). 누적 항목 방식.
db.query(`ALTER TABLE work_logs MODIFY start_time TIME NULL`).catch(() => {});
// id 폭 확장 — 생성식이 wl{ts}_{유저GUID(36자)} 라 varchar(40)을 초과(52자). 메모 테이블도 동일.
db.query(`ALTER TABLE work_logs MODIFY id VARCHAR(64)`).catch(() => {});
db.query(`ALTER TABLE work_log_daily MODIFY id VARCHAR(64)`).catch(() => {});

db.query(`
  CREATE TABLE IF NOT EXISTS work_log_daily (
    id            VARCHAR(50)  PRIMARY KEY,
    user_id       VARCHAR(64)  NOT NULL,
    log_date      DATE         NOT NULL,
    today_goal    TEXT         NULL,
    tomorrow_goal TEXT         NULL,
    overtime      TEXT         NULL,
    issues        TEXT         NULL,
    week_goal     TEXT         NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_date (user_id, log_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).catch(console.error);

db.query(`
  CREATE TABLE IF NOT EXISTS comments (
    id            VARCHAR(30)  PRIMARY KEY,
    task_id       VARCHAR(20)  NOT NULL,
    author_id     VARCHAR(64)  NOT NULL,
    content       TEXT         NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id)   REFERENCES tasks(id)  ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id)  ON DELETE CASCADE
  )
`).catch(console.error);

db.query(`
  CREATE TABLE IF NOT EXISTS monthly_plans (
    id            VARCHAR(40)  PRIMARY KEY,
    user_id       VARCHAR(64)  NOT NULL,
    project_name  VARCHAR(100) NULL,
    category      VARCHAR(100) NULL,
    task_name     VARCHAR(200) NOT NULL,
    assignee_note VARCHAR(200) NULL,
    start_date    DATE         NOT NULL,
    end_date      DATE         NOT NULL,
    progress      TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mp_user (user_id),
    INDEX idx_mp_dates (start_date, end_date)
  )
`).catch(console.error);

db.query(`ALTER TABLE monthly_plans ADD COLUMN IF NOT EXISTS priority TINYINT UNSIGNED NOT NULL DEFAULT 1`).catch(() => {});
// id 폭 확장 — 생성식 mp{ts}_{유저GUID(36자)} 가 varchar(40) 초과(52자) → 추가 500 방지
db.query(`ALTER TABLE monthly_plans MODIFY id VARCHAR(64)`).catch(() => {});

db.query(`
  CREATE TABLE IF NOT EXISTS bugs (
    id            VARCHAR(64)  PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    description   TEXT         NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT '접수',
    severity      VARCHAR(20)  NOT NULL DEFAULT '보통',
    reporter_id   VARCHAR(64)  NULL,
    reporter_name VARCHAR(100) NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_bugs_status (status)
  )
`).catch(console.error);

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    auth, require('./routes/users'));
app.use('/api/projects', auth, require('./routes/projects'));
app.use('/api/tasks',    auth, require('./routes/tasks'));
app.use('/api/comments',      auth, require('./routes/comments'));
app.use('/api/checklists',    auth, require('./routes/checklists'));
app.use('/api/notifications', auth, require('./routes/notifications'));
app.use('/api/work-logs',       auth, require('./routes/workLogs'));
app.use('/api/work-log-daily',  auth, require('./routes/workLogDaily'));
app.use('/api/monthly-plans',   auth, require('./routes/monthlyPlans'));
app.use('/api/leave',           auth, require('./routes/leave'));
app.use('/api/bugs',            auth, require('./routes/bugs'));

// 프로덕션: 빌드된 React(dist) 정적 서빙 + SPA fallback (로컬 dev는 dist 없음 → vite가 서빙)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // /api 가 아닌 GET 요청은 모두 index.html (클라이언트 라우팅)
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('Serving SPA from', distPath);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
