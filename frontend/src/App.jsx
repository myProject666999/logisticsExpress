import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import MainLayout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import PackageList from './pages/PackageList'
import PackageDetail from './pages/PackageDetail'
import SendPackage from './pages/SendPackage'
import Profile from './pages/Profile'
import UserManagement from './pages/admin/UserManagement'
import SiteManagement from './pages/admin/SiteManagement'
import TransportManagement from './pages/admin/TransportManagement'
import CheckInManagement from './pages/admin/CheckInManagement'
import OperationLog from './pages/admin/OperationLog'
import MenuManagement from './pages/admin/MenuManagement'
import PackageInbound from './pages/employee/PackageInbound'
import PackageOutbound from './pages/employee/PackageOutbound'
import PackageDeliver from './pages/employee/PackageDeliver'
import SendManagement from './pages/employee/SendManagement'
import PickupManagement from './pages/employee/PickupManagement'
import SignManagement from './pages/employee/SignManagement'
import MyCheckIn from './pages/employee/MyCheckIn'
import { getToken, getUserInfo } from './utils/auth'

function App() {
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState(null)

  useEffect(() => {
    const token = getToken()
    if (token) {
      const user = getUserInfo()
      setUserInfo(user)
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  // 路由守卫
  const ProtectedRoute = ({ children, roles }) => {
    const token = getToken()
    const user = getUserInfo()
    
    if (!token) {
      return <Navigate to="/login" replace />
    }

    if (roles && roles.length > 0 && !roles.includes(user?.role)) {
      return <Navigate to="/403" replace />
    }

    return children
  }

  // 根据角色获取首页路径
  const getHomePath = () => {
    if (!userInfo) return '/login'
    switch (userInfo.role) {
      case 'admin':
        return '/home'
      case 'employee':
        return '/home'
      case 'user':
        return '/home'
      default:
        return '/login'
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to={getHomePath()} replace />} />
        <Route path="home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        
        {/* 所有用户都可以访问的页面 */}
        <Route path="packages" element={
          <ProtectedRoute>
            <PackageList />
          </ProtectedRoute>
        } />
        <Route path="package/:id" element={
          <ProtectedRoute>
            <PackageDetail />
          </ProtectedRoute>
        } />
        <Route path="send" element={
          <ProtectedRoute>
            <SendPackage />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

        {/* 员工和管理员可以访问的页面 */}
        <Route path="package/inbound" element={
          <ProtectedRoute roles={['employee', 'admin']}>
            <PackageInbound />
          </ProtectedRoute>
        } />
        <Route path="package/outbound" element={
          <ProtectedRoute roles={['employee', 'admin']}>
            <PackageOutbound />
          </ProtectedRoute>
        } />
        <Route path="package/deliver" element={
          <ProtectedRoute roles={['employee', 'admin']}>
            <PackageDeliver />
          </ProtectedRoute>
        } />
        <Route path="send/manage" element={
          <ProtectedRoute roles={['employee', 'admin']}>
            <SendManagement />
          </ProtectedRoute>
        } />
        <Route path="pickup/manage" element={
          <ProtectedRoute roles={['employee', 'admin']}>
            <PickupManagement />
          </ProtectedRoute>
        } />
        <Route path="sign/manage" element={
          <ProtectedRoute roles={['employee', 'admin']}>
            <SignManagement />
          </ProtectedRoute>
        } />
        <Route path="checkin/my" element={
          <ProtectedRoute roles={['employee', 'admin']}>
            <MyCheckIn />
          </ProtectedRoute>
        } />

        {/* 管理员专属页面 */}
        <Route path="users" element={
          <ProtectedRoute roles={['admin']}>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="sites" element={
          <ProtectedRoute roles={['admin']}>
            <SiteManagement />
          </ProtectedRoute>
        } />
        <Route path="transports" element={
          <ProtectedRoute roles={['admin']}>
            <TransportManagement />
          </ProtectedRoute>
        } />
        <Route path="checkins" element={
          <ProtectedRoute roles={['admin']}>
            <CheckInManagement />
          </ProtectedRoute>
        } />
        <Route path="logs" element={
          <ProtectedRoute roles={['admin']}>
            <OperationLog />
          </ProtectedRoute>
        } />
        <Route path="menus" element={
          <ProtectedRoute roles={['admin']}>
            <MenuManagement />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="403" element={
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '24px'
        }}>
          <h1>403</h1>
          <p>无权限访问</p>
        </div>
      } />
      <Route path="*" element={
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '24px'
        }}>
          <h1>404</h1>
          <p>页面不存在</p>
        </div>
      } />
    </Routes>
  )
}

export default App
