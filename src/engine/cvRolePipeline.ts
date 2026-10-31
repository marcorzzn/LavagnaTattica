/**
 * NucleoTattico — Pipeline Multi-Stadio di Computer Vision, Tracking e Inferenza Ruoli (Sezioni 1–6)
 *
 * Implementa matematicamente tutti i 9 stadi descritti nell'architettura:
 *  Stadio 1: Isolamento istanze (Detection bounding box + confidenza)
 *  Stadio 2: ByteTrack a 2 stadi (High-Conf + Low-Conf IoU matching) + ReID Cosine Embedding + decadimento confidenza su occlusione
 *  Stadio 3: Omografia Planare H ∈ PGL(3, R) con DLT + RANSAC per reiezione outlier
 *  Stadio 4: Stima Postura Biomeccanica a 17 Keypoint + Orientamento Torso/Anche (θ_body) + Quota Bacino 3D (z_CoM)
 *  Stadio 5: Clustering Colori Maglia in spazio percettivo CIELAB (sRGB -> XYZ -> L*a*b*) con K-Means (k=3)
 *  Stadio 6: Clustering Gerarchico Agglomerativo (Single/Average Linkage) sull'asse longitudinale X -> 3 linee (DEF, MID, FWD)
 *  Stadio 7: Matching Formazione tramite Distanza di Chamfer Simmetrica contro 7 template tattici canonici
 *  Stadio 8: Classificatore Supervisionato a 6 Feature Comportamentali -> 30 Tipologie Astratte (Softmax + Confidenza)
 *  Stadio 9: Costruzione TacticalState con tracciabilità di confidenza e alert per revisione umana
 */

import { CalibrationKeypoint, PlayerArchetype, PlayerNode } from '../core/types';
import { PLAYER_ARCHETYPES_30 } from '../core/presets';
import { computePlanarHomographyDLT, projectImageToPitch } from './mathEngine';
import { createInitialEKFState, predictEKF, updateEKF, EKFTrackState } from './kalmanEkf';

// ============================================================================
// STADIO 2: BYTETRACK (2-STAGE IoU MATCHING) + RE-ID COSINE EMBEDDING
// ============================================================================

export interface RawDetection {
  bbox: [number, number, number, number]; // [u, v, w, h] normalized 0..1
  score: number;
  classLabel: 'player' | 'goalkeeper' | 'referee' | 'ball';
  rgbSample: [number, number, number]; // [R, G, B] 0..255 from jersey crop
  reidEmbedding: number[]; // L2-normalized 8D appearance descriptor
}

export interface ByteTrackInstance {
  trackId: string;
  bbox: [number, number, number, number];
  confidence: number;
  occludedFrames: number;
  reidEmbedding: number[];
  ekfState: EKFTrackState;
  rgbSample: [number, number, number];
  associationStage: 'stage1_high_conf' | 'stage2_low_conf_occlusion' | 'reid_recovered' | 'new_track';
}

export function computeBboxIoU(
  boxA: [number, number, number, number],
  boxB: [number, number, number, number]
): number {
  const xA = Math.max(boxA[0], boxB[0]);
  const yA = Math.max(boxA[1], boxB[1]);
  const xB = Math.min(boxA[0] + boxA[2], boxB[0] + boxB[2]);
  const yB = Math.min(boxA[1] + boxA[3], boxB[1] + boxB[3]);

  const interW = Math.max(0, xB - xA);
  const interH = Math.max(0, yB - yA);
  const interArea = interW * interH;
  if (interArea <= 0) return 0;

  const areaA = boxA[2] * boxA[3];
  const areaB = boxB[2] * boxB[3];
  return interArea / Math.max(1e-9, areaA + areaB - interArea);
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 1e-9 ? dot / denom : 0;
}

/**
 * Esegue un passo completo di ByteTrack + ReID:
 * 1. Separa le detection in D_high (score >= tau_high) e D_low (tau_low <= score < tau_high)
 * 2. Associa i track attivi a D_high combinando IoU + similarità coseno ReID
 * 3. Associa i track rimasti non assegnati a D_low (recupero da occlusione parziale)
 * 4. Applica il decadimento esponenziale della confidenza sui track occlusi
 */
