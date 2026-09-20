import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { UpdatePrompt } from './components/UpdatePrompt'
import { LeafIcon } from './components/icons'
import Library from './pages/Library'
import Login from './pages/Login'

const AddBook = lazy(() => import('./pages/AddBook'))
const BookDetail = lazy(() => import('./pages/BookDetail'))
const ReadingSession = lazy(() => import('./pages/ReadingSession'))
const Settings = lazy(() => import('./pages/Settings'))

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-leaf">
      <LeafIcon width={40} height={40} className="animate-pulse" />
    </div>
  )
}

function Routed() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Login />
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/adicionar" element={<AddBook />} />
        <Route path="/livro/:id" element={<BookDetail />} />
        <Route path="/leitura/:id" element={<ReadingSession />} />
        <Route path="/ajustes" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routed />
      </BrowserRouter>
      <UpdatePrompt />
    </AuthProvider>
  )
}
