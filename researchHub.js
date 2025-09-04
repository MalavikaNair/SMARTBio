// researchHub.js

// Global variables for Three.js scene, camera, etc., attached to window for global access
window.scene = null;
window.camera = null;
window.renderer = null;
window.group = null;
window.raycaster = null;
window.mouse = null;
window.themeNodes = [];
window.researchHubInitialized = false; // Flag to ensure initialization only runs once

// Function to initialize the Three.js research hub
window.initResearchHub = function(researchData, newsData, teamData, gamesData) {
    console.log("initResearchHub called.");

    if (window.researchHubInitialized) {
        console.log("Research Hub already initialized. Skipping.");
        return;
    }

    // Ensure THREE is defined
    if (typeof THREE === 'undefined') {
        console.error("THREE.js library not loaded. Aborting initResearchHub.");
        return;
    }
    console.log("THREE.js library detected.");

    const researchContainer = document.getElementById('research-canvas-container');
    const researchCanvas = document.getElementById('research-canvas');

    if (!researchCanvas || !researchContainer) {
        console.error("Research canvas or container not found. Cannot initialize hub.");
        return;
    }
    console.log("Research canvas and container found.");
    console.log("Canvas dimensions: ", researchContainer.clientWidth, "x", 600);

    try {

        // Initialize Three.js components
        window.scene = new THREE.Scene();
        window.camera = new THREE.PerspectiveCamera(75, researchContainer.clientWidth / 600, 0.1, 1000);
        window.renderer = new THREE.WebGLRenderer({ canvas: researchCanvas, alpha: true, antialias: true });
        window.renderer.setSize(researchContainer.clientWidth, 600);
        window.renderer.setPixelRatio(window.devicePixelRatio); // Improve rendering quality
        console.log("Three.js Scene, Camera, Renderer initialized.");

        window.group = new THREE.Group();
        window.scene.add(window.group);
        console.log("Group added to scene.");

        // Create random background points and lines (network effect)
        const points = [];
        const numPoints = 50;
        for (let i = 0; i < numPoints; i++) {
            const x = (Math.random() - 0.5) * 4;
            const y = (Math.random() - 0.5) * 4;
            const z = (Math.random() - 0.5) * 4;
            points.push(new THREE.Vector3(x, y, z));
        }
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.3 });
        for (let i = 0; i < numPoints; i++) {
            for (let j = i + 1; j < numPoints; j++) {
                if (points[i].distanceTo(points[j]) < 1.5) {
                    const geometry = new THREE.BufferGeometry().setFromPoints([points[i], points[j]]);
                    const line = new THREE.Line(geometry, lineMaterial);
                    window.group.add(line);
                }
            }
        }
        const nodeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x9ca3af });
        points.forEach(p => {
            const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
            node.position.copy(p);
            window.group.add(node);
        });
        console.log("Background network generated.");
        // Define research themes and create interactive nodes
        const themes = [
            { name: 'Sensing', color: 0x66D9EF, position: new THREE.Vector3(3, 2, 0) },
            { name: 'Modulating', color: 0xA6E22E, position: new THREE.Vector3(-3, 2, 0) },
            { name: 'Adaptive', color: 0xF92672, position: new THREE.Vector3(0, -2, 3) },
            { name: 'Regenerative', color: 0xFD971F, position: new THREE.Vector3(2, -2, -3) },
            { name: 'Therapeutic', color: 0xAE81FF, position: new THREE.Vector3(-2, -2, -3) }
        ];
        window.themeNodes = [];
        themes.forEach(theme => {
            const themeNodeGeo = new THREE.SphereGeometry(0.3, 16, 16);
            const themeNodeMat = new THREE.MeshStandardMaterial({ color: theme.color, metalness: 0.3, roughness: 0.5 });
            const themeNode = new THREE.Mesh(themeNodeGeo, themeNodeMat);
            themeNode.position.copy(theme.position);
            themeNode.name = theme.name; // For raycasting
            window.group.add(themeNode);

            const closestPoint = points.reduce((prev, curr) => prev.distanceTo(theme.position) < curr.distanceTo(theme.position) ? prev : curr);
            const connectorGeo = new THREE.BufferGeometry().setFromPoints([theme.position, closestPoint]);
            const connectorLine = new THREE.Line(connectorGeo, new THREE.LineBasicMaterial({ color: theme.color, transparent: true, opacity: 0.5 }));
            window.group.add(connectorLine);
            window.themeNodes.push(themeNode);
        });
        console.log("Theme nodes created and connected.");

        // Add lighting to the scene
        const light = new THREE.DirectionalLight(0xffffff, 1.5);
        light.position.set(5, 5, 5);
        window.scene.add(light);
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        window.scene.add(ambientLight);
        console.log("Lighting added to scene.");

        window.camera.position.z = 8;

        // Setup Raycaster for interaction
        window.raycaster = new THREE.Raycaster();
        window.mouse = new THREE.Vector2();
        console.log("Raycaster and Mouse vector initialized.");

        // Event listeners for interactivity (click and drag)
        // Ensure listeners are removed before adding to prevent duplicates
        researchCanvas.removeEventListener('click', window.onCanvasClick);
        researchCanvas.addEventListener('click', window.onCanvasClick);
        console.log("Click listener for onCanvasClick added.");

        let isMouseDown = false;
        let previousMousePosition = { x: 0, y: 0 };

        // Named functions for event listeners to ensure proper removal/addition
        const onMouseDown = (e) => { isMouseDown = true; previousMousePosition = { x: e.clientX, y: e.clientY }; };
        const onMouseUp = () => { isMouseDown = false; };
        const onMouseMove = (e) => {
            if (!isMouseDown) return;
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            window.group.rotation.y += deltaX * 0.005;
            window.group.rotation.x += deltaY * 0.005;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        };
        const onMouseLeave = () => { isMouseDown = false; };

        // Remove and re-add drag listeners
        researchCanvas.removeEventListener('mousedown', onMouseDown);
        researchCanvas.removeEventListener('mouseup', onMouseUp);
        researchCanvas.removeEventListener('mousemove', onMouseMove);
        researchCanvas.removeEventListener('mouseleave', onMouseLeave);

        researchCanvas.addEventListener('mousedown', onMouseDown);
        researchCanvas.addEventListener('mouseup', onMouseUp);
        researchCanvas.addEventListener('mousemove', onMouseMove);
        researchCanvas.addEventListener('mouseleave', onMouseLeave);
        console.log("Drag listeners added.");

        // Define animateResearchHub and assign to window
        window.animateResearchHub = function() {
            requestAnimationFrame(window.animateResearchHub);
            if (!isMouseDown) {
                window.group.rotation.y += 0.0005; // Continuous subtle rotation when not dragging
            }
            if (window.renderer && window.scene && window.camera) {
                window.renderer.render(window.scene, window.camera);
            } else {
                console.warn("Renderer, scene or camera not ready for rendering in animateResearchHub.");
            }
        }

        // Start animation loop only once
        if (!window.researchHubInitialized) {
            window.animateResearchHub();
            console.log("animateResearchHub started.");
        }

        // Handle window resize for responsiveness
        window.removeEventListener('resize', window.onResearchCanvasResize);
        window.onResearchCanvasResize = function() {
            if (researchCanvas.offsetParent !== null && window.camera && window.renderer) {
                window.camera.aspect = researchContainer.clientWidth / 600;
                window.camera.updateProjectionMatrix();
                window.renderer.setSize(researchContainer.clientWidth, 600);
                window.renderer.render(window.scene, window.camera); // Force a render on resize
                console.log("Canvas resized and re-rendered.");
            } else {
                console.log("Skipping resize: canvas not visible or Three.js components not ready.");
            }
        }
        window.addEventListener('resize', window.onResearchCanvasResize);
        console.log("Resize listener added.");

        window.researchHubInitialized = true; // Set flag to true after successful initialization
        console.log("Research Hub initialization complete.");

        // Perform an initial render immediately after setup
        if (window.renderer && window.scene && window.camera) {
            window.renderer.render(window.scene, window.camera);
            console.log("Initial render performed.");
        }

    } catch (e) {
        console.error("Error during initResearchHub execution:", e);
    }
}

