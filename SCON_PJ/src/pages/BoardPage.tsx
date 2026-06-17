import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import TaskDetailPanel from '../components/TaskDetailPanel';
import type { Task, TaskStatus, TaskPriority } from '../types';
import { Plus, ArrowLeft, CheckSquare, SlidersHorizontal, ChevronRight, ChevronLeft } from 'lucide-react';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: '할 일', color: 'bg-gray-100' },
  { id: 'in_progress', label: '진행 중', color: 'bg-blue-100' },
  { id: 'review', label: '검토', color: 'bg-yellow-100' },
  { id: 'done', label: '완료', color: 'bg-green-100' },
];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-400',
  medium: 'border-l-yellow-400',
  low: 'border-l-gray-300',
};
const PRIORITY_BADGE: Record<TaskPriority, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: '긴급', high: '높음', medium: '보통', low: '낮음',
};

const NEXT_STATUS: Partial<Record<TaskStatus, { status: TaskStatus; label: string }>> = {
  todo:        { status: 'in_progress', label: '진행 중' },
  in_progress: { status: 'review',      label: '검토'   },
  review:      { status: 'done',        label: '완료'   },
};
const PREV_STATUS: Partial<Record<TaskStatus, { status: TaskStatus; label: string }>> = {
  in_progress: { status: 'todo',        label: '할 일'  },
  review:      { status: 'in_progress', label: '진행 중' },
  done:        { status: 'review',      label: '검토'   },
};

export default function BoardPage() {
  const { projectId } = useParams();
  const { projects, tasks, moveTask, addTask } = useProjectStore();
  const currentUser = useAuthStore(s => s.currentUser);
  const users = useUserStore(s => s.users);
  const project = projects.find(p => p.id === projectId);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const members = users.filter(u => project?.memberIds.includes(u.id));
  const projectTasks = tasks
    .filter(t => t.projectId === projectId)
    .filter(t => filterAssignee === 'all' || t.assigneeId === filterAssignee)
    .filter(t => filterPriority === 'all' || t.priority === filterPriority);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    moveTask(draggableId, destination.droppableId as TaskStatus, destination.index);
  };

  const handleAddTask = (status: TaskStatus) => {
    if (!newTaskTitle.trim() || !currentUser) return;
    const task: Task = {
      id: `t${Date.now()}`,
      projectId: projectId!,
      title: newTaskTitle.trim(),
      description: '',
      status,
      priority: 'medium',
      assigneeId: currentUser.id,
      reporterId: currentUser.id,
      tags: [],
      attachments: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: projectTasks.filter(t => t.status === status).length,
    };
    addTask(task);
    setNewTaskTitle('');
    setShowNewTask(null);
  };

  if (!project) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Link to={`/projects/${projectId}`} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-gray-400">{project.code}</p>
          <h2 className="text-lg font-bold text-gray-900">{project.name} — 칸반 보드</h2>
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-gray-400" />
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700"
          >
            <option value="all">전체 담당자</option>
            <option value="">미배정</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700"
          >
            <option value="all">전체 우선순위</option>
            <option value="urgent">긴급</option>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
          {(filterAssignee !== 'all' || filterPriority !== 'all') && (
            <button
              onClick={() => { setFilterAssignee('all'); setFilterPriority('all'); }}
              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
          {COLUMNS.map(col => {
            const colTasks = projectTasks
              .filter(t => t.status === col.id)
              .sort((a, b) => a.order - b.order);

            return (
              <div key={col.id} className="flex flex-col bg-gray-50 rounded-xl p-3 min-w-64 w-64 shrink-0">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${col.color} text-gray-700`}>
                      {col.label}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{colTasks.length}</span>
                  </div>
                  <button
                    onClick={() => { setShowNewTask(col.id); setNewTaskTitle(''); }}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* New Task Input */}
                {showNewTask === col.id && (
                  <div className="mb-2 bg-white rounded-lg p-2 shadow-sm border border-blue-200">
                    <input
                      autoFocus
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddTask(col.id);
                        if (e.key === 'Escape') setShowNewTask(null);
                      }}
                      placeholder="업무 제목 입력..."
                      className="w-full text-sm outline-none text-gray-800 placeholder-gray-400 p-1"
                    />
                    <div className="flex gap-1 mt-1.5">
                      <button
                        onClick={() => handleAddTask(col.id)}
                        className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700"
                      >
                        추가
                      </button>
                      <button
                        onClick={() => setShowNewTask(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2.5 py-1 rounded hover:bg-gray-100"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {/* Droppable */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 min-h-16 rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedTaskId(task.id)}
                              className={`group/card rounded-lg p-3 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-all ${
                                task.status === 'done'
                                  ? 'bg-gray-50 opacity-60 hover:opacity-80 border-l-gray-300'
                                  : `bg-white ${PRIORITY_COLOR[task.priority]}`
                              } ${snapshot.isDragging ? 'shadow-lg rotate-1 opacity-90' : ''}`}
                            >
                              <p className={`text-sm font-medium leading-snug mb-2 ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</p>
                              <div className="flex items-center justify-between">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_BADGE[task.priority]}`}>
                                  {PRIORITY_LABEL[task.priority]}
                                </span>
                                <div className="flex items-center gap-2">
                                  {task.dueDate && (
                                    <span className="text-xs text-gray-400">{task.dueDate.slice(5)}</span>
                                  )}
                                  {task.assigneeId && (
                                    <div className="w-5 h-5 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center font-bold" title={users.find(u => u.id === task.assigneeId)?.name}>
                                      {users.find(u => u.id === task.assigneeId)?.name[0]}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {task.tags.map(tag => (
                                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {(task.checklistTotal ?? 0) > 0 && (
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <CheckSquare size={11} />
                                    <span>{task.checklistDone}/{task.checklistTotal}</span>
                                  </div>
                                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-400 rounded-full"
                                      style={{ width: `${Math.round((task.checklistDone! / task.checklistTotal!) * 100)}%` }} />
                                  </div>
                                </div>
                              )}

                              {/* 빠른 상태 이동 버튼 — 호버 시 표시 */}
                              {(NEXT_STATUS[task.status] || PREV_STATUS[task.status]) && (
                                <div
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100 opacity-0 group-hover/card:opacity-100 transition-opacity"
                                >
                                  {PREV_STATUS[task.status] ? (
                                    <button
                                      onClick={e => { e.stopPropagation(); moveTask(task.id, PREV_STATUS[task.status]!.status, task.order); }}
                                      className="flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-1.5 py-0.5 rounded transition-colors"
                                    >
                                      <ChevronLeft size={11} />
                                      {PREV_STATUS[task.status]!.label}
                                    </button>
                                  ) : <span />}
                                  {NEXT_STATUS[task.status] && (
                                    <button
                                      onClick={e => { e.stopPropagation(); moveTask(task.id, NEXT_STATUS[task.status]!.status, task.order); }}
                                      className="flex items-center gap-0.5 text-[11px] text-blue-600 font-medium hover:text-blue-800 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors ml-auto"
                                    >
                                      {NEXT_STATUS[task.status]!.label}
                                      <ChevronRight size={11} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {selectedTaskId && (
        <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
}

