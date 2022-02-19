//
//  Created by Mingliang Chen on 18/3/9.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const Logger = require("./node_core_logger")

const NodeAbrSession = require("./node_abr_session")
const context = require("./node_core_ctx")
const { getFFmpegVersion, getFFmpegUrl } = require("./node_core_utils")
const fs = require("fs")
const _ = require("lodash")
const mkdirp = require("mkdirp")

class NodeAbrServer {
  constructor(config) {
    this.config = config
    this.abrSessions = new Map()
  }

  async run() {
    try {
      mkdirp.sync(this.config.http.webroot)
      fs.accessSync(this.config.http.webroot, fs.constants.W_OK)
    } catch (error) {
      Logger.error(
        `Node Media Abr Server startup failed. WebRoot:${this.config.http.webroot} cannot be written.`
      )
      return
    }

    try {
      mkdirp.sync(this.config.http.mediaroot)
      fs.accessSync(this.config.http.mediaroot, fs.constants.W_OK)
    } catch (error) {
      Logger.error(
        `Node Media Abr Server startup failed. MediaRoot:${this.config.http.mediaroot} cannot be written.`
      )
      return
    }

    try {
      fs.accessSync(this.config.abr.ffmpeg, fs.constants.X_OK)
    } catch (error) {
      Logger.error(
        `Node Media Abr Server startup failed. ffmpeg:${this.config.abr.ffmpeg} cannot be executed.`
      )
      return
    }

    let version = await getFFmpegVersion(this.config.abr.ffmpeg)
    if (version === "" || parseInt(version.split(".")[0]) < 4) {
      Logger.error(
        "Node Media Abr Server startup failed. ffmpeg requires version 4.0.0 above"
      )
      Logger.error("Download the latest ffmpeg static program:", getFFmpegUrl())
      return
    }

    let i = this.config.abr.tasks.length
    let apps = ""

    this.config.abr.tasks.forEach((task) => {
      apps += task.app
      apps += " "

      // creating abr application folder for each task
      fs.mkdirSync(
        `${this.config.http.webroot}/${task.app}`,
        { recursive: true },
        true
      )
    })

    context.nodeEvent.on("postPublish", this.onPostPublish.bind(this))
    context.nodeEvent.on("donePublish", this.onDonePublish.bind(this))
    Logger.log(
      `Node Media Abr Server started for apps: [ ${apps}] , MediaRoot: ${this.config.http.mediaroot}, ffmpeg version: ${version}`
    )
  }

  onPostPublish(id, streamPath, args) {
    let regRes = /\/(.*)\/(.*)/gi.exec(streamPath)
    let [app, name] = _.slice(regRes, 1)
    let i = this.config.abr.tasks.length
    while (i--) {
      let conf = { ...this.config.abr.tasks[i] }
      conf.ffmpeg = this.config.abr.ffmpeg
      conf.mediaroot = this.config.http.mediaroot
      conf.rtmpPort = this.config.rtmp.port
      conf.streamPath = streamPath
      conf.streamApp = app
      conf.streamName = name + "/" + id
      conf.args = args
      if (app === conf.app) {
        let session = new NodeAbrSession(conf)
        this.abrSessions.set(id, session)

        let ouPath = `${conf.mediaroot}/${conf.streamApp}/${conf.streamName}`
        let wwwPath = `${this.config.http.webroot}/${app}/${name}`

        // delete symlink if exist
        try {
          fs.unlinkSync(wwwPath)
        } catch (error) {}

        // create new symlink
        fs.symlinkSync(ouPath, wwwPath, "dir")

        // add delayed cleanup of encoding files
        session.on("end", async () => {
          this.abrSessions.delete(id)
          await new Promise((r) => setTimeout(r, 16 * 1000))
          let symLoc = fs.readlinkSync(wwwPath)

          if (symLoc === ouPath) {
            fs.unlinkSync(wwwPath)
          }

          fs.rmSync(ouPath, { recursive: true, force: true })
        })

        session.run()
      }
    }
  }

  onDonePublish(id, streamPath, args) {
    let session = this.abrSessions.get(id)
    if (session) {
      session.end()
    }
  }
}

module.exports = NodeAbrServer
