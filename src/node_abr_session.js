//
//  Created by Mingliang Chen on 18/3/9.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const Logger = require("./node_core_logger")

const EventEmitter = require("events")
const { spawn } = require("child_process")
const dateFormat = require("dateformat")
const mkdirp = require("mkdirp")
const fs = require("fs")

class NodeAbrSession extends EventEmitter {
  constructor(conf) {
    super()
    this.conf = conf
  }

  run() {
    let vc = this.conf.vc || "copy"
    let ac = this.conf.ac || "copy"

    let hls_time = this.conf.hls.hls_time || 6
    let hls_list_size = this.conf.hls.hls_list_size || 5
    let hls_delete_threshold = this.conf.hls.hls_delete_threshold || 3
    let hls_flags = this.conf.hls.hls_flags
      ? ["-hls_flags", this.conf.hls.hls_flags.join("+")]
      : []

    let inPath = "rtmp://127.0.0.1:" + this.conf.rtmpPort + this.conf.streamPath
    let ouPath = `${this.conf.mediaroot}/${this.conf.streamApp}/${this.conf.streamName}`

    let hlsFileName = "index.m3u8"

    let inputMapVideo = []
    let filtersVideo = []

    // create different video variants
    this.conf.variants.video.forEach((variant, index) => {
      // split input in multiple streams
      Array.prototype.push.apply(inputMapVideo, ["-map", "0:v:0"])

      // Split bitrate in value and unit
      let bitRateValue = parseFloat(variant.bitrate.slice(0, -1))
      let bitRateUnit = variant.bitrate.charAt(variant.bitrate.length - 1)

      // Calculate maxRate as 120% of bitrate
      let maxRate = (bitRateValue * 1.2).toFixed(2) + bitRateUnit

      // Calculate bufSize as 150% of bitrate
      let bufSize = (bitRateValue * 1.5).toFixed(2) + bitRateUnit

      // Create filter
      let filter = [
        `-filter:v:${index}`,
        `scale=w='min(${variant.width},iw)':h='min(${variant.height},ih)':force_original_aspect_ratio=decrease`,
        `-maxrate:v:${index}`,
        maxRate,
        `-bufsize:v:${index}`,
        bufSize,
      ]

      Array.prototype.push.apply(filtersVideo, filter)
    })

    let inputMapAudio = []
    // let inputMapAudioMissing = []
    let filtersAudio = []

    // create different audio variants
    this.conf.variants.audio.forEach((variant, index) => {
      // split input in multiple streams
      Array.prototype.push.apply(inputMapAudio, ["-map", "0:a:0"])
      // Array.prototype.push.apply(inputMapAudioMissing, ["-map", "1:a:0"])

      Array.prototype.push.apply(filtersAudio, [
        `-b:a:${index}`,
        variant.bitrate,
      ])
    })

    Logger.log(
      "[Transmuxing HLS ABR] " +
        this.conf.streamPath +
        " to " +
        ouPath +
        "/" +
        hlsFileName
    )

    mkdirp.sync(ouPath)
    let argv = ["-y", "-i", inPath]
    // , "-f", "lavfi", "-i", "anullsrc"]

    // video map
    Array.prototype.push.apply(argv, inputMapVideo)

    // audio map
    Array.prototype.push.apply(argv, inputMapAudio)

    // video settings
    Array.prototype.push.apply(argv, ["-c:v", vc])
    Array.prototype.push.apply(argv, this.conf.vcParam)

    // keyframe settings
    Array.prototype.push.apply(argv, [
      "-force_key_frames",
      `expr:gte(t,n_forced*${hls_time})`,
    ])

    // audio settings
    Array.prototype.push.apply(argv, ["-c:a", ac])
    Array.prototype.push.apply(argv, this.conf.acParam)

    // abr audio filters
    Array.prototype.push.apply(argv, filtersAudio)

    // abr video filters
    Array.prototype.push.apply(argv, filtersVideo)

    // variant stream map
    Array.prototype.push.apply(argv, [
      "-var_stream_map",
      `v:0,a:0,name:${this.conf.variants.mapping[0].name}`,
    ])

    // extra parameters
    Array.prototype.push.apply(argv, this.conf.extraParam)

    // hls output
    Array.prototype.push.apply(argv, [
      "-f",
      "hls",
      "-hls_time",
      hls_time,
      "-hls_list_size",
      hls_list_size,
      "-hls_delete_threshold",
      hls_delete_threshold,
    ])

    // hls flags
    Array.prototype.push.apply(argv, hls_flags)

    // master playlist and variants
    Array.prototype.push.apply(argv, [
      "-master_pl_name",
      hlsFileName,
      `${this.conf.mediaroot}/${this.conf.streamApp}/${this.conf.streamName}/%v/${hlsFileName}`,
    ])

    argv = argv.filter((n) => {
      return n
    }) // empty

    console.log("FFmpeg arguments transcoding")
    console.log(argv)
    console.log(argv.join(" "))
    this.ffmpeg_exec = spawn(this.conf.ffmpeg, argv)
    this.ffmpeg_exec.on("error", (e) => {
      Logger.ffdebug(e)
    })

    this.ffmpeg_exec.stdout.on("data", (data) => {
      Logger.ffdebug(`FFmpeg:${data}`)
    })

    this.ffmpeg_exec.stderr.on("data", (data) => {
      Logger.ffdebug(`FFmpeg:${data}`)
    })

    this.ffmpeg_exec.on("close", (code) => {
      Logger.log("[Transmuxing end] " + this.conf.streamPath)
      this.emit("end")
    })
  }

  end() {
    this.ffmpeg_exec.kill()
  }
}

module.exports = NodeAbrSession
