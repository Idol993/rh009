import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, message, Card, Statistic, Row, Col, Space } from 'antd';
import { PlusOutlined, CheckCircleOutlined, UserOutlined, SafetyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { communityAPI } from '../../services/api';

const { Option } = Select;

const VISIT_TYPE_MAP = {
  visit: '探亲访友',
  delivery: '快递外卖',
  service: '家政/维修',
  other: '其他'
};

export default function VisitorManage() {
  const [visitors, setVisitors] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [form] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [visRes, resRes] = await Promise.all([
        communityAPI.getVisitors(params),
        communityAPI.getResidents()
      ]);
      if (visRes.success) setVisitors(visRes.data || []);
      if (resRes.success) setResidents(resRes.data || []);
    } catch (err) {
      message.error('加载数据失败');
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingVisitor(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleApprove = async (id) => {
    try {
      const res = await communityAPI.approveVisitor(id, { action: 'approve' });
      if (res.success) {
        message.success('审核通过');
        loadData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleCheckin = async (id) => {
    try {
      const res = await communityAPI.checkinVisitor(id, {});
      if (res.success) {
        message.success('登记成功，已生成门禁记录');
        loadData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleResidentChange = (residentId) => {
    const selected = residents.find(r => r._id === residentId);
    if (selected) {
      form.setFieldsValue({
        hostName: selected.name,
        hostPhone: selected.phone,
      });
    }
  };

  const handleSubmit = async (values) => {
    try {
      const selected = residents.find(r => r._id === values.residentId);
      if (!selected) {
        message.error('请选择被访住户');
        return;
      }

      const submitData = {
        name: values.name,
        phone: values.phone,
        idCard: values.idCard,
        visitType: values.visitType,
        community: selected.community?._id || selected.community,
        visitingHouse: selected.house?._id || selected.house,
        hostName: selected.name,
        hostPhone: selected.phone,
        carNumber: values.carNumber || undefined,
      };

      const res = await communityAPI.createVisitor(submitData);
      if (res.success) {
        message.success('登记成功');
        setModalVisible(false);
        loadData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || '登记失败');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      approved: 'blue',
      checkedin: 'green',
      checkedout: 'default',
      rejected: 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: '待审核',
      approved: '已通过',
      checkedin: '已进入',
      checkedout: '已离开',
      rejected: '已拒绝'
    };
    return texts[status] || status;
  };

  const columns = [
    {
      title: '访客姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (v) => v || '-'
    },
    {
      title: '被访人',
      dataIndex: 'hostName',
      key: 'hostName',
      width: 100,
      render: (v) => v || '-'
    },
    {
      title: '访问房屋',
      dataIndex: ['visitingHouse', 'roomNo'],
      key: 'visitingHouse',
      width: 120,
      render: (v) => v || '-'
    },
    {
      title: '所属社区',
      dataIndex: ['community', 'name'],
      key: 'community',
      width: 120,
      render: (v) => v || '-'
    },
    {
      title: '访问事由',
      dataIndex: 'visitType',
      key: 'visitType',
      width: 100,
      render: (v) => VISIT_TYPE_MAP[v] || v || '-'
    },
    {
      title: '车牌号',
      dataIndex: 'carNumber',
      key: 'carNumber',
      width: 110,
      render: (v) => v || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v) => <Tag color={getStatusColor(v)}>{getStatusText(v)}</Tag>
    },
    {
      title: '登记时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleApprove(record._id)}>
              审核
            </Button>
          )}
          {record.status === 'approved' && (
            <Button type="primary" size="small" onClick={() => handleCheckin(record._id)}>
              登记进入
            </Button>
          )}
        </Space>
      )
    }
  ];

  const stats = {
    total: visitors.length,
    pending: visitors.filter(v => v.status === 'pending').length,
    approved: visitors.filter(v => v.status === 'approved').length,
    inside: visitors.filter(v => v.status === 'checkedin').length
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="访客总数" value={stats.total} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待审核" value={stats.pending} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已通过" value={stats.approved} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="当前在小区" value={stats.inside} valueStyle={{ color: '#52c41a' }} prefix={<SafetyOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        title="访客管理"
        extra={
          <Space>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 120 }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="pending">待审核</Option>
              <Option value="approved">已通过</Option>
              <Option value="checkedin">已进入</Option>
              <Option value="checkedout">已离开</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              访客登记
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={visitors}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1300 }}
        />
      </Card>

      <Modal
        title="访客登记"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="访客姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="请输入访客姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="idCard" label="身份证号">
            <Input placeholder="请输入身份证号" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="residentId" label="被访住户" rules={[{ required: true, message: '请选择被访住户' }]}>
                <Select
                  placeholder="请选择被访住户"
                  showSearch
                  optionFilterProp="children"
                  onChange={handleResidentChange}
                >
                  {residents.map(r => (
                    <Option key={r._id} value={r._id}>
                      {r.name} - {r.community?.name || ''} - {r.house?.roomNo || r.house?.houseNo || ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="visitType" label="访问事由" initialValue="visit" rules={[{ required: true, message: '请选择访问事由' }]}>
                <Select>
                  <Option value="visit">探亲访友</Option>
                  <Option value="delivery">快递外卖</Option>
                  <Option value="service">家政/维修</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hostName" label="被访人姓名">
                <Input placeholder="选择住户后自动带出" disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="carNumber" label="车牌号">
                <Input placeholder="如有车辆请填写车牌号" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                登记
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
