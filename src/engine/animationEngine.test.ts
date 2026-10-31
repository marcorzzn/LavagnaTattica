import {
  lerp,
  easeInOutCubic,
  quadBezier,
  ballPositionForAction,
  interpolateAt,
} from './animationEngine';
import { Keyframe, TacticalAction } from '../core/types';

export function runAnimationEngineTests(): { passed: boolean; details: string[] } {
  const details: string[] = [];
  let allPass = true;

  // 1. easeInOutCubic symmetry test
  const mid = easeInOutCubic(0.5);
  const midPass = Math.abs(mid - 0.5) < 1e-9;
  if (!midPass) allPass = false;
  details.push(`[TEST ANIMATION] easeInOutCubic(0.5) = ${mid} (Atteso 0.5): ${midPass ? 'PASS' : 'FAIL'}`);

  const startEase = easeInOutCubic(0);
  const endEase = easeInOutCubic(1);
  const easeBoundsPass = startEase === 0 && endEase === 1;
  if (!easeBoundsPass) allPass = false;
  details.push(`[TEST ANIMATION] easeInOutCubic bounds: [${startEase}, ${endEase}]: ${easeBoundsPass ? 'PASS' : 'FAIL'}`);

  // 2. quadBezier test
  const bezierMid = quadBezier(10, 20, 30, 0.5);
  const bezierMidPass = Math.abs(bezierMid - 20) < 1e-9;
  if (!bezierMidPass) allPass = false;
  details.push(`[TEST ANIMATION] quadBezier(10, 20, 30, t=0.5) = ${bezierMid}: ${bezierMidPass ? 'PASS' : 'FAIL'}`);

  // 3. ballPositionForAction heightCm = 0 -> z = 0 for all t
  const flatAction: TacticalAction = {
    id: 'act-1',
    keyframeFrom: 'kf-1',
    keyframeTo: 'kf-2',
    type: 'pass_ground',
    playerId: 'home-06',
    params: {
      speedKmh: 60,
      heightCm: 0,
      curve: 0,
      contact: 'flat',
      duration: 1000,
    },
  };
  const z0 = ballPositionForAction(flatAction, { x: 20, y: 40 }, { x: 50, y: 40 }, 0).z;
  const zHalf = ballPositionForAction(flatAction, { x: 20, y: 40 }, { x: 50, y: 40 }, 500).z;
  const z1 = ballPositionForAction(flatAction, { x: 20, y: 40 }, { x: 50, y: 40 }, 1000).z;
  const zZeroPass = z0 === 0 && zHalf === 0 && z1 === 0;
  if (!zZeroPass) allPass = false;
  details.push(`[TEST ANIMATION] ballPositionForAction con heightCm=0 -> z=0 per tutti i t: ${zZeroPass ? 'PASS' : 'FAIL'}`);

  // 4. Parabolic peak test for lofted pass: heightCm = 250cm -> z(0.5) = 2.5m
  const loftedAction: TacticalAction = {
    id: 'act-2',
    keyframeFrom: 'kf-1',
    keyframeTo: 'kf-2',
    type: 'cross',
    playerId: 'home-11',
    params: {
      speedKmh: 75,
      heightCm: 250,
      curve: 0,
      contact: 'collar',
      duration: 1200,
    },
  };
  const zPeak = ballPositionForAction(loftedAction, { x: 80, y: 15 }, { x: 105, y: 40 }, 600).z;
  const zPeakPass = Math.abs(zPeak - 2.5) < 1e-6;
  if (!zPeakPass) allPass = false;
  details.push(`[TEST ANIMATION] Cross con heightCm=250cm -> picco z(t=0.5)=${zPeak.toFixed(2)}m (Atteso 2.50m): ${zPeakPass ? 'PASS' : 'FAIL'}`);

  // 5. interpolateAt at t=0 and t=total returns exact snapshots
  const mockKeyframes: Keyframe[] = [
    {
      id: 'kf-test-1',
      timestamp: 0,
      players: [{ id: 'p1', x: 20, y: 30, visible: true }],
      ball: { x: 20, y: 30, z: 0, carrierId: 'p1' },
    },
    {
      id: 'kf-test-2',
      timestamp: 2000,
      players: [{ id: 'p1', x: 40, y: 50, visible: true }],
      ball: { x: 60, y: 40, z: 0, carrierId: null },
    },
  ];

  const at0 = interpolateAt(mockKeyframes, 0);
  const p0 = at0.players.get('p1');
  const snap0Pass = p0?.x === 20 && p0?.y === 30 && at0.ball.x === 20 && at0.ball.y === 30;
  if (!snap0Pass) allPass = false;
  details.push(`[TEST ANIMATION] interpolateAt a t=0 restituisce snapshot esatto kf-1: ${snap0Pass ? 'PASS' : 'FAIL'}`);

  const atEnd = interpolateAt(mockKeyframes, 2000);
  const pEnd = atEnd.players.get('p1');
  const snapEndPass = pEnd?.x === 40 && pEnd?.y === 50 && atEnd.ball.x === 60 && atEnd.ball.y === 40;
  if (!snapEndPass) allPass = false;
  details.push(`[TEST ANIMATION] interpolateAt a t=2000ms restituisce snapshot esatto kf-2: ${snapEndPass ? 'PASS' : 'FAIL'}`);

  return { passed: allPass, details };
}