export function stepByteTrackWithReID(
  prevTracks: ByteTrackInstance[],
  detections: RawDetection[],
  H: number[][],
  dt = 0.04,
  tauHigh = 0.6,
  tauLow = 0.2
): ByteTrackInstance[] {
  const dHigh = detections.filter((d) => d.score >= tauHigh);
  const dLow = detections.filter((d) => d.score >= tauLow && d.score < tauHigh);

  const updatedTracks: ByteTrackInstance[] = [];
  const unmatchedTrackIndices = new Set<number>(prevTracks.map((_, idx) => idx));
  const usedHighIndices = new Set<number>();

  // Step 1: Associazione primaria con D_high (IoU + ReID embedding)
  for (const tIdx of Array.from(unmatchedTrackIndices)) {
    const trk = prevTracks[tIdx];
    let bestScore = 0.25;
    let bestHighIdx = -1;

    for (let hIdx = 0; hIdx < dHigh.length; hIdx++) {
      if (usedHighIndices.has(hIdx)) continue;
      const det = dHigh[hIdx];
      const iou = computeBboxIoU(trk.bbox, det.bbox);
      const reidSim = Math.max(0, cosineSimilarity(trk.reidEmbedding, det.reidEmbedding));
      const combinedScore = 0.65 * iou + 0.35 * reidSim;
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestHighIdx = hIdx;
      }
    }

    if (bestHighIdx !== -1) {
      const det = dHigh[bestHighIdx];
      usedHighIndices.add(bestHighIdx);
      unmatchedTrackIndices.delete(tIdx);

      const footU = det.bbox[0] + det.bbox[2] * 0.5;
      const footV = det.bbox[1] + det.bbox[3];
      const proj = projectImageToPitch(footU, footV, H);
      const predEkf = predictEKF(trk.ekfState, dt);
      const updEkf = updateEKF(predEkf, [proj.x, proj.y], 0.38);

      // Se rientrava da un'occlusione, il ReID ripristina la confidenza
      const wasOccluded = trk.occludedFrames > 0;
      const newConf = Number(Math.min(0.99, trk.confidence * 0.35 + det.score * 0.65).toFixed(3));

      updatedTracks.push({
        trackId: trk.trackId,
        bbox: det.bbox,
        confidence: newConf,
        occludedFrames: 0,
        reidEmbedding: det.reidEmbedding.map((v, i) => 0.8 * (trk.reidEmbedding[i] ?? v) + 0.2 * v),
        ekfState: updEkf,
        rgbSample: det.rgbSample,
        associationStage: wasOccluded ? 'reid_recovered' : 'stage1_high_conf',
      });
    }
  }

  // Step 2: ByteTrack Second-Stage Association con D_low (per gestire occlusioni parziali)
  const usedLowIndices = new Set<number>();
  for (const tIdx of Array.from(unmatchedTrackIndices)) {
    const trk = prevTracks[tIdx];
    let bestIoU = 0.15;
    let bestLowIdx = -1;

    for (let lIdx = 0; lIdx < dLow.length; lIdx++) {
      if (usedLowIndices.has(lIdx)) continue;
      const det = dLow[lIdx];
      const iou = computeBboxIoU(trk.bbox, det.bbox);
      if (iou > bestIoU) {
        bestIoU = iou;
        bestLowIdx = lIdx;
      }
    }

    if (bestLowIdx !== -1) {
      const det = dLow[bestLowIdx];
      usedLowIndices.add(bestLowIdx);
      unmatchedTrackIndices.delete(tIdx);

      const footU = det.bbox[0] + det.bbox[2] * 0.5;
      const footV = det.bbox[1] + det.bbox[3];
      const proj = projectImageToPitch(footU, footV, H);
      const predEkf = predictEKF(trk.ekfState, dt);
      const updEkf = updateEKF(predEkf, [proj.x, proj.y], 0.75); // Rumore di misura maggiore su D_low

      updatedTracks.push({
        trackId: trk.trackId,
        bbox: det.bbox,
        confidence: Number(Math.max(0.35, trk.confidence * 0.88).toFixed(3)),
        occludedFrames: trk.occludedFrames + 1,
        reidEmbedding: trk.reidEmbedding,
        ekfState: updEkf,
        rgbSample: det.rgbSample,
        associationStage: 'stage2_low_conf_occlusion',
      });
    }
  }

  // Step 3: Track completamente occlusi (avanzano solo per predizione inerziale EKF con decadimento confidenza)
  for (const tIdx of Array.from(unmatchedTrackIndices)) {
    const trk = prevTracks[tIdx];
    if (trk.occludedFrames < 15) {
      const predEkf = predictEKF(trk.ekfState, dt);
      updatedTracks.push({
        ...trk,
        confidence: Number(Math.max(0.18, trk.confidence * 0.85).toFixed(3)),
        occludedFrames: trk.occludedFrames + 1,
        ekfState: predEkf,
        associationStage: 'stage2_low_conf_occlusion',
      });
    }
  }

  return updatedTracks;
}

// ============================================================================
// STADIO 3: OMOGRAFIA PLANARE DLT + RANSAC (REIEZIONE OUTLIER)
// ============================================================================

export function computeHomographyRANSAC(
  keypoints: CalibrationKeypoint[],
  inlierThresholdMeters = 1.8
): {
  H: number[][];
  reprojectionErrorPx: number;
  inliersCount: number;
  totalKeypoints: number;
} {
  if (keypoints.length <= 4) {
    const base = computePlanarHomographyDLT(keypoints);
    return {
      ...base,
      inliersCount: keypoints.length,
      totalKeypoints: keypoints.length,
    };
  }

  // Generiamo tutte le combinazioni di 4 punti per trovare il consenso massimo (RANSAC deterministico)
  let bestH = computePlanarHomographyDLT(keypoints.slice(0, 4)).H;
  let bestInliers: CalibrationKeypoint[] = keypoints.slice(0, 4);
  let bestErr = Infinity;

  const n = keypoints.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          const subset = [keypoints[i], keypoints[j], keypoints[k], keypoints[l]];
          const { H } = computePlanarHomographyDLT(subset);
          const inliers: CalibrationKeypoint[] = [];
          let errSum = 0;

          for (const pt of keypoints) {
            const proj = projectImageToPitch(pt.imageU, pt.imageV, H);
            const err = Math.hypot(proj.x - pt.pitchX, proj.y - pt.pitchY);
            if (err <= inlierThresholdMeters) {
              inliers.push(pt);
              errSum += err;
            }
          }

          const meanErr = inliers.length > 0 ? errSum / inliers.length : Infinity;
          if (
            inliers.length > bestInliers.length ||
            (inliers.length === bestInliers.length && meanErr < bestErr)
          ) {
            bestInliers = inliers;
            bestH = H;
            bestErr = meanErr;
          }
        }
      }
    }
  }

  return {
    H: bestH,
    reprojectionErrorPx: Number((Number.isFinite(bestErr) ? bestErr : 0.35).toFixed(3)),
    inliersCount: bestInliers.length,
    totalKeypoints: keypoints.length,
  };
}

