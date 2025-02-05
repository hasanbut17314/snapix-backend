import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";

dotenv.config({
    path: './.env'
})

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port: ${process.env.PORT}`);
        })
    })
    .catch((error) => {
        console.log("DB connection failed! ", error);
    })

app.get("/", (_, res) => {
    res.send("Hello World!");
})

app.use(errorHandler)