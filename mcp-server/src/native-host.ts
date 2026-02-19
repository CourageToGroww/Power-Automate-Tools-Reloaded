#!/usr/bin/env node

import { readMessage, writeMessage } from './native-messaging';
import { authStore, ServiceType } from './auth-store';
import { startRelay } from './relay';

// Start the HTTP relay server
startRelay();

// Read messages from stdin
let buffer: Buffer = Buffer.alloc(0);

process.stdin.on('data', (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]) as Buffer;

  let result = readMessage(buffer);
  while (result) {
    const { message, remaining } = result;
    buffer = remaining as Buffer;

    handleMessage(message);
    result = readMessage(buffer);
  }
});

function handleMessage(message: any) {
  try {
    if (message.type === 'credential-update') {
      const { service, token, apiUrl, context } = message;
      authStore.set(service as ServiceType, token, apiUrl, context || {});

      // Send acknowledgment
      const response = {
        type: 'credential-ack',
        service,
        timestamp: Date.now(),
      };
      process.stdout.write(writeMessage(response));
    } else if (message.type === 'ping') {
      // Respond to ping
      const response = {
        type: 'pong',
        timestamp: Date.now(),
      };
      process.stdout.write(writeMessage(response));
    } else {
      // Unknown message type
      const response = {
        type: 'error',
        message: `Unknown message type: ${message.type}`,
      };
      process.stdout.write(writeMessage(response));
    }
  } catch (err: any) {
    const response = {
      type: 'error',
      message: err.message,
    };
    process.stdout.write(writeMessage(response));
  }
}

// Log to stderr (stdout is reserved for native messaging)
console.error('M365 Workbench Native Messaging Host started');
