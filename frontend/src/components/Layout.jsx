import React, { useState, useEffect } from 'react'
import { Layout, Menu, Avatar, Dropdown, Button, message } from 'antd'
import {
  HomeOutlined,
  InboxOutlined,
  SendOutlined,
  UserOutlined,
  ShopOutlined,
  CarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  MenuOutlined,
  LogoutOutlined,
  ProfileOutlined,
  ImportOutlined,
  ExportOutlined,
  CarryOutOutlined,
  PullRequestOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { getUserInfo, removeToken, isAdmin, isEmployee } from '../utils/auth'

const { Header, Sider, Content } = Layout

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [userInfo, setUserInfo] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const user = getUserInfo()
    setUserInfo(user)
  }, [])

  // 根据角色获取菜单
  const getMenuItems = () => {
    const baseMenus = [
      {
        key: '/home',
        icon: <HomeOutlined />,
        label: '首页',
      },
      {
        key: '/packages',
        icon: <InboxOutlined />,
        label: '快递查询',
      },
      {
        key: '/send',
        icon: <SendOutlined />,
        label: '我要寄件',
      },
      {
        key: '/profile',
        icon: <ProfileOutlined />,
        label: '个人中心',
      },
    ]

    // 员工和管理员菜单
    const employeeMenus = [
      {
        key: 'package-manage',
        icon: <InboxOutlined />,
        label: '快递管理',
        children: [
          { key: '/package/inbound', icon: <ImportOutlined />, label: '快递入库' },
          { key: '/package/outbound', icon: <ExportOutlined />, label: '商品出库' },
          { key: '/package/deliver', icon: <CarryOutOutlined />, label: '快递派送' },
        ],
      },
      {
        key: 'business',
        icon: <PullRequestOutlined />,
        label: '业务管理',
        children: [
          { key: '/send/manage', icon: <SendOutlined />, label: '寄件管理' },
          { key: '/pickup/manage', icon: <PullRequestOutlined />, label: '取件管理' },
          { key: '/sign/manage', icon: <CheckCircleOutlined />, label: '签收管理' },
        ],
      },
      {
        key: '/checkin/my',
        icon: <ClockCircleOutlined />,
        label: '我的打卡',
      },
    ]

    // 管理员菜单
    const adminMenus = [
      {
        key: '/sites',
        icon: <ShopOutlined />,
        label: '站点管理',
      },
      {
        key: '/transports',
        icon: <CarOutlined />,
        label: '运输管理',
      },
      {
        key: '/users',
        icon: <UserOutlined />,
        label: '用户管理',
      },
      {
        key: '/checkins',
        icon: <ClockCircleOutlined />,
        label: '打卡管理',
      },
      {
        key: '/logs',
        icon: <FileTextOutlined />,
        label: '操作日志',
      },
    ]

    let menus = [...baseMenus]

    if (isEmployee()) {
      menus = [...menus, ...employeeMenus]
    }

    if (isAdmin()) {
      menus = [...menus, ...adminMenus]
    }

    return menus
  }

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  const handleLogout = () => {
    removeToken()
    message.success('退出登录成功')
    navigate('/login')
  }

  const userDropdownItems = [
    {
      key: 'profile',
      label: '个人中心',
      icon: <ProfileOutlined />,
      onClick: () => navigate('/profile'),
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ]

  // 获取角色显示名称
  const getRoleName = (role) => {
    switch (role) {
      case 'admin':
        return '管理员'
      case 'employee':
        return '员工'
      case 'user':
        return '用户'
      default:
        return role
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
      >
        <div
          style={{
            height: 64,
            margin: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: collapsed ? 14 : 18,
            fontWeight: 'bold',
          }}
        >
          {collapsed ? '物流' : '快递物流管理系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#666' }}>
              {userInfo?.real_name || userInfo?.username} ({getRoleName(userInfo?.role)})
            </span>
            <Dropdown menu={{ items: userDropdownItems }}>
              <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: '#fff',
            minHeight: 280,
            borderRadius: 8,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
