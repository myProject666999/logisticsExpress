import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Tabs, message, Descriptions, Tag } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import request from '../utils/request'
import { getUserInfo, setUserInfo } from '../utils/auth'

const Profile = () => {
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [userInfo, setUserInfoState] = useState(null)

  useEffect(() => {
    const user = getUserInfo()
    setUserInfoState(user)
    if (user) {
      form.setFieldsValue({
        real_name: user.real_name,
        phone: user.phone,
        email: user.email,
        address: user.address,
      })
    }
  }, [form])

  const getRoleTag = (role) => {
    const roleMap = {
      admin: { color: 'red', text: '管理员' },
      employee: { color: 'blue', text: '员工' },
      user: { color: 'green', text: '普通用户' },
    }
    const info = roleMap[role] || { color: 'default', text: role }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const data = {
        real_name: values.real_name,
        phone: values.phone,
        email: values.email,
        address: values.address,
      }
      await request.put('/user/profile', data)
      
      // 更新本地存储的用户信息
      const currentUser = getUserInfo()
      const updatedUser = { ...currentUser, ...data }
      setUserInfo(updatedUser)
      setUserInfoState(updatedUser)
      
      message.success('更新成功')
    } catch (error) {
      console.error('更新失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const onPasswordFinish = async (values) => {
    if (values.new_password !== values.confirm_password) {
      message.error('两次输入的新密码不一致')
      return
    }

    setPasswordLoading(true)
    try {
      await request.put('/user/password', {
        old_password: values.old_password,
        new_password: values.new_password,
      })
      message.success('密码修改成功')
      passwordForm.resetFields()
    } catch (error) {
      console.error('密码修改失败:', error)
    } finally {
      setPasswordLoading(false)
    }
  }

  const tabItems = [
    {
      key: 'info',
      label: '个人信息',
      children: (
        <div>
          <Card title="基本信息" style={{ marginBottom: 24 }}>
            <Descriptions column={2}>
              <Descriptions.Item label="用户名">{userInfo?.username}</Descriptions.Item>
              <Descriptions.Item label="角色">{getRoleTag(userInfo?.role)}</Descriptions.Item>
              <Descriptions.Item label="真实姓名">{userInfo?.real_name || '未填写'}</Descriptions.Item>
              <Descriptions.Item label="手机号">{userInfo?.phone || '未填写'}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{userInfo?.email || '未填写'}</Descriptions.Item>
              <Descriptions.Item label="地址">{userInfo?.address || '未填写'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="编辑信息">
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{
                real_name: userInfo?.real_name,
                phone: userInfo?.phone,
                email: userInfo?.email,
                address: userInfo?.address,
              }}
            >
              <Form.Item
                name="real_name"
                label="真实姓名"
              >
                <Input prefix={<UserOutlined />} placeholder="请输入真实姓名" />
              </Form.Item>

              <Form.Item
                name="phone"
                label="手机号"
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>

              <Form.Item
                name="email"
                label="邮箱"
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>

              <Form.Item
                name="address"
                label="地址"
              >
                <Input.TextArea rows={3} placeholder="请输入详细地址" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存修改
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      ),
    },
    {
      key: 'password',
      label: '修改密码',
      children: (
        <Card title="修改密码">
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={onPasswordFinish}
            style={{ maxWidth: 400 }}
          >
            <Form.Item
              name="old_password"
              label="原密码"
              rules={[{ required: true, message: '请输入原密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请输入原密码" />
            </Form.Item>

            <Form.Item
              name="new_password"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码（至少6个字符）" />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="确认新密码"
              rules={[{ required: true, message: '请确认新密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={passwordLoading}>
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>个人中心</h2>
      <Tabs items={tabItems} />
    </div>
  )
}

export default Profile
