import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { find, findIndex } from "lodash";
import * as net from "net";
import { EspDocument } from "src/schemas/esp.schema";
import { Leds } from "../../interfaces";
import { DatabaseEspService } from "../database/esp/database-esp.service";

export interface tcpEsp {
  ip: string;
  socket: net.Socket;
}
@Injectable()
export class TcpService {
  constructor(private databaseService: DatabaseEspService) {}
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
    this.server.listen(2389, () => {});
  }

  handleIncomingData(data: Buffer, ip: string): void {
    const newData: Leds = JSON.parse(data.toString());
    this.databaseService
      .getEsps(true)
      .where({ ip: ip })
      .update({ leds: newData })
      .then((doc: EspDocument) => {
        this.databaseService.clear("id-" + doc.uuid);
      });
  }

  removeConnection(ip: string) {
    const client: number = findIndex(this.clients, { ip: ip });
    this.clients.splice(client, 1);
  }

  sendData(data: string, ip: string): void {
    try {
      const client: net.Socket = find(this.clients, { ip: ip }).socket;
      client.write(data + "\n", () => {});
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

  private beforeApplicationShutdown() {
    console.log("shutdown");
    this.clients.forEach(c => {
      c.socket.write('{"command": "serverRestart"}\n');
    });
  }
}
