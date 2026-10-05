import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { CasesProvider } from './context/CasesContext'
import { useAuth } from './auth/useAuth'
import { LoginPage } from './pages/LoginPage'
import { WizardPage } from './pages/wizard/WizardPage'
import { OverviewPage } from './pages/overview/OverviewPage'
import { DocumentsPage } from './pages/documents/DocumentsPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { PublicOnlyRoute } from './auth/PublicOnlyRoute'
import { AppLayout } from './components/layout/AppLayout'
import { BackofficeLayout } from './pages/backoffice/BackofficeLayout'

// Case workers get the backoffice shell instead of the applicant layout.
// BackofficeLayout manages its own internal sections rather than nested
// routes, so it ignores the nested "/" route below when it renders.
function AuthedRoot() {
  const { user } = useAuth()
  return user?.role === 'admin' ? <BackofficeLayout /> : <AppLayout />
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      {/* Pathless layout route: everything nested inside renders through
          AuthedRoot — AppLayout's <Outlet /> for companies, or the
          self-contained BackofficeLayout for case workers — behind the
          same auth guard. */}
      <Route
        element={
          <ProtectedRoute>
            <AuthedRoot />
          </ProtectedRoute>
        }
      >
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/" element={<WizardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CasesProvider>
        <AppRoutes />
      </CasesProvider>
    </AuthProvider>
  )
}

