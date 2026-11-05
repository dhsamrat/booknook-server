import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { jwt } from "better-auth/plugins";
import { client } from "./db.js";


export const auth = betterAuth({
  database: mongodbAdapter(client.db("booknook"), {
    client,
  }),

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",

  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: ["http://localhost:3000"],
  
emailAndPassword: {
  enabled: true,
  minPasswordLength: 6,
  maxPasswordLength: 128,
  autoSignIn: false,
},
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},

  plugins: [jwt()],
});