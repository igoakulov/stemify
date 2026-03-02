/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const http = require('http')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow
let server

function startStaticServer() {
  return new Promise((resolve) => {
    const outDir = app.isPackaged
      ? path.join(app.getAppPath(), 'out')
      : path.join(__dirname, '..', 'out')

    // Simple static file server using Node.js http
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    }

    server = http.createServer((req, res) => {
      let filePath = path.join(outDir, req.url === '/' ? 'index.html' : req.url)
      
      // Handle Next.js paths - remove _next prefix for actual _next folder
      if (req.url.startsWith('/_next/')) {
        filePath = path.join(outDir, req.url)
      }

      const ext = path.extname(filePath)
      const contentType = mimeTypes[ext] || 'application/octet-stream'

      fs.readFile(filePath, (err, content) => {
        if (err) {
          if (err.code === 'ENOENT') {
            // Try index.html for SPA-like behavior
            fs.readFile(path.join(outDir, 'index.html'), (err2, content2) => {
              if (err2) {
                res.writeHead(404)
                res.end('Not Found')
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html' })
                res.end(content2)
              }
            })
          } else {
            res.writeHead(500)
            res.end('Server Error')
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType })
          res.end(content)
        }
      })
    })

    server.listen(3000, '127.0.0.1', () => {
      console.log('[Server] Running on http://127.0.0.1:3000')
      resolve()
    })
  })
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    await startStaticServer()
    mainWindow.loadURL('http://127.0.0.1:3000')
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (server) {
    server.close()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
