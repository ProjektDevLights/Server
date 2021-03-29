import { CacheModule, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import * as redisStore from "cache-manager-redis-store";
import cachegoose from "cachegoose";
import { config } from "./config";
import { AlarmModule } from "./http/alarm/alarm.module";
import { EspModule } from "./http/esp/esp.module";
import { LightsModule } from "./http/lights/lights.module";
import { TagsModule } from "./http/tags/tags.module";

@Module({
  imports: [
    EspModule,
    CacheModule.register({ store: redisStore, host: "localhost", port: 6379 }),
    MongooseModule.forRoot(config.database.url, {
      useFindAndModify: false,
      db: {
        ignoreUndefined: true,
      },
      connectionFactory: (connection, name) => {
        cachegoose(connection.base, {
          engine: "redis",
          port: 6379,
          host: "localhost",
        });
        return connection;
      },
    }),
    AlarmModule,
    LightsModule,
    TagsModule,
  ],
})
export class MainModule {}
