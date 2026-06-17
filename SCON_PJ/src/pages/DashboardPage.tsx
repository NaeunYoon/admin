import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { FolderKanban, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import TaskDetailPanel from '../components/TaskDetailPanel';

const STATUS_LABEL: Record<string, string> = {
  todo: '할 일', in_progress: '진행 중', review: '검토', done: '완료',
};
const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};
const PRIORITY_LABEL: Record<string, string> = {
  urgent: '긴급', high: '높음', medium: '보통', low: '낮음',
};

export default function DashboardPage() {
  const currentUser = useAuthStore(s => s.currentUser);
  const { projects, tasks } = useProjectStore();
  const users = useUserStore(s => s.users);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 참여 프로젝트 = 내가 실제 멤버인 프로젝트 (관리자라도 전체가 아니라 본인 참여분만)
  const myProjects = projects.filter(p => p.memberIds?.includes(currentUser?.id ?? ''));
  const myTasks = tasks.filter(t =>
    t.assigneeId === currentUser?.id && t.status !== 'done'
  );
  const overdueTasks = myTasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)));
  const doneTasks = tasks.filter(t => t.assigneeId === currentUser?.id && t.status === 'done');

  const allMyTasks = tasks.filter(t => t.assigneeId === currentUser?.id);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">안녕하세요, {currentUser?.name}님 👋</h2>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'yyyy년 MM월 dd일 EEEE', { locale: undefined })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<FolderKanban className="text-blue-500" />} label="참여 프로젝트" value={myProjects.length} color="bg-blue-50" />
        <StatCard icon={<Clock className="text-orange-500" />} label="진행 중인 업무" value={myTasks.length} color="bg-orange-50" />
        <StatCard icon={<AlertCircle className="text-red-500" />} label="기한 초과" value={overdueTasks.length} color="bg-red-50" />
        <StatCard icon={<CheckCircle2 className="text-green-500" />} label="완료된 업무" value={doneTasks.length} color="bg-green-50" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">내 업무</h3>
            <span className="text-xs text-gray-400">{myTasks.length}개 진행 중</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
            {myTasks.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">진행 중인 업무가 없습니다</p>
            )}
            {myTasks.map(task => {
              const project = projects.find(p => p.id === task.projectId);
              const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_COLOR[task.priority]}`}>
                    {PRIORITY_LABEL[task.priority]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                    <p className="text-xs text-gray-400">{project?.code} · {STATUS_LABEL[task.status]}</p>
                  </div>
                  {task.dueDate && (
                    <span className={`text-xs shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      {isOverdue ? '⚠ ' : ''}{task.dueDate}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">프로젝트</h3>
            <Link to="/projects" className="text-xs text-blue-600 hover:underline">전체 보기</Link>
          </div>
          <div className="space-y-3">
            {myProjects.map(project => {
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              const doneCnt = projectTasks.filter(t => t.status === 'done').length;
              const progress = projectTasks.length > 0 ? Math.round((doneCnt / projectTasks.length) * 100) : 0;
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="block hover:bg-gray-50 rounded-lg p-3 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{project.code}</span>
                      <span className="text-sm font-medium text-gray-800 truncate max-w-28">{project.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{doneCnt}/{projectTasks.length} 완료</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTaskId && (
        <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}

      {/* Task progress by project */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-blue-500" />
          <h3 className="font-semibold text-gray-800">업무 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">업무</th>
                <th className="pb-2 font-medium">프로젝트</th>
                <th className="pb-2 font-medium">담당자</th>
                <th className="pb-2 font-medium">상태</th>
                <th className="pb-2 font-medium">마감일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allMyTasks.slice(0, 8).map(task => {
                const project = projects.find(p => p.id === task.projectId);
                const assignee = users.find(u => u.id === task.assigneeId);
                return (
                  <tr key={task.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-800 truncate max-w-56">{task.title}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{project?.code}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">{assignee?.name ?? '-'}</td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="py-2.5 text-xs text-gray-500">{task.dueDate ?? '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={`${color} rounded-xl p-4 border border-white`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
