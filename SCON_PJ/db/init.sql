-- SCON_PJ 초기 스키마
-- 사용자(users)는 어드민(인트라넷)에서 SSO로 전달되어 자동 동기화됩니다.
-- user id는 어드민 Identity GUID(36자)를 그대로 사용하므로 VARCHAR(64).
-- 더미 시드 없음 — 실제 어드민 직원 + 직접 생성한 프로젝트/업무로 채워집니다.

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64)  PRIMARY KEY,
  name          VARCHAR(50)  NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(60),
  role          ENUM('admin','manager','member') NOT NULL DEFAULT 'member',
  department    VARCHAR(50),
  avatar        VARCHAR(200),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id          VARCHAR(20)  PRIMARY KEY,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  status      ENUM('active','on_hold','completed','archived') NOT NULL DEFAULT 'active',
  owner_id    VARCHAR(64)  NOT NULL,
  start_date  DATE,
  end_date    DATE,
  nas_path    VARCHAR(200),
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id  VARCHAR(20) NOT NULL,
  user_id     VARCHAR(64) NOT NULL,
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id           VARCHAR(20)  PRIMARY KEY,
  project_id   VARCHAR(20)  NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  status       ENUM('todo','in_progress','review','done') NOT NULL DEFAULT 'todo',
  priority     ENUM('urgent','high','medium','low')       NOT NULL DEFAULT 'medium',
  assignee_id  VARCHAR(64),
  reporter_id  VARCHAR(64)  NOT NULL,
  start_date   DATE,
  due_date     DATE,
  sort_order   INT          NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id)    ON DELETE SET NULL,
  FOREIGN KEY (reporter_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id  VARCHAR(20)  NOT NULL,
  tag      VARCHAR(50)  NOT NULL,
  PRIMARY KEY (task_id, tag),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
