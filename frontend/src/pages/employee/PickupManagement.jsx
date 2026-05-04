import React, { useState, useEffect } from 'react'
import { Table, Card, Input, Button, Space, Tag, Modal, message, Descriptions } from 'antd'
import { SearchOutlined, ReloadOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import dayjs from 'dayjs'

const PickupManagement = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({ tracking_number: '', recipient: '' })
  const [detailModal, setDetailModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (filters.tracking_number) params.tracking_number = filters.tracking_number
      if (filters.recipient) params.recipient = filters.recipient

      const res = await request.get('/packages', { params })
      setData(res.data.list || [])
      setPagination({
        current: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
      })
    } catch (error) {
      console.error('获取快递列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'default', text: '待处理' },
      shipped: { color: 'orange', text: '已发货' },
      in_transit: { color: 'blue', text: '运输中' },
      arrived: { color: 'cyan', text: '已到达' },
      out_for_delivery: { color: 'purple', text: '派送中' },
      delivered: { color: 'green', text: '已签收' },
      picked_up: { color: 'gold', text: '已取件' },
      cancelled: { color: 'red', text: '已取消' },
    }
    const info = statusMap[status] || { color: 'default', text: status }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const handleDetail = (record) => {
    setSelectedPackage(record)
    setDetailModal(true)
  }

  const handleConfirmPickup = async (record) => {
    try {
      await request.post(`/packages/${record.id}/pickup`, { operator_id: record.user_id })
      message.success('取件确认成功')
      loadData(pagination.current, pagination.pageSize)
    } catch (error) {
      console.error('确认取件失败:', error)
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '运单号', dataIndex: 'tracking_number', key: 'tracking_number' },
    { title: '收件人', dataIndex: 'recipient', key: 'recipient' },
    { title: '收件电话', dataIndex: 'recipient_phone', key: 'recipient_phone' },
    { title: '物品描述', dataIndex: 'item_description', key: 'item_description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleDetail(record)}
          >
            详情
          </Button>
          {record.status === 'arrived' && (
            <Button
              type="link"
              icon={<CheckCircleOutlined />}
              onClick={() => handleConfirmPickup(record)}
            >
              确认取件
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const handleSearch = () => {
    loadData(1, pagination.pageSize)
  }

  const handleReset = () => {
    setFilters({ tracking_number: '', recipient: '' })
    loadData(1, pagination.pageSize)
  }

  return (
    <Card title="取件管理">
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Input
            placeholder="运单号"
            style={{ width: 150 }}
            value={filters.tracking_number}
            onChange={(e) => setFilters({ ...filters, tracking_number: e.target.value })}
          />
          <Input
            placeholder="收件人"
            style={{ width: 120 }}
            value={filters.recipient}
            onChange={(e) => setFilters({ ...filters, recipient: e.target.value })}
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
        scroll={{ x: 1200 }}
      />

      <Modal
        title="快递详情"
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={null}
        width={600}
      >
        {selectedPackage && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="运单号">{selectedPackage.tracking_number}</Descriptions.Item>
            <Descriptions.Item label="寄件人">{selectedPackage.sender}</Descriptions.Item>
            <Descriptions.Item label="寄件电话">{selectedPackage.sender_phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="寄件地址">{selectedPackage.sender_address || '-'}</Descriptions.Item>
            <Descriptions.Item label="收件人">{selectedPackage.recipient}</Descriptions.Item>
            <Descriptions.Item label="收件电话">{selectedPackage.recipient_phone}</Descriptions.Item>
            <Descriptions.Item label="收件地址">{selectedPackage.recipient_address}</Descriptions.Item>
            <Descriptions.Item label="物品描述">{selectedPackage.item_description}</Descriptions.Item>
            <Descriptions.Item label="重量">{selectedPackage.weight} kg</Descriptions.Item>
            <Descriptions.Item label="金额">¥ {selectedPackage.amount}</Descriptions.Item>
            <Descriptions.Item label="状态">{getStatusTag(selectedPackage.status)}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedPackage.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  )
}

export default PickupManagement