// Function to handle clicks on theme nodes (made global)
window.onCanvasClick = function(event) {
    console.log("onCanvasClick triggered.");
    const researchCanvas = document.getElementById('research-canvas');
    if (!researchCanvas) {
        console.warn("onCanvasClick: research-canvas not found.");
        return;
    }

    if (!window.raycaster || !window.mouse || !window.camera || !window.themeNodes) {
        console.error("Raycaster, mouse, camera, or themeNodes not initialized for onCanvasClick.");
        return;
    }

    const rect = researchCanvas.getBoundingClientRect();
    window.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    window.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    window.raycaster.setFromCamera(window.mouse, window.camera);
    const intersects = window.raycaster.intersectObjects(window.themeNodes);

    if (intersects.length > 0) {
        const themeName = intersects[0].object.name;
        console.log("Theme node clicked:", themeName);
        // Data objects are now expected to be globally available or passed
        // Ensure data is available before calling updateDynamicContent
        if (window.researchData && window.newsData && window.teamData && window.gamesData && window.outreachTalksData && window.academicPresentationsData) {
            window.updateDynamicContent(themeName, window.researchData, window.newsData, window.teamData, window.gamesData, window.outreachTalksData, window.academicPresentationsData);
        } else {
            console.error("Data (researchData, newsData, etc.) not available for updateDynamicContent.");
        }
    } else {
        console.log("No theme node clicked.");
    }
}

