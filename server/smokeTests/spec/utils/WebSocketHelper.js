var WebSocketClient = require('websocket').client;

class WebSocketHelper {

    constructor() {
        this.messages = [];
        this.messageCallback = () => {};
    }

    connect(url) {
        this.client = new WebSocketClient();
        let client = this.client;
        let _this = this;

        return new Promise(function(resolve) {
            client.on('connect', function(connection) {
                _this.connection = connection;
                connection.on('error', function(error) {
                    console.log("Connection Error: " + error.toString());
                });
                connection.on('close', function() {
                    console.log('Connection Closed');
                });
                connection.on('message', function(message) {
                    _this.messages.push(JSON.parse(message.utf8Data));
                    _this.messageCallback();
                });

                resolve();
            });
            client.connect(url);
        });
    }

    sendMessage(message) {
        this.connection.sendUTF(JSON.stringify(message));
    }

    waitForNextMessage(timeout = 3000) {
        let _this = this;
        return new Promise(function(accept, reject) {
            if (_this.messages.length > 0) {
                accept(_this.messages.pop());
                return;
            }
            _this.messageCallback = function() {
                _this.messageCallback = () => {};
                accept(_this.messages.pop());
            }
            setTimeout(function() {
                reject('Timed out after ' + timeout + ' ms waiting for next message');
            }, timeout);
        });
    }

    clearMessages() {
        this.messages = [];
    }

    close() {
        this.connection.close();
    }

}

module.exports = WebSocketHelper;