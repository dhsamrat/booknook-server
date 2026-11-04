
import express from "express";
import cors from "cors";

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.send("Welcome to BookNook API!");
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BookNook Server is running!",
  });
});

export default app;
