import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { useUiStore } from '../store/uiStore';
import ProjectFormModal from '../components/ProjectFormModal';
import {
  Kanban, Calendar, FolderOpen, GanttChartSquare, Pencil,
  AlertTriangle, Clock, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { isPast, isToday, differenceInDays, parseISO } from 'date-fns';

const STATUS_LABEL: Record<string, string> = { active: '진행 중', on_hold: '보류', completed: '완료', archived: '보관' };
const STATUS_COLOR: Record<string, string> = {
  active:    'text-green-700 bg-green-100',
  on_hold:   'text-yellow-700 bg-yellow-100',
  completed: 'text-blue-700 bg-blue-100',
  archived:  'text-gray-600 bg-gray-100',
};
const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-blue-400', low: 'bg-gray-400',
};
const TASK_STATUS_STYLE: Record<string, string> = {
  todo:        'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  review:      'bg-yellow-100 text-yellow-700',
  done:        'bg-green-100 text-green-700',
};
const TASK_STATUS_LABEL: Record<string, string> = {
  todo: '할 일', in_progress: '진행 중', review: '검토', done: '완료',
};

export default function ProjectDetailPage() {
  const { projectId }    = useParams();
  const currentUser      = useAuthStore(s => s.currentUser);
  const { projects, tasks, updateProject } = useProjectStore();
  const users            = useUserStore(s => s.users);
  const { openTask }     = useUiStore();
  const [showEdit, setShowEdit] = useState(false);

  const project = projects.find(p => p.id === projectId);
  if (!project) return <div className="text-gray-500 p-8">프로젝트를 찾을 수 없습니다.</div>;

  const projectTasks  = tasks.filter(t => t.projectId === project.id);
  const activeTasks   = projectTasks.filter(t => t.status !== 'done');
  const doneCnt       = projectTasks.filter(t => t.status === 'done').length;
  const inProgressCnt = projectTasks.filter(t => t.status === 'in_progress').length;
  const todoCnt       = projectTasks.filter(t => t.status === 'todo').length;
  const reviewCnt     = projectTasks.filter(t => t.status === 'review').length;
  const progress      = projectTasks.length > 0 ? Math.round((doneCnt / projectTasks.length) * 100) : 0;
  const members       = users.filter(u => project.memberIds.includes(u.id));
  const owner         = users.find(u => u.id === project.ownerId);
  const canEdit       = currentUser?.role === 'admin' || currentUser?.id === project.ownerId;

  // 마감 초과 / 임박 (3일 이내) 업무
  const overdueTasks = activeTasks.filter(t =>
    t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))
  );
  const soonTasks = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const d = differenceInDays(parseISO(t.dueDate), new Date());
    return d >= 0 && d <= 3;
  });

  // 담당자별 업무 수
  const assigneeStats = members.map(m => {
    const mine = activeTasks.filter(t => t.assigneeId === m.id);
    return {
      user: m,
      total: mine.length,
      inProgress: mine.filter(t => t.status === 'in_progress').length,
      review:     mine.filter(t => t.status === 'review').length,
      todo:       mine.filter(t => t.status === 'todo').length,
    };
  }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

  const handleEdit = async (data: any) => {
    await updateProject(project.id, data);
    setShowEdit(false);
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-600">{project.code}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[project.status]}`}>
                {STATUS_LABEL[project.status]}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
            <p className="text-gray-500 mt-1">{project.description}</p>
          </div>
          {canEdit && (
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Pencil size={14} />수정
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-100">
          <InfoBlock label="PM"       value={owner?.name ?? '-'} />
          <InfoBlock label="시작일"   value={project.startDate ?? '-'} />
          <InfoBlock label="종료일"   value={project.endDate ?? '-'} />
          <InfoBlock label="NAS 경로" value={project.nasPath || '-'} mono />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-500">전체 진행률</span>
            <span className="font-semibold text-gray-700">{progress}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatBox label="전체"    value={projectTasks.length} color="text-gray-700"   bg="bg-gray-50" />
        <StatBox label="할 일"   value={todoCnt}             color="text-gray-600"   bg="bg-gray-50" />
        <StatBox label="진행 중" value={inProgressCnt}       color="text-blue-700"   bg="bg-blue-50" />
        <StatBox label="검토"    value={reviewCnt}           color="text-yellow-700" bg="bg-yellow-50" />
      </div>

      {/* 경보 섹션 */}
      {(overdueTasks.length > 0 || soonTasks.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {overdueTasks.length > 0 && (
            <AlertSection
              icon={<AlertTriangle size={16} className="text-red-500" />}
              title={`마감 초과 (${overdueTasks.length})`}
              borderColor="border-red-200"
              bgColor="bg-red-50"
              titleColor="text-red-700"
              tasks={overdueTasks}
              users={users}
              onOpen={openTask}
            />
          )}
          {soonTasks.length > 0 && (
            <AlertSection
              icon={<Clock size={16} className="text-orange-500" />}
              title={`마감 임박 3일 이내 (${soonTasks.length})`}
              borderColor="border-orange-200"
              bgColor="bg-orange-50"
              titleColor="text-orange-700"
              tasks={soonTasks}
              users={users}
              onOpen={openTask}
            />
          )}
        </div>
      )}

      {/* 담당자별 현황 */}
      {assigneeStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">담당자별 업무 현황</h3>
          <div className="space-y-3">
            {assigneeStats.map(s => {
              const pct = activeTasks.length > 0 ? Math.round((s.total / activeTasks.length) * 100) : 0;
              return (
                <div key={s.user.id} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                      {s.user.name[0]}
                    </div>
                    <span className="text-sm text-gray-700 truncate">{s.user.name}</span>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs text-gray-500 w-48">
                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s.todo} 할일</span>
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{s.inProgress} 진행</span>
                    <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">{s.review} 검토</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-12 text-right shrink-0">{s.total}건</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Cards */}
      <div className="grid grid-cols-4 gap-4">
        <NavCard to={`/projects/${projectId}/board`}
          icon={<Kanban size={24} className="text-blue-500" />}
          title="칸반 보드" desc="드래그로 업무 상태 관리" color="bg-blue-50 hover:bg-blue-100" />
        <NavCard to={`/projects/${projectId}/timeline`}
          icon={<GanttChartSquare size={24} className="text-purple-500" />}
          title="타임라인" desc="간트 차트로 일정 확인" color="bg-purple-50 hover:bg-purple-100" />
        <NavCard to={`/projects/${projectId}/calendar`}
          icon={<Calendar size={24} className="text-green-500" />}
          title="캘린더" desc="월별 일정 한눈에 보기" color="bg-green-50 hover:bg-green-100" />
        <NavCard to={`/projects/${projectId}/files`}
          icon={<FolderOpen size={24} className="text-orange-500" />}
          title="NAS 파일" desc="프로젝트 자료 관리" color="bg-orange-50 hover:bg-orange-100" />
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">프로젝트 구성원 ({members.length}명)</h3>
        <div className="grid grid-cols-2 gap-3">
          {members.map(m => {
            const cnt = activeTasks.filter(t => t.assigneeId === m.id).length;
            const done = projectTasks.filter(t => t.assigneeId === m.id && t.status === 'done').length;
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.department} · {m.email}</p>
                </div>
                <div className="text-right shrink-0">
                  {m.id === project.ownerId && (
                    <span className="block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mb-1">PM</span>
                  )}
                  <span className="text-xs text-gray-400">{cnt}건 진행 · {done}건 완료</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showEdit && (
        <ProjectFormModal
          users={users}
          currentUserId={currentUser!.id}
          initialData={project}
          onClose={() => setShowEdit(false)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}

function AlertSection({ icon, title, borderColor, bgColor, titleColor, tasks, users, onOpen }: {
  icon: React.ReactNode; title: string;
  borderColor: string; bgColor: string; titleColor: string;
  tasks: any[]; users: any[]; onOpen: (id: string) => void;
}) {
  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className={`text-sm font-semibold ${titleColor}`}>{title}</span>
      </div>
      <div className="space-y-2">
        {tasks.slice(0, 4).map(t => {
          const assignee = users.find((u: any) => u.id === t.assigneeId);
          const overdueDays = t.dueDate
            ? differenceInDays(new Date(), parseISO(t.dueDate))
            : null;
          return (
            <button key={t.id} onClick={() => onOpen(t.id)}
              className="w-full flex items-center gap-2 bg-white/70 hover:bg-white rounded-lg px-3 py-2 text-left transition-colors">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`} />
              <span className="text-sm text-gray-800 flex-1 truncate">{t.title}</span>
              {assignee && (
                <span className="text-xs text-gray-400 shrink-0">{assignee.name}</span>
              )}
              {overdueDays !== null && overdueDays > 0 && (
                <span className="text-xs text-red-500 font-medium shrink-0">+{overdueDays}일</span>
              )}
              {t.dueDate && overdueDays !== null && overdueDays <= 0 && (
                <span className="text-xs text-orange-500 shrink-0">{t.dueDate.slice(5)}</span>
              )}
              <ChevronRight size={12} className="text-gray-300 shrink-0" />
            </button>
          );
        })}
        {tasks.length > 4 && (
          <p className="text-xs text-center text-gray-400 pt-1">+{tasks.length - 4}건 더</p>
        )}
      </div>
    </div>
  );
}

function InfoBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-gray-700 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

function StatBox({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className={`text-sm ${color}`}>{label}</p>
    </div>
  );
}

function NavCard({ to, icon, title, desc, color }: { to: string; icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <Link to={to} className={`${color} rounded-xl p-5 transition-colors block`}>
      <div className="mb-3">{icon}</div>
      <h4 className="font-semibold text-gray-800">{title}</h4>
      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
    </Link>
  );
}
