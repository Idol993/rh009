import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, message, Card, Statistic, Row, Col, Space, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { communityAPI } from '../../services/api';

const { TextArea } = Input;

export default function CommunityManage() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState(null);
  const [form] = Form.useForm();
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [commRes, statsRes] = await Promise.all([
        communityAPI.getCommunities(),
        communityAPI.getStatistics()
      ]);
      if (commRes.success) setCommunities(commRes.data);
      if (statsRes.success) setStatistics(statsRes.data);
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCommunity(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (community) => {
    setEditingCommunity(community);
    form.setFieldsValue(community);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await communityAPI.deleteCommunity(id);
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
      let res;
      if (editingCommunity) {
        res = await communityAPI.updateCommunity(editingCommunity._id, values);
      } else {
        res = await communityAPI.createCommunity(values);
      }
      if (res.success) {
        message.success(editingCommunity ? '更新成功' : '创建成功');
        setModalVisible(false);
        loadData();
      }
    } catch (err) {
      message.error(editingCommunity ? '更新失败' : '创建失败');
    }
  };

  const columns = [
    {
      title: '社区名称',
      dataIndex: 'name',
      key: 'name',
      width: 150
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address'
    },
    {
      title: '楼栋数',
      dataIndex: 'buildingCount',
      key: 'buildingCount',
      width: 80
    },
    {
      title: '房屋数',
      dataIndex: 'houseCount',
      key: 'houseCount',
      width: 80
    },
    {
      title: '住户数',
      dataIndex: 'residentCount',
      key: 'residentCount',
      width: 80
    },
    {
      title: '物业电话',
      dataIndex: 'propertyPhone',
      key: 'propertyPhone',
      width: 130
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm')
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

  return (
    <div>
      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="社区总数" value={statistics.totalCommunities || 0} prefix={<HomeOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="楼栋总数" value={statistics.totalBuildings || 0} prefix={<ShopOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="房屋总数" value={statistics.totalHouses || 0} prefix={<HomeOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="住户总数" value={statistics.totalResidents || 0} prefix={<TeamOutlined />} />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title="社区管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增社区
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={communities}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingCommunity ? '编辑社区' : '新增社区'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="社区名称" rules={[{ required: true, message: '请输入社区名称' }]}>
            <Input placeholder="请输入社区名称" />
          </Form.Item>
          <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
            <Input placeholder="请输入详细地址" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="buildingCount" label="楼栋数" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="houseCount" label="房屋数" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="propertyPhone" label="物业电话">
                <Input placeholder="请输入物业电话" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="manager" label="负责人">
                <Input placeholder="请输入负责人姓名" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingCommunity ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
