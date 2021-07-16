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

  sendChange(doc: AlarmDocument) {
    this.server.emit("alarm_change", DatabaseAlarmService.alarmDocToAlarm(doc));
  }

  sendMultipleChange(docs: AlarmDocument[]) {
    this.server.emit(
      "alarm_change_multiple",
      DatabaseAlarmService.alarmDocsToAlarm(docs),
    );
  }

  sendAdd(doc: AlarmDocument) {
    this.server.emit("alarm_add", DatabaseAlarmService.alarmDocToAlarm(doc));
  }

  sendRemove(doc: AlarmDocument) {
    this.server.emit("alarm_remove", DatabaseAlarmService.alarmDocToAlarm(doc));
  }

  sendRemoveMultiple(docs: AlarmDocument[]) {
    this.server.emit(
      "alarm_remove_multiple",
      DatabaseAlarmService.alarmDocsToAlarm(docs),
    );
  }
}
