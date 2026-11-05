import * as THREE from 'three';
import { Wall, Vertex } from '../types/model';
import { distance, projectPointOntoSegment } from '../math/geometry';

export class FpsControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private walls: Wall[] = [];
  private vertexMap = new Map<string, Vertex>();

  public isLocked = false;
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private isSprinting = false;

  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();

  private pitch = 0;
  private yaw = 0;

  private eyeHeight = 1.6; // meters
  private avatarRadius = 0.32; // collision radius
  private walkSpeed = 3.2; // m/s
  private sprintSpeed = 6.0;

  private onUnlockCallbacks: (() => void)[] = [];

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);

    this.attachEvents();
  }

  public setWalls(walls: Wall[], vertices: Vertex[]) {
    this.walls = walls;
    this.vertexMap.clear();
    vertices.forEach((v) => this.vertexMap.set(v.id, v));
  }

  public setPosition(x: number, z: number) {
    this.camera.position.set(x, this.eyeHeight, z);
  }

  public lock() {
    this.domElement.requestPointerLock();
  }

  public unlock() {
    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }
  }

  public onUnlock(callback: () => void) {
    this.onUnlockCallbacks.push(callback);
  }

  private attachEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  public dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private onPointerLockChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
    if (!this.isLocked) {
      this.moveForward = false;
      this.moveBackward = false;
      this.moveLeft = false;
      this.moveRight = false;
      this.onUnlockCallbacks.forEach((cb) => cb());
    }
  }

  private onKeyDown(event: KeyboardEvent) {
    if (!this.isLocked) return;

    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isSprinting = true;
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isSprinting = false;
        break;
    }
  }

  private onMouseMove(event: MouseEvent) {
    if (!this.isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    const sensitivity = 0.0022;
    this.yaw -= movementX * sensitivity;
    this.pitch -= movementY * sensitivity;

    // Clamp vertical look between ~ -85 deg and +85 deg
    this.pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, this.pitch));

    // Apply rotation order
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  public update(deltaSeconds: number) {
    if (!this.isLocked) return;

    const delta = Math.min(0.1, deltaSeconds);
    const speed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    // Damping friction
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * speed * 12.0 * delta;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * speed * 12.0 * delta;
    }

    // World movement vectors
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveX = (forward.x * -this.velocity.z + right.x * -this.velocity.x) * delta;
    const moveZ = (forward.z * -this.velocity.z + right.z * -this.velocity.x) * delta;

    let targetX = this.camera.position.x + moveX;
    let targetZ = this.camera.position.z + moveZ;

    // Dynamic collision resolution with walls (sliding sphere/circle test)
    for (const wall of this.walls) {
      const v1 = this.vertexMap.get(wall.startVertexId);
      const v2 = this.vertexMap.get(wall.endVertexId);
      if (!v1 || !v2) continue;

      const pA = { x: v1.x, y: v1.y };
      const pB = { x: v2.x, y: v2.y };
      const curPos = { x: targetX, y: targetZ };

      const proj = projectPointOntoSegment(curPos, pA, pB);
      const minSafeDist = this.avatarRadius + (wall.thickness || 0.15) / 2;

      if (proj.dist < minSafeDist && proj.dist > 0.0001) {
        // Push avatar away along normal
        const overlap = minSafeDist - proj.dist;
        const pushDirX = (curPos.x - proj.point.x) / proj.dist;
        const pushDirZ = (curPos.y - proj.point.y) / proj.dist;

        targetX += pushDirX * overlap;
        targetZ += pushDirZ * overlap;
      }
    }

    // Ground clamp
    this.camera.position.x = targetX;
    this.camera.position.z = targetZ;
    this.camera.position.y = this.eyeHeight;
  }
}
