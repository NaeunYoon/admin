import { useState } from 'react';
import type { Project, ProjectStatus } from '../types';
import { X, Check } from 'lucide-react';

interface FormData {
  name: string; code: string; description: string; status: ProjectStatus;
  ownerId: string; startDate: string; endDate: string;
  memberIds: string[]; nasPath: string;
}

interface Props {
  users: any[];
  currentUserId: string;
  initialData?: Project;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
}

export default function ProjectFormModal({ users, currentUserId, initialData, onClose, onSubmit }: Props) {
  const isEdit = !!initialData;

  const [name,        setName]        = useState(initialData?.name        ?? '');
  const [code,        setCode]        = useState(initialData?.code        ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [status,      setStatus]      = useState<ProjectStatus>(initialData?.status ?? 'active');
  const [ownerId,     setOwnerId]     = useState(initialData?.ownerId     ?? currentUserId);
  const [startDate,   setStartDate]   = useState(initialData?.startDate   ?? '');
  const [endDate,     setEndDate]     = useState(initialData?.endDate     ?? '');
  const [memberIds,   setMemberIds]   = useState<string[]>(initialData?.memberIds ?? [currentUserId]);
  const [nasPath,     setNasPath]     = useState(initialData?.nasPath     ?? '');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const toggleMember = (id: string) =>
    setMemberIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim())            return setError('프로젝트 이름을 입력해주세요.');
    if (!code.trim())            return setError('프로젝트 코드를 입력해주세요.');
    if (!startDate || !endDate)  return setError('시작일과 종료일을 입력해주세요.');
    if (memberIds.length === 0)  return setError('구성원을 최소 1명 선택해주세요.');
    setError('');
    setLoading(true);
    await onSubmit({ name, code: code.toUpperCase(), description, status, ownerId, startDate, endDate, memberIds, nasPath });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            {isEdit ? '프로젝트 수정' : '새 프로젝트 만들기'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 이름 + 코드 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">프로젝트 이름 *</label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)}
                placeholder="예: 사내 포털 리뉴얼"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">프로젝트 코드 *</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="예: PORTAL" maxLength={10}
                disabled={isEdit}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase disabled:bg-gray-50 disabled:text-gray-400" />
            </div>
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">설명</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="프로젝트에 대한 간략한 설명"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* 상태 + PM */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">상태</label>
              <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="active">진행 중</option>
                <option value="on_hold">보류</option>
                <option value="completed">완료</option>
                <option value="archived">보관</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">PM (프로젝트 매니저)</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department})</option>)}
              </select>
            </div>
          </div>

          {/* 기간 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">시작일 *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">종료일 *</label>
              <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* 구성원 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              구성원 선택 * <span className="text-gray-400 font-normal">({memberIds.length}명 선택됨)</span>
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {users.map(u => {
                const selected = memberIds.includes(u.id);
                return (
                  <button key={u.id} type="button" onClick={() => toggleMember(u.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
                      selected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                    }`}>
                    <div className={`w-7 h-7 rounded-full text-white text-xs flex items-center justify-center font-bold shrink-0 ${
                      selected ? 'bg-blue-500' : 'bg-gray-300'
                    }`}>
                      {selected ? <Check size={14} /> : u.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.department}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* NAS 경로 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              NAS 경로 <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <input value={nasPath} onChange={e => setNasPath(e.target.value)}
              placeholder="예: /volume1/projects/portal"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? (isEdit ? '저장 중...' : '생성 중...') : (isEdit ? '변경사항 저장' : '프로젝트 생성')}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
