import { Injectable } from '@nestjs/common';
import { find } from 'lodash';
import * as net from "net"


export interface tcpEsp {
ip: string,
socket: net.Socket;
}
@Injectable()
export class TcpService {

    server: net.Server;
    clients: tcpEsp[] = [];

    onApplicationBootstrap(){
        this.server = net.createServer();
        this.server.on("connection", (c) => {
            console.log(c.remoteAddress);
            if(!find(this.clients, {ip: c.remoteAddress.substr(7)})){
                console.log("new client")
                this.clients.push({
                    ip: c.remoteAddress?.substr(7),
                    socket: c,
                })
            }
        }) 
        this.server.listen(2389, () => {
            console.log("server bound")
        })
    }

    sendData(data: string, ip: string){  
        console.log(this.clients);
        const client: net.Socket = find(this.clients, {ip: ip}).socket;
        client.write(data+"\n");
    }


    beforeApplicationShutdown(){
    console.log("shutdown") 
       this.clients.forEach(c => {
           c.socket.write('{"command": "serverRestart"}\n');
       })
    }

}
