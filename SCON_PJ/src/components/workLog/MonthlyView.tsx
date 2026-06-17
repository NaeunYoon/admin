import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, X } from 'lucide-react';
import { useMonthlyPlanStore, type MonthlyPlan } from '../../store/monthlyPlanStore';
import { useProjectStore } from '../../store/projectStore';

const PRIORITIES = [
  { value: 1, bg: 'bg-red-500',    label: '필수·일정엄수' },
  { value: 2, bg: 'bg-blue-500',   label: '중요·여유' },
  { value: 3, bg: 'bg-green-500',  label: '선택·일정엄수' },
  { value: 4, bg: 'bg-yellow-400', label: '선택·여유' },
] as const;
const priorityBar = (p: number) => PRIORITIES.find(x => x.value === p)?.bg ?? 'bg-blue-500';

function getMonthWeeks(month: Date) {
  const y = month.getFullYear(), m = month.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return [
    { w: 1, start: new Date(y, m, 1),  end: new Date(y, m, 7),    label: '1주', days: '1–7' },
    { w: 2, start: new Date(y, m, 8),  end: new Date(y, m, 14),   label: '2주', days: '8–14' },
    { w: 3, start: new Date(y, m, 15), end: new Date(y, m, 21),   label: '3주', days: '15–21' },
    { w: 4, start: new Date(y, m, 22), end: new Date(y, m, last), label: '4주', days: `22–${last}` },
  ];
}
function overlaps(plan: MonthlyPlan, start: Date, end: Date) {
  const s = parseISO(plan.startDate), e = parseISO(plan.endDate);
  return s <= end && e >= start;
}
// 한 구간[mStart,mEnd] 안에서 계획이 차지하는 비율(좌측 여백%, 너비%) — 연간 뷰 부분 채움용
function segment(plan: MonthlyPlan, mStart: Date, mEnd: Date): { left: number; width: number } | null {
  const ps = parseISO(plan.startDate), pe = parseISO(plan.endDate);
  if (ps > mEnd || pe < mStart) return null;
  const total = mEnd.getDate();
  const startDay = ps < mStart ? 1 : ps.getDate();
  const endDay   = pe > mEnd ? total : pe.getDate();
  return { left: (startDay - 1) / total * 100, width: (endDay - startDay + 1) / total * 100 };
}
function progressText(p: number) {
  if (p >= 100) return 'text-green-600';
  if (p >= 50)  return 'text-cyan-600';
  if (p > 0)    return 'text-amber-600';
  return 'text-gray-400';
}
function progressBar(p: number) {
  if (p >= 100) return 'bg-green-500';
  if (p >= 50)  return 'bg-cyan-500';
  if (p > 0)    return 'bg-amber-400';
  return 'bg-gray-300';
}

function EmptyState({ readOnly }: { readOnly?: boolean }) {
  return (
    <div className="text-center text-gray-400 text-sm py-12 border border-dashed border-gray-200 rounded-xl">
      계획이 없습니다.{!readOnly && ' ‘계획 추가’로 시작하세요.'}
    </div>
  );
}

