const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const riderRoutes = require('./routes/riders');
const merchantRoutes = require('./routes/merchants');
const dispatchRoutes = require('./routes/dispatch');
const financeRoutes = require('./routes/finance');
const riskRoutes = require('./routes/risk');
const communityRoutes = require('./routes/community');
const dashboardRoutes = require('./routes/dashboard');

const { setupSocket } = require('./socket');
const { seedDatabase } = require('./seed');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB Connected');
  seedDatabase();
})
.catch(err => console.log(err));

setupSocket(io);

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '物流配送平台服务运行正常' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
