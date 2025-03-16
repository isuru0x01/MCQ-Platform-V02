// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util';
import { Headers, Request, Response } from 'node-fetch';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.Headers = Headers;
global.Request = Request;
global.Response = Response;

// Mock environment variables
process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'ecbNGCjHuX' 