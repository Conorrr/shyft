const AWS = require('aws-sdk');
const crypto = require("crypto");
// Add ApiGatewayManagementApi to the AWS namespace
require('aws-sdk/clients/apigatewaymanagementapi');

const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const { SESSION_TABLE_NAME, CONNECTION_TABLE_NAME } = process.env;
const DEFAULT_SESSION_LENGTH_MINS = 15;
const MAX_SESSION_LENGTH_MINS = 120; // 2 hours
const DEFAULT_MAX_NO_FILES = 10;
const DEFAULT_MAX_FILE_SIZE = 4194304; // 4MB

exports.handler = async (event, context) => {
  const reconnectEvent = JSON.parse(event.body).data;
  const sessionId = reconnectEvent.sessionId;
  const hostKey = reconnectEvent.hostKey;

  let sessionData;
  try {
    sessionData = await ddb.get({ TableName: SESSION_TABLE_NAME, Key: { sessionId: sessionId } }).promise();
    console.log("found session with id:" + sessionData + JSON.stringify(sessionData))
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  
  if (sessionData.hostKey !== hostKey) {
    // TODO return actual error
    return { statusCode: 403, body: "Invalid hostKey" };
  }

  var createConnectionParams = {
    TableName: CONNECTION_TABLE_NAME,
    Item: {
      connectionId: connectionId,
      sessionId:    sessionId,
    }
  };

  await DDB.put(createConnectionParams, function (err) {
    if (err) {
      console.error("Error creating session" + JSON.stringify(err));
    }
  }).promise();

  let sessionDataBody = {
    type: "sessionData",
    expiry:   new Date(sessionData.expiry * 1000),
    maxFiles: sessionData.maxFiles,
    maxSize:  sessionData.maxSize,
    files:    sessionData.files
  };

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });

  try {
    await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(sessionDataBody)}).promise();
  } catch (e) {
    if (e.statusCode === 410) {
      console.log(`Found stale connection, deleting ${connectionId}`);
      // await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
    } else {
      throw e;
    }
  }

  return { statusCode: 200, body: 'Data sent.' };

  // let connectionData;
  
  // try {
  //   connectionData = await ddb.scan({ TableName: SESSION_TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();
  // } catch (e) {
  //   return { statusCode: 500, body: e.stack };
  // }
  
  // const apigwManagementApi = new AWS.ApiGatewayManagementApi({
  //   apiVersion: '2018-11-29',
  //   endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  // });
  
  // const postData = JSON.parse(event.body).data;
  
  // const postCalls = connectionData.Items.map(async ({ connectionId }) => {
  //   try {
  //     await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: postData }).promise();
  //   } catch (e) {
  //     if (e.statusCode === 410) {
  //       console.log(`Found stale connection, deleting ${connectionId}`);
  //       await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
  //     } else {
  //       throw e;
  //     }
  //   }
  // });
  
  // try {
  //   await Promise.all(postCalls);
  // } catch (e) {
  //   return { statusCode: 500, body: e.stack };
  // }

  // return { statusCode: 200, body: 'Data sent.' };
};