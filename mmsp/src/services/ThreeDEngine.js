import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Delaunator from 'delaunator';
import { DeformationModel } from './DeformationModel';

/**
 * ThreeDEngine - Image Warping and Deformation Engine using WebGL
 * 
 * Replaces the 2D affine map implementation with a 3D vertex and UV mapped geometry using WebGL via Three.js.
 * This ensures accurate interpolation over topological deformations naturally respecting volume.
 */
export class ThreeDEngine {
    constructor() {
        this.triangles = null;
        this.basePoints = null;
        this.originalLandmarks = null;

        // WebGL Context Variables
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.mesh = null;
        this.geometry = null;
        this.material = null;
        this.texture = null;
    }

    /**
     * Initialize 3D triangulation mesh and WebGL context
     */
    init(landmarks, width, height) {
        this.originalLandmarks = landmarks.map(l => ({ ...l }));

        const corners = this.getCorners(width, height);
        this.basePoints = [...landmarks, ...corners];

        // Ensure proper default 'z' coordinate
        this.basePoints.forEach(p => {
            if (p.z === undefined) p.z = 0;
        });

        // Calculate Delaunay Triangulation using x,y projection
        const coords = [];
        this.basePoints.forEach(p => coords.push(p.x, p.y));

        const delaunay = new Delaunator(coords);
        this.triangles = delaunay.triangles;
    }

    /**
     * Renders WebGL Mesh
     */
    render(ctx, img, originalLandmarks, currentLandmarks, width, height, showMesh = true) {
        if (!this.triangles) return;

        // Apply deformation to padding corners as well
        const baseCorners = this.getCorners(width, height);
        const deformedCorners = DeformationModel.deformPoints(
            baseCorners,
            originalLandmarks,
            currentLandmarks
        );

        const currentPoints = [...currentLandmarks, ...deformedCorners];

        // Initialize three.js system lazily once constraints are known
        if (!this.renderer) {
            this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
            this.renderer.setSize(width, height);

            this.scene = new THREE.Scene();

            // Adjust orthographic projection to map [0, width] x [0, height] directly
            // left: 0, right: width, top: height, bottom: 0 matches standard Cartesian plane 
            this.camera = new THREE.OrthographicCamera(0, width, height, 0, -1000, 1000);
            this.camera.position.z = 500;

            this.texture = new THREE.Texture(img);
            this.texture.needsUpdate = true;
            this.texture.colorSpace = THREE.SRGBColorSpace;

            this.material = new THREE.MeshBasicMaterial({
                map: this.texture,
                wireframe: false,
                transparent: true,
                side: THREE.DoubleSide
            });

            this.geometry = new THREE.BufferGeometry();
            this.mesh = new THREE.Mesh(this.geometry, this.material);
            this.scene.add(this.mesh);
        } else {
            // Reassign texture in case a new cropped image is used
            if (this.texture.image !== img) {
                this.texture = new THREE.Texture(img);
                this.texture.needsUpdate = true;
                this.texture.colorSpace = THREE.SRGBColorSpace;
                this.material.map = this.texture;
                this.material.needsUpdate = true;
            }
        }

        // Buffer Geometry preparation
        const vertices = new Float32Array(this.triangles.length * 3);
        const uvs = new Float32Array(this.triangles.length * 2);

        for (let i = 0; i < this.triangles.length; i++) {
            const index = this.triangles[i];

            // WebGL Destination Vertices
            const cp = currentPoints[index];
            vertices[i * 3] = cp.x;
            vertices[i * 3 + 1] = height - cp.y; // Flip Y coordinates to adapt to Canvas 2D
            vertices[i * 3 + 2] = cp.z || 0;

            // UV mapped to Source image boundaries
            const bp = this.basePoints[index];
            uvs[i * 2] = bp.x / width;
            uvs[i * 2 + 1] = 1.0 - (bp.y / height); // Bottom-left origin mapping
        }

        const positionAttribute = new THREE.BufferAttribute(vertices, 3);
        const uvAttribute = new THREE.BufferAttribute(uvs, 2);

        this.geometry.setAttribute('position', positionAttribute);
        this.geometry.setAttribute('uv', uvAttribute);

        // Required to update mesh
        this.geometry.computeVertexNormals();
        positionAttribute.needsUpdate = true;
        uvAttribute.needsUpdate = true;

        // Render pass
        // Ensure webgl doesn't clear black background by retaining alpha true
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);

