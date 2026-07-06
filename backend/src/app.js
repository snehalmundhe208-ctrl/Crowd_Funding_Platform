const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const donationRoutes = require('./routes/donationRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Config CORS
const allowedOrigins = Array.from(new Set([
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(origin => origin.trim()).filter(Boolean) : []),
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]));
app.use(cors({
  origin: [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true
}));

app.options('*', cors());

// Logger HTTP Requests
app.use(morgan('dev', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Assets
const uploadDir = process.env.UPLOAD_PATH || 'uploads/';
const receiptsDir = 'receipts/';
const resolvedUploadDir = path.isAbsolute(uploadDir)
  ? uploadDir
  : path.join(__dirname, '../', uploadDir);
const resolvedReceiptsDir = path.isAbsolute(receiptsDir)
  ? receiptsDir
  : path.join(__dirname, '../', receiptsDir);
app.use('/uploads', express.static(resolvedUploadDir));
app.use('/receipts', express.static(resolvedReceiptsDir));

// REST Route Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'healthy', timestamp: new Date() });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
