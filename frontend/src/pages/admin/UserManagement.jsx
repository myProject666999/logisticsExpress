import React, { useState, useEffect } from 'react'
import { Table, Card, Input, Select, Button, Space, Tag, Modal, Form, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import dayjs from 'dayjs'

const { Option } = Select

const UserManagement = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({ keyword: '', role: '' })
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
      if (filters.role) params.role = filters.role

      const res = await request.get('/users', { params })
      setData(res.data.list || [])
      setPagination({
        current: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
      })
    } catch (error) {
      console.error('获取用户列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleTag = (role) => {
    const roleMap = {
      admin: { color: 'red', text: '管理员' },
      employee: { color: 'blue', text: '员工' },
      user: { color: 'green', text: '普通用户' },
    }
    const info = roleMap[role] || { color: 'default', text: role }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '真实姓名', dataIndex: 'real_name', key: 'real_name' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (role) => getRoleTag(role) },
    { title: '手机号', dataIndex: 'phone', key: 'phone' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '正常' : '禁用'}
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
      width: 200,
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
            title="确认删除该用户吗？"
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
      await request.delete(`/user/${record.id}`)
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
        await request.put(`/user/${editingItem.id}`, values)
        message.success('更新成功')
      } else {
        await request.post('/user', values)
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
    setFilters({ keyword: '', role: '' })
    loadData(1, pagination.pageSize)
  }

  const handleTableChange = (p) => {
    loadData(p.current, p.pageSize)
  }

  return (
    <div>
      <Card
        title="用户管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增用户
          </Button>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Space size="large">
            <Input
              placeholder="用户名/姓名/手机号"
              style={{ width: 250 }}
              prefix={<SearchOutlined />}
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              onPressEnter={handleSearch}
            />
            <Select
              style={{ width: 150 }}
              placeholder="角色"
              allowClear
              value={filters.role || undefined}
              onChange={(value) => setFilters({ ...filters, role: value || '' })}
            >
              <Option value="user">普通用户</Option>
              <Option value="employee">员工</Option>
              <Option value="admin">管理员</Option>
            </Select>
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
        title={editingItem ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onOk={handleOk}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: !editingItem, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingItem} />
          </Form.Item>
          {!editingItem && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
          <Form.Item name="real_name" label="真实姓名">
            <Input placeholder="请输入真实姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select placeholder="请选择角色">
              <Option value="user">普通用户</Option>
              <Option value="employee">员工</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态">
              <Option value={1}>正常</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagement
