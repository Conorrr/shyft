const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const { SESSIONS_TABLE_NAME } = process.env;

exports.getSessionDetails = function(sessionId) {
  let sessionIdParams = {
    TableName: SESSIONS_TABLE_NAME,
    Key: {
      sessionId: sessionId
    }
  };

  return DDB.get(connectionIdParams).promise();
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