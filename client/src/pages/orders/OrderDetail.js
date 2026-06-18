import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Row,
  Col,
  Timeline,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
  Tag,
  Steps,
  Image,
  Radio
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import dayjs from 'dayjs';
import { orderAPI } from '../../services/api';

const { Step } = Steps;
const { TextArea } = Input;

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [signForm] = Form.useForm();
  const [exceptionModalVisible, setExceptionModalVisible] = useState(false);
  const [exceptionForm] = Form.useForm();

  const statusSteps = [
    { status: 'pending', title: '待调度' },
    { status: 'assigned', title: '已分配' },
    { status: 'accepted', title: '已接单' },
    { status: 'picking', title: '取货中' },
    { status: 'picked', title: '已取货' },
    { status: 'delivering', title: '配送中' },
    { status: 'arrived', title: '已到达' },
    { status: 'signed', title: '已签收' }
  ];

  const getCurrentStep = () => {
    if (!order) return 0;
    const idx = statusSteps.findIndex(s => s.status === order.status);
    return idx >= 0 ? idx : 0;
  };

  const getStatusText = (status) => {
    const texts = {
      pending: '待调度',
      assigned: '已分配',
      accepted: '已接单',
      picking: '取货中',
      picked: '已取货',
      delivering: '配送中',
      arrived: '已到达',
      signed: '已签收',
      exception: '异常',
      cancelled: '已取消'
    };
    return texts[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      assigned: 'blue',
      delivering: 'processing',
      signed: 'success',
      exception: 'error'
    };
    return colors[status] || 'default';
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await orderAPI.getOrder(id);
      if (res.success) {
        setOrder(res.data);
      }
    } catch (err) {
      message.error('加载订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    try {
      const values = await signForm.validateFields();
      const res = await orderAPI.updateStatus(id, {
        status: 'signed',
        code: values.code,
        signName: values.signName,
        signMethod: values.signMethod || 'code'
      });
      if (res.success) {
        message.success('签收成功');
        setSignModalVisible(false);
        loadOrder();
      }
    } catch (err) {
      message.error(err.response?.data?.message || '签收失败');
    }
  };

  const handleException = async () => {
    try {
      const values = await exceptionForm.validateFields();
      const res = await orderAPI.reportException(id, {
        type: values.type,
        description: values.description,
        photos: []
      });
      if (res.success) {
        message.success('异常已上报');
        setExceptionModalVisible(false);
        loadOrder();
      }
    } catch (err) {
      message.error('上报失败');
    }
  };

  if (!order) {
    return <Card loading={loading}>加载中...</Card>;
  }

  const pickupPos = order.pickupLocation?.coordinates || [0, 0];
  const dropoffPos = order.customer?.location?.coordinates || [0, 0];
  const trailPositions = order.gpsTrail?.map(p => [p.location[1], p.location[0]]) || [];
  const allPositions = [[pickupPos[1], pickupPos[0]], ...trailPositions, [dropoffPos[1], dropoffPos[0]]];

  return (
    <div>
      <Card
        title={
          <Space>
            <span>订单详情: {order.orderNo}</span>
            <Tag color={getStatusColor(order.status)}>{getStatusText(order.status)}</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button onClick={() => navigate('/orders')}>返回列表</Button>
            {order.status === 'arrived' && (
              <Button type="primary" onClick={() => setSignModalVisible(true)}>
                签收确认
              </Button>
            )}
            {['delivering', 'arrived'].includes(order.status) && (
              <Button danger onClick={() => setExceptionModalVisible(true)}>
                异常上报
              </Button>
            )}
          </Space>
        }
      >
        <Steps current={getCurrentStep()} style={{ marginBottom: 24 }}>
          {statusSteps.map((step, index) => (
            <Step key={index} title={step.title} />
          ))}
        </Steps>

        <Row gutter={24}>
          <Col span={14}>
            <Card title="配送轨迹" size="small" style={{ marginBottom: 16 }}>
              <div className="map-container" style={{ height: 400 }}>
                <MapContainer
                  center={[pickupPos[1], pickupPos[0]]}
                  zoom={13}
                  style={{ height: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[pickupPos[1], pickupPos[0]]}>
                    <Popup>取货点: {order.pickupAddress}</Popup>
                  </Marker>
                  <Marker position={[dropoffPos[1], dropoffPos[0]]}>
                    <Popup>送货点: {order.customer.address}</Popup>
                  </Marker>
                  {trailPositions.length > 0 && (
                    <Polyline positions={allPositions} color="#1890ff" />
                  )}
                  {trailPositions.map((pos, idx) => (
                    <Marker key={idx} position={pos}>
                      <Popup>轨迹点 {idx + 1}</Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </Card>

            <Card title="订单时间线" size="small">
              <Timeline>
                {order.timeline?.map((item, index) => (
                  <Timeline.Item
                    key={index}
                    color={item.status === 'exception' ? 'red' : 'blue'}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>{getStatusText(item.status)}</strong>
                      <span style={{ color: '#999', marginLeft: 8 }}>
                        {dayjs(item.time).format('YYYY-MM-DD HH:mm:ss')}
                      </span>
                    </p>
                    {item.remark && <p style={{ margin: 0, color: '#666' }}>{item.remark}</p>}
                  </Timeline.Item>
                ))}
              </Timeline>
            </Card>
          </Col>

          <Col span={10}>
            <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="订单号">{order.orderNo}</Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="预计送达">
                  {order.expectedDeliveryTime
                    ? dayjs(order.expectedDeliveryTime).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="实际送达">
                  {order.actualDeliveryTime
                    ? dayjs(order.actualDeliveryTime).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="预计距离">{order.estimatedDistance} km</Descriptions.Item>
                <Descriptions.Item label="预计时长">{order.estimatedDuration} 分钟</Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="取货信息" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="商户">{order.merchant?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="取货地址">{order.pickupAddress}</Descriptions.Item>
                {order.pickupPhotos?.length > 0 && (
                  <Descriptions.Item label="取货照片">
                    <Image.PreviewGroup>
                      {order.pickupPhotos.map((photo, idx) => (
                        <Image
                          key={idx}
                          width={60}
                          height={60}
                          src={`data:image/jpeg;base64,${photo}`}
                          style={{ marginRight: 8 }}
                        />
                      ))}
                    </Image.PreviewGroup>
                  </Descriptions.Item>
                )}
                {order.waybillInfo && (
                  <Descriptions.Item label="OCR核验">
                    <Tag color={order.waybillInfo.verified ? 'green' : 'red'}>
                      {order.waybillInfo.verified ? '已核验' : '未核验'}
                    </Tag>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card title="收货信息" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="收货人">{order.customer?.name}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{order.customer?.phone}</Descriptions.Item>
                <Descriptions.Item label="收货地址">{order.customer?.address}</Descriptions.Item>
                {order.signedBy && (
                  <>
                    <Descriptions.Item label="签收人">{order.signedBy.name}</Descriptions.Item>
                    <Descriptions.Item label="签收方式">
                      {order.signedBy.method === 'face' ? '人脸识别' : '验证码'}
                    </Descriptions.Item>
                    <Descriptions.Item label="签收时间">
                      {dayjs(order.signedBy.time).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </Card>

            <Card title="货物信息" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="货物描述">{order.cargo?.description}</Descriptions.Item>
                <Descriptions.Item label="重量">{order.cargo?.weight} kg</Descriptions.Item>
                <Descriptions.Item label="体积">{order.cargo?.volume} m³</Descriptions.Item>
                <Descriptions.Item label="数量">{order.cargo?.quantity} 件</Descriptions.Item>
                <Descriptions.Item label="推荐车型">
                  {order.vehicleType === 'motorcycle' ? '摩托车' : '厢式货车'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="费用信息" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="基础运费">¥{order.freight?.basePrice}</Descriptions.Item>
                <Descriptions.Item label="里程费">¥{order.freight?.distancePrice}</Descriptions.Item>
                <Descriptions.Item label="重量费">¥{order.freight?.weightPrice}</Descriptions.Item>
                <Descriptions.Item label="运费合计">
                  <span style={{ color: '#1890ff', fontSize: 18, fontWeight: 'bold' }}>
                    ¥{order.freight?.total}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="骑手提成">¥{order.freight?.riderCommission}</Descriptions.Item>
              </Descriptions>
            </Card>

            {order.rider && (
              <Card title="骑手信息" size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="姓名">{order.rider?.name}</Descriptions.Item>
                  <Descriptions.Item label="电话">{order.rider?.phone}</Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {order.exception && (
              <Card title="异常信息" size="small" style={{ marginTop: 16, borderColor: '#ff4d4f' }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="异常类型">
                    {{
                      damaged: '破损',
                      lost: '丢失',
                      delayed: '延误',
                      refused: '拒收',
                      other: '其他'
                    }[order.exception.type]}
                  </Descriptions.Item>
                  <Descriptions.Item label="描述">{order.exception.description}</Descriptions.Item>
                  <Descriptions.Item label="上报时间">
                    {dayjs(order.exception.reportedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                  <Descriptions.Item label="处理状态">
                    <Tag color={order.exception.handled ? 'green' : 'orange'}>
                      {order.exception.handled ? '已处理' : '待处理'}
                    </Tag>
                  </Descriptions.Item>
                  {order.exception.claimAmount > 0 && (
                    <Descriptions.Item label="理赔金额">¥{order.exception.claimAmount}</Descriptions.Item>
                  )}
                  {order.exception.photos?.length > 0 && (
                    <Descriptions.Item label="照片">
                      <Image.PreviewGroup>
                        {order.exception.photos.map((photo, idx) => (
                          <Image
                            key={idx}
                            width={60}
                            height={60}
                            src={`data:image/jpeg;base64,${photo}`}
                            style={{ marginRight: 8 }}
                          />
                        ))}
                      </Image.PreviewGroup>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}
          </Col>
        </Row>
      </Card>

      <Modal
        title="签收确认"
        open={signModalVisible}
        onOk={handleSign}
        onCancel={() => {
          setSignModalVisible(false);
          signForm.resetFields();
        }}
        okText="确认签收"
        width={500}
        destroyOnClose
      >
        <Form form={signForm} layout="vertical" initialValues={{ signMethod: 'code' }}>
          <Form.Item name="signMethod" label="签收方式">
            <Radio.Group>
              <Radio value="code">验证码签收</Radio>
              <Radio value="face">人脸识别</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.signMethod !== currentValues.signMethod}
          >
            {({ getFieldValue }) => {
              const method = getFieldValue('signMethod');
              return method === 'code' ? (
                <Form.Item
                  name="code"
                  label="验证码"
                  rules={[{ required: true, message: '请输入验证码' }]}
                >
                  <Input placeholder="请输入6位验证码" maxLength={6} />
                </Form.Item>
              ) : (
                <div style={{ marginBottom: 24, padding: 20, background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
                  <p style={{ margin: 0, color: '#666' }}>请对准摄像头进行人脸识别</p>
                  <p style={{ margin: '8px 0 0 0', color: '#999', fontSize: 12 }}>（模拟功能，点击确认即表示识别成功）</p>
                </div>
              );
            }}
          </Form.Item>
          <Form.Item
            name="signName"
            label="签收人姓名"
            rules={[{ required: true, message: '请输入签收人姓名' }]}
          >
            <Input placeholder="请输入签收人姓名" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="异常上报"
        open={exceptionModalVisible}
        onOk={handleException}
        onCancel={() => setExceptionModalVisible(false)}
      >
        <Form form={exceptionForm} layout="vertical">
          <Form.Item
            name="type"
            label="异常类型"
            rules={[{ required: true, message: '请选择异常类型' }]}
          >
            <Select>
              <Option value="damaged">货物破损</Option>
              <Option value="lost">货物丢失</Option>
              <Option value="delayed">配送延误</Option>
              <Option value="refused">客户拒收</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="异常描述"
            rules={[{ required: true, message: '请描述异常情况' }]}
          >
            <TextArea rows={4} placeholder="请详细描述异常情况" />
          </Form.Item>
          <Form.Item label="上传照片">
            <Upload multiple listType="picture-card">
              <Button>上传照片</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
