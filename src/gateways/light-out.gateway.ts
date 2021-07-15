import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { EspDocument } from "../schemas/esp.schema";
import { DatabaseEspService } from "../services/database/esp/database-esp.service";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class LightOutGateway {
  @WebSocketServer()
  private server: Server;

  sendSingleChange(doc: EspDocument) {
    this.server.emit("light_change", DatabaseEspService.espDocToLight(doc));
  }

  sendAdd(doc: EspDocument) {
    this.server.emit("light_add", DatabaseEspService.espDocToLight(doc));
  }

  sendRemove(doc: EspDocument) {
    this.server.emit("light_remove", DatabaseEspService.espDocToLight(doc));
  }
}
