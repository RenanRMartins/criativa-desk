import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { useAuthStore } from '@/store/authStore'

import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import OnboardingPage from '@/pages/OnboardingPage'
import DashboardPage from '@/pages/DashboardPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ProjectDetailPage from '@/pages/ProjectDetailPage'
import CalendarPage from '@/pages/CalendarPage'
import VideosReceivedPage from '@/pages/VideosReceivedPage'
import ApprovalsPage from '@/pages/ApprovalsPage'
import SchedulingPage from '@/pages/SchedulingPage'
import CopyDeskPage from '@/pages/CopyDeskPage'
import TrendDeskPage from '@/pages/TrendDeskPage'
import SearchDeskPage from '@/pages/SearchDeskPage'
import DesignDeskPage from '@/pages/DesignDeskPage'
import LibraryPage from '@/pages/LibraryPage'
import ReportsPage from '@/pages/ReportsPage'
import SettingsPage from '@/pages/SettingsPage'
import ProfessionalPortalPage from '@/pages/public/ProfessionalPortalPage'
import ApprovalPublicPage from '@/pages/public/ApprovalPublicPage'
import PrivacyPolicyPage from '@/pages/public/PrivacyPolicyPage'
import DataDeletionPage from '@/pages/public/DataDeletionPage'
import LandingPage from '@/pages/public/LandingPage'
import TermsPage from '@/pages/public/TermsPage'
import AppLayout from '@/components/layout/AppLayout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public routes (no auth) */}
          <Route
            path="/"
            element={
              <GuestRoute>
                <LandingPage />
              </GuestRoute>
            }
          />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route path="/gravar/:token" element={<ProfessionalPortalPage />} />
          <Route path="/aprovar/:token" element={<ApprovalPublicPage />} />
          <Route path="/privacidade" element={<PrivacyPolicyPage />} />
          <Route path="/termos" element={<TermsPage />} />
          <Route path="/exclusao-de-dados" element={<DataDeletionPage />} />

          {/* Onboarding */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* App routes (protected + layout) */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="videos" element={<VideosReceivedPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="scheduling" element={<SchedulingPage />} />
            <Route path="copydesk" element={<CopyDeskPage />} />
            <Route path="trenddesk" element={<TrendDeskPage />} />
            <Route path="searchdesk" element={<SearchDeskPage />} />
            <Route path="designdesk" element={<DesignDeskPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  )
}
