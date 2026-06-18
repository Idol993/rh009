import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, message, Card, Statistic, Row, Col, Space, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { authAPI } from '../../services/api';

const { Option } = Select;

export default function UserManage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [roleFilter, setRoleFilter] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      const res = await authAPI.getUsers(params);
      if (res.success) setUsers(res.data);
    } catch (err) {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
      password: undefined
    });
    setModalVisible(true);
  };

  const handleDelete = async (userId) => {
    try {
      const res = await authAPI.deleteUser(userId);
      if (res.success) {
        message.success('删除成功');
        loadUsers();
      }
    } catch (err) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      let res;
      if (editingUser) {
        res = await authAPI.updateUser(editingUser._id, values);
      } else {
        res = await authAPI.createUser(values);
      }
      if (res.success) {
        message.success(editingUser ? '更新成功' : '创建成功');
        setModalVisible(false);
        loadUsers();
      }
    } catch (err) {
      message.error(editingUser ? '更新失败' : '创建失败');
    }
  };

  const handleToggleStatus = async (user, enabled) => {
    try {
      const res = await authAPI.updateUser(user._id, { enabled });
      if (res.success) {
        message.success(enabled ? '已启用' : '已禁用');
        loadUsers();
      }
    } catch (err) {
      message.error('操作失败');
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'red',
      dispatcher: 'orange',
      merchant: 'blue',
      rider: 'green'
    };
    return colors[role] || 'default';
  };

  const getRoleText = (role) => {
    const texts = {
      admin: '管理员',
      dispatcher: '调度员',
      merchant: '商户',
      rider: '骑手'
    };
    return texts[role] || role;
  };

  const userColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (v) => <Tag color={getRoleColor(v)}>{getRoleText(v)}</Tag>
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (v, record) => (
        <Switch
          checked={v}
          onChange={(checked) => handleToggleStatus(record, checked)}
        />
      )
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
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.role !== 'admin' && (
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record._id)}>
              删除
            </Button>
          )}
        </Space>
      )
    }
  ];

  const roleStats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    dispatcher: users.filter(u => u.role === 'dispatcher').length,
    merchant: users.filter(u => u.role === 'merchant').length,
    rider: users.filter(u => u.role === 'rider').length
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card>
            <Statistic title="用户总数" value={roleStats.total} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic title="管理员" value={roleStats.admin} valueStyle={{ color: '#f5222d' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic title="调度员" value={roleStats.dispatcher} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic title="商户" value={roleStats.merchant} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic title="骑手" value={roleStats.rider} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="用户管理"
        extra={
          <Space>
            <Select
              placeholder="角色筛选"
              allowClear
              style={{ width: 120 }}
              value={roleFilter}
              onChange={setRoleFilter}
            >
              <Option value="admin">管理员</Option>
              <Option value="dispatcher">调度员</Option>
              <Option value="merchant">商户</Option>
              <Option value="rider">骑手</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增用户
            </Button>
          </Space>
        }
      >
        <Table
          columns={userColumns}
          dataSource={users}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input placeholder="请输入用户名" disabled={!!editingUser} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="邮箱">
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
                <Select placeholder="请选择角色" disabled={!!editingUser}>
                  <Option value="admin">管理员</Option>
                  <Option value="dispatcher">调度员</Option>
                  <Option value="merchant">商户</Option>
                  <Option value="rider">骑手</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="password" label={editingUser ? '新密码(不修改留空)' : '密码'} rules={editingUser ? [] : [{ required: true, message: '请输入密码' }]}>
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="地址">
            <Input placeholder="请输入地址" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
