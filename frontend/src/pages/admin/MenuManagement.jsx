import React, { useState, useEffect } from 'react'
import { Table, Card, Input, Select, Button, Space, Tag, Modal, Form, message, Tree } from 'antd'
import { SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import dayjs from 'dayjs'

const { Option } = Select

const MenuManagement = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [filters, setFilters] = useState({ name: '', role: '' })
  const [modalVisible, setModalVisible] = useState(false)
  const [editingMenu, setEditingMenu] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (filters.name) params.name = filters.name
      if (filters.role) params.role = filters.role

      const res = await request.get('/menus', { params })
      setData(res.data.list || [])
      setPagination({
        current: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
      })
    } catch (error) {
      console.error('获取菜单列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleTag = (role) => {
    const roleMap = {
      admin: { color: 'red', text: '管理员' },
      employee: { color: 'blue', text: '员工' },
      user: { color: 'green', text: '用户' },
      all: { color: 'purple', text: '全部' },
    }
    const info = roleMap[role] || { color: 'default', text: role }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const getTypeTag = (type) => {
    const typeMap = {
      menu: { color: 'blue', text: '菜单' },
      button: { color: 'orange', text: '按钮' },
      directory: { color: 'purple', text: '目录' },
    }
    const info = typeMap[type] || { color: 'default', text: type }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const handleAdd = () => {
    setEditingMenu(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingMenu(record)
    form.setFieldsValue({
      parent_id: record.parent_id,
      name: record.name,
      path: record.path,
      icon: record.icon,
      type: record.type,
      role: record.role,
      sort: record.sort,
      status: record.status,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      await request.delete(`/menus/${id}`)
      message.success('删除成功')
      loadData(pagination.current, pagination.pageSize)
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleSubmit = async (values) => {
    try {
      if (editingMenu) {
        await request.put(`/menus/${editingMenu.id}`, values)
        message.success('更新成功')
      } else {
        await request.post('/menus', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      loadData(pagination.current, pagination.pageSize)
    } catch (error) {
      console.error('提交失败:', error)
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '菜单名称', dataIndex: 'name', key: 'name' },
    { title: '路径', dataIndex: 'path', key: 'path' },
    { title: '图标', dataIndex: 'icon', key: 'icon' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => getTypeTag(type),
    },
    {
      title: '角色权限',
      dataIndex: 'role',
      key: 'role',
      render: (role) => getRoleTag(role),
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status ? 'green' : 'red'}>
          {status ? '启用' : '禁用'}
        </Tag>
      ),
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
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const handleSearch = () => {
    loadData(1, pagination.pageSize)
  }

  const handleReset = () => {
    setFilters({ name: '', role: '' })
    loadData(1, pagination.pageSize)
  }

  return (
    <Card title="菜单管理">
      <div style={{ marginBottom: 16 }}>
        <Space size="large">
          <Input
            placeholder="菜单名称"
            style={{ width: 150 }}
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />
          <Select
            placeholder="角色权限"
            style={{ width: 120 }}
            value={filters.role || undefined}
            onChange={(value) => setFilters({ ...filters, role: value })}
            allowClear
          >
            <Option value="admin">管理员</Option>
            <Option value="employee">员工</Option>
            <Option value="user">用户</Option>
          </Select>
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增菜单
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

      <Modal
        title={editingMenu ? '编辑菜单' : '新增菜单'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item label="父级菜单ID" name="parent_id">
            <Input type="number" placeholder="请输入父级菜单ID，0表示顶级菜单" />
          </Form.Item>
          <Form.Item label="菜单名称" name="name" rules={[{ required: true, message: '请输入菜单名称' }]}>
            <Input placeholder="请输入菜单名称" />
          </Form.Item>
          <Form.Item label="路径" name="path">
            <Input placeholder="请输入路由路径" />
          </Form.Item>
          <Form.Item label="图标" name="icon">
            <Input placeholder="请输入图标名称" />
          </Form.Item>
          <Form.Item label="类型" name="type" rules={[{ required: true, message: '请选择类型' }]}>
            <Select placeholder="请选择类型">
              <Option value="directory">目录</Option>
              <Option value="menu">菜单</Option>
              <Option value="button">按钮</Option>
            </Select>
          </Form.Item>
          <Form.Item label="角色权限" name="role" rules={[{ required: true, message: '请选择角色权限' }]}>
            <Select placeholder="请选择角色权限">
              <Option value="admin">管理员</Option>
              <Option value="employee">员工</Option>
              <Option value="user">用户</Option>
              <Option value="all">全部</Option>
            </Select>
          </Form.Item>
          <Form.Item label="排序" name="sort">
            <Input type="number" placeholder="请输入排序值" />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select placeholder="请选择状态">
              <Option value={1}>启用</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
              确定
            </Button>
            <Button onClick={() => setModalVisible(false)}>取消</Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default MenuManagement
