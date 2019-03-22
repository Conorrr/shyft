const AWS = require('aws-sdk');
require('aws-sdk/clients/apigatewaymanagementapi');

// Utilities for interacting with websockets

const send = function(domainName, stage, connectionId, body) {
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: domainName + '/' + stage
  });
    
  return apigwManagementApi.postToConnection({
    ConnectionId: connectionId,
    Data: JSON.stringify(body)
  }).promise();
}

exports.send = send;

// Currys domainsName, stage and connectionId for send
exports.prep = function(domainName, stage, connectionId) {
  return function(body) {
    return send(domainName, stage, connectionId, body);
  }
}