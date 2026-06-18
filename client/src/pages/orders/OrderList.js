import React, { useState, useEffect } from 'react';
import { Table, Card, Select, DatePicker, Button, Space, Tag, Input, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { orderAPI } from '../../services/api';

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({});
  const navigate = useNavigate();

  const statusOptions = [
    { value: 'pending', label: '待调度', color: 'orange' },
    { value: 'assigned', label: '已分配', color: 'blue' },
    { value: 'accepted', label: '已接单', color: 'cyan' },
    { value: 'picking', label: '取货中', color: 'geekblue' },
    { value: 'picked', label: '已取货', color: 'purple' },
    { value: 'delivering', label: '配送中', color: 'processing' },
    { value: 'arrived', label: '已到达', color: 'gold' },
    { value: 'signed', label: '已签收', color: 'success' },
    { value: 'exception', label: '异常', color: 'error' },
    { value: 'cancelled', label: '已取消', color: 'default' }
  ];

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180,
      render: (text, record) => (
        <a onClick={() => navigate(`/orders/${record._id}`)}>{text}</a>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const option = statusOptions.find(o => o.value === status);
        return <Tag color={option?.color}>{option?.label || status}</Tag>;
      }
    },
    {
      title: '商户',
      dataIndex: 'merchant',
      key: 'merchant',
      width: 150,
      render: (m) => m?.name || '-'
    },
    {
      title: '收货人',
      dataIndex: 'customer',
      key: 'customer',
      width: 120,
      render: (c) => c?.name || '-'
    },
    {
      title: '收货地址',
      dataIndex: ['customer', 'address'],
      key: 'address',
      ellipsis: true
    },
    {
      title: '货物',
      dataIndex: 'cargo',
      key: 'cargo',
      width: 180,
      render: (c) => `${c?.description || '-'} (${c?.weight}kg/${c?.volume}m³)`
    },
    {
      title: '车型',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      width: 100,
      render: (v) => v === 'motorcycle' ? '摩托车' : '厢货'
    },
    {
      title: '运费',
      dataIndex: ['freight', 'total'],
      key: 'freight',
      width: 100,
      render: (v) => `¥${v}`
    },
    {
      title: '骑手',
      dataIndex: 'rider',
      key: 'rider',
      width: 100,
      render: (r) => r?.name || '-'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (t) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    }
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      };
      
      const res = await orderAPI.getOrders(params);
      if (res.success) {
        setOrders(res.data);
        setPagination(prev => ({ ...prev, total: res.pagination.total }));
      }
    } catch (err) {
      message.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize, filters]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pag) => {
    setPagination(prev => ({ ...prev, current: pag.current, pageSize: pag.pageSize }));
  };

  return (
    <Card title="订单管理">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索订单号"
          prefix={<SearchOutlined />}
          style={{ width: 200 }}
          onPressEnter={(e) => {
            setFilters(prev => ({ ...prev, keyword: e.target.value }));
            handleSearch();
          }}
        />
        <Select
          placeholder="订单状态"
          style={{ width: 150 }}
          allowClear
          onChange={(value) => {
            setFilters(prev => ({ ...prev, status: value }));
            handleSearch();
          }}
        >
          {statusOptions.map(option => (
            <Option key={option.value} value={option.value}>{option.label}</Option>
          ))}
        </Select>
        <RangePicker
          onChange={(dates) => {
            if (dates) {
              setFilters(prev => ({
                ...prev,
                startDate: dates[0].format('YYYY-MM-DD'),
                endDate: dates[1].format('YYYY-MM-DD')
              }));
            } else {
              setFilters(prev => {
                const { startDate, endDate, ...rest } = prev;
                return rest;
              });
            }
            handleSearch();
          }}
        />
        <Button type="primary" onClick={handleSearch}>搜索</Button>
        <Button onClick={() => {
          setFilters({});
          setPagination(prev => ({ ...prev, current: 1 }));
        }}>重置</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="_id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`
        }}
        onChange={handleTableChange}
        scroll={{ x: 1400 }}
      />
    </Card>
  );
}
