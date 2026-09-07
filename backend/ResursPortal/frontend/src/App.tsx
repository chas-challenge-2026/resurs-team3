import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { LoginPage } from './pages/LoginPage'
import { WizardPage } from './pages/WizardPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { PublicOnlyRoute } from './routes/PublicOnlyRoute'
import { AppLayout } from './components/layout/AppLayout'
import { BackofficeLayout } from './pages/backoffice/BackofficeLayout'

// Case workers get the backoffice shell instead of the applicant layout.
// BackofficeLayout manages its own internal sections rather than nested
// routes, so it ignores the nested "/" route below when it renders.
function AuthedRoot() {
  const { state } = useAuth()
  return state.loginMethod === 'handlaggare' ? <BackofficeLayout /> : <AppLayout />
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
        <Route path="/" element={<WizardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
