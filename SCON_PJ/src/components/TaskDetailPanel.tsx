import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { useWorkLogStore, type WorkLog } from '../store/workLogStore';
import { api } from '../api';
import type { TaskPriority, TaskStatus } from '../types';
import { X, Trash2, Send, MessageSquare, CheckSquare, Square, Lock, Clock, BookOpen, Plus, Check } from 'lucide-react';
import { format } from 'date-fns';

const PRIORITY_LABEL: Record<TaskPriority, string> = { urgent: '긴급', high: '높음', medium: '보통', low: '낮음' };
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: 'bg-red-100 text-red-700',
  high:   'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-gray-100 text-gray-600',
};
const STATUS_LABEL: Record<TaskStatus, string> = { todo: '할 일', in_progress: '진행 중', review: '검토', done: '완료' };

interface Props {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetailPanel({ taskId, onClose }: Props) {
  const currentUser             = useAuthStore(s => s.currentUser);
  const { tasks, updateTask, deleteTask } = useProjectStore();
  const users                   = useUserStore(s => s.users);
  const task = tasks.find(t => t.id === taskId);

  // 로컬 편집 상태
  const [title,       setTitle]       = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [tagInput,    setTagInput]    = useState('');

  // 체크리스트
  const [checklist,     setChecklist]     = useState<any[]>([]);
  const [checkInput,    setCheckInput]    = useState('');
  const [editingCheck,  setEditingCheck]  = useState<string | null>(null);
  const [editCheckText, setEditCheckText] = useState('');

  // 댓글
  const [comments,     setComments]     = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [commenting,   setCommenting]   = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // 삭제 확인
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 업무 시간 기록
  const { fetchLogs, addLog, removeLog } = useWorkLogStore();
  const [taskLogs,    setTaskLogs]    = useState<WorkLog[]>([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logDate,     setLogDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [logStart,    setLogStart]    = useState('09:00');
  const [logEnd,      setLogEnd]      = useState('');
  const [savingLog,   setSavingLog]   = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description);
    api.getChecklist(taskId).then(setChecklist).catch(() => {});
    api.getComments(taskId).then(setComments).catch(() => {});
    // 이 태스크의 업무 시간 기록 로드
    fetchLogs({ taskId }).then(() => {}).catch(() => {});
    api.getWorkLogs({ taskId }).then(setTaskLogs).catch(() => {});
  }, [taskId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  if (!task) return null;

  const members = users.filter(u => task.projectId
    ? tasks.find(t => t.id === taskId) : true
  );
  const projectUsers = users; // 프로젝트 멤버 전체
  const assignee = users.find(u => u.id === task.assigneeId);
  const reporter = users.find(u => u.id === task.reporterId);

  // 드롭다운 변경 → 즉시 저장
  const saveField = (updates: Record<string, any>) => updateTask(taskId, updates);

  // 제목 blur 저장
  const saveTitle = () => {
    if (title.trim() && title !== task.title) saveField({ title: title.trim() });
  };

  // 설명 blur 저장
  const saveDesc = () => {
    if (description !== task.description) saveField({ description });
  };

  // 태그 추가
  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || task.tags.includes(tag)) { setTagInput(''); return; }
    const tags = [...task.tags, tag];
    saveField({ tags });
    setTagInput('');
  };

  // 태그 삭제
  const removeTag = (tag: string) => saveField({ tags: task.tags.filter(t => t !== tag) });

  // 댓글 전송
  const submitComment = async () => {
    if (!commentInput.trim()) return;
    setCommenting(true);
    try {
      const comment = await api.addComment(taskId, commentInput.trim());
      setComments(prev => [...prev, comment]);
      setCommentInput('');
    } finally {
      setCommenting(false);
    }
  };

