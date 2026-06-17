import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import TaskDetailPanel from '../TaskDetailPanel';
import { useUiStore } from '../../store/uiStore';

export default function AppLayout() {
  const { globalTaskId, closeTask } = useUiStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
      {globalTaskId && (
        <TaskDetailPanel taskId={globalTaskId} onClose={closeTask} />
      )}
    </div>
  );
}
