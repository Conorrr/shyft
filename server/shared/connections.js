const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const { CONNECTION_TABLE_NAME } = process.env;

exports.getConnectionDetails = function(connectionId) {
  let connectionIdParams = {
    TableName: CONNECTION_TABLE_NAME,
    Key: {
      connectionId: connectionId
    }
  };

  return DDB.get(connectionIdParams).promise();
}

exports.createConnection = function(connectionId, sessionId, isHost = false) {
  return DDB.put({
    TableName: CONNECTION_TABLE_NAME,
    Item: {
      connectionId: connectionId,
      sessionId:    sessionId,
      isHost:       isHost,
    }
  }).promise();
}