  // 댓글 삭제
  const removeComment = async (commentId: string) => {
    await api.deleteComment(taskId, commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  // 체크리스트
  const addCheckItem = async () => {
    if (!checkInput.trim()) return;
    const item = await api.addCheckItem(taskId, checkInput.trim());
    setChecklist(prev => [...prev, item]);
    setCheckInput('');
    saveField({ checklistTotal: checklist.length + 1, checklistDone: checklist.filter(c => c.is_done).length });
  };
  const toggleCheck = async (item: any) => {
    await api.toggleCheckItem(taskId, item.id, !item.is_done);
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, is_done: !c.is_done } : c));
    const newDone = checklist.filter(c => c.id !== item.id ? c.is_done : !item.is_done).length;
    saveField({ checklistDone: newDone });
  };
  const saveCheckEdit = async (item: any) => {
    if (!editCheckText.trim() || editCheckText === item.content) { setEditingCheck(null); return; }
    await api.updateCheckItem(taskId, item.id, editCheckText.trim());
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, content: editCheckText.trim() } : c));
    setEditingCheck(null);
  };
  const removeCheckItem = async (itemId: string) => {
    await api.deleteCheckItem(taskId, itemId);
    setChecklist(prev => prev.filter(c => c.id !== itemId));
    const remaining = checklist.filter(c => c.id !== itemId);
    saveField({ checklistTotal: remaining.length, checklistDone: remaining.filter(c => c.is_done).length });
  };

  // 태스크 삭제
  const handleDelete = async () => {
    await deleteTask(taskId);
    onClose();
  };

  // 업무 시간 기록 저장
  const submitLog = async () => {
    if (!logStart) return;
    setSavingLog(true);
    try {
      const created = await addLog({
        userId:    currentUser?.id ?? '',
        taskId,
        projectId: task.projectId,
        taskTitle: task.title,
        logDate,
        startTime: logStart,
        endTime:   logEnd || null,
        content:   task.title,
      });
      setTaskLogs(prev => [...prev, created]);
      setLogEnd('');
      setShowLogForm(false);
    } finally { setSavingLog(false); }
  };

  const deleteLog = async (id: string) => {
    await removeLog(id);
    setTaskLogs(prev => prev.filter(l => l.id !== id));
  };

  // 날짜 포맷
  const ago = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return '방금';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  };

  return (
    <>
      {/* 백드롭 */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* 패널 */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority]}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>
            <span className="text-xs text-gray-400 font-mono">{task.id}</span>
          </div>
          <div className="flex items-center gap-2">
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="삭제">
                <Trash2 size={16} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-600">삭제할까요?</span>
                <button onClick={handleDelete}
                  className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">확인</button>
                <button onClick={() => setConfirmDelete(false)}
                  className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100">취소</button>
              </div>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">

            {/* 제목 */}
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-full text-xl font-bold text-gray-900 outline-none border-b-2 border-transparent focus:border-blue-400 pb-1 transition-colors"
            />

            {/* 메타 그리드 */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <MetaField label="상태">
                <select value={task.status} onChange={e => saveField({ status: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  {(Object.keys(STATUS_LABEL) as TaskStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </MetaField>

              <MetaField label="우선순위">
                <select value={task.priority} onChange={e => saveField({ priority: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="urgent">긴급</option>
                  <option value="high">높음</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음</option>
                </select>
              </MetaField>

              <MetaField label="담당자">
                <select value={task.assigneeId ?? ''} onChange={e => saveField({ assigneeId: e.target.value || null })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="">미배정</option>
                  {projectUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </MetaField>

              <MetaField label="보고자">
                <p className="text-gray-700 py-1.5">{reporter?.name ?? '-'}</p>
              </MetaField>

              <MetaField label="시작일">
                <input type="date" value={task.startDate ?? ''} onChange={e => saveField({ startDate: e.target.value || null })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </MetaField>

              <MetaField label="마감일">
                <input type="date" value={task.dueDate ?? ''} onChange={e => saveField({ dueDate: e.target.value || null })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </MetaField>
            </div>

            {/* 태그 */}
            <div>
              <p className="text-xs text-gray-400 mb-2">태그</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {task.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="태그 입력 후 Enter"
                  className="text-xs border border-dashed border-gray-300 rounded-full px-2.5 py-0.5 outline-none focus:border-blue-400 w-36"
                />
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 진행 이력 */}
            {(task.startedAt || task.reviewedAt || task.completedAt) && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock size={13} className="text-gray-400" />
                  <p className="text-xs text-gray-400 font-medium">진행 이력</p>
                  <Lock size={10} className="text-gray-300 ml-auto" title="시스템이 자동 기록합니다" />
                </div>
                <div className="space-y-1.5">
                  {([
                    { key: 'startedAt',   label: '시작됨',  color: 'bg-blue-100 text-blue-600'   },
                    { key: 'reviewedAt',  label: '검토됨',  color: 'bg-yellow-100 text-yellow-600' },
                    { key: 'completedAt', label: '완료됨',  color: 'bg-green-100 text-green-600'  },
                  ] as const).map(({ key, label, color }) => {
                    const val = task[key];
                    if (!val) return null;
                    const d = new Date(val);
                    const formatted = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}  ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${color}`}>{label}</span>
                        <span className="text-xs text-gray-500 font-mono">{formatted}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 설명 */}
            <div>
              <p className="text-xs text-gray-400 mb-2">설명</p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={saveDesc}
                rows={5}
                placeholder="설명을 입력하세요..."
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-400 resize-none placeholder-gray-300"
              />
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 체크리스트 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare size={14} className="text-gray-400" />
                  <p className="text-xs text-gray-400 font-medium">
                    체크리스트
                    {checklist.length > 0 && (
                      <span className="ml-1 text-blue-600 font-semibold">
                        {checklist.filter(c => c.is_done).length}/{checklist.length}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* 진행률 바 */}
              {checklist.length > 0 && (
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.round((checklist.filter(c => c.is_done).length / checklist.length) * 100)}%` }}
                  />
                </div>
              )}

              <div className="space-y-1 mb-2">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-start gap-2 group/ci py-0.5">
                    <button onClick={() => toggleCheck(item)} className="mt-0.5 shrink-0 text-gray-400 hover:text-blue-600 transition-colors">
                      {item.is_done
                        ? <CheckSquare size={16} className="text-blue-500" />
                        : <Square size={16} />}
                    </button>
                    {editingCheck === item.id ? (
                      <input
                        autoFocus
                        value={editCheckText}
                        onChange={e => setEditCheckText(e.target.value)}
                        onBlur={() => saveCheckEdit(item)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveCheckEdit(item);
                          if (e.key === 'Escape') setEditingCheck(null);
                        }}
                        className="flex-1 text-sm border-b border-blue-400 outline-none py-0.5"
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingCheck(item.id); setEditCheckText(item.content); }}
                        className={`flex-1 text-sm cursor-text leading-relaxed ${item.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}
                      >
                        {item.content}
                      </span>
                    )}
                    <button onClick={() => removeCheckItem(item.id)}
                      className="opacity-0 group-hover/ci:opacity-100 text-gray-300 hover:text-red-500 transition-all shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* 항목 추가 입력 */}
              <div className="flex items-center gap-2">
                <Square size={16} className="text-gray-300 shrink-0" />
                <input
                  value={checkInput}
                  onChange={e => setCheckInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem(); } }}
                  placeholder="항목 추가... (Enter)"
                  className="flex-1 text-sm text-gray-600 outline-none placeholder-gray-300 border-b border-transparent focus:border-gray-200 py-0.5 transition-colors"
                />
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 업무 시간 기록 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-gray-400" />
                  <p className="text-xs text-gray-400 font-medium">업무 시간 기록</p>
                  {taskLogs.length > 0 && (
                    <span className="text-xs text-cyan-600 font-semibold">{taskLogs.length}건</span>
                  )}
                </div>
                <button onClick={() => setShowLogForm(f => !f)}
                  className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 border border-cyan-200 hover:border-cyan-400 rounded-md px-2 py-1 transition-colors">
                  <Plus size={11}/> 시간 추가
                </button>
              </div>

              {/* 기록 폼 */}
              {showLogForm && (
                <div className="mb-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500">날짜</label>
                      <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"/>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500">시작</label>
                      <input type="time" value={logStart} onChange={e => setLogStart(e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"/>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500">종료</label>
                      <input type="time" value={logEnd} onChange={e => setLogEnd(e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"/>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowLogForm(false)}
                      className="flex-1 py-1 border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-50 transition-colors">취소</button>
                    <button onClick={submitLog} disabled={savingLog || !logStart}
                      className="flex-1 py-1 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1">
                      <Check size={11}/> {savingLog ? '저장 중...' : '업무일지에 기록'}
                    </button>
                  </div>
                </div>
              )}

              {/* 기존 기록 목록 */}
              {taskLogs.length === 0 ? (
                <p className="text-xs text-gray-300 text-center py-2">아직 시간 기록이 없습니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {[...taskLogs].sort((a,b) => b.logDate.localeCompare(a.logDate) || a.startTime.localeCompare(b.startTime)).map(log => (
                    <div key={log.id} className="flex items-center gap-2 group/log">
                      <div className="flex-1 flex items-center gap-2 text-xs bg-cyan-50 border border-cyan-100 rounded-lg px-3 py-1.5">
                        <span className="text-cyan-700 font-medium">{log.logDate}</span>
                        <span className="text-gray-500 font-mono">
                          {log.startTime.slice(0,5)}{log.endTime ? ` ~ ${log.endTime.slice(0,5)}` : ''}
                        </span>
                      </div>
                      <button onClick={() => { if (confirm('이 기록을 삭제할까요?')) deleteLog(log.id); }}
                        className="opacity-0 group-hover/log:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1">
                        <X size={12}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 댓글 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={14} className="text-gray-400" />
                <p className="text-xs text-gray-400 font-medium">댓글 {comments.length}</p>
              </div>

              <div className="space-y-4">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                      {c.author_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-800">{c.author_name}</span>
                        <span className="text-xs text-gray-400">{ago(c.created_at)}</span>
                        {(c.author_id === currentUser?.id || currentUser?.role === 'admin') && (
                          <button onClick={() => removeComment(c.id)}
                            className="ml-auto text-gray-300 hover:text-red-500 transition-colors">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* 댓글 입력 — 하단 고정 */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
              {currentUser?.name[0]}
            </div>
            <input
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              placeholder="댓글 입력... (Enter로 전송)"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button onClick={submitComment} disabled={commenting || !commentInput.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {children}
    </div>
  );
}
