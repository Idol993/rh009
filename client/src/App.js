import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, message } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  CarOutlined,
  ShopOutlined,
  SafetyOutlined,
  DollarOutlined,
  WarningOutlined,
  HomeOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrderList from './pages/orders/OrderList';
import OrderCreate from './pages/orders/OrderCreate';
import OrderDetail from './pages/orders/OrderDetail';
import RiderOrderList from './pages/riders/RiderOrderList';
import DispatchCenter from './pages/dispatch/DispatchCenter';
import FinanceCenter from './pages/finance/FinanceCenter';
import RiskCenter from './pages/risk/RiskCenter';
import MerchantOrders from './pages/merchants/MerchantOrders';
import UserManage from './pages/admin/UserManage';
import Community from './pages/community/Community';
import CommunityResident from './pages/community/Resident';
import CommunityVisitor from './pages/community/Visitor';
import CommunitySecurity from './pages/community/Security';
import CommunityPropertyFee from './pages/community/PropertyFee';
import CommunityParking from './pages/community/Parking';
import CommunityAccess from './pages/community/AccessRecord';

const { Header, Sider, Content } = Layout;

function AppContent() {
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      setUser(JSON.parse(userStr));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    message.success('退出成功');
    navigate('/login');
  };

  if (!user) {
    return <Login />;
  }

  const getMenuItems = () => {
    const baseItems = [
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: '运营大屏',
        path: '/dashboard'
      }
    ];

    if (user.role === 'merchant') {
      return [
        {
          key: 'orders',
          icon: <ShoppingOutlined />,
          label: '订单管理',
          children: [
            { key: 'order-create', label: '创建订单', path: '/orders/create' },
            { key: 'order-list', label: '订单列表', path: '/orders' }
          ]
        }
      ];
    }

    if (user.role === 'rider') {
      return [
        {
          key: 'rider-orders',
          icon: <CarOutlined />,
          label: '我的订单',
          path: '/rider/orders'
        },
        {
          key: 'rider-wallet',
          icon: <DollarOutlined />,
          label: '我的钱包',
          path: '/rider/wallet'
        }
      ];
    }

    if (user.role === 'dispatcher') {
      return [
        {
          key: 'dispatch',
          icon: <CarOutlined />,
          label: '调度中心',
          path: '/dispatch'
        },
        {
          key: 'orders',
          icon: <ShoppingOutlined />,
          label: '订单管理',
          path: '/orders'
        },
        {
          key: 'risk',
          icon: <WarningOutlined />,
          label: '风控中心',
          path: '/risk'
        }
      ];
    }

    if (user.role === 'admin') {
      return [
        {
          key: 'dashboard',
          icon: <BarChartOutlined />,
          label: '运营大屏',
          path: '/dashboard'
        },
        {
          key: 'orders',
          icon: <ShoppingOutlined />,
          label: '订单管理',
          path: '/orders'
        },
        {
          key: 'dispatch',
          icon: <CarOutlined />,
          label: '调度中心',
          path: '/dispatch'
        },
        {
          key: 'merchants',
          icon: <ShopOutlined />,
          label: '商户管理',
          path: '/merchants'
        },
        {
          key: 'finance',
          icon: <DollarOutlined />,
          label: '财务中心',
          path: '/finance'
        },
        {
          key: 'risk',
          icon: <WarningOutlined />,
          label: '风控中心',
          path: '/risk'
        },
        {
          key: 'community',
          icon: <HomeOutlined />,
          label: '智慧社区',
          children: [
            { key: 'community-list', label: '社区管理', path: '/community' },
            { key: 'community-resident', label: '住户管理', path: '/community/resident' },
            { key: 'community-visitor', label: '访客管理', path: '/community/visitor' },
            { key: 'community-security', label: '安防事件', path: '/community/security' },
            { key: 'community-fee', label: '物业费', path: '/community/fee' },
            { key: 'community-parking', label: '停车位', path: '/community/parking' },
            { key: 'community-access', label: '门禁记录', path: '/community/access' }
          ]
        },
        {
          key: 'users',
          icon: <UserOutlined />,
          label: '用户管理',
          path: '/users'
        }
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const handleMenuClick = ({ key }) => {
    const item = findMenuItem(menuItems, key);
    if (item?.path) {
      navigate(item.path);
    }
  };

  const findMenuItem = (items, key) => {
    for (const item of items) {
      if (item.key === key) return item;
      if (item.children) {
        const found = findMenuItem(item.children, key);
        if (found) return found;
      }
    }
    return null;
  };

  const userMenu = {
    items: [
      {
      key: 'profile', icon: <UserOutlined />, label: user.name },
      {
      key: 'setting', icon: <SettingOutlined />, label: '设置' },
      { type: 'divider' },
      {
      key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout }
    ]
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: collapsed ? 16 : 20, fontWeight: 'bold' }}>
          {collapsed ? '物流' : '同城配送'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>
            同城即时配送调度平台
          </div>
          <Dropdown menu={userMenu}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user.name}</span>
              <span style={{ color: '#999', fontSize: 12 }}>
                {{
                  rider: '骑手',
                  merchant: '商户',
                  dispatcher: '调度员',
                  admin: '管理员'
                }[user.role]}
              </span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: '16px' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/orders/create" element={<OrderCreate />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/rider/orders" element={<RiderOrderList />} />
            <Route path="/dispatch" element={<DispatchCenter />} />
            <Route path="/finance" element={<FinanceCenter />} />
            <Route path="/risk" element={<RiskCenter />} />
            <Route path="/merchants" element={<MerchantOrders />} />
            <Route path="/users" element={<UserManage />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/resident" element={<CommunityResident />} />
            <Route path="/community/visitor" element={<CommunityVisitor />} />
            <Route path="/community/security" element={<CommunitySecurity />} />
            <Route path="/community/fee" element={<CommunityPropertyFee />} />
            <Route path="/community/parking" element={<CommunityParking />} />
            <Route path="/community/access" element={<CommunityAccess />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<AppContent />} />
    </Routes>
  );
}
