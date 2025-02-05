import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

//import routes
import userRoute from "./routes/user.route.js"
import postRoute from "./routes/post.route.js"

//use routes
app.use("/api/user", userRoute)
app.use("/api/post", postRoute)

export default app