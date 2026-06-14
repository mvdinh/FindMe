require('dotenv').config();
const express = require('express');
const http = require('http');
const {
  Server
} = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./global/config/database');
const errorHandler = require('./global/middleware/errorHandler');
const jwt = require('jsonwebtoken');
const User = require('./global/models/User');
const {
  setIO
} = require('./global/socket');
const notificationsRoutes = require('./global/routes/notifications');
const authRoutes = require('./global/routes/auth');
const jobRoutes = require('./applicant/routes/jobs');
const applicationRoutes = require('./applicant/routes/createApplication');
const resumeRoutes = require('./applicant/routes/resumes');
const applicantProfileRoutes = require('./applicant/routes/profile');
const savedJobsRoutes = require('./applicant/routes/saved-jobs');
const applicantApplicationRoutes = require('./applicant/routes/applicantApplications');
const recruiterDashboardRoutes = require('./recruiter/routes/dashboard');
const recruiterJobRoutes = require('./recruiter/routes/jobs');
const recruiterApplicationRoutes = require('./recruiter/routes/applications');
const recruiterInterviewsRoutes = require('./recruiter/routes/interviews');
const recruiterInterviewersRoutes = require('./recruiter/routes/interviewers');
const adminRecruiterRoutes = require('./admin/routes/recruiter');
const adminJobsRoutes = require('./admin/routes/jobs');
const adminJobStatusRequestsRoutes = require('./admin/routes/jobStatusRequests');
const adminDashboardRoutes = require('./admin/routes/dashboard');
const adminUsersRoutes = require('./admin/routes/users');
const adminCompaniesRoutes = require('./admin/routes/companies');
const recruiterJobStatusRequestsRoutes = require('./recruiter/routes/jobStatusRequests');
const recruiterProfileRoutes = require('./recruiter/routes/profile');
const companyRoutes = require('./global/routes/companies');
const { startApplicationAiCron } = require('./global/jobs/applicationAiCron');
const app = express();
const server = http.createServer(app);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOptions = {
  origin: CORS_ORIGIN,
  credentials: true
};

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    credentials: true
  }
});
setIO(io);
io.use(async (socket, next) => {
  try {
    const token = socket.handshake?.auth?.token || socket.handshake?.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Unauthorized'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('Unauthorized'));
    if (user.isActive === false || user.accountStatus !== 'active') return next(new Error('Unauthorized'));
    socket.user = {
      ...user.toObject(),
      id: user._id.toString()
    };
    next();
  } catch (e) {
    next(new Error('Unauthorized'));
  }
});
io.on('connection', socket => {
  try {
    const userId = socket.user?.id;
    if (userId) socket.join(`user:${userId}`);
  } catch (e) {}
});

app.use((req, res, next) => {
  req.setTimeout(300000);
  next();
});
connectDB();
startApplicationAiCron();
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
const IS_PROD = process.env.NODE_ENV === 'production';
const WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const DEFAULT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300;
const AUTH_WINDOW = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 5 * 60 * 1000;
const AUTH_MAX = parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 10;
const MUTATION_MAX = parseInt(process.env.RATE_LIMIT_MUTATION_MAX) || 100;
const skipPreflight = req => req.method === 'OPTIONS' || req.method === 'HEAD';
const rateLimitHandler = (req, res, next, options) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(options.statusCode).json({
    status: 'error',
    message: 'Bạn đã gửi quá nhiều request. Vui lòng thử lại sau.'
  });
};
if (IS_PROD) {
  app.use(rateLimit({
    windowMs: WINDOW,
    max: DEFAULT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipPreflight,
    handler: rateLimitHandler
  }));
  app.use('/api/auth', rateLimit({
    windowMs: AUTH_WINDOW,
    max: AUTH_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipPreflight,
    handler: rateLimitHandler
  }));
  app.use(['/api/applications', '/api/recruiter', '/api/admin', '/api/applicant'], rateLimit({
    windowMs: WINDOW,
    max: MUTATION_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipPreflight,
    handler: rateLimitHandler
  }));
}
app.use(express.json({
  limit: '10mb'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/applicant/profile', applicantProfileRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/applicant/saved-jobs', savedJobsRoutes);
app.use('/api/applicant/applications', applicantApplicationRoutes);
app.use('/api/recruiter/dashboard', recruiterDashboardRoutes);
app.use('/api/recruiter/jobs', recruiterJobRoutes);
app.use('/api/recruiter/job-status-requests', recruiterJobStatusRequestsRoutes);
app.use('/api/recruiter/applications', recruiterApplicationRoutes);
app.use('/api/recruiter/interviews', recruiterInterviewsRoutes);
app.use('/api/recruiter/interviewers', recruiterInterviewersRoutes);
app.use('/api/recruiter/profile', recruiterProfileRoutes);
app.use('/api/admin/recruiter', adminRecruiterRoutes);
app.use('/api/admin/jobs', adminJobsRoutes);
app.use('/api/admin/job-status-requests', adminJobStatusRequestsRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/companies', adminCompaniesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection?.readyState || 0;
  res.status(200).json({
    status: 'OK',
    message: 'findme API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    db: {
      state: dbState,
      connected: dbState === 1
    }
  });
});
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});
app.use(errorHandler);
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 findme API Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});
module.exports = app;