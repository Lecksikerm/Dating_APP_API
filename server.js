require('dotenv').config();

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
});

const http = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/config/logger');
const { initSocket } = require('./src/socket'); 

const PORT = process.env.PORT || 5000;

connectDB();

const server = http.createServer(app);

const splitOrigins = (value) => {
    if (!value || typeof value !== 'string') return [];
    return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const allowedOrigins = [
    process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim(),
    ...splitOrigins(process.env.FRONTEND_URLS),
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'https://love-connect-app.vercel.app',
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

initSocket(io);

server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
    logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => logger.info('💥 Process terminated!'));
});