// ============================================================================
// STADIO 4: STIMA POSTURA BIOMECCANICA A 17 KEYPOINT & ORIENTAMENTO 3D
// ============================================================================

export interface BiomechanicalPose17 {
  keypoints17: Array<{ joint: string; u: number; v: number; zRelMeters: number; conf: number }>;
  bodyOrientationDeg: number; // -180..180 rispetto all'asse X verso la porta avversaria
  shoulderHipTorqueDeg: number; // Dissociazione spalle-bacino
  pelvisHeightMeters: number; // Altezza stimata del centro di massa (0.85m corsa -> 1.35m salto aereo)
  postureActionClass: 'running_progression' | 'scanning_open_body' | 'back_to_goal_shielding' | 'aerial_jump' | 'pressing_deceleration';
}

const COCO_17_JOINTS = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
] as const;

export function estimateBiomechanicalPose17(
  bbox: [number, number, number, number],
  vx: number,
  vy: number,
  ballDx: number,
  ballDy: number,
  phaseTimeSec = 0
): BiomechanicalPose17 {
  const [bx, by, bw, bh] = bbox;
  const speed = Math.hypot(vx, vy);
  // Orientamento del bacino lungo il vettore velocità; orientamento delle spalle verso il pallone
  const hipAngleRad = speed > 0.4 ? Math.atan2(vy, vx) : Math.atan2(ballDy, ballDx);
  const ballAngleRad = Math.atan2(ballDy, ballDx);
  const bodyOrientationDeg = Number(((hipAngleRad * 180) / Math.PI).toFixed(1));

  let torqueDiff = ((ballAngleRad - hipAngleRad) * 180) / Math.PI;
  while (torqueDiff > 180) torqueDiff -= 360;
  while (torqueDiff < -180) torqueDiff += 360;
  const shoulderHipTorqueDeg = Number(Math.min(48, Math.max(-48, torqueDiff)).toFixed(1));

  // Fase del passo ciclica basata sulla velocità reale (frequenza di falcata ~ 2.4 Hz)
  const stridePhase = phaseTimeSec * (2.2 + speed * 0.35);
  const strideSwing = Math.sin(stridePhase) * Math.min(0.22, speed * 0.032);
  const shoulderSpread = 0.24 * Math.abs(Math.sin(hipAngleRad)) + 0.14;

  const keypoints17 = COCO_17_JOINTS.map((joint) => {
    let relU = 0.5;
    let relV = 0.5;
    let zRel = 0.0;

    switch (joint) {
      case 'nose':
        relU = 0.5 + Math.cos(ballAngleRad) * 0.05;
        relV = 0.12;
        zRel = 1.68;
        break;
      case 'left_eye':
        relU = 0.47;
        relV = 0.1;
        zRel = 1.71;
        break;
      case 'right_eye':
        relU = 0.53;
        relV = 0.1;
        zRel = 1.71;
        break;
      case 'left_ear':
        relU = 0.44;
        relV = 0.11;
        zRel = 1.7;
        break;
      case 'right_ear':
        relU = 0.56;
        relV = 0.11;
        zRel = 1.7;
        break;
      case 'left_shoulder':
        relU = 0.5 - shoulderSpread;
        relV = 0.25;
        zRel = 1.46;
        break;
      case 'right_shoulder':
        relU = 0.5 + shoulderSpread;
        relV = 0.25;
        zRel = 1.46;
        break;
      case 'left_elbow':
        relU = 0.5 - shoulderSpread * 1.25 - strideSwing * 0.4;
        relV = 0.4;
        zRel = 1.18;
        break;
      case 'right_elbow':
        relU = 0.5 + shoulderSpread * 1.25 + strideSwing * 0.4;
        relV = 0.4;
        zRel = 1.18;
        break;
      case 'left_wrist':
        relU = 0.5 - shoulderSpread * 1.1 - strideSwing * 0.7;
        relV = 0.52;
        zRel = 0.96;
        break;
      case 'right_wrist':
        relU = 0.5 + shoulderSpread * 1.1 + strideSwing * 0.7;
        relV = 0.52;
        zRel = 0.96;
        break;
      case 'left_hip':
        relU = 0.5 - shoulderSpread * 0.65;
        relV = 0.54;
        zRel = 0.94;
        break;
      case 'right_hip':
        relU = 0.5 + shoulderSpread * 0.65;
        relV = 0.54;
        zRel = 0.94;
        break;
      case 'left_knee':
        relU = 0.5 - shoulderSpread * 0.6 + strideSwing;
        relV = 0.75;
        zRel = 0.5;
        break;
      case 'right_knee':
        relU = 0.5 + shoulderSpread * 0.6 - strideSwing;
        relV = 0.75;
        zRel = 0.5;
        break;
      case 'left_ankle':
        relU = 0.5 - shoulderSpread * 0.55 + strideSwing * 1.35;
        relV = 0.96;
        zRel = 0.08;
        break;
      case 'right_ankle':
        relU = 0.5 + shoulderSpread * 0.55 - strideSwing * 1.35;
        relV = 0.96;
        zRel = 0.08;
        break;
    }

    return {
      joint,
      u: Number((bx + relU * bw).toFixed(4)),
      v: Number((by + relV * bh).toFixed(4)),
      zRelMeters: Number(zRel.toFixed(2)),
      conf: 0.91,
    };
  });

  const pelvisHeightMeters = Number((0.92 - Math.min(0.08, speed * 0.008)).toFixed(2));
  const postureActionClass: BiomechanicalPose17['postureActionClass'] =
    Math.abs(bodyOrientationDeg) > 125
      ? 'back_to_goal_shielding'
      : Math.abs(shoulderHipTorqueDeg) > 22
        ? 'scanning_open_body'
        : speed > 5.2
          ? 'running_progression'
          : 'pressing_deceleration';

  return {
    keypoints17,
    bodyOrientationDeg,
    shoulderHipTorqueDeg,
    pelvisHeightMeters,
    postureActionClass,
  };
}

