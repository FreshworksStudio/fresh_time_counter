'use strict';

const moment = require('moment-timezone');
const axios = require('axios');
const { App, ExpressReceiver } = require('@slack/bolt');

const { arrayToDic } = require('./util');

// config
require('dotenv').config({ path:'/usr/src/app/.env'});
const API_TOKEN = process.env.API_TOKEN;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const HUMI_API_TOKEN = process.env.HUMI_PARTNERS_API_TOKEN;
const HUMI_API_URL = process.env.HUMI_PARTNERS_API_URL;
const channelId ='C5CU14MRS';
const startDate = moment().format('YYYY-MM-DD');
const endDate = moment(startDate).add(12, 'hours').format('YYYY-MM-DD');
// Initializes your app with your bot token and signing secret



const config = {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
};
const humiConfig = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${HUMI_API_TOKEN}`
    },
  };

const expressReceiver = new ExpressReceiver({
  signingSecret: SLACK_SIGNING_SECRET,
});

/*
 *  Get a list of authorized channels
 */

(async () => {
   const app = new App({
    token: SLACK_BOT_TOKEN,
    receiver: expressReceiver,
   });

  // await ack();
  const allUsers = await getAllUsers();
  const allUsersDic = arrayToDic(allUsers, 'id');
  const channelUsers = await getChannelUsers('C5CU14MRS');
  const messages = await getMessages('C5CU14MRS');
  const messageUsers = messages.map((message) => message.user);
  const absentUsers = channelUsers.filter(
    (user) => !messageUsers.includes(user)
  );
  const absentUsersWithDetail = absentUsers.map((userId) => ({
    id: userId,
    realName: allUsersDic[userId].profile.real_name,
  }));
  console.log("original absend user list", absentUsersWithDetail)
  const humiEmployees = await getHumiEmployeesList();


  const timeOffUsersList = await getHumiEmployeeTimeOffList(startDate,endDate);

  // Functions to get the employee and timeOffUsers data
  // Should be applied to the actual API data
  console.log('humi employees', humiEmployees.length);
  const employees = humiEmployees.map((element) => {
    const employee = element['attributes'];

    const { id, first_name, last_name, end_date } = employee;
     if(end_date === null)
    return { id, first_name, last_name };
     else return null;
  }).filter((element) => element !== null);

  console.log('humi employees', employees.length);
  ;
  const timeOffUsers = timeOffUsersList.map((element) => {
    const employee = element['attributes'];
    const { employee_id, status, start_at, end_at } = employee;
    return { employee_id, status, start_at, end_at };
  });

  // timeOffUsers don't have names associated with them, so we need to merge the two arrays on ID
  // Pretty messy but works, maybe can refactor later

  const timeOffUsersWithNames = employees.filter(({ id: id1 }) => timeOffUsers.some(({ employee_id: id2 }) => id2 === id1))
  .map((element) => {
    const { first_name, last_name } = element;
    return {
      realName: `${first_name} ${last_name}`,
      ...element,
    };
  });


  console.log('timeOffUsersWithNames',timeOffUsersWithNames)

  // Filter the slack absent users

  const humiNamesOnly = timeOffUsersWithNames.map(
    (element) => element.realName
  );
  const absentUsersList = absentUsersWithDetail.filter((element) =>
    !humiNamesOnly.includes(element.realName)
  );
  // Here are C-Level manager, they do not need to check-in everyday
 const alwaysNotSendNotificationUsers = [
      'Sam',
      'Rohit Boolchandani',
      'Shaun Jamieson',
      'freshtimescounter',

 ]
 const finalAbsentUsersList = absentUsersList.filter((element) =>
    !alwaysNotSendNotificationUsers.includes(element.realName )
  );
  // call helper func to eliminate all the user on vacation or on leave at here
  console.log('test finalAbsentUsersList', finalAbsentUsersList);
// in order to check if today is a holiday, we do a simple trick here,
// if more than half employees does not show up, we suppose this is a holiday

if(employees.length <=  finalAbsentUsersList.length * 2 ) {
  console.log('Today is a holiday! no one is on');
} else {

    const text = `These user ${finalAbsentUsersList.map(
        (coworker) => `<@${coworker.id}>`
      )} still no sign up after send previous notification. `;
      await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: "C03DTDGTYTU",
        text,
      });
    console.log('send post check notification');
    }

})();

/** slack api */

async function getAllUsers() {
 const params = {
    token: API_TOKEN,
  };


  const { data } = await axios.get(
    'https://slack.com/api/users.list',
    {
      params,
    },
    config
  );

  return data.members;
}

async function getChannelUsers(channel) {
  const params = {
    token: API_TOKEN,
    channel,
  };



  const { data } = await axios.get(
    'https://slack.com/api/conversations.members',
    {
      params,
    },
    config
  );
  return data.members;
}

async function getMessages(channel) {
    const todayDate = moment().format('YYYY-MM-DD');

    const oldest = moment(todayDate + 'T00:00:00')
      .utc()
      .unix();
    const latest = moment(todayDate + 'T19:00:00')
      .utc()
      .unix();

    const params = {
      token: API_TOKEN,
      channel,
      latest,
      oldest,
    };
    console.log(oldest, latest);

  const { data } = await axios.get(
    'https://slack.com/api/conversations.history',
    {
      params,
    },
    config
  );

  return data.messages;
}

async function getHumiEmployeeTimeOffList(startDate,endDate) {


      const params = new URLSearchParams(
     {
    'dateRange[start]': startDate,
    'dateRange[end]': endDate,
  });


  const { data } = await axios.get(
    HUMI_API_URL + `/timeoff/?${params}`,

    humiConfig
  );

  return data.data;
}

async function getHumiEmployeesList() {
    let pageNumber = 0;
    let list = [] ;

    // This hack due to Humi partner API limitation, their pagination does not work.
    // so i check the total page first
     while(pageNumber++ < 10) {

        const { data } = await axios.get(
            HUMI_API_URL + `/employees/?page[number]=${pageNumber}`,
            humiConfig
          );
           list = list.concat(data.data)
     }





  return list;
}
