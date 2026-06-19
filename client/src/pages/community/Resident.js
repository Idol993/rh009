import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, message, Card, Statistic, Row, Col, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, HomeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { communityAPI } from '../../services/api';

const { Option } = Select;

export default function ResidentManage() {
  const [residents, setResidents] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingResident, setEditingResident] = useState(null);
  const [form] = Form.useForm();
  const [selectedCommunity, setSelectedCommunity] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resRes, commRes] = await Promise.all([
        communityAPI.getResidents(),
        communityAPI.getCommunities()
      ]);
      if (resRes.success) setResidents(resRes.data || []);
      if (commRes.success) setCommunities(commRes.data || []);
    } catch (err) {
      message.error('加载数据失败');
      setResidents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHouses = async (communityId) => {
    try {
      const res = await communityAPI.getHouses({ communityId });
      if (res.success) setHouses(res.data || []);
    } catch (err) {
      message.error('加载房屋列表失败');
      setHouses([]);
    }
  };

  const handleCommunityChange = (value) => {
    setSelectedCommunity(value);
    form.setFieldsValue({ house: undefined });
    loadHouses(value);
  };

  const handleAdd = () => {
    setEditingResident(null);
    form.resetFields();
    setSelectedCommunity(null);
    setHouses([]);
    setModalVisible(true);
  };

  const handleEdit = (resident) => {
    setEditingResident(resident);
    const communityId = resident.community?._id || resident.community;
    form.setFieldsValue({
      name: resident.name,
      phone: resident.phone,
      idCard: resident.idCard,
      community: communityId,
      house: resident.house?._id || resident.house,
      relation: resident.relation,
      status: resident.status,
      gender: resident.gender,
    });
    if (communityId) {
      setSelectedCommunity(communityId);
      loadHouses(communityId);
    }
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await communityAPI.deleteResident(id);
      if (res.success) {
        message.success('删除成功');
        loadData();
      }
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const submitData = {
        name: values.name,
        phone: values.phone,
        idCard: values.idCard,
        community: values.community,
        house: values.house || undefined,
        relation: values.relation,
        status: values.status,
        gender: values.gender || undefined,
      };

      let res;
      if (editingResident) {
        res = await communityAPI.updateResident(editingResident._id, submitData);
      } else {
        res = await communityAPI.createResident(submitData);
      }
      if (res.success) {
        message.success(editingResident ? '更新成功' : '创建成功');
        setModalVisible(false);
        loadData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || (editingResident ? '更新失败' : '创建失败'));
    }
  };

  const getRelationText = (relation) => {
    const texts = { owner: '业主', tenant: '租客', family: '家属' };
    return texts[relation] || relation;
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'green' : 'default';
  };

  const getStatusText = (status) => {
    return status === 'active' ? '正常' : '已迁出';
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130
    },
    {
      title: '身份证号',
      dataIndex: 'idCard',
      key: 'idCard',
      width: 180,
      render: (v) => v || '-'
    },
    {
      title: '所属社区',
      dataIndex: ['community', 'name'],
      key: 'community',
      width: 150,
      render: (v) => v || '-'
    },
    {
      title: '房屋',
      key: 'house',
      width: 120,
      render: (_, record) => {
        const house = record.house;
        if (!house) return '-';
        if (typeof house === 'string') return house;
        const parts = [];
        if (house.buildingNo) parts.push(house.buildingNo);
        if (house.roomNo) parts.push(house.roomNo);
        return parts.join('-') || '-';
      }
    },
    {
      title: '身份',
      dataIndex: 'relation',
      key: 'relation',
      width: 80,
      render: (v) => <Tag>{getRelationText(v)}</Tag>
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
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record._id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  const stats = {
    total: residents.length,
    owner: residents.filter(r => r.relation === 'owner').length,
    tenant: residents.filter(r => r.relation === 'tenant').length,
    active: residents.filter(r => r.status === 'active').length
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="住户总数" value={stats.total} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="业主" value={stats.owner} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="租客" value={stats.tenant} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="正常入住" value={stats.active} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="住户管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增住户
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={residents}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title={editingResident ? '编辑住户' : '新增住户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ relation: 'owner', status: 'active' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="请输入姓名" />
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
              <Form.Item name="community" label="所属社区" rules={[{ required: true, message: '请选择社区' }]}>
                <Select placeholder="请选择社区" onChange={handleCommunityChange}>
                  {communities.map(c => (
                    <Option key={c._id} value={c._id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="house" label="房屋" rules={[{ required: true, message: '请选择房屋' }]}>
                <Select placeholder="请先选择社区" disabled={!selectedCommunity}>
                  {houses.map(h => (
                    <Option key={h._id} value={h._id}>
                      {h.buildingNo ? `${h.buildingNo}-` : ''}{h.roomNo || h.houseNo || ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="relation" label="身份" rules={[{ required: true, message: '请选择身份' }]}>
                <Select>
                  <Option value="owner">业主</Option>
                  <Option value="tenant">租客</Option>
                  <Option value="family">家属</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="性别">
                <Select placeholder="请选择性别" allowClear>
                  <Option value="male">男</Option>
                  <Option value="female">女</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="状态">
            <Select>
              <Option value="active">正常</Option>
              <Option value="inactive">已迁出</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingResident ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
