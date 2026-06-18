let ioInstance = null;
const connectedRiders = new Map();
const connectedUsers = new Map();

function setupSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('rider:connect', (riderId) => {
      connectedRiders.set(riderId, socket.id);
      console.log('Rider connected:', riderId);
      io.emit('rider:online', { riderId, online: true });
    });

    socket.on('rider:location', (data) => {
      io.emit('rider:location:update', data);
    });

    socket.on('user:connect', (userId) => {
      connectedUsers.set(userId, socket.id);
      console.log('User connected:', userId);
    });

    socket.on('order:track', (orderId) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('disconnect', () => {
      for (const [riderId, socketId] of connectedRiders) {
        if (socketId === socket.id) {
          connectedRiders.delete(riderId);
          io.emit('rider:online', { riderId, online: false });
          break;
        }
      }
      for (const [userId, socketId] of connectedUsers) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
      console.log('Client disconnected:', socket.id);
    });
  });
}

function sendToRider(riderId, event, data) {
  const socketId = connectedRiders.get(riderId);
  if (socketId && ioInstance) {
    ioInstance.to(socketId).emit(event, data);
  }
}

function sendToUser(userId, event, data) {
  const socketId = connectedUsers.get(userId);
  if (socketId && ioInstance) {
    ioInstance.to(socketId).emit(event, data);
  }
}

function sendToOrderChannel(orderId, event, data) {
  if (ioInstance) {
    ioInstance.to(`order:${orderId}`).emit(event, data);
  }
}

function broadcast(event, data) {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
}

function getOnlineRiders() {
  return Array.from(connectedRiders.keys());
}

module.exports = {
  setupSocket,
  sendToRider,
  sendToUser,
  sendToOrderChannel,
  broadcast,
  getOnlineRiders
};
