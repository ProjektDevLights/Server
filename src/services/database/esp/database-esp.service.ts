import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import cachegoose from "cachegoose";
import { DocumentQuery, Model, MongooseUpdateQuery } from 'mongoose';
import { NothingChangedException } from '../../../exceptions/nothing-changed.exception';
import { Light, PartialLight } from '../../../interfaces';
import { Esp, EspDocument } from '../../../schemas/esp.schema';



type GetReturnS = Promise<EspDocument> | DocumentQuery<EspDocument, EspDocument>
type GetReturnM = Promise<EspDocument[]> | DocumentQuery<EspDocument[], EspDocument>;

@Injectable()
export class DatabaseEspService {

    constructor(
        @InjectModel(Esp.name) private espModel: Model<EspDocument>,
    ) { }


    async getEsps(): Promise<EspDocument[]>;
    getEsps(query: boolean): DocumentQuery<EspDocument[], EspDocument>;
    getEsps(query?: boolean): GetReturnM {
        if (query) {
            //@ts-ignore
            return this.espModel.find()
        }
        //@ts-ignore
        return this.espModel.find().cache(0, "esp-all").exec();
    }

    async getEspWithId(id: string): Promise<EspDocument>;
    getEspWithId(id: string, query: boolean): DocumentQuery<EspDocument, EspDocument>;
    getEspWithId(id: string, query?: boolean): GetReturnS { //weird stuff is happening here

        if (query) {
            return this.espModel.findOne(
                { uuid: id }
                //@ts-ignore 
            );
        }
        return this.espModel.findOne(
            { uuid: id }
            //@ts-ignore 
        ).cache(0, "esp-id-" + id).exec();
    }

    async updateEspWithId(id: string, updateQuery: MongooseUpdateQuery<Light>): Promise<EspDocument> {

        await this.clear("esp-id-" + id);
        await this.clear("esp-all");
        return await this.espModel.findOneAndUpdate(
            { uuid: id },
            updateQuery,
            { new: true }
            //@ts-ignore 
        ).cache(0, "esp-id-" + id).exec(function (err, records) {

        });
    }

    async deleteEspWithId(id: string): Promise<boolean> {
        try {
            this.espModel.findOneAndDelete(
                { uuid: id }
            ).exec();
            await this.clear("esp-id-" + id);
            await this.clear("esp-all");
            return true;
        } catch {
            return false;
        }
    }

    async addEsp(data: Esp): Promise<EspDocument> {
        await this.clear("esp-all");
        const newEsp: EspDocument = await this.espModel.create(data);
        this.getEspWithId(newEsp.uuid);
        return newEsp;
    }

    async getEspsWithTag(tag: string): Promise<EspDocument[]>
    getEspsWithTag(tag: string, query: boolean): DocumentQuery<EspDocument[], EspDocument>
    getEspsWithTag(tag: string, query?: boolean): Promise<EspDocument[]> | DocumentQuery<EspDocument[], EspDocument> {
        if (query) {
            return this.espModel.find({ tags: { $in: [tag] } })
        }
        return this.espModel.find(
            { tags: { $all: [tag] } }
            //@ts-ignore
        ).cache(0, "esp-tag-" + tag).exec();
    }

    async updateEspsWithTag(tag: string, updateQuery: MongooseUpdateQuery<Light>): Promise<EspDocument[]> {
        const oldDocs: EspDocument[] = await this.getEspsWithTag(tag);
        await this.clear("esp-tag-" + tag);
        await this.espModel.updateMany(
            { tags: { $all: [tag] } },
            updateQuery,
            { new: true }
            //@ts-ignore
        ).exec();
        //@ts-ignore
        const newDocs: EspDocument[] = await this.getEspsWithTag(tag);

        if (JSON.stringify(this.espDocsToLights(oldDocs)) == JSON.stringify(this.espDocsToLights(newDocs))) {
            throw new NothingChangedException(
                "The color of the lights with this tag didn't change!",
            );
        }
        newDocs.forEach((doc: EspDocument) => {
            this.clear("esp-all");
            this.clear("esp-id-" + doc.uuid)
        })


        return this.getEspsWithTag(tag);
    }

    async deleteEspsWithTag(tag: string): Promise<boolean> {
        try {
            this.getEspsWithTag(tag).then((deletedEsps: EspDocument[]) => {
                deletedEsps.forEach((esp: EspDocument) => {
                    this.clear("esp-id-" + esp.uuid)
                })
            });
            await this.espModel.deleteMany({ tags: { $in: [tag] } }).exec();
            this.clear("esp-tag-" + tag);
            this.clear("esp-all");
            return true;
        } catch {
            return false;
        }
    }

    espDocsToLights(docs: EspDocument[]): Light[] {
        const result: Light[] = [];

        docs.forEach((doc: EspDocument) => {
            result.push(this.espDocToLight(doc));
        })
        return result;
    }

    espDocsToPartialLights(docs: EspDocument[]): PartialLight[] {
        const result: PartialLight[] = [];

        docs.forEach((doc: EspDocument) => {
            result.push(this.espDocToPartialLight(doc));
        })
        return result;
    }

    espDocToLight(doc: EspDocument): Light {
        return {
            name: doc.name,
            id: doc.uuid,
            brightness: doc.brightness,
            isOn: doc.isOn,
            tags: doc.tags,
            leds: doc.leds,
            count: doc.count
        }
    }

    espDocToPartialLight(doc: EspDocument): PartialLight {
        return {
            name: doc.name,
            id: doc.uuid,
        }
    }

    clear = (key: string) => new Promise(resolve => cachegoose.clearCache(key, resolve))

}
