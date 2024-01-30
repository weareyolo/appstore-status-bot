const moment = require("moment");
const path = require("path");
const { IncomingWebhook } = require("@slack/webhook");
const { I18n } = require("i18n");

const webhookURL = process.env.SLACK_WEBHOOK_URL;
const i18n = new I18n();

i18n.configure({
  directory: path.join(__dirname, '../locales'),
  defaultLocale: 'en'
});

// post uses the Slack Webhook API to send the info update to the
// configured Slack workspace.
function post(appInfo, submissionStartDate) {
  new IncomingWebhook(webhookURL, {}).send({
    text: i18n.__("Message", { appName: appInfo.name, status: i18n.__(appInfo.status) }),
    attachments: [slackAttachment(appInfo, submissionStartDate)],
  });
}

// slackAttachment builds the API payload used to send a slack message.
function slackAttachment(appInfo, submissionStartDate) {
  const attachment = {
    fallback: `The status of your app ${appInfo.name} has been changed to ${appInfo.status}`,
    color: colorForStatus(appInfo.status),
    title: "App Store Connect",
    author_name: appInfo.name,
    author_icon: appInfo.iconURL,
    title_link: `https://appstoreconnect.apple.com/apps/${appInfo.appID}/appstore`,
    fields: [
      {
        title: i18n.__("Version"),
        value: appInfo.version,
        short: true,
      },
      {
        title: i18n.__("Status"),
        value: i18n.__(appInfo.status),
        short: true,
      },
    ],
    footer: "appstore-status-bot",
    footer_icon:
      "https://icons-for-free.com/iconfiles/png/512/app+store+apple+apps+game+games+store+icon-1320085881005897327.png",
    ts: new Date().getTime() / 1000,
  };

  // Set elapsed time since "Waiting For Review" start
  if (
    submissionStartDate &&
    appInfo.status != "Prepare for Submission" &&
    appInfo.status != "Waiting For Review"
  ) {
    const elapsedHours = moment().diff(moment(submissionStartDate), "hours");
    attachment["fields"].push({
      title: "Elapsed Time",
      value: `${elapsedHours} hours`,
      short: true,
    });
  }

  return attachment;
}

function colorForStatus(status) {
  const infoColor = "#8e8e8e";
  const warningColor = "#f4f124";
  const successColor1 = "#1eb6fc";
  const successColor2 = "#14ba40";
  const failureColor = "#e0143d";
  const colorMapping = {
    "Prepare for Submission": infoColor,
    "Waiting For Review": infoColor,
    "In Review": successColor1,
    "Pending Contract": warningColor,
    "Waiting For Export Compliance": warningColor,
    "Pending Developer Release": successColor2,
    "Processing for App Store": successColor2,
    "Pending Apple Release": successColor2,
    "Ready for Sale": successColor2,
    Rejected: failureColor,
    "Metadata Rejected": failureColor,
    "Removed From Sale": failureColor,
    "Developer Rejected": failureColor,
    "Developer Removed From Sale": failureColor,
    "Invalid Binary": failureColor,
  };

  return colorMapping[status];
}

module.exports = {
  post: post,
};
