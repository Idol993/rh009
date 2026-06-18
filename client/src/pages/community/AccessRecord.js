import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Card, Statistic, Row, Col, Space, Select, Input, DatePicker, message } from 'antd';
import { SearchOutlined, LoginOutlined, LogoutOutlined, UserOutlined, CarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { communityAPI } from '../../services/api';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;

export default function AccessRecordManage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    loadData();
  }, [typeFilter, dateRange, keyword]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.accessType = typeFilter;
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      if (keyword) params.keyword = keyword;

      const res = await communityAPI.getAccessRecords(params);
      if (res.success) {
        setRecords(res.data || []);
      } else {
        setRecords([]);
        message.error(res.message || '加载数据失败');
      }
    } catch (err) {
      setRecords([]);
      message.error('加载数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (accessType) => {
    return accessType === 'in' ? 'green' : 'blue';
  };

  const getTypeText = (accessType) => {
    return accessType === 'in' ? '进入' : '离开';
  };

  const getTypeIcon = (accessType) => {
    return accessType === 'in' ? <LoginOutlined /> : <LogoutOutlined />;
  };

  const getMethodText = (method, accessMethod) => {
    const m = method || accessMethod;
    const texts = {
      card: '门禁卡',
      face: '人脸识别',
      qr: '二维码',
      password: '密码',
      visitor: '访客登记',
      license_plate: '车牌识别',
      other: '其他'
    };
    return texts[m] || m || '-';
  };

  const getIdentityText = (identity, type) => {
    const i = identity || type;
    const texts = {
      resident: '住户',
      visitor: '访客',
      staff: '工作人员',
      delivery: '快递外卖',
      other: '其他'
    };
    return texts[i] || i || '-';
  };

  const getPersonName = (record) => {
    return record.personName || record.name || (record.resident?.name) || (record.visitor?.name) || '-';
  };

  const columns = [
    {
      title: '记录编号',
      dataIndex: 'recordNo',
      key: 'recordNo',
      width: 140,
      render: (v) => v || '-'
    },
    {
      title: '类型',
      dataIndex: 'accessType',
      key: 'accessType',
      width: 80,
      render: (v, record) => (
        <Tag icon={getTypeIcon(v)} color={getTypeColor(v)}>
          {getTypeText(v)}
        </Tag>
      )
    },
    {
      title: '人员姓名',
      dataIndex: 'personName',
      key: 'personName',
      width: 100,
      render: (_, record) => getPersonName(record)
    },
    {
      title: '身份',
      dataIndex: 'identity',
      key: 'identity',
      width: 100,
      render: (v, record) => <Tag>{getIdentityText(v, record.type)}</Tag>
    },
    {
      title: '门禁点',
      dataIndex: 'gate',
      key: 'gate',
      width: 120,
      render: (v) => v || '-'
    },
    {
      title: '所属社区',
      dataIndex: ['community', 'name'],
      key: 'community',
      width: 150,
      render: (v) => v || '-'
    },
    {
      title: '验证方式',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (v, record) => getMethodText(v, record.accessMethod)
    },
    {
      title: '车牌号',
      dataIndex: 'carPlate',
      key: 'carPlate',
      width: 120,
      render: (v) => v || '-'
    },
    {
      title: '体温(℃)',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 100,
      render: (v) => v ? `${v}℃` : '-'
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'
    }
  ];

  const todayRecords = records.filter(r =>
    dayjs(r.createdAt).isSame(dayjs(), 'day')
  );

  const stats = {
    total: records.length,
    today: todayRecords.length,
    entry: todayRecords.filter(r => r.accessType === 'in').length,
    exit: todayRecords.filter(r => r.accessType === 'out').length,
    visitor: records.filter(r => r.identity === 'visitor' || r.type === 'visitor').length
  };

  const handleSearch = (value) => {
    setKeyword(value);
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总记录数" value={stats.total} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="今日通行" value={stats.today} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="今日进入" value={stats.entry} valueStyle={{ color: '#52c41a' }} prefix={<LoginOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="今日离开" value={stats.exit} valueStyle={{ color: '#fa8c16' }} prefix={<LogoutOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card title="门禁记录">
        <Space style={{ marginBottom: 16 }} wrap>
          <Search
            placeholder="搜索姓名/车牌号/编号"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={handleSearch}
            style={{ width: 250 }}
          />
          <Select
            placeholder="通行类型"
            allowClear
            style={{ width: 120 }}
            value={typeFilter}
            onChange={setTypeFilter}
          >
            <Option value="in">进入</Option>
            <Option value="out">离开</Option>
          </Select>
          <RangePicker value={dateRange} onChange={setDateRange} />
          <Button onClick={loadData} icon={<SearchOutlined />}>查询</Button>
        </Space>

        <Table
          columns={columns}
          dataSource={records}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  );
}
