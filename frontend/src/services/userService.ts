import { Credentials } from "@/services/credentials";
import { http } from "./api";

export class UserService {
  static async login(username: string, password: string) {
    return http.post<Credentials>("/login", { username, password });
  }

  static async createUser(username: string, password: string) {
    return http.post<void>("/users", { username, password });
  }

  static async logout() {
    return http.post<void>("/logout");
  }
}
