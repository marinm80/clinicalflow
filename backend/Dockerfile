FROM node:18-alpine

# Install postgresql-client for pg_dump utility
RUN apk add --no-cache postgresql-client

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5001

CMD ["npm", "run", "dev"]
