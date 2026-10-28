/**
 * Filtro di Kalman Esteso (EKF) a 4 stati per il tracking cinematico multi-agente
 * Stato: x_k = [x, y, vx, vy]^T
 * Misura: z_k = [x_obs, y_obs]^T (proiettata tramite omografia planare H ∈ PGL(3, R))
 */

export interface EKFTrackState {
  trackId: string;
  x: [number, number, number, number]; // [px, py, vx, vy]
  P: number[][]; // 4x4 state covariance matrix
  innovationNorm: number;
}

export function createInitialEKFState(
  trackId: string,
  x0: number,
  y0: number,
  vx0 = 0,
  vy0 = 0
): EKFTrackState {
  return {
    trackId,
    x: [x0, y0, vx0, vy0],
    P: [
      [0.8, 0, 0, 0],
      [0, 0.8, 0, 0],
      [0, 0, 1.5, 0],
      [0, 0, 0, 1.5],
    ],
    innovationNorm: 0,
  };
}

function matMul(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const C: number[][] = Array.from({ length: rowsA }, () => Array(colsB).fill(0));
  for (let i = 0; i < rowsA; i++) {
    for (let k = 0; k < colsA; k++) {
      const aik = A[i][k];
      for (let j = 0; j < colsB; j++) {
        C[i][j] += aik * B[k][j];
      }
    }
  }
  return C;
}

function matTranspose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0].length;
  const T: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      T[c][r] = A[r][c];
    }
  }
  return T;
}

function matAdd(A: number[][], B: number[][], sign = 1): number[][] {
  return A.map((row, r) => row.map((val, c) => val + sign * B[r][c]));
}

function invert2x2(M: number[][]): number[][] {
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  const safeDet = Math.abs(det) < 1e-9 ? 1e-9 : det;
  return [
    [M[1][1] / safeDet, -M[0][1] / safeDet],
    [-M[1][0] / safeDet, M[0][0] / safeDet],
  ];
}

/**
 * Step di Predizione EKF:
 * x_{k|k-1} = F * x_{k-1|k-1} (con smorzamento aerodinamico/fisiologico drag)
 * P_{k|k-1} = F * P_{k-1|k-1} * F^T + Q
 */
export function predictEKF(state: EKFTrackState, dt: number, accelNoiseSigma = 1.8): EKFTrackState {
  const drag = 0.96;
  const F = [
    [1, 0, dt, 0],
    [0, 1, 0, dt],
    [0, 0, drag, 0],
    [0, 0, 0, drag],
  ];

  const dt2 = 0.5 * dt * dt;
  const q = accelNoiseSigma * accelNoiseSigma;
  const Q = [
    [dt2 * dt2 * q, 0, dt2 * dt * q, 0],
    [0, dt2 * dt2 * q, 0, dt2 * dt * q],
    [dt2 * dt * q, 0, dt * dt * q, 0],
    [0, dt2 * dt * q, 0, dt * dt * q],
  ];

  const [px, py, vx, vy] = state.x;
  const xPred: [number, number, number, number] = [
    px + vx * dt,
    py + vy * dt,
    vx * drag,
    vy * drag,
  ];

  const FP = matMul(F, state.P);
  const FPFt = matMul(FP, matTranspose(F));
  const PPred = matAdd(FPFt, Q, 1);

  return {
    trackId: state.trackId,
    x: xPred,
    P: PPred,
    innovationNorm: state.innovationNorm,
  };
}

/**
 * Step di Aggiornamento EKF:
 * y_k = z_k - H * x_{k|k-1}
 * S_k = H * P_{k|k-1} * H^T + R
 * K_k = P_{k|k-1} * H^T * S_k^{-1}
 * x_{k|k} = x_{k|k-1} + K_k * y_k
 * P_{k|k} = (I - K_k * H) * P_{k|k-1}
 */
export function updateEKF(
  predState: EKFTrackState,
  zObs: [number, number],
  measNoiseSigmaM = 0.45
): EKFTrackState {
  const H_meas = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
  ];
  const r = measNoiseSigmaM * measNoiseSigmaM;
  const R_matrix = [
    [r, 0],
    [0, r],
  ];

  // Innovation y = z - H * x
  const y0 = zObs[0] - predState.x[0];
  const y1 = zObs[1] - predState.x[1];
  const innovationNorm = Number(Math.hypot(y0, y1).toFixed(4));

  // S = H * P * H^T + R (2x2)
  const HP = matMul(H_meas, predState.P);
  const HPHt = matMul(HP, matTranspose(H_meas));
  const S = matAdd(HPHt, R_matrix, 1);
  const SInv = invert2x2(S);

  // Kalman Gain K = P * H^T * S^{-1} (4x2)
  const PHt = matMul(predState.P, matTranspose(H_meas));
  const K = matMul(PHt, SInv);

  // State update x = x + K * y
  const xUpd: [number, number, number, number] = [
    Math.max(0, Math.min(120, predState.x[0] + K[0][0] * y0 + K[0][1] * y1)),
    Math.max(0, Math.min(80, predState.x[1] + K[1][0] * y0 + K[1][1] * y1)),
    Math.max(-10.5, Math.min(10.5, predState.x[2] + K[2][0] * y0 + K[2][1] * y1)),
    Math.max(-10.5, Math.min(10.5, predState.x[3] + K[3][0] * y0 + K[3][1] * y1)),
  ];

  // Covariance update P = (I - K * H) * P
  const KH = matMul(K, H_meas);
  const I4 = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  const IminusKH = matAdd(I4, KH, -1);
  const PUpd = matMul(IminusKH, predState.P);

  return {
    trackId: predState.trackId,
    x: xUpd,
    P: PUpd,
    innovationNorm,
  };
}

export function getCovarianceTrace(state: EKFTrackState): number {
  return Number((state.P[0][0] + state.P[1][1] + state.P[2][2] + state.P[3][3]).toFixed(4));
}
