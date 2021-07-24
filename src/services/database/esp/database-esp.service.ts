import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
//@ts-ignore
import cachegoose from "cachegoose";
import { DocumentQuery, Model, UpdateQuery } from "mongoose";
import { NothingChangedException } from "../../../exceptions/nothing-changed.exception";
import { LightOutGateway } from "../../../gateways/lights/light-out.gateway";
import { Light, PartialLight } from "../../../interfaces";
import { Esp, EspDocument } from "../../../schemas/esp.schema";

type GetReturnS =
  | Promise<EspDocument>
  | DocumentQuery<EspDocument, EspDocument>;
type GetReturnM =
  | Promise<EspDocument[]>
  | DocumentQuery<EspDocument[], EspDocument>;

@Injectable()
export class DatabaseEspService {
  constructor(
    @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    private gateway: LightOutGateway,
  ) {}

  async getEsps(): Promise<EspDocument[]>;
  getEsps(query: boolean): DocumentQuery<EspDocument[], EspDocument>;
  getEsps(query?: boolean): GetReturnM {
    if (query) {
      return this.espModel.find();
    }
    return (
      this.espModel
        .find()
        //@ts-ignore
        .cache(0, "esp-all")
        .exec()
    );
  }

  async getEspWithId(id: string): Promise<EspDocument>;
  getEspWithId(
    id: string,
    query: boolean,
  ): DocumentQuery<EspDocument, EspDocument>;
  getEspWithId(id: string, query?: boolean): GetReturnS {
    if (query) {
      return this.espModel.findOne({ uuid: id });
    }

    return (
      this.espModel
        .findOne({ uuid: id })
        //@ts-ignore
        .cache(0, "esp-id-" + id)
        .exec()
    );
  }

  async getEspWithMongoId(id: string): Promise<EspDocument> {
    return await this.espModel.findById(id);
  }

  async getEspsWithMultipleIds(ids: string[]): Promise<EspDocument[]>;
  getEspsWithMultipleIds(
    ids: string[],
    query: boolean,
  ): DocumentQuery<EspDocument[], EspDocument>;
  getEspsWithMultipleIds(ids: string[], query?: boolean): GetReturnM {
    if (query) {
      return this.espModel.find({ uuid: { $in: ids } });
    }
    return this.espModel.find({ uuid: { $in: ids } }).exec();
  }

  async updateEspWithId(
    id: string,
    updateQuery: UpdateQuery<Light>,
  ): Promise<EspDocument> {
    await this.clear("id-" + id);
    this.clear("all");
    const deleteCustom: boolean =
      (updateQuery.leds?.pattern !== undefined &&
        updateQuery.leds?.pattern !== "custom") ||
      (updateQuery.$set?.leds?.pattern !== undefined &&
        updateQuery.$set?.leds?.pattern !== "custom");
    if (deleteCustom) {
      updateQuery.$unset = { custom_sequence: true };
    }

    const updated: EspDocument = await this.espModel
      .findOneAndUpdate({ uuid: id }, updateQuery, {
        new: true,
        omitUndefined: true,
      })
      //@ts-ignore
      .cache(0, "esp-id-" + id)
      .exec();
    this.gateway.sendChange(updated);
    updated?.tags.forEach((tag: string) => {
      this.clear("tag-" + tag);
    });
    return updated;
  }

  async deleteEspWithId(id: string): Promise<EspDocument> {
    const deleted: EspDocument = await this.espModel
      .findOneAndDelete({ uuid: id })
      .exec();
    await this.clear("id-" + id);
    await this.clear("all");
    deleted?.tags.forEach((tag: string) => {
      this.clear("tag-" + tag);
    });
    this.gateway.sendRemove(deleted);
    return deleted;
  }

  async addEsp(data: Esp): Promise<EspDocument> {
    await this.clear("all");
    (await this.getTags()).forEach(tag => {
      this.clear("tag-" + tag);
    });
    await this.clear("tag-");
    const newEsp: EspDocument = await this.espModel.create(data);
    this.gateway.sendAdd(newEsp);
    this.getEspWithId(newEsp.uuid);
    return newEsp;
  }

