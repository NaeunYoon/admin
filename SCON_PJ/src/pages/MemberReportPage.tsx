import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import WeeklyRollup from '../components/workLog/WeeklyRollup';
import MonthlyView from '../components/workLog/MonthlyView';

function tabClass(a: boolean) {
  return `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
    a ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'
  }`;
}

export default function MemberReportPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.currentUser);
  const { users } = useUserStore();
  const [view, setView]         = useState<'weekly' | 'monthly'>('weekly');
  const [weekBase, setWeekBase] = useState(new Date());
  const [monthBase, setMonthBase] = useState(new Date());

  if (currentUser?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  const member = users.find(u => u.id === userId);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate('/members')} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18}/></button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{member?.name ?? '구성원'} 업무보고</h1>
          <p className="text-xs text-gray-400 truncate">{member?.department} · {member?.email}</p>
        </div>
      </div>
      <div className="px-4 sm:px-6 border-b border-gray-100 flex gap-1">
        <button onClick={() => setView('weekly')} className={tabClass(view === 'weekly')}>주간</button>
        <button onClick={() => setView('monthly')} className={tabClass(view === 'monthly')}>월간</button>
      </div>
      <div>
        {view === 'weekly'  && <WeeklyRollup userId={userId!} base={weekBase} setBase={setWeekBase}/>}
        {view === 'monthly' && <MonthlyView base={monthBase} setBase={setMonthBase} currentUserId={currentUser.id} filterUserId={userId} readOnly/>}
      </div>
    </div>
  );
}
