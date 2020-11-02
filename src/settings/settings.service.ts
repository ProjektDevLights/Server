import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as child_process from 'child_process';
import { Response } from 'express';
import { isEqual } from 'lodash';
import { Model } from 'mongoose';
import { lightProjection } from 'src/globals';
import { Esp, EspDocument } from 'src/schemas/esp.schema';
import { UtilsService } from 'src/utils.service';
import { Light, PartialLight, StandartResponse } from '../interfaces';
import UpdateInfoDto from './dto/update.dto';
import UpdateTagsDto from './dto/update-tags.dto';

@Injectable()
export class SettingsService {

    constructor(@InjectModel(Esp.name) private espModel: Model<EspDocument>, private utilsService: UtilsService) { }

    async restart(id: string): Promise<StandartResponse<PartialLight>> {
        const queryResult: EspDocument = await this.espModel.findOneAndUpdate({ uuid: id }, { leds: { colors: ["#000000"], pattern: "plain" } }, { new: true, projection: { __v: 0, _id: 0 } }).exec()
        child_process.execSync(`echo '{"command": "restart"}' | nc ${queryResult.ip} 2389`);
        return { message: "Restarting...", object: { name: queryResult.name, id: queryResult.uuid } }
    }

    async count(id: string, count: number): Promise<StandartResponse<{ name: string, id: string, count: number }>> {
        const queryResult: EspDocument = await this.espModel.findOneAndUpdate({ uuid: id }, { count: count }, {
            projection: { __v: 0, _id: 0 }
        }).exec();
        const newLight = {
            count: queryResult.count,
            name: queryResult.name,
            id: queryResult.uuid
        }
        const colorArray: string[] = [];
        queryResult.leds.colors.forEach((color: string) => {
            colorArray.push('"' + this.utilsService.hexToRgb(color) + '"')
        })
        child_process.execSync(`echo '{"command": "count", "data": "${count}"}' | nc ${queryResult.ip} 2389`);
        setTimeout(() => {
            console.log(queryResult.leds)
            child_process.execSync(`echo '{"command": "leds", "data": {"colors": [${colorArray}], "pattern": "plain"}}' | nc ${queryResult.ip} 2389`)
        }, 500)
        return { message: "Succesfully updated LED count", object: newLight }
    }

    async reset(id: string): Promise<StandartResponse<PartialLight>> {
        const queryResult: EspDocument = await this.espModel.findOne({ uuid: id }, {
            __v: 0, _id: 0
        }).exec();
        await this.espModel.findOneAndDelete({ uuid: id }).exec();
        child_process.execSync(`echo '{"command": "reset"}' | nc ${queryResult.ip} 2389`);
        return { message: "Resetting...", object: { name: queryResult.name, id: queryResult.uuid } }
    }

    async getAll(): Promise<StandartResponse<Light[]>> {
        console.log("get all");
        const lights: Light[] = await this.espModel.find({}, lightProjection) as Light[];
        return { message: "List of all lights", object: lights };
    }

    async get(id: string): Promise<StandartResponse<Light>> {
        const light: Light = await this.espModel.findOne({ uuid: id }, lightProjection) as Light;
        return { message: "List of all lights", object: light };
    }

    async update(id: string, data: UpdateInfoDto, res: Response<StandartResponse<Light>>): Promise<StandartResponse<Light>> {
        const oldLight: Light = await this.espModel.findOne({ uuid: id }, lightProjection).exec() as Light;
        const newLight: Light = await this.espModel.findOneAndUpdate({ uuid: id }, data, { new: true, projection: lightProjection }).exec() as Light;
        console.log(oldLight);
        console.log(newLight);
        if (isEqual(oldLight, newLight)) {
            res.status(304);
        }
        res.send({ message: "Succesfully updatet Light!", object: newLight });
        return { message: "Succesfully updatet Light!", object: newLight }
    }

    async addTags(id: string, data: UpdateTagsDto, res: Response<StandartResponse<Light>>): Promise<StandartResponse<Light>> {

        const oldTags: string[] =  (await this.espModel.findOne({ uuid: id }, { tags: 1, _id: 0 }).exec()).tags;

        const newTags: string[] = [];

        data.tags.forEach((tag: string)=>{
            if(!oldTags.includes(tag)){
                newTags.push(tag);
            }
        })

        if(!newTags.length){
            res.status(304);
            return;
        }

        const newLight: EspDocument = await this.espModel.findOneAndUpdate({uuid: id}, {tags: [...newTags, ...oldTags]}, { new: true, projection: lightProjection }).exec();

        res.send({ message: `Succesfully added the following tags: ${newTags}!`, object: newLight as Light });

        return { message: `Succesfully added the following tags: ${newTags}!`, object: newLight as Light }
    }

    async removeTags(id: string, data: UpdateTagsDto, res: Response<StandartResponse<Light>>): Promise<StandartResponse<Light>> {

        const oldLight: EspDocument = await this.espModel.findOne({ uuid: id }, { tags: 1, _id: 0 }).exec();
        const oldTags: string[] = [...oldLight.tags];

        const newTags: string[] = [];
        const remTags: string[] = [];

        oldTags.forEach((tag: string)=>{
            if(!data.tags.includes(tag)){
                newTags.push(tag);
            }else{
                remTags.push(tag);
            }
        })

        if(isEqual(oldLight.tags, newTags)){
            res.status(304);
            return;
        }

        const newLight: EspDocument = await this.espModel.findOneAndUpdate({uuid: id}, {tags: newTags}, { new: true, projection: lightProjection }).exec();

        res.send({ message: `Succesfully removed the following tags: ${remTags}!`, object: newLight as Light })
        
        return { message: `Succesfully removed the following tags: ${remTags}!`, object: newLight as Light }
    }

    async getWithTag(tag: string, res: Response<StandartResponse<Light[]>>): Promise<StandartResponse<Light[]>> {

        const light: EspDocument[] = await this.espModel.find({ tags: {$all: [tag]} }, lightProjection);

        console.log(light);

        res.send({ message: `Lights with tag ${tag}!`, object: light as Light[]})

        return { message: `Lights with tag ${tag}!`, object: light as Light[]}
    }
}
