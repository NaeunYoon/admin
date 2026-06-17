import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useProjectStore } from './store/projectStore';
import { useUserStore } from './store/userStore';
import AppLayout from './components/layout/AppLayout';
import AccessPage from './pages/AccessPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import BoardPage from './pages/BoardPage';
import CalendarPage from './pages/CalendarPage';
import FilesPage from './pages/FilesPage';
import MembersPage from './pages/MembersPage';
import MemberReportPage from './pages/MemberReportPage';
import TimelinePage from './pages/TimelinePage';
import WorkLogPage from './pages/WorkLogPage';
import BugsPage from './pages/BugsPage';

// 어드민에서 넘어온 ?sso= 토큰을 1회 소비해 자동 로그인한다. 처리 동안 로딩 표시.
function AuthGate({ children }: { children: React.ReactNode }) {
  const ssoLogin = useAuthStore(s => s.ssoLogin);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sso = params.get('sso');
    if (!sso) { setReady(true); return; }
    ssoLogin(sso).finally(() => {
      // URL에서 토큰 제거 (북마크/로그 유출 방지)
      params.delete('sso');
      const qs = params.toString();
      const clean = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
      window.history.replaceState({}, '', clean);
      setReady(true);
    });
  }, [ssoLogin]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200 text-sm">
        로그인 중…
      </div>
    );
  }
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const currentUser = useAuthStore(s => s.currentUser);
  const logout      = useAuthStore(s => s.logout);
  const fetchAll    = useProjectStore(s => s.fetchAll);
  const fetchUsers  = useUserStore(s => s.fetchUsers);
  const navigate    = useNavigate();

  useEffect(() => {
    const handler = () => { logout(); navigate('/access', { replace: true }); };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [logout, navigate]);

  useEffect(() => {
    if (currentUser) {
      fetchAll();
      fetchUsers();
    }
  }, [currentUser, fetchAll, fetchUsers]);

  if (!currentUser) return <Navigate to="/access" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter basename="/pm">
      <AuthGate>
        <Routes>
          <Route path="/access" element={<AccessPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="projects/:projectId/board" element={<BoardPage />} />
            <Route path="projects/:projectId/calendar" element={<CalendarPage />} />
            <Route path="projects/:projectId/files" element={<FilesPage />} />
            <Route path="projects/:projectId/timeline" element={<TimelinePage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="members/:userId/report" element={<MemberReportPage />} />
            <Route path="work-log" element={<WorkLogPage />} />
            <Route path="bugs" element={<BugsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthGate>
    </BrowserRouter>
  );
}
