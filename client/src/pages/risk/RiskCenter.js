import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Tag, Modal, message, Statistic, Tabs, Select, Form, Input, Badge } from 'antd';
import { WarningOutlined, ExclamationCircleOutlined, CheckCircleOutlined, CarOutlined, ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { riskAPI, orderAPI } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;

export default function RiskCenter() {
  const [activeTab, setActiveTab] = useState('pending');
  const [alerts, setAlerts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [handleModalVisible, setHandleModalVisible] = useState(false);
  const [filterType, setFilterType] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [activeTab, filterType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab === 'pending') params.status = 'pending';
      if (activeTab === 'handled') params.status = 'handled';
      if (filterType) params.type = filterType;
      
      const [alertsRes, statsRes] = await Promise.all([
        riskAPI.getAlerts(params),
        riskAPI.getStatistics()
      ]);
      
      if (alertsRes.success) setAlerts(alertsRes.data);
      if (statsRes.success) setStatistics(statsRes.data);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (alert) => {
    setSelectedAlert(alert);
    setDetailModalVisible(true);
  };

  const handleProcess = (alert) => {
    setSelectedAlert(alert);
    form.resetFields();
    setHandleModalVisible(true);
  };

  const handleConfirm = async (values) => {
    try {
      const res = await riskAPI.handleAlert(selectedAlert._id, {
        ...values,
        handledAt: new Date()
      });
      if (res.success) {
        message.success('处理成功');
        setHandleModalVisible(false);
        loadData();
      }
    } catch (err) {
      message.error('处理失败');
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      route_deviation: <EnvironmentOutlined />,
      stop_timeout: <ClockCircleOutlined />,
      speed_abnormal: <CarOutlined />
    };
    return icons[type] || <WarningOutlined />;
  };

  const getTypeText = (type) => {
    const texts = {
      route_deviation: '路线偏离',
      stop_timeout: '停留超时',
      speed_abnormal: '速度异常'
    };
    return texts[type] || type;
  };

  const getLevelColor = (level) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'blue'
    };
    return colors[level] || 'default';
  };

  const getLevelText = (level) => {
    const texts = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return texts[level] || level;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      handling: 'blue',
      handled: 'green',
      ignored: 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: '待处理',
      handling: '处理中',
      handled: '已处理',
      ignored: '已忽略'
    };
    return texts[status] || status;
  };

  const alertColumns = [
    {
      title: '预警时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v) => (
        <Tag icon={getTypeIcon(v)} color={getLevelColor(selectedAlert?.level)}>
          {getTypeText(v)}
        </Tag>
      )
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (v) => <Badge status={v === 'high' ? 'error' : v === 'medium' ? 'warning' : 'processing'} text={getLevelText(v)} />
    },
    {
      title: '骑手',
      dataIndex: ['rider', 'name'],
      key: 'rider',
      width: 100
    },
    {
      title: '订单号',
      dataIndex: ['order', 'orderNo'],
      key: 'orderNo',
      width: 140
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v) => <Tag color={getStatusColor(v)}>{getStatusText(v)}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <div>
          <Button size="small" onClick={() => handleViewDetail(record)} style={{ marginRight: 8 }}>
            详情
          </Button>
          {record.status === 'pending' && (
            <Button type="primary" size="small" onClick={() => handleProcess(record)}>
              处理
            </Button>
          )}
        </div>
      )
    }
  ];

  const alertTypeChartOption = statistics ? {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      name: '预警类型',
      type: 'pie',
      radius: ['40%', '70%'],
      data: [
        { value: statistics.typeStats?.route_deviation || 0, name: '路线偏离', itemStyle: { color: '#f5222d' } },
        { value: statistics.typeStats?.stop_timeout || 0, name: '停留超时', itemStyle: { color: '#fa8c16' } },
        { value: statistics.typeStats?.speed_abnormal || 0, name: '速度异常', itemStyle: { color: '#1890ff' } }
      ],
      label: { formatter: '{b}: {c} ({d}%)' }
    }]
  } : {};

  const dailyAlertChartOption = statistics ? {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: statistics.dailyData?.map(d => d.date.slice(5)) || [] },
    yAxis: { type: 'value', name: '预警数' },
    series: [{
      name: '预警数',
      type: 'line',
      data: statistics.dailyData?.map(d => d.count) || [],
      smooth: true,
      areaStyle: { opacity: 0.3 },
      itemStyle: { color: '#f5222d' }
    }]
  } : {};

  return (
    <div>
      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="待处理预警"
                value={statistics.pendingCount}
                valueStyle={{ color: '#f5222d' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日预警"
                value={statistics.todayCount}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已处理"
                value={statistics.handledCount}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="处理率"
                value={statistics.handledRate * 100}
                suffix="%"
                precision={1}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="预警类型分布">
            <ReactECharts option={alertTypeChartOption} style={{ height: 250 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="每日预警趋势">
            <ReactECharts option={dailyAlertChartOption} style={{ height: 250 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="预警列表"
        extra={
          <Select
            placeholder="筛选类型"
            allowClear
            style={{ width: 150 }}
            value={filterType}
            onChange={setFilterType}
          >
            <Option value="route_deviation">路线偏离</Option>
            <Option value="stop_timeout">停留超时</Option>
            <Option value="speed_abnormal">速度异常</Option>
          </Select>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab={<span><Badge status="processing" /> 待处理</span>} key="pending" />
          <Tabs.TabPane tab="已处理" key="handled" />
          <Tabs.TabPane tab="全部" key="all" />
        </Tabs>
        <Table
          columns={alertColumns}
          dataSource={alerts}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="预警详情"
        open={detailModalVisible}
        width={800}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          selectedAlert?.status === 'pending' && (
            <Button key="handle" type="primary" onClick={() => { setDetailModalVisible(false); handleProcess(selectedAlert); }}>
              处理预警
            </Button>
          ),
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {selectedAlert && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="基本信息">
                  <p><strong>预警类型:</strong> {getTypeText(selectedAlert.type)}</p>
                  <p><strong>预警级别:</strong> <Tag color={getLevelColor(selectedAlert.level)}>{getLevelText(selectedAlert.level)}</Tag></p>
                  <p><strong>预警时间:</strong> {dayjs(selectedAlert.createdAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                  <p><strong>状态:</strong> <Tag color={getStatusColor(selectedAlert.status)}>{getStatusText(selectedAlert.status)}</Tag></p>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="关联信息">
                  <p><strong>骑手:</strong> {selectedAlert.rider?.name}</p>
                  <p><strong>联系电话:</strong> {selectedAlert.rider?.phone}</p>
                  <p><strong>订单号:</strong> {selectedAlert.order?.orderNo}</p>
                  <p><strong>车型:</strong> {selectedAlert.rider?.vehicleType === 'motorcycle' ? '摩托车' : '厢货'}</p>
                </Card>
              </Col>
            </Row>
            <Card size="small" title="预警详情" style={{ marginTop: 16 }}>
              <p><strong>描述:</strong> {selectedAlert.description}</p>
              {selectedAlert.details && (
                <div style={{ marginTop: 8, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
                  {selectedAlert.type === 'route_deviation' && (
                    <>
                      <p><strong>偏离距离:</strong> {(selectedAlert.details.deviationDistance / 1000).toFixed(2)} km</p>
                      <p><strong>当前位置:</strong> [{selectedAlert.details.currentLocation?.join(', ')}]</p>
                      <p><strong>预定路线:</strong> {selectedAlert.details.plannedRoute?.length || 0} 个路径点</p>
                    </>
                  )}
                  {selectedAlert.type === 'stop_timeout' && (
                    <>
                      <p><strong>停留位置:</strong> [{selectedAlert.details.location?.join(', ')}]</p>
                      <p><strong>已停留时间:</strong> {Math.floor(selectedAlert.details.stopDuration / 60)} 分钟</p>
                      <p><strong>阈值:</strong> {selectedAlert.details.threshold / 60} 分钟</p>
                    </>
                  )}
                  {selectedAlert.type === 'speed_abnormal' && (
                    <>
                      <p><strong>当前速度:</strong> {selectedAlert.details.currentSpeed} km/h</p>
                      <p><strong>限速:</strong> {selectedAlert.details.speedLimit} km/h</p>
                      <p><strong>超速:</strong> {(selectedAlert.details.currentSpeed - selectedAlert.details.speedLimit).toFixed(1)} km/h</p>
                    </>
                  )}
                </div>
              )}
            </Card>
            {selectedAlert.handledBy && (
              <Card size="small" title="处理记录" style={{ marginTop: 16 }}>
                <p><strong>处理人:</strong> {selectedAlert.handledBy?.name}</p>
                <p><strong>处理时间:</strong> {dayjs(selectedAlert.handledAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                <p><strong>处理结果:</strong> {selectedAlert.handleResult}</p>
                <p><strong>处理备注:</strong> {selectedAlert.handleRemark}</p>
              </Card>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="处理预警"
        open={handleModalVisible}
        onCancel={() => setHandleModalVisible(false)}
        footer={null}
      >
        {selectedAlert && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
            <p><strong>预警类型:</strong> {getTypeText(selectedAlert.type)}</p>
            <p><strong>预警级别:</strong> <Tag color={getLevelColor(selectedAlert.level)}>{getLevelText(selectedAlert.level)}</Tag></p>
            <p><strong>骑手:</strong> {selectedAlert.rider?.name}</p>
            <p><strong>描述:</strong> {selectedAlert.description}</p>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleConfirm}>
          <Form.Item name="handleResult" label="处理结果" rules={[{ required: true, message: '请选择处理结果' }]}>
            <Select placeholder="请选择处理结果">
              <Option value="contacted_rider">已联系骑手，情况正常</Option>
              <Option value="rider_verified">骑手说明情况，核实无误</Option>
              <Option value="reassigned_order">已重新分配订单</Option>
              <Option value="warning_issued">已给予警告</Option>
              <Option value="suspended_rider">已暂停骑手账号</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="handleRemark" label="处理备注" rules={[{ required: true, message: '请输入处理备注' }]}>
            <TextArea rows={4} placeholder="请详细描述处理过程和结果" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              <CheckCircleOutlined /> 确认处理
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
