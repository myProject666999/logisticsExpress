import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Table, Tag } from 'antd'
import {
  InboxOutlined,
  ClockCircleOutlined,
  CarOutlined,
  CheckCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons'
import request from '../utils/request'
import { getUserInfo, isAdmin, isEmployee } from '../utils/auth'
import dayjs from 'dayjs'

const Home = () => {
  const [statistics, setStatistics] = useState({
    total_packages: 0,
    pending_count: 0,
    transit_count: 0,
    delivering_count: 0,
    signed_count: 0,
    today_count: 0,
  })
  const [userInfo, setUserInfo] = useState(null)
  const [recentPackages, setRecentPackages] = useState([])

  useEffect(() => {
    setUserInfo(getUserInfo())
    loadStatistics()
    loadRecentPackages()
  }, [])

  const loadStatistics = async () => {
    try {
      const res = await request.get('/statistics')
      setStatistics(res.data)
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }

  const loadRecentPackages = async () => {
    try {
      const res = await request.get('/packages', { params: { page_size: 5 } })
      setRecentPackages(res.data.list || [])
    } catch (error) {
      console.error('获取快递列表失败:', error)
    }
  }

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'default', text: '待处理' },
      shipped: { color: 'blue', text: '已发货' },
      in_transit: { color: 'orange', text: '运输中' },
      arrived: { color: 'cyan', text: '已到达' },
      delivering: { color: 'gold', text: '派送中' },
      signed: { color: 'green', text: '已签收' },
      picked: { color: 'purple', text: '已取件' },
    }
    const info = statusMap[status] || { color: 'default', text: status }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const getRoleName = (role) => {
    switch (role) {
      case 'admin':
        return '管理员'
      case 'employee':
        return '员工'
      case 'user':
        return '普通用户'
      default:
        return role
    }
  }

  const packageColumns = [
    {
      title: '运单号',
      dataIndex: 'tracking_number',
      key: 'tracking_number',
    },
    {
      title: '收件人',
      dataIndex: 'receiver_name',
      key: 'receiver_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '运费',
      dataIndex: 'shipping_fee',
      key: 'shipping_fee',
      render: (fee) => `¥${fee || 0}`,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>欢迎回来，{userInfo?.real_name || userInfo?.username}</h2>
        <p style={{ color: '#666', margin: '8px 0 0 0' }}>
          角色：{getRoleName(userInfo?.role)}
        </p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="总快递数"
              value={statistics.total_packages}
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="待处理"
              value={statistics.pending_count}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="运输中"
              value={statistics.transit_count}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="已签收"
              value={statistics.signed_count}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      {isAdmin() && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8}>
            <Card>
              <Statistic
                title="派送中"
                value={statistics.delivering_count}
                prefix={<InboxOutlined />}
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card>
              <Statistic
                title="今日新增"
                value={statistics.today_count}
                prefix={<PlusCircleOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card title="最近快递">
        <Table
          columns={packageColumns}
          dataSource={recentPackages}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  )
}

export default Home
