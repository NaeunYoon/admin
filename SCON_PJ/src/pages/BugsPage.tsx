import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useBugStore, type Bug } from '../store/bugStore';
import { Bug as BugIcon, Plus, Trash2, X } from 'lucide-react';

const STATUSES   = ['접수', '진행중', '보류', '해결'];
const SEVERITIES = ['낮음', '보통', '높음', '긴급'];

const STATUS_STYLE: Record<string, string> = {
  '접수':   'bg-gray-100 text-gray-700 border-gray-300',
  '진행중': 'bg-blue-100 text-blue-700 border-blue-300',
  '보류':   'bg-amber-100 text-amber-700 border-amber-300',
  '해결':   'bg-green-100 text-green-700 border-green-300',
};
const SEVERITY_STYLE: Record<string, string> = {
  '낮음': 'bg-gray-100 text-gray-600',
  '보통': 'bg-sky-100 text-sky-700',
  '높음': 'bg-orange-100 text-orange-700',
  '긴급': 'bg-red-100 text-red-700',
};

function timeAgo(s?: string) {
  if (!s) return '';
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  if (diff < 60)    return '방금 전';
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(s).toLocaleDateString('ko-KR');
}

export default function BugsPage() {
  const currentUser = useAuthStore(s => s.currentUser);
  const { bugs, loading, fetchBugs, addBug, updateBug, removeBug } = useBugStore();
  const [filter,  setFilter]  = useState('전체');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { fetchBugs(); }, []);

  const filtered  = filter === '전체' ? bugs : bugs.filter(b => b.status === filter);
  const canDelete = (b: Bug) => currentUser?.role === 'admin' || b.reporterId === currentUser?.id;
  const count = (s: string) => bugs.filter(b => b.status === s).length;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BugIcon size={20} className="text-rose-500"/> 버그 트래커</h2>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-rose-700 transition-colors shrink-0">
          <Plus size={16}/> 버그 신고
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 flex-wrap">
        {['전체', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              filter === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {s}<span className="ml-1.5 text-xs opacity-70">{s === '전체' ? bugs.length : count(s)}</span>
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center text-gray-400 text-sm py-12">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-12 border border-dashed border-gray-200 rounded-xl">
          <BugIcon size={28} className="mx-auto mb-2 opacity-30"/>
          {filter === '전체' ? '아직 신고된 버그가 없습니다.' : `'${filter}' 상태의 버그가 없습니다.`}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <div key={b.id} className={`bg-white border border-gray-200 rounded-xl p-4 ${b.status === '해결' ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_STYLE[b.severity] ?? SEVERITY_STYLE['보통']}`}>{b.severity}</span>
                  <h3 className={`font-semibold text-gray-800 break-words ${b.status === '해결' ? 'line-through text-gray-400' : ''}`}>{b.title}</h3>
                </div>
                {canDelete(b) && (
                  <button onClick={() => { if (confirm('삭제할까요?')) removeBug(b.id); }} className="p-1 text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={15}/></button>
                )}
              </div>
              {b.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap break-words">{b.description}</p>}
              <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                <div className="text-xs text-gray-400">{b.reporterName ?? '-'} · {timeAgo(b.createdAt)}</div>
                <select value={b.status} onChange={e => updateBug(b.id, { status: e.target.value })}
                  className={`text-xs font-medium rounded-full px-2.5 py-1 border outline-none cursor-pointer ${STATUS_STYLE[b.status] ?? STATUS_STYLE['접수']}`}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewBugModal onClose={() => setShowNew(false)} onSubmit={addBug} />}
    </div>
  );
}

function NewBugModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (data: { title: string; description?: string; severity?: string }) => Promise<void>;
}) {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [severity,    setSeverity]    = useState('보통');
  const [saving,      setSaving]      = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try { await onSubmit({ title: title.trim(), description: description.trim() || undefined, severity }); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">버그 신고</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">제목 *</label>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="무엇이 잘못됐나요?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">상세 설명</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
            placeholder="재현 방법, 기대 동작, 실제 동작 등"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">심각도</label>
          <div className="flex gap-2 flex-wrap">
            {SEVERITIES.map(s => (
              <button key={s} type="button" onClick={() => setSeverity(s)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${severity === s ? `${SEVERITY_STYLE[s]} border-current font-semibold` : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button type="submit" disabled={saving || !title.trim()} className="flex-1 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50">{saving ? '신고 중...' : '신고'}</button>
        </div>
      </form>
    </div>
  );
}
