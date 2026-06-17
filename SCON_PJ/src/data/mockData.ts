import type { User, Project, Task, NasFile } from '../types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: '관리자',
    email: 'admin@scon.co.kr',
    role: 'admin',
    department: '경영지원',
    projectIds: ['p1', 'p2', 'p3'],
  },
  {
    id: 'u2',
    name: '김매니저',
    email: 'kim@scon.co.kr',
    role: 'manager',
    department: '개발팀',
    projectIds: ['p1', 'p2'],
  },
  {
    id: 'u3',
    name: '이개발',
    email: 'lee@scon.co.kr',
    role: 'member',
    department: '개발팀',
    projectIds: ['p1'],
  },
  {
    id: 'u4',
    name: '박디자인',
    email: 'park@scon.co.kr',
    role: 'member',
    department: '디자인팀',
    projectIds: ['p2'],
  },
  {
    id: 'u5',
    name: '최기획',
    email: 'choi@scon.co.kr',
    role: 'manager',
    department: '기획팀',
    projectIds: ['p3'],
  },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: '사내 포털 시스템 개발',
    code: 'PORTAL',
    description: '사내 인트라넷 포털 신규 개발 프로젝트',
    status: 'active',
    startDate: '2026-01-01',
    endDate: '2026-08-31',
    ownerId: 'u2',
    memberIds: ['u1', 'u2', 'u3'],
    nasPath: '\\\\NAS\\Projects\\portal',
    createdAt: '2025-12-01',
  },
  {
    id: 'p2',
    name: '브랜드 리뉴얼',
    code: 'BRAND',
    description: '회사 브랜드 아이덴티티 전면 리뉴얼',
    status: 'active',
    startDate: '2026-03-01',
    endDate: '2026-09-30',
    ownerId: 'u2',
    memberIds: ['u1', 'u2', 'u4'],
    nasPath: '\\\\NAS\\Projects\\brand',
    createdAt: '2026-02-15',
  },
  {
    id: 'p3',
    name: '2026 하반기 전략 기획',
    code: 'PLAN26',
    description: '2026년 하반기 사업 전략 수립',
    status: 'active',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    ownerId: 'u5',
    memberIds: ['u1', 'u5'],
    nasPath: '\\\\NAS\\Projects\\plan2026',
    createdAt: '2026-03-20',
  },
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1', projectId: 'p1', title: '요구사항 분석 및 정의', description: '사용자 요구사항 수집 및 문서화',
    status: 'done', priority: 'high', assigneeId: 'u3', reporterId: 'u2',
    startDate: '2026-01-05', dueDate: '2026-01-20',
    tags: ['분석', '기획'], attachments: [], comments: [],
    createdAt: '2026-01-03', updatedAt: '2026-01-20', order: 0,
  },
  {
    id: 't2', projectId: 'p1', title: 'DB 설계', description: 'ERD 작성 및 테이블 설계',
    status: 'done', priority: 'high', assigneeId: 'u3', reporterId: 'u2',
    startDate: '2026-01-21', dueDate: '2026-02-05',
    tags: ['DB', '설계'], attachments: [], comments: [],
    createdAt: '2026-01-20', updatedAt: '2026-02-05', order: 1,
  },
  {
    id: 't3', projectId: 'p1', title: '로그인/인증 모듈 개발', description: 'JWT 기반 인증 시스템 구현',
    status: 'in_progress', priority: 'urgent', assigneeId: 'u3', reporterId: 'u2',
    startDate: '2026-02-06', dueDate: '2026-02-28',
    tags: ['개발', '인증'], attachments: [], comments: [],
    createdAt: '2026-02-05', updatedAt: '2026-06-01', order: 0,
  },
  {
    id: 't4', projectId: 'p1', title: '메인 대시보드 UI 개발', description: '관리자 및 사용자 대시보드 화면 구현',
    status: 'in_progress', priority: 'high', assigneeId: 'u3', reporterId: 'u2',
    startDate: '2026-03-01', dueDate: '2026-04-15',
    tags: ['개발', 'UI'], attachments: [], comments: [],
    createdAt: '2026-02-20', updatedAt: '2026-06-01', order: 1,
  },
  {
    id: 't5', projectId: 'p1', title: '파일 업로드 기능 구현', description: 'NAS 연동 파일 업로드/다운로드',
    status: 'todo', priority: 'medium', assigneeId: 'u3', reporterId: 'u2',
    startDate: '2026-04-16', dueDate: '2026-05-15',
    tags: ['개발', 'NAS'], attachments: [], comments: [],
    createdAt: '2026-03-01', updatedAt: '2026-03-01', order: 0,
  },
  {
    id: 't6', projectId: 'p1', title: '성능 테스트 및 최적화', description: '부하 테스트 및 병목 개선',
    status: 'todo', priority: 'medium', assigneeId: undefined, reporterId: 'u2',
    startDate: '2026-06-01', dueDate: '2026-07-15',
    tags: ['테스트', '성능'], attachments: [], comments: [],
    createdAt: '2026-03-01', updatedAt: '2026-03-01', order: 1,
  },
  {
    id: 't7', projectId: 'p1', title: '코드 리뷰', description: '전체 코드 리뷰 및 개선',
    status: 'review', priority: 'low', assigneeId: 'u2', reporterId: 'u3',
    startDate: '2026-05-01', dueDate: '2026-05-30',
    tags: ['리뷰'], attachments: [], comments: [],
    createdAt: '2026-04-30', updatedAt: '2026-05-20', order: 0,
  },
  {
    id: 't8', projectId: 'p2', title: '브랜드 현황 분석', description: '현재 브랜드 인지도 및 이미지 조사',
    status: 'done', priority: 'high', assigneeId: 'u4', reporterId: 'u2',
    startDate: '2026-03-05', dueDate: '2026-03-20',
    tags: ['분석', '브랜드'], attachments: [], comments: [],
    createdAt: '2026-03-01', updatedAt: '2026-03-20', order: 0,
  },
  {
    id: 't9', projectId: 'p2', title: '로고 리디자인', description: '새로운 로고 시안 3종 제작',
    status: 'in_progress', priority: 'urgent', assigneeId: 'u4', reporterId: 'u2',
    startDate: '2026-03-21', dueDate: '2026-05-31',
    tags: ['디자인', '로고'], attachments: [], comments: [],
    createdAt: '2026-03-20', updatedAt: '2026-06-01', order: 0,
  },
  {
    id: 't10', projectId: 'p3', title: '경쟁사 분석', description: '주요 경쟁사 전략 벤치마킹',
    status: 'in_progress', priority: 'high', assigneeId: 'u5', reporterId: 'u5',
    startDate: '2026-04-05', dueDate: '2026-05-15',
    tags: ['분석', '전략'], attachments: [], comments: [],
    createdAt: '2026-04-01', updatedAt: '2026-06-01', order: 0,
  },
];

