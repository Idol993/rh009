import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Tag, DatePicker, Modal, message, Statistic, Tabs, Select, Form, InputNumber } from 'antd';
import { DownloadOutlined, DollarOutlined, CalendarOutlined, CheckCircleOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { financeAPI } from '../../services/api';

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function FinanceCenter() {
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const [transRes, settleRes, statsRes] = await Promise.all([
        financeAPI.getTransactions(params),
        financeAPI.getSettlements(params),
        financeAPI.getStatistics(params)
      ]);
      
      if (transRes.success) setTransactions(transRes.data);
      if (settleRes.success) setSettlements(settleRes.data);
      if (statsRes.success) setStatistics(statsRes.data);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const res = await financeAPI.exportTransactions(params);
      const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `财务流水_${dayjs().format('YYYYMMDD')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (err) {
      message.error('导出失败');
    }
  };

  const handleDailySettlement = async () => {
    try {
      const res = await financeAPI.dailySettlement({
        date: dayjs().format('YYYY-MM-DD')
      });
      if (res.success) {
        message.success(`日结完成，生成 ${res.data.settlementCount} 条结算单，总金额 ¥${res.data.totalAmount}`);
        loadData();
      }
    } catch (err) {
      message.error('日结失败');
    }
  };

  const handlePaySettlement = (settlement) => {
    setSelectedSettlement(settlement);
    form.setFieldsValue({ amount: settlement.amount });
    setPayModalVisible(true);
  };

  const handlePayConfirm = async (values) => {
    try {
      const res = await financeAPI.paySettlement(selectedSettlement._id, values);
      if (res.success) {
        message.success('支付成功');
        setPayModalVisible(false);
        loadData();
      }
    } catch (err) {
      message.error('支付失败');
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      order_income: 'green',
      rider_commission: 'orange',
      settlement: 'blue',
      platform_fee: 'red',
      refund: 'red',
      bonus: 'purple'
    };
    return colors[type] || 'default';
  };

  const getTypeText = (type) => {
    const texts = {
      order_income: '订单收入',
      rider_commission: '骑手提成',
      settlement: '结算支付',
      platform_fee: '平台服务费',
      refund: '退款',
      bonus: '奖励'
    };
    return texts[type] || type;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      paid: 'green',
      failed: 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: '待支付',
      paid: '已支付',
      failed: '支付失败'
    };
    return texts[status] || status;
  };

  const transactionColumns = [
    {
      title: '流水号',
      dataIndex: 'transactionNo',
      key: 'transactionNo',
      width: 160
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v) => <Tag color={getTypeColor(v)}>{getTypeText(v)}</Tag>
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (v, record) => (
        <span style={{ color: ['order_income', 'bonus'].includes(record.type) ? '#52c41a' : '#f5222d' }}>
          {['order_income', 'bonus'].includes(record.type) ? '+' : '-'}¥{v.toFixed(2)}
        </span>
      )
    },
    {
      title: '骑手',
      dataIndex: ['rider', 'name'],
      key: 'rider',
      width: 100
    },
    {
      title: '订单号',
      dataIndex: ['order', 'orderNo'],
      key: 'orderNo',
      width: 140
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    }
  ];

  const settlementColumns = [
    {
      title: '结算单号',
      dataIndex: 'settlementNo',
      key: 'settlementNo',
      width: 160
    },
    {
      title: '结算日期',
      dataIndex: 'settlementDate',
      key: 'settlementDate',
      width: 120,
      render: (v) => dayjs(v).format('YYYY-MM-DD')
    },
    {
      title: '骑手',
      dataIndex: ['rider', 'name'],
      key: 'rider',
      width: 100
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 80
    },
    {
      title: '总里程(km)',
      dataIndex: 'totalDistance',
      key: 'totalDistance',
      width: 100,
      render: (v) => v.toFixed(2)
    },
    {
      title: '总重量(kg)',
      dataIndex: 'totalWeight',
      key: 'totalWeight',
      width: 100,
      render: (v) => v.toFixed(1)
    },
    {
      title: '应结金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (v) => <strong>¥{v.toFixed(2)}</strong>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v) => <Tag color={getStatusColor(v)}>{getStatusText(v)}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Button type="primary" size="small" onClick={() => handlePaySettlement(record)}>
              支付
            </Button>
          );
        }
        return null;
      }
    }
  ];

  const revenueChartOption = statistics ? {
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出', '利润'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: statistics.dailyData?.map(d => d.date.slice(5)) || [] },
    yAxis: { type: 'value', name: '金额(元)' },
    series: [
      { name: '收入', type: 'bar', data: statistics.dailyData?.map(d => d.income) || [], itemStyle: { color: '#52c41a' } },
      { name: '支出', type: 'bar', data: statistics.dailyData?.map(d => d.expense) || [], itemStyle: { color: '#f5222d' } },
      { name: '利润', type: 'line', data: statistics.dailyData?.map(d => d.profit) || [], smooth: true, itemStyle: { color: '#1890ff' } }
    ]
  } : {};

  return (
    <div>
      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="今日收入" value={statistics.todayIncome} prefix="¥" precision={2} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="今日支出" value={statistics.todayExpense} prefix="¥" precision={2} valueStyle={{ color: '#f5222d' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="今日利润" value={statistics.todayProfit} prefix="¥" precision={2} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="待结算金额" value={statistics.pendingSettlement} prefix="¥" precision={2} valueStyle={{ color: '#fa8c16' }} />
            </Card>
          </Col>
        </Row>
      )}

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Button icon={<CalendarOutlined />} onClick={handleDailySettlement} style={{ marginRight: 8 }}>
              执行日结
            </Button>
            <Button type="primary" icon={<FileExcelOutlined />} onClick={handleExport}>
              导出流水
            </Button>
          </Col>
        </Row>
      </Card>

      {statistics && (
        <Card title="收支趋势" style={{ marginBottom: 16 }}>
          <ReactECharts option={revenueChartOption} style={{ height: 300 }} />
        </Card>
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="交易流水" key="transactions">
          <Table
            columns={transactionColumns}
            dataSource={transactions}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1200 }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="结算管理" key="settlements">
          <Table
            columns={settlementColumns}
            dataSource={settlements}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        </Tabs.TabPane>
      </Tabs>

      <Modal
        title="支付结算"
        open={payModalVisible}
        onCancel={() => setPayModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handlePayConfirm}>
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <p><strong>骑手:</strong> {selectedSettlement?.rider?.name}</p>
            <p><strong>结算单号:</strong> {selectedSettlement?.settlementNo}</p>
            <p><strong>订单数:</strong> {selectedSettlement?.orderCount} 单</p>
            <p><strong>应结金额:</strong> <span style={{ color: '#f5222d', fontSize: 18 }}>¥{selectedSettlement?.amount?.toFixed(2)}</span></p>
          </div>
          <Form.Item name="amount" label="支付金额" rules={[{ required: true, message: '请输入支付金额' }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} prefix="¥" />
          </Form.Item>
          <Form.Item name="paymentMethod" label="支付方式" initialValue="bank_transfer">
            <Select>
              <Option value="bank_transfer">银行转账</Option>
              <Option value="alipay">支付宝</Option>
              <Option value="wechat">微信支付</Option>
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              <CheckCircleOutlined /> 确认支付
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
