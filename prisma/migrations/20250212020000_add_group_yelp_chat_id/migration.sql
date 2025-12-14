-- Store Yelp AI chat session id per group
ALTER TABLE "Group" ADD COLUMN "yelpChatId" TEXT;
