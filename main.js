class SolarSystem {
    constructor() {
        // basic 3D setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });

        //clock stuff
        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.isPlaying = true;
        this.masterSpeed = 1.0;
        this.autoRotate = false;
        this.autoRotateSpeed = 0.5;
        this.showAxialTilt = false;

        //camera positioning
        this.cameraDistance = 300;
        this.cameraAngleX = 0.5;
        this.cameraAngleY = 0.3;
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        this.cameraOffset = new THREE.Vector3(0, 0, 0);

        this.mouseDown = false;
        this.rightMouseDown = false;
        this.lastMousePosition = { x: 0, y: 0 };

        //scene objects
        this.sun = null;
        this.planets = [];
        this.planetMeshes = [];
        this.orbitLines = [];
        this.axialLines = [];


        //info for each planet
        this.planetData = [
            { name: 'Mercury', size: 3.8, distance: 60, color: 0x8c7853, speed: 4.15, axialTilt: 0.1, info: 'Closest to the Sun. Extremely hot during day, very cold at night.' },
            { name: 'Venus', size: 9.5, distance: 80, color: 0xffc649, speed: 1.62, axialTilt: -2.6, info: 'Hottest planet due to greenhouse effect. Thick toxic atmosphere.' },
            { name: 'Earth', size: 10, distance: 105, color: 0x6b93d6, speed: 1.0, axialTilt: 0.41, info: 'Our home planet. Only known planet with life.' },
            { name: 'Mars', size: 5.3, distance: 130, color: 0xc1440e, speed: 0.53, axialTilt: 0.44, info: 'The Red Planet. Has polar ice caps and the largest volcano in the solar system.' },
            { name: 'Jupiter', size: 25, distance: 180, color: 0xd8ca9d, speed: 0.084, axialTilt: 0.05, info: 'Largest planet. Gas giant with Great Red Spot storm.' },
            { name: 'Saturn', size: 21, distance: 230, color: 0xfad5a5, speed: 0.034, axialTilt: 0.47, info: 'Famous for its beautiful ring system. Less dense than water.' },
            { name: 'Uranus', size: 15, distance: 280, color: 0x4fd0e7, speed: 0.012, axialTilt: 1.71, info: 'Ice giant tilted on its side. Has faint rings.' },
            { name: 'Neptune', size: 14, distance: 330, color: 0x4b70dd, speed: 0.006, axialTilt: 0.49, info: 'Windiest planet with speeds up to 2,100 km/h.' }
        ];

        this.init();
    }

    init() {
        this.setupRenderer();
        this.setupLighting();
        this.createStarfield();
        this.createSun();
        this.createPlanets();
        this.setupControls();
        this.setupEventListeners();
        this.updateCamera();
        this.animate();
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        //for shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.renderer.setClearColor(0x000000);
        this.renderer.domElement.style.cursor = 'grab'; //change cursor type

        //attach canvas to DOM
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        const sunLight = new THREE.PointLight(0xffffff, 2, 2000);
        sunLight.position.set(0, 0, 0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);
    }

    createStarfield() {
        //to generate random stars in the space
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const colors = [];

        for (let i = 0; i < 2000; i++) {
            vertices.push((Math.random() - 0.5) * 4000,
            (Math.random() - 0.5) * 4000,
            (Math.random() - 0.5) * 4000
        );

            const color = new THREE.Color();
            color.setHSL(Math.random() * 0.1 + 0.5, 0.5, Math.random() * 0.5 + 0.5);
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({ size: 3, vertexColors: true, transparent: true, opacity: 0.8 });
        const stars = new THREE.Points(geometry, material);
        this.scene.add(stars);
    }

    createSun() {

        const geometry = new THREE.SphereGeometry(18, 32, 32); //makes the sphere
        
        //adds light
        const material = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            emissive: 0xffd700,
            emissiveIntensity: 0.4 
        });
        
        this.sun = new THREE.Mesh(geometry, material);
        this.sun.userData = { name: 'Sun', type: 'star' };
        this.scene.add(this.sun);
    }

    createPlanets() {
        //loop for each planet
        this.planetData.forEach((data, index) => {
            //create the planet
            const geometry = new THREE.SphereGeometry(data.size, 20, 20);
            const material = new THREE.MeshLambertMaterial({ 
                color: data.color,
                emissive: data.color,
                emissiveIntensity: 0.05 
            });
            
            const planet = new THREE.Mesh(geometry, material);
            planet.castShadow = true;
            planet.receiveShadow = true;
            planet.userData = { name: data.name, type: 'planet', info: data.info, distance: data.distance, size: data.size };
            planet.rotation.z = data.axialTilt;

            //the axial tilt (to show it revolves around axis too) hidden start m
            const axialGeometry = new THREE.BufferGeometry();
            const axialVertices = new Float32Array([0, -data.size * 1.5, 0, 0, data.size * 1.5, 0]);
            axialGeometry.setAttribute('position', new THREE.BufferAttribute(axialVertices, 3));
            const axialMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
            const axialLine = new THREE.Line(axialGeometry, axialMaterial);
            axialLine.rotation.z = data.axialTilt;
            axialLine.visible = false;
            planet.add(axialLine);
            this.axialLines.push(axialLine);

            //orbits
            const planetSystem = new THREE.Group();
            planetSystem.add(planet);
            planet.position.x = data.distance;
            planetSystem.userData = {
                planet: planet,
                distance: data.distance,
                speed: data.speed,
                baseSpeed: data.speed,
                angle: Math.random() * Math.PI * 2,
                rotationSpeed: Math.random() * 0.02 + 0.01
            };
            this.scene.add(planetSystem);
            this.planets.push(planetSystem);
            this.planetMeshes.push(planet);

            //orbit ring
            const orbitGeometry = new THREE.RingGeometry(data.distance - 0.5, data.distance + 0.5, 64);
            const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
            const orbitRing = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbitRing.rotation.x = Math.PI / 2;
            this.scene.add(orbitRing);
            this.orbitLines.push(orbitRing);

            //saturn rings
            if (data.name === 'Saturn') {
                const ringGeometry = new THREE.RingGeometry(data.size * 1.2, data.size * 1.8, 48);
                const ringMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
                const rings = new THREE.Mesh(ringGeometry, ringMaterial);
                rings.rotation.x = Math.PI / 2;
                rings.rotation.z = data.axialTilt;
                planet.add(rings);
            }
        });
    }

    setupControls() {
        //slider for each plabet
        const planetControlsContainer = document.getElementById('planet-controls');
        this.planetData.forEach((data, index) => {
            const controlDiv = document.createElement('div');
            controlDiv.className = 'planet-control';
            controlDiv.innerHTML = `
                <h4>${data.name}</h4>
                <div class="control-group">
                    <label>Speed:</label>
                    <input type="range" id="planet-speed-${index}" min="0" max="10" step="0.1" value="${data.speed}">
                    <span id="planet-speed-value-${index}">${data.speed.toFixed(1)}x</span>
                </div>`;

            planetControlsContainer.appendChild(controlDiv);

            const speedSlider = document.getElementById(`planet-speed-${index}`);
            const speedValue = document.getElementById(`planet-speed-value-${index}`);
            
            //update speed with slider
            speedSlider.addEventListener('input', (e) => {
                const newSpeed = parseFloat(e.target.value);
                this.planets[index].userData.speed = newSpeed;
                speedValue.textContent = newSpeed.toFixed(1) + 'x';
            });
        });
    }

     
    setupEventListeners() {

        //master speed control
        document.getElementById('master-speed').addEventListener('input', (e) => {
            this.masterSpeed = parseFloat(e.target.value);
            document.getElementById('master-speed-value').textContent = this.masterSpeed.toFixed(1) + 'x';
        });

        //play pause buttons
        document.getElementById('play-pause').addEventListener('click', (e) => {
            this.isPlaying = !this.isPlaying;
            e.target.textContent = this.isPlaying ? '⏸️ Pause' : '▶️ Play';
        });

        //reset button
        document.getElementById('reset').addEventListener('click', () => {
            this.planets.forEach(p => p.userData.angle = Math.random() * Math.PI * 2);
            this.cameraTarget.set(0, 0, 0);
            this.cameraOffset.set(0, 0, 0);
            this.cameraDistance = 300;
        });

        //focus on sun button
        document.getElementById('focus-sun').addEventListener('click', () => {
            this.cameraTarget.set(0, 0, 0);
            this.cameraOffset.set(0, 0, 0);
            this.cameraDistance = 200;
        });

        //auto rotate
        document.getElementById('auto-rotate').addEventListener('click', (e) => {
            this.autoRotate = !this.autoRotate;
            e.target.classList.toggle('active');
        });

        //axial tilt
        document.getElementById('toggle-axial').addEventListener('click', (e) => {
            this.showAxialTilt = !this.showAxialTilt;
            e.target.classList.toggle('active');
            this.axialLines.forEach(line => line.visible = this.showAxialTilt);
        });

        //dark light mode
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const body = document.body;
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            body.setAttribute('data-theme', newTheme);
            document.getElementById('theme-toggle').textContent = newTheme === 'light' ? '☀️' : '🌙';
        });

        //mouse motions
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.lastMousePosition = { x: e.clientX, y: e.clientY };
            if (e.button === 0) this.mouseDown = true;
            else if (e.button === 2) this.rightMouseDown = true;
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            const deltaX = e.clientX - this.lastMousePosition.x;
            const deltaY = e.clientY - this.lastMousePosition.y;

            if (this.mouseDown) {
                this.cameraAngleX += deltaX * 0.01;
                this.cameraAngleY += deltaY * 0.01;
                this.cameraAngleY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraAngleY));
            } else if (this.rightMouseDown) {
                const panSpeed = this.cameraDistance * 0.001;
                const right = new THREE.Vector3();
                const up = new THREE.Vector3();
                this.camera.getWorldDirection(new THREE.Vector3());
                right.crossVectors(this.camera.up, this.camera.getWorldDirection(new THREE.Vector3())).normalize();
                up.copy(this.camera.up);
                this.cameraOffset.add(right.multiplyScalar(deltaX * panSpeed));
                this.cameraOffset.add(up.multiplyScalar(-deltaY * panSpeed));
            }

            this.lastMousePosition = { x: e.clientX, y: e.clientY };
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.checkIntersections();
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            this.mouseDown = false;
            this.rightMouseDown = false;
        });

        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.cameraDistance += e.deltaY * 0.5;
            this.cameraDistance = Math.max(30, Math.min(1000, this.cameraDistance));
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    checkIntersections() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects([this.sun, ...this.planetMeshes]);
        const tooltip = document.getElementById('tooltip');
        if (intersects.length > 0) {
            const object = intersects[0].object;
            const userData = object.userData;
            if (userData.type === 'planet') {
                this.showPlanetInfo(userData);
                tooltip.innerHTML = `
                    <strong>${userData.name}</strong><br>
                    Distance: ${userData.distance} AU<br>
                    Size: ${userData.size.toFixed(1)} units
                `;
            } else if (userData.type === 'star') {
                tooltip.innerHTML = `
                    <strong>Sun</strong><br>
                    Our star - center of the solar system
                `;
            }
            tooltip.style.left = (this.mouse.x + 1) * window.innerWidth / 2 + 'px';
            tooltip.style.top = (-this.mouse.y + 1) * window.innerHeight / 2 + 'px';
            tooltip.classList.add('visible');
        } else {
            tooltip.classList.remove('visible');
        }
    }

    showPlanetInfo(userData) {
        //show planet info
        const infoPanel = document.getElementById('planet-info');
        infoPanel.innerHTML = `
            <h3>${userData.name}</h3>
            <p><strong>Distance from Sun:</strong> ${userData.distance} AU</p>
            <p><strong>Size:</strong> ${userData.size.toFixed(1)} units</p>
            <p><strong>Info:</strong> ${userData.info}</p>
        `;
    }

    updateCamera() {
        //spin if autorotate
        if (this.autoRotate) {
            this.cameraAngleX += this.autoRotateSpeed * 0.01;
        }

        const x = Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance;
        const y = Math.sin(this.cameraAngleY) * this.cameraDistance;
        const z = Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance;

        this.camera.position.set(
            this.cameraTarget.x + this.cameraOffset.x + x,
            this.cameraTarget.y + this.cameraOffset.y + y,
            this.cameraTarget.z + this.cameraOffset.z + z
        );
        this.camera.lookAt(this.cameraTarget);
    }

    //animations
    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        
        if (this.isPlaying) {
            this.sun.rotation.y += 0.005 * this.masterSpeed;
            this.planets.forEach(planetSystem => {
                const data = planetSystem.userData;
                if (data.speed === 0) {
                    data.speed = data.baseSpeed || 1;
                }
                data.angle += data.speed * 0.01 * this.masterSpeed;
                planetSystem.rotation.y = data.angle;
                data.planet.rotation.y += data.rotationSpeed * this.masterSpeed;
            });
        }
        this.updateCamera();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start app
window.addEventListener('DOMContentLoaded', () => {
    const solar = new SolarSystem();
    // Add spacing to orbits
    const spacing = 90;
    solar.planetData.forEach((planet, index) => {
        planet.distance = 120 + index * spacing;
    });
});