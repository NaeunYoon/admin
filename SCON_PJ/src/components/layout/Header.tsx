import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, CheckCheck, UserCheck, MessageSquare, FolderKanban, Menu, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useUiStore } from '../../store/uiStore';
import type { Notification } from '../../store/notificationStore';

const BREADCRUMB: Record<string, string> = {
  '/dashboard': '대시보드',
  '/projects':  '프로젝트 목록',
  '/members':   '구성원 관리',
  '/work-log':  '업무일지',
  '/bugs':      '버그 트래커',
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-blue-500', low: 'bg-gray-400',
};
const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
};
const STATUS_LABEL: Record<string, string> = {
  active: '진행', on_hold: '보류', completed: '완료', archived: '보관',
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return '방금 전';
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function Header({ onMenu }: { onMenu: () => void }) {
  const currentUser = useAuthStore(s => s.currentUser);
  const { projects, tasks } = useProjectStore();
  const { notifications, unreadCount, fetch, markRead, markAllRead } = useNotificationStore();
  const { openTask } = useUiStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [bellOpen,   setBellOpen]   = useState(false);
  const [query,      setQuery]      = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const bellRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const title = BREADCRUMB[location.pathname] ?? '프로젝트';

  useEffect(() => { fetch(); const id = setInterval(fetch, 30_000); return () => clearInterval(id); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current   && !bellRef.current.contains(e.target as Node))   setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) { setSearchOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 검색 결과
  const q = query.trim().toLowerCase();
  const matchedProjects = q.length >= 1
    ? projects.filter(p =>
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      ).slice(0, 5)
    : [];
  const matchedTasks = q.length >= 1
    ? tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 6)
    : [];
  const hasResults = matchedProjects.length > 0 || matchedTasks.length > 0;

  const handleNotificationClick = (n: Notification) => {
    markRead(n.id);
    setBellOpen(false);
    const task = tasks.find(t => t.id === n.ref_id);
    if (task) openTask(task.id);
  };

  const handleTaskClick = (taskId: string) => {
    setSearchOpen(false);
    setQuery('');
    openTask(taskId);
  };

  const handleProjectClick = (projectId: string) => {
    setSearchOpen(false);
    setQuery('');
    navigate(`/projects/${projectId}`);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onMenu} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg shrink-0">
          <Menu size={20} />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-3">

        {/* 어드민(인트라넷)으로 이동 */}
        <a href="/" title="어드민으로 이동"
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50 rounded-lg px-2.5 py-1.5 transition-colors shrink-0">
          <Building2 size={14} /> <span className="hidden sm:inline">어드민</span>
        </a>

        {/* 검색 (모바일 숨김) */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            placeholder="프로젝트, 업무 검색..."
            className="pl-9 pr-4 py-1.5 text-sm bg-gray-100 rounded-lg border border-transparent focus:outline-none focus:border-blue-400 focus:bg-white w-52 transition-all"
            onFocus={() => setSearchOpen(true)}
            onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
          />

          {searchOpen && q.length >= 1 && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              {!hasResults ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <Search size={24} className="mx-auto mb-2 opacity-30" />
                  검색 결과가 없습니다
                </div>
              ) : (
                <>
                  {matchedProjects.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase">프로젝트</p>
                      {matchedProjects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleProjectClick(p.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                            <FolderKanban size={14} className="text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.code}</p>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[p.status]}`}>
                            {STATUS_LABEL[p.status]}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {matchedTasks.length > 0 && (
                    <div className={matchedProjects.length > 0 ? 'border-t border-gray-100' : ''}>
                      <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase">업무</p>
                      {matchedTasks.map(t => {
                        const proj = projects.find(p => p.id === t.projectId);
                        return (
                          <button
                            key={t.id}
                            onClick={() => handleTaskClick(t.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                              <p className="text-xs text-gray-400">{proj?.code ?? ''}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 알림 벨 */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(o => !o)}
            className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-800 text-sm">알림</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <CheckCheck size={13} />
                    모두 읽음
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">
                    <Bell size={28} className="mx-auto mb-2 opacity-30" />
                    알림이 없습니다
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        n.type === 'task_assigned' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {n.type === 'task_assigned' ? <UserCheck size={14} /> : <MessageSquare size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 유저 아바타 */}
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
          {currentUser?.name[0]}
        </div>
      </div>
    </header>
  );
}
