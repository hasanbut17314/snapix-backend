import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    if (err instanceof ApiError) {
        res.status(err.statusCode).json(err.toJson());
    } else {
        res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error",
            errors: [],
        });
    }
};

export default errorHandler;
