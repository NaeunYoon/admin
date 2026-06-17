import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import type { User, Task, TaskPriority, TaskStatus } from '../types';
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  GanttChartSquare, CalendarDays, Plus, X,
} from 'lucide-react';
import TaskDetailPanel from '../components/TaskDetailPanel';
import {
  addDays, addWeeks, addMonths, subWeeks, subMonths,
  differenceInDays, parseISO, format, isToday, isWeekend,
  startOfWeek, eachDayOfInterval,
} from 'date-fns';
import { ko } from 'date-fns/locale';

/* ── 상수 ── */
type ViewMode = 'week' | '2week' | 'month';
const TOTAL_DAYS = 120;
const VIEW_CFG: Record<ViewMode, { dayPx: number; label: string }> = {
  week:    { dayPx: 90, label: '1주 줌' },
  '2week': { dayPx: 54, label: '2주 줌' },
  month:   { dayPx: 36, label: '월 줌'  },
};
const LEFT_W = 220;
const ROW_H  = 52;
const HDR_H  = 56;

const PRI_BAR: Record<TaskPriority, string> = {
  urgent: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-blue-500', low: 'bg-slate-400',
};
const PRI_LABEL: Record<TaskPriority, string> = {
  urgent: '긴급', high: '높음', medium: '보통', low: '낮음',
};
const ST_FADE: Record<TaskStatus, string> = {
  done: 'opacity-50', in_progress: '', review: 'opacity-80', todo: 'opacity-70',
};
const ST_LABEL: Record<TaskStatus, string> = {
  todo: '할 일', in_progress: '진행 중', review: '검토', done: '완료',
};

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function shiftDate(date: string | undefined, days: number): string | undefined {
  return date ? format(addDays(parseISO(date), days), 'yyyy-MM-dd') : undefined;
}

interface DragRef {
  taskId: string; type: 'move' | 'resize';
  startX: number; originalStart?: string; originalDue?: string;
}

