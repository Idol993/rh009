import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Card, Statistic, Row, Col, DatePicker, Select, Input, Space, message } from 'antd';
import { SearchOutlined, PlusOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { orderAPI, merchantAPI, financeAPI } from '../../services/api';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

export default function MerchantOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter, dateRange, keyword]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      if (keyword) params.keyword = keyword;

      const [ordersRes, statsRes, profileRes] = await Promise.all([
        orderAPI.getOrders(params),
        merchantAPI.getStatistics({ days: 7 }),
        merchantAPI.getProfile()
      ]);

      if (ordersRes.success) setOrders(ordersRes.data);
      if (statsRes.success) setStatistics(statsRes.data);
      if (profileRes.success) setProfile(profileRes.data);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      assigned: 'blue',
      accepted: 'cyan',
      picked: 'geekblue',
      delivering: 'purple',
      arrived: 'magenta',
      signed: 'green',
      exception: 'red',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: '待调度',
      assigned: '已分配',
      accepted: '已接单',
      picked: '已取货',
      delivering: '配送中',
      arrived: '已到达',
      signed: '已签收',
      exception: '异常',
      cancelled: '已取消'
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
      width: 140,
      render: (v, record) => <a onClick={() => navigate(`/orders/${record._id}`)}>{v}</a>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v) => <Tag color={getStatusColor(v)}>{getStatusText(v)}</Tag>
    },
    {
      title: '车型',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      width: 80,
      render: (v) => getVehicleTypeText(v)
    },
    {
      title: '收件人',
      dataIndex: ['customer', 'name'],
      key: 'customer',
      width: 100
    },
    {
      title: '收件电话',
      dataIndex: ['customer', 'phone'],
      key: 'phone',
      width: 120
    },
    {
      title: '送货地址',
      dataIndex: ['customer', 'address'],
      key: 'address',
      ellipsis: true
    },
    {
      title: '货物信息',
      key: 'cargo',
      width: 150,
      render: (_, record) => (
        <div>
          <p>重量: {record.cargo?.weight}kg</p>
          <p>体积: {record.cargo?.volume}m³</p>
        </div>
      )
    },
    {
      title: '运费',
      dataIndex: 'freight',
      key: 'freight',
      width: 80,
      render: (v) => <strong>¥{v?.toFixed(2)}</strong>
    },
    {
      title: '骑手',
      dataIndex: ['rider', 'name'],
      key: 'rider',
      width: 100
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm')
    }
  ];

  return (
    <div>
      {profile && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="商户名称"
                value={profile.companyName || profile.name}
                valueStyle={{ fontSize: 18 }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="账户余额"
                value={profile.balance || 0}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="折扣率"
                value={(profile.discountRate || 1) * 100}
                suffix="%"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="累计订单"
                value={profile.totalOrders || 0}
              />
            </Col>
          </Row>
        </Card>
      )}

      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="今日订单" value={statistics.todayOrders || 0} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="今日运费" value={statistics.todayFreight || 0} prefix="¥" precision={2} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="待收货" value={statistics.pendingDelivery || 0} valueStyle={{ color: '#fa8c16' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="妥投率" value={(statistics.successRate || 0) * 100} suffix="%" precision={1} />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title="订单管理"
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/orders/create')}>
              创建订单
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Search
            placeholder="搜索订单号/收件人/电话"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={setKeyword}
            style={{ width: 300 }}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 150 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="pending">待调度</Option>
            <Option value="assigned">已分配</Option>
            <Option value="picked">已取货</Option>
            <Option value="delivering">配送中</Option>
            <Option value="signed">已签收</Option>
            <Option value="exception">异常</Option>
          </Select>
          <RangePicker value={dateRange} onChange={setDateRange} />
          <Button onClick={loadData} icon={<SearchOutlined />}>查询</Button>
        </Space>

        <Table
          columns={orderColumns}
          dataSource={orders}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  );
}
