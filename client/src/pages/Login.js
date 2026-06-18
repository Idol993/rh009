import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await authAPI.login(values);
      if (res.success) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        message.success('登录成功');
        
        const roleRoutes = {
          admin: '/dashboard',
          dispatcher: '/dispatch',
          merchant: '/orders/create',
          rider: '/rider/orders'
        };
        
        navigate(roleRoutes[res.user.role] || '/dashboard');
      } else {
        message.error(res.message || '登录失败');
      }
    } catch (err) {
      message.error(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ marginBottom: 8 }}>同城即时配送调度平台</h1>
          <p style={{ color: '#666' }}>请登录您的账户</p>
        </div>
        
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16, textAlign: 'center', color: '#999', fontSize: 12 }}>
          <p>测试账号：</p>
          <p>admin/123456 (管理员)</p>
          <p>dispatcher/123456 (调度员)</p>
          <p>merchant/123456 (商户)</p>
          <p>rider1/123456 (骑手)</p>
        </div>
      </Card>
    </div>
  );
}
