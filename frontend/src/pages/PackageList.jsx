import React, { useState, useEffect } from 'react'
import { Table, Card, Input, Select, Button, Space, Tag, message, Modal } from 'antd'
import { SearchOutlined, EyeOutlined, PayCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import request from '../utils/request'
import { getUserInfo, isEmployee } from '../utils/auth'
import dayjs from 'dayjs'

const { Option } = Select

const PackageList = () => {
  const [loading, setLoading] = useState(false)
  const [packages, setPackages] = useState([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [filters, setFilters] = useState({
    keyword: '',
    status: '',
  })
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)

  useEffect(() => {
    setUserInfo(getUserInfo())
    loadPackages()
  }, [])

  const loadPackages = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: pageSize,
      }
      if (filters.keyword) {
        params.keyword = filters.keyword
      }
      if (filters.status) {
        params.status = filters.status
      }

      const res = await request.get('/packages', { params })
      setPackages(res.data.list || [])
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

  const handleSearch = () => {
    loadPackages(1, pagination.pageSize)
  }

  const handleReset = () => {
    setFilters({ keyword: '', status: '' })
    loadPackages(1, pagination.pageSize)
  }

  const handleTableChange = (p) => {
    loadPackages(p.current, p.pageSize)
  }

  const handlePay = async (record) => {
    Modal.confirm({
      title: '确认支付',
      content: `运单号: ${record.tracking_number}\n运费: ¥${record.shipping_fee || 0}`,
      onOk: async () => {
        try {
          await request.post(`/package/${record.id}/pay`)
          message.success('支付成功')
          loadPackages(pagination.current, pagination.pageSize)
        } catch (error) {
          console.error('支付失败:', error)
        }
      },
    })
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

  const columns = [
    {
      title: '运单号',
      dataIndex: 'tracking_number',
      key: 'tracking_number',
      width: 180,
    },
    {
      title: '寄件人',
      dataIndex: 'sender_name',
      key: 'sender_name',
      width: 100,
    },
    {
      title: '收件人',
      dataIndex: 'receiver_name',
      key: 'receiver_name',
      width: 100,
    },
    {
      title: '收件地址',
      dataIndex: 'receiver_address',
      key: 'receiver_address',
      ellipsis: true,
    },
    {
      title: '物品名称',
      dataIndex: 'goods_name',
      key: 'goods_name',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '运费',
      dataIndex: 'shipping_fee',
      key: 'shipping_fee',
      width: 100,
      render: (fee) => `¥${fee || 0}`,
    },
    {
      title: '支付状态',
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 100,
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'orange'}>
          {status === 1 ? '已支付' : '未支付'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/package/${record.id}`)}
          >
            详情
          </Button>
          {record.payment_status !== 1 && record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<PayCircleOutlined />}
              onClick={() => handlePay(record)}
            >
              支付
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'pending', label: '待处理' },
    { value: 'shipped', label: '已发货' },
    { value: 'in_transit', label: '运输中' },
    { value: 'arrived', label: '已到达' },
    { value: 'delivering', label: '派送中' },
    { value: 'signed', label: '已签收' },
    { value: 'picked', label: '已取件' },
  ]

  return (
    <div>
      <Card
        title="快递查询"
        extra={
          <Button type="primary" onClick={() => navigate('/send')}>
            我要寄件
          </Button>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Space size="large">
            <Input
              placeholder="运单号/寄件人/收件人"
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              onPressEnter={handleSearch}
            />
            <Select
              style={{ width: 150 }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              {statusOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={packages}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  )
}

export default PackageList
