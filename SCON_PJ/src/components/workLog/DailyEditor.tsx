import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, Save, Link2 } from 'lucide-react';
import { useWorkLogStore, isFullDayLeave, leaveLabel, type LeaveSpan } from '../../store/workLogStore';
import { useProjectStore } from '../../store/projectStore';

function leaveForDate(leaves: LeaveSpan[], d: string): LeaveSpan | null {
  return leaves.find(l => l.startDate <= d && d <= l.endDate) ?? null;
}

type Entry = { key: string; id: string | null; content: string; taskId: string; taskTitle?: string | null };
let keyCounter = 1;

export default function DailyEditor({ currentUserId }: { currentUserId: string }) {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const { leaves, fetchLogs, fetchDaily, fetchLeave, saveDaily, addLog, editLog, removeLog } = useWorkLogStore();
  const { tasks, projects } = useProjectStore();
  const myTasks = tasks.filter((t: any) => t.assigneeId === currentUserId);

  const [entries,      setEntries]      = useState<Entry[]>([]);
  const [todayGoal,    setTodayGoal]    = useState('');
  const [tomorrowGoal, setTomorrowGoal] = useState('');
  const [overtime,     setOvertime]     = useState('');
  const [issues,       setIssues]       = useState('');
  const [weekGoalKeep, setWeekGoalKeep] = useState('');
  const [dirty,        setDirty]        = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [justSaved,    setJustSaved]    = useState(false);
  const [loading,      setLoading]      = useState(true);

  // 날짜 변경 → 서버 로드 후 로컬 상태 초기화
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      await Promise.all([
        fetchLogs({ userId: currentUserId, startDate: date, endDate: date }),
        fetchDaily({ userId: currentUserId, startDate: date, endDate: date }),
        fetchLeave({ userId: currentUserId, startDate: date, endDate: date }),
      ]);
      if (!active) return;
      const s = useWorkLogStore.getState();
      const dl = s.logs.filter(l => l.userId === currentUserId && l.logDate === date);
      setEntries(dl.map(l => ({ key: `s${l.id}`, id: l.id, content: l.content, taskId: l.taskId ?? '', taskTitle: l.taskTitle })));
      const m = s.dailyMeta[`${currentUserId}_${date}`];
      setTodayGoal(m?.todayGoal ?? ''); setTomorrowGoal(m?.tomorrowGoal ?? '');
      setOvertime(m?.overtime ?? ''); setIssues(m?.issues ?? ''); setWeekGoalKeep(m?.weekGoal ?? '');
      setDirty(false); setJustSaved(false); setLoading(false);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, currentUserId]);

  const leave = leaveForDate(leaves, date);
  const full  = leave ? isFullDayLeave(leave) : false;

  const markDirty   = () => { setDirty(true); setJustSaved(false); };
  const addEntry    = () => { setEntries(e => [...e, { key: `n${keyCounter++}`, id: null, content: '', taskId: '' }]); markDirty(); };
  const updateEntry = (key: string, patch: Partial<Entry>) => { setEntries(e => e.map(x => x.key === key ? { ...x, ...patch } : x)); markDirty(); };
  const removeEntry = (key: string) => { setEntries(e => e.filter(x => x.key !== key)); markDirty(); };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const s = useWorkLogStore.getState();
      const serverLogs = s.logs.filter(l => l.userId === currentUserId && l.logDate === date);
      const keepIds = new Set(entries.filter(e => e.id).map(e => e.id));
      for (const sl of serverLogs) if (!keepIds.has(sl.id)) await removeLog(sl.id);
      for (const e of entries) {
        const content = e.content.trim();
        const t = myTasks.find((x: any) => x.id === e.taskId);
        if (!content) { if (e.id) await removeLog(e.id); continue; }
        if (e.id) {
          await editLog(e.id, { taskId: e.taskId || null, projectId: t?.projectId ?? null, logDate: date, startTime: null, endTime: null, content, category: null } as any);
        } else {
          await addLog({ userId: currentUserId, taskId: e.taskId || null, projectId: t?.projectId ?? null, logDate: date, startTime: null, endTime: null, content } as any);
        }
      }
      await saveDaily({ userId: currentUserId, logDate: date, todayGoal, tomorrowGoal, overtime, issues, weekGoal: weekGoalKeep });
      await Promise.all([
        fetchLogs({ userId: currentUserId, startDate: date, endDate: date }),
        fetchDaily({ userId: currentUserId, startDate: date, endDate: date }),
      ]);
      const s2 = useWorkLogStore.getState();
      const dl = s2.logs.filter(l => l.userId === currentUserId && l.logDate === date);
      setEntries(dl.map(l => ({ key: `s${l.id}`, id: l.id, content: l.content, taskId: l.taskId ?? '', taskTitle: l.taskTitle })));
      setDirty(false); setJustSaved(true);
    } finally { setSaving(false); }
  };

  const grouped = projects.map((p: any) => ({ project: p, tasks: myTasks.filter((t: any) => t.projectId === p.id) })).filter((g: any) => g.tasks.length > 0);
  const isTodaySel = date === format(new Date(), 'yyyy-MM-dd');
  const inputCls = 'w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-cyan-500';

  return (
    <div className="px-4 sm:px-6 py-5 max-w-3xl mx-auto w-full">
      {/* 날짜 네비 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setDate(format(subDays(new Date(date), 1), 'yyyy-MM-dd'))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={20} className="text-gray-500"/></button>
        <div className="text-center">
          <p className="font-bold text-gray-800 text-lg">{format(new Date(date), 'M월 d일 (EEE)', { locale: ko })}</p>
          {!isTodaySel && <button onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))} className="text-xs text-cyan-600 hover:underline">오늘로</button>}
        </div>
        <button onClick={() => setDate(format(addDays(new Date(date), 1), 'yyyy-MM-dd'))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={20} className="text-gray-500"/></button>
      </div>

      {/* 휴가 배지 (연차/병가/반차/반반차/포상) */}
      {leave && (
        <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-2 ${full ? 'bg-gray-300 text-gray-700' : 'bg-amber-100 text-amber-800'}`}>
          {leaveLabel(leave)}{full ? ' · 휴무일 (입력 비활성화)' : ' · 부분 휴가'}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 text-sm py-10">불러오는 중...</div>
      ) : (
        <div className={full ? 'opacity-50 pointer-events-none select-none' : ''}>
          {/* 오늘 한 일 */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">오늘 한 일</h3>
              <button onClick={addEntry} className="flex items-center gap-1 text-sm text-cyan-600 border border-cyan-200 hover:border-cyan-400 rounded-lg px-2.5 py-1 transition-colors">
                <Plus size={14}/> 항목 추가
              </button>
            </div>
            <div className="space-y-2">
              {entries.length === 0 && <p className="text-sm text-gray-300 py-1">‘항목 추가’를 눌러 한 일을 적어주세요.</p>}
              {entries.map((e, i) => (
                <div key={e.key} className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-2.5">
                  <span className="text-cyan-400 mt-2.5 text-xs font-bold w-4 text-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <textarea value={e.content} rows={2} onChange={ev => updateEntry(e.key, { content: ev.target.value })} className={inputCls}/>
                    {grouped.length > 0 && (
                      <select value={e.taskId} onChange={ev => updateEntry(e.key, { taskId: ev.target.value })} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                        <option value="">업무 연결 안 함</option>
                        {grouped.map((g: any) => (
                          <optgroup key={g.project.id} label={`[${g.project.code}] ${g.project.name}`}>
                            {g.tasks.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    )}
                    {!e.taskId && e.taskTitle && <p className="text-[11px] text-cyan-600 flex items-center gap-0.5"><Link2 size={9}/>{e.taskTitle}</p>}
                  </div>
                  <button onClick={() => removeEntry(e.key)} className="p-1.5 text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={15}/></button>
                </div>
              ))}
            </div>
          </section>

          {/* 목표 · 이슈 */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">목표 · 이슈</h3>
            <div><label className="text-xs font-medium text-gray-500 block mb-1">금일목표</label><textarea rows={2} value={todayGoal} onChange={e => { setTodayGoal(e.target.value); markDirty(); }} className={inputCls}/></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1">익일목표</label><textarea rows={2} value={tomorrowGoal} onChange={e => { setTomorrowGoal(e.target.value); markDirty(); }} className={inputCls}/></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1">추가근무</label><textarea rows={1} value={overtime} onChange={e => { setOvertime(e.target.value); markDirty(); }} className={inputCls}/></div>
            <div><label className="text-xs font-medium text-gray-500 block mb-1">이슈</label><textarea rows={1} value={issues} onChange={e => { setIssues(e.target.value); markDirty(); }} className={inputCls}/></div>
          </section>
        </div>
      )}

      {/* 우하단 저장 버튼 (sticky) */}
      <div className="sticky bottom-4 flex justify-end items-center gap-3 mt-6">
        {dirty ? <span className="text-xs text-amber-600 bg-white/90 px-2 py-1 rounded">저장되지 않은 변경</span>
               : justSaved ? <span className="text-xs text-green-600 bg-white/90 px-2 py-1 rounded">저장됨</span> : null}
        <button onClick={save} disabled={saving || !dirty || full}
          className="flex items-center gap-1.5 bg-cyan-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-lg hover:bg-cyan-700 disabled:opacity-40 transition-colors">
          <Save size={16}/> {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
