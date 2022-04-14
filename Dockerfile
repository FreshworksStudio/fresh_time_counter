FROM node:14

RUN apt-get update && apt-get install -y cron

# Copy cron file to the cron.d directory
COPY crontab /etc/cron.d/cool-task
# Give execution rights on the cron job
RUN chmod 0644 /etc/cron.d/cool-task
# Apply cron job
RUN crontab /etc/cron.d/cool-task
# Create the log file to be able to run tail
RUN touch /var/log/cron.log

WORKDIR /usr/src/app

COPY package*.json ./
# RUN npm i npm@7.24.0 -g
RUN npm install

COPY . .

EXPOSE 8888

CMD ["/bin/bash", "./start.sh"]
# CMD ["npm", "start"]