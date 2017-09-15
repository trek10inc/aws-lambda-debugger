
const cp = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const types = require('../lib/messageTypes');

const HANDLER_NAME = process.env._HANDLER.split('.')[1];// eslint-disable-line

let child;
let childSocket;
let brokerSocket;

function currentTimeInMillis () {
  const hrtime = process.hrtime()
  return hrtime[0] * 1000 + Math.floor(hrtime[1] / 1000000)
}

function runAsProxy() {
  if (!process.env.DEBUGGER_ACTIVE || process.env.DEBUGGER_ACTIVE === 'false') return;
  let childResolver;
  let debuggerUrl;
  const childPromise = new Promise((resolve) => { childResolver = resolve; });

  // only fork one child
  if (!child) {
    child = cp.fork(module.parent.filename, [], {
      cwd: process.cwd,
      env: process.env,
      execPath: process.execPath,
      execArgv: process.execArgv.concat(['--inspect']),
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    child.on('message', (messageString) => {
      const message = JSON.parse(messageString);
      switch (message.type) {
        case types.CHILD_READY: {
          debuggerUrl = message.debuggerUrl; // eslint-disable-line
          childResolver();
          break;
        }
        default: {
          break;
        }
      }
    });

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
  }

  // replace the handler with our code
  module.parent.exports[HANDLER_NAME] = (event, context, callback) => {
    // this allows console.log in child to route correctly to CloudWatch Logs
    child.stdout.on('data', console.log);
    child.stderr.on('data', console.log);

    // this is a requirement to keep function from running to full timeout
    context.callbackWaitsForEmptyEventLoop = false; // eslint-disable-line

    function childMessageHandler(messageString) {
      const message = JSON.parse(messageString);
      switch (message.type) {
        case types.LAMBDA_CALLBACK: {
          brokerSocket.close();
          childSocket.close();
          child.stdout.removeAllListeners('data');
          child.stderr.removeAllListeners('data');
          child.removeListener('message', childMessageHandler);

          if (message.doNotWaitOnEmptyEventLoop) {
            context.callbackWaitsForEmptyEventLoop = false; // eslint-disable-line
          }
          callback(message.err || null, message.response || null); // eslint-disable-line
          break;
        }
        case types.SET_CALLBACKWAITSFOREMPTYEVENTLOOP: {
          context.callbackWaitsForEmptyEventLoop = message.value; // eslint-disable-line
          break;
        }
        default: {
          break;
        }
      }
    }
    child.on('message', childMessageHandler);

    // connect to broker
    brokerSocket = new WebSocket(`ws://${process.env.DEBUGGER_BROKER_ADDRESS}:8080/${process.env.DEBUGGER_FUNCTION_ID}`);

    // wait on CHILD_READY
    childPromise.then(() => {
      brokerSocket.on('message', (messageString) => {
        const message = JSON.parse(messageString);
        switch (message.type) {
          case types.USER_CONNECTED: {
            console.log('user connected via broker. invoking child.');
            childSocket = new WebSocket(debuggerUrl);
            childSocket.on('message', (rawInspectorMessage) => {
              if (brokerSocket.readyState === WebSocket.OPEN) {
                brokerSocket.send(JSON.stringify({
                  type: types.V8_INSPECTOR_MESSAGE,
                  payload: rawInspectorMessage
                }));
              }
            });
            childSocket.on('open', () => {
              child.send(JSON.stringify({
                timestamp: currentTimeInMillis(),
                remainingTime: context.getRemainingTimeInMillis(),
                type: types.INVOKE_HANDLER,
                event,
                context
              }));
            });
            break;
          }
          case types.V8_INSPECTOR_MESSAGE: {
            if (childSocket.readyState === WebSocket.OPEN) {
              childSocket.send(message.payload);
            }
            break;
          }
          default: {
            break;
          }
        }
      });

      brokerSocket.on('close', () => {
        if (childSocket && childSocket.readyState === WebSocket.OPEN) {
          childSocket.close();
        }
      });
    });
  };
}

function runAsChild() {
  const callback = (err, response) =>
    process.send(JSON.stringify({ type: types.LAMBDA_CALLBACK, err, response }));

  // handle messages from proxy
  process.on('message', (messageString) => {
    const message = JSON.parse(messageString);
    switch (message.type) {
      case types.INVOKE_HANDLER: {
        // shimming context
        let _callbackWaitsForEmptyEventLoop = true; // eslint-disable-line
        Object.defineProperties(message.context, {
          callbackWaitsForEmptyEventLoop: {
            get: () => _callbackWaitsForEmptyEventLoop,
            set: (value) => {
              _callbackWaitsForEmptyEventLoop = value;
              process.send(JSON.stringify({
                type: types.SET_CALLBACKWAITSFOREMPTYEVENTLOOP,
                value
              }));
            }
          }
        });
        message.context.getRemainingTimeInMillis =
          () => message.remainingTime - (currentTimeInMillis() - message.timestamp);
        message.context.done = (err, response) =>
          process.send(JSON.stringify({
            type: types.LAMBDA_CALLBACK,
            err,
            response,
            doNotWaitOnEmptyEventLoop: true
          }));
        message.context.succeed = response => message.context.done(null, response);
        message.context.fail = err => message.context.done(err, null);

        // get ready for the user
        console.log(`Current AWS request ID: ${message.context.awsRequestId}`);
        setTimeout( // this is a hack to get around the delay before the debugger fully kicks in
          () => {
            debugger;
            // *** STEP INTO THE FOLLOWING LINE TO BEGIN STEPPING THROUGH YOUR FUNCTION ***
            module.parent.exports[HANDLER_NAME](message.event, message.context, callback);
          },
          1000
        );
        break;
      }
      default: {
        break;
      }
    }
  });

  // inform proxy that child is ready, passing along the local debugger URL
  http.get('http://localhost:9229/json', (responseStream) => {
    let responseString = '';
    responseStream.on('data', (chunk) => {
      responseString += chunk;
    });
    responseStream.on('end', () => {
      console.log(responseString);
      const response = JSON.parse(responseString);
      process.send(JSON.stringify({
        type: types.CHILD_READY,
        debuggerUrl: response[0].webSocketDebuggerUrl
      }));
    });
  });
}

if (process.send) {
  runAsChild();
} else {
  runAsProxy();
}
