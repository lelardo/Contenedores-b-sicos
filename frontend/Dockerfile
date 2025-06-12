FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm install --production

EXPOSE 4321

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]