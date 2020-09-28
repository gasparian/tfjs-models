/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as facemesh from "@tensorflow-models/facemesh";
import * as handpose from "@tensorflow-models/handpose";
import Stats from "stats.js";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

import * as tfjsWasm from "@tensorflow/tfjs-backend-wasm";

import HandReactions from "./reactions/hand_reactions.js";
import FaceReactions from "./reactions/face_reactions.js";

tfjsWasm.setWasmPath(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/tfjs-backend-wasm.wasm`
);

function isMobile() {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isAndroid || isiOS;
}

let faceMeshModel,
  handPoseModel,
  ctx,
  videoWidth,
  videoHeight,
  video,
  canvas,
  emojiContainer,
  handsEmojiContainer,
  counter = 0,
  facePredictions = [],
  handPredictions = [],
  handReactions,
  faceReactions;

const VIDEO_SIZE = 500;
const mobile = isMobile();
// Don't render the point cloud on mobile in order to maximize performance and
// to avoid crowding limited screen space.
// const renderPointcloud = mobile === false;
const renderPointcloud = false;
const stats = new Stats();
const state = {
  // backend: "wasm",
  backend: "webgl",
  maxFaces: 1,
  // triangulateMesh: true,
  triangulateMesh: false,
};

if (renderPointcloud) {
  state.renderPointcloud = true;
}

async function setupCamera() {
  video = document.getElementById("video");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      // Only setting the video to a specified size in order to accommodate a
      // point cloud, so on mobile devices accept the default size.
      width: mobile ? undefined : VIDEO_SIZE,
      height: mobile ? undefined : VIDEO_SIZE,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function renderPrediction() {
  stats.begin();

  ctx.drawImage(
    video,
    0,
    0,
    videoWidth,
    videoHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  let reaction = "";
  if (counter % 6 && counter > 1) {
    facePredictions = await faceMeshModel.estimateFaces(video);
    reaction = faceReactions.getReaction(facePredictions);
    if (reaction.length) {
      emojiContainer.innerHTML = reaction;
    }
  } else if (counter % 7 && counter > 1) {
    handPredictions = await handPoseModel.estimateHands(video);
    // check if the face was detected before
    if (facePredictions.length) {
      reaction = handReactions.getReaction(handPredictions);
      handsEmojiContainer.innerHTML = reaction;
    } else {
      handsEmojiContainer.innerHTML = "";
    }
  }

  counter = Math.max(++counter, 30);
  stats.end();
  requestAnimationFrame(renderPrediction);
}

async function main() {
  await tf.setBackend(state.backend);
  // setupDatGui();

  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.getElementById("main").appendChild(stats.dom);

  await setupCamera();
  video.play();
  videoWidth = video.videoWidth;
  videoHeight = video.videoHeight;
  video.width = videoWidth;
  video.height = videoHeight;

  canvas = document.getElementById("output");
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const canvasContainer = document.querySelector(".canvas-wrapper");
  canvasContainer.style = `width: ${videoWidth}px; height: ${videoHeight}px`;

  //
  emojiContainer = document.getElementById("emoji-container");
  emojiContainer.style = `font-size: 100px; display: inline-block`;
  faceReactions = new FaceReactions();

  handsEmojiContainer = document.getElementById("hands-emoji-container");
  handsEmojiContainer.style = `font-size: 100px; display: inline-block`;
  handReactions = new HandReactions();
  //

  ctx = canvas.getContext("2d");
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.fillStyle = "#32EEDB";
  ctx.strokeStyle = "#32EEDB";
  ctx.lineWidth = 0.5;

  faceMeshModel = await facemesh.load({ maxFaces: state.maxFaces });
  handPoseModel = await handpose.load();
  renderPrediction();

  if (renderPointcloud) {
    document.querySelector(
      "#scatter-gl-container"
    ).style = `width: ${VIDEO_SIZE}px; height: ${VIDEO_SIZE}px;`;

    scatterGL = new ScatterGL(document.querySelector("#scatter-gl-container"), {
      rotateOnStart: false,
      selectEnabled: false,
    });
  }
}

main();
