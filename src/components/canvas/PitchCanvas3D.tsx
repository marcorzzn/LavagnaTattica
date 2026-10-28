import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OverlayType, PassEdge, PlayerNode, SixPillarsMetrics } from '../../core/types';

interface PitchCanvas3DProps {
  players: PlayerNode[];
  passEdges: PassEdge[];
  ballX: number;
  ballY: number;
  activeOverlays: OverlayType[];
  metrics: SixPillarsMetrics;
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string) => void;
}

type CameraPreset = 'broadcast' | 'tactical_high' | 'set_piece_box' | 'libero_pov';

export const PitchCanvas3D: React.FC<PitchCanvas3DProps> = ({
  players,
  passEdges,
  ballX,
  ballY,
  activeOverlays,
  metrics,
  selectedPlayerId,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('broadcast');
  const [showTrajectoryArcs, setShowTrajectoryArcs] = useState<boolean>(true);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});

  const toWorld = (sx: number, sy: number) => ({
    wx: sx - 60,
    wz: sy - 40,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 560;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.FogExp2(0x09090b, 0.0045);
    sceneRef.current = scene;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 400);
    camera.position.set(0, 56, 78);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 18;
    controls.maxDistance = 165;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x09090b, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.65);
    keyLight.position.set(35, 75, 45);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 200;
    const d = 70;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00f2ff, 0.55);
    rimLight.position.set(-55, 40, -50);
    scene.add(rimLight);

    const pitchCanvas = document.createElement('canvas');
    pitchCanvas.width = 1200;
    pitchCanvas.height = 800;
    const ctx = pitchCanvas.getContext('2d')!;
    ctx.fillStyle = '#0c1926';
    ctx.fillRect(0, 0, 1200, 800);

    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#0e1e2e' : '#0b1622';
      ctx.fillRect(i * 100, 0, 100, 800);
    }

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 1160, 760);
    ctx.beginPath();
    ctx.moveTo(600, 20);
    ctx.lineTo(600, 780);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(600, 400, 91.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeRect(20, 180, 180, 440);
    ctx.strokeRect(1000, 180, 180, 440);
    ctx.strokeRect(20, 300, 60, 200);
    ctx.strokeRect(1120, 300, 60, 200);

    const pitchTex = new THREE.CanvasTexture(pitchCanvas);
    pitchTex.colorSpace = THREE.SRGBColorSpace;
    pitchTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const pitchGeo = new THREE.PlaneGeometry(120, 80);
    const pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTex,
      roughness: 0.82,
      metalness: 0.08,
    });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.rotation.x = -Math.PI / 2;
    pitchMesh.receiveShadow = true;
    scene.add(pitchMesh);

    const surroundGeo = new THREE.PlaneGeometry(180, 130);
    const surroundMat = new THREE.MeshStandardMaterial({
      color: 0x070a0f,
      roughness: 0.95,
      metalness: 0.05,
    });
    const surroundMesh = new THREE.Mesh(surroundGeo, surroundMat);
    surroundMesh.rotation.x = -Math.PI / 2;
    surroundMesh.position.y = -0.05;
    scene.add(surroundMesh);

    const createGoalGroup = (xPos: number) => {
      const goalGroup = new THREE.Group();
      const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.8 });
      const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.44, 12);
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.set(0, 1.22, -3.66);
      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.set(0, 1.22, 3.66);
      const crossbarGeo = new THREE.CylinderGeometry(0.12, 0.12, 7.32, 12);
      const crossbar = new THREE.Mesh(crossbarGeo, postMat);
      crossbar.rotation.x = Math.PI / 2;
      crossbar.position.set(0, 2.44, 0);
      goalGroup.add(leftPost, rightPost, crossbar);
      goalGroup.position.x = xPos;
      return goalGroup;
    };
    scene.add(createGoalGroup(-60), createGoalGroup(60));

    const dynamicGroup = new THREE.Group();
    dynamicGroup.name = 'dynamicActors';
    scene.add(dynamicGroup);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        controls.update();
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;
    controls.addEventListener('change', requestRender);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 900;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);
    requestRender();

    return () => {
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', requestRender);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const dynamicGroup = scene.getObjectByName('dynamicActors') as THREE.Group;
    if (!dynamicGroup) return;

    while (dynamicGroup.children.length > 0) {
      const child = dynamicGroup.children[0];
      dynamicGroup.remove(child);
    }

    players.forEach((p) => {
      const { wx, wz } = toWorld(p.x, p.y);
      const isHome = p.team === 'home';
      const isSelected = p.id === selectedPlayerId;
      const playerGroup = new THREE.Group();

      const kitColor = isHome ? 0x00f2ff : 0xff6b35;
      const baseMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xb4ff39 : kitColor,
        roughness: 0.3,
        metalness: 0.65,
      });
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isHome ? 0x0284c7 : 0xea580c,
        roughness: 0.55,
        metalness: 0.2,
      });
      const headMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.4,
        metalness: 0.1,
      });

      const hScale = (p.heightCm / 180) * 1.35;

      const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.22, 24), baseMat);
      baseRing.position.y = 0.11;

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 1.6 * hScale, 16), bodyMat);
      torso.position.y = 0.22 + 0.8 * hScale;
      torso.castShadow = true;

      const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.32, 0.65), baseMat);
      shoulders.position.y = 0.22 + 1.45 * hScale;

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), headMat);
      head.position.y = 0.22 + 1.95 * hScale;

      playerGroup.add(baseRing, torso, shoulders, head);

      if (p.heightCm >= 192 || p.id === 'home-06') {
        const domeGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.08, 24);
        const domeMat = new THREE.MeshBasicMaterial({
          color: p.heightCm >= 192 ? 0xb4ff39 : 0xf43f5e,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 0.3 + 2.4 * hScale;
        playerGroup.add(dome);
      }

      playerGroup.position.set(wx, 0, wz);
      dynamicGroup.add(playerGroup);
    });

    const ballPos = toWorld(ballX, ballY);
    const ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.3 })
    );
    ballMesh.position.set(ballPos.wx, 0.65, ballPos.wz);
    dynamicGroup.add(ballMesh);

    if (showTrajectoryArcs) {
      const quintoSx = players.find((p) => p.id === 'away-03');
      const boa = players.find((p) => p.id === 'away-09');
      if (quintoSx && boa) {
        const start = toWorld(quintoSx.x, quintoSx.y);
        const end = toWorld(boa.x, boa.y);
        const midX = (start.wx + end.wx) / 2;
        const midZ = (start.wz + end.wz) / 2;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(start.wx, 0.5, start.wz),
          new THREE.Vector3(midX, 11.5, midZ),
          new THREE.Vector3(end.wx, 2.8, end.wz)
        );
        const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.18, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: 0xff6b35,
          emissive: 0xff6b35,
          emissiveIntensity: 0.45,
          roughness: 0.3,
        });
        dynamicGroup.add(new THREE.Mesh(tubeGeo, tubeMat));
      }

      passEdges.slice(0, 6).forEach((edge) => {
        const p1 = players.find((p) => p.id === edge.fromId);
        const p2 = players.find((p) => p.id === edge.toId);
        if (!p1 || !p2) return;
        const s = toWorld(p1.x, p1.y);
        const e = toWorld(p2.x, p2.y);
        const dist = Math.hypot(e.wx - s.wx, e.wz - s.wz);
        const apexY = dist > 22 ? 4.2 : 1.2;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(s.wx, 0.4, s.wz),
          new THREE.Vector3((s.wx + e.wx) / 2, apexY, (s.wz + e.wz) / 2),
          new THREE.Vector3(e.wx, 0.4, e.wz)
        );
        const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.14, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: edge.isAssist ? 0xb4ff39 : 0x00f2ff,
          emissive: edge.isAssist ? 0xb4ff39 : 0x00f2ff,
          emissiveIntensity: 0.35,
        });
        dynamicGroup.add(new THREE.Mesh(tubeGeo, tubeMat));
      });
    }

    if (activeOverlays.includes('tda_gaps')) {
      metrics.tdaBarcodes
        .filter((b) => b.dimension === 1 && b.centerX && b.centerY)
        .forEach((gap) => {
          const pos = toWorld(gap.centerX!, gap.centerY!);
          const r = gap.radius || 6.5;
          const cylGeo = new THREE.CylinderGeometry(r, r, 3.2, 32, 1, true);
          const cylMat = new THREE.MeshBasicMaterial({
            color: 0xb4ff39,
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const cyl = new THREE.Mesh(cylGeo, cylMat);
          cyl.position.set(pos.wx, 1.6, pos.wz);
          dynamicGroup.add(cyl);
        });
    }

    requestRenderRef.current();
  }, [players, passEdges, ballX, ballY, activeOverlays, metrics, selectedPlayerId, showTrajectoryArcs]);

  const applyPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;

    if (preset === 'broadcast') {
      cam.position.set(0, 54, 76);
      ctrl.target.set(0, 0, 0);
    } else if (preset === 'tactical_high') {
      cam.position.set(0, 96, 12);
      ctrl.target.set(0, 0, 0);
    } else if (preset === 'set_piece_box') {
      cam.position.set(-15, 22, 38);
      ctrl.target.set(-28, 2, 0);
    } else if (preset === 'libero_pov') {
      const libero = players.find((p) => p.id === 'home-06');
      const pos = toWorld(libero?.x ?? 27, libero?.y ?? 40);
      cam.position.set(pos.wx - 14, 9.5, pos.wz);
      ctrl.target.set(pos.wx + 30, 1.5, pos.wz);
    }
    ctrl.update();
    requestRenderRef.current();
  };

  return (
    <div className="relative w-full h-full bg-[#09090B] rounded-xl border border-zinc-800/80 overflow-hidden">
      <div className="absolute top-3 left-4 z-10 pointer-events-none flex items-center gap-3 text-xs text-zinc-400 font-mono bg-[#09090B]/90 px-3 py-1.5 rounded-lg border border-zinc-800">
        <span className="text-[#00F2FF] font-semibold">PILASTRO I & II: 3D PROJECTION</span>
        <span>·</span>
        <span>FOV {metrics.calibratedFovDeg}°</span>
        <span>·</span>
        <span>Reproj Err {metrics.homographyErrorPx}px</span>
      </div>

      <div ref={mountRef} className="w-full h-full min-h-[460px]" />

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[94vw]">
        <button
          onClick={() => setDockCollapsed(!dockCollapsed)}
          className="px-3 py-1 text-[11px] font-mono text-zinc-300 bg-[#141418] border border-zinc-800 rounded-t-lg hover:text-white transition-colors"
        >
          {dockCollapsed ? '▴ Mostra Controlli Camera 3D' : '▾ Nascondi Controlli (Zen Mode)'}
        </button>
        {!dockCollapsed && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-[#121217] border border-zinc-800 rounded-xl shadow-2xl">
            <span className="text-xs text-zinc-400 mr-1 font-medium">Camera:</span>
            {(
              [
                { id: 'broadcast', label: 'Broadcast TV' },
                { id: 'libero_pov', label: 'POV Libero Moderno (#6)' },
                { id: 'set_piece_box', label: 'Duello Aereo Cross (#9 vs #6)' },
                { id: 'tactical_high', label: 'Drone Top-Down' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  cameraPreset === p.id
                    ? 'bg-[#00F2FF] text-zinc-950 font-semibold'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {p.label}
              </button>
            ))}

            <div className="h-4 w-px bg-zinc-800 mx-1" />

            <button
              onClick={() => setShowTrajectoryArcs(!showTrajectoryArcs)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                showTrajectoryArcs
                  ? 'bg-[#B4FF39]/20 text-[#B4FF39] border border-[#B4FF39]/40'
                  : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              Traiettorie Paraboliche Cross/Passaggi
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
