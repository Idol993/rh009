import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Row, Col, Steps, message, Space, Descriptions } from 'antd';
import { CarOutlined, DollarOutlined, CalculatorOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { orderAPI, merchantAPI } from '../../services/api';

const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;

export default function OrderCreate() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);

  const cargoTypes = [
    { value: 'normal', label: '普通货物' },
    { value: 'fragile', label: '易碎品' },
    { value: 'fresh', label: '生鲜' },
    { value: 'dangerous', label: '危险品' }
  ];

  const handleEstimate = async () => {
    try {
      const values = await form.validateFields(['pickupLocation', 'customer.location', 'cargo']);
      
      const res = await orderAPI.estimate({
        pickupLocation: values.pickupLocation.split(',').map(Number),
        customerLocation: values.customer.location.split(',').map(Number),
        cargo: values.cargo
      });

      if (res.success) {
        setEstimate(res.data);
        message.success('预估成功');
      }
    } catch (err) {
      message.error(err.response?.data?.message || '预估失败');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      
      const orderData = {
        customer: {
          ...values.customer,
          location: values.customer.location.split(',').map(Number)
        },
        pickupAddress: values.pickupAddress,
        pickupLocation: values.pickupLocation.split(',').map(Number),
        cargo: values.cargo,
        remark: values.remark
      };

      const res = await orderAPI.createOrder(orderData);
      if (res.success) {
        message.success('订单创建成功');
        navigate(`/orders/${res.data._id}`);
      }
    } catch (err) {
      message.error(err.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (current === 0 && !estimate) {
      message.warning('请先进行运费预估');
      return;
    }
    setCurrent(current + 1);
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  return (
    <Card title="创建订单">
      <Steps current={current} style={{ marginBottom: 32 }}>
        <Step title="填写订单信息" />
        <Step title="确认运费" />
        <Step title="完成下单" />
      </Steps>

      <Form form={form} layout="vertical">
        {current === 0 && (
          <Row gutter={24}>
            <Col span={12}>
              <Card title="取货信息">
                <Form.Item
                  name="pickupAddress"
                  label="取货地址"
                  rules={[{ required: true, message: '请输入取货地址' }]}
                >
                  <Input placeholder="请输入详细取货地址" />
                </Form.Item>
                <Form.Item
                  name="pickupLocation"
                  label="取货坐标 (经度,纬度)"
                  rules={[{ required: true, message: '请输入坐标' }]}
                  extra="示例: 116.4551,39.9049"
                >
                  <Input placeholder="经度,纬度" />
                </Form.Item>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="收货信息">
                <Form.Item
                  name={['customer', 'name']}
                  label="收货人姓名"
                  rules={[{ required: true, message: '请输入收货人姓名' }]}
                >
                  <Input placeholder="请输入收货人姓名" />
                </Form.Item>
                <Form.Item
                  name={['customer', 'phone']}
                  label="收货人电话"
                  rules={[{ required: true, message: '请输入收货人电话' }]}
                >
                  <Input placeholder="请输入收货人电话" />
                </Form.Item>
                <Form.Item
                  name={['customer', 'address']}
                  label="收货地址"
                  rules={[{ required: true, message: '请输入收货地址' }]}
                >
                  <Input placeholder="请输入详细收货地址" />
                </Form.Item>
                <Form.Item
                  name={['customer', 'location']}
                  label="收货坐标 (经度,纬度)"
                  rules={[{ required: true, message: '请输入坐标' }]}
                >
                  <Input placeholder="经度,纬度" />
                </Form.Item>
              </Card>
            </Col>
            <Col span={24} style={{ marginTop: 16 }}>
              <Card title="货物信息">
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item
                      name={['cargo', 'description']}
                      label="货物描述"
                      rules={[{ required: true, message: '请输入货物描述' }]}
                    >
                      <Input placeholder="如: 餐饮外卖" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      name={['cargo', 'weight']}
                      label="重量 (kg)"
                      rules={[{ required: true, message: '请输入重量' }]}
                    >
                      <InputNumber
                        min={0.1}
                        step={0.1}
                        style={{ width: '100%' }}
                        placeholder="请输入重量"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      name={['cargo', 'volume']}
                      label="体积 (m³)"
                      rules={[{ required: true, message: '请输入体积' }]}
                    >
                      <InputNumber
                        min={0.01}
                        step={0.01}
                        style={{ width: '100%' }}
                        placeholder="请输入体积"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      name={['cargo', 'type']}
                      label="货物类型"
                      rules={[{ required: true, message: '请选择货物类型' }]}
                    >
                      <Select placeholder="请选择货物类型">
                        {cargoTypes.map(type => (
                          <Option key={type.value} value={type.value}>{type.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      name={['cargo', 'quantity']}
                      label="数量"
                      initialValue={1}
                    >
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      name={['cargo', 'declaredValue']}
                      label="声明价值 (元)"
                    >
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="可选" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="remark" label="备注">
                      <TextArea rows={3} placeholder="其他备注信息" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        )}

        {current === 1 && estimate && (
          <Row justify="center">
            <Col span={16}>
              <Card title="费用明细" style={{ textAlign: 'center' }}>
                <Descriptions column={2} bordered size="large">
                  <Descriptions.Item label="预估距离">{estimate.distance} km</Descriptions.Item>
                  <Descriptions.Item label="推荐车型">
                    <Space>
                      <CarOutlined />
                      {estimate.vehicleTypeName}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="预计时长">{estimate.duration} 分钟</Descriptions.Item>
                  <Descriptions.Item label="基础运费">¥{estimate.freight.basePrice}</Descriptions.Item>
                  <Descriptions.Item label="里程费">¥{estimate.freight.distancePrice}</Descriptions.Item>
                  <Descriptions.Item label="重量费">¥{estimate.freight.weightPrice}</Descriptions.Item>
                  <Descriptions.Item label="运费合计" span={2}>
                    <span style={{ fontSize: 24, color: '#1890ff', fontWeight: 'bold' }}>
                      <DollarOutlined /> {estimate.freight.total}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="骑手预计提成" span={2}>
                    ¥{estimate.freight.riderCommission}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        )}

        {current === 2 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }}>
              <CalculatorOutlined />
            </div>
            <h2>订单信息已确认</h2>
            <p style={{ color: '#666' }}>点击提交按钮完成下单，系统将自动为您调度骑手</p>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          {current > 0 && (
            <Button style={{ marginRight: 8 }} onClick={prev}>
              上一步
            </Button>
          )}
          {current === 0 && (
            <Space>
              <Button type="primary" onClick={handleEstimate}>
                预估运费
              </Button>
              <Button type="primary" disabled={!estimate} onClick={next}>
                下一步
              </Button>
            </Space>
          )}
          {current === 1 && (
            <Button type="primary" onClick={next}>
              确认并继续
            </Button>
          )}
          {current === 2 && (
            <Button type="primary" onClick={handleSubmit} loading={loading}>
              提交订单
            </Button>
          )}
        </div>
      </Form>
    </Card>
  );
}
