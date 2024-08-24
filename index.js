import express from "express";
const app = express();
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables from .env file
dotenv.config();

// DB connection
import "./db/conn.js";

// Routes
import router from "./router/routes.js";

const port = process.env.PORT;

// Configure CORS
const allowedOrigins = [
  "https://shareway-backend.onrender.com",
  "https://share-way-frontend.vercel.app", // Add your frontend URL here
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allow credentials
  })
);

app.options(
  "*",
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(router);
app.listen(port, () => {
  console.log(`Server running at: http://localhost:${port}/`);
});
