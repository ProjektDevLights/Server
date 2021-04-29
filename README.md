<p align="center"><img alt="Logo" src="https://i.postimg.cc/vHgyC8nG/logo.png" height="250" /> </p>

### Description
DevLights are the smart home LED Stripes for Developers.
This is the DevLights Server based on the [NestJS](https://nestjs.com) JavaScript Framework, which provides the API and thus the communication via clients and the [Hardware](https://github.com/ProjektDevlights/Hardware)
Works on Linux, Windows and macOS. Intended to use on  a Raspberry PI.

### Prerequisites
Make sure that you have either npm or yarn installed. If you haven't than you can look [here](https://github.com/npm/cli) for npm, or [here](https://classic.yarnpkg.com/en/docs/install) for yarn.
Next set up a mongoDB Database either on your machine or on [mongoDB Atlas](https://www.mongodb.com/cloud/atlas2).
A [redis](https://redis.io/) Server for caching is also required.

### Getting started
```shell
git clone https://github.com/ProjektDevLights/Server.git
cd Server 
yarn install
yarn start:dev
```

After running these few commands, your development server is running, and you can start changing or adding things you want to, so they will be applied immediately.

If you want go to production just run `npm run build` or `yarn run build` and start the server via the `start` script.

### Contributing
Feel free to open an issue on GitHub or send pull requests, when encountering issues or wanting to add some features. If you have any questions email [peters@teckdigital.de](mailto:peters@teckdigital.de) or [slaar@teckdigital.de](mailto:slaar@teckdigital.de).
