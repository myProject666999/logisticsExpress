import React, { useState, useEffect } from 'react'
import { Table, Card, Tag, message } from 'antd'
import request from '../../utils/request'
import dayjs from 'dayjs'

const TransportManagement = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const res = await request.get('/transports', { params: { page, page_size: pageSize } })
      setData(res.data.list || [])
      setPagination({
        current: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
      })
    } catch (error) {
      console.error('获取运输列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusTag = (status) => {
    const statusMap = {
      in_transit: { color: 'orange', text: '运输中' },
      completed: { color: 'green', text: '已完成' },
    }
    const info = statusMap[status] || { color: 'default', text: status }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '快递ID', dataIndex: 'package_id', key: 'package_id' },
    { title: '出发站点ID', dataIndex: 'from_site_id', key: 'from_site_id' },
    { title: '目的站点ID', dataIndex: 'to_site_id', key: 'to_site_id' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  ]

  return (
    <Card title="运输管理">
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

export default TransportManagement
