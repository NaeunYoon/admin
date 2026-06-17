import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { Users, FolderKanban, Pencil, Trash2, X, FileBarChart } from 'lucide-react';
import type { Role } from '../types';

const ROLE_LABEL: Record<string, string> = { admin: '관리자', manager: '매니저', member: '멤버' };
const ROLE_COLOR: Record<string, string> = {
  admin:   'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  member:  'bg-gray-100 text-gray-600',
};
const DEPARTMENTS = ['경영지원', '개발팀', '디자인팀', '기획팀', '영업팀', '인사팀', '기타'];

export default function MembersPage() {
  const currentUser = useAuthStore(s => s.currentUser);
  const { projects } = useProjectStore();
  const { users, addUser, updateUser, deleteUser } = useUserStore();
  const navigate = useNavigate();

  const [showInvite, setShowInvite]         = useState(false);
  const [editTarget, setEditTarget]         = useState<any>(null);
  const [deleteTarget, setDeleteTarget]     = useState<any>(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [deleteError, setDeleteError]       = useState('');

  if (currentUser?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(e.message ?? '삭제 실패');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">구성원 관리</h2>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
          <Users size={16} />
          구성원 초대
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 font-medium">이름</th>
              <th className="px-5 py-3 font-medium">이메일</th>
              <th className="px-5 py-3 font-medium">부서</th>
              <th className="px-5 py-3 font-medium">권한</th>
              <th className="px-5 py-3 font-medium">참여 프로젝트</th>
              <th className="px-5 py-3 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => {
              const userProjects = projects.filter(p => user.projectIds?.includes(p.id));
              const isSelf = user.id === currentUser?.id;
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {user.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        {isSelf && <p className="text-xs text-blue-500">나</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs font-mono">{user.email}</td>
                  <td className="px-5 py-4 text-gray-600">{user.department}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLOR[user.role]}`}>
                      {ROLE_LABEL[user.role]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {userProjects.map(p => (
                        <span key={p.id} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          <FolderKanban size={10} />
                          {p.code}
                        </span>
                      ))}
                      {userProjects.length === 0 && <span className="text-xs text-gray-400">없음</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/members/${user.id}/report`)} title="업무보고"
                        className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors">
                        <FileBarChart size={14} />
                      </button>
                      <button onClick={() => setEditTarget(user)} title="권한 수정"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Pencil size={14} />
                      </button>
                      {!isSelf && (
                        <button onClick={() => { setDeleteTarget(user); setDeleteError(''); }} title="삭제"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 초대 모달 */}
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onSubmit={addUser} />
      )}

      {/* 수정 모달 */}
      {editTarget && (
        <EditMemberModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={async (data) => { await updateUser(editTarget.id, data); setEditTarget(null); }}
        />
      )}

      {/* 삭제 확인 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">구성원 삭제</h3>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-semibold">{deleteTarget.name}</span> ({deleteTarget.email}) 을(를) 삭제하시겠습니까?<br />
              <span className="text-red-500 text-xs mt-1 block">참여 중인 프로젝트에서도 제거됩니다.</span>
            </p>
            {deleteError && <p className="text-xs text-red-500 mb-3">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleteLoading ? '삭제 중...' : '삭제'}
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 초대 모달 ── */
function InviteModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => Promise<any> }) {
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [department, setDepartment] = useState('개발팀');
  const [role,       setRole]       = useState<Role>('member');
  const [password,   setPassword]   = useState('scon1234');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return setError('이름과 이메일을 입력해주세요.');
    if (!password || password.length < 4) return setError('비밀번호는 4자 이상이어야 합니다.');
    setError('');
    setLoading(true);
    try {
      await onSubmit({ name, email, department, role, password });
      onClose();
    } catch (e: any) {
      setError(e.message ?? '초대 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">구성원 초대</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">이름 *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="홍길동"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일 *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@scon.com"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">부서</label>
              <select value={department} onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">권한</label>
              <select value={role} onChange={e => setRole(e.target.value as Role)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="member">멤버</option>
                <option value="manager">매니저</option>
                <option value="admin">관리자</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">초기 비밀번호</label>
            <input value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? '초대 중...' : '초대하기'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── 권한 수정 모달 ── */
function EditMemberModal({ user, onClose, onSubmit }: {
  user: any;
  onClose: () => void;
  onSubmit: (data: { role: string; department: string }) => Promise<void>;
}) {
  const [role,       setRole]       = useState<Role>(user.role);
  const [department, setDepartment] = useState(user.department ?? '');
  const [loading,    setLoading]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ role, department });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{user.name} 정보 수정</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">부서</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">권한</label>
            <select value={role} onChange={e => setRole(e.target.value as Role)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="member">멤버</option>
              <option value="manager">매니저</option>
              <option value="admin">관리자</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? '저장 중...' : '저장'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