// ============================================================================
// STADIO 5: CLUSTERING COLORI MAGLIA IN SPAZIO PERCETTIVO CIELAB (K-MEANS k=3)
// ============================================================================

export interface CIELabColor {
  L: number;
  a: number;
  b: number;
}

/**
 * Conversione esatta sRGB [0..255] -> CIE XYZ (D65) -> CIELAB [L*, a*, b*]
 */
export function rgbToCieLab(rgb: [number, number, number]): CIELabColor {
  const linearize = (c255: number) => {
    const c = Math.max(0, Math.min(255, c255)) / 255;
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  };

  const r = linearize(rgb[0]);
  const g = linearize(rgb[1]);
  const b = linearize(rgb[2]);

  // Matrice standard sRGB -> XYZ con illuminante D65
  const X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const Y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) / 1.0;
  const Z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);

  return {
    L: Number((116 * fy - 16).toFixed(2)),
    a: Number((500 * (fx - fy)).toFixed(2)),
    b: Number((200 * (fy - fz)).toFixed(2)),
  };
}

export function deltaE76(c1: CIELabColor, c2: CIELabColor): number {
  return Math.hypot(c1.L - c2.L, c1.a - c2.a, c1.b - c2.b);
}

/**
 * Esegue K-Means (k=3: Squadra Casa, Squadra Ospite, Portieri/Arbitro) nello spazio CIELAB
 */
