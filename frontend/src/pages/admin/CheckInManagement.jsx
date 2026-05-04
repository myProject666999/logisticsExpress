import React, { useState, useEffect } from 'react'
import { Table, Card, Input, Select, Button, Space, Tag } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import dayjs from 'dayjs'

const { Option } = Select

const CheckInManagement = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({ user_id: '', date: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (filters.user_id) params.user_id = filters.user_id
      if (filters.date) params.date = filters.date

      const res = await request.get('/checkins', { params })
      setData(res.data.list || [])
      setPagination({
        current: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
      })
    } catch (error) {
      console.error('获取打卡列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusTag = (status) => {
    const statusMap = {
      0: { color: 'default', text: '未打卡' },
      1: { color: 'blue', text: '已签到' },
      2: { color: 'green', text: '已签退' },
    }
    const info = statusMap[status] || { color: 'default', text: status }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id' },
    { title: '站点ID', dataIndex: 'site_id', key: 'site_id' },
    { title: '日期', dataIndex: 'date', key: 'date' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '签到时间',
      dataIndex: 'check_in_time',
      key: 'check_in_time',
      render: (time) => time ? dayjs(time).format('HH:mm:ss') : '-',
    },
    {
      title: '签退时间',
      dataIndex: 'check_out_time',
      key: 'check_out_time',
      render: (time) => time ? dayjs(time).format('HH:mm:ss') : '-',
    },
  ]

  const handleSearch = () => {
    loadData(1, pagination.pageSize)
  }

  const handleReset = () => {
    setFilters({ user_id: '', date: '' })
    loadData(1, pagination.pageSize)
  }

  return (
    <Card title="打卡管理">
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Input
            placeholder="用户ID"
            style={{ width: 150 }}
            value={filters.user_id}
            onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
          />
          <Input
            placeholder="日期 (YYYY-MM-DD)"
            style={{ width: 180 }}
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
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
      />
    </Card>
  )
}

export default CheckInManagement
