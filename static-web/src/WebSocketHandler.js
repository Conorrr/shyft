class WebSocketHandler {

    constructor() {
        this.handlers = {};
    }

    connect(url, callback) {
        this.webSocket = new WebSocket(url);
        let webSocket = this.webSocket;
        let _this = this;
        webSocket.onopen = callback;

        webSocket.onmessage = function (event) {
            let data = JSON.parse(event.data);
            let handler = _this.handlers[data.type];
            if (!handler) {
                handler = _this.handlers['default'];
            }
            if (!handler) {
                console.error(`type ${data.type} not recognised and no default handler found. Doing nothing.`, data);
                return;
            }
            handler(data);
        }

        webSocket.onerror = function (event) {
            console.error(`WebSocket error.`, event)
        }

        if (this.closeHandler) {
            webSocket.onclose = this.closeHandler;
        } else {
            webSocket.onclose = function (event) {
                console.error(`Unexpected disconnect.`, event);
            }
        }
    }

    addHandler(type, handler) {
        this.handlers[type] = handler;
    }

    addDefaultHandler(handler) {
        this.addHandler('default', handler);
    }

    addCloseHandler(handler) {
        this.closeHandler = handler;
    }

    send(data) {
        console.log('sending', data);
        this.webSocket.send(JSON.stringify(data));
    }

    close() {
        this.webSocket.close();
    }
};

module.exports = WebSocketHandler;