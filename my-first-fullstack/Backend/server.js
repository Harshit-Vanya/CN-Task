// backend/server.js
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// Simple API endpoint (keeping original for compatibility)
app.get("/api/message", (req, res) => {
  res.json({ message: "Hello from the backend!" });
});

// Login endpoint
app.post("/api/login", (req, res) => {
  const { email, password, rememberMe } = req.body;
  
  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email/username and password are required",
      field: !email ? "email" : "password"
    });
  }
  
  // Demo validation - In production, check against database
  // For demo purposes, accept any email with password length >= 6
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
      field: "password"
    });
  }
  
  // Simulate user check (replace with actual database query)
  // Demo: accept "demo@example.com" / "password123" or any valid credentials
  const validCredentials = [
    { email: "demo@example.com", password: "password123", username: "demo" },
    { email: "admin@example.com", password: "admin123", username: "admin" },
    { email: "test", password: "test123", username: "test" }
  ];
  
  const user = validCredentials.find(
    cred => (cred.email === email || cred.username === email) && cred.password === password
  );
  
  if (user) {
    // Successful login
    res.json({
      success: true,
      message: "Login successful!",
      user: {
        email: user.email,
        username: user.username,
        rememberMe: rememberMe || false
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
});

const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));