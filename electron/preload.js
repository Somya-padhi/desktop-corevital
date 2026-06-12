const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runAudit: (config) => ipcRenderer.invoke('audit:run', config),
  cancelAudit: () => ipcRenderer.invoke('audit:cancel'),
  exportPDF: (data) => ipcRenderer.invoke('pdf:export', data),
  onAuditProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('audit:progress', listener);
    return () => ipcRenderer.removeListener('audit:progress', listener);
  },
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme)
});