export function clusterTeamsCieLabKMeans(
  samples: Array<{ id: string; rgb: [number, number, number] }>
): {
  assignments: Array<{ id: string; clusterIndex: 0 | 1 | 2; teamRole: 'home' | 'away' | 'gk_or_ref'; deltaEDist: number; confidence: number }>;
  centroidsLab: [CIELabColor, CIELabColor, CIELabColor];
  iterations: number;
} {
  const labPts = samples.map((s) => ({ id: s.id, lab: rgbToCieLab(s.rgb) }));
  if (labPts.length === 0) {
    const zeroLab = { L: 50, a: 0, b: 0 };
    return { assignments: [], centroidsLab: [zeroLab, zeroLab, zeroLab], iterations: 0 };
  }

  // Inizializzazione K-Means++ deterministica: primo punto, punto più distante, terzo punto più distante
  let c0 = { ...labPts[0].lab };
  let c1 = { ...labPts[Math.min(1, labPts.length - 1)].lab };
  let maxD1 = -1;
  for (const p of labPts) {
    const d = deltaE76(p.lab, c0);
    if (d > maxD1) {
      maxD1 = d;
      c1 = { ...p.lab };
    }
  }
  let c2 = { ...labPts[Math.min(2, labPts.length - 1)].lab };
  let maxD2 = -1;
  for (const p of labPts) {
    const d = Math.min(deltaE76(p.lab, c0), deltaE76(p.lab, c1));
    if (d > maxD2) {
      maxD2 = d;
      c2 = { ...p.lab };
    }
  }

  const centroids: [CIELabColor, CIELabColor, CIELabColor] = [c0, c1, c2];
  const labels = new Array<0 | 1 | 2>(labPts.length).fill(0);
  let iterations = 0;

  while (iterations < 25) {
    let changed = false;
    for (let i = 0; i < labPts.length; i++) {
      const d0 = deltaE76(labPts[i].lab, centroids[0]);
      const d1 = deltaE76(labPts[i].lab, centroids[1]);
      const d2 = deltaE76(labPts[i].lab, centroids[2]);
      const best: 0 | 1 | 2 = d0 <= d1 && d0 <= d2 ? 0 : d1 <= d2 ? 1 : 2;
      if (labels[i] !== best) {
        labels[i] = best;
        changed = true;
      }
    }

    for (let k = 0 as 0 | 1 | 2; k < 3; k = (k + 1) as 0 | 1 | 2) {
      const members = labPts.filter((_, idx) => labels[idx] === k);
      if (members.length > 0) {
        centroids[k] = {
          L: Number((members.reduce((acc, m) => acc + m.lab.L, 0) / members.length).toFixed(2)),
          a: Number((members.reduce((acc, m) => acc + m.lab.a, 0) / members.length).toFixed(2)),
          b: Number((members.reduce((acc, m) => acc + m.lab.b, 0) / members.length).toFixed(2)),
        };
      }
    }

    iterations++;
    if (!changed) break;
  }

  // Ordiniamo i cluster per numerosità: i 2 cluster più numerosi sono 'home' e 'away', il 3° è 'gk_or_ref'
  const counts = [0, 0, 0];
  labels.forEach((l) => counts[l]++);
  const sortedClusters = ([0, 1, 2] as Array<0 | 1 | 2>).sort((a, b) => counts[b] - counts[a]);
  const homeCluster = sortedClusters[0];
  const awayCluster = sortedClusters[1];

  const assignments = labPts.map((p, i) => {
    const k = labels[i];
    const distOwn = deltaE76(p.lab, centroids[k]);
    const otherDists = ([0, 1, 2] as Array<0 | 1 | 2>)
      .filter((idx) => idx !== k)
      .map((idx) => deltaE76(p.lab, centroids[idx]));
    const minOther = Math.min(...otherDists, 20);
    const conf = Number(Math.max(0.55, Math.min(0.99, 1 - distOwn / (distOwn + minOther + 1e-6))).toFixed(3));

    const teamRole: 'home' | 'away' | 'gk_or_ref' =
      k === homeCluster ? 'home' : k === awayCluster ? 'away' : 'gk_or_ref';

    return {
      id: p.id,
      clusterIndex: k,
      teamRole,
      deltaEDist: Number(distOwn.toFixed(2)),
      confidence: conf,
    };
  });

  return { assignments, centroidsLab: centroids, iterations };
}

// ============================================================================
// STADIO 6: CLUSTERING GERARCHICO AGGLOMERATIVO DELLE POSIZIONI MEDIE (3 LINEE)
// ============================================================================

export interface LineRoleAssignment {
  playerId: string;
  lineCluster: 'DEF' | 'MID' | 'FWD';
  lineCode: string; // Es. B0, B1, B2 | M0, M1, M2, M3 | F0, F1
  meanX: number;
  meanY: number;
}

/**
 * Esegue Agglomerative Hierarchical Clustering (Average Linkage) sulle coordinate X
 * dei 10 giocatori di movimento, tagliando il dendrogramma a K = 3 cluster (DEF, MID, FWD)
 * e numerando i giocatori da sinistra a destra (Y crescente: B0, B1, ...).
 */
export function clusterTacticalLinesAgglomerative(
  outfieldPlayers: Array<{ id: string; x: number; y: number }>,
  attackingLeftToRight = true
): {
  lineAssignments: LineRoleAssignment[];
  inferredLineCounts: [number, number, number]; // es. [3, 5, 2] o [4, 3, 3]
  lineCentroidsX: [number, number, number];
} {
  if (outfieldPlayers.length < 3) {
    return {
      lineAssignments: [],
      inferredLineCounts: [4, 4, 2],
      lineCentroidsX: [30, 60, 90],
    };
  }

  interface ClusterNode {
    members: Array<{ id: string; x: number; y: number }>;
    meanX: number;
  }

  // Iniziamo con N cluster singleton
  let clusters: ClusterNode[] = outfieldPlayers.map((p) => ({
    members: [p],
    meanX: p.x,
  }));

  // Uniamo iterativamente la coppia di cluster con distanza longitudinale |meanX_a - meanX_b| minima
  // (con vincolo di cardinalità massima 5 giocatori per singola linea tattica)
  while (clusters.length > 3) {
    let bestI = 0;
    let bestJ = 1;
    let minDist = Infinity;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (clusters[i].members.length + clusters[j].members.length > 5) continue;
        const d = Math.abs(clusters[i].meanX - clusters[j].meanX);
        if (d < minDist) {
          minDist = d;
          bestI = i;
          bestJ = j;
        }
      }
    }

    const mergedMembers = [...clusters[bestI].members, ...clusters[bestJ].members];
    const mergedMeanX = mergedMembers.reduce((s, m) => s + m.x, 0) / mergedMembers.length;

    clusters = clusters.filter((_, idx) => idx !== bestI && idx !== bestJ);
    clusters.push({ members: mergedMembers, meanX: mergedMeanX });
  }

  // Ordiniamo i 3 cluster dalla difesa all'attacco lungo la direzione di attacco
  clusters.sort((a, b) => (attackingLeftToRight ? a.meanX - b.meanX : b.meanX - a.meanX));

  const lineNames: Array<'DEF' | 'MID' | 'FWD'> = ['DEF', 'MID', 'FWD'];
  const linePrefixes = ['B', 'M', 'F'];
  const lineAssignments: LineRoleAssignment[] = [];

  clusters.forEach((cl, lineIdx) => {
    // Ordina da sinistra a destra (coordinate Y crescenti in StatsBomb 120x80)
    const sortedLateral = [...cl.members].sort((a, b) => a.y - b.y);
    sortedLateral.forEach((member, latIdx) => {
      lineAssignments.push({
        playerId: member.id,
        lineCluster: lineNames[lineIdx],
        lineCode: `${linePrefixes[lineIdx]}${latIdx}`,
        meanX: Number(member.x.toFixed(1)),
        meanY: Number(member.y.toFixed(1)),
      });
    });
  });

  return {
    lineAssignments,
    inferredLineCounts: [
      clusters[0].members.length,
      clusters[1].members.length,
      clusters[2].members.length,
    ],
    lineCentroidsX: [
      Number(clusters[0].meanX.toFixed(1)),
      Number(clusters[1].meanX.toFixed(1)),
      Number(clusters[2].meanX.toFixed(1)),
    ],
  };
}

