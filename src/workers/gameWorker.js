let workerState = {
  isRunning: false,
  frameCount: 0,
  stats: {
    messagesProcessed: 0,
    calculationsPerformed: 0,
    startTime: null
  }
};

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'START':
      handleStart(payload);
      break;
    
    case 'STOP':
      handleStop();
      break;
    
    case 'COMPLEX_CALCULATION':
      handleComplexCalculation(payload);
      break;
    
    default:
      self.postMessage({
        type: 'ERROR',
        payload: { message: `Unknown message type: ${type}` }
      });
  }
  
  workerState.stats.messagesProcessed++;
});

function handleStart(payload) {
  workerState.isRunning = true;
  workerState.stats.startTime = Date.now();
  workerState.frameCount = 0;
  
  self.postMessage({
    type: 'STARTED',
    payload: {
      message: 'Worker started successfully',
      timestamp: Date.now()
    }
  });
}

function handleStop() {
  workerState.isRunning = false;
  
  self.postMessage({
    type: 'STOPPED',
    payload: {
      message: 'Worker stopped',
      finalStats: workerState.stats,
      timestamp: Date.now()
    }
  });
}

function handleComplexCalculation(payload) {
  const { iterations = 1000000 } = payload;
  
  const startTime = performance.now();
  let result = 0;
  
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i / 1000);
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  workerState.stats.calculationsPerformed++;
  
  self.postMessage({
    type: 'COMPLEX_CALCULATION_RESULT',
    payload: {
      result,
      duration,
      iterations,
      message: `Completed ${iterations.toLocaleString()} iterations in ${duration.toFixed(2)}ms`
    }
  });
}

setInterval(() => {
  if (workerState.isRunning) {
    workerState.frameCount++;
    
    self.postMessage({
      type: 'HEARTBEAT',
      payload: {
        frameCount: workerState.frameCount,
        timestamp: Date.now()
      }
    });
  }
}, 1000);

self.postMessage({
  type: 'READY',
  payload: {
    message: 'Worker initialized and ready',
    timestamp: Date.now()
  }
});
