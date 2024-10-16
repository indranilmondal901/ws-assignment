const express = require('express');
const cors = require("cors");
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 8080;
const app = express();

require('dotenv').config();

//DB connection
require("./Config/db");

//routers
const UserRoutes = require("./Routes/UserRoutes");

//Global error handler
const ErrorLog = require("./Controllers/ErrorHandler/ErrorLog");

app.use(cors({credentials:true,origin: "http://localhost:3000"}));
app.use(cookieParser());
app.use(express.json());

app.use("/api/v1/user",UserRoutes);
app.use(ErrorLog);

//listen(server)
app.listen(PORT, () => {
    console.log("Your Server is running on PORT no ==> " + PORT)
})