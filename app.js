class BackwardsTimer {
    constructor() {
        this.projects = this.loadProjects();
        this.currentProject = null;
        this.debounceTimers = new Map();
        this.initializeUI();
        this.autoLoadLastProject();
    }

    initializeUI() {
        this.bindEvents();
        this.createInitialStream();
    }

    debounce(key, fn, delay = 1000) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            fn();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timer);
    }

    bindEvents() {
        document.getElementById('addStreamBtn').addEventListener('click', () => this.addStream());
        document.getElementById('newBtn').addEventListener('click', () => this.newProject());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveProject());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadProject());
        
        document.getElementById('projectName').addEventListener('input', (e) => {
            this.updateProjectName(e.target.value);
        });
        
        document.getElementById('targetTime').addEventListener('change', (e) => {
            this.updateTargetTime(e.target.value);
        });
    }

    createProject() {
        return {
            id: this.generateId(),
            name: '',
            targetFinishTime: null,
            streams: []
        };
    }

    createStream(name = '') {
        return {
            id: this.generateId(),
            name: name,
            tasks: []
        };
    }

    createTask(name = '', duration = 0) {
        return {
            id: this.generateId(),
            name: name,
            duration: duration, // in minutes
            startTime: null // calculated
        };
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getCurrentProject() {
        if (!this.currentProject) {
            this.currentProject = this.createProject();
        }
        return this.currentProject;
    }

    autoLoadLastProject() {
        const lastProjectId = localStorage.getItem('lastProjectId');
        if (lastProjectId && this.projects[lastProjectId]) {
            this.currentProject = this.deserializeProject({ ...this.projects[lastProjectId] });
            this.loadProjectToUI();
        }
    }

    newProject() {
        if (this.currentProject && this.hasUnsavedChanges()) {
            if (!confirm('You have unsaved changes. Start a new project anyway?')) {
                return;
            }
        }
        this.currentProject = this.createProject();
        this.clearUI();
        this.createInitialStream();
    }

    hasUnsavedChanges() {
        const project = this.getCurrentProject();
        return project.name || project.targetFinishTime || project.streams.length > 1 || 
               (project.streams.length === 1 && (project.streams[0].name || project.streams[0].tasks.length > 1));
    }

    clearUI() {
        document.getElementById('projectName').value = '';
        document.getElementById('targetTime').value = '';
        document.getElementById('streamsContainer').innerHTML = '';
        document.getElementById('timelineContainer').innerHTML = '';
    }

    updateProjectName(name) {
        this.getCurrentProject().name = name;
    }

    updateTargetTime(timeString) {
        if (timeString) {
            this.getCurrentProject().targetFinishTime = new Date(timeString);
        }
        this.autoCalculateTimeline();
    }

    addStream() {
        const project = this.getCurrentProject();
        const stream = this.createStream('');
        stream.tasks.push(this.createTask('Step 1', 30));
        project.streams.push(stream);
        this.renderStreams();
    }

    createInitialStream() {
        if (this.getCurrentProject().streams.length === 0) {
            this.addStream();
        } else {
            this.renderStreams();
        }
    }

    removeStream(streamId) {
        const project = this.getCurrentProject();
        project.streams = project.streams.filter(s => s.id !== streamId);
        this.renderStreams();
    }

    addTask(streamId) {
        const project = this.getCurrentProject();
        const stream = project.streams.find(s => s.id === streamId);
        if (stream) {
            stream.tasks.push(this.createTask(`Step ${stream.tasks.length + 1}`, 15));
            this.renderStreams();
        }
    }

    removeTask(streamId, taskId) {
        const project = this.getCurrentProject();
        const stream = project.streams.find(s => s.id === streamId);
        if (stream) {
            stream.tasks = stream.tasks.filter(t => t.id !== taskId);
            this.renderStreams();
        }
    }

    updateStreamName(streamId, name) {
        const project = this.getCurrentProject();
        const stream = project.streams.find(s => s.id === streamId);
        if (stream) {
            stream.name = name;
        }
        this.debounce(`stream-${streamId}`, () => this.autoCalculateTimeline());
    }

    updateTaskName(streamId, taskId, name) {
        const project = this.getCurrentProject();
        const stream = project.streams.find(s => s.id === streamId);
        if (stream) {
            const task = stream.tasks.find(t => t.id === taskId);
            if (task) {
                task.name = name;
            }
        }
        this.debounce(`task-${streamId}-${taskId}`, () => this.autoCalculateTimeline());
    }

    updateTaskDuration(streamId, taskId, duration) {
        const project = this.getCurrentProject();
        const stream = project.streams.find(s => s.id === streamId);
        if (stream) {
            const task = stream.tasks.find(t => t.id === taskId);
            if (task) {
                task.duration = parseInt(duration) || 0;
            }
        }
        this.debounce(`duration-${streamId}-${taskId}`, () => this.autoCalculateTimeline());
    }

    calculateTimeline() {
        const project = this.getCurrentProject();
        
        if (!project.targetFinishTime) {
            alert('Please set a target finish time');
            return;
        }

        const targetTime = project.targetFinishTime;

        project.streams.forEach(stream => {
            let currentTime = new Date(targetTime);
            
            // Calculate backwards from finish time
            for (let i = stream.tasks.length - 1; i >= 0; i--) {
                const task = stream.tasks[i];
                currentTime = new Date(currentTime.getTime() - (task.duration * 60 * 1000));
                task.startTime = new Date(currentTime);
            }
        });

        this.renderTimeline();
    }

    autoCalculateTimeline() {
        const project = this.getCurrentProject();
        
        if (!project.targetFinishTime) {
            this.renderTimeline();
            return;
        }

        const targetTime = project.targetFinishTime;

        project.streams.forEach(stream => {
            let currentTime = new Date(targetTime);
            
            // Calculate backwards from finish time
            for (let i = stream.tasks.length - 1; i >= 0; i--) {
                const task = stream.tasks[i];
                currentTime = new Date(currentTime.getTime() - (task.duration * 60 * 1000));
                task.startTime = new Date(currentTime);
            }
        });

        this.renderTimeline();
    }

    renderStreams() {
        const container = document.getElementById('streamsContainer');
        const project = this.getCurrentProject();
        
        container.innerHTML = '';
        
        project.streams.forEach(stream => {
            const streamElement = this.createStreamElement(stream);
            container.appendChild(streamElement);
        });
        
        this.attachDragListeners();
        this.autoCalculateTimeline();
    }

    createStreamElement(stream) {
        const streamDiv = document.createElement('div');
        streamDiv.className = 'stream';
        streamDiv.innerHTML = `
            <div class="stream-header">
                <input type="text" class="stream-name-input" value="${stream.name}" placeholder="Name"
                       oninput="app.updateStreamName('${stream.id}', this.value)">
                <button class="remove-stream-btn icon-btn" onclick="app.removeStream('${stream.id}')" title="Remove Stream">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </div>
            <div class="tasks-container" id="tasks-${stream.id}">
                ${stream.tasks.map(task => this.createTaskHTML(stream.id, task)).join('')}
            </div>
            <button class="add-task-btn" onclick="app.addTask('${stream.id}')">+ Add Step</button>
        `;
        return streamDiv;
    }

    createTaskHTML(streamId, task) {
        return `
            <div class="task" draggable="true" data-task-id="${task.id}" data-stream-id="${streamId}">
                <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
                <input type="text" class="task-name-input" value="${task.name}" placeholder="Step"
                       oninput="app.updateTaskName('${streamId}', '${task.id}', this.value)">
                <input type="number" class="task-duration-input" value="${task.duration}" 
                       placeholder="Minutes" min="1"
                       oninput="app.updateTaskDuration('${streamId}', '${task.id}', this.value)">
                <button class="remove-task-btn" onclick="app.removeTask('${streamId}', '${task.id}')">×</button>
            </div>
        `;
    }

    renderTimeline() {
        const container = document.getElementById('timelineContainer');
        const project = this.getCurrentProject();
        
        if (!project.targetFinishTime) {
            container.innerHTML = '<p>Set a target time and calculate to see the timeline</p>';
            return;
        }

        // Collect all tasks with their stream info and sort by start time
        const allTasks = [];
        
        project.streams.forEach(stream => {
            stream.tasks.forEach(task => {
                if (task.startTime) {
                    allTasks.push({
                        streamName: stream.name,
                        taskName: task.name,
                        duration: task.duration,
                        startTime: task.startTime,
                        isFinish: false
                    });
                }
            });
        });

        // Add finish time as the last event
        if (allTasks.length > 0) {
            allTasks.push({
                streamName: 'All Streams',
                taskName: 'Finish',
                duration: null,
                startTime: project.targetFinishTime,
                isFinish: true
            });
        }

        // Sort by start time
        allTasks.sort((a, b) => a.startTime - b.startTime);

        container.innerHTML = '';
        
        if (allTasks.length === 0) {
            container.innerHTML = '<p>No steps to display</p>';
            return;
        }

        const timelineDiv = document.createElement('div');
        timelineDiv.className = 'timeline-tasks';
        
        allTasks.forEach(item => {
            const taskDiv = document.createElement('div');
            taskDiv.className = item.isFinish ? 'timeline-task timeline-finish' : 'timeline-task';
            
            if (item.isFinish) {
                taskDiv.innerHTML = `
                    <span class="task-info">🎯 ${item.taskName}</span>
                    <span class="task-start-time">${this.formatTime(item.startTime)}</span>
                `;
            } else {
                taskDiv.innerHTML = `
                    <span class="task-info">${item.streamName} → ${item.taskName} (${item.duration}min)</span>
                    <span class="task-start-time">Start: ${this.formatTime(item.startTime)}</span>
                `;
            }
            
            timelineDiv.appendChild(taskDiv);
        });
        
        container.appendChild(timelineDiv);
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    saveProject() {
        const project = this.getCurrentProject();
        if (!project.name) {
            alert('Please enter a project name');
            return;
        }
        
        this.projects[project.id] = { ...project };
        this.saveProjects();
        localStorage.setItem('lastProjectId', project.id);
        alert('Project saved!');
    }

    loadProject() {
        const projectKeys = Object.keys(this.projects);
        if (projectKeys.length === 0) {
            alert('No saved projects found');
            return;
        }
        
        this.showProjectSelector();
    }

    showProjectSelector() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Load Project</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-content">
                    <div class="project-list">
                        ${Object.keys(this.projects).map(key => {
                            const project = this.projects[key];
                            return `
                                <div class="project-item" data-project-id="${key}">
                                    <div class="project-name">${project.name || 'Unnamed Project'}</div>
                                    <div class="project-info">
                                        ${project.streams?.length || 0} streams • 
                                        ${project.targetFinishTime ? new Date(project.targetFinishTime).toLocaleString() : 'No target time'}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Add click handlers for project items
        overlay.addEventListener('click', (e) => {
            if (e.target.closest('.project-item')) {
                const projectId = e.target.closest('.project-item').dataset.projectId;
                this.loadProjectById(projectId);
                overlay.remove();
            } else if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        document.body.appendChild(overlay);
    }

    loadProjectById(projectId) {
        if (this.projects[projectId]) {
            this.currentProject = this.deserializeProject({ ...this.projects[projectId] });
            localStorage.setItem('lastProjectId', projectId);
            this.loadProjectToUI();
        }
    }

    loadProjectToUI() {
        const project = this.getCurrentProject();
        
        document.getElementById('projectName').value = project.name || '';
        
        if (project.targetFinishTime) {
            const date = new Date(project.targetFinishTime);
            const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString().slice(0, 16);
            document.getElementById('targetTime').value = localDateTime;
        }
        
        this.renderStreams();
        this.renderTimeline();
    }

    deserializeProject(project) {
        // Convert date strings back to Date objects
        if (project.targetFinishTime) {
            project.targetFinishTime = new Date(project.targetFinishTime);
        }
        
        project.streams.forEach(stream => {
            stream.tasks.forEach(task => {
                if (task.startTime) {
                    task.startTime = new Date(task.startTime);
                }
            });
        });
        
        return project;
    }

    loadProjects() {
        try {
            const saved = localStorage.getItem('backwardsTimerProjects');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Error loading projects:', e);
            return {};
        }
    }

    saveProjects() {
        try {
            localStorage.setItem('backwardsTimerProjects', JSON.stringify(this.projects));
        } catch (e) {
            console.error('Error saving projects:', e);
        }
    }

    attachDragListeners() {
        const tasks = document.querySelectorAll('.task');
        
        tasks.forEach(task => {
            task.addEventListener('dragstart', this.handleDragStart.bind(this));
            task.addEventListener('dragover', this.handleDragOver.bind(this));
            task.addEventListener('drop', this.handleDrop.bind(this));
            task.addEventListener('dragend', this.handleDragEnd.bind(this));
        });
    }

    handleDragStart(e) {
        this.draggedElement = e.target;
        e.target.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    }

    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (this.draggedElement !== e.target) {
            const draggedStreamId = this.draggedElement.dataset.streamId;
            const draggedTaskId = this.draggedElement.dataset.taskId;
            const targetStreamId = e.target.closest('.task').dataset.streamId;
            const targetTaskId = e.target.closest('.task').dataset.taskId;

            if (draggedStreamId === targetStreamId) {
                this.reorderTasks(draggedStreamId, draggedTaskId, targetTaskId);
            }
        }

        return false;
    }

    handleDragEnd(e) {
        e.target.style.opacity = '';
        this.draggedElement = null;
    }

    reorderTasks(streamId, draggedTaskId, targetTaskId) {
        const project = this.getCurrentProject();
        const stream = project.streams.find(s => s.id === streamId);
        
        if (!stream) return;

        const draggedIndex = stream.tasks.findIndex(t => t.id === draggedTaskId);
        const targetIndex = stream.tasks.findIndex(t => t.id === targetTaskId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const draggedTask = stream.tasks.splice(draggedIndex, 1)[0];
        stream.tasks.splice(targetIndex, 0, draggedTask);

        this.renderStreams();
    }
}

// Initialize the app
const app = new BackwardsTimer();