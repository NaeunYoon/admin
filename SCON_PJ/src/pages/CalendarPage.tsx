import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO
} from 'date-fns';
import { ko } from 'date-fns/locale';
import TaskDetailPanel from '../components/TaskDetailPanel';

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-blue-400',
  low: 'bg-gray-400',
};

export default function CalendarPage() {
  const { projectId } = useParams();
  const { projects, tasks } = useProjectStore();
  const users = useUserStore(s => s.users);
  const project = projects.find(p => p.id === projectId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const projectTasks = tasks.filter(t => t.projectId === projectId);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getTasksForDay = (day: Date) =>
    projectTasks.filter(t => {
      if (t.dueDate && isSameDay(parseISO(t.dueDate), day)) return true;
      if (t.startDate && isSameDay(parseISO(t.startDate), day)) return true;
      return false;
    });

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const selectedTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  if (!project) return null;

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to={`/projects/${projectId}`} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs text-gray-400">{project.code}</p>
          <h2 className="text-lg font-bold text-gray-900">{project.name} — 일정</h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              {format(currentDate, 'yyyy년 MM월', { locale: ko })}
            </h3>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                오늘
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} className={`text-center text-xs font-semibold py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map(day => {
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const todayFlag = isToday(day);
              const dayNum = day.getDay();

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-16 p-1.5 rounded-lg text-left transition-colors ${
                    isSelected ? 'bg-blue-50 border border-blue-300' :
                    'hover:bg-gray-50 border border-transparent'
                  } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                >
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    todayFlag ? 'bg-blue-600 text-white' :
                    dayNum === 0 ? 'text-red-400' :
                    dayNum === 6 ? 'text-blue-400' :
                    'text-gray-700'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayTasks.slice(0, 2).map(t => (
                      <div
                        key={t.id}
                        onClick={e => { e.stopPropagation(); setSelectedTaskId(t.id); }}
                        className={`${PRIORITY_COLOR[t.priority]} text-white text-xs px-1 py-0.5 rounded truncate leading-tight cursor-pointer hover:brightness-90 transition-all`}
                      >
                        {t.title.length > 6 ? t.title.slice(0, 6) + '…' : t.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <p className="text-xs text-gray-400">+{dayTasks.length - 2}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Task list */}
        <div className="space-y-4">
          {/* Selected day tasks */}
          {selectedDay && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">
                {format(selectedDay, 'MM월 dd일 (EEE)', { locale: ko })}
              </h4>
              {selectedTasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">업무 없음</p>
              ) : (
                <div className="space-y-2">
                  {selectedTasks.map(t => {
                    const assignee = users.find(u => u.id === t.assigneeId);
                    return (
                      <div key={t.id}
                        onClick={() => setSelectedTaskId(t.id)}
                        className={`p-3 rounded-lg border-l-4 bg-gray-50 cursor-pointer hover:bg-blue-50 transition-colors ${
                          { urgent: 'border-l-red-500', high: 'border-l-orange-400', medium: 'border-l-blue-400', low: 'border-l-gray-300' }[t.priority]
                        }`}>
                        <p className="text-sm font-medium text-gray-800">{t.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-400">{assignee?.name ?? '미배정'}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${{
                            todo: 'bg-gray-100 text-gray-600',
                            in_progress: 'bg-blue-100 text-blue-700',
                            review: 'bg-yellow-100 text-yellow-700',
                            done: 'bg-green-100 text-green-700',
                          }[t.status]}`}>
                            {{ todo: '할 일', in_progress: '진행 중', review: '검토', done: '완료' }[t.status]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upcoming tasks */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-800 mb-3 text-sm">전체 업무 목록</h4>
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {projectTasks.filter(t => t.status !== 'done').map(t => {
                const assignee = users.find(u => u.id === t.assigneeId);
                return (
                  <div key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="flex items-start gap-2 p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${PRIORITY_COLOR[t.priority]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{t.title}</p>
                      <p className="text-xs text-gray-400">{assignee?.name ?? '미배정'} · {t.dueDate ?? '기한 없음'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {selectedTaskId && (
        <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
}
