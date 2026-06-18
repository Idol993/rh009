import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, InputNumber, message, Card, Statistic, Row, Col, Space, Switch } from 'antd';
import { PlusOutlined, EditOutlined, CarOutlined, HomeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { communityAPI } from '../../services/api';

const { Option } = Select;

export default function ParkingManage() {
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [parkRes, commRes, resRes] = await Promise.all([
        communityAPI.getParkingSpaces(),
        communityAPI.getCommunities(),
        communityAPI.getResidents()
      ]);
      if (parkRes.success) setParkingSpaces(parkRes.data);
      if (commRes.success) setCommunities(commRes.data);
      if (resRes.success) setResidents(resRes.data);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSpace(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (space) => {
    setEditingSpace(space);
    form.setFieldsValue(space);
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      let res;
      if (editingSpace) {
        res = await communityAPI.updateParkingSpace(editingSpace._id, values);
      } else {
        res = await communityAPI.createParkingSpace(values);
      }
      if (res.success) {
        message.success(editingSpace ? '更新成功' : '创建成功');
        setModalVisible(false);
        loadData();
      }
    } catch (err) {
      message.error(editingSpace ? '更新失败' : '创建失败');
    }
  };

  const handleToggleStatus = async (space, status) => {
    try {
      const res = await communityAPI.updateParkingSpace(space._id, { status });
      if (res.success) {
        message.success(status === 'available' ? '已释放' : '已占用');
        loadData();
      }
    } catch (err) {
      message.error('操作失败');
    }
  };

  const getStatusColor = (status) => {
    const colors = { available: 'green', occupied: 'orange', reserved: 'blue', maintenance: 'red' };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = { available: '空闲', occupied: '已占用', reserved: '已预约', maintenance: '维护中' };
    return texts[status] || status;
  };

  const getTypeText = (type) => {
    const texts = { ground: '地面车位', underground: '地下车位', visitor: '访客车位', disabled: '无障碍车位' };
    return texts[type] || type;
  };

  const columns = [
    {
      title: '车位编号',
      dataIndex: 'spaceNo',
      key: 'spaceNo',
      width: 120
    },
    {
      title: '所属社区',
      dataIndex: ['community', 'name'],
      key: 'community',
      width: 150
    },
    {
      title: '区域',
      dataIndex: 'area',
      key: 'area',
      width: 100
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v) => <Tag>{getTypeText(v)}</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v) => <Tag color={getStatusColor(v)}>{getStatusText(v)}</Tag>
    },
    {
      title: '绑定住户',
      dataIndex: ['resident', 'name'],
      key: 'resident',
      width: 100,
      render: (v) => v || '-'
    },
    {
      title: '绑定房屋',
      dataIndex: ['house', 'houseNo'],
      key: 'house',
      width: 100,
      render: (v) => v || '-'
    },
    {
      title: '车牌号',
      dataIndex: 'carPlate',
      key: 'carPlate',
      width: 120,
      render: (v) => v || '-'
    },
    {
      title: '月费',
      dataIndex: 'monthlyFee',
      key: 'monthlyFee',
      width: 100,
      render: (v) => v ? `¥${v}/月` : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.status === 'occupied' && (
            <Button type="link" size="small" onClick={() => handleToggleStatus(record, 'available')}>
              释放
            </Button>
          )}
          {record.status === 'available' && (
            <Button type="link" size="small" onClick={() => handleToggleStatus(record, 'occupied')}>
              占用
            </Button>
          )}
        </Space>
      )
    }
  ];

  const stats = {
    total: parkingSpaces.length,
    available: parkingSpaces.filter(p => p.status === 'available').length,
    occupied: parkingSpaces.filter(p => p.status === 'occupied').length,
    reserved: parkingSpaces.filter(p => p.status === 'reserved').length
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="车位总数" value={stats.total} prefix={<CarOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="空闲车位" value={stats.available} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已占用" value={stats.occupied} valueStyle={{ color: '#fa8c16' }} prefix={<HomeOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="使用率" value={stats.total > 0 ? ((stats.occupied + stats.reserved) / stats.total * 100).toFixed(1) : 0} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Card
        title="停车位管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增车位
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={parkingSpaces}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title={editingSpace ? '编辑车位' : '新增车位'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="spaceNo" label="车位编号" rules={[{ required: true, message: '请输入车位编号' }]}>
                <Input placeholder="请输入车位编号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="community" label="所属社区" rules={[{ required: true, message: '请选择社区' }]}>
                <Select placeholder="请选择社区">
                  {communities.map(c => (
                    <Option key={c._id} value={c._id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="area" label="区域">
                <Input placeholder="如：A区、B1层" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="车位类型" initialValue="ground" rules={[{ required: true, message: '请选择类型' }]}>
                <Select>
                  <Option value="ground">地面车位</Option>
                  <Option value="underground">地下车位</Option>
                  <Option value="visitor">访客车位</Option>
                  <Option value="disabled">无障碍车位</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="resident" label="绑定住户">
                <Select placeholder="请选择住户" allowClear showSearch optionFilterProp="children">
                  {residents.map(r => (
                    <Option key={r._id} value={r._id}>{r.name} - {r.house?.houseNo}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="carPlate" label="绑定车牌号">
                <Input placeholder="请输入车牌号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="状态" initialValue="available" rules={[{ required: true, message: '请选择状态' }]}>
                <Select>
                  <Option value="available">空闲</Option>
                  <Option value="occupied">已占用</Option>
                  <Option value="reserved">已预约</Option>
                  <Option value="maintenance">维护中</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="monthlyFee" label="月费(元)">
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} prefix="¥" />
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
                {editingSpace ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
