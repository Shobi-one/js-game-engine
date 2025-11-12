import { workerManager } from './workerManager.js';

class WorkerDemo {
    constructor() {
        this.workerDemoModal = document.getElementById('worker-demo-modal');
        this.workerDemoClose = document.getElementById('worker-demo-close');
        this.openWorkerDemo = document.getElementById('open-worker-demo');

        this.statusDiv = document.getElementById('worker-status');
        this.initButton = document.getElementById('worker-init-btn');
        this.startButton = document.getElementById('worker-start-btn');
        this.stopButton = document.getElementById('worker-stop-btn');
        this.complexCalcBtn = document.getElementById('worker-complex-calc');

        this.setupModalHandlers();
        this.setupEventListeners();
        this.setupWorkerHandlers();

        this.logStatus('Worker Demo loaded. Click "Initialize Worker" to start.', 'info');
    }

    setupModalHandlers() {
        if (this.openWorkerDemo) {
            this.openWorkerDemo.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.workerDemoModal) {
                    this.workerDemoModal.show();
                }
            });
        }
    }

    setupEventListeners() {
        this.initButton.addEventListener('click', () => this.initializeWorker());
        this.startButton.addEventListener('click', () => this.startWorker());
        this.stopButton.addEventListener('click', () => this.stopWorker());
        this.complexCalcBtn.addEventListener('click', () => this.performComplexCalculation());
    }

    setupWorkerHandlers() {
        workerManager.on('READY', (payload) => {
            this.logStatus(`Worker ready: ${payload.message}`, 'success');
        });

        workerManager.on('STARTED', (payload) => {
            this.logStatus(`Worker started: ${payload.message}`, 'success');
        });

        workerManager.on('STOPPED', (payload) => {
            this.logStatus(`Worker stopped. Processed messages: ${payload.finalStats.messagesProcessed}`, 'info');
        });

        workerManager.on('HEARTBEAT', (payload) => {
            this.logStatus(`Heartbeat - Frame: ${payload.frameCount}`, 'heartbeat');
        });

        workerManager.on('COMPLEX_CALCULATION_RESULT', (payload) => {
            this.logStatus(
                `Complex calculation completed!
${payload.message}
Result: ${payload.result.toFixed(2)}
(This calculation would block the UI on the main thread)`,
                'success'
            );
        });

        workerManager.on('ERROR', (payload) => {
            this.logStatus(`Error: ${payload.message || payload.error}`, 'error');
        });
    }

    initializeWorker() {
        try {
            this.logStatus('Initializing Web Worker...', 'info');

            workerManager.initialize();

            this.initButton.disabled = true;
            this.startButton.disabled = false;
            this.stopButton.disabled = false;
            this.complexCalcBtn.disabled = false;

        } catch (error) {
            this.logStatus(`Initialization failed: ${error.message}`, 'error');
        }
    }

    startWorker() {
        this.logStatus('Starting worker...', 'info');
        workerManager.start();
    }

    stopWorker() {
        this.logStatus('Stopping worker...', 'info');
        workerManager.stop();
    }

    performComplexCalculation() {
        this.logStatus('Starting complex calculation (1,000,000 iterations)...', 'info');
        this.logStatus('Note: this calculation runs in the worker and does not block the UI!', 'info');

        workerManager.performComplexCalculation(1000000);
    }

    logStatus(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const colors = {
            info: '#0066cc',
            success: '#00aa00',
            error: '#cc0000',
            warning: '#ff8800',
            heartbeat: '#666666'
        };

        const color = colors[type] || colors.info;

        if (type === 'heartbeat') {
            const lastEntry = this.statusDiv.lastElementChild;
            if (lastEntry && lastEntry.textContent.includes('Heartbeat')) {
                lastEntry.innerHTML = `<span style="color: ${color};">[${timestamp}] ${message}</span>`;
                return;
            }
        }

        const entry = document.createElement('div');
        entry.style.marginBottom = '4px';
        entry.style.paddingBottom = '4px';
        entry.style.borderBottom = '1px solid #eee';
        entry.innerHTML = `<span style="color: ${color};">[${timestamp}] ${message}</span>`;

        this.statusDiv.appendChild(entry);

        this.statusDiv.scrollTop = this.statusDiv.scrollHeight;

        while (this.statusDiv.children.length > 20) {
            this.statusDiv.removeChild(this.statusDiv.firstChild);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new WorkerDemo();
    });
} else {
    new WorkerDemo();
}

export { WorkerDemo };