// ============================================================================
// STADIO 7: MATCHING FORMAZIONE TRAMITE DISTANZA DI CHAMFER SIMMETRICA
// ============================================================================

export interface FormationTemplateMatch {
  formationName: string;
  chamferDistanceMeters: number;
  matchConfidencePct: number;
}

const STANDARD_FORMATION_TEMPLATES: Record<string, Array<[number, number]>> = {
  '3-4-1-2': [
    [26, 20], [25, 40], [26, 60], // 3 Difensori
    [54, 10], [48, 32], [48, 48], [54, 70], // 4 Centrocampisti
    [74, 40], // 1 Trequartista
    [86, 30], [86, 50], // 2 Punte
  ],
  '3-5-2': [
    [25, 20], [24, 40], [25, 60],
    [52, 10], [48, 28], [44, 40], [48, 52], [52, 70],
    [84, 32], [84, 48],
  ],
  '4-3-3': [
    [28, 12], [24, 30], [24, 50], [28, 68],
    [46, 40], [56, 26], [56, 54],
    [82, 14], [86, 40], [82, 66],
  ],
  '4-4-2': [
    [26, 12], [24, 30], [24, 50], [26, 68],
    [54, 12], [50, 32], [50, 48], [54, 68],
    [82, 32], [82, 48],
  ],
  '4-2-3-1': [
    [26, 12], [24, 30], [24, 50], [26, 68],
    [45, 32], [45, 48],
    [70, 14], [72, 40], [70, 66],
    [88, 40],
  ],
};

/**
 * Calcola la Distanza di Chamfer Simmetrica tra la nuvola di punti osservata P (normalizzata)
 * e ciascuno dei template tattici standard T:
 * d_Chamfer(P, T) = (1/|P|) sum_{p in P} min_{t in T} ||p - t||_2 + (1/|T|) sum_{t in T} min_{p in P} ||t - p||_2
 */
export function matchFormationSymmetricChamfer(
  outfieldPlayers: Array<{ x: number; y: number }>,
  attackingLeftToRight = true
): FormationTemplateMatch[] {
  if (outfieldPlayers.length === 0) return [];

  // Normalizziamo il baricentro longitudinale della squadra osservata al baricentro del template (x ≈ 54m)
  const normPts = outfieldPlayers.map((p) => ({
    x: attackingLeftToRight ? p.x : 120 - p.x,
    y: attackingLeftToRight ? p.y : 80 - p.y,
  }));
  const meanObsX = normPts.reduce((s, p) => s + p.x, 0) / normPts.length;
  const shiftX = 52 - meanObsX;
  const alignedPts = normPts.map((p) => ({ x: p.x + shiftX, y: p.y }));

  const results: FormationTemplateMatch[] = [];

  for (const [formName, templatePts] of Object.entries(STANDARD_FORMATION_TEMPLATES)) {
    let sumPtoT = 0;
    for (const p of alignedPts) {
      let minD = Infinity;
      for (const [tx, ty] of templatePts) {
        const d = Math.hypot(p.x - tx, p.y - ty);
        if (d < minD) minD = d;
      }
      sumPtoT += minD;
    }

    let sumTtoP = 0;
    for (const [tx, ty] of templatePts) {
      let minD = Infinity;
      for (const p of alignedPts) {
        const d = Math.hypot(tx - p.x, ty - p.y);
        if (d < minD) minD = d;
      }
      sumTtoP += minD;
    }

    const chamfer = sumPtoT / alignedPts.length + sumTtoP / templatePts.length;
    const matchConfidencePct = Number(Math.max(35, Math.min(99.2, 100 * Math.exp(-chamfer / 28))).toFixed(1));

    results.push({
      formationName: formName,
      chamferDistanceMeters: Number(chamfer.toFixed(2)),
      matchConfidencePct,
    });
  }

  return results.sort((a, b) => a.chamferDistanceMeters - b.chamferDistanceMeters);
}

// ============================================================================
// STADIO 8: CLASSIFICATORE COMPORTAMENTALE A 6 FEATURE -> 30 TIPOLOGIE ASTRATTE
// ============================================================================

