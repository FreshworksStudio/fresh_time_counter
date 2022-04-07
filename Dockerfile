FROM node:12-alpine

RUN apt-get update && apt-get install -y cron

# Copy cron file to the cron.d directory
COPY crontab /etc/cron.d/cool-task
# Give execution rights on the cron job
RUN chmod 0644 /etc/cron.d/cool-task
# Apply cron job
RUN crontab /etc/cron.d/cool-task


WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8888

CMD ["npm", "start"]