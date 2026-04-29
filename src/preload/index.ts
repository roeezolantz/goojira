import { contextBridge, ipcRenderer } from 'electron';
import type {
  IpcChannel,
  IpcRequest,
  IpcResponse,
  IpcEvent,
  IpcEventPayload,
  PreloadApi,
} from '@shared/types';

function detectWindowKind(): 'popover' | 'settings' {
  const arg = process.argv.find((a) => a.startsWith('--window-kind='));
  return arg && arg.endsWith('settings') ? 'settings' : 'popover';
}

const api: PreloadApi = {
  invoke<C extends IpcChannel>(
    channel: C,
    ...args: IpcRequest<C> extends void ? [] : [IpcRequest<C>]
  ): Promise<IpcResponse<C>> {
    return ipcRenderer.invoke(channel, args[0] as unknown);
  },
  on<E extends IpcEvent>(event: E, handler: (payload: IpcEventPayload<E>) => void): () => void {
    const listener = (_e: Electron.IpcRendererEvent, payload: IpcEventPayload<E>) =>
      handler(payload);
    ipcRenderer.on(event, listener);
    return () => ipcRenderer.removeListener(event, listener);
  },
  windowKind: detectWindowKind(),
};

contextBridge.exposeInMainWorld('api', api);
