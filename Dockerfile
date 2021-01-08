FROM node:alpine AS BUILD_IMAGE

WORKDIR /usr/src/app

COPY package.json .
COPY package-lock.json .

RUN npm ci

COPY . .

RUN npm run build

FROM node:alpine

WORKDIR /usr/src/app

RUN npm install -g serve

COPY --from=BUILD_IMAGE /usr/src/app/build .

EXPOSE 3000
CMD ["serve", "-l", "3000"]
