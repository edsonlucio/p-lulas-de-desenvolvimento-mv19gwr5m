import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Layout from '@/components/Layout'
import { RouteGuard } from '@/components/RouteGuard'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import Catalog from '@/pages/Catalog'
import Checkout from '@/pages/Checkout'
import ConfirmEmailChange from '@/pages/ConfirmEmailChange'
import CourseDetail from '@/pages/CourseDetail'
import Index from '@/pages/Index'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import OrderSuccess from '@/pages/OrderSuccess'
import PasswordRecovery from '@/pages/PasswordRecovery'
import Register from '@/pages/Register'
import ResetPassword from '@/pages/ResetPassword'
import VerifyEmail from '@/pages/VerifyEmail'
import AdminClub from '@/pages/admin/AdminClub'
import AdminCourses from '@/pages/admin/AdminCourses'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminOrders from '@/pages/admin/AdminOrders'
import AdminStudents from '@/pages/admin/AdminStudents'
import CoursePlayer from '@/pages/student/CoursePlayer'
import StudentDashboard from '@/pages/student/Dashboard'
import Profile from '@/pages/student/Profile'
import SearchLessons from '@/pages/student/SearchLessons'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Index />} />
            <Route path="cursos" element={<Catalog />} />
            <Route path="cursos/:slug" element={<CourseDetail />} />
            <Route path="entrar" element={<Login />} />
            <Route path="cadastro" element={<Register />} />
            <Route path="esqueci-senha" element={<PasswordRecovery />} />
            <Route path="redefinir-senha" element={<ResetPassword />} />
            <Route path="verificar-email" element={<VerifyEmail />} />
            <Route path="confirmar-troca-email" element={<ConfirmEmailChange />} />
            <Route
              path="checkout/:slug"
              element={
                <RouteGuard>
                  <Checkout />
                </RouteGuard>
              }
            />
            <Route
              path="pedido/:id"
              element={
                <RouteGuard>
                  <OrderSuccess />
                </RouteGuard>
              }
            />
            <Route
              path="retorno"
              element={
                <RouteGuard>
                  <OrderSuccess />
                </RouteGuard>
              }
            />
            <Route path="app">
              <Route
                index
                element={
                  <RouteGuard>
                    <StudentDashboard />
                  </RouteGuard>
                }
              />
              <Route
                path="curso/:slug"
                element={
                  <RouteGuard>
                    <CoursePlayer />
                  </RouteGuard>
                }
              />
              <Route
                path="busca"
                element={
                  <RouteGuard>
                    <SearchLessons />
                  </RouteGuard>
                }
              />
              <Route
                path="perfil"
                element={
                  <RouteGuard>
                    <Profile />
                  </RouteGuard>
                }
              />
            </Route>
            <Route path="admin">
              <Route
                index
                element={
                  <RouteGuard admin>
                    <AdminDashboard />
                  </RouteGuard>
                }
              />
              <Route
                path="cursos"
                element={
                  <RouteGuard admin>
                    <AdminCourses />
                  </RouteGuard>
                }
              />
              <Route
                path="alunos"
                element={
                  <RouteGuard admin>
                    <AdminStudents />
                  </RouteGuard>
                }
              />
              <Route
                path="pedidos"
                element={
                  <RouteGuard admin>
                    <AdminOrders />
                  </RouteGuard>
                }
              />
              <Route
                path="clube"
                element={
                  <RouteGuard admin>
                    <AdminClub />
                  </RouteGuard>
                }
              />
            </Route>{' '}
            <Route path="404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
