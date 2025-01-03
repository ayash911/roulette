const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;

require('dotenv').config();  // Load environment variables from .env file

// Middleware to serve static files
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,      // Use the environment variable for the host
  user: process.env.DB_USER,      // PostgreSQL username
  password: process.env.DB_PASSWORD, // PostgreSQL password
  database: process.env.DB_NAME,  // PostgreSQL database name
  port: process.env.PORT || 5432, // Default PostgreSQL port (you can skip this line if you're using the default port)
});

client.connect()
  .then(() => console.log("Connected to PostgreSQL Database"))
  .catch((err) => console.error("Error connecting to PostgreSQL", err.stack));


// User Signup Route
app.post("/signup", (req, res) => {
  const { username, password } = req.body;

  // Check if username already exists
  const checkQuery = "SELECT * FROM users WHERE username = ?";
  db.query(checkQuery, [username], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error checking username");
    }

    if (result.length > 0) {
      return res.status(400).send("Username already exists");
    }

    // Hash the password and insert the new user
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error hashing password");
      }

      const query = "INSERT INTO users (username, password, balance) VALUES (?, ?, 1000)";
      db.query(query, [username, hashedPassword], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error inserting user");
        }
        res.status(201).send("User created successfully");
      });
    });
  });
});

// User Login Route
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const query = "SELECT * FROM users WHERE username = ?";
  db.query(query, [username], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error querying user" });
    }

    if (result.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    // Compare the password with the hashed password in the database
    bcrypt.compare(password, result[0].password, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Error comparing passwords" });
      }

      if (isMatch) {
        const balance = result[0].balance; // Assuming `balance` exists in the database
        res.status(200).json({ message: "Login successful", balance });
      } else {
        res.status(400).json({ message: "Invalid password" });
      }
    });
  });
});

app.post("/update-balance", (req, res) => {
  const { username, amount, isAdd } = req.body;
  const query = isAdd
    ? "UPDATE users SET balance = balance + ? WHERE username = ?"
    : "UPDATE users SET balance = balance - ? WHERE username = ?";

  db.query(query, [amount, username], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error updating balance" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Balance updated successfully" });
  });
});

// Save Spin Result
app.post("/save-spin", (req, res) => {
  const { winningNumber } = req.body;

  if (winningNumber === undefined) {
    return res.status(400).send("Winning number is required.");
  }

  const query = "INSERT INTO spin_history (winning_number) VALUES (?)";
  db.query(query, [winningNumber], (err, result) => {
    if (err) {
      console.error("Error saving spin result:", err);
      return res.status(500).send("Error saving spin result.");
    }
    res.status(201).send("Spin result saved.");
  });
});


// Retrieve Spin History
app.get("/spin-history", (req, res) => {
  const query = "SELECT * FROM spin_history ORDER BY spin_time DESC LIMIT 50"; // Retrieve the last 50 spins
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error retrieving spin history:", err);
      return res.status(500).send("Error retrieving spin history.");
    }
    res.status(200).json(results);
  });
});


app.post("/get-balance", (req, res) => {
  console.log("Request received at /get-balance");
  console.log("Request body:", req.body);

  const { username } = req.body;

  if (!username) {
    console.error("No username provided");
    return res.status(400).json({ message: "Username is required" });
  }

  const query = "SELECT balance FROM users WHERE username = ?";
  db.query(query, [username], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Error retrieving balance" });
    }

    if (result.length === 0) {
      console.error("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Balance retrieved:", result[0].balance);
    res.status(200).json({ balance: result[0].balance });
  });
});


// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
