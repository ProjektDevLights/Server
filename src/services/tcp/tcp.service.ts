import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { find, findIndex, map } from "lodash";
import * as net from "net";
import { EspDocument } from "src/schemas/esp.schema";
import tinycolor from "tinycolor2";
import { Leds } from "../../interfaces";
import { DatabaseEspService } from "../database/esp/database-esp.service";

export interface tcpEsp {
  ip: string;
  socket: net.Socket;
}
@Injectable()
export class TcpService {
  constructor(private databaseService: DatabaseEspService) { }
  private server: net.Server;
  private clients: tcpEsp[] = [];

  private onApplicationBootstrap() {
    this.server = net.createServer();
    this.server.on("connection", c => {
      console.log(c.remoteAddress);
      const ip: string = c.remoteAddress.substr(7);
      if (find(this.clients, { ip: ip })) {
        this.removeConnection(ip);
      }
      this.clients.push({
        ip: ip,
        socket: c,
      });
      c.on("connect", () => {
        console.log("connected");
      })
        .on("end", () => {
          console.log("ended");
        })
        .on("close", () => {
          console.log("closed");
        })
        .on("error", () => {
          console.log("error");
        })
        .on("timeout", () => {
          console.log("timeout");
        })
        .on("data", (data: Buffer) => this.handleIncomingData(data, ip));
    });
    this.server.listen(2389, () => { });
  }

  private handleIncomingData(data: Buffer, ip: string): void {
    try {
      const newData: Leds = JSON.parse(data.toString());
      newData.colors = this.rgbToHexArray(newData.colors);
      switch (newData.pattern) {
        case "fading":
          newData.colors = ["#1de9b6"];
          break;
        case "gradient":
          newData.colors.splice(2);
          break;
        case "plain":
          newData.colors.splice(1);
          break;
        case "runner":
          newData.colors.splice(1);
          break;
        case "rainbow":
          newData.colors = ["#1de9b6"];
          break;
      }
      this.databaseService
      .getEsps(true).findOneAndUpdate({ip: ip}, {leds: newData}, {
        new: true,
        omitUndefined: true,
      })
      .then((doc: EspDocument) => {
        console.log(doc);
        this.databaseService.clear("id-" + doc.uuid);
        this.databaseService.clear("all");
        doc.tags.forEach((tag: string) => this.databaseService.clear("tag-" + tag))
      });
    } catch {
      console.log("cant parse data");
    }
  }

  removeConnection(ip: string) {
    const client: number = findIndex(this.clients, { ip: ip });
    this.clients.splice(client, 1);
  }

  sendData(data: string, ip: string): void {
    try {
      const client: net.Socket = find(this.clients, { ip: ip }).socket;
      client.write(data + "\n", () => { });
    } catch (e) {
      //console.error(e);
      throw new ServiceUnavailableException(
        "The Light is not plugged in or started yet!",
      );
    }
    return;
  }

  batchSendData(data: string, esps: EspDocument[]) {
    try {
      esps.forEach((esp: EspDocument) => {
        this.sendData(data, esp.ip);
      });
    } catch {
      throw new ServiceUnavailableException(
        "At least one light is not plugged in or started yet!",
      );
    }
  }

  private rgbToHex(rgb: string): string {
    return tinycolor(`rgb (${map(rgb.split("."), (x: string) => +x)})`).toHexString();
  }

  private rgbToHexArray(rgbs: string[]): string[] {
    return map(rgbs, (rgb: string) => this.rgbToHex(rgb))
  }

  private beforeApplicationShutdown() {
    console.log("shutdown");
    this.clients.forEach(c => {
      c.socket.write('{"command": "serverRestart"}\n');
    });
  }
}