// ─── 월간 계획 등록/수정 모달 (간소화: 프로젝트·업무내용·업무구분·기간 / 진행률 자동) ───
function MonthlyPlanModal({ editing, onSave, onClose }: {
  editing?: MonthlyPlan; onSave: (data: any) => Promise<void>; onClose: () => void;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { tasks, projects } = useProjectStore();

  const initProjId = editing?.projectName
    ? (projects.find(p => p.name === editing.projectName || `[${p.code}] ${p.name}` === editing.projectName)?.id ?? '')
    : '';
  const [projId,     setProjId]     = useState(initProjId);
  const [projManual, setProjManual] = useState<boolean>(!initProjId && !!editing?.projectName);
  const [projText,   setProjText]   = useState(!initProjId && editing?.projectName ? editing.projectName : '');
  const [taskName,   setTaskName]   = useState(editing?.taskName ?? '');
  const [category,   setCategory]   = useState(editing?.category  ?? '');
  const [startDate,  setStartDate]  = useState(editing?.startDate ?? today);
  const [endDate,    setEndDate]    = useState(editing?.endDate   ?? today);
  const [priority,   setPriority]   = useState(editing?.priority  ?? 2);
  const [saving,     setSaving]     = useState(false);

  // 진행률 = 선택 프로젝트의 완료 태스크 비율 (자동). 프로젝트 미선택 시 기존 값 유지.
  const projectProgress = (pid: string) => {
    const pts = tasks.filter((t: any) => t.projectId === pid);
    if (pts.length === 0) return 0;
    return Math.round(pts.filter((t: any) => t.status === 'done').length / pts.length * 100);
  };
  const autoProgress = projId ? projectProgress(projId) : (editing?.progress ?? 0);

  const handleProjChange = (val: string) => {
    if (val === '__manual__') { setProjManual(true); setProjId(''); }
    else { setProjManual(false); setProjId(val); }
  };
  const finalProjectName = () => projManual ? (projText.trim() || null) : (projects.find(p => p.id === projId)?.name ?? null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: editing?.id, taskName: taskName.trim(), projectName: finalProjectName(),
        category: category.trim() || null, assigneeNote: null,
        startDate, endDate, progress: autoProgress, priority,
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{editing ? '계획 수정' : '월간 계획 추가'}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">서비스 / 프로젝트</label>
          <select value={projManual ? '__manual__' : projId} onChange={e => handleProjChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">선택 안 함</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
            <option value="__manual__">직접 입력</option>
          </select>
          {projManual && (
            <input value={projText} onChange={e => setProjText(e.target.value)} placeholder="서비스 / 프로젝트명 입력"
              className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">업무 내용 *</label>
          <input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="업무 내용을 입력하세요" autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">업무 구분</label>
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="예) 기획, 개발, 디자인"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">시작일</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">종료일</label>
            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">진행률 <span className="text-gray-400">(프로젝트 완료율 자동)</span></label>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${progressBar(autoProgress)}`} style={{ width: `${autoProgress}%` }}/></div>
            <span className={`text-sm font-bold ${progressText(autoProgress)}`}>{autoProgress}%</span>
          </div>
          {!projId && <p className="text-[11px] text-gray-400 mt-1">프로젝트를 선택하면 완료율이 자동 계산됩니다.</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">중요도</label>
          <div className="grid grid-cols-2 gap-2">
            {PRIORITIES.map(p => (
              <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${priority === p.value ? 'border-gray-800 ring-1 ring-gray-300 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <span className={`w-3.5 h-3.5 rounded-sm shrink-0 ${p.bg}`}/>
                <span className={`text-xs ${priority === p.value ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button type="submit" disabled={saving || !taskName.trim()}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? '저장 중...' : '저장'}</button>
        </div>
      </form>
    </div>
  );
}

// ═══════════ 월간 뷰 — 월간(주 컬럼/카드) · 연간(12개월 간트) 토글 ═══════════
export default function MonthlyView({ base, setBase, currentUserId, filterUserId, readOnly }: {
  base: Date; setBase: (d: Date) => void; currentUserId: string; filterUserId?: string; readOnly?: boolean;
}) {
  const [planModal, setPlanModal] = useState<{ open: boolean; editing?: MonthlyPlan }>({ open: false });
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const { plans, fetchPlans, addPlan, editPlan, removePlan } = useMonthlyPlanStore();

  const year = base.getFullYear(), month = base.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0);
  const weeks = getMonthWeeks(base);
  const months12 = Array.from({ length: 12 }, (_, i) => ({ idx: i, start: new Date(year, i, 1), end: new Date(year, i + 1, 0), label: `${i + 1}월` }));

  useEffect(() => { fetchPlans({ year }); }, [year]);

  const all = filterUserId ? plans.filter(p => p.userId === filterUserId) : plans;
  const sortPlans = (arr: MonthlyPlan[]) => [...arr].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.priority - b.priority);
  const monthPlans = sortPlans(all.filter(p => overlaps(p, monthStart, monthEnd)));
  const yearPlans  = sortPlans(all.filter(p => overlaps(p, new Date(year, 0, 1), new Date(year, 11, 31))));

  const canEdit = (p: MonthlyPlan) => !readOnly && p.userId === currentUserId;
  const handleSavePlan = async (data: any) => {
    if (data.id) { const { id, ...rest } = data; await editPlan(id, rest); }
    else { await addPlan(data); }
  };
  const range = (p: MonthlyPlan) => `${format(parseISO(p.startDate), 'M/d')} ~ ${format(parseISO(p.endDate), 'M/d')}`;
  const editIcons = (p: MonthlyPlan) => canEdit(p) ? (
    <div className="flex gap-1 shrink-0">
      <button onClick={() => setPlanModal({ open: true, editing: p })} className="text-gray-400 hover:text-blue-600 p-0.5"><Pencil size={13}/></button>
      <button onClick={() => { if (confirm('삭제할까요?')) removePlan(p.id); }} className="text-gray-400 hover:text-red-600 p-0.5"><Trash2 size={13}/></button>
    </div>
  ) : null;

  return (
    <div className="px-4 sm:px-6 py-5">
      {/* 모드 토글 + 추가 */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setMode('month')} className={`px-3.5 py-1.5 text-sm ${mode === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>월간</button>
          <button onClick={() => setMode('year')} className={`px-3.5 py-1.5 text-sm border-l border-gray-200 ${mode === 'year' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>연간</button>
        </div>
        {!readOnly && (
          <button onClick={() => setPlanModal({ open: true })}
            className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 shrink-0">
            <Plus size={14}/> 계획 추가
          </button>
        )}
      </div>

      {/* 기간 네비 */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {mode === 'month' ? (
          <>
            <button onClick={() => setBase(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} className="text-gray-500"/></button>
            <p className="font-bold text-gray-800 text-base sm:text-lg whitespace-nowrap">{format(base, 'yyyy년 M월', { locale: ko })}</p>
            <button onClick={() => setBase(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} className="text-gray-500"/></button>
            <button onClick={() => setBase(new Date())} className="text-xs text-blue-600 hover:underline ml-1">이번 달</button>
          </>
        ) : (
          <>
            <button onClick={() => setBase(new Date(year - 1, 0, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} className="text-gray-500"/></button>
            <p className="font-bold text-gray-800 text-base sm:text-lg whitespace-nowrap">{year}년</p>
            <button onClick={() => setBase(new Date(year + 1, 0, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} className="text-gray-500"/></button>
            <button onClick={() => setBase(new Date())} className="text-xs text-blue-600 hover:underline ml-1">올해</button>
          </>
        )}
      </div>

      {/* 중요도 범례 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4 text-[11px] text-gray-500">
        {PRIORITIES.map(p => (<span key={p.value} className="flex items-center gap-1"><span className={`w-3 h-3 rounded-sm ${p.bg}`}/>{p.label}</span>))}
      </div>

      {/* ─────────── 월간 ─────────── */}
      {mode === 'month' && (monthPlans.length === 0 ? <EmptyState readOnly={readOnly}/> : (
        <>
          {/* 웹: 주 컬럼 차트 */}
          <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid items-center bg-slate-600 text-white text-xs font-semibold" style={{ gridTemplateColumns: '1.7fr 90px 96px repeat(4, 1fr)' }}>
              <div className="px-3 py-2">업무 내용</div>
              <div className="px-2 py-2 text-center border-l border-slate-500">담당</div>
              <div className="px-2 py-2 text-center border-l border-slate-500">진행률</div>
              {weeks.map(w => (<div key={w.w} className="px-1 py-2 text-center border-l border-slate-500">{w.label}<span className="block text-[10px] font-normal text-slate-300">{w.days}</span></div>))}
            </div>
            {monthPlans.map((p, i) => (
              <div key={p.id} className={`grid items-stretch text-xs ${i % 2 ? 'bg-gray-50' : 'bg-white'}`} style={{ gridTemplateColumns: '1.7fr 90px 96px repeat(4, 1fr)' }}>
                <div className="px-3 py-2.5 min-w-0 flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className={`font-medium text-gray-800 truncate ${canEdit(p) ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`} onClick={() => canEdit(p) && setPlanModal({ open: true, editing: p })}>{p.taskName}</p>
                    {(p.projectName || p.category) && <p className="text-[10px] text-gray-400 truncate">{[p.projectName, p.category].filter(Boolean).join(' · ')}</p>}
                  </div>
                  {editIcons(p)}
                </div>
                <div className="px-2 py-2.5 text-center text-gray-600 border-l border-gray-100 truncate flex items-center justify-center">{p.assigneeNote ?? p.userName ?? '-'}</div>
                <div className="px-2 py-2.5 border-l border-gray-100 flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${progressBar(p.progress)}`} style={{ width: `${p.progress}%` }}/></div>
                  <span className={`text-[10px] font-bold ${progressText(p.progress)}`}>{p.progress}%</span>
                </div>
                {weeks.map(w => {
                  const active = overlaps(p, w.start, w.end);
                  return <div key={w.w} className="border-l border-gray-100 flex items-center px-1 py-2.5">{active && <div className={`h-4 w-full rounded ${priorityBar(p.priority)}`}/>}</div>;
                })}
              </div>
            ))}
          </div>
          {/* 모바일: 카드 */}
          <div className="md:hidden space-y-3">
            {monthPlans.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex">
                  <div className={`w-1.5 shrink-0 ${priorityBar(p.priority)}`}/>
                  <div className="flex-1 min-w-0 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-800 text-sm break-words flex-1">{p.taskName}</p>
                      {editIcons(p)}
                    </div>
                    {(p.projectName || p.category) && <p className="text-xs text-gray-400 mt-0.5">{[p.projectName, p.category].filter(Boolean).join(' · ')}</p>}
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2"><span>{p.assigneeNote ?? p.userName ?? '-'}</span><span className="font-mono">{range(p)}</span></div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${progressBar(p.progress)}`} style={{ width: `${p.progress}%` }}/></div>
                      <span className={`text-xs font-bold ${progressText(p.progress)}`}>{p.progress}%</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      {weeks.map(w => { const active = overlaps(p, w.start, w.end); return (
                        <div key={w.w} className="text-center"><div className={`h-3 rounded ${active ? priorityBar(p.priority) : 'bg-gray-100'}`}/><span className="text-[9px] text-gray-400">{w.label}</span></div>
                      ); })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ))}

      {/* ─────────── 연간 (12개월 간트, 가로 스크롤) ─────────── */}
      {mode === 'year' && (yearPlans.length === 0 ? <EmptyState readOnly={readOnly}/> : (
        <div className="border border-gray-200 rounded-xl overflow-x-auto">
          <div style={{ minWidth: 820 }}>
            <div className="grid items-center bg-slate-600 text-white text-xs font-semibold" style={{ gridTemplateColumns: '180px 60px 50px repeat(12, minmax(40px,1fr))' }}>
              <div className="px-3 py-2">업무 내용</div>
              <div className="px-1 py-2 text-center border-l border-slate-500">담당</div>
              <div className="px-1 py-2 text-center border-l border-slate-500">진행</div>
              {months12.map(m => <div key={m.idx} className="px-1 py-2 text-center border-l border-slate-500">{m.label}</div>)}
            </div>
            {yearPlans.map((p, i) => (
              <div key={p.id} className={`grid items-stretch text-xs ${i % 2 ? 'bg-gray-50' : 'bg-white'}`} style={{ gridTemplateColumns: '180px 60px 50px repeat(12, minmax(40px,1fr))' }}>
                <div className="px-3 py-2.5 min-w-0 flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className={`font-medium text-gray-800 truncate ${canEdit(p) ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`} onClick={() => canEdit(p) && setPlanModal({ open: true, editing: p })}>{p.taskName}</p>
                    {(p.projectName || p.category) && <p className="text-[10px] text-gray-400 truncate">{[p.projectName, p.category].filter(Boolean).join(' · ')}</p>}
                  </div>
                  {editIcons(p)}
                </div>
                <div className="px-1 py-2.5 text-center text-gray-600 border-l border-gray-100 truncate flex items-center justify-center">{p.assigneeNote ?? p.userName ?? '-'}</div>
                <div className="px-1 py-2.5 text-center border-l border-gray-100 flex items-center justify-center"><span className={`text-[10px] font-bold ${progressText(p.progress)}`}>{p.progress}%</span></div>
                {months12.map(m => {
                  const seg = segment(p, m.start, m.end);
                  return <div key={m.idx} className="border-l border-gray-100 flex items-center px-0.5 py-2.5">{seg && <div className={`h-4 rounded ${priorityBar(p.priority)}`} style={{ marginLeft: `${seg.left}%`, width: `${seg.width}%` }}/>}</div>;
                })}
              </div>
            ))}
          </div>
        </div>
      ))}

      {planModal.open && !readOnly && (
        <MonthlyPlanModal editing={planModal.editing} onSave={handleSavePlan} onClose={() => setPlanModal({ open: false })}/>
      )}
    </div>
  );
}
