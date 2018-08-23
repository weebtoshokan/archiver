# 4chan JSON Archiver

This is another 4chan json archiver, written in nodeJS this time. This archiver requires considerably less resources than the previous java-based archiver. Give it a database connection and a folder to save to, and it should fully archive designated boards. This archiver is designed to be a drop-in replacement for the Asagi archiver, and maintains the same SQL schema. 

### Installation
This service should be compatible with most versions of node.
```
$ git clone <repository>
$ cd archiver
$ npm install
$ npm start (or node server.js)
```

### Configuration
The configuration file is named config.js and located in the root of the project. 