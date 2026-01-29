import { Socket } from 'socket.io-client';

export async function sendRemoteCommand<T = any>(
  socket: Socket,
  command: string,
  args: any[] = [],
): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = `${command}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    socket.emit('command', { command, args, requestId }, (response: any) => {
      if (response?.success) {
        resolve(response.data as T);
      } else {
        reject(new Error(response?.error || 'Remote command failed'));
      }
    });
  });
}
