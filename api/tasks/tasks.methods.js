import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { checkLoggedIn, checkTaskOwner } from "../lib/auth";
import { Tasks } from "./tasks";

/**
 *
 * @param {"slow"|"normal"|"super slow"} kind
 * @returns
 */
const slowQueryString = (kind) => {
  const kindTable = {
    normal: 10,
    slow: 100,
    "super slow": 1000,
  };
  return `const gigantMatrix = new Array(${kindTable[kind]})
  .fill(0)
  .map(() => new Array(${10 * kindTable[kind]}).fill(0));
function doubleEveryArrayElement(arr) {
  return arr.map((x) => x * 2);
}

function randomizeArray(arr) {
  return arr.map((x) => Math.random());
}

function sortSlowlyArray(arr) {
  return arr.sort((a, b) => a - b);
}

gigantMatrix.forEach((gigantArray) => {
  sortSlowlyArray(
    randomizeArray(
      doubleEveryArrayElement(sortSlowlyArray(randomizeArray(gigantArray)))
    )
  );
});`;
};

/**
 *
 * @param {string} name task name
 * @param {"fast"|"slow"|"normal"|"super slow"} kind
 * @returns {void}
 */
const complexCalculationOrLookup = async (name, kind) => {
  const kindTable = {
    fast: {
      query: async () =>
        Tasks.find({
          $where: `!this.done`,
        }).fetchAsync(),
    },
    normal: {
      query: async () =>
        Tasks.find({
          $where: `
          ${slowQueryString(kind)}
          return this.done
          `,
        }).fetchAsync(),
    },
    slow: {
      query: async () =>
        Tasks.find({
          $and: [
            {
              $where: `
              ${slowQueryString(kind)}
              return this.done;
              `,
            },
            {
              $where: `
              ${slowQueryString(kind)}
              return this.description.includes("o");
              `,
            },
            {
              $and: [
                {
                  $where: `
                  ${slowQueryString(kind)}
                  return this.done;
                  `,
                },
                {
                  $where: `
                  ${slowQueryString(kind)}
                  return this.description.includes("i");
                  `,
                },
              ],
            },
          ],
        }).fetchAsync(),
    },
    "super slow": {
      query: async () =>
        Tasks.find({
          $where: `
          ${slowQueryString(kind)}
return (this.done && (this.description.includes("o") || this.description.includes("a")));
          `,
        }).fetchAsync(),
    },
  };
  console.log(`Starting ${name} at ${new Date()}`);
  const docs = await kindTable[kind].query();
  console.log(`Found ${docs.length} documents`);
  console.log({
    docs,
  });
  console.log(`Ending ${name} at ${new Date()}`);
};

/**

 Inserts a new task into the Tasks collection.
 @async
 @function insertTask
 @param {Object} taskData - The task data.
 @param {string} taskData.description - The description of the task.
 @returns {Promise<string>} - The ID of the inserted task.
 */
async function insertTask({ description }) {
  check(description, String);
  checkLoggedIn();
  const task = {
    description,
    done: false,
    userId: Meteor.userId(),
    createdAt: new Date(),
  };
  await complexCalculationOrLookup("sending email", "slow");
  return Tasks.insertAsync(task);
}

/**
 Removes a task from the Tasks collection.
 @async
 @function removeTask
 @param {Object} taskData - The task data.
 @param {string} taskData.taskId - The ID of the task to remove.
 @returns {Promise<number>}
 */
async function removeTask({ taskId }) {
  check(taskId, String);
  await checkTaskOwner({ taskId });
  await complexCalculationOrLookup(
    "checking for task references and lookups",
    "normal"
  );
  return Tasks.removeAsync(taskId);
}

/**
 Toggles the 'done' status of a task in the Tasks collection.
 @async
 @function toggleTaskDone
 @param {Object} taskData - The task data.
 @param {string} taskData.taskId - The ID of the task to toggle.
 @returns {Promise<number>}
 */
async function toggleTaskDone({ taskId }) {
  check(taskId, String);
  await checkTaskOwner({ taskId });
  const task = await Tasks.findOneAsync(taskId);
  await complexCalculationOrLookup("sending notifications", "super slow");
  return Tasks.updateAsync({ _id: taskId }, { $set: { done: !task.done } });
}

Meteor.methods({
  insertTask,
  removeTask,
  toggleTaskDone,
});
