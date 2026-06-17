import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import DailyEditor from '../components/workLog/DailyEditor';
import WeeklyRollup from '../components/workLog/WeeklyRollup';
import MonthlyView from '../components/workLog/MonthlyView';
import TeamWeeklyView from '../components/workLog/TeamWeeklyView';

type View = 'daily' | 'weekly' | 'monthly' | 'team';

function tabClass(active: boolean) {
  return `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
    active ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'
  }`;
}

export default function WorkLogPage() {
  const { currentUser } = useAuthStore();
  const uid = currentUser?.id ?? '';

  const [view, setView]             = useState<View>('daily');
  const [reportOpen, setReportOpen] = useState(false);
  const [weekBase, setWeekBase]     = useState(new Date());
  const [monthBase, setMonthBase]   = useState(new Date());
  const [teamWeek, setTeamWeek]     = useState(new Date());

  const reportTabs: { key: View; label: string }[] = [
    { key: 'weekly',  label: '주간' },
    { key: 'monthly', label: '월간' },
    { key: 'team',    label: '팀 주간' },
  ];
  const inReport = view !== 'daily';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">업무일지</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{currentUser?.department} · {currentUser?.name}</p>
      </div>

      {/* 상단 탭 */}
      <div className="px-4 sm:px-6 border-b border-gray-100 flex items-center gap-1">
        <button onClick={() => setView('daily')} className={tabClass(view === 'daily')}>일일</button>
        <button onClick={() => setReportOpen(o => !o)} className={`${tabClass(inReport)} flex items-center gap-1`}>
          나의 업무일지 <ChevronDown size={14} className={`transition-transform ${reportOpen ? 'rotate-180' : ''}`}/>
        </button>
      </div>

      {/* 아코디언 — 주간/월간/팀주간 */}
      {reportOpen && (
        <div className="px-4 sm:px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex gap-2 flex-wrap">
          {reportTabs.map(t => (
            <button key={t.key} onClick={() => setView(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                view === t.key ? 'bg-cyan-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* 본문 */}
      <div>
        {view === 'daily'   && <DailyEditor currentUserId={uid}/>}
        {view === 'weekly'  && <WeeklyRollup userId={uid} base={weekBase} setBase={setWeekBase}/>}
        {view === 'monthly' && <MonthlyView base={monthBase} setBase={setMonthBase} currentUserId={uid} filterUserId={uid}/>}
        {view === 'team'    && <TeamWeeklyView base={teamWeek} setBase={setTeamWeek}/>}
      </div>
    </div>
  );
}
