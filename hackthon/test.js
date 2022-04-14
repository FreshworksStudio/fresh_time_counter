// ***********************************************************************
// This test file contains some functions that filter dummy JSON
// data provided by the Humi API vendor.

// There might be some redundancy that can be reduced once we
// get the actual API data to play with.

// Additionally, there's an issue where the slack employee ID's
// are not the same as Humi employee ID's, so for now the data is
// filtered based on full (first + last) legal name. This might
// create a problem in the future where the application can't distinguish
// two or more people with the same first + last name combination.

// Defining start and end date range
// Using <moment> module just like in index.js
// Need to test if endDate includes people past the designated range
// IE, if a person who's on vacation from Jan 1 to Jan 7 is included in
// the range of startDate = Jan 1 and endDate = Jan 2
// ***********************************************************************

// To-do:
// - Create HUMI API token entry in the <.env> file.
// - Make actual API calls instead of pulling data from dummy JSON files
//   when API becomes available.
// - Refactor functions below if it makes sense to (once we get actual API)
//   data.
// - Put these helper functions into the <utils.js> file end export them from
//   there into index.js
// - Test if it works as expected.

const moment = require('moment-timezone');
const startDate = moment().format('YYYY-MM-DD');
const endDate = moment(startDate).add(31, 'days').format('YYYY-MM-DD');

// Test data
// These should be received from the API call instead
const employeesJSON = require('./employees.json');
const timeOffUsersJSON = require('./timeoff.json');
const slackAbsentUsersJSON = require('./slackAbsentUsers.json');

// Functions to get the employee and timeOffUsers data
// Should be applied to the actual API data
const employees = employeesJSON['data'].map((element) => {
  const employee = element['attributes'];
  ({ id, legal_first_name, legal_last_name } = employee);
  return { id, legal_first_name, legal_last_name };
});

const timeOffUsers = timeOffUsersJSON['data'].map((element) => {
  const employee = element['attributes'];
  ({ employee_id, status, start_at, end_at } = employee);
  return { employee_id, status, start_at, end_at };
});

// timeOffUsers don't have names associated with them, so we need to merge the two arrays on ID
// Pretty messy but works, maybe can refactor later
const timeOffUsersWithNames = timeOffUsers
  .map((element) => {
    const employeeArr = employees.filter((employee) => {
      return employee.id === element.employee_id;
    });
    if (employeeArr.length !== 0) {
      const employeeObj = employeeArr.shift();
      ({ legal_first_name, legal_last_name } = employeeObj);
      return { realName: `${legal_first_name} ${legal_last_name}`, ...element };
    }
    return null;
  })
  .filter((element) => element !== null);

// Get Slack absent users
// This should already exist in index.js, but doing it here for test purposes
const slackAbsentUsers = slackAbsentUsersJSON["data"].map(element => element);

// Filter the slack absent users
const slackNamesOnly = slackAbsentUsers.map(element => element.realName);
const humiNamesOnly = timeOffUsersWithNames.map(element => element.realName);
const filteredUsers = slackAbsentUsers.filter(element => humiNamesOnly.includes(element.realName));

console.log(filteredUsers);