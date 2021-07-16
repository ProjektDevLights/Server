import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { AlarmDocument } from "../schemas/alarm.schema";
import { DatabaseAlarmService } from "../services/database/alarm/database-alarm.service";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class AlarmOutGateway {
  @WebSocketServer()
  private server: Server;

  async sendChange(doc: AlarmDocument) {
    doc = await doc.populate("esps").execPopulate();
    this.server.emit("alarm_change", DatabaseAlarmService.alarmDocToAlarm(doc));
  }

  sendMultipleChange(docs: AlarmDocument[]) {
    this.server.emit(
      "alarm_change_multiple",
      DatabaseAlarmService.alarmDocsToAlarm(docs),
    );
  }

  async sendAdd(doc: AlarmDocument) {
    doc = await doc.populate("esps").execPopulate();
    this.server.emit("alarm_add", DatabaseAlarmService.alarmDocToAlarm(doc));
  }

  async sendRemove(doc: AlarmDocument) {
    doc = await doc.populate("esps").execPopulate();
    this.server.emit("alarm_remove", DatabaseAlarmService.alarmDocToAlarm(doc));
  }

  sendRemoveMultiple(docs: AlarmDocument[]) {
    this.server.emit(
      "alarm_remove_multiple",
      DatabaseAlarmService.alarmDocsToAlarm(docs),
    );
  }
}
