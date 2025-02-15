
import { pool, db } from "../server/db";

class Storage {
  async sendLoginNotification(username: string) {
    // Implement your email sending logic here
    // You'll need to add an email service integration
    console.log(`Login notification would be sent to ${username}`);
  }
}

export const storage = new Storage();
