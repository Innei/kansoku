import { gunzipSync } from "node:zlib";

export const COMMAND_AUTH = 2;
export const COMMAND_RECONNECT = 3;
export const COMMAND_SUBSCRIBE = 6;
export const COMMAND_UNSUBSCRIBE = 7;
export const COMMAND_PUSH_QUOTE = 101;
export const COMMAND_PUSH_TRADE = 104;

export const SUB_TYPE_QUOTE = 1;
export const SUB_TYPE_TRADE = 4;

export const TRADE_SESSION_INTRADAY = 0;
export const TRADE_SESSION_PRE = 1;
export const TRADE_SESSION_POST = 2;
export const TRADE_SESSION_OVERNIGHT = 3;

export type ProtocolPacket =
  | { type: "request"; command: number; requestId: number; timeoutMs: number; body: Uint8Array }
  | { type: "response"; command: number; requestId: number; status: number; body: Uint8Array }
  | { type: "push"; command: number; body: Uint8Array };

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function u24(value: number): Uint8Array {
  return Uint8Array.of((value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

function u32(value: number): Uint8Array {
  return Uint8Array.of((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

function readU24(data: Uint8Array, offset: number): number {
  return (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
}

function readU32(data: Uint8Array, offset: number): number {
  return data[offset] * 0x1000000 + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3];
}

export function encodeRequest(command: number, requestId: number, timeoutMs: number, body: Uint8Array): Uint8Array {
  return concat([
    Uint8Array.of(1, command),
    u32(requestId),
    Uint8Array.of((timeoutMs >>> 8) & 0xff, timeoutMs & 0xff),
    u24(body.length),
    body,
  ]);
}

export function decodePacket(input: Uint8Array): ProtocolPacket {
  if (input.length < 2) throw new Error("Longbridge packet is too short");
  const header = input[0];
  const type = header & 0x0f;
  const gzip = (header & 0x20) !== 0;
  const command = input[1];
  let body: Uint8Array;
  let packet: ProtocolPacket;
  if (type === 2) {
    if (input.length < 10) throw new Error("Longbridge response packet is too short");
    const requestId = readU32(input, 2);
    const status = input[6];
    const length = readU24(input, 7);
    body = input.subarray(10, 10 + length);
    packet = { type: "response", command, requestId, status, body };
  } else if (type === 3) {
    if (input.length < 5) throw new Error("Longbridge push packet is too short");
    const length = readU24(input, 2);
    body = input.subarray(5, 5 + length);
    packet = { type: "push", command, body };
  } else {
    throw new Error(`Unsupported Longbridge packet type: ${type}`);
  }
  if (gzip) packet.body = Uint8Array.from(gunzipSync(packet.body));
  return packet;
}

function varint(value: number | bigint): Uint8Array {
  let current = BigInt(value);
  const out: number[] = [];
  while (current >= 0x80n) {
    out.push(Number(current & 0x7fn) | 0x80);
    current >>= 7n;
  }
  out.push(Number(current));
  return Uint8Array.from(out);
}

function fieldVarint(field: number, value: number | bigint): Uint8Array {
  return concat([varint(field << 3), varint(value)]);
}

function fieldBytes(field: number, value: Uint8Array): Uint8Array {
  return concat([varint((field << 3) | 2), varint(value.length), value]);
}

function fieldString(field: number, value: string): Uint8Array {
  return fieldBytes(field, Buffer.from(value));
}

function mapStringEntry(field: number, key: string, value: string): Uint8Array {
  return fieldBytes(field, concat([fieldString(1, key), fieldString(2, value)]));
}

export function encodeAuthRequest(token: string, metadata: Record<string, string>): Uint8Array {
  return concat([fieldString(1, token), ...Object.entries(metadata).map(([key, value]) => mapStringEntry(2, key, value))]);
}

export function encodeReconnectRequest(sessionId: string, metadata: Record<string, string>): Uint8Array {
  return concat([fieldString(1, sessionId), ...Object.entries(metadata).map(([key, value]) => mapStringEntry(2, key, value))]);
}

export function encodeSubscribeRequest(symbols: string[], subTypes: number[], firstPush: boolean): Uint8Array {
  return concat([
    ...symbols.map((symbol) => fieldString(1, symbol)),
    ...subTypes.map((type) => fieldVarint(2, type)),
    fieldVarint(3, firstPush ? 1 : 0),
  ]);
}

export function encodeUnsubscribeRequest(symbols: string[], subTypes: number[], all = false): Uint8Array {
  return concat([
    ...symbols.map((symbol) => fieldString(1, symbol)),
    ...subTypes.map((type) => fieldVarint(2, type)),
    fieldVarint(3, all ? 1 : 0),
  ]);
}

interface Field {
  number: number;
  wire: number;
  value: bigint | Uint8Array;
}

function readVarint(data: Uint8Array, start: number): { value: bigint; next: number } {
  let value = 0n;
  let shift = 0n;
  let offset = start;
  while (offset < data.length) {
    const byte = data[offset++];
    value |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value, next: offset };
    shift += 7n;
  }
  throw new Error("Truncated protobuf varint");
}

function fields(data: Uint8Array): Field[] {
  const out: Field[] = [];
  let offset = 0;
  while (offset < data.length) {
    const tag = readVarint(data, offset);
    offset = tag.next;
    const number = Number(tag.value >> 3n);
    const wire = Number(tag.value & 7n);
    if (wire === 0) {
      const decoded = readVarint(data, offset);
      out.push({ number, wire, value: decoded.value });
      offset = decoded.next;
    } else if (wire === 2) {
      const size = readVarint(data, offset);
      offset = size.next;
      const end = offset + Number(size.value);
      out.push({ number, wire, value: data.subarray(offset, end) });
      offset = end;
    } else if (wire === 1) {
      offset += 8;
    } else if (wire === 5) {
      offset += 4;
    } else {
      throw new Error(`Unsupported protobuf wire type: ${wire}`);
    }
  }
  return out;
}

function stringValue(field: Field | undefined): string {
  return field?.value instanceof Uint8Array ? Buffer.from(field.value).toString("utf8") : "";
}

function numberValue(field: Field | undefined): number {
  return typeof field?.value === "bigint" ? Number(field.value) : 0;
}

export function decodeSessionResponse(body: Uint8Array): { sessionId: string; expires: number } {
  const decoded = fields(body);
  return {
    sessionId: stringValue(decoded.find((field) => field.number === 1)),
    expires: numberValue(decoded.find((field) => field.number === 2)),
  };
}

export interface ProtocolQuote {
  symbol: string;
  sequence: number;
  lastDone: number;
  timestamp: number;
  volume: number;
  currentVolume: number;
  turnover: number;
  currentTurnover: number;
  tradeSession: number;
  tag: number;
}

export function decodePushQuote(body: Uint8Array): ProtocolQuote {
  const decoded = fields(body);
  const get = (number: number) => decoded.find((field) => field.number === number);
  return {
    symbol: stringValue(get(1)),
    sequence: numberValue(get(2)),
    lastDone: Number(stringValue(get(3))),
    timestamp: numberValue(get(7)),
    volume: numberValue(get(8)),
    turnover: Number(stringValue(get(9))),
    tradeSession: numberValue(get(11)),
    currentVolume: numberValue(get(12)),
    currentTurnover: Number(stringValue(get(13))),
    tag: numberValue(get(14)),
  };
}

export interface ProtocolTrade {
  price: number;
  volume: number;
  timestamp: number;
  tradeSession: number;
}

export interface ProtocolTradePush {
  symbol: string;
  sequence: number;
  trades: ProtocolTrade[];
}

function decodeTrade(body: Uint8Array): ProtocolTrade {
  const decoded = fields(body);
  const get = (number: number) => decoded.find((field) => field.number === number);
  return {
    price: Number(stringValue(get(1))),
    volume: numberValue(get(2)),
    timestamp: numberValue(get(3)),
    tradeSession: numberValue(get(6)),
  };
}

export function decodePushTrades(body: Uint8Array): ProtocolTradePush {
  const decoded = fields(body);
  return {
    symbol: stringValue(decoded.find((field) => field.number === 1)),
    sequence: numberValue(decoded.find((field) => field.number === 2)),
    trades: decoded
      .filter((field) => field.number === 3 && field.value instanceof Uint8Array)
      .map((field) => decodeTrade(field.value as Uint8Array)),
  };
}
