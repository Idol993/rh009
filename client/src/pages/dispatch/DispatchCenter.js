import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Table, Button, Tag, Modal, message, Statistic, List, Empty, Space } from 'antd';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { CarOutlined, ReloadOutlined, PlayCircleOutlined, UserOutlined, EnvironmentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { dispatchAPI, orderAPI, riderAPI } from '../../services/api';
import io from 'socket.io-client';

export default function DispatchCenter() {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [realtimeRiders, setRealtimeRiders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [recommendRiders, setRecommendRiders] = useState([]);
  const [recommendModalVisible, setRecommendModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [batchOrders, setBatchOrders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    loadData();
    initSocket();
    const interval = setInterval(loadData, 10000);
    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const initSocket = () => {
    socketRef.current = io('http://localhost:5000');
    socketRef.current.on('rider:location', (data) => {
      setRealtimeRiders(prev => prev.map(r => 
        r._id === data.riderId ? { ...r, location: data.location } : r
      ));
    });
    socketRef.current.on('order:status', (data) => {
      loadData();
    });
  };

  const loadData = async () => {
    try {
      const [ordersRes, ridersRes] = await Promise.all([
        orderAPI.getOrders({ status: 'pending', limit: 20 }),
        dispatchAPI.getRealtimeRiders()
      ]);
      if (ordersRes.success) setPendingOrders(ordersRes.data);
      if (ridersRes.success) setRealtimeRiders(ridersRes.data);
    } catch (err) {
      message.error('加载数据失败');
    }
  };

  const handleRecommend = async (order) => {
    setSelectedOrder(order);
    setLoading(true);
    try {
      const res = await dispatchAPI.getRecommendRiders(order._id);
      if (res.success) {
        setRecommendRiders(res.data);
        setRecommendModalVisible(true);
      }
    } catch (err) {
      message.error('获取推荐骑手失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (riderId) => {
    try {
      const res = await dispatchAPI.assignOrder({
        orderId: selectedOrder._id,
        riderId
      });
      if (res.success) {
        message.success('分配成功');
        setRecommendModalVisible(false);
        loadData();
      }
    } catch (err) {
      message.error('分配失败');
    }
  };

  const handleAutoDispatch = async () => {
    try {
      const res = await dispatchAPI.autoDispatch();
      if (res.success) {
        message.success(`自动调度完成，已分配 ${res.data.assignedCount} 单`);
        loadData();
      }
    } catch (err) {
      message.error('自动调度失败');
    }
  };

  const handleViewBatch = async (rider) => {
    setSelectedRider(rider);
    try {
      const res = await dispatchAPI.getBatchOrders(rider._id);
      if (res.success) {
        setBatchOrders(res.data.orders || []);
        setBatchModalVisible(true);
      }
    } catch (err) {
      message.error('获取并单信息失败');
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

  const getVehicleTypeText = (type) => {
    return type === 'motorcycle' ? '摩托车' : '厢货';
  };

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 140
    },
    {
      title: '车型',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      width: 80,
      render: (v) => <Tag>{getVehicleTypeText(v)}</Tag>
    },
    {
      title: '取货地址',
      dataIndex: ['merchant', 'address'],
      key: 'pickup',
      width: 200,
      ellipsis: true
    },
    {
      title: '送货地址',
      dataIndex: ['customer', 'address'],
      key: 'delivery',
      width: 200,
      ellipsis: true
    },
    {
      title: '重量',
      dataIndex: ['cargo', 'weight'],
      key: 'weight',
      width: 80,
      render: (v) => `${v}kg`
    },
    {
      title: '运费',
      dataIndex: 'freight',
      key: 'freight',
      width: 80,
      render: (v) => `¥${v}`
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v) => dayjs(v).format('HH:mm:ss')
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" onClick={() => handleRecommend(record)}>
            调度
          </Button>
        </Space>
      )
    }
  ];

  const recommendColumns = [
    {
      title: '骑手',
      dataIndex: ['rider', 'name'],
      key: 'name',
      width: 100
    },
    {
      title: '车型',
      dataIndex: ['rider', 'vehicleType'],
      key: 'vehicleType',
      width: 80,
      render: (v) => getVehicleTypeText(v)
    },
    {
      title: '距离取货点',
      dataIndex: 'distanceToPickup',
      key: 'distance',
      width: 100,
      render: (v) => `${(v / 1000).toFixed(2)}km`
    },
    {
      title: '当前负载',
      dataIndex: ['rider', 'currentOrderCount'],
      key: 'load',
      width: 80,
      render: (v) => `${v}/3`
    },
    {
      title: '顺路度',
      dataIndex: ['components', 'detourScore'],
      key: 'detour',
      width: 80,
      render: (v) => `${(v * 100).toFixed(0)}%`
    },
    {
      title: '综合评分',
      dataIndex: 'total',
      key: 'score',
      width: 80,
      render: (v) => v.toFixed(2)
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => handleAssign(record.rider._id)}>
          分配
        </Button>
      )
    }
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="待调度订单" value={pendingOrders.length} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="在线骑手" value={realtimeRiders.filter(r => r.online).length} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="配送中" value={realtimeRiders.filter(r => r.currentOrderCount > 0).length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleAutoDispatch} block>
              一键自动调度
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadData} block style={{ marginTop: 8 }}>
              刷新数据
            </Button>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={14}>
          <Card title="待调度订单" extra={<span style={{ color: '#999' }}>共 {pendingOrders.length} 单</span>}>
            {pendingOrders.length === 0 ? (
              <Empty description="暂无待调度订单" />
            ) : (
              <Table
                columns={orderColumns}
                dataSource={pendingOrders}
                rowKey="_id"
                size="small"
                pagination={{ pageSize: 8 }}
                scroll={{ y: 400 }}
              />
            )}
          </Card>
        </Col>

        <Col span={10}>
          <Card title="实时骑手位置" style={{ height: '100%' }}>
            <div style={{ height: 500 }}>
              <MapContainer center={[39.9075, 116.3972]} zoom={12} style={{ height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {realtimeRiders.filter(r => r.location).map((rider) => (
                  <Marker
                    key={rider._id}
                    position={[rider.location[1], rider.location[0]]}
                    icon={L.divIcon({
                      html: `<div style="background:${rider.online ? '#52c41a' : '#999'};color:white;padding:4px 8px;border-radius:50%;font-size:12px;">
                        ${rider.currentOrderCount > 0 ? '🛵' : '🏍️'}
                      </div>`,
                      className: ''
                    })}
                  >
                    <Popup>
                      <div>
                        <p><strong>{rider.name}</strong></p>
                        <p>车型: {getVehicleTypeText(rider.vehicleType)}</p>
                        <p>状态: {rider.online ? '在线' : '离线'}</p>
                        <p>当前订单: {rider.currentOrderCount}/3</p>
                        {rider.currentOrderCount > 0 && (
                          <Button size="small" type="primary" onClick={() => handleViewBatch(rider)}>
                            查看并单
                          </Button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="骑手列表">
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 4, lg: 4, xl: 6 }}
              dataSource={realtimeRiders}
              renderItem={(rider) => (
                <List.Item key={rider._id}>
                  <Card
                    size="small"
                    onClick={() => handleViewBatch(rider)}
                    style={{ cursor: 'pointer', borderColor: rider.online ? '#52c41a' : '#d9d9d9' }}
                  >
                    <Card.Meta
                      avatar={<Avatar icon={<UserOutlined />} style={{ background: rider.online ? '#52c41a' : '#999' }} />}
                      title={rider.name}
                      description={
                        <div>
                          <Tag color={rider.online ? 'green' : 'default'}>
                            {rider.online ? '在线' : '离线'}
                          </Tag>
                          <div style={{ marginTop: 4 }}>
                            <CarOutlined /> {getVehicleTypeText(rider.vehicleType)}
                          </div>
                          <div style={{ marginTop: 4, color: '#1890ff' }}>
                            {rider.currentOrderCount}/3 单
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="推荐骑手 - 智能调度算法"
        open={recommendModalVisible}
        width={900}
        onCancel={() => setRecommendModalVisible(false)}
        footer={null}
      >
        {selectedOrder && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <p><strong>订单号:</strong> {selectedOrder.orderNo}</p>
            <p><strong>取货:</strong> {selectedOrder.merchant?.address}</p>
            <p><strong>送货:</strong> {selectedOrder.customer?.address}</p>
            <p><strong>货物:</strong> {selectedOrder.cargo?.weight}kg / {selectedOrder.cargo?.volume}m³</p>
          </div>
        )}
        <Table
          columns={recommendColumns}
          dataSource={recommendRiders}
          rowKey="rider._id"
          size="small"
          loading={loading}
          pagination={false}
        />
      </Modal>

      <Modal
        title={`骑手并单路径 - ${selectedRider?.name}`}
        open={batchModalVisible}
        width={800}
        onCancel={() => setBatchModalVisible(false)}
        footer={null}
      >
        {batchOrders.length > 0 && (
          <>
            <div style={{ height: 300, marginBottom: 16 }}>
              <MapContainer
                center={[batchOrders[0]?.pickupLocation?.[1] || 39.9075, batchOrders[0]?.pickupLocation?.[0] || 116.3972]}
                zoom={13}
                style={{ height: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {batchOrders.map((order, idx) => (
                  <React.Fragment key={order._id}>
                    {order.pickupLocation && (
                      <Marker position={[order.pickupLocation[1], order.pickupLocation[0]]}>
                        <Popup>取货点 #{idx + 1}: {order.merchant?.name}</Popup>
                      </Marker>
                    )}
                    {order.deliveryLocation && (
                      <Marker position={[order.deliveryLocation[1], order.deliveryLocation[0]]}>
                        <Popup>送货点 #{idx + 1}: {order.customer?.name}</Popup>
                      </Marker>
                    )}
                    {order.pickupLocation && order.deliveryLocation && (
                      <Polyline
                        positions={[
                          [order.pickupLocation[1], order.pickupLocation[0]],
                          [order.deliveryLocation[1], order.deliveryLocation[0]]
                        ]}
                        color="#1890ff"
                      />
                    )}
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>
            <List
              dataSource={batchOrders}
              renderItem={(order, idx) => (
                <List.Item key={order._id}>
                  <List.Item.Meta
                    avatar={<Tag color="blue">{idx + 1}</Tag>}
                    title={order.orderNo}
                    description={
                      <div>
                        <p><EnvironmentOutlined /> 取货: {order.merchant?.address}</p>
                        <p><EnvironmentOutlined style={{ color: '#52c41a' }} /> 送货: {order.customer?.address}</p>
                      </div>
                    }
                  />
                  <Tag color={getStatusColor(order.status)}>{getStatusText(order.status)}</Tag>
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>
    </div>
  );
}

const L = window.L;
