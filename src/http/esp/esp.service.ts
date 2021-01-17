import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Esp, EspDocument } from "src/schemas/esp.schema";
import { SetupDto } from "./dto/setup.dto";
import { UpdateDto } from "./dto/update.dto";

@Injectable()
export class EspService {
    constructor(@InjectModel(Esp.name) private espModel: Model<EspDocument>) { }

    onApplicationBootstrap(): void {
        this.espModel.remove({});
    }

    async setup(data: SetupDto): Promise<string> {
        const existing_ids: string[] = await this.espModel.distinct("uuid").exec();
        let id: string;
        if (existing_ids.length >= 256 * 256) {
            throw new ConflictException("This IP is already in use!");
        }

        do {
            id =
                Math.round(Math.random() * 255) + "." + Math.round(Math.random() * 255);
        } while (existing_ids.includes(id));
        const name = "(new) Devlight";
        try {
            await this.espModel.create({
                uuid: id,
                count: 0,
                name: name,
                ip: data.ip,
                leds: { pattern: "plain", colors: ["#1DE9B6"] },
                tags: [],
                isOn: true,
                brightness: 255,
            });
        } catch {
            throw new ConflictException("This IP is already in use!");
        }
        return id;
    }

    async update(data: UpdateDto): Promise<void> {
        //TODO Look if esp has really been changed
        try {
            const oldEsp: EspDocument = await this.espModel
                .findOne({ uuid: data.id })
                .exec();
            if (oldEsp.ip === data.ip) {
                throw new NotFoundException();
            }
        } catch {
            throw new BadRequestException("This is not a valid ID");
        }
        await this.espModel
            .findOneAndUpdate({ uuid: data.id }, { ip: data.ip })
            .exec();
        return;
    }
}
