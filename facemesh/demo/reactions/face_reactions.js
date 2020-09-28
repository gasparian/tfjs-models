import * as helpers from "./helpers.js";

export default class FaceReactions {
  constructor(minDetections = 3, lipsCosThrsh = 0.3, headCosThrsh = 0.4) {
    this.emojis = {
      neutral: String.fromCodePoint("0x1F610"),
      shadow: String.fromCodePoint("0x1F47B"),
      smiley: String.fromCodePoint("0x1F604"),
      seeNoEvil: String.fromCodePoint("0x1F648"),
    };
    this.headCosThrsh = headCosThrsh;
    this.lipsCosThrsh = lipsCosThrsh;
    this.minDetections = minDetections;
    this.counters = {
      seeNoEvil: 0,
      smiley: 0,
      neutral: 0,
      shadow: 0,
    };
    this.faceVerticalCentralPoint = -1;
    this.faceHorizontalCentralPoint = -1;
  }

  getHeadAnglesCos(keypoints) {
    // V: 10, 152; H: 226, 446
    this.faceVerticalCentralPoint = [
      0,
      (keypoints[10][1] + keypoints[152][1]) * 0.5,
      (keypoints[10][2] + keypoints[152][2]) * 0.5,
    ];
    const verticalAdjacent =
      keypoints[10][2] - this.faceVerticalCentralPoint[2];
    const verticalOpposite =
      keypoints[10][1] - this.faceVerticalCentralPoint[1];
    const verticalHypotenuse = helpers.l2Norm([
      verticalAdjacent,
      verticalOpposite,
    ]);
    const verticalCos = verticalAdjacent / verticalHypotenuse;

    this.faceHorizontalCentralPoint = [
      (keypoints[226][0] + keypoints[446][0]) * 0.5,
      0,
      (keypoints[226][2] + keypoints[446][2]) * 0.5,
    ];
    const horizontalAdjacent =
      keypoints[226][2] - this.faceHorizontalCentralPoint[2];
    const horizontalOpposite =
      keypoints[226][0] - this.faceHorizontalCentralPoint[0];
    const horizontalHypotenuse = helpers.l2Norm([
      horizontalAdjacent,
      horizontalOpposite,
    ]);
    const horizontalCos = horizontalAdjacent / horizontalHypotenuse;

    return {
      verticalCos,
      horizontalCos,
    };
  }

  getLipsAngleSin(keypoints) {
    const lipsCentralPoint = keypoints[17];
    const lipsLeftCorner = keypoints[61];
    const lipsRightCorner = keypoints[291];

    const lipsCos = helpers.getVectorsAngleCos(
      [
        lipsCentralPoint[0] - lipsLeftCorner[0],
        lipsCentralPoint[1] - lipsLeftCorner[1],
        lipsCentralPoint[2] - lipsLeftCorner[2],
      ],
      [
        lipsCentralPoint[0] - lipsRightCorner[0],
        lipsCentralPoint[1] - lipsRightCorner[1],
        lipsCentralPoint[2] - lipsRightCorner[2],
      ]
    );

    return lipsCos;
  }

  countCheck(reaction) {
    this.counters[reaction]++;
    if (this.counters[reaction] == this.minDetections) {
      this.counters[reaction] = 0;
      return this.emojis[reaction];
    }
    return "";
  }

  getReaction(facePredictions) {
    if (!!facePredictions.length) {
      for (const prediction of facePredictions) {
        const keypoints = prediction.scaledMesh;
        const headAnglesCos = this.getHeadAnglesCos(keypoints);
        const lipsCos = this.getLipsAngleSin(keypoints, headAnglesCos);

        if (
          Math.abs(headAnglesCos.verticalCos) > this.headCosThrsh ||
          Math.abs(headAnglesCos.horizontalCos) > this.headCosThrsh
        ) {
          return this.countCheck("seeNoEvil");
        } else if (
          Math.abs(lipsCos) <= this.lipsCosThrsh &&
          Math.abs(headAnglesCos.horizontalCos) <= 0.3
        ) {
          return this.countCheck("smiley");
        } else {
          return this.countCheck("neutral");
        }
      }
    }
    return this.countCheck("shadow");
  }
}
