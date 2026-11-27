import {
  AmbientLight, Color, DirectionalLight, DynamicDrawUsage, GridHelper, HemisphereLight,
  InstancedMesh, Line, LineBasicMaterial, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera,
  PlaneGeometry, QuadraticBezierCurve3, Raycaster, Scene, SRGBColorSpace, Vector2, Vector3,
  WebGLRenderer, BufferGeometry, MathUtils,
} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const LANE_COLORS = ['#5eeac1', '#9fa8ff'];
const ACTIVE = '#ffbb75';
const PINNED = '#fff2cd';
const Y_AXIS = new Vector3(0, 1, 0);

function createScene(canvas, {onInspect, onSelect, onUnavailable}) {
  const renderer = new WebGLRenderer({canvas, antialias: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  scene.background = new Color('#0d1a24');
  scene.add(new AmbientLight('#91add8', .68));
  scene.add(new HemisphereLight('#edfaff', '#274855', 2));
  const key = new DirectionalLight('#fff3cf', 2.35);
  key.position.set(3, 11, 6);
  scene.add(key);
  const fill = new DirectionalLight('#70a9ff', 1.75);
  fill.position.set(-6, 4, -9);
  scene.add(fill);

  const floor = new Mesh(new PlaneGeometry(43, 43), new MeshStandardMaterial({color: '#14242c', roughness: .96}));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4.25;
  scene.add(floor);
  const groundGrid = new GridHelper(34, 34, '#3d5967', '#28404a');
  groundGrid.position.y = -4.23;
  scene.add(groundGrid);
  const zeroGrid = new GridHelper(22, 22, '#81afbd', '#476575');
  zeroGrid.material.transparent = true;
  zeroGrid.material.opacity = .27;
  zeroGrid.material.depthWrite = false;
  scene.add(zeroGrid);

  const camera = new PerspectiveCamera(41, 1, .1, 150);
  const controls = new OrbitControls(camera, canvas);
  controls.cursorStyle = 'grab';
  controls.enableDamping = true;
  controls.dampingFactor = .17;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 53;
  controls.maxPolarAngle = Math.PI * .63;
  controls.autoRotateSpeed = .55;
  controls.target.set(0, .45, 0);

  const barGeometry = new RoundedBoxGeometry(1, 1, 1, 2, .09);
  const barMaterial = new MeshStandardMaterial({roughness: .34, metalness: .18});
  const transform = new Object3D();
  const size = new Vector2();
  const point = new Vector2();
  const ray = new Raycaster();
  const tone = new Color();
  const lanes = LANE_COLORS.map((color, index) => {
    const arc = new Line(new BufferGeometry(), new LineBasicMaterial({color: ACTIVE, transparent: true, opacity: .88}));
    arc.visible = false;
    scene.add(arc);
    return {color, z: index === 0 ? 1.7 : -1.7, arc, mesh: null, bars: []};
  });

  let running = true;
  let visible = true;
  let animated = false;
  let repaint = true;
  let tween = false;
  let previousTime = 0;
  let measure = 1;
  let down;
  controls.addEventListener('change', () => { repaint = true; });

  function sizeCanvas() {
    if (!visible || !running) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.getSize(size);
    if (size.x !== width || size.y !== height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    repaint = true;
  }

  function reset() {
    controls.target.set(0, .3, 0);
    camera.position.set(6.5, 9.6, camera.aspect < 1.2 ? 28 : 18.5);
    controls.update();
    repaint = true;
  }

  function configureLane(lane, source, index) {
    const count = source.frame.values.length;
    if (!lane.mesh || lane.bars.length !== count) {
      if (lane.mesh) {
        scene.remove(lane.mesh);
        lane.mesh.dispose();
      }
      lane.mesh = new InstancedMesh(barGeometry, barMaterial, count);
      lane.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      lane.mesh.frustumCulled = false;
      lane.mesh.userData.lane = index;
      lane.bars = Array.from({length: count}, () => ({height: 0, goal: 0}));
      scene.add(lane.mesh);
      lane.fresh = true;
    }
    lane.source = source;
    const spacing = Math.min(1.08, 17.5 / Math.max(1, count));
    const active = new Set(source.frame.indices || []);
    for (let position = 0; position < count; position += 1) {
      const bar = lane.bars[position];
      bar.x = spacing * (position - (count - 1) / 2);
      bar.width = Math.min(.76, spacing * .72);
      const value = source.frame.values[position];
      bar.goal = 3.8 * value / measure;
      if (lane.fresh || !animated) bar.height = bar.goal;
      bar.color = source.focus?.position === position ? PINNED : active.has(position) ? ACTIVE : lane.color;
      lane.mesh.setColorAt(position, tone.set(bar.color));
    }
    lane.fresh = false;
    if (lane.mesh.instanceColor) lane.mesh.instanceColor.needsUpdate = true;
    const [first, second] = [...active].map(position => lane.bars[position]);
    lane.arc.visible = Boolean(first && second && first !== second && ['compare', 'swap'].includes(source.frame.phase));
    if (lane.arc.visible) {
      const start = new Vector3(first.x, Math.max(0, first.goal) + .08, lane.z);
      const end = new Vector3(second.x, Math.max(0, second.goal) + .08, lane.z);
      const crest = new Vector3((first.x + second.x) / 2, Math.max(start.y, end.y) + .85, lane.z + .10);
      lane.arc.geometry.dispose();
      lane.arc.geometry = new BufferGeometry().setFromPoints(new QuadraticBezierCurve3(start, crest, end).getPoints(32));
    }
  }

  function setFrame(next, {motion = false, orbit = false} = {}) {
    if (!running) return;
    animated = motion;
    controls.autoRotate = orbit;
    measure = Math.max(1, ...next.flatMap(lane => lane.initial.map(Math.abs)));
    next.forEach((source, index) => configureLane(lanes[index], source, index));
    tween = true;
    repaint = true;
  }

  function paint(time) {
    const elapsed = Math.min(.07, (time - previousTime) / 1000 || .016);
    previousTime = time;
    if (!visible || !running) return;
    const cameraChanged = controls.update(elapsed);
    if (!repaint && !tween && !cameraChanged) return;
    repaint = false;
    tween = false;
    for (const lane of lanes) {
      if (!lane.mesh) continue;
      lane.bars.forEach((bar, index) => {
        const gap = bar.goal - bar.height;
        if (Math.abs(gap) > .006) {
          bar.height = MathUtils.damp(bar.height, bar.goal, 22, elapsed);
          tween = true;
        } else bar.height = bar.goal;
        const height = Math.max(.055, Math.abs(bar.height));
        transform.position.set(bar.x, bar.height ? Math.sign(bar.height) * height / 2 : 0, lane.z);
        transform.scale.set(bar.width, height, .77);
        transform.updateMatrix();
        lane.mesh.setMatrixAt(index, transform.matrix);
      });
      lane.mesh.instanceMatrix.needsUpdate = true;
      lane.mesh.boundingSphere = null;
    }
    renderer.render(scene, camera);
  }

  function pick(event) {
    if (!running || !visible) return null;
    const rect = canvas.getBoundingClientRect();
    point.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    ray.setFromCamera(point, camera);
    const hit = ray.intersectObjects(lanes.map(lane => lane.mesh).filter(Boolean), false)[0];
    if (!hit) return null;
    return {lane: hit.object.userData.lane, position: hit.instanceId};
  }

  canvas.addEventListener('pointerdown', event => { down = [event.clientX, event.clientY]; });
  canvas.addEventListener('pointermove', event => { if (!event.buttons && event.pointerType !== 'touch') onInspect(pick(event)); });
  canvas.addEventListener('pointerleave', () => onInspect(null));
  canvas.addEventListener('pointerup', event => {
    if (down && Math.hypot(event.clientX - down[0], event.clientY - down[1]) < 5) {
      const hit = pick(event);
      if (hit) onSelect(hit);
    }
    down = undefined;
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    running = false;
    renderer.setAnimationLoop(null);
    onUnavailable();
  });
  const observer = new ResizeObserver(sizeCanvas);
  observer.observe(canvas);
  sizeCanvas();
  reset();
  renderer.setAnimationLoop(paint);

  return {
    setFrame,
    setVisible(value) { visible = value; sizeCanvas(); },
    reset,
    rotate(radians) {
      camera.position.sub(controls.target).applyAxisAngle(Y_AXIS, radians).add(controls.target);
      controls.update();
      repaint = true;
    },
    zoom(factor) {
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(offset);
      controls.update();
      repaint = true;
    },
  };
}

globalThis.SortStudioScene = Object.freeze({create: createScene});
