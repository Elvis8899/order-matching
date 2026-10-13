import axios from "axios";
import { User } from "@/lib/types";
import { CredentialsStorage } from "@/services/credentials";
import { UserService } from "@/services/userService";

const errorMessage = (error: unknown, fallback: string) => {
  const message = axios.isAxiosError<{ message?: unknown }>(error)
    ? error.response?.data?.message
    : undefined;
  return new Error(typeof message === "string" ? message : fallback);
};

export class AuthService {
  // Logs in, or signs up when the username is new
  static async login(username: string, password: string): Promise<User> {
    const credentials = await UserService.login(username, password)
      .then((res) => res.data)
      .catch(async (error) => {
        if (!axios.isAxiosError(error) || error.response?.status !== 401) {
          throw errorMessage(error, "Unable to login");
        }
        await UserService.createUser(username, password).catch((e) => {
          const status = axios.isAxiosError(e) ? e.response?.status : null;
          // The username exists, so the password was wrong
          if (status === 409) throw new Error("Wrong username or password");
          if (status === 422) {
            throw new Error("Passwords need 8 to 72 characters");
          }
          throw errorMessage(e, "Unable to register");
        });
        return (await UserService.login(username, password)).data;
      });
    CredentialsStorage.save(credentials);
    return credentials.user;
  }

  static getUser(): User | null {
    return CredentialsStorage.getUser();
  }

  // Revokes the refresh tokens on the server; the local session ends anyway
  static async logout() {
    await UserService.logout().catch(() => undefined);
    CredentialsStorage.clear();
  }
}
