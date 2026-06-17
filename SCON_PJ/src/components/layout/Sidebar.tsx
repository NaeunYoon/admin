import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, Users, ChevronDown,
  LogOut, Building2, LayoutGrid, CalendarRange, FolderOpen,
  CalendarDays, HardDrive, BookOpen, Bug,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';

const ROLE_LABEL: Record<string, string> = {
  admin: '관리자',
  manager: '매니저',
  member: '멤버',
};
const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  member: 'bg-gray-100 text-gray-600',
};

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser, logout } = useAuthStore();
  const { projects } = useProjectStore();
  const navigate = useNavigate();

  // 내 프로젝트 = 내가 실제 멤버인 프로젝트 (관리자라도 본인 참여분만)
  const myProjects = projects.filter(p => p.memberIds?.includes(currentUser?.id ?? ''));

  const handleLogout = () => {
    logout();
    navigate('/access');
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onClose} />}
      <aside className={`w-60 bg-slate-900 text-white flex flex-col shrink-0 z-40 fixed inset-y-0 left-0 transform transition-transform md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Building2 size={18} />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">SCON</p>
          <p className="text-xs text-slate-400">프로젝트 관리</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="대시보드" onClick={onClose} />
        <NavItem to="/projects" icon={<FolderKanban size={16} />} label="전체 프로젝트" onClick={onClose} />
        <NavItem to="/work-log" icon={<BookOpen size={16} />} label="업무일지" onClick={onClose} />
        <NavItem to="/bugs" icon={<Bug size={16} />} label="버그 트래커" onClick={onClose} />
        {currentUser?.role === 'admin' && (
          <NavItem to="/members" icon={<Users size={16} />} label="구성원 관리" onClick={onClose} />
        )}

        {myProjects.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 uppercase font-semibold px-5 mb-1">내 프로젝트</p>
            {myProjects.map(p => (
              <ProjectNavItem key={p.id} projectId={p.id} code={p.code} name={p.name} onClose={onClose} />
            ))}
          </div>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold shrink-0">
            {currentUser?.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser?.name}</p>
            <p className="text-xs text-slate-400 truncate">{currentUser?.department}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLOR[currentUser?.role ?? 'member']}`}>
            {ROLE_LABEL[currentUser?.role ?? 'member']}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={13} />
            로그아웃
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}

function NavItem({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
          isActive
            ? 'bg-slate-700 text-white font-medium'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

function ProjectNavItem({ projectId, code, name, onClose }: { projectId: string; code: string; name: string; onClose?: () => void }) {
  const location = useLocation();
  const isProjectActive = location.pathname.startsWith(`/projects/${projectId}`);
  const [open, setOpen] = useState(isProjectActive);

  useEffect(() => {
    if (isProjectActive) setOpen(true);
  }, [isProjectActive]);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
          isProjectActive
            ? 'text-white bg-slate-800'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }`}
      >
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
        <span className="bg-slate-700 text-xs px-1.5 py-0.5 rounded font-mono shrink-0">{code}</span>
        <span className="truncate text-left flex-1">{name}</span>
      </button>

      {open && (
        <div className="pb-1">
          <SubNavItem to={`/projects/${projectId}`} end icon={<FolderOpen size={13} />} label="프로젝트 홈" onClick={onClose} />
          <SubNavItem to={`/projects/${projectId}/board`} icon={<LayoutGrid size={13} />} label="칸반 보드" onClick={onClose} />
          <SubNavItem to={`/projects/${projectId}/timeline`} icon={<CalendarRange size={13} />} label="타임라인" onClick={onClose} />
          <SubNavItem to={`/projects/${projectId}/calendar`} icon={<CalendarDays size={13} />} label="캘린더" onClick={onClose} />
          <SubNavItem to={`/projects/${projectId}/files`} icon={<HardDrive size={13} />} label="NAS 파일" onClick={onClose} />
        </div>
      )}
    </div>
  );
}

function SubNavItem({ to, icon, label, end, onClick }: { to: string; icon: React.ReactNode; label: string; end?: boolean; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 pl-10 pr-4 py-2 text-xs transition-colors ${
          isActive
            ? 'text-blue-300 bg-blue-600/20 font-medium border-l-2 border-blue-400'
            : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
