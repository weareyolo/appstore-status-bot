const slack = require("./slack.js");
const exec = require("child_process").exec;
const dirty = require("dirty");
const { Octokit } = require("octokit");
const request = require("request-promise-native");
const fs = require("fs").promises;

const gistID = process.env.GH_GIST_ID;
const octokit = new Octokit({ auth: `token ${process.env.GH_TOKEN}` });

const main = async () => {
  await getGist();

  exec(
    "ruby src/fetch_app_status.rb",
    { env: Object.create(process.env) },
    function (err, stdout, stderr) {
      if (stdout) {
        var apps = JSON.parse(stdout);
        console.log("Apps data retrieved:");
        console.log(apps);

        const db = dirty("store.db");

        for (let app of apps) {
          checkVersion(db, app);
        }
      } else {
        console.log("There was a problem fetching the status of the app!");
        console.log(stderr);
      }
    }
  );
};
// checkVersion compares the lastest version of a given app
// to the most recent one stored.
//
// If there is a difference between the two versions
// a slack message will be sent.
const checkVersion = async (db, app) => {
  var appInfoKey = "appInfo-" + app.appID;
  var submissionStartKey = "submissionStart" + app.appID;

  db.on("load", async function () {
    var lastAppInfo = db.get(appInfoKey);
    if (!lastAppInfo || lastAppInfo.status != app.status) {
      console.log("[*] status is different");
      slack.post(app, db.get(submissionStartKey));

      if (app.status == "Waiting For Review") {
        db.set(submissionStartKey, new Date());
      }
    } else {
      console.log("[*] status is same");
    }

    db.set(appInfoKey, app);

    try {
      await updateGist();
    } catch (error) {
      console.log(error);
    }
  });
};

// getGist retrieves the gist that is used for data storage and copies the content locally
// into a temporary file store.db
const getGist = async () => {
  const gist = await octokit.rest.gists
    .get({
      gist_id: process.env.GH_GIST_ID,
    })
    .catch((error) => console.error(`[*] Unable to update gist\n${error}`));
  if (!gist) return;


  const result = await request.get({
    url: gist.data.files[Object.keys(gist.data.files)[0]].raw_url,
  });
  try {
    await fs.writeFile("store.db", result);
    console.log("[*] file saved!");
  } catch (error) {
    console.log(error);
  }
};

// updateGist updates the configured gist content with the new data.
const updateGist = async () => {
  const gist = await octokit.rest.gists
    .get({
      gist_id: gistID,
    })
    .catch((error) => console.error(`[*] Unable to update gist\n${error}`));
  if (!gist) return;

  await octokit.rest.gists.update({
    gist_id: gistID,
    files: {
      [Object.keys(gist.data.files)[0]]: {
        content: await fs.readFile("store.db", "utf-8"),
      },
    },
  });
};

main();
