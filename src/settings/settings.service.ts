import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import * as child_process from "child_process";
import { isEqual } from "lodash";
import { Model } from "mongoose";
import { NothingChangedException } from "src/exceptions/nothing-changed.exception";
import { lightProjection } from "src/globals";
import { Esp, EspDocument } from "src/schemas/esp.schema";
import { UtilsService } from "src/utils.service";
import { Light, PartialLight, StandartResponse } from "../interfaces";
import UpdateTagsDto from "./dto/update-tags.dto";
import UpdateInfoDto from "./dto/update.dto";

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    private utilsService: UtilsService,
  ) {}

  async restart(id: string): Promise<StandartResponse<PartialLight>> {
    const queryResult: EspDocument = await this.espModel
      .findOneAndUpdate(
        { uuid: id },
        { leds: { colors: ["#000000"], pattern: "plain" } },
        { new: true, projection: { __v: 0, _id: 0 } },
      )
      .exec();
    child_process.execSync(
      `echo '{"command": "restart"}' | nc ${queryResult.ip} 2389`,
    );
    return {
      message: "Restarting...",
      object: { name: queryResult.name, id: queryResult.uuid },
    };
  }

  async count(
    id: string,
    count: number,
  ): Promise<StandartResponse<{ name: string; id: string; count: number }>> {
    const queryResult: EspDocument = await this.espModel
      .findOneAndUpdate(
        { uuid: id },
        { count: count },
        {
          projection: { __v: 0, _id: 0 },
        },
      )
      .exec();
    const newLight = {
      count: queryResult.count,
      name: queryResult.name,
      id: queryResult.uuid,
    };
    const colorArray: string[] = [];
    queryResult.leds.colors.forEach((color: string) => {
      colorArray.push('"' + this.utilsService.hexToRgb(color) + '"');
    });
    child_process.execSync(
      `echo '{"command": "count", "data": "${count}"}' | nc ${queryResult.ip} 2389`,
    );
    setTimeout(() => {
      child_process.execSync(
        `echo '{"command": "leds", "data": {"colors": [${colorArray}], "pattern": "plain"}}' | nc ${queryResult.ip} 2389`,
      );
    }, 500);
    return { message: "Succesfully updated LED count", object: newLight };
  }

  async reset(id: string): Promise<StandartResponse<PartialLight>> {
    const queryResult: EspDocument = await this.espModel
      .findOne(
        { uuid: id },
        {
          __v: 0,
          _id: 0,
        },
      )
      .exec();
    await this.espModel.findOneAndDelete({ uuid: id }).exec();
    child_process.execSync(
      `echo '{"command": "reset"}' | nc ${queryResult.ip} 2389`,
    );
    return {
      message: "Resetting...",
      object: { name: queryResult.name, id: queryResult.uuid },
    };
  }

  async on(id: string): Promise<StandartResponse<Light>> {
    const oldLight: EspDocument = await this.espModel
      .findOne({ uuid: id }, { __v: 0, _id: 0 })
      .exec();
    const newLight: EspDocument = await this.espModel
      .findOneAndUpdate(
        { uuid: id },
        { isOn: true },
        { new: true, projection: { __v: 0, _id: 0 } },
      )
      .exec();
    if (isEqual(oldLight.isOn, newLight.isOn)) {
      throw new NothingChangedException("The light is already on");
    }
    child_process.execSync(`echo '{"command": "on"}' | nc ${newLight.ip} 2389`);
    //console.log(`echo '{"command": "on"}' | nc ${newLight.ip} 2389`)
    return {
      message: "Succesfully turned the light on!",
      object: { name: newLight.name, id: newLight.uuid } as Light,
    };
  }

  async off(id: string): Promise<StandartResponse<Light>> {
    const oldLight: EspDocument = await this.espModel
      .findOne({ uuid: id }, { __v: 0, _id: 0 })
      .exec();
    const newLight: EspDocument = await this.espModel
      .findOneAndUpdate(
        { uuid: id },
        { isOn: false },
        { new: true, projection: { __v: 0, _id: 0 } },
      )
      .exec();
    if (isEqual(oldLight.isOn, newLight.isOn)) {
      throw new NothingChangedException("The light is already off");
    }
    console.log(
      await this.espModel
        .findOneAndUpdate(
          { uuid: id },
          { isOn: false },
          { new: true, projection: { __v: 0, _id: 0 } },
        )
        .exec(),
    );
    child_process.execSync(
      `echo '{"command": "off"}' | nc ${newLight.ip} 2389`,
    );
    //console.log(`echo '{"command": "off"}' | nc ${newLight.ip} 2389`)
    return {
      message: "Successfully turned the light off!",
      object: { name: newLight.name, id: newLight.uuid } as Light,
    };
  }

  async getAll(): Promise<StandartResponse<Light[]>> {
    const lights: Light[] = (await this.espModel.find(
      {},
      lightProjection,
    )) as Light[];
    return { message: "List of all lights", object: lights };
  }

  async get(id: string): Promise<StandartResponse<Light>> {
    const light: Light = (await this.espModel.findOne(
      { uuid: id },
      lightProjection,
    )) as Light;
    return { message: "Found light", object: light };
  }

  async update(
    id: string,
    data: UpdateInfoDto,
  ): Promise<StandartResponse<Light>> {
    const oldLight: Light = (await this.espModel
      .findOne({ uuid: id }, lightProjection)
      .exec()) as Light;
    const newLight: Light = (await this.espModel
      .findOneAndUpdate({ uuid: id }, data, {
        new: true,
        projection: lightProjection,
      })
      .exec()) as Light;
    if (isEqual(oldLight, newLight)) {
      throw new NothingChangedException("Couldn't update light");
    }
    return { message: "Succesfully updatet Light!", object: newLight };
  }

  async addTags(
    id: string,
    data: UpdateTagsDto,
  ): Promise<StandartResponse<Light>> {
    const oldTags: string[] = (
      await this.espModel.findOne({ uuid: id }, { tags: 1, _id: 0 }).exec()
    ).tags;

    const newTags: string[] = [];

    data.tags.forEach((tag: string) => {
      if (!oldTags.includes(tag)) {
        newTags.push(tag);
      }
    });

    if (!newTags.length) {
      throw new NothingChangedException("Tag already exists");
      return;
    }

    const newLight: EspDocument = await this.espModel
      .findOneAndUpdate(
        { uuid: id },
        { tags: [...newTags, ...oldTags] },
        { new: true, projection: lightProjection },
      )
      .exec();

    return {
      message: `Succesfully added the following tags: ${newTags}!`,
      object: newLight as Light,
    };
  }

  async startTags(tag: string): Promise<StandartResponse<Light[]>> {
    const oldLights: EspDocument[] = await this.espModel
      .find({ tags: { $all: [tag] } }, { _id: 0, __v: 0 })
      .exec();
    const newLights: Light[] = [];
    oldLights.forEach((light: EspDocument) => {
      if (!light.isOn) {
        newLights.push(light as Light);
      }
    });
    if (newLights.length <= 0) {
      throw new NothingChangedException("All lights are already on");
    }

    await this.espModel
      .updateMany(
        { tags: { $all: [tag] } },
        { $set: { isOn: true } },
        {
          new: true,
          projection: { __v: 0, _id: 0 },
        },
      )
      .exec();
    const lights: EspDocument[] = await this.espModel
      .find({ tags: { $all: [tag] } }, { _id: 0, __v: 0 })
      .exec();
    const ips: string[] = [];
    const rest: Light[] = [];
    lights.forEach(element => {
      ips.push(element.ip);
      rest.push({
        leds: element.leds,
        count: element.count,
        id: element.uuid,
        isOn: element.isOn,
        name: element.name,
        tags: element.tags,
      });
    });
    console.log(rest);
    ips.forEach((ip: string) => {
      // child_process.execSync(`echo '{"command": "on"}' | nc ${esp.ip} 2389`);
      console.log(`echo '{"command": "on"}' | nc ${ip} 2389`);
    });

    return {
      message: `All Lights with the Tag ${tag} are on now!  The following lights have been changed.`,
      object: rest as Light[],
    };
  }

  async offTags(tag: string): Promise<StandartResponse<Light[]>> {
    const oldLights: EspDocument[] = await this.espModel
      .find({ tags: { $all: [tag] } }, { _id: 0, __v: 0 })
      .exec();
    const newLights: Light[] = [];
    oldLights.forEach((light: EspDocument) => {
      if (light.isOn) {
        newLights.push(light as Light);
      }
    });
    if (newLights.length <= 0) {
      throw new NothingChangedException("All lights are already off!");
    }

    await this.espModel
      .updateMany(
        { tags: { $all: [tag] } },
        { $set: { isOn: false } },
        {
          new: true,
          projection: { __v: 0, _id: 0 },
        },
      )
      .exec();
    const lights: EspDocument[] = await this.espModel
      .find({ tags: { $all: [tag] } }, { _id: 0, __v: 0 })
      .exec();
    const ips: string[] = [];
    const rest: Light[] = [];
    lights.forEach(element => {
      ips.push(element.ip);
      rest.push({
        leds: element.leds,
        count: element.count,
        id: element.uuid,
        isOn: element.isOn,
        name: element.name,
        tags: element.tags,
      });
    });
    console.log(rest);
    ips.forEach((ip: string) => {
      // child_process.execSync(`echo '{"command": "on"}' | nc ${esp.ip} 2389`);
      console.log(`echo '{"command": "off"}' | nc ${ip} 2389`);
    });

    return {
      message: `All Lights with the Tag ${tag} are off now! The following lights have been changed.`,
      object: rest as Light[],
    };
  }

  async removeTags(
    id: string,
    data: UpdateTagsDto,
  ): Promise<StandartResponse<Light>> {
    const oldLight: EspDocument = await this.espModel
      .findOne({ uuid: id }, { tags: 1, _id: 0 })
      .exec();
    const oldTags: string[] = [...oldLight.tags];

    const newTags: string[] = [];
    const remTags: string[] = [];

    oldTags.forEach((tag: string) => {
      if (!data.tags.includes(tag)) {
        newTags.push(tag);
      } else {
        remTags.push(tag);
      }
    });

    if (isEqual(oldLight.tags, newTags)) {
      throw new NothingChangedException("No Tag was removed!");
      return;
    }

    const newLight: EspDocument = await this.espModel
      .findOneAndUpdate(
        { uuid: id },
        { tags: newTags },
        { new: true, projection: lightProjection },
      )
      .exec();
    return {
      message: `Succesfully removed the following tags: ${remTags}!`,
      object: newLight as Light,
    };
  }

  async getWithTag(tag: string): Promise<StandartResponse<Light[]>> {
    const light: EspDocument[] = await this.espModel.find(
      { tags: { $all: [tag] } },
      lightProjection,
    );
    return { message: `Lights with tag ${tag}!`, object: light as Light[] };
  }
}
