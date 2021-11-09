FROM node:16-alpine3.11

ENV NODE_ENV=production
EXPOSE 6000

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

RUN npm run build

CMD [ "npm", "start"]