  async getTags(): Promise<string[]> {
    return await this.getEsps(true).distinct("tags");
  }

  async getEspsWithTag(tag: string): Promise<EspDocument[]>;
  getEspsWithTag(
    tag: string,
    query: boolean,
  ): DocumentQuery<EspDocument[], EspDocument>;
  getEspsWithTag(
    tag: string,
    query?: boolean,
  ): Promise<EspDocument[]> | DocumentQuery<EspDocument[], EspDocument> {
    if (query) {
      return this.espModel.find({ tags: { $in: [tag] } });
    }
    return (
      this.espModel
        .find({ tags: { $all: [tag] } })
        //@ts-ignore
        .cache(0, "esp-tag-" + tag)
        .exec()
    );
  }

  async updateEspsWithTag(
    tag: string,
    updateQuery: UpdateQuery<Light>,
  ): Promise<EspDocument[]> {
    const oldDocs: EspDocument[] = await this.getEspsWithTag(tag);
    const deleteCustom: boolean =
      (updateQuery.leds?.pattern !== undefined &&
        updateQuery.leds?.pattern !== "custom") ||
      (updateQuery.$set?.leds?.pattern !== undefined &&
        updateQuery.$set?.leds?.pattern !== "custom");
    if (deleteCustom) {
      updateQuery.$unset = { custom_sequence: true };
    }
    await this.clear("tag-" + tag);
    await this.espModel
      .updateMany(
        { tags: { $all: [tag] } },
        updateQuery,
        { new: true, omitUndefined: true },
        //@ts-ignore
      )
      .exec();
    //@ts-ignore

    const newDocs: EspDocument[] = await this.getEspsWithTag(tag);
    this.gateway.sendMultipleChange(newDocs);
    if (
      JSON.stringify(DatabaseEspService.espDocsToLights(oldDocs)) ==
      JSON.stringify(DatabaseEspService.espDocsToLights(newDocs))
    ) {
      throw new NothingChangedException(
        "The color of the lights with this tag didn't change!",
      );
    }
    newDocs.forEach((doc: EspDocument) => {
      this.clear("all");
      this.clear("id-" + doc.uuid);
    });

    return this.getEspsWithTag(tag);
  }

  async deleteEspsWithTag(tag: string): Promise<boolean> {
    try {
      this.getEspsWithTag(tag).then((deletedEsps: EspDocument[]) => {
        this.gateway.sendRemoveMultiple(deletedEsps);
        deletedEsps.forEach((esp: EspDocument) => {
          this.clear("id-" + esp.uuid);
        });
      });
      await this.espModel.deleteMany({ tags: { $in: [tag] } }).exec();
      this.clear("tag-" + tag);
      this.clear("all");
      return true;
    } catch {
      return false;
    }
  }

  static espDocsToLights(docs: EspDocument[]): Light[] {
    const result: Light[] = [];

    docs.forEach((doc: EspDocument) => {
      result.push(this.espDocToLight(doc));
    });
    return result;
  }

  static espDocsToPartialLights(docs: EspDocument[]): PartialLight[] {
    const result: PartialLight[] = [];

    docs.forEach((doc: EspDocument) => {
      result.push(this.espDocToPartialLight(doc));
    });
    return result;
  }

  static espDocToLight(doc: EspDocument): Light {
    return {
      name: doc.name,
      id: doc.uuid,
      brightness: doc.brightness,
      isOn: doc.isOn,
      tags: doc.tags,
      leds: doc.leds,
      count: doc.count,
      position: doc.position,
      custom_sequence: doc.custom_sequence,
      comment: doc.comment,
    };
  }

  static espDocToPartialLight(doc: EspDocument): PartialLight {
    return {
      name: doc.name,
      id: doc.uuid,
    };
  }

  clear = (key: string) =>
    new Promise(resolve => cachegoose.clearCache("esp-" + key, resolve));
}
