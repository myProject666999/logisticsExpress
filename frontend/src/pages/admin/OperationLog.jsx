import React, { useState, useEffect } from 'react'
import { Table, Card, Input, Select, Button, Space, Tag } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import dayjs from 'dayjs'

const { Option } = Select

const OperationLog = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({ module: '', action: '', user_id: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (filters.module) params.module = filters.module
      if (filters.action) params.action = filters.action
      if (filters.user_id) params.user_id = filters.user_id

      const res = await request.get('/logs', { params })
      setData(res.data.list || [])
      setPagination({
        current: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
      })
    } catch (error) {
      console.error('获取操作日志失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleTag = (role) => {
    const roleMap = {
      admin: { color: 'red', text: '管理员' },
      employee: { color: 'blue', text: '员工' },
      user: { color: 'green', text: '用户' },
    }
    const info = roleMap[role] || { color: 'default', text: role }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 80 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => getRoleTag(role),
    },
    { title: '模块', dataIndex: 'module', key: 'module' },
    { title: '操作', dataIndex: 'action', key: 'action' },
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: 'IP地址', dataIndex: 'ip_address', key: 'ip_address' },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
  ]

  const handleSearch = () => {
    loadData(1, pagination.pageSize)
  }

  const handleReset = () => {
    setFilters({ module: '', action: '', user_id: '' })
    loadData(1, pagination.pageSize)
  }

  return (
    <Card title="操作日志">
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Input
            placeholder="模块"
            style={{ width: 120 }}
            value={filters.module}
            onChange={(e) => setFilters({ ...filters, module: e.target.value })}
          />
          <Input
            placeholder="操作"
            style={{ width: 120 }}
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          />
          <Input
            placeholder="用户ID"
            style={{ width: 120 }}
            value={filters.user_id}
            onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
          />
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        onChange={(p) => loadData(p.current, p.pageSize)}
        scroll={{ x: 1400 }}
      />
    </Card>
  )
}

export default OperationLog
