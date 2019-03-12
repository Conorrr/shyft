const AWS = require("aws-sdk");
AWS.config.update({ region: process.env.AWS_REGION });
var DDB = new AWS.DynamoDB({ apiVersion: "2012-10-08" });

exports.handler = function (event, context, callback) {
  // do nothing
  console.log("New Connection");
  callback(null, {
      statusCode: 200,
      body: "Connected."
  });
    
};