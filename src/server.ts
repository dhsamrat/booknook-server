
// import "dotenv/config";
// import app from "./app.js";

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`BookNook server running on port ${PORT}`);
// });



import "dotenv/config";

import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect MongoDB first
    await connectDB();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`BookNook server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
