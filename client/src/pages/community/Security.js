import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, message, Card, Statistic, Row, Col, Space, Upload } from 'antd';
import { PlusOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CameraOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { communityAPI } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;

export default function SecurityManage() {
  const [events, setEvents] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [handleModalVisible, setHandleModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form] = Form.useForm();
  const [handleForm] = Form.useForm();
  const [levelFilter, setLevelFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    loadData();
  }, [levelFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (levelFilter) params.level = levelFilter;
      if (statusFilter) params.status = statusFilter;
      const [eventsRes, commRes] = await Promise.all([
        communityAPI.getSecurityEvents(params),
        communityAPI.getCommunities()
      ]);
      if (eventsRes.success) setEvents(eventsRes.data);
      if (commRes.success) setCommunities(commRes.data);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingEvent(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleProcess = (event) => {
    setSelectedEvent(event);
    handleForm.resetFields();
    setHandleModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const res = await communityAPI.createSecurityEvent(values);
      if (res.success) {
        message.success('上报成功');
        setModalVisible(false);
        loadData();
      }
    } catch (err) {
      message.error('上报失败');
    }
  };

  const handleProcessConfirm = async (values) => {
    try {
      const res = await communityAPI.handleSecurityEvent(selectedEvent._id, {
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

  const getTypeText = (type) => {
    const texts = {
      intrusion: '非法闯入',
      fight: '打架斗殴',
      theft: '盗窃',
      fire: '火灾',
      gas_leak: '燃气泄漏',
      noise: '噪音扰民',
      parking_violation: '乱停乱放',
      damage: '公共设施损坏',
      other: '其他'
    };
    return texts[type] || type;
  };

  const getLevelColor = (level) => {
    const colors = { high: 'red', medium: 'orange', low: 'blue' };
    return colors[level] || 'default';
  };

  const getLevelText = (level) => {
    const texts = { high: '紧急', medium: '重要', low: '一般' };
    return texts[level] || level;
  };

  const getStatusColor = (status) => {
    const colors = { pending: 'orange', processing: 'blue', resolved: 'green', closed: 'default' };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = { pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' };
    return texts[status] || status;
  };

  const columns = [
    {
      title: '事件编号',
      dataIndex: 'eventNo',
      key: 'eventNo',
      width: 140
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v) => <Tag>{getTypeText(v)}</Tag>
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (v) => <Tag color={getLevelColor(v)}>{getLevelText(v)}</Tag>
    },
    {
      title: '社区',
      dataIndex: ['community', 'name'],
      key: 'community',
      width: 120
    },
    {
      title: '发生地点',
      dataIndex: 'location',
      key: 'location'
    },
    {
      title: '上报人',
      dataIndex: 'reporter',
      key: 'reporter',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v) => <Tag color={getStatusColor(v)}>{getStatusText(v)}</Tag>
    },
    {
      title: '上报时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '处理人',
      dataIndex: ['handler', 'name'],
      key: 'handler',
      width: 100,
      render: (v) => v || '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => {
        if (record.status === 'pending' || record.status === 'processing') {
          return (
            <Button type="primary" size="small" onClick={() => handleProcess(record)}>
              处理
            </Button>
          );
        }
        return null;
      }
    }
  ];

  const stats = {
    total: events.length,
    pending: events.filter(e => e.status === 'pending').length,
    high: events.filter(e => e.level === 'high' && e.status !== 'resolved').length,
    resolved: events.filter(e => e.status === 'resolved').length
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="事件总数" value={stats.total} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待处理" value={stats.pending} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="紧急事件" value={stats.high} valueStyle={{ color: '#f5222d' }} prefix={<ExclamationCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已解决" value={stats.resolved} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        title="安防事件管理"
        extra={
          <Space>
            <Select
              placeholder="级别筛选"
              allowClear
              style={{ width: 100 }}
              value={levelFilter}
              onChange={setLevelFilter}
            >
              <Option value="high">紧急</Option>
              <Option value="medium">重要</Option>
              <Option value="low">一般</Option>
            </Select>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 100 }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="pending">待处理</Option>
              <Option value="processing">处理中</Option>
              <Option value="resolved">已解决</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              上报事件
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={events}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title="上报安防事件"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="事件类型" rules={[{ required: true, message: '请选择事件类型' }]}>
                <Select placeholder="请选择事件类型">
                  <Option value="intrusion">非法闯入</Option>
                  <Option value="fight">打架斗殴</Option>
                  <Option value="theft">盗窃</Option>
                  <Option value="fire">火灾</Option>
                  <Option value="gas_leak">燃气泄漏</Option>
                  <Option value="noise">噪音扰民</Option>
                  <Option value="parking_violation">乱停乱放</Option>
                  <Option value="damage">公共设施损坏</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="level" label="事件级别" initialValue="medium" rules={[{ required: true, message: '请选择事件级别' }]}>
                <Select>
                  <Option value="high">紧急</Option>
                  <Option value="medium">重要</Option>
                  <Option value="low">一般</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="community" label="所属社区" rules={[{ required: true, message: '请选择社区' }]}>
                <Select placeholder="请选择社区">
                  {communities.map(c => (
                    <Option key={c._id} value={c._id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="发生地点" rules={[{ required: true, message: '请输入发生地点' }]}>
                <Input placeholder="请输入具体地点" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="reporter" label="上报人">
                <Input placeholder="请输入上报人姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reporterPhone" label="联系电话">
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="事件描述" rules={[{ required: true, message: '请输入事件描述' }]}>
            <TextArea rows={4} placeholder="请详细描述事件情况" />
          </Form.Item>
          <Form.Item name="photos" label="现场照片">
            <Upload
              listType="picture-card"
              beforeUpload={() => false}
              multiple
            >
              <div>
                <CameraOutlined style={{ fontSize: 24 }} />
                <div style={{ marginTop: 8 }}>上传照片</div>
              </div>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                上报
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="处理安防事件"
        open={handleModalVisible}
        onCancel={() => setHandleModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedEvent && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
            <p><strong>事件类型:</strong> {getTypeText(selectedEvent.type)}</p>
            <p><strong>事件级别:</strong> <Tag color={getLevelColor(selectedEvent.level)}>{getLevelText(selectedEvent.level)}</Tag></p>
            <p><strong>发生地点:</strong> {selectedEvent.location}</p>
            <p><strong>事件描述:</strong> {selectedEvent.description}</p>
          </div>
        )}
        <Form form={handleForm} layout="vertical" onFinish={handleProcessConfirm}>
          <Form.Item name="handleResult" label="处理结果" rules={[{ required: true, message: '请选择处理结果' }]}>
            <Select>
              <Option value="resolved">已解决</Option>
              <Option value="processing">处理中，需持续跟进</Option>
              <Option value="transferred">已转交相关部门</Option>
              <Option value="false_alarm">误报</Option>
            </Select>
          </Form.Item>
          <Form.Item name="handleRemark" label="处理说明" rules={[{ required: true, message: '请输入处理说明' }]}>
            <TextArea rows={4} placeholder="请详细描述处理过程和结果" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setHandleModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                确认处理
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