/* ══════════════════════════════════════
   메인 페이지
══════════════════════════════════════ */
export default function TimelinePage() {
  const { projectId } = useParams();
  const { projects, tasks, addTask, updateTask } = useProjectStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const users = useUserStore(s => s.users);
  const project = projects.find(p => p.id === projectId);

  const [viewMode,       setViewMode]       = useState<ViewMode>('2week');
  const [viewStart,      setViewStart]      = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [hoverDayIdx,    setHoverDayIdx]    = useState<number | null>(null);
  const [createDate,     setCreateDate]     = useState<Date | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const dragRef = useRef<DragRef | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    taskId: string; deltaDays: number; type: 'move' | 'resize';
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!project) return null;

  const { dayPx } = VIEW_CFG[viewMode];
  const totalPx   = TOTAL_DAYS * dayPx;
  const dateRange = eachDayOfInterval({ start: viewStart, end: addDays(viewStart, TOTAL_DAYS - 1) });

  /* 오늘 기준 스크롤 */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const todayOff = differenceInDays(new Date(), viewStart);
    el.scrollLeft = Math.max(0, todayOff * dayPx - dayPx * 2);
  }, [viewStart, dayPx]);

  const goBack    = () => setViewStart(d =>
    viewMode === 'month' ? subMonths(d, 1) : subWeeks(d, viewMode === 'week' ? 1 : 2));
  const goForward = () => setViewStart(d =>
    viewMode === 'month' ? addMonths(d, 1) : addWeeks(d, viewMode === 'week' ? 1 : 2));
  const goToday   = () => setViewStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const members      = users.filter(u => project.memberIds.includes(u.id));
  const projectTasks = tasks.filter(t => t.projectId === projectId);
  const filtered     = projectTasks.filter(t =>
    filterAssignee === 'all' || t.assigneeId === filterAssignee);
  const scheduled    = [...filtered]
    .filter(t => t.startDate || t.dueDate)
    .sort((a, b) => (a.startDate ?? a.dueDate ?? '').localeCompare(b.startDate ?? b.dueDate ?? ''));
  const unscheduled  = filtered.filter(t => !t.startDate && !t.dueDate);

  const todayOff  = differenceInDays(new Date(), viewStart);
  const showToday = todayOff >= 0 && todayOff < TOTAL_DAYS;
  const todayX    = todayOff * dayPx + dayPx / 2;

  const monthGroups: { label: string; count: number }[] = [];
  dateRange.forEach(day => {
    const label = format(day, 'yyyy년 M월', { locale: ko });
    const last  = monthGroups.at(-1);
    if (last?.label === label) last.count++;
    else monthGroups.push({ label, count: 1 });
  });

  /* X 위치만으로 날짜 컬럼 계산 — Y는 각 행에서 처리 */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current) { setHoverDayIdx(null); return; }
    const el = containerRef.current;
    if (!el) return;
    const gridX = e.clientX - el.getBoundingClientRect().left + el.scrollLeft - LEFT_W;
    if (gridX < 0) { setHoverDayIdx(null); return; }
    const idx = Math.floor(gridX / dayPx);
    setHoverDayIdx(idx >= 0 && idx < TOTAL_DAYS ? idx : null);
  }, [dayPx]);

  /* 드래그 */
  const startDrag = useCallback((
    e: React.MouseEvent, taskId: string, type: 'move' | 'resize', task: Task,
  ) => {
    e.preventDefault(); e.stopPropagation();
    setHoverDayIdx(null);
    dragRef.current = { taskId, type, startX: e.clientX, originalStart: task.startDate, originalDue: task.dueDate };
    setDragPreview({ taskId, deltaDays: 0, type });

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setDragPreview(p => p ? { ...p, deltaDays: Math.round((ev.clientX - dragRef.current!.startX) / dayPx) } : null);
    };
    const onUp = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const { taskId: tid, type: t, originalStart, originalDue } = dragRef.current;
      const delta = Math.round((ev.clientX - dragRef.current.startX) / dayPx);
      if (delta !== 0) {
        if (t === 'move') {
          updateTask(tid, { startDate: shiftDate(originalStart, delta), dueDate: shiftDate(originalDue, delta) });
        } else {
          const newDue = shiftDate(originalDue, delta);
          if (newDue) {
            const floor = originalStart ?? originalDue;
            updateTask(tid, { dueDate: floor && newDue < floor ? floor : newDue });
          }
        }
      }
      dragRef.current = null; setDragPreview(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [dayPx, updateTask]);

  const handleAddTask = (data: {
    title: string; assigneeId: string; startDate: string; dueDate: string; priority: TaskPriority;
  }) => {
    if (!currentUser || !data.title.trim()) return;
    addTask({
      id: `t${Date.now()}`, projectId: projectId!, title: data.title.trim(),
      description: '', status: 'todo', priority: data.priority,
      assigneeId: data.assigneeId || undefined, reporterId: currentUser.id,
      startDate: data.startDate, dueDate: data.dueDate,
      tags: [], attachments: [], comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      order: projectTasks.filter(t => t.status === 'todo').length,
    });
    setCreateDate(null);
  };

  const isDraggingAny = dragPreview !== null;

  return (
    <div className={`flex flex-col h-full ${isDraggingAny ? 'select-none' : ''}`}
      style={{ maxHeight: 'calc(100vh - 120px)' }}>

      {/* 타이틀 */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <Link to={`/projects/${projectId}`} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-gray-400">{project.code}</p>
          <h2 className="text-lg font-bold text-gray-900">{project.name} — 타임라인</h2>
        </div>
      </div>

      {/* 툴바 */}
      <div className="flex items-center gap-3 mb-3 shrink-0 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {(Object.keys(VIEW_CFG) as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === m ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              {VIEW_CFG[m].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={goBack} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 w-32 text-center">
            {format(viewStart, 'yyyy.MM.dd', { locale: ko })}
          </span>
          <button onClick={goForward} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <button onClick={goToday}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-colors">
          오늘
        </button>
        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">{TOTAL_DAYS}일 · 하단 스크롤</span>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-500">담당자</span>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            <option value="all">전체</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {(Object.keys(PRI_BAR) as TaskPriority[]).map(p => (
            <span key={p} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded-sm ${PRI_BAR[p]}`} />{PRI_LABEL[p]}
            </span>
          ))}
        </div>
      </div>

      {/* ── 타임라인 본체 ── */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto bg-white rounded-xl border border-gray-200 ${
          isDraggingAny ? (dragPreview?.type === 'resize' ? 'cursor-ew-resize' : 'cursor-grabbing') : ''
        }`}
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { if (!dragRef.current) setHoverDayIdx(null); }}
      >
        <div style={{ width: LEFT_W + totalPx, minWidth: LEFT_W + totalPx }}>

          {/* STICKY 헤더 */}
          <div className="sticky top-0 z-30 flex border-b border-gray-200" style={{ height: HDR_H }}>
            <div className="sticky left-0 z-40 bg-gray-50 border-r border-gray-200 flex items-end px-4 pb-2 shrink-0"
              style={{ width: LEFT_W }}>
              <span className="text-xs font-semibold text-gray-500">업무</span>
            </div>
            <div className="relative flex flex-col" style={{ width: totalPx }}>
              {/* 월 행 */}
              <div className="flex bg-gray-50 border-b border-gray-100" style={{ height: 24 }}>
                {monthGroups.map((g, i) => (
                  <div key={i} style={{ width: g.count * dayPx }}
                    className="text-xs font-semibold text-gray-600 px-2 flex items-center border-r border-gray-100">
                    {g.label}
                  </div>
                ))}
              </div>
              {/* 일자 행 */}
              <div className="flex flex-1">
                {dateRange.map((day, i) => {
                  const weekend = isWeekend(day);
                  const today   = isToday(day);
                  const hovered = !isDraggingAny && hoverDayIdx === i;
                  return (
                    <div key={i} style={{ width: dayPx }}
                      className={`flex flex-col items-center justify-center border-r border-gray-100 shrink-0 transition-colors ${
                        hovered ? 'bg-blue-100' : today ? 'bg-blue-50' : weekend ? 'bg-gray-50' : 'bg-white'
                      }`}>
                      <p className={`text-xs font-medium leading-tight ${today ? 'text-blue-600' : weekend ? 'text-gray-400' : 'text-gray-500'}`}>
                        {format(day, 'EEE', { locale: ko })}
                      </p>
                      <p className={`text-sm font-bold leading-tight ${today ? 'text-blue-600' : weekend ? 'text-gray-400' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 업무 행 */}
          <div className="relative">
            {/* 컬럼 하이라이트 */}
            {!isDraggingAny && hoverDayIdx !== null && (
              <div className="absolute top-0 bottom-0 bg-blue-50/50 pointer-events-none z-0"
                style={{ left: LEFT_W + hoverDayIdx * dayPx, width: dayPx }} />
            )}

            {scheduled.length === 0 && unscheduled.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <GanttChartSquare size={36} className="mb-3 opacity-30" />
                <p className="text-sm">업무가 없습니다</p>
              </div>
            )}

            {scheduled.map(task => {
              const isMe  = dragPreview?.taskId === task.id;
              const delta = isMe ? dragPreview!.deltaDays : 0;
              const dtype = isMe ? dragPreview!.type : null;
              return (
                <BarRow
                  key={task.id}
                  task={task}
                  leftW={LEFT_W} rowH={ROW_H} dayPx={dayPx}
                  totalPx={totalPx} viewStart={viewStart} totalDays={TOTAL_DAYS}
                  todayX={showToday ? todayX : null}
                  dateRange={dateRange}
                  hoverDayIdx={!isDraggingAny ? hoverDayIdx : null}
                  isDragging={isMe} dragDelta={delta} dragType={dtype}
                  onMoveStart={(e, id) => startDrag(e, id, 'move', task)}
                  onResizeStart={(e, id) => startDrag(e, id, 'resize', task)}
                  onAddAt={date => setCreateDate(date)}
                  onSelect={id => setSelectedTaskId(id)}
                />
              );
            })}

            <AddRow
              leftW={LEFT_W} rowH={ROW_H} dayPx={dayPx}
              totalPx={totalPx} dateRange={dateRange}
              todayX={showToday ? todayX : null}
              hoverDayIdx={!isDraggingAny ? hoverDayIdx : null}
              onAddAt={date => setCreateDate(date)}
            />

            {unscheduled.length > 0 && (
              <>
                <div className="flex items-center gap-2 bg-gray-50 border-t border-b border-gray-100 px-4 py-2">
                  <div className="sticky left-0 flex items-center gap-2">
                    <CalendarDays size={14} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500">일정 미정 ({unscheduled.length})</span>
                  </div>
                </div>
                {unscheduled.map(task => {
                  const assignee = users.find(u => u.id === task.assigneeId);
                  return (
                    <div key={task.id}
                      className="flex items-center border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
                      style={{ height: ROW_H }}
                      onClick={() => setSelectedTaskId(task.id)}>
                      <div className="sticky left-0 z-20 bg-inherit px-4 flex items-center gap-2 border-r border-gray-100 shrink-0"
                        style={{ width: LEFT_W }}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${PRI_BAR[task.priority]}`} />
                        <p className="text-sm text-gray-700 truncate flex-1">{task.title}</p>
                        {assignee && (
                          <div className="w-5 h-5 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center font-bold shrink-0">
                            {assignee.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 px-4">
                        <span className="text-xs text-blue-400 italic">클릭해서 날짜 설정 →</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {createDate && (
        <CreateTaskModal
          startDate={createDate} members={members}
          onClose={() => setCreateDate(null)} onSubmit={handleAddTask}
        />
      )}

      {selectedTaskId && (
        <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   업무 바 행
══════════════════════════════════════ */
function BarRow({
  task, leftW, rowH, dayPx, totalPx, viewStart, totalDays,
  todayX, dateRange, hoverDayIdx, isDragging, dragDelta, dragType,
  onMoveStart, onResizeStart, onAddAt,
}: {
  task: Task; leftW: number; rowH: number; dayPx: number; totalPx: number;
  viewStart: Date; totalDays: number; todayX: number | null; dateRange: Date[];
  hoverDayIdx: number | null;
  isDragging: boolean; dragDelta: number; dragType: 'move' | 'resize' | null;
  onMoveStart: (e: React.MouseEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent, id: string) => void;
  onAddAt: (date: Date) => void;
  onSelect: (id: string) => void;
}) {
  const [rowHovered, setRowHovered] = useState(false);
  const users    = useUserStore(s => s.users);
  const assignee = users.find(u => u.id === task.assigneeId);

  const rawSd = task.startDate ? parseISO(task.startDate) : null;
  const rawEd = task.dueDate   ? parseISO(task.dueDate)   : null;
  const effectiveSd = isDragging && dragType === 'move' && rawSd ? addDays(rawSd, dragDelta) : rawSd;
  const effectiveEd = isDragging && rawEd ? addDays(rawEd, dragDelta) : rawEd;

  let barLeft = 0, barWidth = 0, isMilestone = false;
  if (effectiveSd && effectiveEd) {
    barLeft  = clamp(differenceInDays(effectiveSd, viewStart) * dayPx, 0, totalPx);
    barWidth = clamp((differenceInDays(effectiveEd, viewStart) + 1) * dayPx, 0, totalPx) - barLeft;
  } else if (effectiveEd) {
    barLeft  = clamp(differenceInDays(effectiveEd, viewStart) * dayPx + dayPx / 2 - 6, 0, totalPx);
    barWidth = 12; isMilestone = true;
  } else if (effectiveSd) {
    barLeft  = clamp(differenceInDays(effectiveSd, viewStart) * dayPx, 0, totalPx);
    barWidth = dayPx;
  }
  const isVisible  = barWidth > 0 && barLeft < totalPx;
  const isOutLeft  = effectiveEd && differenceInDays(effectiveEd, viewStart) < 0;
  const isOutRight = effectiveSd && differenceInDays(effectiveSd, viewStart) >= totalDays;

  // 호버된 셀에 "+" 표시 조건
  const showPlus = rowHovered && !isDragging && hoverDayIdx !== null;

  return (
    <div
      className={`flex border-b border-gray-50 transition-colors ${
        isDragging ? 'bg-blue-50/30 relative z-20' : 'hover:bg-gray-50/40'
      }`}
      style={{ height: rowH }}
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => setRowHovered(false)}
    >
      {/* 좌측 고정 */}
      <div className="sticky left-0 z-20 px-4 flex items-center gap-2 border-r border-gray-100 shrink-0 cursor-pointer hover:bg-blue-50/60 transition-colors"
        style={{ width: leftW, backgroundColor: isDragging ? '#eff6ff' : undefined }}
        onClick={() => onSelect(task.id)}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${PRI_BAR[task.priority]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
          <p className="text-xs text-gray-400 truncate">{ST_LABEL[task.status]}{assignee ? ` · ${assignee.name}` : ''}</p>
        </div>
        {assignee && (
          <div title={assignee.name}
            className="w-6 h-6 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center font-bold shrink-0">
            {assignee.name[0]}
          </div>
        )}
      </div>

      {/* 바 영역 */}
      <div className="relative shrink-0" style={{ width: totalPx }}>
        {/* CSS 그리드 라인 */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `repeating-linear-gradient(to right, transparent 0px, transparent ${dayPx - 1}px, #f3f4f6 ${dayPx - 1}px, #f3f4f6 ${dayPx}px)`,
        }} />
        {/* 주말 */}
        {dateRange.map((day, i) =>
          isWeekend(day) ? <div key={i} className="absolute top-0 bottom-0 bg-gray-50/80 pointer-events-none" style={{ left: i * dayPx, width: dayPx }} /> : null
        )}
        {/* 오늘 라인 */}
        {todayX !== null && (
          <div className="absolute top-0 bottom-0 w-px bg-blue-400 pointer-events-none z-10" style={{ left: todayX }} />
        )}

        {isOutLeft  && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-300 pointer-events-none">← 이전</span>}
        {isOutRight && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-300 pointer-events-none">이후 →</span>}

        {/* 호버된 셀에 고정된 "+" 버튼 */}
        {showPlus && (
          <button
            onClick={e => { e.stopPropagation(); onAddAt(dateRange[hoverDayIdx!]); }}
            title={`${format(dateRange[hoverDayIdx!], 'MM월 dd일')}에 업무 추가`}
            className="absolute top-1/2 -translate-y-1/2 z-30 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
            style={{ left: hoverDayIdx! * dayPx + dayPx / 2 - 12 }}
          >
            <Plus size={12} />
          </button>
        )}

        {/* 업무 바 */}
        {isVisible && (
          <div className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: barLeft }}>
            {isMilestone ? (
              <div title={`마감: ${task.dueDate}`}
                className={`w-3 h-3 rotate-45 shadow-sm cursor-grab active:cursor-grabbing ${PRI_BAR[task.priority]} ${ST_FADE[task.status]}`}
                onMouseDown={e => onMoveStart(e, task.id)} />
            ) : (
              <div className={`relative group/bar flex items-center ${isDragging ? 'drop-shadow-lg' : ''}`}
                style={{ width: Math.max(barWidth, 8) }}>
                <div
                  title={`${task.title}\n${task.startDate ?? '?'} → ${task.dueDate ?? '?'}`}
                  className={`h-6 w-full rounded-md flex items-center pl-2 overflow-hidden cursor-grab active:cursor-grabbing select-none
                    ${PRI_BAR[task.priority]} ${ST_FADE[task.status]}
                    ${isDragging ? 'ring-2 ring-white ring-offset-1 shadow-xl' : 'shadow-sm'} transition-shadow`}
                  onMouseDown={e => onMoveStart(e, task.id)}
                >
                  {barWidth > 52 && (
                    <span className="text-white text-xs font-medium truncate whitespace-nowrap drop-shadow pr-4">
                      {task.title}
                    </span>
                  )}
                </div>
                {/* 리사이즈 핸들 */}
                <div
                  title="드래그로 기간 조절"
                  className={`absolute right-0 top-0 h-6 w-2.5 flex items-center justify-center gap-px
                    cursor-ew-resize rounded-r-md z-30
                    opacity-0 group-hover/bar:opacity-100
                    ${isDragging && dragType === 'resize' ? 'opacity-100' : ''}
                    bg-black/20 hover:bg-black/35 transition-opacity`}
                  onMouseDown={e => { e.stopPropagation(); onResizeStart(e, task.id); }}
                >
                  <div className="w-px h-3 bg-white/80 rounded-full" />
                  <div className="w-px h-3 bg-white/80 rounded-full" />
                </div>
                {/* 드래그 중 날짜 툴팁 */}
                {isDragging && effectiveSd && effectiveEd && (
                  <div className="absolute -top-7 left-0 bg-gray-900 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg pointer-events-none z-50">
                    {dragType === 'move'
                      ? `${format(effectiveSd, 'MM.dd')} → ${format(effectiveEd, 'MM.dd')}`
                      : `마감: ${format(effectiveEd, 'MM.dd')}`}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   업무 추가 전용 행
══════════════════════════════════════ */
function AddRow({
  leftW, rowH, dayPx, totalPx, dateRange, todayX, hoverDayIdx, onAddAt,
}: {
  leftW: number; rowH: number; dayPx: number; totalPx: number;
  dateRange: Date[]; todayX: number | null;
  hoverDayIdx: number | null;
  onAddAt: (date: Date) => void;
}) {
  const [rowHovered, setRowHovered] = useState(false);
  const showPlus = rowHovered && hoverDayIdx !== null;

  return (
    <div
      className="flex border-b border-dashed border-gray-200 hover:bg-blue-50/20 transition-colors"
      style={{ height: rowH }}
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => setRowHovered(false)}
    >
      {/* 좌측 */}
      <div className="sticky left-0 z-20 bg-white px-4 flex items-center gap-2 border-r border-gray-100 shrink-0"
        style={{ width: leftW }}>
        <Plus size={14} className={`transition-colors ${rowHovered ? 'text-blue-500' : 'text-gray-300'}`} />
        <span className={`text-sm transition-colors ${rowHovered ? 'text-blue-500' : 'text-gray-300'}`}>
          업무 추가
        </span>
      </div>
      {/* 그리드 */}
      <div className="relative shrink-0" style={{ width: totalPx }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `repeating-linear-gradient(to right, transparent 0px, transparent ${dayPx - 1}px, #f3f4f6 ${dayPx - 1}px, #f3f4f6 ${dayPx}px)`,
        }} />
        {dateRange.map((day, i) =>
          isWeekend(day) ? <div key={i} className="absolute top-0 bottom-0 bg-gray-50/60 pointer-events-none" style={{ left: i * dayPx, width: dayPx }} /> : null
        )}
        {todayX !== null && (
          <div className="absolute top-0 bottom-0 w-px bg-blue-300 pointer-events-none z-10" style={{ left: todayX }} />
        )}
        {/* 셀 안에 고정된 "+" */}
        {showPlus && (
          <button
            onClick={() => onAddAt(dateRange[hoverDayIdx!])}
            title={`${format(dateRange[hoverDayIdx!], 'MM월 dd일')}에 업무 추가`}
            className="absolute top-1/2 -translate-y-1/2 z-30 w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
            style={{ left: hoverDayIdx! * dayPx + dayPx / 2 - 12 }}
          >
            <Plus size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   업무 생성 모달
══════════════════════════════════════ */
function CreateTaskModal({
  startDate, members, onClose, onSubmit,
}: {
  startDate: Date; members: User[]; onClose: () => void;
  onSubmit: (data: { title: string; assigneeId: string; startDate: string; dueDate: string; priority: TaskPriority; }) => void;
}) {
  const [title,      setTitle]      = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [start,      setStart]      = useState(format(startDate, 'yyyy-MM-dd'));
  const [due,        setDue]        = useState(format(addDays(startDate, 2), 'yyyy-MM-dd'));
  const [priority,   setPriority]   = useState<TaskPriority>('medium');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">새 업무 추가</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {format(startDate, 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}부터 시작
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!title.trim()) return; onSubmit({ title, assigneeId, startDate: start, dueDate: due, priority }); }}
          className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">업무 제목 *</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="업무 제목을 입력하세요"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">시작일</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">마감일</label>
              <input type="date" value={due} min={start} onChange={e => setDue(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">담당자</label>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">미배정</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">우선순위</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="urgent">🔴 긴급</option>
                <option value="high">🟠 높음</option>
                <option value="medium">🔵 보통</option>
                <option value="low">⚪ 낮음</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={!title.trim()}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              업무 추가
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