// Function to update the content panel based on selected theme (made global)
window.updateDynamicContent = function(themeName, researchData, newsData, teamData, gamesData, outreachTalksData, academicPresentationsData) {
    console.log("updateDynamicContent called for theme:", themeName);
    const contentGrid = document.getElementById('dynamic-content-grid');
    const contentTitle = document.getElementById('dynamic-content-title');
    if (!contentGrid || !contentTitle) {
        console.warn("Dynamic content grid or title not found.");
        return;
    }

    contentTitle.textContent = `${themeName} Theme`;
    contentGrid.innerHTML = ''; // Clear previous content

    const relatedResearch = researchData.filter(r => r.themes.includes(themeName));
    const relatedNews = newsData.filter(n => n.themes.includes(themeName));
    const relatedTeam = teamData.filter(t => t.themes.includes(themeName));
    const relatedGames = gamesData.filter(g => g.themes.includes(themeName)); // Filter related games
    // Filter related outreach talks and academic presentations
    const relatedOutreachTalks = outreachTalksData.filter(talk => talk.themes.includes(themeName));
    const relatedAcademicPresentations = academicPresentationsData.filter(pres => pres.themes.includes(themeName));


    if(relatedResearch.length > 0) contentGrid.innerHTML += `<h4 class="font-bold text-lg text-light-text border-b border-primary/20 pb-1">Projects</h4>`;
    relatedResearch.forEach(item => {
        contentGrid.innerHTML += `<div class="text-sm p-2 rounded-md bg-slate-800/50">${item.title}</div>`;
    });

    if(relatedNews.length > 0) contentGrid.innerHTML += `<h4 class="font-bold text-lg text-light-text border-b border-primary/20 pb-1 mt-4">News</h4>`;
    relatedNews.forEach(item => {
        contentGrid.innerHTML += `<div class="text-sm p-2 rounded-md bg-slate-800/50">${item.title}</div>`;
    });

    if(relatedTeam.length > 0) contentGrid.innerHTML += `<h4 class="font-bold text-lg text-light-text border-b border-primary/20 pb-1 mt-4">Team</h4>`;
    relatedTeam.forEach(item => {
        contentGrid.innerHTML += `
        <div class="flex items-center gap-2 p-2 rounded-md bg-slate-800/50">
            <img src="${item.image}" class="w-8 h-8 rounded-full">
            <span class="flex-grow text-sm">${item.name}</span>
            <button data-modal-target="${item.id}" class="open-modal-btn text-xs text-primary hover:underline">Bio</button>
        </div>`;
    });

    // Add games to dynamic content
    if(relatedGames.length > 0) contentGrid.innerHTML += `<h4 class="font-bold text-lg text-light-text border-b border-primary/20 pb-1 mt-4">Games</h4>`;
    relatedGames.forEach(item => {
        contentGrid.innerHTML += `
        <div class="flex items-center gap-2 p-2 rounded-md bg-slate-800/50">
            <img src="${item.thumbnail}" class="w-8 h-8 rounded-full">
            <span class="flex-grow text-sm">${item.title}</span>
            <a href="${item.file}" target="_blank" class="text-xs text-primary hover:underline">Play</a>
        </div>`;
    });

    // MODIFIED: Add Outreach Talks to dynamic content
    if(relatedOutreachTalks.length > 0) contentGrid.innerHTML += `<h4 class="font-bold text-lg text-light-text border-b border-primary/20 pb-1 mt-4">Outreach Talks</h4>`;
    relatedOutreachTalks.forEach(item => {
        let speakerNames = [];
        if (item.speakerIds && Array.isArray(item.speakerIds)) {
            item.speakerIds.forEach(speakerId => {
                const speaker = teamData.find(member => member.id === speakerId) ||
                               alumniData.find(alumni => alumni.id === speakerId); // Check alumni too
                if (speaker) {
                    speakerNames.push(speaker.name);
                }
            });
        }
        const speakersText = speakerNames.length > 0 ? speakerNames.join(', ') : 'N/A';
        contentGrid.innerHTML += `
        <div class="text-sm p-2 rounded-md bg-slate-800/50">
            <p class="font-semibold">${item.title}</p>
            <p class="text-xs text-light-text/70">Speaker(s): ${speakersText}</p>
        </div>`;
    });

    // MODIFIED: Add Academic Presentations to dynamic content
    if(relatedAcademicPresentations.length > 0) contentGrid.innerHTML += `<h4 class="font-bold text-lg text-light-text border-b border-primary/20 pb-1 mt-4">Academic Presentations</h4>`;
    relatedAcademicPresentations.forEach(item => {
        let speakerNames = [];
        if (item.speakerIds && Array.isArray(item.speakerIds)) {
            item.speakerIds.forEach(speakerId => {
                const speaker = teamData.find(member => member.id === speakerId) ||
                               alumniData.find(alumni => alumni.id === speakerId); // Check alumni too
                if (speaker) {
                    speakerNames.push(speaker.name);
                }
            });
        }
        const speakersText = speakerNames.length > 0 ? speakerNames.join(', ') : 'N/A';
        contentGrid.innerHTML += `
        <div class="text-sm p-2 rounded-md bg-slate-800/50">
            <p class="font-semibold">${item.title}</p>
            <p class="text-xs text-light-text/70">Speaker(s): ${speakersText}</p>
        </div>`;
    });

    console.log("Dynamic content updated.");
}
