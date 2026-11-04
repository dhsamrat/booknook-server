
import express from "express";
import cors from "cors";
import booksRoutes from "./routes/books.routes.js";
import borrowsRoutes from "./routes/borrows.routes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

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
