const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const indexRouter = require("./routes/index");
const resultsRouter = require("./routes/results");
const authRouter = require("./routes/auth");
const imagesRouter = require("./routes/images");

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/results", resultsRouter);
app.use("/auth", authRouter);
app.use("/images", imagesRouter);

module.exports = app;
