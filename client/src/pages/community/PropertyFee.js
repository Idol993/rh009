import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, message, Card, Statistic, Row, Col, Space, DatePicker, InputNumber } from 'antd';
import { PlusOutlined, CheckCircleOutlined, DollarOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { communityAPI } from '../../services/api';

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function PropertyFeeManage() {
  const [fees, setFees] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [selectedFee, setSelectedFee] = useState(null);
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [feesRes, resRes] = await Promise.all([
        communityAPI.getPropertyFees(params),
        communityAPI.getResidents()
      ]);
      if (feesRes.success) setFees(feesRes.data);
      if (resRes.success) setResidents(resRes.data);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingFee(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handlePay = (fee) => {
    setSelectedFee(fee);
    payForm.setFieldsValue({ amount: fee.amount });
    setPayModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const submitData = {
        ...values,
        startDate: values.period[0].format('YYYY-MM-DD'),
        endDate: values.period[1].format('YYYY-MM-DD'),
        dueDate: values.dueDate.format('YYYY-MM-DD')
      };
      delete submitData.period;
      const res = await communityAPI.createPropertyFee(submitData);
      if (res.success) {
        message.success('创建成功');
        setModalVisible(false);
        loadData();
      }
    } catch (err) {
      message.error('创建失败');
    }
  };

  const handlePayConfirm = async (values) => {
    try {
      const res = await communityAPI.payPropertyFee(selectedFee._id, {
        ...values,
        paidAt: new Date()
      });
      if (res.success) {
        message.success('缴费成功');
        setPayModalVisible(false);
        loadData();
      }
    } catch (err) {
      message.error('缴费失败');
    }
  };

  const getTypeText = (type) => {
    const texts = {
      property: '物业费',
      water: '水费',
      electricity: '电费',
      gas: '燃气费',
      parking: '停车费',
      other: '其他'
    };
    return texts[type] || type;
  };

  const getStatusColor = (status) => {
    const colors = { unpaid: 'red', paid: 'green', partial: 'orange', overdue: 'red' };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = { unpaid: '未缴费', paid: '已缴费', partial: '部分缴费', overdue: '已逾期' };
    return texts[status] || status;
  };

  const columns = [
    {
      title: '账单编号',
      dataIndex: 'feeNo',
      key: 'feeNo',
      width: 140
    },
    {
      title: '费用类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v) => <Tag>{getTypeText(v)}</Tag>
    },
    {
      title: '住户',
      dataIndex: ['resident', 'name'],
      key: 'resident',
      width: 100
    },
    {
      title: '房屋',
      dataIndex: ['house', 'houseNo'],
      key: 'house',
      width: 100
    },
    {
      title: '计费周期',
      key: 'period',
      width: 200,
      render: (_, record) => (
        <span>
          {record.startDate ? dayjs(record.startDate).format('YYYY-MM-DD') : ''}
          {' ~ '}
          {record.endDate ? dayjs(record.endDate).format('YYYY-MM-DD') : ''}
        </span>
      )
    },
    {
      title: '应缴金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (v) => <strong>¥{v?.toFixed(2)}</strong>
    },
    {
      title: '已缴金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 100,
      render: (v) => `¥${(v || 0).toFixed(2)}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v) => <Tag color={getStatusColor(v)}>{getStatusText(v)}</Tag>
    },
    {
      title: '缴费截止日',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => {
        if (record.status !== 'paid') {
          return (
            <Button type="primary" size="small" onClick={() => handlePay(record)}>
              缴费
            </Button>
          );
        }
        return null;
      }
    }
  ];

  const stats = {
    total: fees.length,
    unpaid: fees.filter(f => f.status === 'unpaid').length,
    overdue: fees.filter(f => f.status === 'overdue').length,
    totalAmount: fees.reduce((sum, f) => sum + (f.amount || 0), 0),
    paidAmount: fees.reduce((sum, f) => sum + (f.paidAmount || 0), 0)
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="账单总数" value={stats.total} prefix={<DollarOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待缴费" value={stats.unpaid} valueStyle={{ color: '#fa8c16' }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已逾期" value={stats.overdue} valueStyle={{ color: '#f5222d' }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="收缴率" value={stats.totalAmount > 0 ? (stats.paidAmount / stats.totalAmount * 100).toFixed(1) : 0} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Card
        title="物业费管理"
        extra={
          <Space>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 120 }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="unpaid">未缴费</Option>
              <Option value="paid">已缴费</Option>
              <Option value="overdue">已逾期</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              生成账单
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={fees}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title="生成物业账单"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="费用类型" initialValue="property" rules={[{ required: true, message: '请选择费用类型' }]}>
                <Select>
                  <Option value="property">物业费</Option>
                  <Option value="water">水费</Option>
                  <Option value="electricity">电费</Option>
                  <Option value="gas">燃气费</Option>
                  <Option value="parking">停车费</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="resident" label="住户" rules={[{ required: true, message: '请选择住户' }]}>
                <Select placeholder="请选择住户" showSearch optionFilterProp="children">
                  {residents.map(r => (
                    <Option key={r._id} value={r._id}>{r.name} - {r.house?.houseNo}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="period" label="计费周期" rules={[{ required: true, message: '请选择计费周期' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="应缴金额" rules={[{ required: true, message: '请输入金额' }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} prefix="¥" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dueDate" label="缴费截止日" rules={[{ required: true, message: '请选择截止日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                生成
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="物业缴费"
        open={payModalVisible}
        onCancel={() => setPayModalVisible(false)}
        footer={null}
        width={500}
      >
        {selectedFee && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <p><strong>账单编号:</strong> {selectedFee.feeNo}</p>
            <p><strong>费用类型:</strong> {getTypeText(selectedFee.type)}</p>
            <p><strong>住户:</strong> {selectedFee.resident?.name}</p>
            <p><strong>应缴金额:</strong> <span style={{ color: '#f5222d', fontSize: 18 }}>¥{selectedFee.amount?.toFixed(2)}</span></p>
            <p><strong>已缴金额:</strong> ¥{(selectedFee.paidAmount || 0).toFixed(2)}</p>
            <p><strong>待缴金额:</strong> <span style={{ color: '#f5222d', fontSize: 18, fontWeight: 'bold' }}>¥{(selectedFee.amount - (selectedFee.paidAmount || 0)).toFixed(2)}</span></p>
          </div>
        )}
        <Form form={payForm} layout="vertical" onFinish={handlePayConfirm}>
          <Form.Item name="amount" label="缴费金额" rules={[{ required: true, message: '请输入缴费金额' }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} prefix="¥" />
          </Form.Item>
          <Form.Item name="paymentMethod" label="支付方式" initialValue="wechat" rules={[{ required: true, message: '请选择支付方式' }]}>
            <Select>
              <Option value="wechat">微信支付</Option>
              <Option value="alipay">支付宝</Option>
              <Option value="cash">现金</Option>
              <Option value="bank">银行转账</Option>
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setPayModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                <CheckCircleOutlined /> 确认缴费
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
