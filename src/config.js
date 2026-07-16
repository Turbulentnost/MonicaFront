/** Backend host — всегда 192.168.1.157, без подмены на localhost/hostname страницы. */
export const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.157:5612';
export const WS_URL = process.env.REACT_APP_WS_URL || 'ws://192.168.1.157:5612';
