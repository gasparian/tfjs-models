import * as helpers from "./helpers.js";

export default class HandReactions {
  constructor(
    minBboxratio = 0.95,
    maxBboxRatio = 1.5,
    thumbRatioDiff = 0.2,
    minDetections = 1,
    minHandAngleCos = 0.8
  ) {
    this.emojis = {
      waving: String.fromCodePoint("0x1F44B"),
      thumbsUp: String.fromCodePoint("0x1F44D"),
      thumbsDown: String.fromCodePoint("0x1F44E"),
    };
    this.minBboxratio = minBboxratio;
    this.maxBboxRatio = maxBboxRatio;
    this.thumbRatioDiff = thumbRatioDiff;
    this.counters = {
      thumbsUp: 0,
      thumbsDown: 0,
      waving: 0,
    };
    this.minDetections = minDetections;
    this.minHandAngleCos = minHandAngleCos;
  }

  isFingersBentHorizontallyRight(annotations) {
    return (
      annotations.indexFinger[3][0] > annotations.indexFinger[1][0] &&
      annotations.middleFinger[3][0] > annotations.middleFinger[1][0] &&
      annotations.ringFinger[3][0] > annotations.ringFinger[1][0] &&
      annotations.pinky[3][0] > annotations.pinky[1][0]
    );
  }

  isFingersBentHorizontallyLeft(annotations) {
    return (
      annotations.indexFinger[3][0] < annotations.indexFinger[1][0] &&
      annotations.middleFinger[3][0] < annotations.middleFinger[1][0] &&
      annotations.ringFinger[3][0] < annotations.ringFinger[1][0] &&
      annotations.pinky[3][0] < annotations.pinky[1][0]
    );
  }

  isThumbLeft(annotations) {
    return annotations.palmBase[0][0] < annotations.indexFinger[0][0] &&
      annotations.palmBase[0][0] !== annotations.indexFinger[0][0]
      ? true
      : false;
  }

  isFingersBentHorizontally(annotations) {
    const isLeft = this.isThumbLeft(annotations);
    return isLeft
      ? this.isFingersBentHorizontallyLeft(annotations)
      : this.isFingersBentHorizontallyRight(annotations);
  }

  isThumbsUp(annotations) {
    return (
      annotations.thumb[3][1] / annotations.palmBase[0][1] <=
        1 - this.thumbRatioDiff &&
      annotations.thumb[3][1] < annotations.indexFinger[0][1] &&
      annotations.thumb[3][1] < annotations.indexFinger[3][1] &&
      this.isFingersBentHorizontally(annotations)
    );
  }

  isThumbsDown(annotations) {
    return (
      annotations.thumb[3][1] / annotations.palmBase[0][1] >=
        1 + this.thumbRatioDiff &&
      annotations.thumb[3][1] > annotations.indexFinger[0][1] &&
      annotations.thumb[3][1] > annotations.indexFinger[3][1] &&
      this.isFingersBentHorizontally(annotations)
    );
  }

  countFingersUp(annotations) {
    return (
      +(annotations.indexFinger[3][1] < annotations.indexFinger[2][1]) +
      +(annotations.middleFinger[3][1] < annotations.middleFinger[2][1]) +
      +(annotations.ringFinger[3][1] < annotations.ringFinger[2][1]) +
      +(annotations.pinky[3][1] < annotations.pinky[2][1])
    );
  }

  getHandAngleCos(annotations) {
    // just get an angle between normal vectors of hand plane
    // and global coords plane that we intersted in
    const handPlaneNormalVector = helpers.crossProd([
      annotations.pinky[0],
      annotations.palmBase[0],
      annotations.thumb[2],
    ]);
    return helpers.getVectorsAngleCos(
      [0, 0, 1], // normal vector of a XY plane
      handPlaneNormalVector
    );
  }

  countCheck(reaction) {
    this.counters[reaction]++;
    if (this.counters[reaction] == this.minDetections) {
      this.counters[reaction] = 0;
      return this.emojis[reaction];
    }
    return "";
  }

  getReaction(handPredictions) {
    if (handPredictions.length) {
      for (const handPrediction of handPredictions) {
        const handBbox = helpers.Bbox2D(handPrediction.boundingBox);
        const bboxRatio = handBbox.height / handBbox.width;
        if (this.minBboxratio <= bboxRatio <= this.maxBboxRatio) {
          const handAngleCos = Math.abs(
            this.getHandAngleCos(handPrediction.annotations)
          );
          const isHandInPlane = handAngleCos > this.minHandAngleCos;

          const isThumbsUp =
            this.isThumbsUp(handPrediction.annotations) && isHandInPlane;
          const isThumbsDown =
            this.isThumbsDown(handPrediction.annotations) && isHandInPlane;

          if (isThumbsUp) {
            return this.countCheck("thumbsUp");
          } else if (isThumbsDown) {
            return this.countCheck("thumbsDown");
          }
        }
      }
    }
    return "";
  }
}