export const MOCK_NAS_FILES: NasFile[] = [
  {
    id: 'f1', projectId: 'p1', name: 'portal', path: '\\\\NAS\\Projects\\portal', size: 0, type: 'folder',
    modifiedAt: '2026-06-01',
    children: [
      { id: 'f2', projectId: 'p1', name: '기획서', path: '\\\\NAS\\Projects\\portal\\기획서', size: 0, type: 'folder', modifiedAt: '2026-02-10',
        children: [
          { id: 'f3', projectId: 'p1', name: '포털_요구사항정의서_v1.2.docx', path: '\\\\NAS\\Projects\\portal\\기획서\\포털_요구사항정의서_v1.2.docx', size: 2458624, type: 'file', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', modifiedAt: '2026-01-20' },
          { id: 'f4', projectId: 'p1', name: '화면설계서_v2.0.xlsx', path: '\\\\NAS\\Projects\\portal\\기획서\\화면설계서_v2.0.xlsx', size: 5242880, type: 'file', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', modifiedAt: '2026-02-05' },
        ]
      },
      { id: 'f5', projectId: 'p1', name: '개발', path: '\\\\NAS\\Projects\\portal\\개발', size: 0, type: 'folder', modifiedAt: '2026-05-20',
        children: [
          { id: 'f6', projectId: 'p1', name: 'ERD_v1.0.png', path: '\\\\NAS\\Projects\\portal\\개발\\ERD_v1.0.png', size: 1048576, type: 'file', mimeType: 'image/png', modifiedAt: '2026-02-04' },
          { id: 'f7', projectId: 'p1', name: 'API_명세서.pdf', path: '\\\\NAS\\Projects\\portal\\개발\\API_명세서.pdf', size: 3145728, type: 'file', mimeType: 'application/pdf', modifiedAt: '2026-03-15' },
        ]
      },
    ]
  },
];
