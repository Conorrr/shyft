const WebSocketHelper = require('./utils/WebSocketHelper');

describe("given nothing", function() {
  const url = "wss://8yz0qkkqra.execute-api.eu-central-1.amazonaws.com/Prod/";
  let connection = new WebSocketHelper();

  afterAll(() => {
    connection.close();
  })

  describe("when ping message is sent", function() {

    it("pong message is received", async () => {
      await connection.connect(url);
      connection.sendMessage({type:"ping"});
      
      message = await connection.waitForNextMessage();

      expect(message.type).toEqual("pong");
    });
  });
});
