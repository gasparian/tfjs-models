import * as helpers from "./helpers.js";

export default class FaceReactions {
  constructor(minDetections = 3, lipsCosThrshInit = 0.64, headCosThrsh = 0.4) {
    this.emojis = {
      neutral: String.fromCodePoint("0x1F610"),
      shadow: String.fromCodePoint("0x1F47B"),
      smiley: String.fromCodePoint("0x1F604"),
      seeNoEvil: String.fromCodePoint("0x1F648"),
    };
    this.headCosThrsh = headCosThrsh;
    this.lipsCosThrshInit = lipsCosThrshInit;
    this.lipsCosThrsh = lipsCosThrshInit;
    this.minDetections = minDetections;
    this.counters = {
      seeNoEvil: 0,
      smiley: 0,
      neutral: 0,
      shadow: 0,
    };
    this.faceVerticalCentralPoint = -1;
    this.faceHorizontalCentralPoint = -1;
    this.looper = new helpers.Looper();
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
    // TO DO: work on cases when the person speaks
    // now use hard-coded abs. dist. btw lips keypoints
    if (keypoints[17][1] - keypoints[13][1] >= 30) {
      return 1.0;
    }

    const lipsCentralPoint = helpers.getMeanPoint([
      keypoints[13],
      keypoints[14],
    ]);
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
        const lipsCos = Math.abs(
          this.getLipsAngleSin(keypoints, headAnglesCos)
        );
        this.looper.put(lipsCos);
        const lipsCosRel = lipsCos / this.looper.average;
        if (lipsCosRel <= 0.95) {
          this.lipsCosThrsh = lipsCos + lipsCos * 0.05;
        }

        // DEBUG
        // console.log(lipsCos, this.lipsCosThrsh);
        //

        if (
          Math.abs(headAnglesCos.verticalCos) > this.headCosThrsh ||
          Math.abs(headAnglesCos.horizontalCos) > this.headCosThrsh
        ) {
          return this.countCheck("seeNoEvil");
        } else if (
          lipsCos <= this.lipsCosThrsh &&
          lipsCos <= this.lipsCosThrshInit &&
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
