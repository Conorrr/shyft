const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const { SESSION_TABLE_NAME } = process.env;

exports.getSessionDetails = (sessionId) => {
  return DDB.get({
    TableName: SESSION_TABLE_NAME,
    Key: {
      sessionId: sessionId
    }
  }).promise();
}

exports.addConnection = (sessionId, connectionId) => {
  return DDB.update({
    TableName: SESSION_TABLE_NAME,
    Key: { sessionId : sessionId },
    UpdateExpression: 'ADD connections :c',
    ExpressionAttributeValues: {
      ':c' : DDB.createSet([connectionId])
    }
  }).promise();
}

exports.addFiles = (sessionId, files) => {
  return DDB.update({
    TableName: SESSION_TABLE_NAME,
    Key: { sessionId : sessionId },
    UpdateExpression: 'SET files = list_append(files, :c)',
    ExpressionAttributeValues: {
      ':c' : files
    }
  }).promise();
}

exports.createSession = (sessionId, hostKey, created, expiry, maxFiles, maxSize, connectionId) => {
  return DDB.put({
    TableName: SESSION_TABLE_NAME,
    Item: {
      sessionId:   sessionId,
      hostKey:     hostKey,
      created:     Math.floor(created.getTime() / 1000),
      expiry:      Math.floor(expiry.getTime() / 1000),
      maxFiles:    maxFiles,
      maxSize:     maxSize,
      connections: DDB.createSet([
        connectionId
      ]),
      files:       []
    }
  }).promise();
}