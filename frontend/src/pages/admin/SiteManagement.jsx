import React, { useState, useEffect } from 'react'
import { Table, Card, Input, Button, Space, Tag, Modal, Form, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import dayjs from 'dayjs'

const SiteManagement = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({ keyword: '' })
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (filters.keyword) params.keyword = filters.keyword

      const res = await request.get('/sites', { params })
      setData(res.data.list || [])
      setPagination({
        current: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
      })
    } catch (error) {
      console.error('获取站点列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '站点名称', dataIndex: 'name', key: 'name' },
    { title: '地址', dataIndex: 'address', key: 'address' },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '负责人', dataIndex: 'manager', key: 'manager' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '正常' : '关闭'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该站点吗？"
            onConfirm={() => handleDelete(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleEdit = (record) => {
    setEditingItem(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleDelete = async (record) => {
    try {
      await request.delete(`/site/${record.id}`)
      message.success('删除成功')
      loadData(pagination.current, pagination.pageSize)
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      if (editingItem) {
        await request.put(`/site/${editingItem.id}`, values)
        message.success('更新成功')
      } else {
        await request.post('/site', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadData(pagination.current, pagination.pageSize)
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  const handleSearch = () => {
    loadData(1, pagination.pageSize)
  }

  const handleReset = () => {
    setFilters({ keyword: '' })
    loadData(1, pagination.pageSize)
  }

  const handleTableChange = (p) => {
    loadData(p.current, p.pageSize)
  }

  return (
    <div>
      <Card
        title="站点管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增站点
          </Button>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Space size="large">
            <Input
              placeholder="站点名称/地址"
              style={{ width: 250 }}
              prefix={<SearchOutlined />}
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              onPressEnter={handleSearch}
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
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑站点' : '新增站点'}
        open={modalVisible}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="站点名称"
            rules={[{ required: true, message: '请输入站点名称' }]}
          >
            <Input placeholder="请输入站点名称" />
          </Form.Item>
          <Form.Item
            name="address"
            label="地址"
            rules={[{ required: true, message: '请输入地址' }]}
          >
            <Input.TextArea rows={2} placeholder="请输入详细地址" />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item name="manager" label="负责人">
            <Input placeholder="请输入负责人姓名" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态">
              <Select.Option value={1}>正常</Select.Option>
              <Select.Option value={0}>关闭</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SiteManagement
