import { useEffect } from 'react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import { useWorkLogStore } from '../../store/workLogStore';
import { useUserStore } from '../../store/userStore';

function weekRange(base: Date) {
  const start = startOfWeek(base, { weekStartsOn: 1 });
  const end   = endOfWeek(base,   { weekStartsOn: 1 });
  return { start, end, days: eachDayOfInterval({ start, end }).slice(0, 5) };
}

const USER_BG   = ['bg-blue-50','bg-emerald-50','bg-purple-50','bg-orange-50','bg-rose-50'];
const USER_DOT  = ['bg-blue-500','bg-emerald-500','bg-purple-500','bg-orange-500','bg-rose-500'];
const USER_CHIP = ['bg-blue-100 border-blue-300','bg-emerald-100 border-emerald-300','bg-purple-100 border-purple-300','bg-orange-100 border-orange-300','bg-rose-100 border-rose-300'];

export default function TeamWeeklyView({ base, setBase }: { base: Date; setBase: (d: Date) => void }) {
  const { logs, fetchLogs } = useWorkLogStore();
  const { users } = useUserStore();
  const { start, end, days } = weekRange(base);

  useEffect(() => {
    fetchLogs({ startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const logsByUser: Record<string, typeof logs> = {};
  logs.forEach(l => { (logsByUser[l.userId] ??= []).push(l); });

  return (
    <div className="px-4 sm:px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setBase(subWeeks(base, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} className="text-gray-500"/></button>
        <div className="text-center">
          <p className="font-bold text-gray-800">{format(start, 'M/d')} – {format(end, 'M/d', { locale: ko })}</p>
          <p className="text-xs text-gray-400">팀 전체 주간 업무현황</p>
        </div>
        <button onClick={() => setBase(addWeeks(base, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} className="text-gray-500"/></button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-xs" style={{ minWidth: 760 }}>
          <colgroup>
            <col style={{ width: 110 }}/>
            {days.map((_, i) => <col key={i}/>)}
          </colgroup>
          <thead>
            <tr>
              <th className="bg-cyan-500 text-white text-center py-2 border border-cyan-600 font-semibold">구성원</th>
              {days.map(d => (
                <th key={d.toISOString()} className={`bg-cyan-500 text-white text-center py-2 border border-cyan-600 font-semibold ${isToday(d) ? '!bg-cyan-700' : ''}`}>
                  {format(d, 'M/d (EEE)', { locale: ko })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, ui) => {
              const ci = ui % USER_BG.length;
              const userLogs = logsByUser[user.id] ?? [];
              return (
                <tr key={user.id}>
                  <td className={`border border-gray-200 px-3 py-2 align-top ${USER_BG[ci]}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold shrink-0 ${USER_DOT[ci]}`}>{user.name[0]}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{user.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user.department}</p>
                      </div>
                    </div>
                  </td>
                  {days.map(d => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const dayLogs = userLogs.filter(l => l.logDate === dateStr);
                    return (
                      <td key={d.toISOString()} className={`border border-gray-200 px-2 py-2 align-top ${isToday(d) ? 'bg-cyan-50/40' : ''}`}>
                        {dayLogs.length === 0 ? (
                          <p className="text-gray-300 text-center py-1">-</p>
                        ) : (
                          <div className="space-y-1">
                            {dayLogs.map(log => (
                              <div key={log.id} className={`rounded px-2 py-1 border ${USER_CHIP[ci]}`}>
                                <div className="text-gray-700 leading-snug line-clamp-3 whitespace-pre-wrap break-words">{log.content}</div>
                                {log.taskTitle && <div className="text-[10px] text-cyan-600 flex items-center gap-0.5 mt-0.5"><Link2 size={8}/> {log.taskTitle}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
