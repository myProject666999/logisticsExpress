import React, { useState, useEffect } from 'react'
import { Table, Card, Input, Select, Button, Space, Tag, Modal, Form, message } from 'antd'
import { SearchOutlined, ReloadOutlined, InboxOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import dayjs from 'dayjs'

const { Option } = Select

const PackageInbound = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({ tracking_number: '', sender: '', recipient: '', status: 'in_transit' })
  const [inboundModal, setInboundModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (filters.tracking_number) params.tracking_number = filters.tracking_number
      if (filters.sender) params.sender = filters.sender
      if (filters.recipient) params.recipient = filters.recipient
      if (filters.status) params.status = filters.status

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

  const handleInbound = (record) => {
    setSelectedPackage(record)
    form.setFieldsValue({
      tracking_number: record.tracking_number,
      sender: record.sender,
      recipient: record.recipient,
    })
    setInboundModal(true)
  }

  const handleInboundSubmit = async (values) => {
    try {
      await request.post(`/packages/${selectedPackage.id}/inbound`, values)
      message.success('入库成功')
      setInboundModal(false)
      loadData(pagination.current, pagination.pageSize)
    } catch (error) {
      console.error('入库失败:', error)
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '运单号', dataIndex: 'tracking_number', key: 'tracking_number' },
    { title: '寄件人', dataIndex: 'sender', key: 'sender' },
    { title: '收件人', dataIndex: 'recipient', key: 'recipient' },
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
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<InboxOutlined />}
            onClick={() => handleInbound(record)}
          >
            入库
          </Button>
        </Space>
      ),
    },
  ]

  const handleSearch = () => {
    loadData(1, pagination.pageSize)
  }

  const handleReset = () => {
    setFilters({ tracking_number: '', sender: '', recipient: '', status: 'in_transit' })
    loadData(1, pagination.pageSize)
  }

  return (
    <Card title="快递入库">
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Input
            placeholder="运单号"
            style={{ width: 150 }}
            value={filters.tracking_number}
            onChange={(e) => setFilters({ ...filters, tracking_number: e.target.value })}
          />
          <Input
            placeholder="寄件人"
            style={{ width: 120 }}
            value={filters.sender}
            onChange={(e) => setFilters({ ...filters, sender: e.target.value })}
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
        title="快递入库"
        open={inboundModal}
        onCancel={() => setInboundModal(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleInboundSubmit}
        >
          <Form.Item label="运单号" name="tracking_number">
            <Input disabled />
          </Form.Item>
          <Form.Item label="寄件人" name="sender">
            <Input disabled />
          </Form.Item>
          <Form.Item label="收件人" name="recipient">
            <Input disabled />
          </Form.Item>
          <Form.Item label="当前站点ID" name="site_id">
            <Input type="number" placeholder="请输入站点ID" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入入库备注" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
              确认入库
            </Button>
            <Button onClick={() => setInboundModal(false)}>取消</Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default PackageInbound
