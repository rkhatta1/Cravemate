import { google } from "googleapis";

const getOAuthClient = () => {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN,
    GOOGLE_OAUTH_REDIRECT_URI,
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google client credentials missing");
  }
  if (!GOOGLE_REFRESH_TOKEN) {
    throw new Error("Google refresh token missing");
  }

  const redirectUri =
    GOOGLE_OAUTH_REDIRECT_URI || "https://developers.google.com/oauthplayground";
  const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);
  client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return client;
};

export const createCalendarEvent = async ({ summary, description, start, end, location }) => {
  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary,
      description,
      location,
      start,
      end,
      reminders: {
        useDefault: true,
      },
    },
  });

  return response.data;
};
