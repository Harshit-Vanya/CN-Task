// backend/server.js
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const path = require("path");

const app = express();

// Security: Helmet sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: false, // Disable if causing issues with frontend
  crossOriginEmbedderPolicy: false
}));

// Performance: Enable compression for all responses
app.use(compression());

// Security: Configure CORS properly (instead of allowing all origins)
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || ['http://localhost:5000', 'http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'http://127.0.0.1:5000', 'file://'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Serve static files from Frontend directory
const frontendPath = path.join(__dirname, '..', 'Frontend');
app.use(express.static(frontendPath));

// Performance: Body parser with limits to prevent DoS
app.use(express.json({ 
  limit: '10kb', // Limit payload size
  strict: true 
}));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security: Rate limiting to prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    field: 'email'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Request timeout handler (set early)
const serverTimeout = 30000; // 30 seconds
app.use((req, res, next) => {
  req.setTimeout(serverTimeout, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: "Request timeout"
      });
    }
  });
  next();
});

// Input sanitization helper
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, ''); // Remove potential XSS characters
}

// Email validation helper
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// Username validation helper
function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username.trim());
}

// Simple API endpoint (keeping original for compatibility)
app.get("/api/message", (req, res) => {
  res.json({ message: "Hello from the backend!" });
});

// Login endpoint with security and performance optimizations
app.post("/api/login", loginLimiter, async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    // Input validation and sanitization
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/username and password are required",
        field: !email ? "email" : "password"
      });
    }

    // Sanitize inputs to prevent XSS
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);

    // Additional validation
    if (!sanitizedEmail || sanitizedEmail.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Email/username must be at least 3 characters",
        field: "email"
      });
    }

    if (!sanitizedPassword || sanitizedPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
        field: "password"
      });
    }

    // Prevent excessively long inputs (DoS protection)
    if (sanitizedEmail.length > 100 || sanitizedPassword.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Input too long",
        field: sanitizedEmail.length > 100 ? "email" : "password"
      });
    }

    // Optimized: Use Map for O(1) lookup instead of Array.find O(n)
    // In production, use database with indexed queries
    const validCredentials = new Map([
      ['demo@example.com', { email: 'demo@example.com', password: 'password123', username: 'demo' }],
      ['admin@example.com', { email: 'admin@example.com', password: 'admin123', username: 'admin' }],
      ['test', { email: 'test@example.com', password: 'test123', username: 'test' }],
      ['demo', { email: 'demo@example.com', password: 'password123', username: 'demo' }],
      ['admin', { email: 'admin@example.com', password: 'admin123', username: 'admin' }]
    ]);

    // Check if email/username exists
    const user = validCredentials.get(sanitizedEmail);
    
    // If not found by direct key, check by username/email match
    let matchedUser = null;
    if (!user) {
      for (const [key, cred] of validCredentials.entries()) {
        if ((cred.email === sanitizedEmail || cred.username === sanitizedEmail) && 
            cred.password === sanitizedPassword) {
          matchedUser = cred;
          break;
        }
      }
    } else if (user.password === sanitizedPassword) {
      matchedUser = user;
    }

    // Simulate minimal processing delay for security (prevents timing attacks)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

    if (matchedUser) {
      // Successful login - don't send password back
      res.json({
        success: true,
        message: "Login successful!",
        user: {
          email: matchedUser.email,
          username: matchedUser.username,
          rememberMe: Boolean(rememberMe)
        }
      });
    } else {
      // Invalid credentials
      res.status(401).json({
        success: false,
        message: "Invalid email/username or password",
        field: "email"
      });
    }
  } catch (error) {
    // Log error but don't expose details to client
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      field: "email"
    });
  }
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: "Internal server error. Please try again later."
  });
});

// Serve index.html for root and non-API routes (SPA fallback)
// Also handle 404 for undefined API routes
app.use((req, res, next) => {
  // Handle undefined API routes with 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: "Route not found"
    });
  }
  // Serve index.html for all other routes
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`🚀 Performance optimizations enabled`);
  console.log(`🔒 Security features enabled`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;