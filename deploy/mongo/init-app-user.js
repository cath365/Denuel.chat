const dbName = process.env.MONGO_DB_NAME || 'rocketchat';
const username = process.env.MONGO_APP_USERNAME || 'rocketchat';
const password = process.env.MONGO_APP_PASSWORD || 'change-me';

db = db.getSiblingDB(dbName);

db.createUser({
  user: username,
  pwd: password,
  roles: [
    { role: 'readWrite', db: dbName },
    { role: 'read', db: 'local' },
  ],
});
