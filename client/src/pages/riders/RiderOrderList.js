import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Tag, Modal, Upload, message, Card, Statistic, Row, Col, Popconfirm } from 'antd';
import { CameraOutlined, CheckCircleOutlined, ClockCircleOutlined, PlayCircleOutlined, StopOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { riderAPI, orderAPI } from '../../services/api';

export default function RiderOrderList() {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ocrModalVisible, setOcrModalVisible] = useState(false);
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [ocrImage, setOcrImage] = useState(null);

  useEffect(() => {
    loadRiderData();
    loadOrders();
  }, []);

  const loadRiderData = async () => {
    try {
      const [statusRes, walletRes, statsRes] = await Promise.all([
        riderAPI.getStatus(),
        riderAPI.getWallet(),
        riderAPI.getStatistics({ days: 7 })
      ]);
      if (statusRes.success) setStatus(statusRes.data);
      if (walletRes.success) setWallet(walletRes.data);
      if (statsRes.success) setStatistics(statsRes.data);
    } catch (err) {
      message.error('加载骑手数据失败');
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await riderAPI.getOrders();
      if (res.success) {
        setOrders(res.data);
      }
    } catch (err) {
      message.error('加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const newStatus = status?.online ? 'offline' : 'online';
      const res = await riderAPI.updateStatus({ status: newStatus });
      if (res.success) {
        setStatus(res.data);
        message.success(status?.online ? '已下线' : '已上线');
      }
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const res = await riderAPI.acceptOrder(orderId);
      if (res.success) {
        message.success('接单成功');
        loadOrders();
      }
    } catch (err) {
      message.error('接单失败');
    }
  };

  const handlePickupOrder = (order) => {
    setSelectedOrder(order);
    setOcrModalVisible(true);
  };

  const handleOCRUpload = async (file) => {
    setOcrImage(file);
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await orderAPI.uploadOCR(selectedOrder._id, formData);
      if (res.success) {
        message.success('面单识别成功');
        setOcrModalVisible(false);
        
        const pickupRes = await riderAPI.pickupOrder(selectedOrder._id, {
          ocrResult: res.data,
          imageUrl: res.data.imageUrl
        });
        
        if (pickupRes.success) {
          message.success('取货成功');
          loadOrders();
        }
      }
    } catch (err) {
      message.error('识别失败，请重试');
    }
    return false;
  };

  const handleDepartOrder = async (orderId) => {
    try {
      const res = await riderAPI.departOrder(orderId, {});
      if (res.success) {
        message.success('已出发');
        loadOrders();
      }
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleArriveOrder = (order) => {
    setSelectedOrder(order);
    setSignModalVisible(true);
  };

  const handleSignConfirm = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      message.error('请输入6位验证码');
      return;
    }
    
    try {
      const res = await riderAPI.arriveOrder(selectedOrder._id, {
        verifyCode,
        signature: true
      });
      if (res.success) {
        message.success('签收成功');
        setSignModalVisible(false);
        setVerifyCode('');
        loadOrders();
      }
    } catch (err) {
      message.error('签收失败，验证码错误');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      assigned: 'blue',
      picked: 'cyan',
      delivering: 'geekblue',
      arrived: 'purple',
      signed: 'green',
      exception: 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: '待调度',
      assigned: '待接单',
      picked: '已取货',
      delivering: '配送中',
      arrived: '已到达',
      signed: '已签收',
      exception: '异常'
    };
    return texts[status] || status;
  };

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 140
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v) => <Tag color={getStatusColor(v)}>{getStatusText(v)}</Tag>
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
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role !== 'rider') return null;
        
        if (record.status === 'assigned' && record.rider?._id === user._id) {
          return <Button type="primary" size="small" onClick={() => handleAcceptOrder(record._id)}>接单</Button>;
        }
        if (record.status === 'accepted' && record.rider?._id === user._id) {
          return <Button type="primary" size="small" icon={<CameraOutlined />} onClick={() => handlePickupOrder(record)}>拍照取货</Button>;
        }
        if (record.status === 'picked' && record.rider?._id === user._id) {
          return <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => handleDepartOrder(record._id)}>开始配送</Button>;
        }
        if (record.status === 'delivering' && record.rider?._id === user._id) {
          return <Button type="primary" size="small" icon={<StopOutlined />} onClick={() => handleArriveOrder(record)}>到达签收</Button>;
        }
        return null;
      }
    }
  ];

  const walletColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (v) => {
        const types = { commission: '配送提成', settlement: '结算提现', bonus: '奖励' };
        return types[v] || v;
      }
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (v, record) => (
        <span style={{ color: record.type === 'settlement' ? '#f5222d' : '#52c41a' }}>
          {record.type === 'settlement' ? '-' : '+'}¥{v}
        </span>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '订单号',
      dataIndex: ['order', 'orderNo'],
      key: 'orderNo'
    }
  ];

  return (
    <div>
      {status && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="当前状态"
                value={status.online ? '在线' : '离线'}
                valueStyle={{ color: status.online ? '#52c41a' : '#999' }}
                suffix={
                  <Button type={status.online ? 'default' : 'primary'} size="small" onClick={handleToggleStatus} style={{ marginLeft: 16 }}>
                    {status.online ? '下线' : '上线'}
                  </Button>
                }
              />
            </Col>
            {wallet && (
              <>
                <Col span={6}>
                  <Statistic title="账户余额" value={wallet.balance} prefix="¥" />
                </Col>
                <Col span={6}>
                  <Statistic title="今日收入" value={wallet.todayEarnings} prefix="¥" />
                </Col>
                <Col span={6}>
                  <Statistic title="累计收入" value={wallet.totalEarnings} prefix="¥" />
                </Col>
              </>
            )}
          </Row>
        </Card>
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="我的订单" key="orders">
          <Table
            columns={orderColumns}
            dataSource={orders}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="我的钱包" key="wallet">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic title="可提现金额" value={wallet?.withdrawable || 0} prefix="¥" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="待结算金额" value={wallet?.pending || 0} prefix="¥" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="今日订单数" value={statistics?.todayOrders || 0} />
              </Card>
            </Col>
          </Row>
          <Table
            columns={walletColumns}
            dataSource={wallet?.transactions || []}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
          />
        </Tabs.TabPane>
      </Tabs>

      <Modal
        title="拍照取货 - OCR识别面单"
        open={ocrModalVisible}
        onCancel={() => setOcrModalVisible(false)}
        footer={null}
      >
        <Upload.Dragger
          accept="image/*"
          customRequest={({ file }) => handleOCRUpload(file)}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon"><CameraOutlined style={{ fontSize: 48, color: '#1890ff' }} /></p>
          <p className="ant-upload-text">点击或拖拽拍摄面单照片</p>
          <p className="ant-upload-hint">支持 JPG、PNG 格式，系统将自动识别收件人信息</p>
        </Upload.Dragger>
        {ocrImage && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <img src={URL.createObjectURL(ocrImage)} alt="面单" style={{ maxWidth: '100%', maxHeight: 200 }} />
          </div>
        )}
      </Modal>

      <Modal
        title="签收验证"
        open={signModalVisible}
        onOk={handleSignConfirm}
        onCancel={() => setSignModalVisible(false)}
        okText="确认签收"
      >
        <p>请向客户索取6位签收验证码：</p>
        <input
          type="text"
          maxLength={6}
          value={verifyCode}
          onChange={(e) => setVerifyCode(e.target.value)}
          placeholder="请输入6位验证码"
          style={{ width: '100%', padding: 12, fontSize: 18, textAlign: 'center', letterSpacing: 8 }}
        />
        <p style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
          验证码为客户收到的短信验证码，请核对无误后输入
        </p>
      </Modal>
    </div>
  );
}
