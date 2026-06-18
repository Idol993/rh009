import React, { useState, useEffect } from 'react';
import { Row, Col, Card, List, Tag, Table, message } from 'antd';
import ReactECharts from 'echarts-for-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import dayjs from 'dayjs';
import { dashboardAPI } from '../services/api';
import {
  ShoppingOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  DollarOutlined
} from '@ant-design/icons';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [orders, setRealtimeOrders] = useState([]);
  const [alerts, setRealtimeAlerts] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [riderPerformance, setRiderPerformance] = useState([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [overviewRes, ordersRes, alertsRes, trendRes, heatmapRes, performanceRes] = await Promise.all([
        dashboardAPI.getOverview(),
        dashboardAPI.getRealtimeOrders({ limit: 10 }),
        dashboardAPI.getRealtimeAlerts({ limit: 10 }),
        dashboardAPI.getOrderTrend({ days: 7 }),
        dashboardAPI.getHeatmap(),
        dashboardAPI.getRiderPerformance({ limit: 5 })
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (ordersRes.success) setRealtimeOrders(ordersRes.data);
      if (alertsRes.success) setRealtimeAlerts(alertsRes.data);
      if (trendRes.success) setTrendData(trendRes.data);
      if (heatmapRes.success) setHeatmapData(heatmapRes.data);
      if (performanceRes.success) setRiderPerformance(performanceRes.data);
    } catch (err) {
      message.error('加载数据失败');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      assigned: 'blue',
      delivering: 'cyan',
      signed: 'green',
      exception: 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: '待调度',
      assigned: '已分配',
      delivering: '配送中',
      signed: '已签收',
      exception: '异常'
    };
    return texts[status] || status;
  };

  const trendChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['订单数', '完成数', '妥投率'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: trendData.map(d => d.date.slice(5)) },
    yAxis: [
      { type: 'value', name: '数量' },
      { type: 'value', name: '妥投率', min: 0, max: 1, axisLabel: { formatter: '{value}%' } }
    ],
    series: [
      { name: '订单数', type: 'bar', data: trendData.map(d => d.total) },
      { name: '完成数', type: 'bar', data: trendData.map(d => d.completed) },
      {
        name: '妥投率',
        type: 'line',
        yAxisIndex: 1,
        data: trendData.map(d => d.successRate * 100),
        smooth: true,
        lineStyle: { color: '#52c41a' },
        itemStyle: { color: '#52c41a' }
      }
    ]
  };

  const performanceColumns = [
    {
      title: '骑手',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount'
    },
    {
      title: '总里程(km)',
      dataIndex: 'totalDistance',
      key: 'totalDistance'
    },
    {
      title: '收入(元)',
      dataIndex: 'totalCommission',
      key: 'totalCommission'
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      render: (v) => `${v.toFixed(1)}`
    }
  ];

  if (!overview) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={4}>
          <div className="dashboard-card">
            <ShoppingOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <h3>今日订单</h3>
            <div className="value">{overview.orders.today}</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CarOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <h3>在线骑手</h3>
            <div className="value">{overview.riders.online}</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CheckCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <h3>妥投率</h3>
            <div className="value">{(overview.metrics.successRate * 100).toFixed(1)}%</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <ClockCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <h3>平均配送时长</h3>
            <div className="value">{overview.metrics.avgDeliveryTime}分钟</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <DollarOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <h3>今日营收</h3>
            <div className="value">¥{overview.metrics.todayRevenue}</div>
          </div>
        </Col>
        <Col span={4}>
          <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
            <WarningOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <h3>待处理预警</h3>
            <div className="value">{overview.metrics.pendingAlerts}</div>
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card title="订单热力图" style={{ height: 500 }}>
            <div className="map-container">
              <MapContainer center={[39.9075, 116.3972]} zoom={12} style={{ height: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {heatmapData.map((point, index) => (
                  <React.Fragment key={index}>
                    {point.pickup && (
                    <Circle
                      center={[point.pickup[1], point.pickup[0]]}
                      radius={200}
                      color="#1890ff"
                      fillColor="#1890ff"
                      fillOpacity={0.3}
                    >
                      <Popup>取货点</Popup>
                    </Circle>
                  )}
                    {point.delivery && (
                    <Circle
                      center={[point.delivery[1], point.delivery[0]]}
                      radius={150}
                      color="#52c41a"
                      fillColor="#52c41a"
                      fillOpacity={0.3}
                    >
                      <Popup>送货点</Popup>
                    </Circle>
                  )}
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="实时订单" style={{ height: 500 }}>
            <List
              className="real-time-list"
              dataSource={realtimeOrders}
              renderItem={(item) => (
                <List.Item key={item._id}>
                  <List.Item.Meta
                  title={
                    <div>
                      <span>{item.orderNo}</span>
                      <Tag color={getStatusColor(item.status)} style={{ marginLeft: 8 }}>
                        {getStatusText(item.status)}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                    <div>商户: {item.merchant?.name || '-'}</div>
                    <div>目的地: {item.customer?.address || '-'}</div>
                    <div style={{ color: '#999', fontSize: 12 }}>
                      {dayjs(item.createdAt).format('HH:mm:ss')}
                    </div>
                    </div>
                  }
                />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="订单趋势">
            <ReactECharts option={trendChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="实时预警">
            <List
              className="real-time-list"
              dataSource={alerts}
              renderItem={(item) => (
                <List.Item
                key={item._id}
                className={`alert-${item.level}`}
              >
                <List.Item.Meta
                  title={
                    <div>
                    <Tag color={item.level === 'high' ? 'red' : item.level === 'medium' ? 'orange' : 'blue'}>
                      {{
                        route_deviation: '路线偏离',
                        stop_timeout: '停留超时',
                        speed_abnormal: '速度异常'
                      }[item.type]}
                    </Tag>
                    <span style={{ marginLeft: 8 }}>{item.description}</span>
                    </div>
                  }
                  description={
                    <div>
                      <div>骑手: {item.rider?.name || '-'}</div>
                      <div style={{ color: '#999', fontSize: 12 }}>
                        {dayjs(item.createdAt).format('HH:mm:ss')}
                      </div>
                    </div>
                  }
                />
              </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="骑手排行榜">
            <Table
              columns={performanceColumns}
              dataSource={riderPerformance}
              rowKey="_id"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
