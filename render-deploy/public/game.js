import * as THREE from 'three';

class Game {
    constructor() {
        try {
            // Initialize Three.js scene
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 10000); // Increased far plane
            
            // Check if device is mobile
            this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            console.log('Is mobile device:', this.isMobile);
            
            // Initialize WebSocket connection
            this.socket = null;
            this.playerId = null;
            this.otherPlayers = new Map();
            this.connectToServer();
            
            // Initialize plane state early
            this.planeState = {
                isInPlane: false,
                plane: null,
                originalCameraOffset: new THREE.Vector3(0, 2, 6),
                planeCameraOffset: new THREE.Vector3(0, 5, 20),
                speed: 0,
                maxSpeed: 500,
                minSpeed: 0,  // Changed to 0
                turnSpeed: 0.02,
                pitchSpeed: 0.015,
                altitude: 0,
                minAltitude: 10,
                maxAltitude: 2000,
                // New physics properties
                pitch: 0,
                roll: 0,
                maxPitch: Math.PI / 4,  // 45 degrees
                maxRoll: Math.PI / 2,   // 90 degrees
                drag: 0.98,             // Air resistance
                liftFactor: 0.1         // Lift generation
            };
            
            // Mouse position tracking
            this.mousePosition = {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            };
            
            // Create crosshair overlay
            this.createCrosshair();
            
            // Camera settings for third person view
            this.cameraOffset = new THREE.Vector3(0, 2, 6); // Closer camera, slightly higher
            this.cameraTarget = new THREE.Vector3(0, 2.0, 0); // Increased from 1.5 to 2.0 for higher aim point
            this.cameraShake = {
                enabled: false,
                intensity: 0.3,
                decay: 0.9,
                offset: new THREE.Vector3(0, 0, 0)
            };
            
            // Add aim state
            this.aimState = {
                direction: new THREE.Vector3(0, 0, -1),
                shoulderOffset: new THREE.Vector3(0.5, 0, 0), // Offset for over-the-shoulder view
                isAiming: false
            };

            // Initialize renderer with better shadows
            this.renderer = new THREE.WebGLRenderer({
                canvas: document.querySelector('#gameCanvas'),
                antialias: true
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setClearColor(0x87CEEB);

            // Create water plane
            const waterGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
            const waterMaterial = new THREE.MeshBasicMaterial({
                color: 0x0099ff,
                transparent: true,
                opacity: 0.6
            });
            this.water = new THREE.Mesh(waterGeometry, waterMaterial);
            this.water.rotation.x = Math.PI / 2;
            this.water.position.y = -5;
            this.scene.add(this.water);
            
            // Store water vertices for animation
            this.waterVertices = waterGeometry.attributes.position;

            // Create ground plane (now a beach!)
            const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
            const groundMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xf4d03f, // Sandy color
                side: THREE.DoubleSide
            });
            this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
            this.ground.rotation.x = Math.PI / 2;
            this.ground.position.y = -2;
            this.scene.add(this.ground);

            // Water balloons array
            this.waterBalloons = [];
            this.targets = [];

            // Create a simple player representation (cube)
            const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
            const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            this.playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
            this.scene.add(this.playerMesh);

            // Player position and movement
            this.player = {
                position: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Euler(0, 0, 0),
                velocity: new THREE.Vector3(0, 0, 0),
                isJumping: false,
                verticalAim: 0  // Add vertical aim angle
            };

            // Set initial positions
            this.playerMesh.position.set(0, 0, 0);
            this.updateCameraPosition();

            // Game state
            this.isGameStarted = false;
            this.isMouseDown = false;
            this.lastBalloonTime = 0;
            this.balloonSpawnInterval = 100;
            this.keys = {
                w: false,
                s: false,
                a: false,
                d: false,
                shift: false,
                space: false
            };

            // Create world objects
            this.createWorldObjects();
            
            // Set up event listeners
            this.setupControls();
            window.addEventListener('resize', () => this.handleResize());
            
            // Start the game loop
            this.lastTime = performance.now();
            this.animate();

            this.raycaster = new THREE.Raycaster();
            this.aimVector = new THREE.Vector2();

            console.log('Game initialized successfully');
        } catch (error) {
            console.error('Error initializing game:', error);
            alert('Error initializing game: ' + error.message);
        }
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    createWorldObjects() {
        // Make the world ABSOLUTELY ENORMOUS
        const WORLD_SIZE = 10000; // More than tripled from 3000
        const WATER_SIZE = 20000; // More than tripled from 6000
        
        // Update water and ground planes with massive size
        const waterGeometry = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE, 300, 300);
        const waterMaterial = new THREE.MeshBasicMaterial({
            color: 0x0099ff,
            transparent: true,
            opacity: 0.6
        });
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = Math.PI / 2;
        this.water.position.y = -5;
        this.scene.add(this.water);
        
        this.waterVertices = waterGeometry.attributes.position;

        const groundGeometry = new THREE.PlaneGeometry(WATER_SIZE, WATER_SIZE);
        const groundMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xf4d03f,
            side: THREE.DoubleSide
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = Math.PI / 2;
        this.ground.position.y = -2;
        this.scene.add(this.ground);

        // Create airplane
        this.createAirplane();

        // Create even more varied objects
        const objects = [
            { geometry: new THREE.BoxGeometry(3, 3, 3), color: 0x9b59b6, count: 540 },
            { geometry: new THREE.SphereGeometry(2), color: 0xe74c3c, count: 450 },
            { geometry: new THREE.ConeGeometry(2, 4), color: 0x2ecc71, count: 360 },
            { geometry: new THREE.TorusGeometry(2, 0.5), color: 0x3498db, count: 270 },
            { geometry: new THREE.TetrahedronGeometry(2), color: 0xf1c40f, count: 315 },
            { geometry: new THREE.OctahedronGeometry(2), color: 0xe67e22, count: 225 },
            { geometry: new THREE.IcosahedronGeometry(2), color: 0x1abc9c, count: 180 },
            { geometry: new THREE.TorusKnotGeometry(1, 0.4), color: 0x9b59b6, count: 135 }
        ];

        // Generate random positions with more complex clustering
        objects.forEach(obj => {
            obj.positions = [];
            const clusterCount = Math.floor(obj.count / 8); // Larger clusters
            
            // Create main clusters
            for (let cluster = 0; cluster < clusterCount; cluster++) {
                const clusterX = (Math.random() - 0.5) * (WORLD_SIZE * 0.9);
                const clusterZ = (Math.random() - 0.5) * (WORLD_SIZE * 0.9);
                
                // Create sub-clusters within main clusters
                const subClusterCount = 3;
                for (let subCluster = 0; subCluster < subClusterCount; subCluster++) {
                    const subClusterOffset = {
                        x: (Math.random() - 0.5) * 40,
                        z: (Math.random() - 0.5) * 40
                    };
                    
                    // Add objects to sub-cluster
                    for (let i = 0; i < 8; i++) {
                        const spread = 20;
                        const x = clusterX + subClusterOffset.x + (Math.random() - 0.5) * spread;
                        const z = clusterZ + subClusterOffset.z + (Math.random() - 0.5) * spread;
                        obj.positions.push({ 
                            x, 
                            z,
                            scale: 0.5 + Math.random() * 2 // Random scaling for variety
                        });
                    }
                }
            }
            
            // Add remaining objects randomly
            for (let i = clusterCount * 24; i < obj.count; i++) {
                const x = (Math.random() - 0.5) * WORLD_SIZE;
                const z = (Math.random() - 0.5) * WORLD_SIZE;
                obj.positions.push({ 
                    x, 
                    z,
                    scale: 0.5 + Math.random() * 2
                });
            }
        });

