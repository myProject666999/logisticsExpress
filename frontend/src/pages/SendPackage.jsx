import React, { useState } from 'react'
import { Form, Input, InputNumber, Button, Card, Row, Col, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import request from '../utils/request'

const { TextArea } = Input

const SendPackage = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const data = {
        sender_name: values.sender_name,
        sender_phone: values.sender_phone,
        sender_address: values.sender_address,
        receiver_name: values.receiver_name,
        receiver_phone: values.receiver_phone,
        receiver_address: values.receiver_address,
        goods_name: values.goods_name,
        goods_weight: values.goods_weight || 0,
        goods_value: values.goods_value || 0,
      }

      const res = await request.post('/package', data)
      message.success(`寄件成功！运单号: ${res.data.tracking_number}`)
      navigate('/packages')
    } catch (error) {
      console.error('寄件失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card title="我要寄件">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            goods_weight: 1,
          }}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Card title="寄件人信息" size="small">
                <Form.Item
                  name="sender_name"
                  label="寄件人姓名"
                  rules={[{ required: true, message: '请输入寄件人姓名' }]}
                >
                  <Input placeholder="请输入寄件人姓名" />
                </Form.Item>

                <Form.Item
                  name="sender_phone"
                  label="寄件人电话"
                  rules={[{ required: true, message: '请输入寄件人电话' }]}
                >
                  <Input placeholder="请输入寄件人电话" />
                </Form.Item>

                <Form.Item
                  name="sender_address"
                  label="寄件地址"
                  rules={[{ required: true, message: '请输入寄件地址' }]}
                >
                  <TextArea rows={3} placeholder="请输入详细寄件地址" />
                </Form.Item>
              </Card>
            </Col>

            <Col span={12}>
              <Card title="收件人信息" size="small">
                <Form.Item
                  name="receiver_name"
                  label="收件人姓名"
                  rules={[{ required: true, message: '请输入收件人姓名' }]}
                >
                  <Input placeholder="请输入收件人姓名" />
                </Form.Item>

                <Form.Item
                  name="receiver_phone"
                  label="收件人电话"
                  rules={[{ required: true, message: '请输入收件人电话' }]}
                >
                  <Input placeholder="请输入收件人电话" />
                </Form.Item>

                <Form.Item
                  name="receiver_address"
                  label="收件地址"
                  rules={[{ required: true, message: '请输入收件地址' }]}
                >
                  <TextArea rows={3} placeholder="请输入详细收件地址" />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Card title="物品信息" size="small" style={{ marginTop: 16 }}>
            <Row gutter={24}>
              <Col span={8}>
                <Form.Item
                  name="goods_name"
                  label="物品名称"
                  rules={[{ required: true, message: '请输入物品名称' }]}
                >
                  <Input placeholder="请输入物品名称" />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="goods_weight"
                  label="重量 (kg)"
                  rules={[{ required: true, message: '请输入重量' }]}
                >
                  <InputNumber
                    min={0.1}
                    step={0.1}
                    precision={1}
                    style={{ width: '100%' }}
                    placeholder="请输入重量"
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  name="goods_value"
                  label="物品价值 (元)"
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="请输入物品价值"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              提交寄件
            </Button>
            <Button style={{ marginLeft: 16 }} size="large" onClick={() => navigate('/packages')}>
              取消
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default SendPackage
