import React, { useState, useEffect } from 'react'
import { Card, Button, Table, Tag, message, Descriptions, Statistic, Row, Col } from 'antd'
import { ClockCircleOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons'
import request from '../../utils/request'
import dayjs from 'dayjs'

const MyCheckIn = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [todayRecord, setTodayRecord] = useState(null)
  const [loadingAction, setLoadingAction] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const res = await request.get('/checkin/my', {
        params: { page, page_size: pageSize }
      })
      setData(res.data.list || [])
      setPagination({
        current: res.data.page,
        pageSize: res.data.page_size,
        total: res.data.total,
      })

      // 查找今天的记录
      const today = dayjs().format('YYYY-MM-DD')
      const todayData = res.data.list?.find(item => item.date === today)
      setTodayRecord(todayData || null)
    } catch (error) {
      console.error('获取打卡记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    setLoadingAction(true)
    try {
      await request.post('/checkin')
      message.success('签到成功')
      loadData(pagination.current, pagination.pageSize)
    } catch (error) {
      console.error('签到失败:', error)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleCheckOut = async () => {
    setLoadingAction(true)
    try {
      await request.post('/checkout')
      message.success('签退成功')
      loadData(pagination.current, pagination.pageSize)
    } catch (error) {
      console.error('签退失败:', error)
    } finally {
      setLoadingAction(false)
    }
  }

  const getStatusTag = (status) => {
    const statusMap = {
      0: { color: 'default', text: '未打卡' },
      1: { color: 'blue', text: '已签到' },
      2: { color: 'green', text: '已签退' },
    }
    const info = statusMap[status] || { color: 'default', text: status }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '签到时间',
      dataIndex: 'check_in_time',
      key: 'check_in_time',
      render: (time) => time ? dayjs(time).format('HH:mm:ss') : '-',
    },
    {
      title: '签退时间',
      dataIndex: 'check_out_time',
      key: 'check_out_time',
      render: (time) => time ? dayjs(time).format('HH:mm:ss') : '-',
    },
  ]

  const canCheckIn = !todayRecord || todayRecord.status === 0
  const canCheckOut = todayRecord && todayRecord.status === 1

  return (
    <div>
      <Card title="今日打卡">
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic
              title="今日状态"
              value={todayRecord ? getStatusTag(todayRecord.status) : getStatusTag(0)}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="签到时间"
              value={todayRecord?.check_in_time ? dayjs(todayRecord.check_in_time).format('HH:mm:ss') : '-'}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="签退时间"
              value={todayRecord?.check_out_time ? dayjs(todayRecord.check_out_time).format('HH:mm:ss') : '-'}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="当前日期"
              value={dayjs().format('YYYY-MM-DD')}
            />
          </Col>
        </Row>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Button
            type="primary"
            size="large"
            icon={<LoginOutlined />}
            onClick={handleCheckIn}
            loading={loadingAction}
            disabled={!canCheckIn}
            style={{ marginRight: 16, minWidth: 120 }}
          >
            签到
          </Button>
          <Button
            type="default"
            size="large"
            icon={<LogoutOutlined />}
            onClick={handleCheckOut}
            loading={loadingAction}
            disabled={!canCheckOut}
            style={{ minWidth: 120 }}
          >
            签退
          </Button>
        </div>
      </Card>

      <Card title="打卡记录" style={{ marginTop: 16 }}>
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
    </div>
  )
}

export default MyCheckIn
