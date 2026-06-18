import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Card, Statistic, Row, Col, Space, Select, Input, DatePicker } from 'antd';
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
      if (typeFilter) params.type = typeFilter;
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      if (keyword) params.keyword = keyword;

      const res = await communityAPI.getAccessRecords(params);
      if (res.success) setRecords(res.data);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    return type === 'entry' ? 'green' : 'blue';
  };

  const getTypeText = (type) => {
    return type === 'entry' ? '进入' : '离开';
  };

  const getTypeIcon = (type) => {
    return type === 'entry' ? <LoginOutlined /> : <LogoutOutlined />;
  };

  const getMethodText = (method) => {
    const texts = {
      card: '门禁卡',
      face: '人脸识别',
      qrcode: '二维码',
      password: '密码',
      visitor: '访客登记',
      license_plate: '车牌识别'
    };
    return texts[method] || method;
  };

  const getIdentityText = (identity) => {
    const texts = {
      resident: '住户',
      visitor: '访客',
      staff: '工作人员',
      delivery: '快递外卖',
      other: '其他'
    };
    return texts[identity] || identity;
  };

  const columns = [
    {
      title: '记录编号',
      dataIndex: 'recordNo',
      key: 'recordNo',
      width: 140
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (v) => (
        <Tag icon={getTypeIcon(v)} color={getTypeColor(v)}>
          {getTypeText(v)}
        </Tag>
      )
    },
    {
      title: '人员姓名',
      dataIndex: 'personName',
      key: 'personName',
      width: 100
    },
    {
      title: '身份',
      dataIndex: 'identity',
      key: 'identity',
      width: 100,
      render: (v) => <Tag>{getIdentityText(v)}</Tag>
    },
    {
      title: '门禁点',
      dataIndex: 'gate',
      key: 'gate',
      width: 120
    },
    {
      title: '所属社区',
      dataIndex: ['community', 'name'],
      key: 'community',
      width: 150
    },
    {
      title: '验证方式',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (v) => getMethodText(v)
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
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss')
    }
  ];

  const todayRecords = records.filter(r => 
    dayjs(r.createdAt).isSame(dayjs(), 'day')
  );

  const stats = {
    total: records.length,
    today: todayRecords.length,
    entry: todayRecords.filter(r => r.type === 'entry').length,
    exit: todayRecords.filter(r => r.type === 'exit').length,
    visitor: records.filter(r => r.identity === 'visitor').length
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
            placeholder="搜索姓名/车牌号"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={setKeyword}
            style={{ width: 250 }}
          />
          <Select
            placeholder="类型筛选"
            allowClear
            style={{ width: 120 }}
            value={typeFilter}
            onChange={setTypeFilter}
          >
            <Option value="entry">进入</Option>
            <Option value="exit">离开</Option>
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
