import { User } from "@/lib/types";
import { http } from "./api";

export class UserService {
  static async login(username: string) {
    return http.post<{ accessToken: string; user: User }>("/login", {
      username,
    });
  }

  static async createUser(username: string) {
    return http.post<void>("/users", {
      username,
    });
  }
}
