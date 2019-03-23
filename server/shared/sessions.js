const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const { SESSION_TABLE_NAME } = process.env;

exports.getSessionDetails = function(sessionId) {
  return DDB.get({
    TableName: SESSION_TABLE_NAME,
    Key: {
      sessionId: sessionId
    }
  }).promise();
}

exports.addConnection = function(sessionId, connectionId) {
  return DDB.update({
    TableName: SESSION_TABLE_NAME,
    Key: { sessionId : sessionId },
    UpdateExpression: 'ADD connections :c',
    ExpressionAttributeValues: {
      ':c' : DDB.createSet([connectionId])
    }
  }).promise();
}