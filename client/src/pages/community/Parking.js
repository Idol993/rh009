import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, InputNumber, message, Card, Statistic, Row, Col, Space } from 'antd';
import { PlusOutlined, EditOutlined, CarOutlined, HomeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { communityAPI } from '../../services/api';

const { Option } = Select;
const { TextArea } = Input;

const SPACE_TYPE_MAP = {
  temporary: '临时车位',
  fixed: '固定车位',
  rented: '租赁车位'
};

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
      if (parkRes.success) setParkingSpaces(parkRes.data || []);
      if (commRes.success) setCommunities(commRes.data || []);
      if (resRes.success) setResidents(resRes.data || []);
    } catch (err) {
      message.error('加载数据失败');
      setParkingSpaces([]);
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
    form.setFieldsValue({
      spaceNo: space.spaceNo,
      community: space.community?._id || space.community,
      location: space.location,
      type: space.type,
      owner: space.owner?._id || space.owner,
      carNumber: space.carNumber,
      status: space.status,
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const submitData = {
        spaceNo: values.spaceNo,
        community: values.community,
        location: values.location || undefined,
        type: values.type,
        owner: values.owner || undefined,
        carNumber: values.carNumber || undefined,
        status: values.status,
      };

      let res;
      if (editingSpace) {
        res = await communityAPI.updateParkingSpace(editingSpace._id, submitData);
      } else {
        res = await communityAPI.createParkingSpace(submitData);
      }
      if (res.success) {
        message.success(editingSpace ? '更新成功' : '创建成功');
        setModalVisible(false);
        loadData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || (editingSpace ? '更新失败' : '创建失败'));
    }
  };

  const handleToggleStatus = async (space, newStatus) => {
    try {
      const res = await communityAPI.updateParkingSpace(space._id, { status: newStatus });
      if (res.success) {
        message.success(newStatus === 'available' ? '已释放' : '已占用');
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
      width: 150,
      render: (v) => v || '-'
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      width: 120,
      render: (v) => v || '-'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (v) => <Tag>{SPACE_TYPE_MAP[v] || v}</Tag>
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
      dataIndex: ['owner', 'name'],
      key: 'owner',
      width: 100,
      render: (v) => v || '-'
    },
    {
      title: '车牌号',
      dataIndex: 'carNumber',
      key: 'carNumber',
      width: 120,
      render: (v) => v || '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
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
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title={editingSpace ? '编辑车位' : '新增车位'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ type: 'temporary', status: 'available' }}>
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
              <Form.Item name="type" label="车位类型" rules={[{ required: true, message: '请选择类型' }]}>
                <Select>
                  <Option value="temporary">临时车位</Option>
                  <Option value="fixed">固定车位</Option>
                  <Option value="rented">租赁车位</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="位置描述">
                <Input placeholder="如：A区、B1层" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="owner" label="绑定住户">
                <Select placeholder="请选择住户" allowClear showSearch optionFilterProp="children">
                  {residents.map(r => (
                    <Option key={r._id} value={r._id}>{r.name} - {r.house?.roomNo || r.house?.houseNo || ''}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="carNumber" label="车牌号">
                <Input placeholder="请输入车牌号" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select>
              <Option value="available">空闲</Option>
              <Option value="occupied">已占用</Option>
              <Option value="reserved">已预约</Option>
              <Option value="maintenance">维护中</Option>
            </Select>
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
