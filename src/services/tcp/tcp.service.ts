import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { find, findIndex } from 'lodash';
import * as net from "net";


export interface tcpEsp {
    ip: string,
    socket: net.Socket;
}
@Injectable()
export class TcpService {


    private server: net.Server;
    private clients: tcpEsp[] = [];

    private onApplicationBootstrap() {
        this.server = net.createServer();
        this.server.on("connection", (c) => {
            console.log(c.remoteAddress);
            if (!find(this.clients, { ip: c.remoteAddress.substr(7) })) {
                console.log("new client")
                this.clients.push({
                    ip: c.remoteAddress?.substr(7),
                    socket: c,
                })
                c.on("close", () => {
                    console.log("closed");
                })

            }
        });
        this.server.listen(2389, () => {
        })
    }

    removeConnection(ip: string) {
        const client: number = findIndex(this.clients, { ip: ip });
        this.clients.splice(client, 1);
    }

    sendData(data: string, ip: string): void {
        try {
            const client: net.Socket = find(this.clients, { ip: ip }).socket;
            client.write(data + "\n", () => { });
        } catch (e) {
            console.error(e);
            throw new ServiceUnavailableException("The Light is not plugged in or started yet!");
        }
        return;
    }


    private beforeApplicationShutdown() {
        console.log("shutdown")
        this.clients.forEach(c => {
            c.socket.write('{"command": "serverRestart"}\n');
        })
    }

}
