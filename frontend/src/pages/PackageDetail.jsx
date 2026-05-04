import React, { useState, useEffect } from 'react'
import { Card, Descriptions, Tag, Timeline, Button, Space, Modal, message, Spin } from 'antd'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftOutlined, PayCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import request from '../utils/request'
import dayjs from 'dayjs'

const PackageDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [packageData, setPackageData] = useState(null)
  const [tracks, setTracks] = useState([])

  useEffect(() => {
    if (id) {
      loadPackageDetail()
    }
  }, [id])

  const loadPackageDetail = async () => {
    setLoading(true)
    try {
      const res = await request.get(`/package/${id}`)
      setPackageData(res.data.package)
      setTracks(res.data.tracks || [])
    } catch (error) {
      console.error('获取快递详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePay = () => {
    Modal.confirm({
      title: '确认支付',
      content: `运单号: ${packageData?.tracking_number}\n运费: ¥${packageData?.shipping_fee || 0}`,
      onOk: async () => {
        try {
          await request.post(`/package/${id}/pay`)
          message.success('支付成功')
          loadPackageDetail()
        } catch (error) {
          console.error('支付失败:', error)
        }
      },
    })
  }

  const handleSign = () => {
    Modal.confirm({
      title: '确认签收',
      content: '确认已收到快递吗？',
      onOk: async () => {
        try {
          await request.post(`/package/${id}/sign`)
          message.success('签收成功')
          loadPackageDetail()
        } catch (error) {
          console.error('签收失败:', error)
        }
      },
    })
  }

  const handlePickup = () => {
    Modal.confirm({
      title: '确认取件',
      content: '确认已取到快递吗？',
      onOk: async () => {
        try {
          await request.post(`/package/${id}/pickup`)
          message.success('取件成功')
          loadPackageDetail()
        } catch (error) {
          console.error('取件失败:', error)
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!packageData) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <p>快递不存在</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/packages')}
        >
          返回列表
        </Button>
      </div>

      <Card
        title="快递信息"
        extra={
          <Space>
            {packageData.payment_status !== 1 && packageData.status === 'pending' && (
              <Button
                type="primary"
                icon={<PayCircleOutlined />}
                onClick={handlePay}
              >
                支付运费
              </Button>
            )}
            {packageData.status === 'delivering' && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleSign}
              >
                签收
              </Button>
            )}
            {packageData.status === 'arrived' && (
              <Button
                type="primary"
                onClick={handlePickup}
              >
                取件
              </Button>
            )}
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="运单号" span={2}>
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>
              {packageData.tracking_number}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {getStatusTag(packageData.status)}
          </Descriptions.Item>
          <Descriptions.Item label="支付状态">
            <Tag color={packageData.payment_status === 1 ? 'green' : 'orange'}>
              {packageData.payment_status === 1 ? '已支付' : '未支付'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="物品名称">
            {packageData.goods_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="重量">
            {packageData.goods_weight ? `${packageData.goods_weight} kg` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="物品价值">
            {packageData.goods_value ? `¥${packageData.goods_value}` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="运费">
            <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
              ¥{packageData.shipping_fee || 0}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="寄件人信息" style={{ marginTop: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="姓名">
            {packageData.sender_name}
          </Descriptions.Item>
          <Descriptions.Item label="电话">
            {packageData.sender_phone}
          </Descriptions.Item>
          <Descriptions.Item label="地址" span={2}>
            {packageData.sender_address}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="收件人信息" style={{ marginTop: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="姓名">
            {packageData.receiver_name}
          </Descriptions.Item>
          <Descriptions.Item label="电话">
            {packageData.receiver_phone}
          </Descriptions.Item>
          <Descriptions.Item label="地址" span={2}>
            {packageData.receiver_address}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="物流轨迹" style={{ marginTop: 16 }}>
        {tracks && tracks.length > 0 ? (
          <Timeline>
            {tracks.map((track, index) => (
              <Timeline.Item
                key={track.id}
                color={index === 0 ? 'blue' : 'gray'}
              >
                <p style={{ margin: 0 }}>
                  <strong>{track.description}</strong>
                </p>
                <p style={{ margin: 0, color: '#666' }}>
                  {track.location && `位置: ${track.location}`}
                  {track.operator && ` | 操作人: ${track.operator}`}
                </p>
                <p style={{ margin: 0, color: '#999', fontSize: 12 }}>
                  {dayjs(track.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </p>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <p style={{ color: '#999', textAlign: 'center' }}>暂无物流轨迹</p>
        )}
      </Card>
    </div>
  )
}

export default PackageDetail
