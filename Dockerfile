FROM node:9.5.0-stretch

WORKDIR /opt

ADD ./package.json /opt

RUN npm install

ADD . /opt

VOLUME ["/data"]

CMD ["node", "/opt/server.js"]