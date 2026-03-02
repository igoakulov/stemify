/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  isPackaged: process.env.NODE_ENV !== 'development',
})
