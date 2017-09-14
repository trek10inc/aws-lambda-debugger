FROM node:8-alpine

WORKDIR /workdir
ADD . /workdir

EXPOSE 8080
EXPOSE 9229
RUN npm install

WORKDIR /workdir/broker
CMD ["node", "index.js"]
