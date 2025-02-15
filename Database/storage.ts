import { pool, db } from "../server/db";

export const storage = {
  async sendLoginNotification(username: string) {
    // Implement your email sending logic here
    // You'll need to add an email service integration
    console.log(`Login notification would be sent to ${username}`);
  },
};

export { storage, db, pool };