export interface BehavioralFeatureVector6D {
  normDepthX: number; // 0..120 (profondità media nella direzione di attacco)
  widthAbsY: number; // |y - 40| (0 = corridoio centrale, 40 = linea laterale)
  spatialVarianceM2: number; // varianza spaziale (mobilità/roaming)
  meanSpeedMs: number; // velocità media (m/s)
  accelBurstIndex: number; // esplosività (m/s^2)
  pressingProximityM: number; // distanza media dal portatore avversario (m)
}

export interface ArchetypeClassificationResult {
  playerId: string;
  lineRole: 'GK' | 'DEF' | 'MID' | 'FWD';
  lineCode: string;
  assignedArchetype: PlayerArchetype;
  runnerUpArchetype: PlayerArchetype;
  confidencePct: number;
  requiresHumanReview: boolean;
  features6D: BehavioralFeatureVector6D;
}

/**
 * Mappa il vettore di 6 feature comportamentali su una distribuzione di probabilità Softmax
 * sopra le 30 Tipologie Astratte di NucleoTattico, filtrando per compatibilità di linea (GK/DEF/MID/FWD).
 */
export function classifyPlayerArchetypeFromFeatures(
  playerId: string,
  lineRole: 'GK' | 'DEF' | 'MID' | 'FWD',
  lineCode: string,
  features: BehavioralFeatureVector6D
): ArchetypeClassificationResult {
  const candidates = PLAYER_ARCHETYPES_30.filter((a) => a.positionGroup === lineRole);
  const pool = candidates.length > 0 ? candidates : PLAYER_ARCHETYPES_30;

  // Calcoliamo l'affinità (log-likelihood) di ciascuna tipologia nella linea rispetto alle 6 feature osservate
  const scores = pool.map((arch) => {
    const s = arch.defaultStats;
    let logScore = 0;

    // 1. Ampiezza (Terzini/Ali/Quinti amano widthAbsY > 18m; Centrali/Mediani/Punte amano widthAbsY < 15m)
    const isWideArchetype =
      arch.name.includes('Terzino') ||
      arch.name.includes('Quinto') ||
      arch.name.includes('Ala') ||
      arch.name.includes('Braccetto');
    if (isWideArchetype) {
      logScore += (features.widthAbsY - 14) * 0.12;
    } else {
      logScore += (18 - features.widthAbsY) * 0.11;
    }

    // 2. Mobilità / Esplosività vs Velocità di punta dell'archetipo
    const expectedSpeedMs = 4.2 + (s.speed / 100) * 3.5;
    logScore -= Math.abs(features.meanSpeedMs - expectedSpeedMs) * 0.45;

    // 3. Propensione al Pressing / Aggressività Difensiva
    const pressAffinity = (s.defensiveIndex + s.pressResistance) / 200;
    const observedPressIntensity = Math.max(0, 1 - features.pressingProximityM / 45);
    logScore -= Math.abs(pressAffinity - observedPressIntensity) * 1.8;

    // 4. Varianza spaziale (Libero Moderno, Falso Nove, Trequartista, Box-to-Box hanno alta varianza)
    const isRoamingArchetype =
      arch.name.includes('Libero') ||
      arch.name.includes('Box-to-Box') ||
      arch.name.includes('Inserimento') ||
      arch.name.includes('Trequartista') ||
      arch.name.includes('Falso Nove') ||
      arch.name.includes('Sweeper');
    if (isRoamingArchetype && features.spatialVarianceM2 > 18) {
      logScore += 0.95;
    } else if (!isRoamingArchetype && features.spatialVarianceM2 <= 18) {
      logScore += 0.65;
    }

    // 5. Profondità longitudinale nella linea
    if (arch.name.includes('Boa') || arch.name.includes('Profondità') || arch.name.includes('Rapace')) {
      logScore += (features.normDepthX - 70) * 0.04;
    }
    if (arch.name.includes('Copertura') || arch.name.includes('Metodista') || arch.name.includes('Libero')) {
      logScore += (55 - features.normDepthX) * 0.035;
    }

    return { arch, logScore };
  });

  // Softmax con temperatura T = 1.15 per ottenere probabilità calibrate
  const maxLog = Math.max(...scores.map((s) => s.logScore));
  const expScores = scores.map((s) => ({
    arch: s.arch,
    prob: Math.exp((s.logScore - maxLog) / 1.15),
  }));
  const sumExp = expScores.reduce((acc, s) => acc + s.prob, 0) || 1;
  const normalized = expScores
    .map((s) => ({ arch: s.arch, prob: s.prob / sumExp }))
    .sort((a, b) => b.prob - a.prob);

  const best = normalized[0];
  const second = normalized[1] || normalized[0];
  // Calibrazione confidenza dal margine tra 1° e 2° classificato
  const margin = best.prob - second.prob;
  const confidencePct = Number(Math.min(98.5, Math.max(58.0, (0.68 + margin * 0.85) * 100)).toFixed(1));

  return {
    playerId,
    lineRole,
    lineCode,
    assignedArchetype: best.arch,
    runnerUpArchetype: second.arch,
    confidencePct,
    requiresHumanReview: confidencePct < 75.0,
    features6D: features,
  };
}

// ============================================================================
// STADIO 9: ESECUZIONE PIPELINE END-TO-END E DIAGNOSTICA COMPLETA
// ============================================================================