        // Create and add objects to scene with more variety
        objects.forEach(obj => {
            obj.positions.forEach(pos => {
                const material = new THREE.MeshBasicMaterial({ 
                    color: obj.color,
                    transparent: Math.random() > 0.8, // Some objects are transparent
                    opacity: Math.random() * 0.5 + 0.5
                });
                const mesh = new THREE.Mesh(obj.geometry, material);
                mesh.position.set(pos.x, pos.scale * 2, pos.z); // Varied heights
                mesh.scale.set(pos.scale, pos.scale, pos.scale);
                mesh.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI
                );
                this.scene.add(mesh);
                this.targets.push(mesh);
            });
        });

        // Store buildings and trees
        this.trees = [];
        this.buildings = [];

        // Create more building clusters
        const buildingCount = 450; // Tripled from 150
        const buildingTypes = [
            // Original buildings
            {
                width: 12,
                depth: 12,
                height: 8,
                color: 0xcccccc,
                roofColor: 0x8b4513
            },
            {
                width: 15,
                depth: 10,
                height: 10,
                color: 0xd3b17d,
                roofColor: 0x654321
            },
            {
                width: 8,
                depth: 8,
                height: 12,
                color: 0xa0522d,
                roofColor: 0x8b0000
            },
            {
                width: 20,
                depth: 15,
                height: 15,
                color: 0xe8daef,
                roofColor: 0x4a235a
            },
            {
                width: 10,
                depth: 18,
                height: 9,
                color: 0xfdebd0,
                roofColor: 0x935116
            },
            // New massive buildings
            {
                width: 30,
                depth: 30,
                height: 25,
                color: 0x7f8c8d,
                roofColor: 0x2c3e50
            },
            {
                width: 25,
                depth: 40,
                height: 20,
                color: 0xecf0f1,
                roofColor: 0x95a5a6
            },
            {
                width: 35,
                depth: 20,
                height: 30,
                color: 0xbdc3c7,
                roofColor: 0x7f8c8d
            },
            // New small buildings
            {
                width: 6,
                depth: 6,
                height: 6,
                color: 0xe74c3c,
                roofColor: 0xc0392b
            },
            {
                width: 5,
                depth: 8,
                height: 7,
                color: 0x3498db,
                roofColor: 0x2980b9
            }
        ];

        // Create more building clusters
        const buildingClusters = [];
        const clusterCount = 72; // Tripled from 24
        
        // Create different types of clusters
        for (let i = 0; i < clusterCount; i++) {
            const clusterType = Math.floor(Math.random() * 3); // 0: dense city, 1: suburb, 2: scattered
            buildingClusters.push({
                x: (Math.random() - 0.5) * (WORLD_SIZE * 0.8),
                z: (Math.random() - 0.5) * (WORLD_SIZE * 0.8),
                radius: clusterType === 0 ? 80 + Math.random() * 40 : // Dense city
                       clusterType === 1 ? 120 + Math.random() * 60 : // Suburb
                       200 + Math.random() * 100, // Scattered
                density: clusterType === 0 ? 0.8 : // Dense city
                        clusterType === 1 ? 0.6 : // Suburb
                        0.3, // Scattered
                minDistance: clusterType === 0 ? 15 : // Dense city
                           clusterType === 1 ? 25 : // Suburb
                           40 // Scattered
            });
        }

        // Rest of building creation code remains the same, but with updated cluster logic
        for (let i = 0; i < buildingCount; i++) {
            const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
            
            let validPosition = false;
            let attempts = 0;
            let position;
            let selectedCluster = null;
            
            while (!validPosition && attempts < 50) {
                if (Math.random() < 0.7) {
                    selectedCluster = buildingClusters[Math.floor(Math.random() * buildingClusters.length)];
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * selectedCluster.radius;
                    position = new THREE.Vector3(
                        selectedCluster.x + Math.cos(angle) * distance,
                        0,
                        selectedCluster.z + Math.sin(angle) * distance
                    );
                } else {
                    position = new THREE.Vector3(
                        (Math.random() - 0.5) * WORLD_SIZE,
                        0,
                        (Math.random() - 0.5) * WORLD_SIZE
                    );
                }
                
                validPosition = true;
                
                for (const building of this.buildings) {
                    const distance = position.distanceTo(building.position);
                    const minDistance = selectedCluster ? selectedCluster.minDistance : 40;
                    if (distance < minDistance) {
                        validPosition = false;
                        break;
                    }
                }
                
                for (const tree of this.trees) {
                    const distance = position.distanceTo(tree.position);
                    if (distance < 15) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }
            
            if (!validPosition) continue;

            // Building creation code remains the same
            const building = new THREE.Group();
            
            const wallsGeometry = new THREE.BoxGeometry(
                buildingType.width,
                buildingType.height,
                buildingType.depth
            );
            const wallsMaterial = new THREE.MeshBasicMaterial({
                color: buildingType.color
            });
            const walls = new THREE.Mesh(wallsGeometry, wallsMaterial);
            
            walls.position.y = buildingType.height / 2;
            
            const roofHeight = buildingType.height * 0.3;
            const roofGeometry = new THREE.ConeGeometry(
                Math.sqrt(Math.pow(buildingType.width, 2) + Math.pow(buildingType.depth, 2)) / 2,
                roofHeight,
                4
            );
            const roofMaterial = new THREE.MeshBasicMaterial({
                color: buildingType.roofColor
            });
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            
            roof.position.y = buildingType.height + roofHeight / 2;
            roof.rotation.y = Math.PI / 4;
            
            const innerWallThickness = 0.5;
            const innerWallsGeometry = new THREE.BoxGeometry(
                buildingType.width - innerWallThickness,
                buildingType.height,
                buildingType.depth - innerWallThickness
            );
            const innerWallsMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,
                side: THREE.BackSide
            });
            const innerWalls = new THREE.Mesh(innerWallsGeometry, innerWallsMaterial);
            innerWalls.position.y = buildingType.height / 2;
            
            building.add(walls);
            building.add(roof);
            building.add(innerWalls);
            
            building.position.copy(position);
            building.rotation.y = Math.random() * Math.PI * 2;
            
            building.userData = {
                type: 'building',
                width: buildingType.width,
                depth: buildingType.depth,
                height: buildingType.height
            };
            
            this.scene.add(building);
            this.buildings.push(building);
        }

        // Add massive amount of trees with more varied distribution
        const treeCount = 2700; // Tripled from 900
        const treeClusterCount = 108; // Tripled from 36
        const treeClusters = [];
        
        // Create different types of tree clusters
        for (let i = 0; i < treeClusterCount; i++) {
            const clusterType = Math.floor(Math.random() * 3); // 0: dense forest, 1: grove, 2: scattered
            treeClusters.push({
                x: (Math.random() - 0.5) * WORLD_SIZE,
                z: (Math.random() - 0.5) * WORLD_SIZE,
                radius: clusterType === 0 ? 60 + Math.random() * 40 : // Dense forest
                       clusterType === 1 ? 90 + Math.random() * 60 : // Grove
                       150 + Math.random() * 100, // Scattered
                density: clusterType === 0 ? 0.9 : // Dense forest
                        clusterType === 1 ? 0.7 : // Grove
                        0.4 // Scattered
            });
        }

        // Tree creation with more variety
        for (let i = 0; i < treeCount; i++) {
            const scale = 1.2 + Math.random() * 1.6; // Bigger variation in tree sizes
            
            const treeGeometry = new THREE.CylinderGeometry(0.8 * scale, 1.5 * scale, 12 * scale);
            const treeMaterial = new THREE.MeshBasicMaterial({ 
                color: new THREE.Color(
                    0.45 + Math.random() * 0.1,
                    0.25 + Math.random() * 0.1,
                    0.07 + Math.random() * 0.1
                )
            });
            const leafGeometry = new THREE.ConeGeometry(4 * scale, 6 * scale);
            const leafMaterial = new THREE.MeshBasicMaterial({ 
                color: new THREE.Color(
                    0.1 + Math.random() * 0.1,
                    0.5 + Math.random() * 0.3,
                    0.1 + Math.random() * 0.1
                )
            });

            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(treeGeometry, treeMaterial);
            const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
            
            leaves.position.y = 9 * scale;
            tree.add(trunk);
            tree.add(leaves);
            
            let validPosition = false;
            let attempts = 0;
            let position;
            
            while (!validPosition && attempts < 50) {
                if (Math.random() < 0.8) {
                    const cluster = treeClusters[Math.floor(Math.random() * treeClusters.length)];
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * cluster.radius;
                position = new THREE.Vector3(
                        cluster.x + Math.cos(angle) * distance,
                        0,
                        cluster.z + Math.sin(angle) * distance
                    );
                } else {
                    position = new THREE.Vector3(
                        (Math.random() - 0.5) * WORLD_SIZE,
                        0,
                        (Math.random() - 0.5) * WORLD_SIZE
                    );
                }
                
                validPosition = true;
                
                for (const otherTree of this.trees) {
                    const distance = position.distanceTo(otherTree.position);
                    if (distance < 8) {
                        validPosition = false;
                        break;
                    }
                }
                
                for (const building of this.buildings) {
                    const distance = position.distanceTo(building.position);
                    if (distance < 15) {
                        validPosition = false;
                        break;
                    }
                }
                attempts++;
            }
            
            if (!validPosition) continue;
            
            tree.position.copy(position);
            tree.rotation.y = Math.random() * Math.PI * 2; // Random rotation for variety
            
            tree.userData = {
                type: 'tree',
                radius: 1.5 * scale,
                scale: scale
            };
            
            this.scene.add(tree);
            this.trees.push(tree);
        }
    }

    createWaterBalloon(position, velocity) {
        const balloonGeometry = new THREE.SphereGeometry(0.5);
        const balloonMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
        
        balloon.position.copy(position);
        balloon.velocity = velocity;
        balloon.birthTime = performance.now();
        
        this.scene.add(balloon);
        this.waterBalloons.push(balloon);
    }

    createCrosshair() {
        // Create crosshair container - always centered
        const crosshair = document.createElement('div');
        crosshair.style.position = 'fixed';
        crosshair.style.left = '50%';
        crosshair.style.top = '50%';
        crosshair.style.transform = 'translate(-50%, -50%)';
        crosshair.style.width = '20px';
        crosshair.style.height = '20px';
        crosshair.style.pointerEvents = 'none';
        crosshair.style.zIndex = '1000';

        // Create four separate lines for the crosshair
        const createLine = (isVertical) => {
            const line = document.createElement('div');
            line.style.position = 'absolute';
            line.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            line.style.boxShadow = '0 0 2px rgba(0, 0, 0, 0.5)';
            // Remove transition for instant feedback
            if (isVertical) {
                line.style.width = '2px';
                line.style.height = '8px';
                line.style.left = '50%';
                line.style.transform = 'translateX(-50%)';
            } else {
                line.style.width = '8px';
                line.style.height = '2px';
                line.style.top = '50%';
                line.style.transform = 'translateY(-50%)';
            }
            return line;
        };

        const top = createLine(true);
        top.style.top = '0';
        
        const bottom = createLine(true);
        bottom.style.bottom = '0';
        
        const left = createLine(false);
        left.style.left = '0';
        
        const right = createLine(false);
        right.style.right = '0';

        // Create center dot
        const dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.width = '2px';
        dot.style.height = '2px';
        dot.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        dot.style.borderRadius = '50%';
        dot.style.top = '50%';
        dot.style.left = '50%';
        dot.style.transform = 'translate(-50%, -50%)';
        dot.style.boxShadow = '0 0 2px rgba(0, 0, 0, 0.5)';
        // Remove transition for instant feedback
        
        // Store references for animation
        this.crosshairParts = {
            top, bottom, left, right, dot,
            spread: 0,
            baseSpread: 4,
            maxSpread: 12,
            currentSize: 1,
        };
        
        crosshair.append(top, bottom, left, right, dot);
        document.body.appendChild(crosshair);
        this.crosshairElement = crosshair;
    }

    updateCrosshairPosition(x, y) {
        if (!this.crosshairElement) return;
        
        // Calculate position with offset for centering
        const offsetX = x - 20; // Half of crosshair width
        const offsetY = y - 20; // Half of crosshair height
        
        // Update crosshair position with smooth transition
        this.crosshairElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }

    updateCrosshair(deltaSeconds, isMoving, isShooting) {
        const parts = this.crosshairParts;
        const targetSpread = this.crosshairParts.baseSpread + 
            (isMoving ? 8 : 0) + 
            (isShooting ? 12 : 0);
        
        // Faster spread interpolation
        parts.spread += (targetSpread - parts.spread) * (deltaSeconds * 20);
        
        // Always show targeting effect when aiming at objects
        parts.currentSize = this.isTargetInSight ? 1.2 : 1;
        
        // Update positions
        parts.top.style.top = -parts.spread + 'px';
        parts.bottom.style.bottom = -parts.spread + 'px';
        parts.left.style.left = -parts.spread + 'px';
        parts.right.style.right = -parts.spread + 'px';
        
        // Scale effect
        parts.dot.style.transform = `translate(-50%, -50%) scale(${parts.currentSize})`;
        
        // Enhanced target feedback - always show glow when aiming at objects
        const baseColor = this.isTargetInSight ? '#ff3333' : (isMoving ? '#ffff00' : 'white');
        const glowColor = this.isTargetInSight ? '#ff0000' : 'rgba(255,255,255,0.5)';
        const glowIntensity = this.isTargetInSight ? '0 0 12px' : '0 0 4px';
        const opacity = this.isTargetInSight ? '1' : '0.9';
        
        [parts.top, parts.bottom, parts.left, parts.right, parts.dot].forEach(part => {
            part.style.backgroundColor = baseColor;
            part.style.opacity = opacity;
            part.style.boxShadow = `${glowIntensity} ${glowColor}`;
            part.style.filter = this.isTargetInSight ? 'brightness(1.8)' : 'brightness(1.2)';
        });
    }

    setupControls() {
        // Keyboard controls for desktop
        document.addEventListener('keydown', (e) => {
            if (!this.isGameStarted) return;
            
            switch (e.code) {
                case 'KeyW': this.keys.w = true; break;
                case 'KeyS': this.keys.s = true; break;
                case 'KeyA': this.keys.a = true; break;
                case 'KeyD': this.keys.d = true; break;
                case 'ShiftLeft': 
                case 'ShiftRight': 
                    this.keys.shift = true;
                    this.cameraShake.enabled = true;
                    break;
                case 'Space':
                    if (this.planeState.isInPlane) {
                        this.keys.space = true;
                    } else if (!this.player.isJumping) {
                        this.player.velocity.y = 20;
                        this.player.isJumping = true;
                    }
                    break;
                case 'KeyE':
                    this.togglePlaneMode();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.w = false; break;
                case 'KeyS': this.keys.s = false; break;
                case 'KeyA': this.keys.a = false; break;
                case 'KeyD': this.keys.d = false; break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys.shift = false;
                    this.cameraShake.enabled = false;
                    break;
                case 'Space':
                    this.keys.space = false;
                    break;
            }
        });

        // Add right mouse button for aiming
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (!this.isGameStarted) return;
            if (e.button === 0) { // Left click
                this.isMouseDown = true;
                this.throwWaterBalloon();
            } else if (e.button === 2) { // Right click
                this.aimState.isAiming = true;
                this.cameraOffset.z = 4; // Move camera closer when aiming
                this.aimState.shoulderOffset.x = 0.8; // Increase shoulder offset when aiming
            }
        });

        this.renderer.domElement.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isMouseDown = false;
            } else if (e.button === 2) {
                this.aimState.isAiming = false;
                this.cameraOffset.z = 6; // Return to normal camera distance
                this.aimState.shoulderOffset.x = 0.5; // Return to normal shoulder offset
            }
        });

        // Prevent context menu on right click
        this.renderer.domElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isGameStarted && document.pointerLockElement === this.renderer.domElement) {
                const mouseSensitivity = 0.002; // Base sensitivity
                
                // Apply same sensitivity to both axes (negative for vertical aim to look up when mouse moves up)
                this.player.rotation.y -= e.movementX * mouseSensitivity;
                this.player.verticalAim -= e.movementY * mouseSensitivity; // Changed back to negative for correct up/down
                
                // Clamp vertical aim to prevent over-rotation
                this.player.verticalAim = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.player.verticalAim));
                
                this.updateCameraPosition();
            }
        });

        // Setup mobile controls if on mobile device
        if (this.isMobile) {
            this.setupMobileControls();
        }

        const startButton = document.getElementById('startGame');
        if (startButton) {
            startButton.addEventListener('click', () => {
                if (this.isMobile) {
                    // On mobile, just start the game without pointer lock
                    document.querySelector('.landing-overlay').style.display = 'none';
                    document.getElementById('playerCountDisplay').style.display = 'block';
                    document.getElementById('mobileControls').classList.add('active');
                    this.isGameStarted = true;
                } else {
                    // On desktop, use pointer lock
                    this.renderer.domElement.requestPointerLock = this.renderer.domElement.requestPointerLock ||
                        this.renderer.domElement.mozRequestPointerLock ||
                        this.renderer.domElement.webkitRequestPointerLock;
                    
                    this.renderer.domElement.requestPointerLock();
                }
            });
        }

        document.addEventListener('pointerlockchange', () => this.handlePointerLockChange());
        document.addEventListener('mozpointerlockchange', () => this.handlePointerLockChange());
        document.addEventListener('webkitpointerlockchange', () => this.handlePointerLockChange());
    }

    setupMobileControls() {
        // Mobile touch controls
        this.mobileControls = {
            joystick: {
                active: false,
                startX: 0,
                startY: 0,
                moveX: 0,
                moveY: 0,
                element: document.getElementById('joystick'),
                knob: document.getElementById('joystickKnob')
            },
            buttons: {
                jump: document.getElementById('jumpButton'),
                throw: document.getElementById('throwButton'),
                plane: document.getElementById('planeButton')
            },
            touchLook: {
                active: false,
                lastX: 0,
                lastY: 0
            }
        };

        // Joystick controls for movement
        const joystickArea = document.getElementById('joystickArea');
        
        joystickArea.addEventListener('touchstart', (e) => {
            if (!this.isGameStarted) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = this.mobileControls.joystick.element.getBoundingClientRect();
            
            this.mobileControls.joystick.active = true;
            this.mobileControls.joystick.startX = rect.left + rect.width / 2;
            this.mobileControls.joystick.startY = rect.top + rect.height / 2;
            
            this.updateJoystickPosition(touch.clientX, touch.clientY);
        });
        
        joystickArea.addEventListener('touchmove', (e) => {
            if (!this.isGameStarted || !this.mobileControls.joystick.active) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            this.updateJoystickPosition(touch.clientX, touch.clientY);
        });
        
        joystickArea.addEventListener('touchend', (e) => {
            if (!this.isGameStarted) return;
            e.preventDefault();
            
            this.mobileControls.joystick.active = false;
            this.mobileControls.joystick.moveX = 0;
            this.mobileControls.joystick.moveY = 0;
            
            // Reset joystick position
            this.mobileControls.joystick.knob.style.transform = 'translate(-50%, -50%)';
            
            // Reset movement keys
            this.keys.w = false;
            this.keys.s = false;
            this.keys.a = false;
            this.keys.d = false;
        });
        
        // Button controls
        this.mobileControls.buttons.jump.addEventListener('touchstart', (e) => {
            if (!this.isGameStarted) return;
            e.preventDefault();
            
            if (this.planeState.isInPlane) {
                this.keys.space = true;
            } else if (!this.player.isJumping) {
                this.player.velocity.y = 20;
                this.player.isJumping = true;
            }
        });
        
        this.mobileControls.buttons.jump.addEventListener('touchend', (e) => {
            if (!this.isGameStarted) return;
            e.preventDefault();
            
            this.keys.space = false;
        });
        
        this.mobileControls.buttons.throw.addEventListener('touchstart', (e) => {
            if (!this.isGameStarted) return;
            e.preventDefault();
            
            this.throwWaterBalloon();
        });
        
        this.mobileControls.buttons.plane.addEventListener('touchstart', (e) => {
            if (!this.isGameStarted) return;
            e.preventDefault();
            
            this.togglePlaneMode();
        });
        
        // Touch controls for looking around
        this.renderer.domElement.addEventListener('touchstart', (e) => {
            if (!this.isGameStarted) return;
            
            // Only handle if touch is not on controls
            if (!this.isTouchOnControls(e)) {
                e.preventDefault();
                
                const touch = e.touches[0];
                this.mobileControls.touchLook.active = true;
                this.mobileControls.touchLook.lastX = touch.clientX;
                this.mobileControls.touchLook.lastY = touch.clientY;
            }
        });
        
        this.renderer.domElement.addEventListener('touchmove', (e) => {
            if (!this.isGameStarted || !this.mobileControls.touchLook.active) return;
            
            // Only handle if touch is not on controls
            if (!this.isTouchOnControls(e)) {
                e.preventDefault();
                
                const touch = e.touches[0];
                const movementX = touch.clientX - this.mobileControls.touchLook.lastX;
                const movementY = touch.clientY - this.mobileControls.touchLook.lastY;
                
                const sensitivity = 0.005;
                this.player.rotation.y -= movementX * sensitivity;
                this.player.verticalAim -= movementY * sensitivity;
                
                // Clamp vertical aim
                this.player.verticalAim = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.player.verticalAim));
                
                this.mobileControls.touchLook.lastX = touch.clientX;
                this.mobileControls.touchLook.lastY = touch.clientY;
                
                this.updateCameraPosition();
            }
        });
        
        this.renderer.domElement.addEventListener('touchend', (e) => {
            if (!this.isGameStarted) return;
            
            // Only handle if touch is not on controls
            if (!this.isTouchOnControls(e)) {
                e.preventDefault();
                this.mobileControls.touchLook.active = false;
            }
        });
    }

    updateJoystickPosition(touchX, touchY) {
        const joystick = this.mobileControls.joystick;
        
        // Calculate distance from center
        const deltaX = touchX - joystick.startX;
        const deltaY = touchY - joystick.startY;
        
        // Calculate distance
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Limit distance to joystick radius
        const maxRadius = 40;
        const limitedDistance = Math.min(distance, maxRadius);
        
        // Calculate normalized direction
        const angle = Math.atan2(deltaY, deltaX);
        const moveX = limitedDistance * Math.cos(angle) / maxRadius;
        const moveY = limitedDistance * Math.sin(angle) / maxRadius;
        
        // Update joystick knob position
        const knobX = moveX * maxRadius;
        const knobY = moveY * maxRadius;
        joystick.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
        
        // Store movement values
        joystick.moveX = moveX;
        joystick.moveY = moveY;
        
        // Update movement keys based on joystick position
        const deadzone = 0.2;
        this.keys.w = moveY < -deadzone;
        this.keys.s = moveY > deadzone;
        this.keys.a = moveX < -deadzone;
        this.keys.d = moveX > deadzone;
    }

    isTouchOnControls(e) {
        const touch = e.touches[0];
        const mobileControls = document.getElementById('mobileControls');
        const controlsRect = mobileControls.getBoundingClientRect();
        
        return (
            touch.clientY > controlsRect.top &&
            touch.clientY < controlsRect.bottom &&
            touch.clientX > controlsRect.left &&
            touch.clientX < controlsRect.right
        );
    }

    handlePointerLockChange() {
        if (document.pointerLockElement === this.renderer.domElement ||
            document.mozPointerLockElement === this.renderer.domElement ||
            document.webkitPointerLockElement === this.renderer.domElement) {
            this.crosshairElement.style.display = 'block';
            document.querySelector('.landing-overlay').style.display = 'none';
            document.getElementById('playerCountDisplay').style.display = 'block';
            this.isGameStarted = true;
            console.log('Game started - pointer locked');
        } else {
            if (this.isGameStarted && !this.isMobile) {
                this.crosshairElement.style.display = 'none';
                document.querySelector('.landing-overlay').style.display = 'flex';
                document.getElementById('playerCountDisplay').style.display = 'none';
                this.isGameStarted = false;
                console.log('Game paused - pointer unlocked');
            }
        }
    }

    updateCameraShake() {
        if (this.cameraShake.enabled) {
            // Generate random shake offset
            this.cameraShake.offset.set(
                (Math.random() - 0.5) * this.cameraShake.intensity,
                (Math.random() - 0.5) * this.cameraShake.intensity,
                (Math.random() - 0.5) * this.cameraShake.intensity
            );
        } else {
            // Decay shake when boost ends
            this.cameraShake.offset.multiplyScalar(this.cameraShake.decay);
        }
    }

    updateCameraPosition() {
        if (this.planeState.isInPlane) {
            // Camera follows plane from behind and slightly above
            const plane = this.planeState.plane;
            const offset = this.cameraOffset.clone();
            offset.applyQuaternion(plane.quaternion);
            this.camera.position.copy(plane.position).add(offset);
            this.camera.lookAt(plane.position);
        } else {
        // Calculate the aim direction based on player rotation and vertical aim
        const verticalRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.player.verticalAim, 0, 0));
        const horizontalRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.player.rotation.y, 0));
        
        // Apply rotations in the correct order: first vertical, then horizontal
        this.aimState.direction.set(0, 0, -1)
            .applyQuaternion(verticalRotation)
            .applyQuaternion(horizontalRotation);

        // Calculate camera position with shoulder offset when aiming
        const shoulderOffset = this.aimState.shoulderOffset.clone()
            .applyQuaternion(horizontalRotation);
        
        // Position camera behind player with shoulder offset
        const cameraOffset = this.cameraOffset.clone()
            .applyQuaternion(horizontalRotation);
        
        this.camera.position.copy(this.player.position)
            .add(shoulderOffset)
            .add(cameraOffset);
        
        // Add camera shake
        this.updateCameraShake();
        this.camera.position.add(this.cameraShake.offset);
        
        // Make camera look ahead of player with higher target point
        const lookTarget = this.player.position.clone()
            .add(this.cameraTarget)
            .add(shoulderOffset)
            .add(this.aimState.direction.clone().multiplyScalar(8)); // Reduced from 10 to 8 for perfect accuracy
        
        this.camera.lookAt(lookTarget);
        }
    }

    getAimDirection() {
        // Get exact camera view direction for perfect accuracy
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(this.camera.quaternion);
        return cameraDirection;
    }

    throwWaterBalloon() {
        const direction = this.getAimDirection();
        const FIXED_VELOCITY = 350;
        
        // Start balloon from exact camera position
        const startPos = this.camera.position.clone();
        
        const velocity = direction.clone().multiplyScalar(FIXED_VELOCITY);
        this.createWaterBalloon(startPos, velocity);
        
        // Send water balloon event to server
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'waterBalloon',
                position: {
                    x: startPos.x,
                    y: startPos.y,
                    z: startPos.z
                },
                velocity: {
                    x: velocity.x,
                    y: velocity.y,
                    z: velocity.z
                }
            }));
        }
    }

    update(deltaTime) {
        if (!this.isGameStarted) return;

        const deltaSeconds = deltaTime / 1000;
        const maxDeltaTime = 1/30;
        const physicsTimeStep = Math.min(deltaSeconds, maxDeltaTime);

        // Calculate if player/plane is moving
        const isMoving = this.keys.w || this.keys.s || this.keys.a || this.keys.d;
        
        // Update raycaster using exact camera position and direction
        const direction = this.getAimDirection();
        this.raycaster.set(
            this.camera.position.clone(),
            direction
        );
        const intersects = this.raycaster.intersectObjects([...this.targets, ...this.trees]);
        this.isTargetInSight = intersects.length > 0;

        // Update crosshair whether in plane or not
        this.updateCrosshair(physicsTimeStep, isMoving, this.isMouseDown);

        if (this.planeState.isInPlane) {
            this.updatePlane(physicsTimeStep);
        } else {
        // Update water balloons
        for (let i = this.waterBalloons.length - 1; i >= 0; i--) {
            const balloon = this.waterBalloons[i];
            const startPos = balloon.position.clone();
            balloon.velocity.y -= 3.0 * physicsTimeStep; // Reduced from 5.5 for less arc
            const movement = balloon.velocity.clone().multiplyScalar(physicsTimeStep);
            const endPos = startPos.clone().add(movement);
            
            const movementDirection = movement.clone().normalize();
            const distance = movement.length();
            this.raycaster.set(startPos, movementDirection);
            
            // Check collisions with both targets and trees
            const intersects = this.raycaster.intersectObjects([...this.targets, ...this.trees]);
            
            let hitSomething = false;
            for (const intersect of intersects) {
                if (intersect.distance <= distance) {
                    hitSomething = true;
                    const hitPoint = intersect.point;
                    const target = intersect.object;
                    
                    // Only remove targets, not trees
                    if (this.targets.includes(target)) {
                        this.scene.remove(target);
                        this.targets.splice(this.targets.indexOf(target), 1);
                    }
                    
                    this.createSplashEffect(hitPoint, true);
                    this.scene.remove(balloon);
                    this.waterBalloons.splice(i, 1);
                    break;
                }
            }
            
            if (!hitSomething) {
                balloon.position.copy(endPos);
                
                if (balloon.position.y < -2) {
                    this.createSplashEffect(new THREE.Vector3(
                        balloon.position.x,
                        -2,
                        balloon.position.z
                    ), false);
                    this.scene.remove(balloon);
                    this.waterBalloons.splice(i, 1);
                }
            }
            
            if (performance.now() - balloon.birthTime > 8000) {
                this.scene.remove(balloon);
                this.waterBalloons.splice(i, 1);
            }
        }

        // Water wave animation
        const time = performance.now() * 0.001;
        for (let i = 0; i < this.waterVertices.count; i++) {
            const x = this.waterVertices.getX(i);
            const z = Math.sin(time + x * 0.01) * 0.5;
            this.waterVertices.setZ(i, z);
        }
        this.waterVertices.needsUpdate = true;

        // Movement with tree collision detection
        const baseSpeed = 50;
        const boostMultiplier = this.keys.shift ? 2.5 : 1;
        const speed = baseSpeed * boostMultiplier;
        const moveSpeed = speed * physicsTimeStep;

        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        
        forward.set(0, 0, -1).applyEuler(new THREE.Euler(0, this.player.rotation.y, 0));
        right.set(1, 0, 0).applyEuler(new THREE.Euler(0, this.player.rotation.y, 0));

        const movement = new THREE.Vector3(0, 0, 0);
        
        if (this.keys.w) movement.add(forward.multiplyScalar(moveSpeed));
        if (this.keys.s) movement.add(forward.multiplyScalar(-moveSpeed));
        if (this.keys.a) movement.add(right.multiplyScalar(-moveSpeed));
        if (this.keys.d) movement.add(right.multiplyScalar(moveSpeed));

        // Check tree collisions before applying movement
        const nextPosition = this.player.position.clone().add(movement);
        let canMove = true;

            // Check tree collisions
        for (const tree of this.trees) {
            const treePos = tree.position;
            const treeRadius = tree.userData.radius;
            const playerRadius = 1; // Approximate player radius
            
            const dx = nextPosition.x - treePos.x;
            const dz = nextPosition.z - treePos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < (treeRadius + playerRadius)) {
                canMove = false;
                break;
            }
        }

            // Check building collisions
            for (const building of this.buildings) {
                // Transform player position to building's local space
                const buildingRotationMatrix = new THREE.Matrix4().makeRotationY(-building.rotation.y);
                const localNextPosition = nextPosition.clone()
                    .sub(building.position)
                    .applyMatrix4(buildingRotationMatrix);

                // Building dimensions
                const halfWidth = building.userData.width / 2;
                const halfDepth = building.userData.depth / 2;
                const wallThickness = 0.5; // Wall thickness

                // Check if player is near the building
                if (Math.abs(localNextPosition.x) < halfWidth + 1 && 
                    Math.abs(localNextPosition.z) < halfDepth + 1) {
                    
                    // Check if player is trying to go through walls
                    // We allow movement if player is already inside
                    const isInside = Math.abs(localNextPosition.x) < halfWidth - wallThickness &&
                                   Math.abs(localNextPosition.z) < halfDepth - wallThickness;
                    const wasInside = Math.abs(this.player.position.clone()
                        .sub(building.position)
                        .applyMatrix4(buildingRotationMatrix).x) < halfWidth - wallThickness &&
                        Math.abs(this.player.position.clone()
                        .sub(building.position)
                        .applyMatrix4(buildingRotationMatrix).z) < halfDepth - wallThickness;

                    // If trying to cross a wall, prevent movement
                    if ((!isInside && wasInside) || (isInside && !wasInside)) {
                        canMove = false;
                        break;
                    }
                }
            }

            // Only move if not colliding
        if (canMove) {
            this.player.position.add(movement);
        }

        // Rest of the update logic
        if (this.player.isJumping) {
            this.player.velocity.y -= 25 * physicsTimeStep;
            this.player.position.y += this.player.velocity.y * physicsTimeStep;

            if (this.player.position.y <= 0) {
                this.player.position.y = 0;
                this.player.velocity.y = 0;
                this.player.isJumping = false;
            }
        }

        this.playerMesh.position.copy(this.player.position);
        this.playerMesh.rotation.y = this.player.rotation.y;
        this.updateCameraPosition();
        }

        // Send player update to server every 50ms
        if (!this.lastUpdateTime || performance.now() - this.lastUpdateTime > 50) {
            this.sendPlayerUpdate();
            this.lastUpdateTime = performance.now();
        }
    }

    createSplashEffect(position, isBigSplash = false) {
        // Create particle effect for water splash
        const particleCount = isBigSplash ? 60 : 30;
        const particles = new THREE.Group();
        
        // Create splash ring
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.1),
                new THREE.MeshBasicMaterial({ 
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.8
                })
            );
            
            const angle = (Math.PI * 2 * i) / particleCount;
            const radius = isBigSplash ? 2 : 1;
            const speed = isBigSplash ? 8 + Math.random() * 4 : 4 + Math.random() * 2;
            
            particle.position.copy(position);
            
            // Calculate spread direction
            const spreadDirection = new THREE.Vector3(
                Math.cos(angle) * radius,
                0.5 + Math.random(),
                Math.sin(angle) * radius
            ).normalize();
            
            particle.velocity = spreadDirection.multiplyScalar(speed);
            particle.gravity = -9.8; // Add gravity to particles
            particle.lifetime = 0; // Track particle lifetime
            particle.maxLifetime = 1 + Math.random() * 0.5; // Random lifetime between 1-1.5 seconds
            
            particles.add(particle);
        }
        
        // Add vertical spray
        for (let i = 0; i < particleCount/2; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.08),
                new THREE.MeshBasicMaterial({ 
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.6
                })
            );
            
            particle.position.copy(position);
            
            // Calculate upward spray
            const angle = Math.random() * Math.PI * 2;
            const speed = isBigSplash ? 6 + Math.random() * 4 : 3 + Math.random() * 2;
            
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * speed * 0.3,
                speed,
                Math.sin(angle) * speed * 0.3
            );
            
            particle.gravity = -9.8;
            particle.lifetime = 0;
            particle.maxLifetime = 1 + Math.random() * 0.5;
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        
        // Animate particles
        const animateParticles = () => {
            let allParticlesDead = true;
            
            particles.children.forEach(particle => {
                particle.lifetime += 1/60; // Assume 60fps
                
                if (particle.lifetime < particle.maxLifetime) {
                    allParticlesDead = false;
                    
                    // Update velocity with gravity
                    particle.velocity.y += particle.gravity * (1/60);
                    
                    // Update position
                    particle.position.add(particle.velocity.clone().multiplyScalar(1/60));
                    
                    // Fade out
                    particle.material.opacity = 0.8 * (1 - particle.lifetime / particle.maxLifetime);
                } else {
                    particle.material.opacity = 0;
                }
            });
            
            if (!allParticlesDead) {
                requestAnimationFrame(animateParticles);
            } else {
                this.scene.remove(particles);
            }
        };
        
        animateParticles();
    }

    createAirplane() {
        // Create a more detailed airplane
        const airplane = new THREE.Group();

        // Main fuselage - sleeker and more aerodynamic
        const fuselageGeometry = new THREE.CylinderGeometry(1.5, 1, 25, 12);
        const fuselageMaterial = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });
        const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
        // Rotate fuselage to point forward
        fuselage.rotation.x = Math.PI / 2;

        // Cockpit - glass dome
        const cockpitGeometry = new THREE.SphereGeometry(2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const cockpitMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x84c1ff,
            transparent: true,
            opacity: 0.6
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 1.5, -5);
        cockpit.rotation.x = -Math.PI / 2;

        // Main wings - more aerodynamic shape
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(8, 0);
        wingShape.lineTo(6, 4);
        wingShape.lineTo(0, 3);
        wingShape.lineTo(0, 0);

        const wingExtrudeSettings = {
            steps: 1,
            depth: 0.5,
            bevelEnabled: true,
            bevelThickness: 0.2,
            bevelSize: 0.2,
            bevelSegments: 3
        };

        const wingGeometry = new THREE.ExtrudeGeometry(wingShape, wingExtrudeSettings);
        const wingMaterial = new THREE.MeshBasicMaterial({ color: 0x3498db });
        
        // Left wing
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-15, 0, 4);
        leftWing.rotation.y = -Math.PI / 2;
        
        // Right wing
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(15, 0, 4);
        rightWing.rotation.y = Math.PI / 2;

        // Tail section
        const tailShape = new THREE.Shape();
        tailShape.moveTo(0, 0);
        tailShape.lineTo(3.2, 0);
        tailShape.lineTo(2.4, 2.4);
        tailShape.lineTo(0, 1.8);
        tailShape.lineTo(0, 0);

        const tailFinGeometry = new THREE.ExtrudeGeometry(tailShape, wingExtrudeSettings);
        const tailFin = new THREE.Mesh(tailFinGeometry, wingMaterial);
        tailFin.position.set(0, 2, 12);
        tailFin.rotation.x = 0;
        tailFin.scale.set(0.5, 1, 0.5);

        // Vertical stabilizer
        const stabilizerShape = new THREE.Shape();
        stabilizerShape.moveTo(0, 0);
        stabilizerShape.lineTo(4.8, 0);
        stabilizerShape.lineTo(3.6, 3.2);
        stabilizerShape.lineTo(0, 2.4);
        stabilizerShape.lineTo(0, 0);

        const stabilizerGeometry = new THREE.ExtrudeGeometry(stabilizerShape, wingExtrudeSettings);
        const stabilizer = new THREE.Mesh(stabilizerGeometry, wingMaterial);
        stabilizer.position.set(0, 4, 12);
        stabilizer.rotation.x = -Math.PI / 2;
        stabilizer.scale.set(0.4, 1, 0.4);

        // Add engine nacelles
        const nacelleGeometry = new THREE.CylinderGeometry(0.8, 0.6, 4, 8);
        const nacelleMaterial = new THREE.MeshBasicMaterial({ color: 0x7f8c8d });
        
        const leftNacelle = new THREE.Mesh(nacelleGeometry, nacelleMaterial);
        leftNacelle.position.set(-10, -1, 2);
        leftNacelle.rotation.x = Math.PI / 2;
        
        const rightNacelle = new THREE.Mesh(nacelleGeometry, nacelleMaterial);
        rightNacelle.position.set(10, -1, 2);
        rightNacelle.rotation.x = Math.PI / 2;

        // Add all components
        airplane.add(fuselage);
        airplane.add(cockpit);
        airplane.add(leftWing);
        airplane.add(rightWing);
        airplane.add(tailFin);
        airplane.add(stabilizer);
        airplane.add(leftNacelle);
        airplane.add(rightNacelle);

        // Set initial position and rotation
        airplane.position.set(0, 0, -50);
        airplane.rotation.y = 0; // Point forward by default
        
        this.planeState.plane = airplane;
        this.scene.add(airplane);
    }

    togglePlaneMode() {
        this.planeState.isInPlane = !this.planeState.isInPlane;
        
        if (this.planeState.isInPlane) {
            // Enter plane
            this.player.position.copy(this.planeState.plane.position);
            this.cameraOffset.copy(this.planeState.planeCameraOffset);
            this.planeState.speed = this.planeState.minSpeed;
            this.planeState.pitch = 0;
            this.planeState.roll = 0;
            
            // Set initial orientation
            this.planeState.plane.rotation.set(0, Math.PI / 2, 0);
            this.player.rotation.y = 0;
        } else {
            // Exit plane
            this.player.position.copy(this.planeState.plane.position);
            this.player.position.y = 0;
            this.cameraOffset.copy(this.planeState.originalCameraOffset);
        }
    }

    updatePlane(deltaTime) {
        const plane = this.planeState.plane;
        
        // Speed control with W/S keys
        const minSpeed = 100;
        const maxSpeed = 500;
        const acceleration = 300;
        
        if (this.keys.w) {
            this.planeState.speed = Math.min(this.planeState.speed + acceleration * deltaTime, maxSpeed);
        } else if (this.keys.s) {
            this.planeState.speed = Math.max(this.planeState.speed - acceleration * deltaTime, minSpeed);
        }
        
        // Mouse control settings
        const mouseSensitivity = 2.0;
        const turnSensitivity = 3.0;
        const bankingSensitivity = 1.5;
        
        // Direct pitch control from vertical mouse movement
        const targetPitch = -this.player.verticalAim * mouseSensitivity;
        this.planeState.pitch += (targetPitch - this.planeState.pitch) * 10 * deltaTime;
        
        // Track previous rotation for turn rate calculation
        const previousRotationY = plane.rotation.y;
        
        // Apply yaw (turning) based on mouse movement
        plane.rotation.y -= this.player.rotation.y * turnSensitivity * deltaTime;
        
        // Calculate turn rate based on rotation change
        const turnRate = (plane.rotation.y - previousRotationY) / deltaTime;
        
        // Calculate target roll based on turn rate
        const targetRoll = -turnRate * bankingSensitivity;
        
        // Smoothly interpolate current roll to target roll
        this.planeState.roll += (targetRoll - this.planeState.roll) * 5 * deltaTime;
        
        // Auto-level roll when not turning
        if (Math.abs(turnRate) < 0.01) {
            this.planeState.roll *= 0.95;
        }
        
        // Clamp angles for stability
        this.planeState.roll = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.planeState.roll));
        this.planeState.pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.planeState.pitch));
        
        // Apply rotations
        plane.rotation.x = this.planeState.pitch;
        plane.rotation.z = this.planeState.roll;
        
        // Calculate movement direction based on plane's orientation
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(plane.quaternion);
        
        // Move plane forward
        plane.position.add(direction.multiplyScalar(this.planeState.speed * deltaTime));
        
        // Update altitude based on pitch
        const altitudeChange = this.planeState.speed * Math.sin(this.planeState.pitch) * deltaTime * 1.2;
        this.planeState.altitude = Math.max(
            this.planeState.minAltitude,
            Math.min(
                this.planeState.altitude + altitudeChange,
                this.planeState.maxAltitude
            )
        );
        plane.position.y = this.planeState.altitude;
        
        // Update player position and rotation to match plane
        this.player.position.copy(plane.position);
        this.player.rotation.y = plane.rotation.y;
        
        // Update camera
        this.updateCameraPosition();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();
        requestAnimationFrame(() => this.animate());
    }

    // Connect to WebSocket server
    connectToServer() {
        // Get the current hostname and use the same host for WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        console.log('Connecting to WebSocket server at:', wsUrl);
        
        // Close existing connection if any
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
            this.socket.close();
        }
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
            console.log('Connected to server');
            // Clear any existing other players when reconnecting
            this.clearOtherPlayers();
        };
        
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('Error parsing server message:', error);
            }
        };
        
        this.socket.onclose = (event) => {
            console.log(`Disconnected from server: ${event.code} ${event.reason}`);
            // Try to reconnect after a delay that increases with each attempt
            const reconnectDelay = Math.min(5000, 1000 * (this.reconnectAttempts || 1));
            this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
            
            console.log(`Attempting to reconnect in ${reconnectDelay/1000} seconds...`);
            setTimeout(() => this.connectToServer(), reconnectDelay);
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    // Clear all other players from the scene
    clearOtherPlayers() {
        this.otherPlayers.forEach((player, id) => {
            this.scene.remove(player.mesh);
        });
        this.otherPlayers.clear();
        this.updatePlayerCount();
    }

    // Handle messages from the server
    handleServerMessage(data) {
        try {
            switch(data.type) {
                case 'init':
                    this.playerId = data.id;
                    console.log('Received player ID:', this.playerId);
                    console.log('Other players already in game:', data.players.length);
                    
                    // Create other players that are already in the game
                    data.players.forEach(player => {
                        this.createOtherPlayer(player.id, player.position, player.rotation, player.isInPlane);
                    });
                    this.updatePlayerCount();
                    break;
                    
                case 'playerJoined':
                    console.log('Player joined:', data.id);
                    if (data.id !== this.playerId) {
                        this.createOtherPlayer(data.id, {x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0}, false);
                        this.updatePlayerCount();
                    }
                    break;
                    
                case 'playerUpdate':
                    if (data.id !== this.playerId) {
                        this.updateOtherPlayer(data.id, data.position, data.rotation, data.isInPlane);
                    }
                    break;
                    
                case 'playerLeft':
                    console.log('Player left:', data.id);
                    if (data.id !== this.playerId) {
                        this.removeOtherPlayer(data.id);
                        this.updatePlayerCount();
                    }
                    break;
                    
                case 'waterBalloon':
                    if (data.id !== this.playerId) {
                        this.createRemoteWaterBalloon(data.position, data.velocity);
                    }
                    break;
                
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error handling server message:', error, data);
        }
    }
    
    // Create a representation of another player
    createOtherPlayer(id, position, rotation, isInPlane) {
        if (this.otherPlayers.has(id)) return;
        
        // Create a simple representation for other players
        const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
        const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green for other players
        const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        
        playerMesh.position.set(position.x, position.y, position.z);
        playerMesh.rotation.set(rotation.x, rotation.y, rotation.z);
        
        this.scene.add(playerMesh);
        
        // Store the player
        this.otherPlayers.set(id, {
            mesh: playerMesh,
            isInPlane: isInPlane
        });
    }
    
    // Update the position and rotation of another player
    updateOtherPlayer(id, position, rotation, isInPlane) {
        const player = this.otherPlayers.get(id);
        if (!player) return;
        
        player.mesh.position.set(position.x, position.y, position.z);
        player.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
        player.isInPlane = isInPlane;
    }
    
    // Remove another player
    removeOtherPlayer(id) {
        const player = this.otherPlayers.get(id);
        if (!player) return;
        
        this.scene.remove(player.mesh);
        this.otherPlayers.delete(id);
    }
    
    // Create a water balloon thrown by another player
    createRemoteWaterBalloon(position, velocity) {
        const balloonGeometry = new THREE.SphereGeometry(0.5);
        const balloonMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
        
        balloon.position.set(position.x, position.y, position.z);
        balloon.velocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z);
        balloon.birthTime = performance.now();
        
        this.scene.add(balloon);
        this.waterBalloons.push(balloon);
    }

    // Send player position and rotation to server
    sendPlayerUpdate() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
        
        const position = this.planeState.isInPlane 
            ? this.planeState.plane.position 
            : this.player.position;
            
        const rotation = this.planeState.isInPlane
            ? this.planeState.plane.rotation
            : this.player.rotation;
            
        this.socket.send(JSON.stringify({
            type: 'update',
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: {
                x: rotation.x instanceof Function ? rotation.x() : rotation.x,
                y: rotation.y instanceof Function ? rotation.y() : rotation.y,
                z: rotation.z instanceof Function ? rotation.z() : rotation.z
            },
            isInPlane: this.planeState.isInPlane
        }));
    }

    // Update the player count display
    updatePlayerCount() {
        const playerCountElement = document.getElementById('playerCount');
        if (playerCountElement) {
            // Count includes the current player plus all other players
            const count = this.otherPlayers.size + 1;
            playerCountElement.textContent = count;
            
            // Show the player count display when the game starts
            if (this.isGameStarted) {
                document.getElementById('playerCountDisplay').style.display = 'block';
            }
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    const game = new Game();
}); 