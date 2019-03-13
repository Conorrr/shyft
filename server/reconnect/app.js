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

// Reconnect
// Get Session
// Check HostKey
// Return sessionData

exports.handler = async (event, context) => {
  const connectionId = event.requestContext.connectionId;
  const reconnectEvent = JSON.parse(event.body);
  const sessionId = reconnectEvent.sessionId;
  const hostKey = reconnectEvent.hostKey;


  let sessionDataResult = await DDB.get({TableName: SESSION_TABLE_NAME, Key: { sessionId: sessionId }}, function (err) {
    if (err) {
      console.log("error getting connection:" + JSON.stringify(err));
      return {
        statusCode: 500,
        body: "Error getting connection for connectionId: " + connectionId + " : " + JSON.stringify(err)
      };
    }
  }).promise();
  let sessionData = sessionDataResult.Item;
  console.log("found session with id:" + sessionId + JSON.stringify(sessionData));
  
  if (sessionData.hostKey !== hostKey) {
    console.log("Hostkey " + hostKey + "does not match hostKey in sessionData:" + sessionData.hostKey);
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

  let createConnectionPromise = DDB.put(createConnectionParams, function (err) {
    if (err) {
      console.log("error getting connection:" + JSON.stringify(err));
      console.error("Error creating session" + JSON.stringify(err));
    }
  }).promise();

  let addConnectionToSessionPromise = DDB.update({
    TableName: SESSION_TABLE_NAME,
    Key: { sessionId : sessionId },
    UpdateExpression: 'ADD connections :c',
    ExpressionAttributeValues: {
      ':c' : DDB.createSet([connectionId])
    }
  }, function (err) {
    if (err) {
      console.log("error getting connection:" + JSON.stringify(err));
      return {
        statusCode: err ? 500 : 200,
        body: err ? "Failed to disconnect: " + JSON.stringify(err) : "Disconnected."
      };
    }
  }).promise();

  await createConnectionPromise;
  await addConnectionToSessionPromise;

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
};