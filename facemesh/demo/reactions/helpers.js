import { assert } from "console";

export function Bbox2D(bbox) {
  const { topLeft, bottomRight } = bbox;
  return {
    topLeft: topLeft,
    bottomRight: bottomRight,
    center: {
      x: (topLeft[0] + bottomRight[0]) * 0.5,
      y: (topLeft[1] + bottomRight[1]) * 0.5,
    },
    width: Math.abs(bottomRight[0] - topLeft[0]),
    height: Math.abs(bottomRight[1] - topLeft[1]),
  };
}

export function l2Norm(vec) {
  let norm = 0;
  for (const v of vec) {
    norm += v * v;
  }
  return Math.sqrt(norm);
}

export function dotProd(v1, v2) {
  assert(v1.length === v2.length);
  let product = 0;
  for (let i = 0; i < v1.length; i++) {
    product += v1[i] * v2[i];
  }
  return product;
}

export function getVectorsAngleCos(v1, v2) {
  return dotProd(v1, v2) / (l2Norm(v1) * l2Norm(v2));
}

function isBboxesIntersectsHelper(bbox1, bbox2) {
  if (
    bbox1.topLeft[0] <= bbox2.bottomRight[0] &&
    bbox1.topLeft[1] <= bbox2.bottomRight[1] &&
    bbox1.bottomRight[1] >= bbox2.bottomRight[1] &&
    (bbox1.topLeft[0] >= bbox2.topLeft[0] ||
      bbox1.bottomRight[0] >= bbox2.topLeft[0])
  ) {
    return true;
  }
  return false;
}

export function isBboxesIntersects(bbox1, bbox2) {
  return (
    isBboxesIntersectsHelper(bbox1, bbox2) ||
    isBboxesIntersectsHelper(bbox2, bbox1)
  );
}

export function bbox2DIntersection(bbox1, bbox2) {
  if (!isBboxesIntersects(bbox1, bbox2)) {
    return 0;
  }
  const { width, height } = Bbox2D(bbox1);
  const bbox1Volume = width * height;
  const newBbox = Bbox2D({
    topLeft: [
      Math.max(bbox1.topLeft[0], bbox2.topLeft[0]),
      Math.max(bbox1.topLeft[1], bbox2.topLeft[1]),
    ],
    bottomRight: [
      Math.min(bbox1.bottomRight[0], bbox2.bottomRight[0]),
      Math.min(bbox1.bottomRight[1], bbox2.bottomRight[1]),
    ],
  });
  const newBboxVolume = newBbox.width * newBbox.height;
  return newBboxVolume / bbox1Volume;
}

export function crossProd(points) {
  assert(points.length === 3);
  const a =
    (points[1][1] - points[0][1]) * (points[2][2] - points[0][2]) -
    (points[2][1] - points[0][1]) * (points[1][2] - points[0][2]);
  const b =
    (points[1][2] - points[0][2]) * (points[2][0] - points[0][0]) -
    (points[2][2] - points[0][2]) * (points[1][0] - points[0][0]);
  const c =
    (points[1][0] - points[0][0]) * (points[2][1] - points[0][1]) -
    (points[2][0] - points[0][0]) * (points[1][1] - points[0][1]);
  return [a, b, c];
}

export class Plane {
  constructor(points) {
    // cross product
    const [a, b, c] = crossProd(points);
    const d = -1 * (a * points[0][0] + b * points[0][1] + c * points[0][2]);
    this.coefs = { a, b, c, d };
  }

  projectPoint(point) {
    const t =
      (-1 *
        (this.coefs.a * point[0] +
          this.coefs.b * point[1] +
          this.coefs.c * point[2])) /
      (this.coefs.a * this.coefs.a +
        this.coefs.b * this.coefs.b +
        this.coefs.c * this.coefs.c);
    return [
      this.coefs.a * t + point[0],
      this.coefs.b * t + point[1],
      this.coefs.c * t + point[2],
    ];
  }
}
