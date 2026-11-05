
import express from "express";
import cors from "cors";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./config/auth.js";

import booksRoutes from "./routes/books.routes.js";
import borrowsRoutes from "./routes/borrows.routes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://booknook-client-black.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Better Auth handler must be before express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to BookNook API!");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BookNook Server is running!",
  });
});

app.use("/books", booksRoutes);
app.use("/borrows", borrowsRoutes);

export default app;
