// Chrome native messaging uses length-prefixed JSON:
// 4 bytes (uint32 LE) = message length, then JSON bytes

export function readMessage(buffer: Buffer): { message: any; remaining: Buffer } | null {
  if (buffer.length < 4) return null;
  const len = buffer.readUInt32LE(0);
  if (buffer.length < 4 + len) return null;
  const json = buffer.subarray(4, 4 + len).toString('utf-8');
  return { message: JSON.parse(json), remaining: Buffer.from(buffer.subarray(4 + len)) };
}

export function writeMessage(msg: any): Buffer {
  const json = Buffer.from(JSON.stringify(msg), 'utf-8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  return Buffer.concat([header, json]);
}
