import dotenv from "dotenv";
import app from "./app.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";

dotenv.config({
    path: './.env'
})

app.get("/", (_, res) => {
    res.send("Hello World!");
})

app.use(errorHandler)