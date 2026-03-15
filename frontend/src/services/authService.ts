import { User } from "@/lib/types";
import { UserService } from "@/services/userService";

const USER_KEY = "exchange_user";
const TOKEN_KEY = "exchange_token";

export class AuthService {
  static async login(username: string): Promise<User> {
    const res = await UserService.login(username).catch(async (e) => {
      const status = e.response.status;
      if (status === 401) {
        const createUser = await UserService.createUser(username);
        if (createUser.status === 201) {
          return UserService.login(username);
        }
      }
    });
    const data = res.data;

    if (!data.accessToken) {
      throw new Error("Unable to login");
    }
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  }
  static getUser(): User | null {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  static logout() {
    localStorage.removeItem(TOKEN_KEY);
  }
}
