import { useEffect } from 'react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import { useWorkLogStore, isFullDayLeave, leaveLabel, type LeaveSpan } from '../../store/workLogStore';

function weekRange(base: Date) {
  const start = startOfWeek(base, { weekStartsOn: 1 });
  const end   = endOfWeek(base,   { weekStartsOn: 1 });
  return { start, end, days: eachDayOfInterval({ start, end }) };
}
function leaveForDate(leaves: LeaveSpan[], d: string): LeaveSpan | null {
  return leaves.find(l => l.startDate <= d && d <= l.endDate) ?? null;
}

function MetaLine({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className={`text-xs font-semibold shrink-0 w-14 mt-0.5 ${color}`}>{label}</span>
      <span className="text-gray-700 whitespace-pre-wrap break-words flex-1">{value}</span>
    </div>
  );
}

// 일일 기록을 주 단위로 모아 보여준다. 읽기 전용.
export default function WeeklyRollup({ userId, base, setBase }: {
  userId: string; base: Date; setBase: (d: Date) => void;
}) {
  const { logs, dailyMeta, leaves, fetchLogs, fetchDaily, fetchLeave, loading } = useWorkLogStore();
  const { start, end, days } = weekRange(base);
  const weekdays = days.slice(0, 5); // 월~금

  useEffect(() => {
    const s = format(start, 'yyyy-MM-dd'), e = format(end, 'yyyy-MM-dd');
    fetchLogs({ userId, startDate: s, endDate: e });
    fetchDaily({ userId, startDate: s, endDate: e });
    fetchLeave({ userId, startDate: s, endDate: e });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, base]);

  const metaOf = (date: string) => dailyMeta[`${userId}_${date}`];

  return (
    <div className="px-4 sm:px-6 py-5 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setBase(subWeeks(base, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} className="text-gray-500"/></button>
        <div className="text-center">
          <p className="font-bold text-gray-800">{format(start, 'M/d')} – {format(end, 'M/d', { locale: ko })}</p>
          <button onClick={() => setBase(new Date())} className="text-xs text-cyan-600 hover:underline">이번 주</button>
        </div>
        <button onClick={() => setBase(addWeeks(base, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} className="text-gray-500"/></button>
      </div>
      <p className="text-xs text-gray-400 mb-3">일일 기록을 주 단위로 모았습니다 · 읽기 전용 (수정은 일일에서)</p>

      {loading ? (
        <div className="text-center text-gray-400 text-sm py-10">불러오는 중...</div>
      ) : (
        <div className="space-y-3">
          {weekdays.map(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const dayLogs = logs.filter(l => l.userId === userId && l.logDate === dateStr);
            const leave   = leaveForDate(leaves, dateStr);
            const full    = leave ? isFullDayLeave(leave) : false;
            const meta    = metaOf(dateStr);
            const empty   = dayLogs.length === 0 && !meta?.todayGoal && !meta?.issues && !meta?.overtime && !meta?.tomorrowGoal;
            return (
              <div key={dateStr} className={`rounded-xl border ${full ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'} ${isToday(d) ? 'ring-2 ring-cyan-200' : ''}`}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                  <span className="font-semibold text-gray-800 text-sm">{format(d, 'M/d (EEE)', { locale: ko })}</span>
                  {leave && <span className={`text-xs px-2 py-0.5 rounded-full ${full ? 'bg-gray-300 text-gray-700' : 'bg-amber-100 text-amber-700'}`}>{leaveLabel(leave)}</span>}
                </div>
                <div className="px-4 py-3">
                  {full ? (
                    <p className="text-sm text-gray-400">휴무일</p>
                  ) : empty ? (
                    <p className="text-sm text-gray-300">기록 없음</p>
                  ) : (
                    <div className="space-y-2">
                      {meta?.todayGoal && <MetaLine label="금일목표" value={meta.todayGoal} color="text-amber-700"/>}
                      {dayLogs.length > 0 && (
                        <ul className="space-y-1">
                          {dayLogs.map(l => (
                            <li key={l.id} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-cyan-400 mt-1.5 text-[8px]">●</span>
                              <span className="flex-1 whitespace-pre-wrap break-words">
                                {l.content}
                                {l.taskTitle && <span className="text-[11px] text-cyan-600 ml-1 inline-flex items-center gap-0.5"><Link2 size={9}/>{l.taskTitle}</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {meta?.overtime && <MetaLine label="추가근무" value={meta.overtime} color="text-gray-500"/>}
                      {meta?.issues && <MetaLine label="이슈" value={meta.issues} color="text-red-600"/>}
                      {meta?.tomorrowGoal && <MetaLine label="익일목표" value={meta.tomorrowGoal} color="text-amber-700"/>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
