const fs = require('fs');

const ErrorLog = async (req, res) => {
    const error = req.error || {};
  
    console.log(6, error.stack);
  
    const errorLogsDir = "./error-logs";
    if (!fs.existsSync(errorLogsDir)) {
      fs.mkdirSync(errorLogsDir);
    }
  
    const currentDate = new Date().toISOString().split("T")[0]; 
    const dayLogsDir = `${errorLogsDir}/${currentDate}`;
    if (!fs.existsSync(dayLogsDir)) {
      fs.mkdirSync(dayLogsDir);
    }
  
    const exactTime = new Date().toISOString().replace(/:/g, "-");
    const logFilePath = `${dayLogsDir}/${exactTime}.log`;
  
    console.log(6, logFilePath);
  
    fs.writeFile(
      logFilePath,
      ` Date: ${new Date(new Date()).toUTCString()} : \n  Route: ${req.path} \n Error: ${error}`,
      (err) => {
        if (err) {
          console.error("Error writing to error log:", err);
        } else {
          console.log("Error logged successfully.");
        }
      }
    );
  
    return res.status(500).send({
      status: false,
      message: error,
    });
  };

  module.exports = ErrorLog