import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import ProjectFormModal from '../components/ProjectFormModal';
import { Plus, Search, FolderOpen, Calendar, Users } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  active: '진행 중', on_hold: '보류', completed: '완료', archived: '보관',
};
const STATUS_COLOR: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-gray-100 text-gray-600',
};

export default function ProjectsPage() {
  const currentUser            = useAuthStore(s => s.currentUser);
  const { projects, tasks, addProject } = useProjectStore();
  const users                  = useUserStore(s => s.users);
  const navigate               = useNavigate();
  const [search,       setSearch]    = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal,    setShowModal] = useState(false);
  const [scope,        setScope]     = useState<'all' | 'mine'>('all');

  const scoped = scope === 'mine'
    ? projects.filter(p => p.memberIds?.includes(currentUser?.id ?? ''))
    : projects;
  const filtered = scoped.filter(p => {
    const matchSearch = p.name.includes(search) || p.code.includes(search);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async (data: any) => {
    const id = `p${Date.now()}`;
    await addProject({ id, ...data, createdAt: new Date().toISOString() } as any);
    setShowModal(false);
    navigate(`/projects/${id}`);
  };

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">프로젝트 목록</h2>
        {currentUser?.role === 'admin' && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            새 프로젝트
          </button>
        )}
      </div>

      {/* 범위: 전체 / 내 프로젝트 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setScope('all')}
            className={`px-3.5 py-2 text-sm ${scope === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>전체 프로젝트</button>
          <button onClick={() => setScope('mine')}
            className={`px-3.5 py-2 text-sm border-l border-gray-200 ${scope === 'mine' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>내 프로젝트</button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="프로젝트 검색..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
        </div>
        <div className="flex items-center gap-1">
          {['all', 'active', 'on_hold', 'completed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {s === 'all' ? '전체' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(project => {
          const projectTasks = tasks.filter(t => t.projectId === project.id);
          const doneCnt  = projectTasks.filter(t => t.status === 'done').length;
          const progress = projectTasks.length > 0 ? Math.round((doneCnt / projectTasks.length) * 100) : 0;
          const members  = users.filter(u => project.memberIds.includes(u.id));
          return (
            <Link key={project.id} to={`/projects/${project.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{project.code}</span>
                  <h3 className="font-semibold text-gray-900 mt-1.5 group-hover:text-blue-700 transition-colors">{project.name}</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[project.status]}`}>
                  {STATUS_LABEL[project.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>진행률</span>
                  <span>{progress}% ({doneCnt}/{projectTasks.length})</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Calendar size={12} />{project.endDate}</span>
                  <span className="flex items-center gap-1"><Users size={12} />{members.length}명</span>
                </div>
                <div className="flex -space-x-2">
                  {members.slice(0, 3).map(m => (
                    <div key={m.id} title={m.name}
                      className="w-6 h-6 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center ring-2 ring-white font-bold">
                      {m.name[0]}
                    </div>
                  ))}
                  {members.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center ring-2 ring-white">
                      +{members.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p>프로젝트가 없습니다</p>
        </div>
      )}

      {showModal && (
        <ProjectFormModal
          users={users}
          currentUserId={currentUser!.id}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
