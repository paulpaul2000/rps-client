<template>
  <div id="app">
    <div id="center-container">
      <select
        id="camera-select"
        v-model="videoDevice"
        @change="initWebcamStream()"
      >
        <option
          v-for="device in devices"
          v-bind:key="device.deviceId"
          v-bind:value="device.deviceId"
        >
          {{ device.label }}
        </option>
      </select>
      <div id="result-frame">
        <video ref="video"></video>
      </div>
      <div class="table-container">
        <table class="table">
          <tr v-for="(prediction, index) in predictions" v-bind:key="index">
            <td>
              <label :for="prediction.name">{{ prediction.name }}</label>
            </td>
            <td>
              <meter
                class="score"
                :id="prediction.name"
                :value="prediction.score"
                min="0"
                max="100"
              />
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import * as tf from "@tensorflow/tfjs";
import * as tmImage from "@teachablemachine/image";

export default {
  name: "App",
  components: {},
  data() {
    return {
      videoDevice: "",
      resultWidth: 0,
      resultHeight: 0,
      devices: [],
      baseModel: "mobilenet_v2",
      isModelReady: false,
      predictions: [],
      lastPrediction: "",
    };
  },
  mounted() {
    tf.setBackend("webgl");

    this.listVideoDevices()
      .then((videoDevices) => {
        for (let device of videoDevices) {
          this.devices.push(device);
        }
        this.videoDevice = videoDevices[0].deviceId;
      })
      .then(() => {
        return this.initWebcamStream();
      })
      .then(() => {
        return this.loadModel().then(() => {
          this.detectObjects();
        });
      });
  },
  beforeDestroy() {
    if (this.raf) {
      let video = this.$refs.video
      video.pause()
      video.srcObject = null

      this.isVideoStreamReady = false
      cancelAnimationFrame(this.raf)
    }
  },
  methods: {
    listVideoDevices() {
      return navigator.mediaDevices.enumerateDevices().then((devices) => {
        return devices.filter((device) => device.kind === "videoinput");
      });
    },
    initWebcamStream() {
      this.isVideoStreamReady = false;
      // if the browser supports mediaDevices.getUserMedia API
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return (
          navigator.mediaDevices
            .getUserMedia({
              video: { deviceId: this.videoDevice },
            })
            .then((stream) => {
              // set <video> source as the webcam input
              let video = this.$refs.video
              video.srcObject = stream;
              return new Promise((resolve) => {
                // when video is loaded
                video.onloadedmetadata = () => {
                  // calculate the video ratio
                  this.videoRatio = video.videoHeight / video.videoWidth;
                  // add event listener on resize to reset the <video> and <canvas> sizes
                  window.addEventListener("resize", this.setResultSize);
                  // set the initial size
                  this.setResultSize();
                  this.isVideoStreamReady = true;
                  video.play()
                  resolve();
                };
              });
            })
            // error handling
            .catch((error) => {
              console.log("failed to initialize webcam stream", error);
            })
        );
      }
    },

    setResultSize() {
      let clientWidth = document.documentElement.clientWidth;
      this.resultWidth = Math.min(600, clientWidth);
      this.resultHeight = this.resultWidth * this.videoRatio;
      let video = this.$refs.video;
      video.width = this.resultWidth;
      video.height = this.resultHeight;
    },

    loadModel() {
      return tmImage
        .load("/gesture/model.json", "/gesture/metadata.json")
        .then((model) => {
          this.model = model;
          this.isModelReady = true;
        })
        .catch((error) => {
          console.log("failed to load the mode", error);
          throw error;
        });
    },

    detectObjects() {
      if (!this.isModelReady) return;

      if (this.isVideoStreamReady) {
        this.model.predict(this.$refs.video).then((predictions) => {
          this.handlePredictions(predictions);

          this.raf = requestAnimationFrame(() => {
            this.detectObjects();
          });
        });
      } else {
        this.raf = requestAnimationFrame(() => {
          this.detectObjects();
        });
      }
    },

    handlePredictions(predictions) {
      this.predictions.splice(0);

      let maxPrediction;
      let maxProb = 0;

      predictions.forEach((prediction) => {
        this.predictions.push({
          name: prediction.className,
          score: (prediction.probability * 100).toFixed(1),
        });

        if (prediction.probability > maxProb) {
          maxProb = prediction.probability;
          maxPrediction = prediction;
        }
      });

      if (this.lastPrediction != maxPrediction.className) {
        this.lastPrediction = maxPrediction.className;
        if (this.timeout) {
          clearTimeout(this.timeout)
        }

        this.timeout = setTimeout(() => {
          if (this.lastPrediction != 'Nothing') {
            this.$emit('gesture', this.lastPrediction.toLowerCase())
          }
        }, 500)
      }
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-top: 60px;
}

#result-frame {
  height: 500px;
}

.table-container {
  width: 50%;
  margin: 0 auto;
}

#center-container {
  width: 600px;
  margin: 0 auto;
}

#camera-select {
  width: 300px;
  margin-bottom: 50px;
}
</style>