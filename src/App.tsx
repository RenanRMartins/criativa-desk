import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { useAuthStore } from '@/store/authStore'

import LoginPage from '@/pages/auth/LoginPage'
import AppLayout from '@/components/layout/AppLayout'

// Carregadas sob demanda: sem isto o tablet baixa e interpreta as 20 telas
// antes de mostrar qualquer coisa. Login e o layout ficam no pacote inicial.
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'))
const CalendarPage = lazy(() => import('@/pages/CalendarPage'))
const VideosReceivedPage = lazy(() => import('@/pages/VideosReceivedPage'))
const ApprovalsPage = lazy(() => import('@/pages/ApprovalsPage'))
const SchedulingPage = lazy(() => import('@/pages/SchedulingPage'))
const CopyDeskPage = lazy(() => import('@/pages/CopyDeskPage'))
const TrendDeskPage = lazy(() => import('@/pages/TrendDeskPage'))
const SearchDeskPage = lazy(() => import('@/pages/SearchDeskPage'))
const DesignDeskPage = lazy(() => import('@/pages/DesignDeskPage'))
const LibraryPage = lazy(() => import('@/pages/LibraryPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const ProfessionalPortalPage = lazy(() => import('@/pages/public/ProfessionalPortalPage'))
const ApprovalPublicPage = lazy(() => import('@/pages/public/ApprovalPublicPage'))
const PrivacyPolicyPage = lazy(() => import('@/pages/public/PrivacyPolicyPage'))
const DataDeletionPage = lazy(() => import('@/pages/public/DataDeletionPage'))
const LandingPage = lazy(() => import('@/pages/public/LandingPage'))
const TermsPage = lazy(() => import('@/pages/public/TermsPage'))

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
        {/* enquanto a tela sob demanda chega — discreto de propósito, para não
            piscar um bloco grande em cada navegação */}
        <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--color-cream)' }} />}>
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
        </Suspense>
      </AnimatePresence>
    </BrowserRouter>
  )
}
