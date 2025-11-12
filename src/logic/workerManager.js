class WorkerManager {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.messageHandlers = new Map();
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0
    };
  }

  initialize() {
    if (this.isInitialized) {
      console.warn('Worker already initialized');
      return;
    }

    try {
      this.worker = new Worker('/src/workers/gameWorker.js', { type: 'module' });
    
      this.worker.addEventListener('message', (event) => {
        this.handleWorkerMessage(event);
      });

      this.worker.addEventListener('error', (error) => {
        console.error('Worker error:', error);
        this.stats.errors++;
        this.triggerHandler('ERROR', { error: error.message });
      });

      this.isInitialized = true;
      console.log('✓ Web Worker initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      throw error;
    }
  }

  handleWorkerMessage(event) {
    const { type, payload } = event.data;
    this.stats.messagesReceived++;
    
    console.log(`[Worker → Main] ${type}:`, payload);
    this.triggerHandler(type, payload);
  }

  sendMessage(type, payload = {}) {
    if (!this.isInitialized) {
      console.error('Worker not initialized.');
      return;
    }

    try {
      this.worker.postMessage({ type, payload });
      this.stats.messagesSent++;
      console.log(`[Main → Worker] ${type}:`, payload);
    } catch (error) {
      console.error('Failed to send message to worker:', error);
      this.stats.errors++;
    }
  }

  on(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType).push(handler);
  }

  off(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) return;
    
    const handlers = this.messageHandlers.get(messageType);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  triggerHandler(messageType, payload) {
    if (!this.messageHandlers.has(messageType)) return;
    
    const handlers = this.messageHandlers.get(messageType);
    handlers.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in handler for ${messageType}:`, error);
      }
    });
  }

  start() {
    this.sendMessage('START', { timestamp: Date.now() });
  }

  stop() {
    this.sendMessage('STOP', { timestamp: Date.now() });
  }

  getStats() {
    this.sendMessage('GET_STATS');
  }

  performComplexCalculation(iterations = 1000000) {
    this.sendMessage('COMPLEX_CALCULATION', { iterations });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('Worker terminated');
    }
  }

  getManagerStats() {
    return { ...this.stats };
  }
}

const workerManager = new WorkerManager();
export { WorkerManager, workerManager };