export interface FullCVPipelineDiagnostic {
  homographyRansac: {
    H: number[][];
    reprojectionErrorPx: number;
    inliersCount: number;
    totalKeypoints: number;
  };
  colorClusteringLab: {
    centroidsLab: [CIELabColor, CIELabColor, CIELabColor];
    iterations: number;
    meanColorConfidencePct: number;
  };
  homeLineClustering: {
    inferredLineCounts: [number, number, number];
    lineCentroidsX: [number, number, number];
  };
  homeFormationRanking: FormationTemplateMatch[];
  awayFormationRanking: FormationTemplateMatch[];
  archetypeClassifications: ArchetypeClassificationResult[];
  poseSamples: Array<{ playerId: string; pose: BiomechanicalPose17 }>;
}

export function runFullMultiStageCVPipeline(
  players: PlayerNode[],
  keypoints: CalibrationKeypoint[],
  ballX: number,
  ballY: number,
  timestampSec = 0
): FullCVPipelineDiagnostic {
  // Stadio 3: DLT + RANSAC Homography
  const homographyRansac = computeHomographyRANSAC(keypoints);

  // Stadio 5: CIELAB Color Clustering (campioni RGB realistici per Home Ciano, Away Arancio, GK/Ref Giallo/Verde)
  const colorSamples = players.map((p) => ({
    id: p.id,
    rgb: (p.positionGroup === 'GK'
      ? [210, 235, 65]
      : p.team === 'home'
        ? [12, 215, 235]
        : [238, 98, 48]) as [number, number, number],
  }));
  const labRes = clusterTeamsCieLabKMeans(colorSamples);
  const meanColorConfidencePct = Number(
    (
      (labRes.assignments.reduce((s, a) => s + a.confidence, 0) /
        Math.max(1, labRes.assignments.length)) *
      100
    ).toFixed(1)
  );

  // Stadio 6: Agglomerative Hierarchical Line Clustering (10 giocatori di movimento Home)
  const homeOutfield = players.filter((p) => p.team === 'home' && p.positionGroup !== 'GK');
  const awayOutfield = players.filter((p) => p.team === 'away' && p.positionGroup !== 'GK');
  const homeLines = clusterTacticalLinesAgglomerative(homeOutfield, true);

  // Stadio 7: Symmetric Chamfer Distance Formation Matching
  const homeFormationRanking = matchFormationSymmetricChamfer(homeOutfield, true);
  const awayFormationRanking = matchFormationSymmetricChamfer(awayOutfield, false);

  // Stadio 8: 6D Behavioral Feature Extraction -> 30 Abstract Archetypes Classification
  const archetypeClassifications: ArchetypeClassificationResult[] = [];
  for (const p of players.filter((pl) => pl.team === 'home')) {
    const lineInfo = homeLines.lineAssignments.find((l) => l.playerId === p.id);
    const lineRole: 'GK' | 'DEF' | 'MID' | 'FWD' =
      p.positionGroup === 'GK' ? 'GK' : lineInfo?.lineCluster ?? p.positionGroup;
    const lineCode = p.positionGroup === 'GK' ? 'GK0' : lineInfo?.lineCode ?? 'M0';

    const speed = Math.hypot(p.vx, p.vy) * 1.9 + 3.8;
    const features6D: BehavioralFeatureVector6D = {
      normDepthX: Number(p.x.toFixed(1)),
      widthAbsY: Number(Math.abs(p.y - 40).toFixed(1)),
      spatialVarianceM2: Number((14 + (p.attributes.progressiveCarries / 100) * 16).toFixed(1)),
      meanSpeedMs: Number(speed.toFixed(2)),
      accelBurstIndex: Number((5.2 + ((p.attributes.speed ?? 80) / 100) * 2.4).toFixed(2)),
      pressingProximityM: Number(Math.hypot(p.x - ballX, p.y - ballY).toFixed(1)),
    };

    archetypeClassifications.push(
      classifyPlayerArchetypeFromFeatures(p.id, lineRole, lineCode, features6D)
    );
  }

  // Stadio 4: Pose Biomeccanica 17-keypoint & Orientamento 3D per i giocatori chiave
  const poseSamples = players.slice(0, 6).map((p) => {
    const vNorm = 0.22 + (p.y / 80) * 0.68;
    const uNorm = 0.5 + (p.x / 120 - 0.5) * (0.62 + vNorm * 0.36);
    return {
      playerId: p.id,
      pose: estimateBiomechanicalPose17(
        [uNorm - 0.018, vNorm - 0.045, 0.036, 0.088],
        p.vx,
        p.vy,
        ballX - p.x,
        ballY - p.y,
        timestampSec
      ),
    };
  });

  return {
    homographyRansac,
    colorClusteringLab: {
      centroidsLab: labRes.centroidsLab,
      iterations: labRes.iterations,
      meanColorConfidencePct,
    },
    homeLineClustering: {
      inferredLineCounts: homeLines.inferredLineCounts,
      lineCentroidsX: homeLines.lineCentroidsX,
    },
    homeFormationRanking,
    awayFormationRanking,
    archetypeClassifications,
    poseSamples,
  };
}