        // Copy webgl backing store onto the destination editing canvas
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(this.renderer.domElement, 0, 0);

        // Retain 2D aesthetic by overlaying mesh instead of WebGL strict wireframes
        if (showMesh) {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(15, 15, 15, 0.85)';
            ctx.lineWidth = 0.1;

            for (let i = 0; i < this.triangles.length; i += 3) {
                const p1 = currentPoints[this.triangles[i]];
                const p2 = currentPoints[this.triangles[i + 1]];
                const p3 = currentPoints[this.triangles[i + 2]];

                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.lineTo(p1.x, p1.y);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    getCorners(width, height) {
        return [
            { x: 0, y: 0, z: 0 },
            { x: width, y: 0, z: 0 },
            { x: width, y: height, z: 0 },
            { x: 0, y: height, z: 0 },
            { x: width / 2, y: 0, z: 0 },
            { x: width, y: height / 2, z: 0 },
            { x: width / 2, y: height, z: 0 },
            { x: 0, y: height / 2, z: 0 }
        ];
    }

    /**
     * Terminate WebGL processes
     */
    dispose() {
        if (this.geometry) this.geometry.dispose();
        if (this.material) this.material.dispose();
        if (this.texture) this.texture.dispose();
        if (this.renderer) this.renderer.dispose();
    }
}

export class LandmarkViewer3D {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.pointsObject = null;
        this.pointGeometry = null;
        this.pointMaterial = null;
        this.animationFrame = null;
        this.boundResize = this.handleResize.bind(this);
    }

    init() {
        const width = this.container.clientWidth || 320;
        const height = this.container.clientHeight || 260;

        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);
        this.camera.position.set(0, 0, 2.2);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio || 1);
        this.renderer.setSize(width, height);
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 0.95);
        this.scene.add(ambient);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 6;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;

        window.addEventListener('resize', this.boundResize);
        this.animate();
    }

    updateLandmarks(landmarks, activeIndex = null) {
        if (!this.renderer || !Array.isArray(landmarks) || landmarks.length === 0) return;

        const positions = [];
        const colors = [];

        landmarks.forEach((landmark, index) => {
            const xNorm = landmark.xNorm ?? landmark.normX ?? ((landmark.xPx ?? landmark.x ?? 0) / 1);
            const yNorm = landmark.yNorm ?? landmark.normY ?? ((landmark.yPx ?? landmark.y ?? 0) / 1);
            const zNorm = landmark.zNorm ?? ((landmark.zPx ?? landmark.z ?? 0) / 1);

            const x = (xNorm - 0.5) * 1.9;
            const y = -(yNorm - 0.5) * 1.9;
            const z = -zNorm * 1.5;

            positions.push(x, y, z);

            if (index === activeIndex) {
                colors.push(1, 0.5, 0.1);
            } else {
                colors.push(0.13, 0.83, 0.93);
            }
        });

        if (this.pointsObject) {
            this.scene.remove(this.pointsObject);
            if (this.pointGeometry) this.pointGeometry.dispose();
            if (this.pointMaterial) this.pointMaterial.dispose();
        }

        this.pointGeometry = new THREE.BufferGeometry();
        this.pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.pointGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        this.pointMaterial = new THREE.PointsMaterial({
            size: 0.025,
            vertexColors: true,
            sizeAttenuation: true
        });

        this.pointsObject = new THREE.Points(this.pointGeometry, this.pointMaterial);
        this.scene.add(this.pointsObject);
    }

    resetCamera() {
        if (!this.camera || !this.controls) return;
        this.camera.position.set(0, 0, 2.2);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    handleResize() {
        if (!this.renderer || !this.camera || !this.container) return;
        const width = this.container.clientWidth || 320;
        const height = this.container.clientHeight || 260;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        this.animationFrame = requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        window.removeEventListener('resize', this.boundResize);
        if (this.controls) this.controls.dispose();
        if (this.pointGeometry) this.pointGeometry.dispose();
        if (this.pointMaterial) this.pointMaterial.dispose();
        if (this.renderer) this.renderer.dispose();
        if (this.container) this.container.innerHTML = '';
    }
}
