#!/usr/bin/env node

const NodeMediaServer = require("..")
let argv = require("minimist")(process.argv.slice(2), {
  string: ["rtmp_port", "http_port", "https_port"],
  alias: {
    rtmp_port: "r",
    http_port: "h",
    https_port: "s",
  },
  default: {
    rtmp_port: 1935,
    http_port: 8008,
    https_port: 8443,
  },
})

if (argv.help) {
  console.log("Usage:")
  console.log("  node-media-server --help // print help information")
  console.log("  node-media-server --rtmp_port 1935 or -r 1935")
  console.log("  node-media-server --http_port 8000 or -h 8000")
  console.log("  node-media-server --https_port 8443 or -s 8443")
  process.exit(0)
}

const config = {
  rtmp: {
    port: argv.rtmp_port,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
    // ssl: {
    //   port: 443,
    //   key: __dirname+'/privatekey.pem',
    //   cert: __dirname+'/certificate.pem',
    // }
  },
  http: {
    port: argv.http_port,
    mediaroot: __dirname + "/media",
    webroot: __dirname + "/www",
    allow_origin: "*",
    api: true,
  },
  https: {
    port: argv.https_port,
    key: __dirname + "/privatekey.pem",
    cert: __dirname + "/certificate.pem",
  },
  auth: {
    api: true,
    api_user: "admin",
    api_pass: "admin",
    play: false,
    publish: false,
    secret: "nodemedia2017privatekey",
  },
  // trans: {
  //   ffmpeg: "/usr/bin/ffmpeg",
  //   tasks: [
  //     {
  //       app: "live",
  //       vc: "libx264",
  //       ac: "copy",
  //       hls: true,
  //       hlsFlags:
  //         "[hls_time=2:hls_list_size=3:hls_flags=append_list+delete_segments]",
  //     },
  //   ],
  // },
  abr: {
    ffmpeg: "/usr/bin/ffmpeg",
    tasks: [
      {
        cleanupTime: 60,
        app: "live",
        vc: "libx264",
        vcParam: ["-crf", "23"],
        ac: "aac",
        acParam: ["-ar", "48000", "-ac", "2"],
        extraParam: [
          "-preset",
          "faster",
          "-tune",
          "zerolatency",
          "-threads",
          "0",
        ],
        variants: {
          video: [
            {
              name: "1080p",
              width: 1920,
              height: 1080,
              bitrate: "10000k",
            },
          ],
          audio: [
            {
              name: "medium",
              bitrate: "128k",
            },
          ],
          mapping: [
            {
              name: "1080p",
              video: "1080p",
              audio: "medium",
            },
          ],
        },
        hls: {
          hls_time: 2,
          hls_list_size: 5,
          hls_flags: ["delete_segments", "independent_segments"],
          hls_delete_threshold: 5,
        },
      },
    ],
  },
  // fission: {
  //   ffmpeg: "/usr/bin/ffmpeg",
  //   tasks: [
  //     {
  //       rule: "live/*",
  //       model: [
  //         // {
  //         //   ab: "128k",
  //         //   vb: "6000k",
  //         //   vs: "1920x1080",
  //         //   vf: "30",
  //         // },
  //         // {
  //         //   ab: "128k",
  //         //   vb: "3000k",
  //         //   vs: "1280x720",
  //         //   vf: "30",
  //         // },
  //       ],
  //     },
  //   ],
  // },
}

let nms = new NodeMediaServer(config)
nms.run()

nms.on("preConnect", (id, args) => {
  console.log(
    "[NodeEvent on preConnect]",
    `id=${id} args=${JSON.stringify(args)}`
  )
  // let session = nms.getSession(id);
  // session.reject();
})

nms.on("postConnect", (id, args) => {
  console.log(
    "[NodeEvent on postConnect]",
    `id=${id} args=${JSON.stringify(args)}`
  )
})

nms.on("doneConnect", (id, args) => {
  console.log(
    "[NodeEvent on doneConnect]",
    `id=${id} args=${JSON.stringify(args)}`
  )
})

nms.on("prePublish", (id, StreamPath, args) => {
  console.log(
    "[NodeEvent on prePublish]",
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  )
  // let session = nms.getSession(id);
  // session.reject();
})

nms.on("postPublish", (id, StreamPath, args) => {
  console.log(
    "[NodeEvent on postPublish]",
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  )
})

nms.on("donePublish", (id, StreamPath, args) => {
  console.log(
    "[NodeEvent on donePublish]",
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  )
})

nms.on("prePlay", (id, StreamPath, args) => {
  console.log(
    "[NodeEvent on prePlay]",
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  )
  // let session = nms.getSession(id);
  // session.reject();
})

nms.on("postPlay", (id, StreamPath, args) => {
  console.log(
    "[NodeEvent on postPlay]",
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  )
})

nms.on("donePlay", (id, StreamPath, args) => {
  console.log(
    "[NodeEvent on donePlay]",
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  )
})
