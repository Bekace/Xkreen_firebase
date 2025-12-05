// Monaco Editor Environment Configuration
// This fixes the "You must define a function MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker" error

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorkerUrl?: (workerId: string, label: string) => string
      getWorker?: (workerId: string, label: string) => Worker
    }
  }
}

// Configure Monaco Environment to prevent worker errors
if (typeof window !== "undefined") {
  window.MonacoEnvironment = {
    getWorkerUrl: (workerId: string, label: string) => {
      // Return a data URL that creates a minimal worker
      // This prevents the Monaco Editor from trying to load external worker files
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        self.MonacoEnvironment = {
          baseUrl: 'https://unpkg.com/monaco-editor@0.34.0/min/'
        };
        importScripts('https://unpkg.com/monaco-editor@0.34.0/min/vs/base/worker/workerMain.js');
      `)}`
    },
  }
}

export {}
